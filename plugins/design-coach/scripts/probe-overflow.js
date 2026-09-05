#!/usr/bin/env node
'use strict';
// The overflow probe: a function to evaluate INSIDE a rendered page (Playwright's browser_evaluate,
// a DevTools console) that returns every place text has left its box — the one check the static
// lint cannot make, because it needs the browser's text measurement. Three kinds:
//   html-overflow-x         a box whose content is wider than it and not clipped or scrolled
//   escapes-parent          a child whose right edge passes its parent's (nowrap text, a wide token)
//   svg-label-escapes-box   an svg <text> wider than the <rect> it sits in (a diagram label)
//   svg-outside-viewBox     drawn content past the viewBox — cropped at fit-to-width
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
  for (const svg of document.querySelectorAll('svg[role="img"]')) {
    const label = (svg.getAttribute('aria-label') || '').slice(0, 50);
    const rects = [...svg.querySelectorAll('rect')].map((r) => ({ b: r.getBBox() }));
    for (const t of svg.querySelectorAll('text')) {
      const b = t.getBBox(); if (!b.width) continue;
      const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
      const host = rects.filter(({ b: rb }) => cx >= rb.x && cx <= rb.x + rb.width && cy >= rb.y && cy <= rb.y + rb.height).sort((a, c) => a.b.width * a.b.height - c.b.width * c.b.height)[0];
      if (host && (b.x < host.b.x - 1 || b.x + b.width > host.b.x + host.b.width + 1))
        out.push({ kind: 'svg-label-escapes-box', by: Math.round(Math.max(host.b.x - b.x, b.x + b.width - host.b.x - host.b.width)), svg: label, text: snip(t.textContent), box: Math.round(host.b.width) });
    }
    const vb = svg.viewBox.baseVal, bb = svg.getBBox();
    if (vb.width && (bb.x < vb.x - 1 || bb.y < vb.y - 1 || bb.x + bb.width > vb.x + vb.width + 1 || bb.y + bb.height > vb.y + vb.height + 1))
      out.push({ kind: 'svg-outside-viewBox', svg: label, content: [bb.x, bb.y, bb.width, bb.height].map(Math.round), viewBox: [vb.x, vb.y, vb.width, vb.height] });
  }
  return { viewport: innerWidth, count: out.length, items: out };
}`;

module.exports = { source };
if (require.main === module) process.stdout.write(source + '\n');
