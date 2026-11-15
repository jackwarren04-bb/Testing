// Shared helpers for shop + admin
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const money = (n) => '£' + Number(n).toFixed(2);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shirtSvg = (color) => `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M35 10 L20 16 L6 34 L18 44 L26 36 L26 92 L74 92 L74 36 L82 44 L94 34 L80 16 L65 10 Q50 22 35 10 Z" fill="${esc(color || '#ccc')}" stroke="rgba(0,0,0,.25)" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
const thumb = (p) => `<div class="thumb">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}">` : shirtSvg(p.color)}</div>`;
async function api(url, opts = {}) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.style.display = 'block';
  clearTimeout(t._h); t._h = setTimeout(() => (t.style.display = 'none'), 2200);
}
