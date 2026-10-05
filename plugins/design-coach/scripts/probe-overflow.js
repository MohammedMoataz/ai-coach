#!/usr/bin/env node
'use strict';
// The overflow probe: a function to evaluate INSIDE a rendered page (Playwright's browser_evaluate,
// a DevTools console) that returns every place text has left its box — the one check the static
// lint cannot make, because it needs the browser's text measurement. Six kinds:
//   html-overflow-x         a box whose content is wider than it and not clipped or scrolled
//   escapes-parent          a child whose right edge passes its parent's (nowrap text, a wide token)
//   svg-label-escapes-box   a diagram label wider or taller than the node it sits in
//   svg-label-crosses-shape a label that straddles the edge of a node or cluster it is not inside
//   svg-label-overlap       two labels drawn on top of each other (text on text)
//   svg-outside-viewBox     drawn content past the viewBox — cropped at fit
//
// Every diagram is probed: inline svg[role=img] and the host-rendered mermaid svg under
// .zoom-stage. Geometry is compared in screen space (getBoundingClientRect), so nested
// transforms — mermaid puts every node in its own translated <g> — cannot skew it. A label is
// a top-level <text> or a mermaid <foreignObject> (its HTML div is measured, not the box).
// Run it with every figure at fit, as the page loads; `by` is in screen px at that zoom.
//
//   node probe-overflow.js            prints the function source, ready to paste or pass to evaluate
//   require('./probe-overflow.js').source
const source = `() => {
  const out = [];
  const snip = (s) => (s || '').replace(/\\s+/g, ' ').trim().slice(0, 70);
  const path = (el) => { const p = []; let e = el; while (e && e !== document.body && p.length < 4) { p.unshift(e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\\s+/).slice(0, 2).join('.') : '')); e = e.parentElement; } return p.join(' > '); };
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg') || el.closest('.zoom-viewport') || !el.parentElement) continue;
    const cs = getComputedStyle(el);
    if (el.scrollWidth > el.clientWidth + 2 && cs.overflowX === 'visible' && el.clientWidth > 0)
      out.push({ kind: 'html-overflow-x', by: el.scrollWidth - el.clientWidth, path: path(el), text: snip(el.textContent) });
    const r = el.getBoundingClientRect(), p = el.parentElement.getBoundingClientRect();
    if (r.width && r.right > p.right + 2 && getComputedStyle(el.parentElement).overflowX === 'visible' && ![...el.children].some(c => c.getBoundingClientRect().right > p.right + 2))
      out.push({ kind: 'escapes-parent', by: Math.round(r.right - p.right), path: path(el), whiteSpace: cs.whiteSpace, text: snip(el.textContent) });
  }
  const box = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
  const inside = (a, b, tol) => a.l >= b.l - tol && a.r <= b.r + tol && a.t >= b.t - tol && a.b <= b.b + tol;
  const meets = (a, b, tol) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > tol && Math.min(a.b, b.b) - Math.max(a.t, b.t) > tol;
  const svgs = new Set([...document.querySelectorAll('svg[role="img"], .zoom-stage svg')].filter((s) => !s.closest('button') && !s.parentElement.closest('svg')));
  for (const svg of svgs) {
    const name = snip(svg.getAttribute('aria-label') || svg.getAttribute('aria-roledescription') || svg.id).slice(0, 50);
    const k = svg.getBoundingClientRect().width / (svg.viewBox.baseVal.width || svg.getBoundingClientRect().width || 1);
    const tol = Math.max(1, 2 * k);
    const labels = [];
    for (const t of svg.querySelectorAll('text')) {
      if (t.parentElement.closest('text') || !t.textContent.trim()) continue;
      const b = box(t); if (b.w) labels.push({ el: t, b, text: snip(t.textContent) });
    }
    for (const fo of svg.querySelectorAll('foreignObject')) {
      const inner = fo.querySelector('span, p, div') || fo.firstElementChild; if (!inner || !fo.textContent.trim()) continue;
      const b = box(inner), f = box(fo);
      labels.push({ el: fo, b: { l: Math.min(b.l, f.l), t: Math.min(b.t, f.t), r: Math.max(b.r, b.l + inner.scrollWidth * k), b: Math.max(b.b, b.t + inner.scrollHeight * k), w: 0, h: 0 }, fo: f, text: snip(fo.textContent) });
    }
    const shapes = [...svg.querySelectorAll('rect, circle, ellipse, polygon, path')].filter((s) => {
      if (s.closest('defs, marker, foreignObject')) return false;
      if (s.tagName === 'path' && (getComputedStyle(s).fill === 'none' || s.closest('.edgePath, .edgePaths, .flowchart-link, .messageLine0, .messageLine1'))) return false;
      const b = box(s); return b.w > 6 && b.h > 6;
    }).map((s) => ({ el: s, b: box(s) }));
    for (const L of labels) {
      const c = { x: (L.b.l + L.b.r) / 2, y: (L.b.t + L.b.b) / 2 };
      const host = shapes.filter(({ b }) => c.x >= b.l && c.x <= b.r && c.y >= b.t && c.y <= b.b).sort((a, z) => a.b.w * a.b.h - z.b.w * z.b.h)[0];
      if (host && !inside(L.b, host.b, tol)) {
        const by = Math.max(host.b.l - L.b.l, L.b.r - host.b.r, host.b.t - L.b.t, L.b.b - host.b.b);
        out.push({ kind: 'svg-label-escapes-box', by: Math.round(by), svg: name, text: L.text, box: Math.round(host.b.w) + 'x' + Math.round(host.b.h) });
      } else if (L.fo && !inside(L.b, L.fo, tol)) {
        out.push({ kind: 'svg-label-escapes-box', by: Math.round(Math.max(L.b.r - L.fo.r, L.b.b - L.fo.b)), svg: name, text: L.text, box: 'foreignObject ' + Math.round(L.fo.w) + 'x' + Math.round(L.fo.h) });
      }
      for (const s of shapes) {
        if (s === host || inside(L.b, s.b, tol) || inside(s.b, L.b, tol) || !meets(L.b, s.b, tol * 2)) continue;
        if (L.el.parentElement.contains(s.el) && s.el.tagName === 'rect' && s.b.w * s.b.h <= (L.b.r - L.b.l + 8 * k) * (L.b.b - L.b.t + 8 * k) * 1.5) continue; // the label's own background plate
        out.push({ kind: 'svg-label-crosses-shape', svg: name, text: L.text, shape: s.el.tagName + (s.el.getAttribute('class') ? '.' + s.el.getAttribute('class').split(/\\s+/)[0] : '') });
      }
    }
    for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i], z = labels[j];
      if (a.el.contains(z.el) || z.el.contains(a.el) || !meets(a.b, z.b, tol)) continue;
      out.push({ kind: 'svg-label-overlap', svg: name, text: a.text + '  ⟂  ' + z.text, by: Math.round(Math.min(Math.min(a.b.r, z.b.r) - Math.max(a.b.l, z.b.l), Math.min(a.b.b, z.b.b) - Math.max(a.b.t, z.b.t))) });
    }
    const vb = svg.viewBox.baseVal, bb = svg.getBBox();
    if (vb.width && (bb.x < vb.x - 2 || bb.y < vb.y - 2 || bb.x + bb.width > vb.x + vb.width + 2 || bb.y + bb.height > vb.y + vb.height + 2))
      out.push({ kind: 'svg-outside-viewBox', svg: name, content: [bb.x, bb.y, bb.width, bb.height].map(Math.round), viewBox: [vb.x, vb.y, vb.width, vb.height] });
  }
  const kinds = {}; for (const o of out) kinds[o.kind] = (kinds[o.kind] || 0) + 1;
  return { viewport: innerWidth, diagrams: svgs.size, count: out.length, kinds, items: out.slice(0, 60) };
}`;

module.exports = { source };
if (require.main === module) process.stdout.write(source + '\n');
