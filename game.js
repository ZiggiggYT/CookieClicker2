/* ==========================================================================
   Cookie Clicker 2 — an original cookie-baking idle game
   Plain JavaScript, no dependencies. All art is drawn with SVG / canvas.
   ========================================================================== */
(() => {
'use strict';

const VERSION = '2.2.0';
const SAVE_KEY = 'cookieClicker2.save';

/* ==========================================================================
   Utilities
   ========================================================================== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const now = () => Date.now();

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const NUM_WORDS = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion', 'sextillion',
  'septillion', 'octillion', 'nonillion', 'decillion', 'undecillion', 'duodecillion', 'tredecillion',
  'quattuordecillion', 'quindecillion', 'sexdecillion', 'septendecillion', 'octodecillion', 'novemdecillion', 'vigintillion'];
const NUM_SHORT = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg'];

/** Format a number for display. `dec` controls decimals for small values. */
function fmt(n, dec = 0) {
  if (!isFinite(n)) return n > 0 ? 'Infinity' : '-Infinity';
  if (n < 0) return '-' + fmt(-n, dec);
  const mode = (S && S.settings && S.settings.numFormat) || 'words';
  if (n < 1000) {
    if (dec > 0 && n < 100 && n % 1 !== 0) return n.toFixed(n < 10 ? dec : 1).replace(/\.0+$/, '');
    return Math.floor(n).toString();
  }
  if (mode === 'sci') {
    if (n < 1e6) return Math.floor(n).toLocaleString('en-US');
    const e = Math.floor(Math.log10(n));
    return (n / Math.pow(10, e)).toFixed(3) + 'e' + e;
  }
  if (n < 1e6 && mode === 'words') return Math.floor(n).toLocaleString('en-US');
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier >= NUM_WORDS.length) {
    const e = Math.floor(Math.log10(n));
    return (n / Math.pow(10, e)).toFixed(3) + 'e' + e;
  }
  const scaled = n / Math.pow(10, tier * 3);
  const digits = scaled >= 100 ? 2 : 3;
  const str = (Math.floor(scaled * Math.pow(10, digits)) / Math.pow(10, digits)).toFixed(digits).replace(/\.?0+$/, '');
  return mode === 'short' ? str + NUM_SHORT[tier] : str + ' ' + NUM_WORDS[tier];
}

function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const plural = (n, word, pl) => (n === 1 ? word : (pl || word + 's'));

/* ==========================================================================
   Art — every graphic in the game is generated here
   ========================================================================== */
const Art = {};
let svgUid = 0;

/**
 * Procedural cookie. opts: dough, edge, chip, chips, seed, icing, sprinkles, shine, bites
 */
Art.cookie = function (o = {}) {
  const id = 'ck' + (svgUid++);
  const r = seeded(o.seed || 7);
  const dough = o.dough || '#e9b36a', edge = o.edge || '#b8742f', chip = o.chip || '#4a2614';
  const pts = [];
  const N = 22;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const rad = 45 + (r() - 0.5) * (o.rough != null ? o.rough : 3.2);
    pts.push([50 + Math.cos(a) * rad, 50 + Math.sin(a) * rad]);
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < N; i++) {
    const p1 = pts[(i + 1) % N], p2 = pts[(i + 2) % N];
    const mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2;
    d += ` Q${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`;
  }
  d += 'Z';
  let s = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>
    <radialGradient id="${id}g" cx="42%" cy="38%" r="65%"><stop offset="0" stop-color="${o.light || lighten(dough, 0.25)}"/><stop offset=".65" stop-color="${dough}"/><stop offset="1" stop-color="${edge}"/></radialGradient>
    <radialGradient id="${id}s" cx="35%" cy="28%" r="40%"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  </defs>`;
  s += `<path d="${d}" fill="url(#${id}g)" stroke="${darken(edge, 0.2)}" stroke-width="1.2"/>`;
  if (o.icing) {
    s += `<path d="M28,40 Q35,22 52,24 Q72,26 74,44 Q78,62 60,70 Q42,78 30,64 Q20,54 28,40Z" fill="${o.icing}" opacity=".95"/>`;
  }
  // cracks
  const cracks = o.cracks != null ? o.cracks : 3;
  for (let i = 0; i < cracks; i++) {
    const cx = 25 + r() * 50, cy = 25 + r() * 50, l = 6 + r() * 8, a = r() * Math.PI;
    s += `<path d="M${(cx - Math.cos(a) * l).toFixed(1)},${(cy - Math.sin(a) * l).toFixed(1)} Q${(cx + r() * 4).toFixed(1)},${(cy + r() * 4).toFixed(1)} ${(cx + Math.cos(a) * l).toFixed(1)},${(cy + Math.sin(a) * l).toFixed(1)}" stroke="${darken(dough, 0.22)}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".6"/>`;
  }
  const chips = o.chips != null ? o.chips : 9;
  const placed = [];
  for (let i = 0; i < chips; i++) {
    let x, y, tries = 0;
    do {
      const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 32;
      x = 50 + Math.cos(a) * rr; y = 50 + Math.sin(a) * rr; tries++;
    } while (tries < 20 && placed.some(p => (p[0] - x) ** 2 + (p[1] - y) ** 2 < 120));
    placed.push([x, y]);
    const sz = 4.2 + r() * 3;
    const n = 5 + Math.floor(r() * 3);
    let cd = '';
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + r() * 0.4;
      const rr = sz * (0.75 + r() * 0.4);
      cd += (k ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(1) + ',' + (y + Math.sin(a) * rr * 0.85).toFixed(1);
    }
    const col = Array.isArray(chip) ? chip[i % chip.length] : chip;
    s += `<path d="${cd}Z" fill="${col}" stroke="${darken(col, 0.3)}" stroke-width=".6" stroke-linejoin="round"/>`;
    s += `<ellipse cx="${(x - sz * 0.3).toFixed(1)}" cy="${(y - sz * 0.35).toFixed(1)}" rx="${(sz * 0.32).toFixed(1)}" ry="${(sz * 0.2).toFixed(1)}" fill="#fff" opacity=".35"/>`;
  }
  if (o.sprinkles) {
    const cols = ['#ff6b8a', '#6bc5ff', '#ffe066', '#7be08a', '#c58aff', '#ffffff'];
    for (let i = 0; i < o.sprinkles; i++) {
      const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 34;
      const x = 50 + Math.cos(a) * rr, y = 50 + Math.sin(a) * rr, rot = r() * 180;
      s += `<rect x="${(x - 3).toFixed(1)}" y="${(y - 1).toFixed(1)}" width="6" height="2" rx="1" fill="${cols[i % cols.length]}" transform="rotate(${rot.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
  }
  if (o.shine !== false) s += `<path d="${d}" fill="url(#${id}s)"/>`;
  if (o.face) s += o.face;
  s += '</svg>';
  return s;
};

function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}
function lighten(h, a) { const [r, g, b] = hexToRgb(h); return rgbToHex(r + (255 - r) * a, g + (255 - g) * a, b + (255 - b) * a); }
function darken(h, a) { const [r, g, b] = hexToRgb(h); return rgbToHex(r * (1 - a), g * (1 - a), b * (1 - a)); }

/** Smooth closed blob path around (cx, cy). */
function blobPath(cx, cy, rad, n, rough, rnd, sy = 1) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = rad + (rnd() - 0.5) * rough;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sy]);
  }
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  let m = mid(pts[n - 1], pts[0]);
  let d = `M${m[0].toFixed(1)},${m[1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = mid(p, pts[(i + 1) % n]);
    d += ` Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${q[0].toFixed(1)},${q[1].toFixed(1)}`;
  }
  return d + 'Z';
}

/** The hero cookie: layered lighting, baked rim, speckled texture and glossy 3D chips. */
Art.bigBiscuit = function () {
  const r = seeded(2026);
  const id = 'bc' + (svgUid++);
  const outline = blobPath(100, 100, 88, 30, 5, r);
  let s = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><defs>
    <radialGradient id="${id}base" cx="40%" cy="34%" r="70%"><stop offset="0" stop-color="#ffd996"/><stop offset=".45" stop-color="#eaad5e"/><stop offset=".8" stop-color="#c97f33"/><stop offset="1" stop-color="#8a4914"/></radialGradient>
    <radialGradient id="${id}light" cx="32%" cy="26%" r="45%"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}shade" x1="0" y1="0" x2="1" y2="1"><stop offset=".45" stop-color="#3c1a05" stop-opacity="0"/><stop offset="1" stop-color="#3c1a05" stop-opacity=".38"/></linearGradient>
    <radialGradient id="${id}rim" cx="50%" cy="50%" r="50%"><stop offset=".78" stop-color="#7a3d10" stop-opacity="0"/><stop offset="1" stop-color="#7a3d10" stop-opacity=".45"/></radialGradient>
    <linearGradient id="${id}rimlight" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6dc" stop-opacity=".9"/><stop offset=".4" stop-color="#fff6dc" stop-opacity="0"/></linearGradient>
    <radialGradient id="${id}chip" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#8f5530"/><stop offset=".5" stop-color="#4c2612"/><stop offset="1" stop-color="#220f06"/></radialGradient>
    <filter id="${id}blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter>
    <filter id="${id}soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.1"/></filter>
    <clipPath id="${id}clip"><path d="${outline}"/></clipPath>
  </defs>`;
  s += `<path d="${outline}" fill="url(#${id}base)"/>`;
  s += `<g clip-path="url(#${id}clip)">`;
  // toasted blotches
  for (let i = 0; i < 8; i++) {
    const a = r() * 6.28, rr = 20 + r() * 60;
    s += `<ellipse cx="${(100 + Math.cos(a) * rr).toFixed(1)}" cy="${(100 + Math.sin(a) * rr).toFixed(1)}" rx="${(8 + r() * 14).toFixed(1)}" ry="${(5 + r() * 9).toFixed(1)}" fill="#b56b26" opacity=".32" filter="url(#${id}blur)"/>`;
  }
  // speckled texture
  for (let i = 0; i < 110; i++) {
    const a = r() * 6.28, rr = Math.sqrt(r()) * 86;
    const light = r() < 0.3;
    s += `<circle cx="${(100 + Math.cos(a) * rr).toFixed(1)}" cy="${(100 + Math.sin(a) * rr).toFixed(1)}" r="${(0.5 + r() * 1.3).toFixed(1)}" fill="${light ? '#fff1cf' : '#93531d'}" opacity="${(0.2 + r() * 0.25).toFixed(2)}"/>`;
  }
  // cracks with highlight edges
  for (let i = 0; i < 5; i++) {
    const a = r() * 6.28, rr = 25 + r() * 50;
    const x = 100 + Math.cos(a) * rr, y = 100 + Math.sin(a) * rr, ang = a + Math.PI / 2 + (r() - 0.5) * 0.6, l = 6 + r() * 7;
    const x1 = x - Math.cos(ang) * l, y1 = y - Math.sin(ang) * l, x2 = x + Math.cos(ang) * l, y2 = y + Math.sin(ang) * l;
    const mx = x + Math.cos(a) * 5, my = y + Math.sin(a) * 5;
    const d = `M${x1.toFixed(1)},${y1.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
    s += `<path d="${d}" stroke="#7a3d12" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".5"/>`;
    s += `<path d="${d}" stroke="#ffe8bf" stroke-width="1" fill="none" stroke-linecap="round" opacity=".55" transform="translate(-1 -1.2)"/>`;
  }
  // chocolate chips with drop shadows, gradient body and specular highlights
  const placed = [];
  s += `<rect width="200" height="200" fill="url(#${id}rim)"/><rect width="200" height="200" fill="url(#${id}shade)"/><rect width="200" height="200" fill="url(#${id}light)"/>`;
  for (let i = 0; i < 14; i++) {
    let x, y, t = 0, size;
    do {
      const a = r() * 6.28, rr = Math.sqrt(r()) * 64;
      x = 100 + Math.cos(a) * rr; y = 100 + Math.sin(a) * rr; size = 7.5 + r() * 5.5; t++;
    } while (t < 40 && placed.some(p => Math.hypot(p[0] - x, p[1] - y) < p[2] + size + 6));
    placed.push([x, y, size]);
    const chip = blobPath(x, y, size, 7, size * 0.55, r, 0.85);
    s += `<path d="${chip}" fill="#3c1a05" opacity=".35" transform="translate(1.8 2.8)" filter="url(#${id}soft)"/>`;
    s += `<path d="${chip}" fill="url(#${id}chip)" stroke="#1d0c04" stroke-width=".6" stroke-opacity=".6"/>`;
    s += `<ellipse cx="${(x - size * 0.32).toFixed(1)}" cy="${(y - size * 0.36).toFixed(1)}" rx="${(size * 0.38).toFixed(1)}" ry="${(size * 0.2).toFixed(1)}" fill="#fff" opacity=".42" transform="rotate(-28 ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    s += `<circle cx="${(x - size * 0.45).toFixed(1)}" cy="${(y - size * 0.4).toFixed(1)}" r="${(size * 0.09).toFixed(2)}" fill="#fff" opacity=".85"/>`;
  }
  s += `<rect width="200" height="200" fill="url(#${id}shade)" opacity=".5"/>`;
  s += '</g>';
  s += `<path d="${outline}" fill="none" stroke="#7d4114" stroke-width="2.4"/>`;
  s += `<path d="${outline}" fill="none" stroke="url(#${id}rimlight)" stroke-width="2.6" transform="translate(1.2 1.2) scale(.988)" style="transform-origin:100px 100px"/>`;
  return s + '</svg>';
};
Art.miniCookie = () => Art.cookie({ seed: 11, chips: 4, cracks: 0, shine: false });

Art.golden = function (season) {
  if (season === 'harvest') {
    return Art.cookie({ seed: 31, chips: 0, cracks: 0, dough: '#ff9a2e', edge: '#c55a00', light: '#ffd27a', rough: 5,
      face: '<path d="M30,40 L40,33 L42,44Z M70,40 L60,33 L58,44Z" fill="#3a1500"/><path d="M28,58 Q50,80 72,58 L66,62 L60,57 L54,63 L48,57 L42,63 L36,57Z" fill="#3a1500"/><path d="M47,8 Q50,0 56,4 L54,10Z" fill="#3e7a2a"/>' });
  }
  if (season === 'frost') {
    let flake = '';
    for (let i = 0; i < 6; i++) flake += `<g transform="rotate(${i * 60} 50 50)"><line x1="50" y1="50" x2="50" y2="18" stroke="#fff" stroke-width="4" stroke-linecap="round"/><line x1="50" y1="28" x2="42" y2="20" stroke="#fff" stroke-width="3" stroke-linecap="round"/><line x1="50" y1="28" x2="58" y2="20" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>`;
    return Art.cookie({ seed: 32, chips: 0, cracks: 0, dough: '#9fd4ff', edge: '#3d8fd6', light: '#e8f6ff', face: flake });
  }
  if (season === 'sweet') {
    return `<svg viewBox="0 0 100 100"><defs><radialGradient id="hgc" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffd1e3"/><stop offset=".6" stop-color="#ff6fa5"/><stop offset="1" stop-color="#c2185b"/></radialGradient></defs><path d="M50,88 C10,60 4,34 22,20 C36,10 48,20 50,30 C52,20 64,10 78,20 C96,34 90,60 50,88Z" fill="url(#hgc)" stroke="#a0144c" stroke-width="2"/><ellipse cx="34" cy="32" rx="9" ry="5" fill="#fff" opacity=".5" transform="rotate(-30 34 32)"/><circle cx="60" cy="48" r="3" fill="#fff"/><circle cx="44" cy="58" r="2.5" fill="#fff"/><circle cx="66" cy="34" r="2" fill="#fff"/></svg>`;
  }
  if (season === 'bloom') {
    return `<svg viewBox="0 0 100 100"><defs><radialGradient id="egc" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fffbe0"/><stop offset=".6" stop-color="#ffe066"/><stop offset="1" stop-color="#e0a800"/></radialGradient></defs><path d="M50,6 C74,6 88,44 88,62 C88,82 72,94 50,94 C28,94 12,82 12,62 C12,44 26,6 50,6Z" fill="url(#egc)" stroke="#b88600" stroke-width="2"/><path d="M14,56 Q26,48 38,56 T62,56 T86,56" stroke="#ff7eb6" stroke-width="5" fill="none"/><path d="M16,70 Q28,62 40,70 T64,70 T86,70" stroke="#7ad3ff" stroke-width="5" fill="none"/><circle cx="40" cy="34" r="4" fill="#9be37a"/><circle cx="60" cy="28" r="4" fill="#ff7eb6"/><ellipse cx="36" cy="22" rx="7" ry="4" fill="#fff" opacity=".6" transform="rotate(-30 36 22)"/></svg>`;
  }
  return Art.cookie({ seed: 77, chips: 7, cracks: 2, dough: '#ffd34d', edge: '#d18b00', light: '#fff4b8', chip: '#e09000', rough: 2.5 });
};

/* Building icons — 64x64 viewBox */
const ICONS = {
  hand: `<svg viewBox="0 0 64 64"><defs><linearGradient id="ihg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe2c4"/><stop offset="1" stop-color="#f0b98a"/></linearGradient></defs>
    <path d="M26,8 C29,8 31,10 31,13 L31,30 L33,30 L33,22 C33,19 35,18 37,18 C39,18 41,19 41,22 L41,30 L42,30 L42,25 C42,22 44,21 46,21 C48,21 50,22 50,25 L50,42 C50,52 44,58 35,58 L31,58 C24,58 19,54 16,48 L10,37 C9,34 10,32 12,31 C14,30 16,31 17,33 L21,39 L21,13 C21,10 23,8 26,8Z" fill="url(#ihg)" stroke="#a8673a" stroke-width="2" stroke-linejoin="round"/>
    <path d="M24,50 Q32,54 42,50" stroke="#d29567" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="26" cy="12" r="2" fill="#fff" opacity=".7"/></svg>`,
  nana: `<svg viewBox="0 0 64 64"><circle cx="32" cy="14" r="9" fill="#d9d9e3" stroke="#9b9bb0" stroke-width="1.5"/>
    <path d="M10,62 C10,46 20,40 32,40 C44,40 54,46 54,62Z" fill="#e0546a" stroke="#a53348" stroke-width="1.5"/>
    <path d="M24,44 L32,52 L40,44" fill="#fff" opacity=".9"/>
    <circle cx="32" cy="30" r="15" fill="#ffd9b8" stroke="#c98d63" stroke-width="1.5"/>
    <path d="M17,28 C17,18 24,14 32,14 C40,14 47,18 47,28 C44,22 38,20 32,20 C26,20 20,22 17,28Z" fill="#e6e6ef" stroke="#9b9bb0" stroke-width="1.2"/>
    <circle cx="26" cy="30" r="4.5" fill="none" stroke="#6b4a2f" stroke-width="1.6"/><circle cx="38" cy="30" r="4.5" fill="none" stroke="#6b4a2f" stroke-width="1.6"/><line x1="30.5" y1="30" x2="33.5" y2="30" stroke="#6b4a2f" stroke-width="1.6"/>
    <circle cx="26" cy="30" r="1.4" fill="#3b2214"/><circle cx="38" cy="30" r="1.4" fill="#3b2214"/>
    <circle cx="22" cy="36" r="2.6" fill="#ff9aa8" opacity=".7"/><circle cx="42" cy="36" r="2.6" fill="#ff9aa8" opacity=".7"/>
    <path d="M27,38 Q32,42 37,38" stroke="#a5523a" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`,
  cart: `<svg viewBox="0 0 64 64"><path d="M8,18 L56,18 L52,26 L12,26Z" fill="#e0546a"/><path d="M14,18 L18,26 M24,18 L26,26 M34,18 L34,26 M44,18 L42,26 M52,18 L48,26" stroke="#fff" stroke-width="4"/>
    <path d="M8,18 Q14,24 20,18 Q26,24 32,18 Q38,24 44,18 Q50,24 56,18" fill="none" stroke="#b23a50" stroke-width="1.5"/>
    <line x1="13" y1="26" x2="13" y2="36" stroke="#7a4a2c" stroke-width="2.5"/><line x1="51" y1="26" x2="51" y2="36" stroke="#7a4a2c" stroke-width="2.5"/>
    <rect x="9" y="36" width="46" height="16" rx="3" fill="#c8792f" stroke="#7a4a2c" stroke-width="2"/><rect x="13" y="40" width="38" height="3" rx="1.5" fill="#e7ad63"/>
    <circle cx="22" cy="34" r="5" fill="#e8ad5f" stroke="#a8621f" stroke-width="1.2"/><circle cx="21" cy="33" r="1.1" fill="#3e1f0e"/><circle cx="24" cy="35" r="1" fill="#3e1f0e"/>
    <circle cx="33" cy="33" r="5" fill="#e8ad5f" stroke="#a8621f" stroke-width="1.2"/><circle cx="32" cy="32" r="1.1" fill="#3e1f0e"/><circle cx="35" cy="34" r="1" fill="#3e1f0e"/>
    <circle cx="44" cy="34" r="5" fill="#e8ad5f" stroke="#a8621f" stroke-width="1.2"/><circle cx="43" cy="35" r="1.1" fill="#3e1f0e"/>
    <circle cx="18" cy="55" r="6" fill="#3b2214"/><circle cx="18" cy="55" r="2.5" fill="#bbb"/><circle cx="46" cy="55" r="6" fill="#3b2214"/><circle cx="46" cy="55" r="2.5" fill="#bbb"/></svg>`,
  orchard: `<svg viewBox="0 0 64 64"><rect x="28" y="36" width="8" height="24" rx="2" fill="#8a5530" stroke="#5a3420" stroke-width="1.5"/>
    <path d="M30,42 L22,34 M34,44 L42,36" stroke="#8a5530" stroke-width="3" stroke-linecap="round"/>
    <circle cx="20" cy="28" r="13" fill="#5dbb63"/><circle cx="44" cy="28" r="13" fill="#5dbb63"/><circle cx="32" cy="18" r="15" fill="#6cc96f"/><circle cx="32" cy="32" r="12" fill="#58b05d"/>
    <circle cx="27" cy="12" r="5" fill="#8fe08f" opacity=".6"/>
    <g stroke="#a8621f" stroke-width="1"><circle cx="22" cy="26" r="4.5" fill="#e8ad5f"/><circle cx="40" cy="16" r="4.5" fill="#e8ad5f"/><circle cx="44" cy="32" r="4.5" fill="#e8ad5f"/><circle cx="30" cy="30" r="4.5" fill="#e8ad5f"/></g>
    <g fill="#3e1f0e"><circle cx="21" cy="25" r="1"/><circle cx="23.5" cy="27.5" r=".9"/><circle cx="39" cy="15" r="1"/><circle cx="41.5" cy="17.5" r=".9"/><circle cx="43" cy="31" r="1"/><circle cx="29" cy="29" r="1"/><circle cx="31.5" cy="31.5" r=".9"/></g>
    <ellipse cx="32" cy="61" rx="18" ry="2.5" fill="#5a3420" opacity=".25"/></svg>`,
  quarry: `<svg viewBox="0 0 64 64"><path d="M2,58 L22,18 L32,30 L42,12 L62,58Z" fill="#b89b84" stroke="#7a6250" stroke-width="2" stroke-linejoin="round"/>
    <path d="M42,12 L36,22 L40,24 L44,18Z M22,18 L18,26 L24,26Z" fill="#fff" opacity=".85"/>
    <g stroke="#cfd6e0" stroke-width="1"><rect x="14" y="44" width="10" height="10" fill="#fff"/><rect x="26" y="46" width="9" height="9" fill="#f6f8fb"/><rect x="20" y="36" width="9" height="9" fill="#fbfcff"/><rect x="37" y="44" width="10" height="10" fill="#fff"/></g>
    <g fill="#e1e6ee"><circle cx="17" cy="47" r="1"/><circle cx="21" cy="51" r="1"/><circle cx="40" cy="47" r="1"/><circle cx="44" cy="51" r="1"/></g>
    <line x1="46" y1="54" x2="58" y2="34" stroke="#8a5530" stroke-width="3" stroke-linecap="round"/><path d="M50,30 Q58,28 64,36 Q58,33 54,35Z" fill="#9aa4b0" stroke="#5f6873" stroke-width="1.2"/></svg>`,
  plant: `<svg viewBox="0 0 64 64"><circle cx="48" cy="8" r="5" fill="#ddd" opacity=".8"/><circle cx="54" cy="4" r="4" fill="#eee" opacity=".7"/>
    <rect x="42" y="10" width="9" height="24" fill="#8f5c3a" stroke="#5a3420" stroke-width="1.5"/><rect x="42" y="14" width="9" height="3" fill="#e0546a"/>
    <path d="M4,60 L4,32 L18,24 L18,32 L32,24 L32,32 L46,24 L60,32 L60,60Z" fill="#c8792f" stroke="#7a4a2c" stroke-width="2" stroke-linejoin="round"/>
    <rect x="10" y="40" width="8" height="8" rx="1" fill="#ffe7a8"/><rect x="24" y="40" width="8" height="8" rx="1" fill="#ffe7a8"/><rect x="46" y="40" width="8" height="8" rx="1" fill="#ffe7a8"/>
    <rect x="29" y="50" width="10" height="10" fill="#5a3420"/>
    <circle cx="40" cy="44" r="5" fill="#e8ad5f" stroke="#a8621f" stroke-width="1"/><circle cx="39" cy="43" r="1" fill="#3e1f0e"/><circle cx="41.5" cy="45.5" r="1" fill="#3e1f0e"/></svg>`,
  lab: `<svg viewBox="0 0 64 64"><path d="M24,6 L40,6 M27,6 L27,24 L10,52 C7,57 10,60 15,60 L49,60 C54,60 57,57 54,52 L37,24 L37,6" fill="#eaf6ff" stroke="#5a7a95" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M17,42 L47,42 L54,53 C56,57 53,59 49,59 L15,59 C11,59 8,57 10,53Z" fill="#ff7eb6"/>
    <circle cx="26" cy="36" r="3" fill="#ff7eb6" opacity=".7"/><circle cx="34" cy="30" r="2" fill="#ff7eb6" opacity=".6"/><circle cx="30" cy="22" r="1.6" fill="#ff7eb6" opacity=".5"/>
    <g><rect x="18" y="48" width="6" height="2" rx="1" fill="#ffe066" transform="rotate(30 21 49)"/><rect x="30" y="52" width="6" height="2" rx="1" fill="#6bc5ff" transform="rotate(-20 33 53)"/><rect x="40" y="47" width="6" height="2" rx="1" fill="#7be08a" transform="rotate(50 43 48)"/><rect x="24" y="54" width="6" height="2" rx="1" fill="#fff" transform="rotate(-50 27 55)"/><rect x="42" y="54" width="6" height="2" rx="1" fill="#c58aff"/></g>
    <path d="M30,10 L30,22" stroke="#fff" stroke-width="2" opacity=".7" stroke-linecap="round"/></svg>`,
  harbor: `<svg viewBox="0 0 64 64"><path d="M0,52 Q8,48 16,52 T32,52 T48,52 T64,52 L64,64 L0,64Z" fill="#5aa9e6"/>
    <line x1="30" y1="6" x2="30" y2="40" stroke="#5a3420" stroke-width="2.5"/><path d="M32,8 L52,30 L32,30Z" fill="#fff7ea" stroke="#c8b49c" stroke-width="1.2"/><path d="M28,12 L12,30 L28,30Z" fill="#f6e0c4" stroke="#c8b49c" stroke-width="1.2"/>
    <path d="M6,40 L58,40 L52,54 L12,54Z" fill="#8f5c3a" stroke="#5a3420" stroke-width="2" stroke-linejoin="round"/><line x1="10" y1="46" x2="55" y2="46" stroke="#5a3420" stroke-width="1.2"/>
    <rect x="14" y="32" width="10" height="8" fill="#6b3d22" stroke="#3b2214" stroke-width="1"/><rect x="38" y="32" width="10" height="8" fill="#6b3d22" stroke="#3b2214" stroke-width="1"/>
    <path d="M30,4 L38,6 L30,8Z" fill="#e0546a"/></svg>`,
  rocket: `<svg viewBox="0 0 64 64"><path d="M26,50 Q32,64 38,50 Q35,56 32,52 Q29,56 26,50Z" fill="#ffb347"/><path d="M28,50 Q32,58 36,50Z" fill="#ffe066"/>
    <path d="M32,4 C42,12 44,26 42,42 L22,42 C20,26 22,12 32,4Z" fill="#f2f2f7" stroke="#8a8aa0" stroke-width="2"/>
    <path d="M32,4 C37,8 40,12 41,16 L23,16 C24,12 27,8 32,4Z" fill="#e0546a"/>
    <path d="M22,32 L12,44 L14,50 L23,42Z M42,32 L52,44 L50,50 L41,42Z" fill="#e0546a" stroke="#a53348" stroke-width="1.5" stroke-linejoin="round"/>
    <rect x="24" y="42" width="16" height="6" rx="2" fill="#8a8aa0"/>
    <circle cx="32" cy="27" r="6.5" fill="#e8ad5f" stroke="#8a8aa0" stroke-width="2.5"/><circle cx="30.5" cy="26" r="1.2" fill="#3e1f0e"/><circle cx="33.5" cy="28.5" r="1.1" fill="#3e1f0e"/></svg>`,
  gate: `<svg viewBox="0 0 64 64"><defs><radialGradient id="igg"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#d59cff"/><stop offset="1" stop-color="#4b1d8a"/></radialGradient></defs>
    <ellipse cx="32" cy="32" rx="22" ry="27" fill="url(#igg)"/>
    <path d="M32,32 m-14,0 a14,16 0 1,1 28,0 a10,12 0 1,1 -20,0 a6,8 0 1,1 12,0" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>
    <ellipse cx="32" cy="32" rx="24" ry="29" fill="none" stroke="#c8792f" stroke-width="5"/><ellipse cx="32" cy="32" rx="24" ry="29" fill="none" stroke="#f7c843" stroke-width="1.5" stroke-dasharray="4 5"/>
    <circle cx="32" cy="3" r="3.5" fill="#e0546a" stroke="#fff" stroke-width="1"/></svg>`,
  chrono: `<svg viewBox="0 0 64 64"><rect x="6" y="10" width="52" height="48" rx="6" fill="#c0c4cc" stroke="#6f7480" stroke-width="2"/>
    <rect x="6" y="10" width="52" height="10" rx="5" fill="#9aa0ab"/><circle cx="14" cy="15" r="2" fill="#e0546a"/><circle cx="21" cy="15" r="2" fill="#f7c843"/>
    <circle cx="32" cy="40" r="15" fill="#fff7ea" stroke="#c8792f" stroke-width="3"/>
    <g stroke="#7a4a2c" stroke-width="1.5"><line x1="32" y1="27" x2="32" y2="30"/><line x1="45" y1="40" x2="42" y2="40"/><line x1="32" y1="53" x2="32" y2="50"/><line x1="19" y1="40" x2="22" y2="40"/></g>
    <line x1="32" y1="40" x2="32" y2="31" stroke="#3b2214" stroke-width="2.5" stroke-linecap="round"/><line x1="32" y1="40" x2="39" y2="44" stroke="#e0546a" stroke-width="2" stroke-linecap="round"/><circle cx="32" cy="40" r="2" fill="#3b2214"/>
    <path d="M50,4 Q56,8 52,14" stroke="#f7c843" stroke-width="2" fill="none"/><path d="M12,4 Q6,8 10,14" stroke="#f7c843" stroke-width="2" fill="none"/></svg>`,
  quantum: `<svg viewBox="0 0 64 64"><g fill="none" stroke-width="2.2"><ellipse cx="32" cy="32" rx="28" ry="10" stroke="#5aa9e6"/><ellipse cx="32" cy="32" rx="28" ry="10" stroke="#e0546a" transform="rotate(60 32 32)"/><ellipse cx="32" cy="32" rx="28" ry="10" stroke="#3fae92" transform="rotate(-60 32 32)"/></g>
    <circle cx="32" cy="32" r="9" fill="#e8ad5f" stroke="#a8621f" stroke-width="1.5"/><circle cx="30" cy="30" r="1.6" fill="#3e1f0e"/><circle cx="34.5" cy="33.5" r="1.4" fill="#3e1f0e"/><circle cx="29" cy="35" r="1" fill="#3e1f0e"/>
    <circle cx="60" cy="32" r="3" fill="#5aa9e6"/><circle cx="18" cy="8" r="3" fill="#e0546a"/><circle cx="18" cy="56" r="3" fill="#3fae92"/></svg>`,
  forge: `<svg viewBox="0 0 64 64"><path d="M32,2 L38,20 L57,20 L42,31 L48,49 L32,38 L16,49 L22,31 L7,20 L26,20Z" fill="#ffd34d" stroke="#e09000" stroke-width="2" stroke-linejoin="round"/>
    <path d="M32,10 L35,20 L29,20Z" fill="#fff" opacity=".6"/>
    <path d="M14,52 L50,52 L46,58 L18,58Z M24,58 L22,62 L42,62 L40,58Z" fill="#4a4f5a" stroke="#262a31" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M10,48 L54,48 L50,53 L14,53Z" fill="#6b7280" stroke="#262a31" stroke-width="1.5"/>
    <g fill="#ffb347"><circle cx="20" cy="44" r="1.5"/><circle cx="46" cy="42" r="1.5"/><circle cx="52" cy="38" r="1"/><circle cx="12" cy="40" r="1"/></g></svg>`,
  dream: `<svg viewBox="0 0 64 64"><path d="M40,6 A24,24 0 1,0 58,40 A18,18 0 1,1 40,6Z" fill="#ffe8a3" stroke="#e0b445" stroke-width="2"/>
    <path d="M6,50 Q6,40 16,40 Q18,32 28,34 Q34,28 42,34 Q52,34 52,44 Q60,46 58,54 L8,56 Q4,54 6,50Z" fill="#fff" stroke="#c9cde8" stroke-width="2"/>
    <circle cx="30" cy="46" r="6" fill="#e8ad5f" stroke="#a8621f" stroke-width="1"/><circle cx="29" cy="45" r="1.1" fill="#3e1f0e"/><circle cx="32" cy="48" r="1" fill="#3e1f0e"/>
    <g fill="#ffe066"><circle cx="14" cy="14" r="1.6"/><circle cx="22" cy="22" r="1"/><circle cx="8" cy="28" r="1.2"/></g>
    <text x="44" y="26" font-size="9" font-family="Fredoka, sans-serif" fill="#8a7fd0" font-weight="700">z</text><text x="50" y="18" font-size="7" font-family="Fredoka, sans-serif" fill="#8a7fd0" font-weight="700">z</text></svg>`,
  verse: `<svg viewBox="0 0 64 64"><defs><radialGradient id="ivg"><stop offset="0" stop-color="#fff4c2"/><stop offset=".3" stop-color="#ff9ad5"/><stop offset=".7" stop-color="#6a3ec2"/><stop offset="1" stop-color="#1b0f3d" stop-opacity="0"/></radialGradient></defs>
    <circle cx="32" cy="32" r="30" fill="url(#ivg)"/>
    <path d="M32,32 C40,24 52,28 54,36 M32,32 C24,40 12,36 10,28 M32,32 C40,40 36,52 28,54 M32,32 C24,24 28,12 36,10" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>
    <circle cx="32" cy="32" r="8" fill="#e8ad5f" stroke="#a8621f" stroke-width="1.5"/><circle cx="30" cy="30" r="1.4" fill="#3e1f0e"/><circle cx="34" cy="34" r="1.2" fill="#3e1f0e"/>
    <g fill="#fff"><circle cx="10" cy="12" r="1.2"/><circle cx="54" cy="10" r="1"/><circle cx="56" cy="52" r="1.3"/><circle cx="8" cy="50" r="1"/></g></svg>`,
};

const UI_ICONS = {
  soundOn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" fill-opacity=".25"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>`,
  soundOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" fill-opacity=".25"/><path d="M17 9l5 6M22 9l-5 6"/></svg>`,
  store: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 9l2-5h14l2 5"/><path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 13v7h14v-7"/><path d="M10 20v-4h4v4"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>`,
};

const TIER_COLORS = ['#e9b36a', '#c0c7d2', '#f7c843', '#7ad3ff', '#b48aff', '#ff7eb6', '#4fd1a5', '#ff9447', '#ffffff'];

function iconBox(inner, color, badge) {
  const c = color || '#f1d7b2';
  return `<svg viewBox="0 0 64 64"><defs><linearGradient id="ib${svgUid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lighten(c, 0.5)}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>
    <rect x="1" y="1" width="62" height="62" rx="12" fill="url(#ib${svgUid++})"/>
    <g transform="translate(8 8) scale(.75)">${stripSvg(inner)}</g>
    ${badge ? `<circle cx="52" cy="52" r="10" fill="#3b2214" stroke="#fff" stroke-width="2"/><text x="52" y="56.5" text-anchor="middle" font-size="12" font-weight="700" font-family="Fredoka, sans-serif" fill="#fff">${badge}</text>` : ''}</svg>`;
}
function stripSvg(svg) {
  // Unwrap the outer <svg> so the inner content can be nested & transformed; make ids unique.
  const u = 'n' + (svgUid++);
  return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
    .replace(/id="([^"]+)"/g, `id="$1${u}"`).replace(/url\(#([^)]+)\)/g, `url(#$1${u})`);
}
Art.nest = (svg, x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${stripSvg(svg)}</g>`;

Art.tool = function (kind, color) {
  const tools = {
    pin: `<svg viewBox="0 0 64 64"><g transform="rotate(-35 32 32)"><rect x="4" y="27" width="10" height="10" rx="4" fill="#8a5530"/><rect x="50" y="27" width="10" height="10" rx="4" fill="#8a5530"/><rect x="13" y="22" width="38" height="20" rx="9" fill="${color}" stroke="#5a3420" stroke-width="2"/><rect x="18" y="25" width="26" height="4" rx="2" fill="#fff" opacity=".5"/></g></svg>`,
    whisk: `<svg viewBox="0 0 64 64"><g transform="rotate(30 32 32)"><rect x="28" y="40" width="8" height="22" rx="4" fill="#8a5530" stroke="#5a3420" stroke-width="1.5"/><g fill="none" stroke="${color}" stroke-width="3"><path d="M32,40 C16,30 20,4 32,4 C44,4 48,30 32,40Z"/><path d="M32,40 C24,30 26,4 32,4 C38,4 40,30 32,40Z"/><line x1="32" y1="4" x2="32" y2="40"/></g></g></svg>`,
    drop: `<svg viewBox="0 0 64 64"><path d="M32,4 C32,4 12,30 12,42 C12,54 21,60 32,60 C43,60 52,54 52,42 C52,30 32,4 32,4Z" fill="${color}" stroke="${darken(color, .35)}" stroke-width="2"/><ellipse cx="24" cy="40" rx="5" ry="8" fill="#fff" opacity=".45"/></svg>`,
    clover: `<svg viewBox="0 0 64 64"><g fill="${color}" stroke="${darken(color, .35)}" stroke-width="2"><circle cx="22" cy="22" r="12"/><circle cx="42" cy="22" r="12"/><circle cx="22" cy="42" r="12"/><circle cx="42" cy="42" r="12"/></g><circle cx="32" cy="32" r="6" fill="#ffd34d"/><path d="M40,44 Q48,56 56,60" stroke="#3e7a2a" stroke-width="3" fill="none"/></svg>`,
    trophy: `<svg viewBox="0 0 64 64"><path d="M18,8 L46,8 L46,24 C46,34 40,40 32,40 C24,40 18,34 18,24Z" fill="${color}" stroke="${darken(color, .35)}" stroke-width="2"/><path d="M18,14 L8,14 C8,24 12,28 18,28 M46,14 L56,14 C56,24 52,28 46,28" fill="none" stroke="${darken(color, .35)}" stroke-width="3"/><rect x="28" y="40" width="8" height="10" fill="${darken(color, .2)}"/><rect x="18" y="50" width="28" height="8" rx="2" fill="#7a4a2c"/><path d="M25,14 L25,26" stroke="#fff" stroke-width="3" opacity=".5" stroke-linecap="round"/></svg>`,
    star: `<svg viewBox="0 0 64 64"><path d="M32,4 L39,23 L59,23 L43,35 L49,55 L32,43 L15,55 L21,35 L5,23 L25,23Z" fill="${color}" stroke="${darken(color, .35)}" stroke-width="2" stroke-linejoin="round"/></svg>`,
    halo: `<svg viewBox="0 0 64 64"><ellipse cx="32" cy="18" rx="22" ry="7" fill="none" stroke="${color}" stroke-width="5"/><path d="M8,40 Q20,30 32,38 Q44,30 56,40 Q44,46 32,58 Q20,46 8,40Z" fill="#fff" stroke="#d8d0f5" stroke-width="2"/></svg>`,
    clock: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#fff7ea" stroke="${color}" stroke-width="5"/><line x1="32" y1="32" x2="32" y2="16" stroke="#3b2214" stroke-width="4" stroke-linecap="round"/><line x1="32" y1="32" x2="44" y2="38" stroke="#3b2214" stroke-width="3" stroke-linecap="round"/></svg>`,
    hat: `<svg viewBox="0 0 64 64"><path d="M14,36 C4,34 6,16 18,18 C20,6 40,4 44,16 C58,12 62,32 50,36 L50,52 L14,52Z" fill="#fff" stroke="#c8b8a0" stroke-width="2"/><rect x="14" y="44" width="36" height="8" fill="${color}"/></svg>`,
    bag: `<svg viewBox="0 0 64 64"><path d="M20,18 L44,18 L52,58 L12,58Z" fill="${color}" stroke="${darken(color, .35)}" stroke-width="2" stroke-linejoin="round"/><path d="M24,18 C24,6 40,6 40,18" fill="none" stroke="${darken(color, .35)}" stroke-width="3"/><circle cx="32" cy="38" r="8" fill="#e8ad5f" stroke="#a8621f"/></svg>`,
    dice: `<svg viewBox="0 0 64 64"><rect x="8" y="8" width="48" height="48" rx="10" fill="${color}" stroke="${darken(color, .35)}" stroke-width="2"/><g fill="#3b2214"><circle cx="22" cy="22" r="4"/><circle cx="42" cy="42" r="4"/><circle cx="32" cy="32" r="4"/><circle cx="42" cy="22" r="4"/><circle cx="22" cy="42" r="4"/></g></svg>`,
    bowl: `<svg viewBox="0 0 64 64"><path d="M6,30 L58,30 C58,46 46,56 32,56 C18,56 6,46 6,30Z" fill="${color}" stroke="${darken(color, .35)}" stroke-width="2"/><g><rect x="18" y="20" width="8" height="3" rx="1.5" fill="#ff6b8a" transform="rotate(20 22 21)"/><rect x="30" y="14" width="8" height="3" rx="1.5" fill="#6bc5ff"/><rect x="40" y="22" width="8" height="3" rx="1.5" fill="#ffe066" transform="rotate(-30 44 23)"/></g></svg>`,
    fortune: `<svg viewBox="0 0 64 64"><path d="M6,40 C6,18 26,10 34,22 C42,10 60,18 58,40 C50,32 42,34 34,44 C26,34 14,32 6,40Z" fill="${color}" stroke="${darken(color, .35)}" stroke-width="2" stroke-linejoin="round"/><path d="M30,40 L44,52 L48,48 L34,38Z" fill="#fff" stroke="#d8b98d"/></svg>`,
  };
  return tools[kind] || tools.star;
};

Art.season = function (season, i) {
  const S2 = SEASONS[season];
  const col = S2.colors[i % S2.colors.length];
  if (season === 'harvest') {
    const faces = [
      '<path d="M32,42 L40,36 L41,44Z M68,42 L60,36 L59,44Z" fill="#2a0e00"/><path d="M32,60 Q50,74 68,60 Q50,66 32,60Z" fill="#2a0e00"/>',
      '<circle cx="38" cy="42" r="5" fill="#fff"/><circle cx="62" cy="42" r="5" fill="#fff"/><circle cx="38" cy="42" r="2.5" fill="#000"/><circle cx="62" cy="42" r="2.5" fill="#000"/><ellipse cx="50" cy="64" rx="8" ry="6" fill="#2a0e00"/>',
      '<path d="M30,44 Q38,36 46,44 M54,44 Q62,36 70,44" stroke="#2a0e00" stroke-width="3" fill="none"/><path d="M36,60 L64,60 L58,68 L42,68Z" fill="#2a0e00"/>',
      '<path d="M50,20 L56,40 L76,40 L60,52 L66,72 L50,60 L34,72 L40,52 L24,40 L44,40Z" fill="none" stroke="#2a0e00" stroke-width="2.5"/>',
    ];
    return Art.cookie({ seed: 300 + i, chips: i % 2 ? 0 : 3, cracks: 1, dough: col, edge: darken(col, .35), chip: '#2a0e00', face: faces[i % faces.length] });
  }
  if (season === 'frost') {
    return `<svg viewBox="0 0 100 100"><path d="M50,8 C60,8 64,16 62,26 L74,30 C82,32 82,42 74,42 L64,42 L66,60 L76,86 C78,92 70,96 66,90 L50,70 L34,90 C30,96 22,92 24,86 L34,60 L36,42 L26,42 C18,42 18,32 26,30 L38,26 C36,16 40,8 50,8Z" fill="#c8792f" stroke="#8a4a1a" stroke-width="2"/>
      <circle cx="44" cy="18" r="2.5" fill="#3b2214"/><circle cx="56" cy="18" r="2.5" fill="#3b2214"/><path d="M44,24 Q50,28 56,24" stroke="${col}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M28,36 Q32,32 36,36 M64,36 Q68,32 72,36 M40,82 Q36,78 32,82 M60,82 Q64,78 68,82" stroke="${col}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <circle cx="50" cy="40" r="3.5" fill="${col}"/><circle cx="50" cy="52" r="3.5" fill="${col}"/><circle cx="50" cy="64" r="3" fill="${['#e0546a', '#3fae92', '#f7c843'][i % 3]}"/></svg>`;
  }
  if (season === 'sweet') {
    return `<svg viewBox="0 0 100 100"><path d="M50,88 C12,62 6,36 22,22 C36,12 48,20 50,32 C52,20 64,12 78,22 C94,36 88,62 50,88Z" fill="#e8ad5f" stroke="#a8621f" stroke-width="2"/>
      <path d="M50,80 C20,58 16,40 27,30 C37,22 47,28 50,38 C53,28 63,22 73,30 C84,40 80,58 50,80Z" fill="${col}"/>
      ${i % 3 === 0 ? '<path d="M36,48 Q50,40 64,48" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>' : ''}
      ${i % 3 === 1 ? '<circle cx="40" cy="44" r="3" fill="#fff"/><circle cx="58" cy="52" r="3" fill="#fff"/><circle cx="50" cy="62" r="2.5" fill="#fff"/>' : ''}
      ${i % 3 === 2 ? '<path d="M50,64 C40,56 38,48 44,45 C47,43 50,46 50,49 C50,46 53,43 56,45 C62,48 60,56 50,64Z" fill="#fff"/>' : ''}
      <ellipse cx="34" cy="36" rx="6" ry="3.5" fill="#fff" opacity=".5" transform="rotate(-30 34 36)"/></svg>`;
  }
  // bloom — painted eggs
  const c2 = S2.colors[(i + 3) % S2.colors.length];
  const pats = [
    `<path d="M14,50 L86,50" stroke="${c2}" stroke-width="8"/><path d="M16,66 L84,66" stroke="#fff" stroke-width="4"/>`,
    `<g fill="${c2}"><circle cx="34" cy="40" r="5"/><circle cx="58" cy="34" r="5"/><circle cx="66" cy="58" r="5"/><circle cx="40" cy="66" r="5"/><circle cx="50" cy="50" r="4" fill="#fff"/></g>`,
    `<path d="M14,52 L26,44 L38,52 L50,44 L62,52 L74,44 L86,52" stroke="${c2}" stroke-width="5" fill="none"/><path d="M16,68 L28,60 L40,68 L52,60 L64,68 L76,60 L84,66" stroke="#fff" stroke-width="3" fill="none"/>`,
    `<path d="M50,30 L54,42 L66,42 L56,50 L60,62 L50,54 L40,62 L44,50 L34,42 L46,42Z" fill="${c2}"/>`,
  ];
  return `<svg viewBox="0 0 100 100"><defs><clipPath id="egg${season}${i}${svgUid}"><path d="M50,6 C74,6 88,44 88,62 C88,82 72,94 50,94 C28,94 12,82 12,62 C12,44 26,6 50,6Z"/></clipPath></defs>
    <path d="M50,6 C74,6 88,44 88,62 C88,82 72,94 50,94 C28,94 12,82 12,62 C12,44 26,6 50,6Z" fill="${col}" stroke="${darken(col, .3)}" stroke-width="2"/>
    <g clip-path="url(#egg${season}${i}${svgUid++})">${pats[i % pats.length]}</g>
    <ellipse cx="36" cy="26" rx="7" ry="4" fill="#fff" opacity=".55" transform="rotate(-30 36 26)"/></svg>`;
};

/* ==========================================================================
   Game data
   ========================================================================== */
const BUILDINGS = [
  { id: 'hand', name: 'Helping Hand', plural: 'Helping Hands', base: 15, cps: 0.3, color: '#f0b98a',
    desc: 'A friendly floating hand that taps the cookie for you every 10 seconds.' },
  { id: 'nana', name: 'Nana', plural: 'Nanas', base: 80, cps: 2, color: '#e0546a',
    desc: 'A sweet old baker with decades of secret recipes and a bottomless tin.' },
  { id: 'cart', name: 'Cookie Cart', plural: 'Cookie Carts', base: 800, cps: 12, color: '#e98a45',
    desc: 'A striped street cart that bakes and sells cookies to passers-by.' },
  { id: 'orchard', name: 'Dough Orchard', plural: 'Dough Orchards', base: 9000, cps: 70, color: '#5dbb63',
    desc: 'Trees that grow little balls of cookie dough. Harvest season is always.' },
  { id: 'quarry', name: 'Sugar Quarry', plural: 'Sugar Quarries', base: 100000, cps: 400, color: '#b89b84',
    desc: 'Digs deep into mountains of crystallized sugar and buried chocolate veins.' },
  { id: 'plant', name: 'Bakery Plant', plural: 'Bakery Plants', base: 1.1e6, cps: 2100, color: '#c8792f',
    desc: 'An industrial oven complex humming with conveyor belts of cookies.' },
  { id: 'lab', name: 'Sprinkle Lab', plural: 'Sprinkle Labs', base: 1.6e7, cps: 11000, color: '#ff7eb6',
    desc: 'Scientists synthesize cookies from pure sprinkle energy. Goggles required.' },
  { id: 'harbor', name: 'Cocoa Harbor', plural: 'Cocoa Harbors', base: 3.3e8, cps: 44000, color: '#5aa9e6',
    desc: 'Fleets of ships haul cocoa from every coast and bake cookies on deck.' },
  { id: 'rocket', name: 'Cookie Rocket', plural: 'Cookie Rockets', base: 5.1e9, cps: 2.6e5, color: '#9aa0ab',
    desc: 'Brings back cookies from the crunchy moons of the outer solar system.' },
  { id: 'gate', name: 'Dough Dimension Gate', plural: 'Dough Dimension Gates', base: 7.5e10, cps: 1.6e6, color: '#a76ae0',
    desc: 'Opens a doorway into a universe made entirely of raw cookie dough.' },
  { id: 'chrono', name: 'Chrono Oven', plural: 'Chrono Ovens', base: 1e12, cps: 1e7, color: '#6f7480',
    desc: 'Bakes cookies yesterday so you can enjoy them today. Never burns them.' },
  { id: 'quantum', name: 'Quantum Mixer', plural: 'Quantum Mixers', base: 1.4e13, cps: 6.5e7, color: '#3fae92',
    desc: 'Stirs batter in every possible state at once until a cookie is observed.' },
  { id: 'forge', name: 'Star Forge', plural: 'Star Forges', base: 1.7e14, cps: 4.3e8, color: '#e9a514',
    desc: 'Hammers dying stars into perfectly golden, perfectly round cookies.' },
  { id: 'dream', name: 'Dream Bakery', plural: 'Dream Bakeries', base: 2.1e15, cps: 2.9e9, color: '#8a7fd0',
    desc: 'Harvests cookies baked in the dreams of sleeping people everywhere.' },
  { id: 'verse', name: 'Cookieverse Engine', plural: 'Cookieverse Engines', base: 2.6e16, cps: 2.1e10, color: '#6a3ec2',
    desc: 'Rewrites the laws of physics so that matter itself prefers to be cookies.' },
];
const B = {};
BUILDINGS.forEach((b, i) => { b.index = i; B[b.id] = b; });

/* ---------- Upgrades ---------- */
const UPGRADES = [];
const U = {};
function addUpgrade(u) {
  u.kind = u.kind || 'misc';
  UPGRADES.push(u); U[u.id] = u;
  return u;
}

// Helping Hand & click upgrades
[
  ['Reinforced Fingertips', 50, 1, { clickMult: 2 }, 'Clicking and Helping Hands are <b>twice</b> as efficient.', 'Hand-crafted, literally.'],
  ['Calloused Knuckles', 400, 1, { clickMult: 2 }, 'Clicking and Helping Hands are <b>twice</b> as efficient.', 'Tough skin for tough dough.'],
  ['Ambidextrous Baking', 8000, 10, { clickMult: 2 }, 'Clicking and Helping Hands are <b>twice</b> as efficient.', 'Why tap with one hand when you could tap with both?'],
  ['Thousand Palms', 1e5, 25, { flatAdd: 0.1 }, 'Clicking and Helping Hands gain <b>+0.1</b> cookies for each non-hand building owned.', 'Applause makes the dough rise.'],
  ['Million Palms', 1e7, 50, { flatMult: 5 }, 'Multiplies the gain from Thousand Palms by <b>5</b>.', 'A standing ovation of fingers.'],
  ['Billion Palms', 1e8, 100, { flatMult: 10 }, 'Multiplies the gain from Thousand Palms by <b>10</b>.', 'The cookie is starting to feel self-conscious.'],
  ['Trillion Palms', 1e9, 150, { flatMult: 20 }, 'Multiplies the gain from Thousand Palms by <b>20</b>.', 'High-fives across the galaxy.'],
  ['Quadrillion Palms', 1e10, 200, { flatMult: 20 }, 'Multiplies the gain from Thousand Palms by <b>20</b>.', 'You can hear the clapping from orbit.'],
  ['Quintillion Palms', 1e13, 250, { flatMult: 20 }, 'Multiplies the gain from Thousand Palms by <b>20</b>.', 'Hands all the way down.'],
  ['Infinite Palms', 1e16, 300, { flatMult: 20 }, 'Multiplies the gain from Thousand Palms by <b>20</b>.', 'There is no longer a cookie. Only the tap.'],
].forEach(([name, cost, req, fx, desc, quote], i) => addUpgrade({
  id: 'hand' + i, name, cost, kind: 'hand', tier: i, desc, quote, ...fx,
  unlock: () => S.buildings.hand >= req,
  req: `Own ${req} ${plural(req, 'Helping Hand')}`,
}));

// Clicks gain % of CpS
[
  ['Wooden Rolling Pin', 1e3, 5e4], ['Brass Spatula', 1e5, 5e6], ['Silver Whisk', 1e7, 5e8], ['Golden Ladle', 1e9, 5e10],
  ['Diamond Mixer', 1e11, 5e12], ['Plasma Oven Mitts', 1e13, 5e14], ['Nebula Spoon', 1e15, 5e16], ['Infinity Spatula', 1e17, 5e18],
].forEach(([name, req, cost], i) => addUpgrade({
  id: 'tool' + i, name, cost, kind: 'tool', tier: i, clickPct: 0.01,
  desc: 'Clicking gains <b>+1%</b> of your CpS.',
  quote: ['A classic. Smells faintly of pine.', 'Shiny enough to see your reflection in the batter.', 'Whips cream into a frenzy.', 'Scoops liquid sunshine.', 'Mixes so hard it cuts glass.', 'Handles anything up to 10,000 degrees.', 'Stirs the cosmic soup.', 'It flips itself.'][i],
  unlock: () => S.handmadeRun >= req,
  req: `Bake ${fmtStatic(req)} cookies by hand`,
}));

// Building tier upgrades
const TIER_REQ = [1, 5, 25, 50, 100, 150, 200, 250];
const TIER_COST = [10, 50, 500, 5e4, 5e6, 5e8, 5e10, 5e12];
const TIER_ADJ = ['Polished', 'Reinforced', 'Enchanted', 'Turbocharged', 'Crystalline', 'Celestial', 'Paradoxical', 'Transcendent'];
const TIER_NOUN = {
  nana: 'Rolling Pins', cart: 'Cart Wheels', orchard: 'Fertilizer', quarry: 'Pickaxes', plant: 'Conveyor Belts',
  lab: 'Beakers', harbor: 'Cargo Cranes', rocket: 'Boosters', gate: 'Portal Frames', chrono: 'Clockwork',
  quantum: 'Qubits', forge: 'Anvils', dream: 'Pillows', verse: 'Singularities',
};
const TIER_QUOTES = [
  'A little elbow grease goes a long way.', 'Built to last at least until lunch.', 'Glows softly when nobody is looking.',
  'Now with racing stripes.', 'Refracts light into tiny cookie rainbows.', 'Blessed by a passing comet.',
  'Works best before it was invented.', 'Has ascended beyond mere usefulness.',
];
BUILDINGS.forEach(b => {
  if (b.id === 'hand') return;
  TIER_REQ.forEach((req, t) => addUpgrade({
    id: `${b.id}T${t}`, name: `${TIER_ADJ[t]} ${TIER_NOUN[b.id]}`, cost: b.base * TIER_COST[t],
    kind: 'building', building: b.id, tier: t, bmult: 2,
    desc: `${b.plural} are <b>twice</b> as efficient.`, quote: TIER_QUOTES[t],
    unlock: () => S.buildings[b.id] >= req,
    req: `Own ${req} ${plural(req, b.name, b.plural)}`,
  }));
});

// Nana synergies
const SYNERGY = [
  ['cart', 'Street-Vendor Nanas', 'pushed carts uphill both ways'], ['orchard', 'Gardening Nanas', 'grew our own dough'],
  ['quarry', 'Miner Nanas', 'mined sugar with teaspoons'], ['plant', 'Shift-Manager Nanas', 'ran the night shift'],
  ['lab', 'Scientist Nanas', 'invented sprinkles'], ['harbor', 'Sea-Captain Nanas', 'sailed the cocoa seas'],
  ['rocket', 'Astronaut Nanas', 'walked on the moon for fun'], ['gate', 'Interdimensional Nanas', 'went through the dough gate twice'],
  ['chrono', 'Time-Traveling Nanas', "baked tomorrow's cookies today"], ['quantum', 'Superposed Nanas', 'were in two kitchens at once'],
  ['forge', 'Stellar Nanas', 'forged stars before breakfast'], ['dream', 'Sleepwalking Nanas', 'baked in our sleep'],
  ['verse', 'Omnipresent Nanas', 'were simply everywhere'],
];
SYNERGY.forEach(([bid, name, memory]) => {
  const b = B[bid];
  addUpgrade({
    id: 'syn_' + bid, name, cost: b.base * 50, kind: 'synergy', building: bid,
    desc: `Nanas are <b>twice</b> as efficient. ${b.plural} gain <b>+1%</b> CpS per 10 Nanas.`,
    quote: `"Back in my day, we ${memory}."`,
    unlock: () => S.buildings.nana >= 1 && S.buildings[bid] >= 15,
    req: `Own 1 Nana and 15 ${b.plural}`,
  });
});

// Flavor cookies (+% global CpS)
const FLAVORS = [
  ['Butter Swirl', '#f2d08c', '#c98a3a', '#7a4a1a'], ['Oatmeal Sunrise', '#e3c08a', '#a8763c', '#8a3a1a'],
  ['Peanut Butter Cloud', '#e0a860', '#a86a2a', '#6b3d22'], ['Double Cocoa Crunch', '#7a4a2c', '#4a2614', '#f2e6d8'],
  ['Snickerdoodle Spin', '#f4d9a8', '#c9945a', '#b06a3a'], ['Ginger Glow', '#c8792f', '#8a4a1a', '#fff7ea'],
  ['Lemon Zest Drop', '#fff0a0', '#e0c040', '#f7e070'], ['Maple Pecan Disc', '#d8a060', '#9a5e2a', '#6b3d22'],
  ['Salted Caramel Moon', '#e8b070', '#b0702a', '#ffffff'], ['Mint Chip Breeze', '#bfeccc', '#6fbf8a', '#3b2214'],
  ['Raspberry Ripple', '#ffd0dc', '#e07890', '#c2185b'], ['Pistachio Dream', '#cfe3a0', '#8aa850', '#5a7a2a'],
  ['Toffee Thunder', '#d89a50', '#9a5a1a', '#ffd34d'], ['Coconut Lagoon', '#fbf3e4', '#d8c8a8', '#a8763c'],
  ['Espresso Midnight', '#5a3420', '#2a160a', '#e8c8a0'], ['Honey Lavender', '#f2e0a0', '#c0a050', '#a38ad8'],
  ['Matcha Meadow', '#b8d890', '#7aa050', '#fff7ea'], ['Black Sesame Sky', '#555555', '#222222', '#eeeeee'],
  ['Cherry Blossom Crisp', '#ffe0ea', '#f0a0b8', '#e05080'], ['Dulce Delight', '#e8b880', '#b07840', '#7a3a10'],
  ['Rainbow Sprinkle Bomb', '#fff4dc', '#e8c890', '#ff6b8a'], ['Molten Lava Core', '#6b2a10', '#3a1005', '#ff6a1a'],
  ['Stardust Shortbread', '#f8eac8', '#c8b080', '#d0c0ff'], ['Aurora Biscotti', '#d8f0ff', '#80b0e0', '#a0ffd0'],
  ['Cosmic Crinkle', '#4a3a8a', '#201850', '#ffe066'], ['Eternity Macaron', '#ffd0f0', '#d080c0', '#ffffff'],
];
const FLAVOR_QUOTES = ['Fresh out of the oven.', 'Tastes like victory.', 'A new family favorite.', 'Pairs wonderfully with milk.',
  'Do not tell Nana about this one.', 'The recipe was found on a napkin.', 'Crunchy outside, gooey inside.', 'Award-winning, probably.'];
FLAVORS.forEach(([name, dough, edge, chip], i) => {
  const cost = 1e5 * Math.pow(10, i * 0.72);
  const pct = i < 8 ? 0.05 : i < 16 ? 0.08 : 0.1;
  addUpgrade({
    id: 'flavor' + i, name: name + ' Cookies', cost, kind: 'flavor', tier: i, globalPct: pct,
    colors: { dough, edge, chip, sprinkles: i === 20 ? 14 : 0 },
    desc: `Cookie production multiplier <b>+${Math.round(pct * 100)}%</b>.`,
    quote: FLAVOR_QUOTES[i % FLAVOR_QUOTES.length],
    unlock: () => S.cookiesRun >= cost / 4,
    req: `Bake ${fmtStatic(Math.round(cost / 4))} cookies this run`,
  });
});

// Glaze (achievement-scaling) upgrades
const GLAZE = [
  ['Apprentice Pâtissier', 3, 9e3, 0.1], ['Junior Pâtissier', 10, 9e5, 0.125], ['Journeyman Pâtissier', 20, 9e7, 0.15],
  ['Senior Pâtissier', 35, 9e9, 0.175], ['Head Pâtissier', 50, 9e11, 0.2], ['Master Pâtissier', 70, 9e13, 0.2],
  ['Grand Pâtissier', 90, 9e15, 0.2], ['Legendary Pâtissier', 110, 9e17, 0.2],
];
const GLAZE_QUOTES = ['Learning to whisk properly.', 'Can pipe a perfect rosette.', 'Trusted with the good butter.', 'Has a tall hat.',
  'Has an even taller hat.', 'Speaks fluent croissant.', 'Glazes things with a glance.', 'Their éclairs are taught in schools.'];
GLAZE.forEach(([name, req, cost, f], i) => addUpgrade({
  id: 'glaze' + i, name, cost, kind: 'glaze', tier: i, glazeFactor: f,
  desc: `Your glaze boosts CpS by <b>${Math.round(f * 100)}%</b> of its level.<br>Glaze rises 4% per achievement.`,
  quote: GLAZE_QUOTES[i],
  unlock: () => achCount() >= req,
  req: `Unlock ${req} achievements`,
}));

// Golden cookie upgrades
addUpgrade({ id: 'gold0', name: 'Lucky Charm Bracelet', cost: 7.777e6, kind: 'golden', tier: 0, goldenFreq: 1.3, goldenStay: 2,
  desc: 'Golden cookies appear <b>30%</b> more often and stay <b>twice</b> as long.', quote: 'Jingles faintly when fortune is near.',
  unlock: () => S.goldenAll >= 7, req: 'Click 7 golden cookies' });
addUpgrade({ id: 'gold1', name: 'Four-Leaf Frosting', cost: 7.777e9, kind: 'golden', tier: 1, goldenDur: 2,
  desc: 'Golden cookie effects last <b>twice</b> as long.', quote: 'Grown in a very particular patch of icing.',
  unlock: () => S.goldenAll >= 27, req: 'Click 27 golden cookies' });
addUpgrade({ id: 'gold2', name: 'Golden Glaze Coating', cost: 7.777e12, kind: 'golden', tier: 2, goldenFreq: 1.5,
  desc: 'Golden cookies appear <b>50%</b> more often.', quote: 'Everything you touch turns to dough. Golden dough.',
  unlock: () => S.goldenAll >= 77, req: 'Click 77 golden cookies' });

/* ---------- Seasons ---------- */
const SEASONS = {
  harvest: {
    name: 'Harvest Moon', item: 'Spooky Treat', grad: 'linear-gradient(135deg,#ef7d1a,#4a2140)',
    blurb: 'Pumpkins glow, bats flutter and the golden cookies have grown faces. Collect spooky treats!',
    colors: ['#ff9a2e', '#ffb347', '#e86a10', '#ffc76b', '#d9711c', '#ff8a00', '#f0a050', '#ffa64d'],
    items: ['Ghostly Meringue', 'Pumpkin Snap', 'Bat-Wing Biscuit', 'Candy Corn Crunch', "Witch's Brew Bar", 'Skull Shortbread', 'Cobweb Crisp', 'Moonlight Macaron'],
    upgrades: [['Pumpkin Spice Blend', 0.05], ['Haunted Oven Mitts', 0.07], ['Jack-o-Lantern Glow', 0.1]],
    months: 'Oct 1 – Nov 7',
  },
  frost: {
    name: 'Frostfall', item: 'Gingerbread Pal', grad: 'linear-gradient(135deg,#3d9be0,#1d2c46)',
    blurb: 'Snow drifts across the bakery and golden cookies turn to snowflakes. Bake a gingerbread family!',
    colors: ['#ffffff', '#e0546a', '#3fae92', '#f7c843', '#7ad3ff', '#ff9ad5', '#b48aff', '#ffb347'],
    items: ['Gingerbread Scout', 'Gingerbread Skater', 'Gingerbread Chef', 'Gingerbread Knight', 'Gingerbread Poet', 'Gingerbread Pilot', 'Gingerbread Wizard', 'Gingerbread Royal'],
    upgrades: [['Peppermint Bark', 0.05], ['Hot Cocoa Fountain', 0.07], ['Aurora Icing', 0.1]],
    months: 'Dec 1 – Dec 31',
  },
  sweet: {
    name: 'Sweetheart Week', item: 'Heart Cookie', grad: 'linear-gradient(135deg,#e64d8a,#4a1630)',
    blurb: 'Love is in the oven. Golden cookies become hearts — collect a full box of sweethearts!',
    colors: ['#ff6fa5', '#ff9ac0', '#e64d8a', '#ffc2d8', '#d6336c', '#ffadd2', '#f783ac', '#c2185b'],
    items: ['Blushing Heart', 'Sprinkled Heart', 'Lacy Heart', 'Velvet Heart', 'Sugar Kiss', 'Rose Heart', "Cupid's Crumble", 'Forever Heart'],
    upgrades: [['Rosewater Glaze', 0.05], ['Chocolate Bouquet', 0.07], ['Heartfelt Recipe', 0.1]],
    months: 'Feb 1 – Feb 20',
  },
  bloom: {
    name: 'Spring Bloom', item: 'Painted Egg', grad: 'linear-gradient(135deg,#59b85b,#2e4a22)',
    blurb: 'Flowers bloom and golden cookies turn into eggs. Hunt for painted eggs all around the bakery!',
    colors: ['#ff9ad5', '#7ad3ff', '#9be37a', '#ffe066', '#c58aff', '#ffb347', '#6fe0c8', '#ff7e7e'],
    items: ['Dotted Egg', 'Striped Egg', 'Zigzag Egg', 'Star Egg', 'Meadow Egg', 'Sky Egg', 'Sunrise Egg', 'Rainbow Egg'],
    upgrades: [['Blossom Honey', 0.05], ['Fresh Garden Herbs', 0.07], ['First Light Batter', 0.1]],
    months: 'Mar 15 – Apr 30',
  },
};
const SEASON_ORDER = ['harvest', 'frost', 'sweet', 'bloom'];

function dateSeason(d = new Date()) {
  const m = d.getMonth() + 1, day = d.getDate();
  if (m === 10 || (m === 11 && day <= 7)) return 'harvest';
  if (m === 12) return 'frost';
  if (m === 2 && day <= 20) return 'sweet';
  if ((m === 3 && day >= 15) || m === 4) return 'bloom';
  return null;
}

SEASON_ORDER.forEach(sid => {
  SEASONS[sid].upgrades.forEach(([name, pct], i) => addUpgrade({
    id: `season_${sid}${i}`, name, cost: 0, kind: 'season', season: sid, tier: i, globalPct: pct,
    costFn: () => Math.max(1e4 * Math.pow(10, i), G.baseCps * 60 * 20 * Math.pow(4, i)),
    desc: `Cookie production multiplier <b>+${Math.round(pct * 100)}%</b>. Yours forever once bought.<br>Only sold during ${SEASONS[sid].name}; price scales with CpS.`,
    quote: 'A limited-time seasonal recipe.',
    unlock: () => activeSeason() === sid && S.cookiesRun >= 5e3,
    req: `Available during ${SEASONS[sid].name}`,
  }));
});

/* ---------- Heavenly upgrades ---------- */
const HEAVENLY = [
  { id: 'h_click', name: 'Seraphic Spatula', cost: 1, desc: 'Clicking is <b>twice</b> as powerful.', icon: ['whisk', '#ffe27a'] },
  { id: 'h_cps1', name: 'Halo Oven', cost: 3, desc: 'Cookie production <b>+10%</b>.', icon: ['halo', '#ffe27a'] },
  { id: 'h_gold', name: 'Golden Patience', cost: 7, desc: 'Golden cookies appear <b>15%</b> more often.', icon: ['clover', '#ffd34d'] },
  { id: 'h_offline', name: "Dreamer's Pillow", cost: 10, desc: 'Offline baking efficiency raised from <b>25%</b> to <b>60%</b>.', icon: ['clock', '#a38ad8'] },
  { id: 'h_cap', name: 'Endless Night Shift', cost: 25, desc: 'Offline baking cap raised from <b>12 hours</b> to <b>3 days</b>.', icon: ['clock', '#7b6bd6'] },
  { id: 'h_season', name: 'Seasonal Spirit', cost: 33, desc: 'Seasonal treats drop <b>twice</b> as often.', icon: ['bag', '#ef7d1a'] },
  { id: 'h_disc1', name: 'Celestial Discount', cost: 50, desc: 'Buildings are <b>5%</b> cheaper.', icon: ['bag', '#9be37a'] },
  { id: 'h_upg', name: 'Heavenly Pantry', cost: 77, desc: 'Upgrades are <b>10%</b> cheaper.', icon: ['bag', '#7ad3ff'] },
  { id: 'h_glaze', name: 'Angelic Glaze', cost: 100, desc: 'Glaze is <b>10%</b> more powerful.', icon: ['drop', '#ffe7a8'] },
  { id: 'h_start', name: 'Starter Kit', cost: 150, desc: 'Begin each run with <b>10 Helping Hands</b> and <b>5 Nanas</b>.', icon: ['hat', '#ff7eb6'] },
  { id: 'h_lucky', name: 'Lucky Halo', cost: 250, desc: 'Golden cookie effects last <b>20%</b> longer.', icon: ['clover', '#ffe27a'] },
  { id: 'h_pot1', name: 'Ethereal Potency', cost: 500, desc: 'Prestige levels give <b>50%</b> more CpS.', icon: ['star', '#d0c0ff'] },
  { id: 'h_cps2', name: 'Divine Bakery', cost: 1000, desc: 'Cookie production <b>+25%</b>.', icon: ['halo', '#ffd34d'] },
  { id: 'h_disc2', name: 'Cosmic Discount', cost: 2500, desc: 'Buildings are another <b>5%</b> cheaper.', icon: ['bag', '#b48aff'] },
  { id: 'h_pot2', name: 'Infinite Halo', cost: 10000, desc: 'Prestige levels give <b>twice</b> as much CpS.', icon: ['star', '#ffffff'] },
];
const HV = {}; HEAVENLY.forEach(h => { HV[h.id] = h; });

/* ---------- Achievements ---------- */
const ACHIEVEMENTS = [];
const A = {};
function addAch(id, name, desc, check, icon, hidden) {
  const a = { id, name, desc, check, icon, hidden: !!hidden };
  ACHIEVEMENTS.push(a); A[id] = a;
}
function fmtStatic(n) {
  if (n < 1e6) return n.toLocaleString('en-US');
  const tier = Math.floor(Math.log10(n) / 3);
  const v = n / Math.pow(10, tier * 3);
  return (v % 1 === 0 ? v : v.toFixed(1)) + ' ' + NUM_WORDS[tier];
}
const BAKE_NAMES = ['First Batch', 'Kitchen Hobbyist', 'Neighborhood Favorite', 'Corner Bakery', 'Town Legend', 'Regional Sensation',
  'National Treasure', 'Continental Craze', 'Global Phenomenon', 'Orbital Oven', 'Solar Snack', 'Galactic Gourmet',
  'Universal Appetite', 'Multiversal Munchies', 'Cookie Singularity', 'Beyond Crumbs', 'The Final Batch?', 'Infinite Dough'];
[1, 1e3, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e14, 1e16, 1e18, 1e20, 1e22, 1e24, 1e27, 1e30].forEach((n, i) =>
  addAch('bake' + i, BAKE_NAMES[i], `Bake <b>${fmtStatic(n)}</b> ${n === 1 ? 'cookie' : 'cookies'} in total.`,
    () => S.cookiesAll >= n, ['cookie', i]));
const CPS_NAMES = ['Warm Oven', 'Steady Stream', 'Cookie Conveyor', 'Production Line', 'Mass Production', 'Industrial Revolution',
  'Cookie Tsunami', 'Batter Hurricane', 'Dough Supernova', 'Crumb Cascade', 'The Big Bake', 'Cookie Big Bang'];
[1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e8, 1e10, 1e12, 1e15, 1e18].forEach((n, i) =>
  addAch('cps' + i, CPS_NAMES[i], `Bake <b>${fmtStatic(n)}</b> cookies per second.`, () => G.baseCps >= n, ['clock', i]));
[[1, 'Curious Poke'], [100, 'Tap Dancer'], [1000, 'Finger Workout'], [10000, 'Clickaholic'], [50000, 'Tendon Legend']].forEach(([n, name], i) =>
  addAch('click' + i, name, `Click the big cookie <b>${fmtStatic(n)}</b> ${n === 1 ? 'time' : 'times'}.`, () => S.clicksAll >= n, ['pin', i]));
[[1e3, 'Handmade with Love'], [1e6, 'Artisanal'], [1e9, 'Hand of Fate'], [1e12, 'Godlike Grip'], [1e15, 'The Hand That Bakes']].forEach(([n, name], i) =>
  addAch('handmade' + i, name, `Bake <b>${fmtStatic(n)}</b> cookies by clicking.`, () => S.handmadeAll >= n, ['whisk', i]));
const BLD_ACH = [[1, 'Getting Started'], [50, 'Serious Business'], [100, 'Centurion'], [150, 'Overkill'], [200, 'Empire']];
BUILDINGS.forEach(b => BLD_ACH.forEach(([n, suffix], t) =>
  addAch(`b_${b.id}${t}`, `${b.name}: ${suffix}`, `Own <b>${n}</b> ${plural(n, b.name, b.plural)}.`, () => S.buildings[b.id] >= n, ['building', b.id, t])));
addAch('allb1', 'Diversified Portfolio', 'Own at least <b>1</b> of every building.', () => BUILDINGS.every(b => S.buildings[b.id] >= 1), ['trophy', 2]);
addAch('allb10', 'Balanced Breakfast', 'Own at least <b>10</b> of every building.', () => BUILDINGS.every(b => S.buildings[b.id] >= 10), ['trophy', 3]);
addAch('allb100', 'Cookie Conglomerate', 'Own at least <b>100</b> of every building.', () => BUILDINGS.every(b => S.buildings[b.id] >= 100), ['trophy', 5]);
[[100, 'Real Estate'], [500, 'Property Tycoon'], [1000, 'Skyline Baker'], [2000, 'Urban Sprawl']].forEach(([n, name], i) =>
  addAch('bt' + i, name, `Own <b>${n}</b> buildings in total.`, () => totalBuildings() >= n, ['trophy', i + 4]));
[[1, 'Shiny!'], [7, 'Lucky Streak'], [27, 'Gold Digger'], [77, 'Midas Muncher'], [777, 'Golden Age']].forEach(([n, name], i) =>
  addAch('gold' + i, name, `Click <b>${n}</b> golden ${plural(n, 'cookie')}.`, () => S.goldenAll >= n, ['golden', i]));
[[10, 'Upgrade Path'], [50, 'Tech Tree'], [100, 'Fully Loaded'], [150, 'Maxed Out']].forEach(([n, name], i) =>
  addAch('upg' + i, name, `Buy <b>${n}</b> upgrades.`, () => S.upgrades.length >= n, ['star', i + 1]));
addAch('asc0', 'Rebirth', 'Ascend for the first time.', () => S.ascensions >= 1, ['halo', 0]);
addAch('asc1', 'Reincarnated Baker', 'Ascend <b>5</b> times.', () => S.ascensions >= 5, ['halo', 1]);
addAch('asc2', 'Wheel of Dough', 'Ascend <b>25</b> times.', () => S.ascensions >= 25, ['halo', 2]);
[[1, 'Heaven Sent'], [100, 'Cloud Nine'], [10000, 'Celestial Pastry Chef']].forEach(([n, name], i) =>
  addAch('pl' + i, name, `Reach prestige level <b>${fmtStatic(n)}</b>.`, () => S.prestige >= n, ['star', 4 + i]));
addAch('hvall', 'Paradise Pantry', 'Buy every heavenly upgrade.', () => HEAVENLY.every(h => S.heavenly.includes(h.id)), ['halo', 4]);
addAch('frenzy', 'Feeding Frenzy', 'Have a Frenzy and a Click Storm active at the same time.', () => hasBuff('frenzy') && hasBuff('clickstorm'), ['golden', 3]);
addAch('mem0', 'Sharp Memory', 'Win a game of Memory Match.', () => S.mini.memoryWins >= 1, ['dice', 0]);
addAch('mem1', 'Total Recall', 'Win Memory Match in <b>12 moves</b> or fewer.', () => S.mini.memoryBest > 0 && S.mini.memoryBest <= 12, ['dice', 2]);
addAch('catch0', 'Butterfingers No More', 'Catch <b>30</b> sprinkles in one round of Sprinkle Catch.', () => S.mini.catchBest >= 30, ['bowl', 0]);
addAch('catch1', 'Sprinkle Sponge', 'Catch <b>60</b> sprinkles in one round of Sprinkle Catch.', () => S.mini.catchBest >= 60, ['bowl', 3]);
addAch('fort0', 'Wise Words', 'Crack open <b>10</b> fortune cookies.', () => S.mini.fortunes >= 10, ['fortune', 0]);
addAch('fort1', 'Oracle of Crumbs', 'Crack open <b>50</b> fortune cookies.', () => S.mini.fortunes >= 50, ['fortune', 3]);
addAch('seas0', 'Seasonal Snacker', 'Collect your first seasonal treat.', () => collectTotal() >= 1, ['season', 'harvest', 1]);
SEASON_ORDER.forEach(sid => addAch('seasall_' + sid, `${SEASONS[sid].name} Collector`, `Collect every ${SEASONS[sid].item.toLowerCase()}.`,
  () => (S.collect[sid] || []).length >= 8, ['season', sid, 7]));
addAch('quest0', 'Errand Runner', 'Complete a daily quest.', () => S.questsDone >= 1, ['star', 3]);
addAch('quest1', 'Quest Baker', 'Complete <b>25</b> daily quests.', () => S.questsDone >= 25, ['star', 5]);
addAch('streak3', 'Creature of Habit', 'Reach a <b>3-day</b> daily quest streak.', () => S.daily && S.daily.bestStreak >= 3, ['clock', 6]);
addAch('streak7', 'Weekly Regular', 'Reach a <b>7-day</b> daily quest streak.', () => S.daily && S.daily.bestStreak >= 7, ['clock', 7]);
addAch('h_rename', 'Grand Opening', 'Give your bakery a name.', () => S.flags.renamed, ['hat', 0], true);
addAch('h_mute', 'Silent Night Shift', 'Turn off the sound.', () => S.flags.muted, ['clock', 3], true);
addAch('h_sell', "Buyer's Remorse", 'Sell a building.', () => S.flags.sold, ['bag', 0], true);
addAch('h_export', 'Paranoid Baker', 'Export your save.', () => S.flags.exported, ['star', 0], true);
addAch('h_news', 'Stop the Presses', 'Click the news ticker.', () => S.flags.news, ['star', 2], true);
addAch('h_turbo', 'Turbo Fingers', 'Click the big cookie <b>15 times</b> in under 2 seconds.', () => S.flags.turbo, ['pin', 4], true);
addAch('h_zero', 'Penny Pincher', 'Have exactly <b>0</b> cookies after buying something.', () => S.flags.zero, ['cookie', 0], true);
addAch('h_night', 'Midnight Snack', 'Play between midnight and 4 AM.', () => S.flags.night, ['clock', 4], true);
addAch('h_wait', 'Patience is a Virtue', 'Come back after being away for at least <b>1 hour</b>.', () => S.flags.away, ['clock', 5], true);

/* ---------- News ---------- */
const NEWS = [
  () => 'Local baker discovers that cookies taste better when there are more of them.',
  () => 'Scientists confirm: the smell of fresh cookies can be detected from three towns over.',
  () => 'Milk futures soar as cookie production hits record highs.',
  () => 'Survey finds 9 out of 10 dentists "deeply concerned" about your bakery.',
  () => 'Pigeons report crumbs are "of exceptional quality this year."',
  () => 'Opinion: is a cookie just a flat cake with commitment issues?',
  () => 'Man who ate only one cookie "not sure what came over him."',
  () => 'Weather forecast: cloudy with a chance of sprinkles.',
  () => 'Town council votes to rename Main Street to "Chocolate Chip Boulevard."',
  () => 'Breaking: cookie jar found empty. Suspect "definitely not" the dog.',
  () => 'Philosophers debate whether a broken cookie has fewer calories. Results inconclusive.',
  () => 'Local gym closes after members "just kept smelling the bakery."',
  () => 'Study: tapping a cookie is now the third most popular hobby in the world.',
  () => 'Rolling pin manufacturer reports "best quarter ever."',
  () => 'Interview: "I don\'t even like cookies," says person holding seven cookies.',
  () => 'Astronomers discover a crater on the moon shaped exactly like a bite mark.',
  () => 'Cats remain unimpressed by entire cookie industry.',
  () => 'New law requires all cookies to be shared. Nobody follows it.',
  () => 'Bakery smells blamed for unusually happy commuters.',
  () => 'Butter shortage averted after cows agree to work overtime.',
  () => 'Economist warns cookie-based economy "could crumble." Gets pelted with cookies.',
  () => 'Kids nationwide demand cookies be classified as a vegetable. Hearings scheduled.',
  () => 'Rumor has it someone, somewhere, has never had a cookie. Search parties dispatched.',
  () => 'Golden cookies sighted near your bakery. Experts advise "clicking them, probably."',
  () => 'Sequel declared "twice as crunchy as the original" by a panel of cookies.',
  () => 'Celebrity chef admits secret ingredient is "more cookies."',
  () => "Ant colony files formal complaint about your bakery's crumb policy.",
  () => 'Fortune cookie predicts it will be eaten. Fortune comes true.',
  () => 'Sprinkle prices skyrocket after rainbow found "surprisingly edible."',
  () => 'Retired astronaut: "Space smells like cookies now. We did that."',
  () => 'Toddler sets world record for most cookies held in one fist: eleven.',
  () => 'Local oven achieves sentience, immediately asks for more cookie dough.',
  () => 'Self-help book "Crumbs of Wisdom" tops bestseller list for 40th week.',
  () => S.buildings.nana > 0 ? `Nanas hold weekly bingo night; all ${fmt(S.buildings.nana)} of them win somehow.` : null,
  () => S.buildings.nana >= 50 ? 'Nana union demands longer naps and softer rocking chairs. Demands granted immediately.' : null,
  () => S.buildings.hand >= 10 ? `${fmt(S.buildings.hand)} floating hands spotted waving at confused tourists.` : null,
  () => S.buildings.cart > 0 ? 'Cookie carts cause traffic jam as drivers stop "just for one."' : null,
  () => S.buildings.orchard > 0 ? 'Farmers baffled as dough trees outgrow apple trees in popularity.' : null,
  () => S.buildings.quarry > 0 ? 'Miners strike sugar! Literally. They hit it with pickaxes.' : null,
  () => S.buildings.plant > 0 ? 'Bakery plant smokestacks now emit a faint vanilla scent. Neighbors thrilled.' : null,
  () => S.buildings.lab > 0 ? 'Sprinkle Lab announces breakthrough: sprinkles that sprinkle themselves.' : null,
  () => S.buildings.harbor > 0 ? 'Cocoa pirates spotted off the coast. They just want to trade recipes.' : null,
  () => S.buildings.rocket > 0 ? 'Cookie Rocket lands on the moon; finds it is, in fact, made of cookie.' : null,
  () => S.buildings.gate > 0 ? 'Dough Dimension visitors complain our world is "weirdly solid."' : null,
  () => S.buildings.chrono > 0 ? 'Chrono Oven accidentally bakes cookies for the year 3000. They are still warm.' : null,
  () => S.buildings.quantum > 0 ? 'Quantum Mixer simultaneously bakes and does not bake a cookie. Both are delicious.' : null,
  () => S.buildings.forge > 0 ? 'Astronomers alarmed as constellations begin to resemble chocolate chips.' : null,
  () => S.buildings.dream > 0 ? 'People everywhere wake up with crumbs on their pillows and no explanation.' : null,
  () => S.buildings.verse > 0 ? 'Physicists confirm the universe is now 4% cookie by mass. And rising.' : null,
  () => G.baseCps >= 1e6 ? `Your bakery now produces ${fmt(G.baseCps)} cookies every second. Economists weep.` : null,
  () => S.cookiesAll >= 1e9 ? 'Global cookie reserves now outweigh several small mountains.' : null,
  () => S.prestige > 0 ? `Mysterious "heavenly chips" reported falling from the sky. ${fmt(S.prestige)} collected so far.` : null,
  () => activeSeason() === 'harvest' ? 'Pumpkins mysteriously replaced with cookies. Nobody complains.' : null,
  () => activeSeason() === 'harvest' ? 'Ghosts confess they only haunt bakeries for the smell.' : null,
  () => activeSeason() === 'harvest' ? 'Trick-or-treaters now demand "cookies, specifically from that one bakery."' : null,
  () => activeSeason() === 'frost' ? 'Snowmen seen wearing cookie buttons. Fashion experts approve.' : null,
  () => activeSeason() === 'frost' ? 'Gingerbread houses now require building permits.' : null,
  () => activeSeason() === 'sweet' ? 'Survey: 100% of valentines prefer cookies to flowers.' : null,
  () => activeSeason() === 'bloom' ? 'Egg hunt descends into chaos as eggs turn out to be cookies.' : null,
  () => S.flags.renamed ? `Critics rave about "${S.bakeryName}": "Five stars, would crumb again."` : null,
];

/* ==========================================================================
   State
   ========================================================================== */
let S = null;
/** Derived / transient values (never saved). */
const G = {
  cps: 0, baseCps: 0, click: 0, each: {}, glaze: 0, goldenFreq: 1, goldenDur: 1, goldenStay: 1,
  owned: new Set(), lastClicks: [], storeKey: '', uiDirty: true, golden: null, nextGolden: 0,
  buyMode: 'buy', buyAmt: 1, selectedUpg: null, activeTab: 'bakery', pane: 'paneBake',
};

function defaultSettings() {
  return {
    muted: false, volume: 0.6, numFormat: 'words', particles: true, floaters: true, rain: true,
    season: 'auto', reduceMotion: false, confirmAscend: true,
  };
}

function defaultState() {
  const t = now();
  return {
    version: VERSION,
    cookies: 0, cookiesRun: 0, cookiesAll: 0,
    handmadeRun: 0, handmadeAll: 0, clicksRun: 0, clicksAll: 0,
    goldenRun: 0, goldenAll: 0,
    buildings: Object.fromEntries(BUILDINGS.map(b => [b.id, 0])),
    upgrades: [], achievements: {},
    prestige: 0, chips: 0, heavenly: [], ascensions: 0,
    collect: {}, buffs: [],
    runStart: t, gameStart: t, lastSave: t, playTime: 0, runPlayTime: 0,
    bakeryName: 'Your Bakery',
    settings: defaultSettings(),
    mini: { memoryCd: 0, memoryWins: 0, memoryBest: 0, catchCd: 0, catchBest: 0, fortuneCd: 0, fortunes: 0, lastFortune: '' },
    flags: {},
    stats: { sold: 0, maxCps: 0, goldenMissed: 0, offlineEarned: 0 },
    daily: null, questsDone: 0, history: [],
  };
}

/** Merge a loaded object onto defaults so old/partial saves never break the game. */
function normalize(data) {
  const d = defaultState();
  if (!data || typeof data !== 'object') return d;
  for (const k of Object.keys(d)) {
    if (data[k] === undefined) continue;
    if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) d[k] = Object.assign(d[k], data[k]);
    else d[k] = data[k];
  }
  BUILDINGS.forEach(b => { d.buildings[b.id] = Math.max(0, Math.floor(+d.buildings[b.id] || 0)); });
  d.upgrades = (d.upgrades || []).filter(id => U[id]);
  d.heavenly = (d.heavenly || []).filter(id => HV[id]);
  ['cookies', 'cookiesRun', 'cookiesAll', 'handmadeRun', 'handmadeAll', 'prestige', 'chips'].forEach(k => {
    d[k] = +d[k]; if (!isFinite(d[k]) || d[k] < 0) d[k] = 0;
  });
  return d;
}

function encodeSave(obj) {
  const json = JSON.stringify(obj);
  return btoa(unescape(encodeURIComponent(json)));
}
function decodeSave(str) {
  str = String(str || '').trim();
  if (!str) throw new Error('empty');
  let json;
  try { json = decodeURIComponent(escape(atob(str))); } catch (e) { json = str; }
  const obj = JSON.parse(json);
  if (!obj || typeof obj !== 'object' || !('cookies' in obj)) throw new Error('invalid');
  return obj;
}

function save(silent) {
  S.lastSave = now();
  try {
    localStorage.setItem(SAVE_KEY, encodeSave(S));
    if (!silent) toast({ kind: 'Saved', title: 'Game saved', icon: Art.tool('star', '#9be37a') });
  } catch (e) {
    if (!silent) toast({ kind: 'Error', title: 'Could not save', desc: 'Your browser blocked local storage.', icon: Art.tool('star', '#f07a7a') });
  }
}

function load() {
  let raw = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { /* storage unavailable */ }
  if (!raw) return defaultState();
  try { return normalize(decodeSave(raw)); } catch (e) {
    console.warn('Save could not be read, starting fresh.', e);
    return defaultState();
  }
}

/* ==========================================================================
   Calculations
   ========================================================================== */
const hasUpg = id => G.owned.has(id);
const hasHv = id => S.heavenly.includes(id);
const totalBuildings = () => BUILDINGS.reduce((s, b) => s + S.buildings[b.id], 0);
const achCount = () => Object.keys(S.achievements).length;
const collectTotal = () => SEASON_ORDER.reduce((s, k) => s + (S.collect[k] || []).length, 0);
const hasBuff = id => S.buffs.some(b => b.id === id);

function activeSeason() {
  const s = S && S.settings.season;
  if (s === 'none') return null;
  if (s && s !== 'auto' && SEASONS[s]) return s;
  return dateSeason();
}

function prestigeMult() {
  let pot = 1;
  if (hasHv('h_pot1')) pot *= 1.5;
  if (hasHv('h_pot2')) pot *= 2;
  return 1 + S.prestige * 0.01 * pot;
}

function recalc() {
  G.owned = new Set(S.upgrades);
  let clickMult = 1, flatAdd = 0, flatMult = 1, clickPct = 0, globalPct = 0;
  const bm = {}; BUILDINGS.forEach(b => { bm[b.id] = 1; });
  const syn = {};
  const glazeF = [];
  let gFreq = 1, gDur = 1, gStay = 1;
  for (const id of S.upgrades) {
    const u = U[id];
    if (u.clickMult) clickMult *= u.clickMult;
    if (u.flatAdd) flatAdd += u.flatAdd;
    if (u.flatMult) flatMult *= u.flatMult;
    if (u.clickPct) clickPct += u.clickPct;
    if (u.globalPct) globalPct += u.globalPct;
    if (u.bmult) bm[u.building] *= u.bmult;
    if (u.kind === 'synergy') { bm.nana *= 2; syn[u.building] = true; }
    if (u.glazeFactor) glazeF.push(u.glazeFactor);
    if (u.goldenFreq) gFreq *= u.goldenFreq;
    if (u.goldenDur) gDur *= u.goldenDur;
    if (u.goldenStay) gStay *= u.goldenStay;
  }
  if (hasHv('h_cps1')) globalPct += 0.1;
  if (hasHv('h_cps2')) globalPct += 0.25;
  if (hasHv('h_gold')) gFreq *= 1.15;
  if (hasHv('h_lucky')) gDur *= 1.2;
  G.goldenFreq = gFreq; G.goldenDur = gDur; G.goldenStay = gStay;

  G.glaze = achCount() * 0.04;
  let glazeMult = 1;
  const gPow = hasHv('h_glaze') ? 1.1 : 1;
  glazeF.forEach(f => { glazeMult *= 1 + G.glaze * f * gPow; });
  G.glazeMult = glazeMult;
  G.collectMult = 1 + collectTotal() * 0.02;
  G.prestigeMult = prestigeMult();
  G.globalPct = globalPct;
  const global = (1 + globalPct) * G.prestigeMult * glazeMult * G.collectMult;
  G.globalMult = global;

  const nonHand = totalBuildings() - S.buildings.hand;
  const flat = flatAdd * flatMult * nonHand;
  let base = 0;
  BUILDINGS.forEach(b => {
    let each;
    if (b.id === 'hand') each = (b.cps * clickMult + flat) * global;
    else {
      each = b.cps * bm[b.id] * global;
      if (syn[b.id]) each *= 1 + S.buildings.nana * 0.001;
    }
    G.each[b.id] = each;
    base += each * S.buildings[b.id];
  });
  G.baseCps = base;

  let cpsBuff = 1, clickBuff = 1;
  S.buffs.forEach(bf => { cpsBuff *= bf.cpsMult || 1; clickBuff *= bf.clickMult || 1; });
  G.cpsBuff = cpsBuff;
  G.cps = base * cpsBuff;
  G.clickPct = clickPct;
  G.click = ((1 * clickMult + flat) * (hasHv('h_click') ? 2 : 1) + clickPct * G.cps) * clickBuff;
  if (G.baseCps > S.stats.maxCps) S.stats.maxCps = G.baseCps;
}

function buildingDiscount() {
  let d = 1;
  if (hasHv('h_disc1')) d *= 0.95;
  if (hasHv('h_disc2')) d *= 0.95;
  return d;
}
function buildingCost(b, amount = 1, owned = S.buildings[b.id]) {
  const first = b.base * Math.pow(1.15, owned);
  return Math.ceil(first * (Math.pow(1.15, amount) - 1) / 0.15 * buildingDiscount());
}
function maxAffordable(b) {
  const first = b.base * Math.pow(1.15, S.buildings[b.id]) * buildingDiscount();
  if (S.cookies < first) return 0;
  let n = Math.floor(Math.log(S.cookies * 0.15 / first + 1) / Math.log(1.15));
  while (n > 0 && buildingCost(b, n) > S.cookies) n--;
  return n;
}
function sellValue(b, amount) {
  const own = S.buildings[b.id];
  amount = Math.min(amount, own);
  if (amount <= 0) return 0;
  return Math.floor(buildingCost(b, amount, own - amount) * 0.5);
}
function upgradeCost(u) {
  const c = u.costFn ? u.costFn() : u.cost;
  return Math.ceil(c * (hasHv('h_upg') ? 0.9 : 1));
}
function chipsForCookies(n) { return Math.floor(Math.cbrt(n / 1e12)); }
function pendingChips() { return Math.max(0, chipsForCookies(S.cookiesAll) - S.prestige); }
function cookiesForNextChip() {
  const next = chipsForCookies(S.cookiesAll) + 1;
  return Math.pow(next, 3) * 1e12;
}

function earn(n) {
  if (!(n > 0) || !isFinite(n)) return;
  S.cookies += n; S.cookiesRun += n; S.cookiesAll += n;
}
function spend(n) {
  if (S.cookies < n) return false;
  S.cookies -= n;
  if (S.cookies < 1e-6) { S.cookies = 0; S.flags.zero = true; }
  return true;
}

/* ==========================================================================
   Sound — tiny WebAudio synth, no audio files
   ========================================================================== */
const Sound = {
  ctx: null, master: null, lastClick: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.comp = this.ctx.createDynamicsCompressor();
      this.master.connect(this.comp); this.comp.connect(this.ctx.destination);
      this.setVolume();
    } catch (e) { this.ctx = null; }
  },
  setVolume() {
    if (!this.master) return;
    this.master.gain.setTargetAtTime(S.settings.muted ? 0 : S.settings.volume * 0.5, this.ctx.currentTime, 0.02);
  },
  ok() { return this.ctx && !S.settings.muted && S.settings.volume > 0; },
  tone(freq, dur, { type = 'sine', vol = 0.3, delay = 0, slide = null, attack = 0.005 } = {}) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, { vol = 0.15, freq = 1800, delay = 0, q = 1 } = {}) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  },
  click() {
    const t = performance.now();
    if (t - this.lastClick < 35) return;
    this.lastClick = t;
    const p = rand(0.85, 1.2);
    this.tone(520 * p, 0.09, { type: 'triangle', vol: 0.22, slide: 170 * p });
    this.noise(0.06, { vol: 0.12, freq: 2400 * p, q: 0.8 });
  },
  buy() { this.tone(660, 0.08, { type: 'triangle', vol: 0.2 }); this.tone(990, 0.14, { type: 'triangle', vol: 0.18, delay: 0.06 }); },
  sell() { this.tone(500, 0.1, { type: 'triangle', vol: 0.18 }); this.tone(330, 0.16, { type: 'triangle', vol: 0.16, delay: 0.07 }); },
  upgrade() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, { type: 'sine', vol: 0.16, delay: i * 0.05 })); },
  goldenAppear() { [1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.25, { type: 'sine', vol: 0.06, delay: i * 0.08 })); },
  golden() { [784, 988, 1175, 1568, 1976].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.15, delay: i * 0.05 })); },
  achievement() {
    [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.32]].forEach(([f, d]) => this.tone(f, 0.35, { type: 'square', vol: 0.06, delay: d }));
    this.tone(1047, 0.6, { type: 'sine', vol: 0.12, delay: 0.32 });
  },
  flip() { this.tone(900, 0.05, { type: 'square', vol: 0.05 }); },
  match() { this.tone(880, 0.1, { type: 'sine', vol: 0.15 }); this.tone(1320, 0.15, { type: 'sine', vol: 0.15, delay: 0.08 }); },
  bad() { this.tone(220, 0.2, { type: 'sawtooth', vol: 0.08, slide: 140 }); },
  crack() { this.noise(0.25, { vol: 0.3, freq: 1200, q: 0.5 }); this.tone(300, 0.1, { type: 'triangle', vol: 0.1, slide: 120 }); },
  ascend() { [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.6, { type: 'sine', vol: 0.12, delay: i * 0.09 })); },
  pop() { this.tone(rand(700, 1000), 0.06, { type: 'sine', vol: 0.12, slide: 1400 }); },
};

/* ==========================================================================
   Visual effects
   ========================================================================== */
const FX = {
  canvas: null, ctx: null, parts: [], dpr: 1,
  init() {
    this.canvas = $('#fxCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },
  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = innerWidth * this.dpr;
    this.canvas.height = innerHeight * this.dpr;
  },
  crumbs(x, y, n = 6, palette) {
    if (!S.settings.particles) return;
    const cols = palette || ['#c8792f', '#e8ad5f', '#a8621f', '#3e1f0e', '#f2c78c'];
    for (let i = 0; i < n && this.parts.length < 400; i++) {
      const a = rand(-Math.PI, 0), sp = rand(2, 7);
      this.parts.push({ x, y, vx: Math.cos(a) * sp * rand(0.4, 1), vy: Math.sin(a) * sp - 2, g: 0.35, life: 0, max: rand(40, 70),
        size: rand(2.5, 6), rot: rand(0, 6.28), vr: rand(-0.3, 0.3), color: pick(cols), shape: Math.random() < 0.3 ? 'chip' : 'crumb' });
    }
  },
  sparkle(x, y, n = 24, cols = ['#fff6c2', '#ffd34d', '#ffb800', '#ffffff']) {
    if (!S.settings.particles) return;
    for (let i = 0; i < n && this.parts.length < 500; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(1, 6);
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.05, life: 0, max: rand(30, 60),
        size: rand(2, 5), rot: 0, vr: 0, color: pick(cols), shape: 'spark' });
    }
  },
  confetti(x, y, n = 60) {
    if (!S.settings.particles) return;
    const cols = ['#e0546a', '#f7c843', '#3fae92', '#5aa9e6', '#b48aff', '#ff9447'];
    for (let i = 0; i < n && this.parts.length < 600; i++) {
      const a = rand(-Math.PI * 0.9, -Math.PI * 0.1), sp = rand(4, 11);
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.22, drag: 0.985, life: 0, max: rand(70, 120),
        size: rand(4, 8), rot: rand(0, 6.28), vr: rand(-0.25, 0.25), color: pick(cols), shape: 'confetti' });
    }
  },
  step() {
    const c = this.ctx;
    if (!this.parts.length) { if (this.dirty) { c.clearRect(0, 0, this.canvas.width, this.canvas.height); this.dirty = false; } return; }
    this.dirty = true;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, innerWidth, innerHeight);
    const keep = [];
    for (const p of this.parts) {
      p.life++;
      p.vy += p.g; if (p.drag) { p.vx *= p.drag; p.vy *= p.drag; }
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      const t = p.life / p.max;
      if (t >= 1 || p.y > innerHeight + 20) continue;
      keep.push(p);
      c.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1;
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
      c.fillStyle = p.color;
      if (p.shape === 'spark') {
        const s = p.size * (1 - t * 0.5);
        c.beginPath(); c.moveTo(0, -s * 2); c.lineTo(s * 0.5, 0); c.lineTo(0, s * 2); c.lineTo(-s * 0.5, 0); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(-s * 2, 0); c.lineTo(0, s * 0.5); c.lineTo(s * 2, 0); c.lineTo(0, -s * 0.5); c.closePath(); c.fill();
      } else if (p.shape === 'confetti') {
        c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else if (p.shape === 'chip') {
        c.beginPath(); c.moveTo(0, -p.size * 0.6); c.lineTo(p.size * 0.6, p.size * 0.4); c.lineTo(-p.size * 0.6, p.size * 0.4); c.closePath(); c.fill();
      } else {
        c.beginPath();
        c.moveTo(-p.size * 0.5, -p.size * 0.3); c.lineTo(p.size * 0.4, -p.size * 0.5); c.lineTo(p.size * 0.5, p.size * 0.3); c.lineTo(-p.size * 0.2, p.size * 0.5);
        c.closePath(); c.fill();
      }
      c.restore();
    }
    c.globalAlpha = 1;
    this.parts = keep;
  },
};

function floater(x, y, text, cls = '') {
  if (!S.settings.floaters) return;
  const box = $('#floaters');
  if (box.childElementCount > 40) box.firstElementChild.remove();
  const el = document.createElement('div');
  el.className = 'floater ' + cls;
  el.textContent = text;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  el.style.setProperty('--dx', rand(-30, 30).toFixed(0) + 'px');
  el.addEventListener('animationend', () => el.remove());
  box.appendChild(el);
}

/** Background of the cookie pane: falling cookies + seasonal particles. */
const BG = {
  canvas: null, ctx: null, items: [], img: null, w: 0, h: 0, dpr: 1, spawnAcc: 0,
  init() {
    this.canvas = $('#bgCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.img = new Image();
    this.img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Art.cookie({ seed: 5, chips: 5, cracks: 1 }));
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = r.width; this.h = r.height;
    this.canvas.width = Math.max(1, r.width * this.dpr); this.canvas.height = Math.max(1, r.height * this.dpr);
  },
  step(dt) {
    if (!this.w) { this.resize(); if (!this.w) return; }
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);
    const season = activeSeason();
    // spawn rate
    let rate = 0;
    if (S.settings.rain && G.cps > 0) rate = Math.min(8, Math.log10(G.cps + 1) * 0.9);
    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1 && this.items.length < 70) {
      this.spawnAcc -= 1;
      this.items.push({ type: 'cookie', x: rand(0, this.w), y: -30, vy: rand(40, 90), size: rand(14, 30), rot: rand(0, 6.28), vr: rand(-1, 1), sway: 0 });
    }
    if (this.spawnAcc > 1) this.spawnAcc = 1;
    if (season && S.settings.particles && Math.random() < dt * 2.2 && this.items.length < 90) {
      const cols = { bloom: ['#ffb3d9', '#ffffff', '#ffd6e8'], harvest: ['#e8711c', '#c8492a', '#f0a030'] }[season] || ['#fff'];
      this.items.push({ type: season, x: rand(0, this.w), y: -20, vy: rand(20, 50), size: rand(8, 16), rot: rand(0, 6.28), vr: rand(-1.5, 1.5), sway: rand(0, 6.28), col: pick(cols) });
    }
    const keep = [];
    for (const it of this.items) {
      it.y += it.vy * dt; it.rot += it.vr * dt; it.sway += dt * 1.5;
      if (it.y > this.h + 40) continue;
      keep.push(it);
      const x = it.x + (it.type !== 'cookie' ? Math.sin(it.sway) * 20 : 0);
      c.save(); c.translate(x, it.y); c.rotate(it.rot);
      c.globalAlpha = 0.75;
      if (it.type === 'cookie') {
        if (this.img.complete) c.drawImage(this.img, -it.size / 2, -it.size / 2, it.size, it.size);
      } else this.drawSeason(c, it.type, it.size, it.col);
      c.restore();
    }
    this.items = keep;
  },
  drawSeason(c, type, s, col) {
    if (type === 'frost') {
      c.strokeStyle = '#ffffff'; c.lineWidth = 1.6; c.globalAlpha = 0.9;
      for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, s * 0.6); c.stroke(); }
    } else if (type === 'sweet') {
      c.fillStyle = '#ff6fa5';
      c.beginPath(); c.moveTo(0, s * 0.35);
      c.bezierCurveTo(-s * 0.7, -s * 0.1, -s * 0.35, -s * 0.6, 0, -s * 0.25);
      c.bezierCurveTo(s * 0.35, -s * 0.6, s * 0.7, -s * 0.1, 0, s * 0.35); c.fill();
    } else if (type === 'bloom') {
      c.fillStyle = col;
      c.beginPath(); c.ellipse(0, 0, s * 0.5, s * 0.25, 0, 0, Math.PI * 2); c.fill();
    } else if (type === 'harvest') {
      if (s > 13) { // little bat
        c.fillStyle = '#2a1030';
        c.beginPath(); c.moveTo(0, -s * 0.15);
        c.quadraticCurveTo(-s * 0.4, -s * 0.5, -s, -s * 0.1); c.quadraticCurveTo(-s * 0.6, 0, -s * 0.5, s * 0.2);
        c.quadraticCurveTo(-s * 0.2, 0, 0, s * 0.25); c.quadraticCurveTo(s * 0.2, 0, s * 0.5, s * 0.2);
        c.quadraticCurveTo(s * 0.6, 0, s, -s * 0.1); c.quadraticCurveTo(s * 0.4, -s * 0.5, 0, -s * 0.15); c.fill();
      } else { // autumn leaf
        c.fillStyle = col;
        c.beginPath(); c.moveTo(0, -s * 0.6); c.quadraticCurveTo(s * 0.6, 0, 0, s * 0.6); c.quadraticCurveTo(-s * 0.6, 0, 0, -s * 0.6); c.fill();
      }
    }
  },
};

/* ==========================================================================
   Icons for upgrades / achievements
   ========================================================================== */
/** Give every id in an SVG string a unique suffix so repeated icons never clash. */
function fresh(svg) {
  const u = 'f' + (svgUid++);
  return svg.replace(/id="([^"]+)"/g, `id="$1${u}"`).replace(/url\(#([^)]+)\)/g, `url(#$1${u})`);
}
const ACH_COLORS = ['#e9b36a', '#c0c7d2', '#f7c843', '#7ad3ff', '#b48aff', '#ff7eb6', '#4fd1a5', '#ff9447'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const TOOL_COLORS = ['#c8935a', '#d4a64a', '#c0c7d2', '#f7c843', '#7ad3ff', '#ff7eb6', '#b48aff', '#ffffff'];

function upgradeIcon(u) {
  switch (u.kind) {
    case 'hand': return iconBox(ICONS.hand, TIER_COLORS[u.tier % TIER_COLORS.length], ROMAN[u.tier]);
    case 'tool': return iconBox(Art.tool(u.tier % 2 ? 'whisk' : 'pin', TOOL_COLORS[u.tier]), TIER_COLORS[u.tier % TIER_COLORS.length]);
    case 'building': return iconBox(ICONS[u.building], TIER_COLORS[u.tier], ROMAN[u.tier]);
    case 'synergy': return `<svg viewBox="0 0 64 64"><rect x="1" y="1" width="62" height="62" rx="12" fill="#ffe0e6"/>${Art.nest(ICONS.nana, 2, 2, 0.6)}${Art.nest(ICONS[u.building], 26, 26, 0.58)}</svg>`;
    case 'flavor': return Art.cookie({ seed: 100 + u.tier, chips: 6, cracks: 1, dough: u.colors.dough, edge: u.colors.edge, chip: u.colors.chip, sprinkles: u.colors.sprinkles });
    case 'glaze': return iconBox(Art.tool('drop', '#e8a050'), TIER_COLORS[u.tier], ROMAN[u.tier]);
    case 'golden': return iconBox(Art.golden(), ['#fff3b0', '#ffd34d', '#ffb800'][u.tier]);
    case 'season': return iconBox(Art.season(u.season, u.tier * 2), lighten(SEASONS[u.season].colors[0], 0.3), ROMAN[u.tier]);
    default: return iconBox(Art.tool('star', '#ffd34d'));
  }
}

function achIcon(a) {
  const [kind, x, y] = a.icon;
  switch (kind) {
    case 'cookie': return Art.cookie({ seed: 900 + x, chips: 4 + (x % 6), dough: x > 12 ? '#ffd34d' : '#e9b36a', edge: x > 12 ? '#d18b00' : '#b8742f' });
    case 'building': return iconBox(ICONS[x], TIER_COLORS[y + 1]);
    case 'golden': return Art.golden();
    case 'season': return Art.season(x, y);
    case 'clock': case 'pin': case 'whisk': case 'trophy': case 'star': case 'halo': case 'dice': case 'bowl': case 'fortune': case 'bag': case 'hat':
      return Art.tool(kind, ACH_COLORS[x % ACH_COLORS.length]);
    default: return Art.tool('trophy', '#f7c843');
  }
}

/* ==========================================================================
   Toasts, modal, tooltip
   ========================================================================== */
function toast({ kind = '', title = '', desc = '', icon = '', time = 4500 }) {
  const box = $('#toasts');
  while (box.childElementCount >= 3) box.firstElementChild.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${icon ? `<div class="ti">${icon}</div>` : ''}<div><div class="tk">${escapeHTML(kind)}</div><div class="tt">${escapeHTML(title)}</div>${desc ? `<div class="td">${desc}</div>` : ''}</div>`;
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 400); };
  el.addEventListener('click', close);
  setTimeout(close, time);
  box.appendChild(el);
}

let modalOnClose = null;
function modal({ title, html, buttons = [{ label: 'OK', cls: 'primary' }], onClose }) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = html;
  const act = $('#modalActions');
  act.innerHTML = '';
  buttons.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'btn ' + (b.cls || '');
    btn.textContent = b.label;
    btn.addEventListener('click', () => {
      const keep = b.action && b.action() === false;
      if (!keep && b.close !== false) closeModal();
    });
    act.appendChild(btn);
  });
  modalOnClose = onClose || null;
  $('#modalWrap').hidden = false;
  const first = act.querySelector('.btn.primary, .btn');
  if (first) setTimeout(() => first.focus(), 30);
}
function closeModal() {
  $('#modalWrap').hidden = true;
  if (modalOnClose) { const f = modalOnClose; modalOnClose = null; f(); }
}

const Tip = {
  el: null, anchor: null, fn: null,
  init() {
    this.el = $('#tooltip');
    document.addEventListener('pointerover', e => {
      if (e.pointerType !== 'mouse') return;
      const t = e.target.closest('[data-tip]');
      if (t) this.show(t); else this.hide();
    });
    document.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') return;
      if (!e.target.closest('[data-tip]')) this.hide();
    });
    window.addEventListener('scroll', () => this.hide(), true);
  },
  show(anchor) {
    this.anchor = anchor;
    this.render();
    this.el.classList.add('show');
  },
  hide() { this.anchor = null; this.el.classList.remove('show'); },
  render() {
    if (!this.anchor) return;
    if (!document.body.contains(this.anchor)) { this.hide(); return; }
    const html = tipContent(this.anchor.dataset.tip);
    if (!html) { this.hide(); return; }
    if (html !== this.last) { this.el.innerHTML = html; this.last = html; }
    const r = this.anchor.getBoundingClientRect();
    const tw = this.el.offsetWidth, th = this.el.offsetHeight;
    let x, y;
    const inStore = this.anchor.closest('.pane-store');
    if (inStore && r.left - tw - 12 > 8) { x = r.left - tw - 12; y = r.top + r.height / 2 - th / 2; }
    else { x = r.left + r.width / 2 - tw / 2; y = r.top - th - 10; if (y < 8) y = r.bottom + 10; }
    x = clamp(x, 8, innerWidth - tw - 8); y = clamp(y, 8, innerHeight - th - 8);
    this.el.style.left = x + 'px'; this.el.style.top = y + 'px';
  },
};

function tipContent(spec) {
  const [type, id] = spec.split(':');
  if (type === 'upg') {
    const u = U[id]; if (!u) return '';
    const cost = upgradeCost(u);
    const tag = { hand: 'Click upgrade', tool: 'Click upgrade', building: B[u.building] ? B[u.building].name : '', synergy: 'Synergy', flavor: 'Cookie', glaze: 'Glaze', golden: 'Golden', season: 'Seasonal' }[u.kind] || 'Upgrade';
    const owned = hasUpg(id);
    return `<div class="tt-head"><span class="tt-name">${escapeHTML(u.name)}</span>${owned ? '<span class="tt-cost">Owned</span>' : `<span class="tt-cost ${S.cookies >= cost ? '' : 'no'}">${fmt(cost)}</span>`}</div>
      <span class="tt-tag">${escapeHTML(tag)}</span><div class="tt-desc">${u.desc}</div>
      ${u.quote ? `<div class="tt-quote">${escapeHTML(u.quote)}</div>` : ''}
      ${!owned && G.selectedUpg === id ? '<div class="tt-line"><b>Tap again to buy</b></div>' : ''}`;
  }
  if (type === 'bld') {
    const b = B[id]; const n = S.buildings[id];
    const each = G.each[id] || 0;
    const total = each * n;
    const pct = G.baseCps > 0 ? (total / G.baseCps * 100) : 0;
    return `<div class="tt-head"><span class="tt-name">${escapeHTML(b.name)}</span><span class="tt-cost">owned: ${n}</span></div>
      <div class="tt-desc">${escapeHTML(b.desc)}</div>
      <div class="tt-line">Each produces <b>${fmt(each, 1)}</b> cookies per second</div>
      ${n ? `<div class="tt-line">${n} ${escapeHTML(plural(n, b.name, b.plural))} producing <b>${fmt(total, 1)}</b>/s (<b>${pct.toFixed(1)}%</b> of CpS)</div>` : ''}
      <div class="tt-line">Next ${G.buyAmt === 'max' ? 'max' : G.buyAmt}: <b>${fmt(buyCostFor(b))}</b></div>`;
  }
  if (type === 'ach') {
    const a = A[id]; const got = !!S.achievements[id];
    if (!got && a.hidden) return `<div class="tt-head"><span class="tt-name">???</span></div><span class="tt-tag">Hidden</span><div class="tt-desc">A secret achievement. Keep exploring!</div>`;
    return `<div class="tt-head"><span class="tt-name">${escapeHTML(a.name)}</span><span class="tt-cost ${got ? '' : 'no'}">${got ? 'Unlocked' : 'Locked'}</span></div>
      <div class="tt-desc">${a.desc}</div>${got ? `<div class="tt-quote">Unlocked ${new Date(S.achievements[id]).toLocaleDateString()}</div>` : ''}`;
  }
  if (type === 'col') {
    const [sid, i] = id.split('.');
    const got = (S.collect[sid] || []).includes(+i);
    return `<div class="tt-head"><span class="tt-name">${got ? escapeHTML(SEASONS[sid].items[i]) : '???'}</span></div><div class="tt-desc">${got ? '+2% CpS, permanently.' : `Drops from golden cookies (and rarely from clicks) during ${SEASONS[sid].name}.`}</div>`;
  }
  if (type === 'txt') return `<div class="tt-desc">${escapeHTML(decodeURIComponent(id))}</div>`;
  return '';
}

/* ==========================================================================
   Store
   ========================================================================== */
const bldEls = {};

function buildStore() {
  const box = $('#buildings');
  box.innerHTML = '';
  BUILDINGS.forEach(b => {
    const el = document.createElement('button');
    el.className = 'bld';
    el.dataset.tip = 'bld:' + b.id;
    el.innerHTML = `<div class="bi">${fresh(ICONS[b.id])}</div>
      <div class="bm"><div class="bn"></div><div class="bc"><span class="mini-biscuit">${Art.miniCookie()}</span><span class="bcv"></span></div><div class="bp"></div></div>
      <div class="bo"></div><div class="bar-flash"></div>`;
    el.addEventListener('click', () => clickBuilding(b, el));
    box.appendChild(el);
    bldEls[b.id] = { el, name: $('.bn', el), cost: $('.bcv', el), info: $('.bp', el), owned: $('.bo', el) };
  });
}

function buyCostFor(b) {
  if (G.buyMode === 'sell') {
    const n = G.buyAmt === 'max' ? S.buildings[b.id] : G.buyAmt;
    return sellValue(b, n);
  }
  if (G.buyAmt === 'max') return buildingCost(b, Math.max(1, maxAffordable(b)));
  return buildingCost(b, G.buyAmt);
}

function clickBuilding(b, el) {
  Sound.init();
  if (G.buyMode === 'sell') {
    const n = Math.min(S.buildings[b.id], G.buyAmt === 'max' ? S.buildings[b.id] : G.buyAmt);
    if (n <= 0) return;
    const v = sellValue(b, n);
    S.buildings[b.id] -= n;
    earnRefund(v);
    S.flags.sold = true; S.stats.sold += n;
    Sound.sell();
  } else {
    const n = G.buyAmt === 'max' ? maxAffordable(b) : G.buyAmt;
    if (n <= 0) { Sound.bad(); return; }
    const cost = buildingCost(b, n);
    if (!spend(cost)) { Sound.bad(); return; }
    S.buildings[b.id] += n;
    questBump('build', n);
    Sound.buy();
    const r = el.getBoundingClientRect();
    FX.sparkle(r.left + 30, r.top + r.height / 2, 10, ['#fff', '#ffe7a8', '#9be37a']);
  }
  el.classList.remove('bought'); void el.offsetWidth; el.classList.add('bought');
  recalc(); G.uiDirty = true;
  checkAchievements();
  updateStore(true);
}
function earnRefund(v) { S.cookies += v; }

function revealedBuildings() {
  let revealed = 0;
  BUILDINGS.forEach((b, i) => {
    if (S.buildings[b.id] > 0 || S.cookiesRun >= b.base * 0.35 || S.cookies >= b.base * 0.35) revealed = i + 1;
  });
  return Math.max(revealed, 1);
}

function updateStore(force) {
  const rev = revealedBuildings();
  BUILDINGS.forEach((b, i) => {
    const r = bldEls[b.id];
    const visible = i < rev + 2;
    r.el.style.display = visible ? '' : 'none';
    if (!visible) return;
    const locked = i >= rev;
    r.el.classList.toggle('locked', locked);
    r.el.classList.toggle('sell', G.buyMode === 'sell');
    r.name.textContent = locked ? '???' : b.name;
    const n = S.buildings[b.id];
    r.owned.textContent = n || '';
    let cost, can;
    if (G.buyMode === 'sell') {
      const amt = G.buyAmt === 'max' ? n : Math.min(n, G.buyAmt);
      cost = sellValue(b, amt); can = amt > 0;
      r.cost.textContent = amt > 0 ? '+' + fmt(cost) + (G.buyAmt === 'max' || amt !== 1 ? ` (×${amt})` : '') : '—';
    } else if (G.buyAmt === 'max') {
      const amt = maxAffordable(b);
      cost = buildingCost(b, Math.max(1, amt)); can = amt > 0;
      r.cost.textContent = fmt(cost) + (amt > 1 ? ` (×${amt})` : '');
    } else {
      cost = buildingCost(b, G.buyAmt); can = S.cookies >= cost;
      r.cost.textContent = fmt(cost) + (G.buyAmt > 1 ? ` (×${G.buyAmt})` : '');
    }
    r.el.classList.toggle('cant', !can && !locked);
    r.info.textContent = locked ? 'Keep baking to reveal...' :
      (n > 0 ? `${fmt(G.each[b.id] * n, 1)}/s · ${fmt(G.each[b.id], 1)}/s each` : `+${fmt(G.each[b.id] || b.cps, 1)}/s each`);
  });

  // Upgrades
  const avail = UPGRADES.filter(u => !G.owned.has(u.id) && u.unlock()).sort((a, b) => upgradeCost(a) - upgradeCost(b));
  const key = avail.map(u => u.id).join(',');
  const grid = $('#upgrades');
  if (key !== G.storeKey || force === 'rebuild') {
    G.storeKey = key;
    grid.innerHTML = '';
    avail.forEach(u => {
      const el = document.createElement('button');
      el.className = 'upg';
      el.dataset.id = u.id;
      el.dataset.tip = 'upg:' + u.id;
      el.setAttribute('aria-label', u.name);
      el.innerHTML = upgradeIcon(u);
      el.addEventListener('pointerup', e => { el._ptype = e.pointerType; });
      el.addEventListener('click', () => clickUpgrade(u, el));
      grid.appendChild(el);
    });
  }
  let affordable = 0;
  $$('.upg', grid).forEach(el => {
    const u = U[el.dataset.id];
    const can = S.cookies >= upgradeCost(u);
    if (can) affordable++;
    el.classList.toggle('can', can);
    el.classList.toggle('cant', !can);
    el.classList.toggle('sel', G.selectedUpg === u.id);
  });
  $('#upgradeCount').textContent = avail.length ? `${affordable}/${avail.length} affordable` : '';
  $('#buyAllBtn').hidden = affordable < 2;
  const anyBuy = affordable > 0 || BUILDINGS.some(b => S.cookies >= buildingCost(b, 1) && revealedBuildings() > b.index);
  $('#storeDot').style.display = anyBuy ? '' : 'none';
}

function clickUpgrade(u, el) {
  Sound.init();
  const touch = el._ptype && el._ptype !== 'mouse';
  if (touch && G.selectedUpg !== u.id) {
    G.selectedUpg = u.id;
    Tip.show(el);
    updateStore();
    return;
  }
  buyUpgrade(u, el);
}

function buyUpgrade(u, el) {
  const cost = upgradeCost(u);
  if (G.owned.has(u.id)) return;
  if (!spend(cost)) { Sound.bad(); if (el) { el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 200 }); } return; }
  S.upgrades.push(u.id);
  questBump('upgrade', 1);
  G.selectedUpg = null;
  Tip.hide();
  Sound.upgrade();
  if (el) { const r = el.getBoundingClientRect(); FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 20); }
  recalc(); G.uiDirty = true;
  checkAchievements();
  updateStore();
}

/* ==========================================================================
   Buffs display
   ========================================================================== */
let buffKey = '';
function renderBuffs() {
  const box = $('#buffs');
  const key = S.buffs.map(b => b.id + b.start).join('|');
  if (key !== buffKey) {
    buffKey = key;
    box.innerHTML = S.buffs.map(b => `<div class="buff" data-tip="txt:${encodeURIComponent(b.desc)}"><span class="bi">${b.icon === 'golden' ? Art.golden(activeSeason()) : Art.tool(b.icon || 'star', b.color || '#ffd34d')}</span><span>${escapeHTML(b.name)} <span class="bt"></span></span><div class="bar"></div></div>`).join('');
  }
  $$('.buff', box).forEach((el, i) => {
    const b = S.buffs[i]; if (!b) return;
    $('.bt', el).textContent = Math.ceil(b.time) + 's';
    $('.bar', el).style.width = (b.time / b.dur * 100) + '%';
  });
  $('#cpsDisplay').classList.toggle('boosted', G.cpsBuff > 1);
  $('#bigBiscuit').classList.toggle('frenzy', S.buffs.some(b => b.clickMult > 1 || b.cpsMult > 1));
}

/* ==========================================================================
   Big cookie
   ========================================================================== */
function clickCookie(x, y) {
  Sound.init();
  const v = G.click;
  earn(v);
  S.handmadeRun += v; S.handmadeAll += v;
  S.clicksRun++; S.clicksAll++;
  questBump('click', 1);
  floater(x + rand(-12, 12), y + rand(-8, 8), '+' + fmt(v, 1), v >= G.baseCps * 10 && v > 100 ? 'big' : '');
  FX.crumbs(x, y, hasBuff('clickstorm') ? 10 : 6);
  Sound.click();
  const art = $('#bigBiscuit .bb-art');
  if (!S.settings.reduceMotion && art) {
    art.animate([
      { transform: 'scale(1)' }, { transform: 'scale(1.07, 0.9)' }, { transform: 'scale(0.95, 1.05)' }, { transform: 'scale(1.02, 0.99)' }, { transform: 'scale(1)' },
    ], { duration: 340, easing: 'cubic-bezier(.2,.8,.3,1)' });
    ripple(x, y);
  }
  const t = now();
  G.lastClicks.push(t);
  while (G.lastClicks.length && G.lastClicks[0] < t - 2000) G.lastClicks.shift();
  if (G.lastClicks.length >= 15) S.flags.turbo = true;
  const season = activeSeason();
  if (season && Math.random() < (1 / 700) * (hasHv('h_season') ? 2 : 1)) dropCollectible(x, y);
}

function ripple(x, y) {
  const box = $('#floaters');
  const el = document.createElement('div');
  el.className = 'ripple';
  el.style.left = x + 'px'; el.style.top = y + 'px';
  el.addEventListener('animationend', () => el.remove());
  box.appendChild(el);
}

function bindCookie() {
  const el = $('#bigBiscuit');
  el.innerHTML = `<div class="bb-art">${Art.bigBiscuit()}</div><div class="bb-sheen"></div>`;
  // gentle 3D tilt toward the pointer
  el.addEventListener('pointermove', e => {
    if (S.settings.reduceMotion || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--ry', (dx * 16).toFixed(2) + 'deg');
    el.style.setProperty('--rx', (-dy * 16).toFixed(2) + 'deg');
  });
  el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  el.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button > 0) return;
    e.preventDefault();
    clickCookie(e.clientX, e.clientY);
  });
  el.addEventListener('click', e => {
    if (e.detail === 0) { // keyboard activation
      const r = el.getBoundingClientRect();
      clickCookie(r.left + r.width / 2, r.top + r.height / 2);
    }
  });
  el.addEventListener('contextmenu', e => e.preventDefault());
}

/* ==========================================================================
   Golden cookies & buffs
   ========================================================================== */
function scheduleGolden(first) {
  const wait = first ? rand(40, 90) : rand(100, 260) / G.goldenFreq;
  G.nextGolden = now() + wait * 1000;
}

function spawnGolden() {
  const layer = $('#goldenLayer');
  const el = document.createElement('button');
  el.className = 'golden';
  el.setAttribute('aria-label', 'Golden cookie!');
  el.innerHTML = Art.golden(activeSeason());
  const size = innerWidth < 760 ? 72 : 84;
  el.style.left = rand(16, innerWidth - size - 16) + 'px';
  el.style.top = rand(80, innerHeight - size - 90) + 'px';
  el.addEventListener('click', e => { e.stopPropagation(); clickGolden(e.clientX, e.clientY); });
  layer.appendChild(el);
  G.golden = { el, expire: now() + 13000 * G.goldenStay };
  Sound.goldenAppear();
}

function removeGolden(missed) {
  if (!G.golden) return;
  const el = G.golden.el;
  el.classList.add('out');
  setTimeout(() => el.remove(), 1000);
  G.golden = null;
  if (missed) S.stats.goldenMissed++;
  scheduleGolden();
}

function addBuff(b) {
  b.time = b.dur; b.start = now();
  S.buffs = S.buffs.filter(x => x.id !== b.id);
  S.buffs.push(b);
  recalc(); G.uiDirty = true;
}

function clickGolden(x, y) {
  Sound.init();
  removeGolden(false);
  S.goldenRun++; S.goldenAll++;
  questBump('golden', 1);
  Sound.golden();
  FX.sparkle(x, y, 40);
  const dur = G.goldenDur;
  const owned = BUILDINGS.filter(b => S.buildings[b.id] > 0);
  const opts = [
    ['lucky', 45], ['frenzy', hasBuff('frenzy') ? 8 : 34], ['clickstorm', 6], ['rush', owned.length ? 10 : 0], ['shower', 7],
  ];
  let r = Math.random() * opts.reduce((s, o) => s + o[1], 0), pickId = 'lucky';
  for (const [id, w] of opts) { if ((r -= w) < 0) { pickId = id; break; } }

  if (pickId === 'lucky') {
    const gain = Math.min(S.cookies * 0.15, G.baseCps * 900) + 13;
    earn(gain);
    floater(x, y, 'Lucky! +' + fmt(gain), 'gold');
    toast({ kind: 'Golden cookie', title: 'Lucky!', desc: `You found <b>${fmt(gain)}</b> cookies.`, icon: Art.golden(activeSeason()), time: 3500 });
  } else if (pickId === 'frenzy') {
    addBuff({ id: 'frenzy', name: 'Frenzy', desc: 'Cookie production ×7!', cpsMult: 7, dur: 77 * dur, icon: 'golden' });
    floater(x, y, 'Frenzy! ×7 CpS', 'gold');
  } else if (pickId === 'clickstorm') {
    addBuff({ id: 'clickstorm', name: 'Click Storm', desc: 'Clicking power ×777!', clickMult: 777, dur: 13 * dur, icon: 'pin', color: '#ffd34d' });
    floater(x, y, 'Click Storm! ×777', 'gold');
  } else if (pickId === 'rush') {
    const b = pick(owned);
    const m = 1 + S.buildings[b.id] * 0.1;
    addBuff({ id: 'rush', name: b.name + ' Rush', desc: `Your ${S.buildings[b.id]} ${plural(S.buildings[b.id], b.name, b.plural)} boost CpS by +${Math.round((m - 1) * 100)}%!`, cpsMult: m, dur: 30 * dur, icon: 'star', color: b.color });
    floater(x, y, `${b.name} Rush! ×${m.toFixed(1)}`, 'gold');
  } else {
    cookieShower(8 * dur);
    floater(x, y, 'Cookie Shower!', 'gold');
  }

  const season = activeSeason();
  if (season && Math.random() < 0.3 * (hasHv('h_season') ? 2 : 1)) dropCollectible(x, y);
  checkAchievements();
}

function cookieShower(seconds) {
  const layer = $('#goldenLayer');
  const count = Math.round(seconds * 3);
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const el = document.createElement('button');
      el.className = 'shower-biscuit';
      el.innerHTML = Art.cookie({ seed: randInt(1, 999), chips: 5, dough: '#ffd34d', edge: '#d18b00', chip: '#a86a00', cracks: 0 });
      el.style.left = rand(10, innerWidth - 56) + 'px';
      el.style.setProperty('--fall', rand(3, 5.5).toFixed(2) + 's');
      el.addEventListener('pointerdown', e => {
        e.preventDefault();
        const v = Math.max(1, G.baseCps * 3);
        earn(v);
        floater(e.clientX, e.clientY, '+' + fmt(v), 'gold');
        FX.sparkle(e.clientX, e.clientY, 10);
        Sound.pop();
        el.remove();
      });
      el.addEventListener('animationend', () => el.remove());
      layer.appendChild(el);
    }, i * (seconds * 1000 / count));
  }
}

function tickBuffs(dt) {
  if (!S.buffs.length) return;
  let changed = false;
  S.buffs.forEach(b => { b.time -= dt; if (b.time <= 0) changed = true; });
  if (changed) { S.buffs = S.buffs.filter(b => b.time > 0); recalc(); G.uiDirty = true; }
}

/* ==========================================================================
   Seasons & collectibles
   ========================================================================== */
function dropCollectible(x, y) {
  const sid = activeSeason();
  if (!sid) return;
  const have = S.collect[sid] || (S.collect[sid] = []);
  const missing = SEASONS[sid].items.map((_, i) => i).filter(i => !have.includes(i));
  if (!missing.length) return;
  const i = pick(missing);
  have.push(i);
  recalc(); G.uiDirty = true;
  FX.confetti(x, y, 30);
  toast({ kind: SEASONS[sid].item + ' found!', title: SEASONS[sid].items[i], desc: `+2% CpS permanently · ${have.length}/8 collected`, icon: Art.season(sid, i) });
  checkAchievements();
}

function applySeason() {
  const sid = activeSeason();
  SEASON_ORDER.forEach(s => document.body.classList.toggle('season-' + s, s === sid));
  const chip = $('#seasonChip');
  if (sid) { chip.hidden = false; chip.textContent = SEASONS[sid].name; } else chip.hidden = true;
  if (G.golden) { G.golden.el.innerHTML = Art.golden(sid); }
}

/* ==========================================================================
   Achievements
   ========================================================================== */
function checkAchievements(silent) {
  const fresh2 = [];
  for (const a of ACHIEVEMENTS) {
    if (S.achievements[a.id]) continue;
    let ok = false;
    try { ok = a.check(); } catch (e) { ok = false; }
    if (ok) { S.achievements[a.id] = now(); fresh2.push(a); }
  }
  if (!fresh2.length) return;
  recalc(); G.uiDirty = true;
  if (silent) return;
  Sound.achievement();
  fresh2.slice(0, 3).forEach(a => toast({ kind: 'Achievement unlocked', title: a.name, desc: a.desc, icon: achIcon(a) }));
  if (fresh2.length > 3) toast({ kind: 'Achievements', title: `+${fresh2.length - 3} more unlocked!`, icon: Art.tool('trophy', '#f7c843') });
  const r = $('#bigBiscuit').getBoundingClientRect();
  if (r.width) FX.confetti(r.left + r.width / 2, r.top + r.height / 3, 40);
}

/* ==========================================================================
   Ascension
   ========================================================================== */
function askAscend() {
  const gain = pendingChips();
  if (gain < 1) {
    modal({ title: 'Not yet...', html: `<p>You need to bake more cookies before ascending. Your next heavenly chip arrives at <b>${fmt(cookiesForNextChip())}</b> cookies baked (all time).</p>` });
    return;
  }
  modal({
    title: 'Ascend?',
    html: `<p>Your bakery will be reborn. You will gain</p><div class="hl">${fmt(gain)} heavenly ${plural(gain, 'chip')}</div>
      <p>Each prestige level permanently adds <b>+1% CpS</b>. Heavenly chips can be spent on powerful heavenly upgrades.</p>
      <p class="muted">Cookies, buildings and upgrades reset. Achievements, heavenly upgrades, seasonal collections and all-time stats are kept.</p>`,
    buttons: [{ label: 'Stay', cls: '' }, { label: 'Ascend!', cls: 'purple', action: () => doAscend(gain) }],
  });
}

function doAscend(gain) {
  S.prestige += gain; S.chips += gain; S.ascensions++;
  Object.assign(S, {
    cookies: 0, cookiesRun: 0, handmadeRun: 0, clicksRun: 0, goldenRun: 0,
    upgrades: [], buffs: [], runStart: now(), runPlayTime: 0,
  });
  BUILDINGS.forEach(b => { S.buildings[b.id] = 0; });
  if (hasHv('h_start')) { S.buildings.hand = 10; S.buildings.nana = 5; }
  if (G.golden) removeGolden(false);
  recalc(); G.uiDirty = true; G.storeKey = '';
  Sound.ascend();
  FX.confetti(innerWidth / 2, innerHeight / 2, 120);
  toast({ kind: 'Ascended', title: `Prestige level ${fmt(S.prestige)}`, desc: `+${fmt(gain)} heavenly chips. Welcome back, baker.`, icon: Art.tool('halo', '#ffe27a') });
  checkAchievements();
  updateStore('rebuild');
  save(true);
  renderActiveTab(true);
}

function buyHeavenly(h) {
  if (hasHv(h.id)) return;
  if (S.chips < h.cost) { Sound.bad(); return; }
  S.chips -= h.cost;
  S.heavenly.push(h.id);
  Sound.upgrade();
  FX.sparkle(innerWidth / 2, innerHeight / 2, 30, ['#fff', '#e6defc', '#ffe27a']);
  toast({ kind: 'Heavenly upgrade', title: h.name, desc: h.desc, icon: Art.tool(h.icon[0], h.icon[1]) });
  recalc(); G.uiDirty = true;
  checkAchievements();
  renderActiveTab(true);
}

/* ==========================================================================
   Tabs
   ========================================================================== */
const imgCache = {};
function svgImg(key, svg) {
  if (!imgCache[key]) imgCache[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.includes('xmlns') ? svg : svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
  return imgCache[key];
}

const tabKeys = {};
function renderActiveTab(force) {
  const t = G.activeTab;
  const fn = TABS[t];
  if (fn) fn(force);
}

const TABS = {
  bakery(force) {
    const key = BUILDINGS.map(b => S.buildings[b.id]).join(',') + '|' + Math.round(G.baseCps);
    if (!force && tabKeys.bakery === key) return;
    tabKeys.bakery = key;
    const box = $('#tab-bakery');
    const owned = BUILDINGS.filter(b => S.buildings[b.id] > 0);
    if (!owned.length) {
      box.innerHTML = `<div class="showcase-empty"><div class="big">Your bakery is empty... for now!</div>Click the big cookie, then buy a Helping Hand from the store to get started.</div>`;
      return;
    }
    let html = `<div class="section-title">${escapeHTML(S.bakeryName)} <small>${fmt(totalBuildings())} buildings · ${fmt(G.baseCps, 1)} cookies/s</small></div>`;
    owned.forEach(b => {
      const n = S.buildings[b.id];
      const show = Math.min(n, 24);
      const src = svgImg('b_' + b.id, ICONS[b.id]);
      let icons = '';
      for (let i = 0; i < show; i++) icons += `<span style="animation-delay:${(i * 0.17 % 3).toFixed(2)}s"><img src="${src}" alt="" width="30" height="30"></span>`;
      html += `<div class="show-row" data-tip="bld:${b.id}" style="background:linear-gradient(90deg, ${darken(b.color, 0.25)}, ${lighten(b.color, 0.25)})">
        <div class="sr-label"><b>${fmt(n)}</b>${escapeHTML(plural(n, b.name, b.plural))}</div>
        <div class="sr-icons">${icons}${n > show ? `<span class="sr-more">+${fmt(n - show)}</span>` : ''}</div></div>`;
    });
    box.innerHTML = html;
  },

  stats() {
    const box = $('#tab-stats');
    const st = (k, v) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`;
    const t = now();
    box.innerHTML = `
      <div class="section-title">Cookies per second <small>last hour</small></div>
      <div class="card chart-card"><canvas id="cpsChart"></canvas></div>
      <div class="section-title">General</div>
      <div class="stat-grid">
        ${st('Cookies in bank', fmt(S.cookies))}
        ${st('Cookies per second', fmt(G.cps, 1) + (G.cpsBuff > 1 ? ` <small>(×${G.cpsBuff.toFixed(1)})</small>` : ''))}
        ${st('Cookies per click', fmt(G.click, 1))}
        ${st('Baked this run', fmt(S.cookiesRun))}
        ${st('Baked all time', fmt(S.cookiesAll))}
        ${st('Handmade cookies', fmt(S.handmadeAll))}
        ${st('Cookie clicks', fmt(S.clicksAll))}
        ${st('Golden cookies clicked', fmt(S.goldenAll))}
        ${st('Golden cookies missed', fmt(S.stats.goldenMissed))}
        ${st('Buildings owned', fmt(totalBuildings()))}
        ${st('Buildings sold', fmt(S.stats.sold))}
        ${st('Upgrades bought', `${S.upgrades.length} / ${UPGRADES.length}`)}
        ${st('Achievements', `${achCount()} / ${ACHIEVEMENTS.length}`)}
        ${st('Best CpS', fmt(S.stats.maxCps, 1))}
        ${st('Offline cookies earned', fmt(S.stats.offlineEarned))}
      </div>
      <div class="section-title stat-sub">Time</div>
      <div class="stat-grid">
        ${st('This run started', fmtTime((t - S.runStart) / 1000) + ' ago')}
        ${st('Bakery founded', new Date(S.gameStart).toLocaleDateString())}
        ${st('Time played (run)', fmtTime(S.runPlayTime))}
        ${st('Time played (total)', fmtTime(S.playTime))}
      </div>
      <div class="section-title stat-sub">Multipliers</div>
      <div class="stat-grid">
        ${st('Prestige level', `${fmt(S.prestige)} <small>(+${fmt((G.prestigeMult - 1) * 100)}% CpS)</small>`)}
        ${st('Ascensions', fmt(S.ascensions))}
        ${st('Glaze level', `${Math.round(G.glaze * 100)}% <small>(×${G.glazeMult.toFixed(2)})</small>`)}
        ${st('Cookie flavors bonus', `+${Math.round(G.globalPct * 100)}%`)}
        ${st('Seasonal treats', `${collectTotal()} <small>(+${collectTotal() * 2}%)</small>`)}
        ${st('Total multiplier', '×' + fmt(G.globalMult, 2))}
        ${st('Daily quests completed', fmt(S.questsDone))}
      </div>`;
    drawHistory();
  },

  achievements(force) {
    const key = achCount() + ':' + S.upgrades.length;
    if (!force && tabKeys.achievements === key) return;
    tabKeys.achievements = key;
    const box = $('#tab-achievements');
    const got = achCount(), total = ACHIEVEMENTS.length;
    box.innerHTML = `<div class="section-title">Trophies <small>${got} / ${total} unlocked · glaze ${Math.round(G.glaze * 100)}%</small></div>
      <div class="ach-progress"><div style="width:${(got / total * 100).toFixed(1)}%"></div></div>
      <div class="ach-grid">${ACHIEVEMENTS.map(a => {
        const have = !!S.achievements[a.id];
        return `<div class="ach ${have ? '' : 'locked'}" data-tip="ach:${a.id}">${have || !a.hidden ? achIcon(a) : Art.tool('star', '#888')}</div>`;
      }).join('')}</div>
      <div class="section-title" style="margin-top:18px">Recipe book <small>${S.upgrades.length} / ${UPGRADES.length} upgrades owned this run</small></div>
      ${S.upgrades.length ? `<div class="ach-grid">${S.upgrades.map(id => `<div class="ach" data-tip="upg:${id}">${upgradeIcon(U[id])}</div>`).join('')}</div>` : '<p class="muted">Upgrades you buy will be collected here.</p>'}`;
  },

  games(force) { renderGames(force); },

  season(force) {
    const key = activeSeason() + collectTotal();
    if (!force && tabKeys.season === key) return;
    tabKeys.season = key;
    const sid = activeSeason();
    const box = $('#tab-season');
    let html = '';
    if (sid) {
      const s = SEASONS[sid];
      html += `<div class="season-hero" style="background:${s.grad}"><h3>${s.name} is here!</h3><p>${s.blurb}</p>
        <p style="opacity:.85;font-size:.85rem">Treats drop from golden cookies (30%) and rarely from clicking the big cookie. Each one gives <b>+2% CpS</b> forever. Seasonal upgrades appear in the store.</p></div>`;
    } else {
      html += `<div class="season-hero" style="background:linear-gradient(135deg,#c8792f,#5a3420)"><h3>No season right now</h3><p>Seasons arrive throughout the year: Harvest Moon, Frostfall, Sweetheart Week and Spring Bloom. You can also pick one in Settings.</p></div>`;
    }
    SEASON_ORDER.forEach(k => {
      const s = SEASONS[k];
      const have = S.collect[k] || [];
      html += `<div class="section-title">${s.name} <small>${have.length}/8 · ${s.months}</small></div><div class="collect-grid" style="margin-bottom:14px">`;
      s.items.forEach((name, i) => {
        const g = have.includes(i);
        html += `<div class="collect ${g ? '' : 'locked'}" data-tip="col:${k}.${i}"><div class="ci">${Art.season(k, i)}</div>${g ? escapeHTML(name) : '???'}</div>`;
      });
      html += '</div>';
    });
    box.innerHTML = html;
  },

  ascend(force) {
    const pend = pendingChips();
    const key = [S.prestige, S.chips, pend, S.heavenly.length, Math.floor(S.cookiesAll / Math.max(1, cookiesForNextChip()) * 100)].join('|');
    if (!force && tabKeys.ascend === key) return;
    tabKeys.ascend = key;
    const prevNeed = Math.pow(chipsForCookies(S.cookiesAll), 3) * 1e12;
    const nextNeed = cookiesForNextChip();
    const prog = clamp((S.cookiesAll - prevNeed) / (nextNeed - prevNeed), 0, 1);
    const box = $('#tab-ascend');
    box.innerHTML = `<div class="ascend-hero">
        <div class="halo">${Art.tool('halo', '#ffe27a')}</div>
        <div>Prestige level</div><div class="big">${fmt(S.prestige)}</div>
        <p>+${fmt((G.prestigeMult - 1) * 100)}% CpS · <b>${fmt(S.chips)}</b> heavenly ${plural(S.chips, 'chip')} to spend</p>
        <p>Ascending now grants <b>${fmt(pend)}</b> ${plural(pend, 'chip')}.</p>
        <div class="ach-progress" style="background:rgba(255,255,255,.2);max-width:320px;margin:10px auto"><div style="width:${(prog * 100).toFixed(1)}%"></div></div>
        <p style="font-size:.8rem">Next chip at ${fmt(nextNeed)} cookies baked (all time)</p>
        <button class="btn gold" id="ascendBtn" ${pend < 1 ? 'disabled' : ''}>Ascend</button>
      </div>
      <div class="section-title">Heavenly upgrades <small>bought with heavenly chips, kept forever</small></div>
      <div class="heaven-grid">${HEAVENLY.map(h => {
        const own = hasHv(h.id);
        return `<button class="heaven ${own ? 'owned' : (S.chips >= h.cost ? '' : 'cant')}" data-hv="${h.id}"><div class="hi">${Art.tool(h.icon[0], h.icon[1])}</div>
          <div><div class="hn">${escapeHTML(h.name)}</div><div class="hd">${h.desc}</div><div class="hc">${own ? 'Owned' : fmt(h.cost) + ' ' + plural(h.cost, 'chip')}</div></div></button>`;
      }).join('')}</div>`;
    $('#ascendBtn').addEventListener('click', askAscend);
    $$('[data-hv]', box).forEach(el => el.addEventListener('click', () => buyHeavenly(HV[el.dataset.hv])));
  },

  settings(force) {
    if (!force && tabKeys.settings) return;
    tabKeys.settings = true;
    const s = S.settings;
    const sw = (id, label, desc, on) => `<div class="set-row"><div><label for="${id}">${label}</label><div class="desc">${desc}</div></div>
      <label class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span class="sl"></span></label></div>`;
    const box = $('#tab-settings');
    box.innerHTML = `
      <div class="card">
        <div class="section-title">Sound</div>
        ${sw('setSound', 'Sound effects', 'Clicks, chimes and fanfares.', !s.muted)}
        <div class="set-row"><div><label for="setVol">Volume</label></div><input type="range" id="setVol" min="0" max="1" step="0.05" value="${s.volume}"></div>
      </div>
      <div class="card">
        <div class="section-title">Display</div>
        <div class="set-row"><div><label for="setFmt">Number format</label><div class="desc">How big numbers are written.</div></div>
          <select id="setFmt"><option value="words">1.5 million</option><option value="short">1.5M</option><option value="sci">1.5e6</option></select></div>
        ${sw('setParticles', 'Particles', 'Crumbs, sparkles and confetti.', s.particles)}
        ${sw('setFloaters', 'Floating numbers', 'Show +N when you click.', s.floaters)}
        ${sw('setRain', 'Cookie rain', 'Cookies fall in the background as you get richer.', s.rain)}
        ${sw('setMotion', 'Reduce motion', 'Calmer animations.', s.reduceMotion)}
        <div class="set-row"><div><label for="setSeason">Season</label><div class="desc">Auto follows the calendar.</div></div>
          <select id="setSeason"><option value="auto">Auto (by date)</option><option value="none">None</option>${SEASON_ORDER.map(k => `<option value="${k}">${SEASONS[k].name}</option>`).join('')}</select></div>
      </div>
      <div class="card">
        <div class="section-title">Save data</div>
        <p class="muted">The game autosaves every 30 seconds and when you close the page. Ctrl+S saves manually.</p>
        <div class="btn-row">
          <button class="btn primary" id="btnSave">Save now</button>
          <button class="btn" id="btnExport">Export save</button>
          <button class="btn" id="btnImport">Import save</button>
          <button class="btn danger" id="btnReset">Wipe save</button>
        </div>
      </div>
      <p class="muted" style="text-align:center">Cookie Clicker 2 · v${VERSION} · All art drawn in code.</p>`;
    $('#setFmt').value = s.numFormat;
    $('#setSeason').value = s.season;
    $('#setSound').addEventListener('change', e => setMuted(!e.target.checked));
    $('#setVol').addEventListener('input', e => { s.volume = +e.target.value; Sound.init(); Sound.setVolume(); });
    $('#setVol').addEventListener('change', () => Sound.buy());
    $('#setFmt').addEventListener('change', e => { s.numFormat = e.target.value; G.uiDirty = true; G.storeKey = ''; Object.keys(tabKeys).forEach(k => { if (k !== 'settings') delete tabKeys[k]; }); });
    $('#setParticles').addEventListener('change', e => { s.particles = e.target.checked; });
    $('#setFloaters').addEventListener('change', e => { s.floaters = e.target.checked; });
    $('#setRain').addEventListener('change', e => { s.rain = e.target.checked; });
    $('#setMotion').addEventListener('change', e => { s.reduceMotion = e.target.checked; document.body.classList.toggle('reduce-motion', s.reduceMotion); });
    $('#setSeason').addEventListener('change', e => { s.season = e.target.value; applySeason(); recalc(); G.storeKey = ''; delete tabKeys.season; });
    $('#btnSave').addEventListener('click', () => save());
    $('#btnExport').addEventListener('click', exportSave);
    $('#btnImport').addEventListener('click', importSave);
    $('#btnReset').addEventListener('click', wipeSave);
  },
};

function switchTab(name) {
  G.activeTab = name;
  $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  $$('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
  $('.tab-body').scrollTop = 0;
  renderActiveTab(true);
}

function setMuted(m) {
  S.settings.muted = m;
  if (m) S.flags.muted = true;
  Sound.init(); Sound.setVolume();
  $('#muteBtn').innerHTML = m ? UI_ICONS.soundOff : UI_ICONS.soundOn;
  const cb = $('#setSound'); if (cb) cb.checked = !m;
  if (!m) Sound.buy();
  checkAchievements();
}

/* ---------- Save management UI ---------- */
function exportSave() {
  S.flags.exported = true;
  save(true);
  const code = encodeSave(S);
  modal({
    title: 'Export save',
    html: `<p class="muted">Copy this code somewhere safe. You can paste it back with Import.</p><textarea id="exportBox" readonly>${code}</textarea>`,
    buttons: [
      { label: 'Download file', action: () => {
        const blob = new Blob([code], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `cookie-clicker-2-${new Date().toISOString().slice(0, 10)}.txt`;
        a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        return false;
      } },
      { label: 'Copy', cls: 'primary', action: () => {
        const ta = $('#exportBox'); ta.select();
        (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).catch(() => document.execCommand('copy'));
        toast({ kind: 'Export', title: 'Save code copied!', icon: Art.tool('star', '#9be37a'), time: 2500 });
        return false;
      } },
      { label: 'Close' },
    ],
  });
  setTimeout(() => { const ta = $('#exportBox'); if (ta) ta.select(); }, 50);
  checkAchievements();
}

function importSave() {
  modal({
    title: 'Import save',
    html: `<p class="muted">Paste a save code below. <b>This replaces your current game.</b></p><textarea id="importBox" placeholder="Paste your save code here..."></textarea>
      <p class="muted">Or load a file: <input type="file" id="importFile" accept=".txt,text/plain"></p><p id="importErr" style="color:#c94444;font-weight:700"></p>`,
    buttons: [
      { label: 'Cancel' },
      { label: 'Import', cls: 'primary', action: () => {
        try {
          const data = decodeSave($('#importBox').value);
          applyLoadedState(normalize(data));
          toast({ kind: 'Import', title: 'Save imported!', icon: Art.tool('star', '#9be37a') });
        } catch (e) {
          $('#importErr').textContent = 'That save code could not be read.';
          return false;
        }
      } },
    ],
  });
  $('#importFile').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => { $('#importBox').value = t.trim(); });
  });
}

function wipeSave() {
  modal({
    title: 'Wipe save?',
    html: '<p>This permanently deletes <b>everything</b>: cookies, buildings, prestige, achievements and collections.</p><p class="muted">Consider exporting your save first.</p>',
    buttons: [{ label: 'Cancel', cls: 'primary' }, { label: 'Wipe everything', cls: 'danger', action: () => {
      const settings = S.settings;
      const fresh3 = defaultState();
      fresh3.settings = settings;
      applyLoadedState(fresh3);
      save(true);
      toast({ kind: 'Reset', title: 'A fresh start', desc: 'Your bakery has been wiped clean.', icon: Art.miniCookie() });
    } }],
  });
}

function applyLoadedState(st) {
  S = st;
  if (G.golden) { G.golden.el.remove(); G.golden = null; }
  recalc();
  checkAchievements(true);
  G.storeKey = ''; G.uiDirty = true;
  Object.keys(tabKeys).forEach(k => delete tabKeys[k]);
  applySeason();
  document.body.classList.toggle('reduce-motion', S.settings.reduceMotion);
  $('#muteBtn').innerHTML = S.settings.muted ? UI_ICONS.soundOff : UI_ICONS.soundOn;
  $('#bakeryName').textContent = S.bakeryName;
  Sound.setVolume();
  scheduleGolden(true);
  updateStore('rebuild');
  renderActiveTab(true);
}

/* ==========================================================================
   Mini-games
   ========================================================================== */
const MEMORY_CD = 10 * 60e3, CATCH_CD = 5 * 60e3, FORTUNE_CD = 15 * 60e3;
const FORTUNES = [
  'A fresh batch of good luck is rising in your oven.',
  'You will soon receive a compliment about your crumbs.',
  'The cookie you seek is already in your hand.',
  'Patience: even the finest dough must rest.',
  'Someone nearby is thinking about cookies. It is you.',
  'Great bakers are not born. They are whisked.',
  'Your next click will be a good one.',
  'Fortune favors the golden.',
  'A small Nana will bring you great joy.',
  'Do not count your cookies before they are baked.',
  'An unexpected sprinkle will brighten your day.',
  'The oven of opportunity is preheated.',
  'You will travel far, probably to the kitchen.',
  'Today is a good day to buy one more building.',
  'Your heart is warm and so is this cookie.',
  'Wisdom is knowing a tomato is a fruit. Happiness is a cookie instead.',
  'The best time to bake was yesterday. The second best is now.',
  'Error 404: fortune not found. Have a cookie instead.',
  'Help! I am trapped in a fortune cookie bakery!',
  'A thousand cookies begin with a single click.',
  'Share your crumbs and you will never be lonely.',
  'You will discover a new favorite flavor soon.',
  'Your lucky numbers are 7, 77 and 777.',
  'Beware of empty cookie jars. They are a sign.',
  'A balanced diet is a cookie in each hand.',
  'Good things come to those who bake.',
  'Even the moon is just a very large cookie waiting to be bitten.',
  'You are the chocolate chip in the cookie of life.',
];

const Mem = { cards: [], open: [], moves: 0, matched: 0, active: false, lock: false };
const Catch = { running: false, t: 0, score: 0, items: [], bowlX: 0.5, raf: 0, keys: {} };

function cdLeft(ts) { return Math.max(0, ts - now()); }

function renderGames(force) {
  const box = $('#tab-games');
  if (force || !box.dataset.built) {
    box.dataset.built = '1';
    box.innerHTML = `<div class="section-title">Mini-games <small>bonus cookies for a little play</small></div>
      <div class="games-grid">
        <div class="game-card"><div class="gc-head" style="background:linear-gradient(135deg,#e98a45,#a65d1f)"><div class="gi">${Art.tool('dice', '#fff7ea')}</div><div><h4>Memory Match</h4><small>Find the cookie pairs</small></div></div>
          <div class="gc-body"><p>Flip cards to match 8 pairs of cookies. Fewer moves, bigger reward (up to 5 minutes of CpS).</p>
          <div id="memArea"></div><div class="cooldown" id="memInfo"></div><button class="btn primary block" id="memBtn">Start</button></div></div>
        <div class="game-card"><div class="gc-head" style="background:linear-gradient(135deg,#ff7eb6,#b23a7a)"><div class="gi">${Art.tool('bowl', '#fff7ea')}</div><div><h4>Sprinkle Catch</h4><small>20 seconds of chaos</small></div></div>
          <div class="gc-body"><p>Move the bowl to catch sprinkles. Avoid burnt crumbs! Each sprinkle is worth 2 seconds of CpS.</p>
          <canvas class="catch-canvas" id="catchCanvas" width="400" height="300"></canvas><div class="cooldown" id="catchInfo"></div><button class="btn primary block" id="catchBtn">Start</button></div></div>
        <div class="game-card"><div class="gc-head" style="background:linear-gradient(135deg,#f7c843,#c8792f)"><div class="gi">${Art.tool('fortune', '#fff7ea')}</div><div><h4>Fortune Cookie</h4><small>Crack one open</small></div></div>
          <div class="gc-body"><p>Every 15 minutes, a fresh fortune cookie arrives with wisdom and a little treat inside.</p>
          <div class="fortune-stage" id="fortuneStage"></div><div class="cooldown" id="fortuneInfo"></div></div></div>
      </div>`;
    $('#memBtn').addEventListener('click', startMemory);
    $('#catchBtn').addEventListener('click', startCatch);
    setupCatchInput();
    drawCatchIdle();
    if (Mem.active) drawMemory(); else $('#memArea').innerHTML = '';
    renderFortune();
  }
  // live info
  const mcd = cdLeft(S.mini.memoryCd);
  $('#memBtn').disabled = Mem.active || mcd > 0;
  $('#memBtn').textContent = Mem.active ? 'Playing...' : 'Start';
  $('#memInfo').textContent = Mem.active ? `Moves: ${Mem.moves} · Pairs: ${Mem.matched}/8` : (mcd > 0 ? `Next game in ${fmtTime(mcd / 1000)}` : (S.mini.memoryWins ? `Wins: ${S.mini.memoryWins} · Best: ${S.mini.memoryBest} moves` : 'Ready!'));
  const ccd = cdLeft(S.mini.catchCd);
  $('#catchBtn').disabled = Catch.running || ccd > 0;
  $('#catchBtn').textContent = Catch.running ? 'Catch!' : 'Start';
  $('#catchInfo').textContent = Catch.running ? `Time: ${Math.ceil(20 - Catch.t)}s · Caught: ${Catch.score}` : (ccd > 0 ? `Next round in ${fmtTime(ccd / 1000)}` : (S.mini.catchBest ? `Best: ${S.mini.catchBest} sprinkles` : 'Ready!'));
  const fcd = cdLeft(S.mini.fortuneCd);
  const stage = $('#fortuneStage');
  const ready = fcd <= 0;
  if (stage.dataset.ready !== String(ready) && !stage.dataset.busy) renderFortune();
  $('#fortuneInfo').textContent = ready ? `Ready to crack! · Opened: ${S.mini.fortunes}` : `Next fortune in ${fmtTime(fcd / 1000)}`;
}

/* ---------- Memory Match ---------- */
function startMemory() {
  if (Mem.active || cdLeft(S.mini.memoryCd) > 0) return;
  Sound.init();
  const ids = [];
  for (let i = 0; i < 8; i++) ids.push(i, i);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  Object.assign(Mem, { cards: ids.map(v => ({ v, open: false, done: false })), open: [], moves: 0, matched: 0, active: true, lock: false });
  drawMemory();
  renderGames();
}

function memoryFace(v) {
  const f = FLAVORS[(v * 3) % FLAVORS.length];
  return svgImg('mem' + v, Art.cookie({ seed: 500 + v, chips: 5, dough: f[1], edge: f[2], chip: f[3], cracks: 1, sprinkles: v === 6 ? 10 : 0 }));
}

function drawMemory() {
  const area = $('#memArea');
  area.innerHTML = `<div class="memory-grid">${Mem.cards.map((c, i) => `<button class="mcard ${c.open ? 'flip' : ''} ${c.done ? 'done' : ''}" data-i="${i}" aria-label="card">
    <div class="inner"><div class="face front"></div><div class="face back"><img src="${memoryFace(c.v)}" alt="" style="width:100%;height:100%"></div></div></button>`).join('')}</div>`;
  $$('.mcard', area).forEach(el => el.addEventListener('click', () => flipCard(+el.dataset.i, el)));
}

function flipCard(i, el) {
  const c = Mem.cards[i];
  if (!Mem.active || Mem.lock || c.open || c.done) return;
  c.open = true; el.classList.add('flip'); Sound.flip();
  Mem.open.push(i);
  if (Mem.open.length < 2) return;
  Mem.moves++;
  const [a, b] = Mem.open.map(k => Mem.cards[k]);
  const els = Mem.open.map(k => $(`.mcard[data-i="${k}"]`));
  if (a.v === b.v) {
    a.done = b.done = true; Mem.matched++;
    els.forEach(e => e.classList.add('done'));
    Mem.open = [];
    Sound.match();
    if (Mem.matched === 8) setTimeout(winMemory, 400);
  } else {
    Mem.lock = true;
    setTimeout(() => {
      a.open = b.open = false;
      els.forEach(e => e && e.classList.remove('flip'));
      Mem.open = []; Mem.lock = false;
    }, 750);
  }
  renderGames();
}

function winMemory() {
  Mem.active = false;
  const secs = clamp(300 - (Mem.moves - 8) * 15, 60, 300);
  const reward = Math.max(50, G.baseCps * secs);
  earn(reward);
  S.mini.memoryWins++;
  questBump('mini', 1);
  if (!S.mini.memoryBest || Mem.moves < S.mini.memoryBest) S.mini.memoryBest = Mem.moves;
  S.mini.memoryCd = now() + MEMORY_CD;
  Sound.achievement();
  const r = $('#memArea').getBoundingClientRect();
  FX.confetti(r.left + r.width / 2, r.top + r.height / 2, 50);
  toast({ kind: 'Memory Match', title: `Solved in ${Mem.moves} moves!`, desc: `You earned <b>${fmt(reward)}</b> cookies.`, icon: Art.tool('dice', '#ffe7a8') });
  checkAchievements();
  renderGames();
}

/* ---------- Sprinkle Catch ---------- */
function setupCatchInput() {
  const cv = $('#catchCanvas');
  const move = e => {
    const r = cv.getBoundingClientRect();
    Catch.bowlX = clamp((e.clientX - r.left) / r.width, 0.08, 0.92);
  };
  cv.addEventListener('pointermove', move);
  cv.addEventListener('pointerdown', e => { move(e); if (!Catch.running && cdLeft(S.mini.catchCd) <= 0) startCatch(); });
}
window.addEventListener('keydown', e => { Catch.keys[e.key] = true; });
window.addEventListener('keyup', e => { Catch.keys[e.key] = false; });

function drawCatchIdle() {
  const cv = $('#catchCanvas'); if (!cv) return;
  const c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height);
  drawBowl(c, cv, 0.5);
  c.fillStyle = '#7a4a2c'; c.font = '600 20px Fredoka, sans-serif'; c.textAlign = 'center';
  c.fillText(Catch.lastScore != null ? `You caught ${Catch.lastScore}!` : 'Tap Start to play', cv.width / 2, cv.height / 2 - 10);
}

function drawBowl(c, cv, x) {
  const bx = x * cv.width, by = cv.height - 34;
  c.fillStyle = '#e0546a';
  c.beginPath(); c.moveTo(bx - 44, by); c.lineTo(bx + 44, by); c.quadraticCurveTo(bx + 40, by + 30, bx, by + 30); c.quadraticCurveTo(bx - 40, by + 30, bx - 44, by); c.fill();
  c.fillStyle = '#fff'; c.globalAlpha = 0.4; c.fillRect(bx - 30, by + 6, 30, 4); c.globalAlpha = 1;
  c.fillStyle = '#b23a50'; c.fillRect(bx - 46, by - 4, 92, 6);
}

function startCatch() {
  if (Catch.running || cdLeft(S.mini.catchCd) > 0) return;
  Sound.init();
  Object.assign(Catch, { running: true, t: 0, score: 0, items: [], spawn: 0, last: performance.now() });
  cancelAnimationFrame(Catch.raf);
  Catch.raf = requestAnimationFrame(catchLoop);
  renderGames();
}

function catchLoop(ts) {
  const cv = $('#catchCanvas');
  if (!cv || !Catch.running) return;
  const dt = Math.min(0.05, (ts - Catch.last) / 1000); Catch.last = ts;
  Catch.t += dt;
  if (Catch.keys.ArrowLeft || Catch.keys.a) Catch.bowlX = clamp(Catch.bowlX - dt * 1.2, 0.08, 0.92);
  if (Catch.keys.ArrowRight || Catch.keys.d) Catch.bowlX = clamp(Catch.bowlX + dt * 1.2, 0.08, 0.92);
  const speedUp = 1 + Catch.t / 12;
  Catch.spawn += dt * (3 + Catch.t * 0.35);
  while (Catch.spawn > 1) {
    Catch.spawn--;
    const bad = Math.random() < 0.16;
    Catch.items.push({ x: rand(15, cv.width - 15), y: -10, vy: rand(110, 170) * speedUp, rot: rand(0, 6), vr: rand(-4, 4),
      bad, col: bad ? '#3a2214' : pick(['#ff6b8a', '#6bc5ff', '#ffe066', '#7be08a', '#c58aff', '#ffffff']) });
  }
  const c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height);
  const bx = Catch.bowlX * cv.width, by = cv.height - 34;
  Catch.items = Catch.items.filter(it => {
    it.y += it.vy * dt; it.rot += it.vr * dt;
    if (it.y > by - 6 && it.y < by + 14 && Math.abs(it.x - bx) < 46) {
      if (it.bad) { Catch.score = Math.max(0, Catch.score - 3); Sound.bad(); } else { Catch.score++; Sound.pop(); }
      return false;
    }
    if (it.y > cv.height + 10) return false;
    c.save(); c.translate(it.x, it.y); c.rotate(it.rot);
    c.fillStyle = it.col;
    if (it.bad) { c.beginPath(); c.arc(0, 0, 8, 0, 6.28); c.fill(); c.fillStyle = '#1a0e06'; c.fillRect(-3, -3, 3, 3); }
    else { c.beginPath(); c.roundRect ? c.roundRect(-8, -2.5, 16, 5, 2.5) : c.rect(-8, -2.5, 16, 5); c.fill(); }
    c.restore();
    return true;
  });
  drawBowl(c, cv, Catch.bowlX);
  c.fillStyle = '#5a3420'; c.font = '700 18px Fredoka, sans-serif'; c.textAlign = 'left';
  c.fillText(`Caught: ${Catch.score}`, 12, 24);
  c.textAlign = 'right'; c.fillText(`${Math.ceil(20 - Catch.t)}s`, cv.width - 12, 24);
  if (Catch.t >= 20) { endCatch(); return; }
  Catch.raf = requestAnimationFrame(catchLoop);
}

function endCatch() {
  Catch.running = false;
  Catch.lastScore = Catch.score;
  const reward = Math.max(Catch.score * 10, G.baseCps * 2 * Catch.score);
  if (reward > 0) earn(reward);
  if (Catch.score > S.mini.catchBest) S.mini.catchBest = Catch.score;
  if (Catch.score >= 20) questBump('mini', 1);
  S.mini.catchCd = now() + CATCH_CD;
  toast({ kind: 'Sprinkle Catch', title: `${Catch.score} sprinkles caught!`, desc: reward > 0 ? `You earned <b>${fmt(reward)}</b> cookies.` : 'Better luck next time!', icon: Art.tool('bowl', '#ff7eb6') });
  if (Catch.score > 0) Sound.match();
  drawCatchIdle();
  checkAchievements();
  renderGames();
}

/* ---------- Fortune cookie ---------- */
function renderFortune() {
  const stage = $('#fortuneStage'); if (!stage) return;
  const ready = cdLeft(S.mini.fortuneCd) <= 0;
  stage.dataset.ready = String(ready);
  if (ready) {
    stage.innerHTML = `<button class="fortune-biscuit" id="fortuneBtn" aria-label="Crack the fortune cookie">${Art.tool('fortune', '#f2b45a')}</button>`;
    $('#fortuneBtn').addEventListener('click', crackFortune);
  } else {
    stage.innerHTML = S.mini.lastFortune ? `<div class="fortune-slip">“${escapeHTML(S.mini.lastFortune)}”</div>` : `<div class="muted">The baker is folding a new fortune...</div>`;
  }
}

function crackFortune() {
  if (cdLeft(S.mini.fortuneCd) > 0) return;
  const stage = $('#fortuneStage');
  stage.dataset.busy = '1';
  Sound.init(); Sound.crack();
  const btn = $('#fortuneBtn');
  btn.classList.add('crack');
  btn.disabled = true;
  const r = btn.getBoundingClientRect();
  FX.crumbs(r.left + r.width / 2, r.top + r.height / 2, 18, ['#f2b45a', '#e8a040', '#fff7ea']);
  S.mini.fortuneCd = now() + FORTUNE_CD;
  S.mini.fortunes++;
  questBump('mini', 1);
  const text = pick(FORTUNES.filter(f => f !== S.mini.lastFortune));
  S.mini.lastFortune = text;
  const roll = Math.random();
  let reward;
  if (roll < 0.5) {
    const v = Math.max(100, G.baseCps * 600);
    earn(v); reward = `+${fmt(v)} cookies`;
  } else if (roll < 0.75) {
    addBuff({ id: 'fortunate', name: 'Fortunate', desc: 'Cookie production ×2', cpsMult: 2, dur: 60, icon: 'fortune', color: '#f2b45a' });
    reward = 'Cookie production ×2 for 60 seconds';
  } else {
    addBuff({ id: 'nimble', name: 'Nimble Fingers', desc: 'Clicking power ×10', clickMult: 10, dur: 30, icon: 'pin', color: '#f2b45a' });
    reward = 'Clicking power ×10 for 30 seconds';
  }
  setTimeout(() => {
    delete stage.dataset.busy;
    stage.dataset.ready = 'false';
    stage.innerHTML = `<div class="fortune-slip">“${escapeHTML(text)}”<br><b style="font-style:normal">${reward}</b></div>`;
    Sound.match();
    checkAchievements();
  }, 600);
}

/* ==========================================================================
   News ticker
   ========================================================================== */
const News = {
  recent: [],
  next() {
    const pool = NEWS.map(f => { try { return f(); } catch (e) { return null; } }).filter(Boolean);
    let options = pool.filter(t => !this.recent.includes(t));
    if (!options.length) options = pool;
    const text = pick(options);
    this.recent.push(text); if (this.recent.length > 12) this.recent.shift();
    const el = $('#newsText');
    el.classList.remove('scroll');
    el.textContent = text;
    void el.offsetWidth;
    const track = el.parentElement.offsetWidth;
    const dist = el.scrollWidth;
    const dur = Math.max(8, (dist + track) / 85);
    el.style.setProperty('--news-dur', dur.toFixed(1) + 's');
    el.classList.add('scroll');
  },
  init() {
    const el = $('#newsText');
    el.addEventListener('animationend', () => this.next());
    $('#news').addEventListener('click', () => { S.flags.news = true; Sound.init(); Sound.pop(); checkAchievements(); this.next(); });
    this.next();
  },
};

/* ==========================================================================
   Misc UI wiring
   ========================================================================== */
/* --- Secret dev menu: bakery names ending in "says123butnot4" unlock it --- */
const CHEAT_SUFFIX = 'says123butnot4';
const isCheatName = name => String(name || '').toLowerCase().endsWith(CHEAT_SUFFIX);

function devRefresh(msg) {
  recalc(); G.uiDirty = true; checkAchievements(true); updateStore(true);
  for (const k of Object.keys(tabKeys)) delete tabKeys[k];
  const s = $('#devStatus'); if (s) s.textContent = msg;
  Sound.upgrade();
}

function openDevMenu() {
  const add = n => { earn(n); devRefresh(`Added ${fmt(n)} cookies.`); return false; };
  modal({
    title: '🛠️ Secret Dev Menu',
    html: `<p class="muted">Cheats unlocked. Shhh, don't tell anyone.</p>
      <p id="devStatus" style="min-height:1.4em;font-weight:700"></p>`,
    buttons: [
      { label: '+1 Million', action: () => add(1e6) },
      { label: '+1 Billion', action: () => add(1e9) },
      { label: '+1 Trillion', action: () => add(1e12) },
      { label: '+10 of every building', action: () => {
        BUILDINGS.forEach(b => { S.buildings[b.id] += 10; });
        devRefresh('Added 10 of every building.'); return false;
      } },
      { label: 'Unlock all upgrades', action: () => {
        UPGRADES.forEach(u => { if (!S.upgrades.includes(u.id)) S.upgrades.push(u.id); });
        devRefresh('All upgrades unlocked.'); return false;
      } },
      { label: 'Unlock all achievements', action: () => {
        ACHIEVEMENTS.forEach(a => { if (!S.achievements[a.id]) S.achievements[a.id] = now(); });
        devRefresh('All achievements unlocked.'); return false;
      } },
      { label: 'Spawn golden cookie', action: () => {
        if (G.golden) removeGolden(false);
        spawnGolden(); devRefresh('A golden cookie appeared!'); return false;
      } },
      { label: '+100 heavenly chips', action: () => {
        S.chips += 100; S.prestige += 100;
        devRefresh('Added 100 heavenly chips.'); return false;
      } },
      { label: 'Rename bakery', action: () => { setTimeout(renameBakery, 0); } },
      { label: 'Close', cls: 'primary' },
    ],
  });
}

function renameBakery() {
  modal({
    title: 'Name your bakery',
    html: `<p class="muted">What should the world call your cookie empire?</p><input type="text" id="nameInput" maxlength="28" style="width:100%" value="${escapeHTML(S.bakeryName)}">`,
    buttons: [
      { label: 'Random', action: () => {
        const a = ['Golden', 'Cozy', 'Crumbly', 'Sunny', 'Toasty', 'Sweet', 'Midnight', 'Buttery', 'Lucky', 'Cosmic'];
        const b = ['Oven', 'Crumb', 'Whisk', 'Dough', 'Sprinkle', 'Rolling Pin', 'Chip', 'Biscuit', 'Batter', 'Spatula'];
        const c = ['Bakery', 'Kitchen', 'Bakehouse', 'Cookie Co.', 'Pâtisserie', 'Emporium'];
        $('#nameInput').value = `The ${pick(a)} ${pick(b)} ${pick(c)}`;
        return false;
      } },
      { label: 'Save', cls: 'primary', action: () => {
        const v = $('#nameInput').value.trim().slice(0, 28);
        if (v) { S.bakeryName = v; S.flags.renamed = true; $('#bakeryName').textContent = v; checkAchievements(); delete tabKeys.bakery; }
        if (isCheatName(v)) { setTimeout(openDevMenu, 0); }
      } },
    ],
  });
  setTimeout(() => { const i = $('#nameInput'); if (i) { i.focus(); i.select(); i.addEventListener('keydown', e => { if (e.key === 'Enter') $('#modalActions .btn.primary').click(); }); } }, 50);
}

function setPane(id) {
  G.pane = id;
  $$('.pane').forEach(p => p.classList.toggle('mobile-on', p.id === id));
  $$('#mobileNav button').forEach(b => b.classList.toggle('on', b.dataset.pane === id));
  document.body.classList.toggle('on-bake', id === 'paneBake');
  if (id === 'paneBake') setTimeout(() => BG.resize(), 0);
  Tip.hide();
}

function bindUI() {
  $('#brandLogo').innerHTML = Art.cookie({ seed: 3, chips: 5, cracks: 0 });
  $('#muteBtn').addEventListener('click', () => setMuted(!S.settings.muted));
  $('#buyAllBtn').addEventListener('click', buyAllUpgrades);
  $('#bakeryName').addEventListener('click', () => (isCheatName(S.bakeryName) ? openDevMenu() : renameBakery()));
  $('#seasonChip').addEventListener('click', () => { switchTab('season'); if (innerWidth <= 760) setPane('paneMid'); });
  $$('#tabs button').forEach(b => b.addEventListener('click', () => { switchTab(b.dataset.tab); b.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' }); }));
  $$('#buyToggle [data-mode]').forEach(b => b.addEventListener('click', () => {
    G.buyMode = b.dataset.mode;
    $$('#buyToggle [data-mode]').forEach(x => x.classList.toggle('on', x === b));
    updateStore();
  }));
  $$('#buyToggle [data-amt]').forEach(b => b.addEventListener('click', () => {
    G.buyAmt = b.dataset.amt === 'max' ? 'max' : +b.dataset.amt;
    $$('#buyToggle [data-amt]').forEach(x => x.classList.toggle('on', x === b));
    updateStore();
  }));
  $$('#mobileNav button').forEach(b => b.addEventListener('click', () => setPane(b.dataset.pane)));
  $$('#mobileNav .mn-ico').forEach(s => { s.innerHTML = s.dataset.ico === 'cookie' ? Art.cookie({ seed: 9, chips: 4, cracks: 0, shine: false }) : UI_ICONS[s.dataset.ico]; });
  $('#modalWrap').addEventListener('click', e => { if (e.target.id === 'modalWrap') closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#modalWrap').hidden) closeModal();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  });
  document.addEventListener('pointerdown', () => Sound.init(), { once: true });
  window.addEventListener('beforeunload', () => save(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });
  setPane('paneBake');
}

/* ==========================================================================
   Offline progress
   ========================================================================== */
function applyOffline() {
  const away = (now() - S.lastSave) / 1000;
  if (away > 3600) S.flags.away = true;
  if (S.buffs.length) { S.buffs.forEach(b => { b.time -= away; }); S.buffs = S.buffs.filter(b => b.time > 0); }
  recalc();
  if (away < 60 || G.baseCps <= 0) return;
  const rate = hasHv('h_offline') ? 0.6 : 0.25;
  const cap = hasHv('h_cap') ? 72 * 3600 : 12 * 3600;
  const secs = Math.min(away, cap);
  const gain = G.baseCps * secs * rate;
  earn(gain);
  S.stats.offlineEarned += gain;
  setTimeout(() => modal({
    title: 'Welcome back!',
    html: `<p>You were away for <b>${fmtTime(away)}</b>. While you were gone, your bakery kept the ovens warm and baked</p>
      <div class="hl">${fmt(gain)} cookies</div>
      <p class="muted">Offline baking runs at ${Math.round(rate * 100)}% efficiency for up to ${cap / 3600} hours.${hasHv('h_offline') ? '' : ' Heavenly upgrades can improve this.'}</p>`,
    buttons: [{ label: 'Yum!', cls: 'primary' }],
  }), 400);
}

/* ==========================================================================
   Daily quests
   ========================================================================== */
const QUEST_TYPES = {
  click: { text: n => `Click the big cookie ${fmt(n)} times`, gen: r => 150 + Math.floor(r() * 8) * 50, icon: 'pin' },
  build: { text: n => `Buy ${fmt(n)} buildings`, gen: r => 10 + Math.floor(r() * 5) * 5, icon: 'bag' },
  golden: { text: n => `Click ${n} golden ${plural(n, 'cookie')}`, gen: r => 1 + Math.floor(r() * 2), icon: 'clover' },
  upgrade: { text: n => `Buy ${n} upgrades`, gen: r => 2 + Math.floor(r() * 3), icon: 'star' },
  bake: { text: n => `Bake ${fmt(n)} cookies`, gen: () => Math.max(5000, Math.round(G.baseCps * 1800)), icon: 'whisk' },
  mini: { text: n => `Play ${n} ${plural(n, 'mini-game')} (win Memory Match, catch 20+ sprinkles or crack a fortune)`, gen: r => 1 + Math.floor(r() * 2), icon: 'dice' },
};

function dayKey(d = new Date()) { return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }

function ensureDaily() {
  const key = dayKey();
  const prev = S.daily || {};
  if (prev.date === key) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const keepStreak = prev.date === dayKey(y) && prev.allDone;
  const r = seeded(hashStr(key + ':' + S.gameStart));
  const types = Object.keys(QUEST_TYPES);
  for (let i = types.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [types[i], types[j]] = [types[j], types[i]]; }
  S.daily = {
    date: key,
    streak: keepStreak || prev.date === key ? (prev.streak || 0) : 0,
    bestStreak: prev.bestStreak || 0,
    allDone: false,
    quests: types.slice(0, 3).map(type => ({ type, target: QUEST_TYPES[type].gen(r), progress: 0, base: S.cookiesAll, claimed: false, notified: false })),
  };
  delete tabKeys.quests;
}

function questBump(type, n) {
  if (!S.daily) return;
  S.daily.quests.forEach(q => { if (q.type === type && !q.claimed) { q.progress = Math.min(q.target, q.progress + n); questCheck(q); } });
}

function questCheck(q) {
  if (q.progress >= q.target && !q.notified) {
    q.notified = true;
    toast({ kind: 'Daily quest complete', title: QUEST_TYPES[q.type].text(q.target), desc: 'Claim your reward in the Quests tab.', icon: Art.tool(QUEST_TYPES[q.type].icon, '#9be37a') });
    Sound.match();
    $('#questDot').style.display = '';
  }
}

function questTick() {
  ensureDaily();
  S.daily.quests.forEach(q => {
    if (q.type === 'bake' && !q.claimed) { q.progress = Math.min(q.target, Math.max(0, S.cookiesAll - q.base)); questCheck(q); }
  });
  $('#questDot').style.display = S.daily.quests.some(q => q.progress >= q.target && !q.claimed) ? '' : 'none';
}

function questReward() { return Math.max(1000, G.baseCps * 900) * (1 + 0.1 * S.daily.streak); }

function claimQuest(i) {
  const q = S.daily.quests[i];
  if (!q || q.claimed || q.progress < q.target) return;
  q.claimed = true;
  S.questsDone++;
  const v = questReward();
  earn(v);
  Sound.upgrade();
  toast({ kind: 'Quest reward', title: `+${fmt(v)} cookies`, icon: Art.tool('trophy', '#f7c843'), time: 3000 });
  if (S.daily.quests.every(x => x.claimed)) {
    S.daily.allDone = true;
    S.daily.streak++;
    S.daily.bestStreak = Math.max(S.daily.bestStreak, S.daily.streak);
    addBuff({ id: 'daily', name: 'Daily Delight', desc: 'All daily quests done! Cookie production ×2', cpsMult: 2, dur: 600, icon: 'trophy', color: '#f7c843' });
    FX.confetti(innerWidth / 2, innerHeight / 2, 100);
    Sound.achievement();
    toast({ kind: 'All quests done!', title: `${S.daily.streak}-day streak!`, desc: 'Daily Delight: ×2 CpS for 10 minutes. Come back tomorrow to keep the streak.', icon: Art.tool('clock', '#ffd34d'), time: 6000 });
  }
  checkAchievements();
  questTick();
  renderActiveTab(true);
}

TABS.quests = function (force) {
  ensureDaily();
  const d = S.daily;
  const key = JSON.stringify(d.quests.map(q => [q.progress, q.claimed])) + d.streak + Math.floor(questReward());
  const tomorrow = new Date(); tomorrow.setHours(24, 0, 0, 0);
  const box = $('#tab-quests');
  if (force || tabKeys.quests !== key) {
    tabKeys.quests = key;
    box.innerHTML = `<div class="quest-hero">
        <div><div class="qh-k">Daily streak</div><div class="qh-v">${d.streak} ${plural(d.streak, 'day')}</div><div class="qh-s">Best: ${d.bestStreak} · each streak day adds +10% to quest rewards</div></div>
        <div class="qh-flame">${Art.tool('star', d.streak ? '#ffd34d' : '#d8c3a5')}</div>
      </div>
      <div class="section-title">Today's quests <small id="questReset"></small></div>
      ${d.quests.map((q, i) => {
        const T = QUEST_TYPES[q.type];
        const pct = clamp(q.progress / q.target, 0, 1);
        const done = q.progress >= q.target;
        return `<div class="quest ${q.claimed ? 'claimed' : done ? 'done' : ''}">
          <div class="qi">${Art.tool(T.icon, q.claimed ? '#c8e6c0' : done ? '#9be37a' : '#ffe7a8')}</div>
          <div class="qm"><div class="qt">${escapeHTML(T.text(q.target))}</div>
            <div class="qbar"><div style="width:${(pct * 100).toFixed(1)}%"></div></div>
            <div class="qp">${fmt(q.progress)} / ${fmt(q.target)}</div></div>
          <button class="btn ${done && !q.claimed ? 'gold' : ''}" data-claim="${i}" ${done && !q.claimed ? '' : 'disabled'}>${q.claimed ? 'Claimed' : done ? `Claim<br><small>+${fmt(questReward())}</small>` : 'In progress'}</button>
        </div>`;
      }).join('')}
      <p class="muted">Complete all three to earn <b>Daily Delight</b> (×2 CpS for 10 minutes) and grow your streak. New quests arrive at midnight.</p>`;
    $$('[data-claim]', box).forEach(b => b.addEventListener('click', () => claimQuest(+b.dataset.claim)));
  }
  const rs = $('#questReset');
  if (rs) rs.textContent = `new quests in ${fmtTime((tomorrow - new Date()) / 1000)}`;
};

/* ==========================================================================
   CpS history chart (Stats tab)
   ========================================================================== */
function recordHistory() {
  S.history.push(Math.round(G.baseCps * 100) / 100);
  if (S.history.length > 120) S.history.shift();
}

function drawHistory() {
  const cv = $('#cpsChart');
  if (!cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth, h = cv.clientHeight;
  cv.width = w * dpr; cv.height = h * dpr;
  const c = cv.getContext('2d');
  c.scale(dpr, dpr);
  const data = S.history.concat([G.baseCps]);
  if (data.length < 2) {
    c.fillStyle = '#a07a5a'; c.font = '600 13px Nunito, sans-serif'; c.textAlign = 'center';
    c.fillText('Your CpS history will appear here as you bake.', w / 2, h / 2);
    return;
  }
  const max = Math.max(...data, 1);
  const pad = 6;
  const pts = data.map((v, i) => [pad + i / (data.length - 1) * (w - pad * 2), h - pad - (v / max) * (h - pad * 2 - 14)]);
  const grad = c.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(232,160,80,.55)'); grad.addColorStop(1, 'rgba(232,160,80,0)');
  c.beginPath(); c.moveTo(pts[0][0], h - pad);
  pts.forEach(p => c.lineTo(p[0], p[1]));
  c.lineTo(pts[pts.length - 1][0], h - pad); c.closePath();
  c.fillStyle = grad; c.fill();
  c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
  c.strokeStyle = '#c8692a'; c.lineWidth = 2.5; c.lineJoin = 'round'; c.stroke();
  const last = pts[pts.length - 1];
  c.fillStyle = '#c8692a'; c.beginPath(); c.arc(last[0], last[1], 4, 0, 6.28); c.fill();
  c.fillStyle = '#7b5a44'; c.font = '700 11px Nunito, sans-serif'; c.textAlign = 'left';
  c.fillText(`peak ${fmt(max, 1)}/s`, pad + 2, 14);
  c.textAlign = 'right';
  c.fillText(`last ${fmtTime((data.length - 1) * 30)}`, w - pad - 2, 14);
}

/* ==========================================================================
   Buy all upgrades
   ========================================================================== */
function buyAllUpgrades() {
  Sound.init();
  let bought = 0;
  for (;;) {
    const next = UPGRADES.filter(u => !G.owned.has(u.id) && u.unlock())
      .sort((a, b) => upgradeCost(a) - upgradeCost(b))[0];
    if (!next || upgradeCost(next) > S.cookies) break;
    spend(upgradeCost(next));
    S.upgrades.push(next.id);
    questBump('upgrade', 1);
    recalc();
    bought++;
  }
  if (!bought) { Sound.bad(); return; }
  Sound.upgrade();
  const r = $('#upgrades').getBoundingClientRect();
  FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 40);
  toast({ kind: 'Store', title: `Bought ${bought} ${plural(bought, 'upgrade')}`, icon: Art.tool('bag', '#9be37a'), time: 2500 });
  G.uiDirty = true;
  checkAchievements();
  updateStore();
}

/* ==========================================================================
   Main loop
   ========================================================================== */
let lastLogic = now(), lastFrame = performance.now(), saveTimer = 0, histTimer = 0, slowTimer = 0, storeTimer = 0, tabTimer = 0, tipTimer = 0;

function logic() {
  const t = now();
  let dt = (t - lastLogic) / 1000;
  lastLogic = t;
  if (dt <= 0) return;
  if (dt > 60) { // the computer was asleep: treat the gap like offline time
    const rate = hasHv('h_offline') ? 0.6 : 0.25;
    earn(G.baseCps * Math.min(dt, hasHv('h_cap') ? 72 * 3600 : 12 * 3600) * rate);
    dt = 0.1;
  }
  tickBuffs(dt);
  earn(G.cps * dt);
  S.playTime += dt; S.runPlayTime += dt;

  if (!G.golden && t >= G.nextGolden) spawnGolden();
  if (G.golden && t >= G.golden.expire) removeGolden(true);

  slowTimer += dt;
  if (slowTimer >= 1) {
    slowTimer = 0;
    const h = new Date().getHours();
    if (h < 4) S.flags.night = true;
    if (G.baseCps > 0) recalc(); // keeps CpS-based click power fresh
    questTick();
    checkAchievements();
    document.title = `${fmt(S.cookies)} cookies · Cookie Clicker 2`;
  }
  histTimer += dt;
  if (histTimer >= 30) { histTimer = 0; recordHistory(); }
  saveTimer += dt;
  if (saveTimer >= 30) { saveTimer = 0; save(true); }
}

function splitCount(n) {
  const str = fmt(n);
  const i = str.indexOf(' ');
  if (i > 0) return [str.slice(0, i), str.slice(i + 1) + ' cookies'];
  return [str, Math.floor(n) === 1 ? 'cookie' : 'cookies'];
}

function frame(ts) {
  const dt = Math.min(0.1, (ts - lastFrame) / 1000);
  lastFrame = ts;
  const [num, label] = splitCount(S.cookies);
  const cEl = $('#bankCount');
  if (cEl.textContent !== num) cEl.textContent = num;
  const lEl = $('#bankLabel');
  if (lEl.textContent !== label) lEl.textContent = label;
  const cpsTxt = `per second: ${fmt(G.cps, 1)}`;
  const cpsEl = $('#cpsDisplay');
  if (cpsEl.textContent !== cpsTxt) cpsEl.textContent = cpsTxt;
  $('#miniBank').textContent = fmt(S.cookies);
  $('#miniCps').textContent = fmt(G.cps, 1) + ' /s';
  const glazeH = clamp(G.glaze / 4, 0, 1) * 28;
  const gz = $('#glaze');
  gz.style.height = glazeH.toFixed(1) + '%';
  gz.style.visibility = glazeH > 0 ? '' : 'hidden';

  storeTimer += dt;
  if (storeTimer > 0.2 || G.uiDirty) { storeTimer = 0; updateStore(); renderBuffs(); G.uiDirty = false; }
  tipTimer += dt;
  if (tipTimer > 0.25) { tipTimer = 0; Tip.render(); }
  tabTimer += dt;
  if (tabTimer > 1) { tabTimer = 0; renderActiveTab(false); }

  FX.step();
  if (innerWidth > 760 || G.pane === 'paneBake') BG.step(dt);
  requestAnimationFrame(frame);
}

/* ==========================================================================
   Boot
   ========================================================================== */
function init() {
  S = load();
  recalc();
  FX.init();
  BG.init();
  Tip.init();
  bindUI();
  bindCookie();
  buildStore();
  applySeason();
  document.body.classList.toggle('reduce-motion', S.settings.reduceMotion);
  $('#muteBtn').innerHTML = S.settings.muted ? UI_ICONS.soundOff : UI_ICONS.soundOn;
  $('#bakeryName').textContent = S.bakeryName;
  applyOffline();
  ensureDaily();
  checkAchievements(true);
  scheduleGolden(true);
  updateStore('rebuild');
  switchTab('bakery');
  News.init();
  setInterval(logic, 100);
  requestAnimationFrame(frame);
  if (S.cookiesAll === 0 && S.ascensions === 0) {
    setTimeout(() => toast({ kind: 'Welcome', title: 'Welcome to Cookie Clicker 2!', desc: 'Click the big cookie to bake. Spend cookies in the store to bake automatically.', icon: Art.miniCookie(), time: 7000 }), 600);
  }
  // Debug/console helpers for curious bakers
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
  }
  window.CC2 = { get state() { return S; }, save, recalc, spawnGolden: () => { if (!G.golden) spawnGolden(); } };
}

init();
})();
