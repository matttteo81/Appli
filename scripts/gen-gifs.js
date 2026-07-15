// Génère les GIF animés prédéfinis pour la messagerie.
// Usage : node scripts/gen-gifs.js
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');

const OUT = path.join(__dirname, '..', 'assets', 'gifs');
fs.mkdirSync(OUT, { recursive: true });

const W = 220, H = 220;

function heartPath(cx, cy, s) {
  // coeur centré en (cx,cy), "taille" s
  return `M ${cx} ${cy + s * 0.3}
    C ${cx} ${cy}, ${cx - s} ${cy - s * 0.2}, ${cx - s} ${cy - s * 0.55}
    C ${cx - s} ${cy - s * 0.95}, ${cx - s * 0.4} ${cy - s}, ${cx} ${cy - s * 0.55}
    C ${cx + s * 0.4} ${cy - s}, ${cx + s} ${cy - s * 0.95}, ${cx + s} ${cy - s * 0.55}
    C ${cx + s} ${cy - s * 0.2}, ${cx} ${cy}, ${cx} ${cy + s * 0.3} Z`;
}

function render(svg) {
  const r = new Resvg(svg, { background: 'rgba(0,0,0,0)', fitTo: { mode: 'width', value: W } });
  const img = r.render();
  return { data: img.pixels, width: img.width, height: img.height };
}

function encode(frames, delay, name) {
  const enc = GIFEncoder();
  for (const f of frames) {
    const { data, width, height } = f;
    const palette = quantize(data, 256, { format: 'rgba4444' });
    const index = applyPalette(data, palette, 'rgba4444');
    enc.writeFrame(index, width, height, { palette, delay, transparent: true });
  }
  enc.finish();
  fs.writeFileSync(path.join(OUT, name + '.gif'), Buffer.from(enc.bytes()));
  console.log('✔', name);
}

const bg = (c) => `<rect width="${W}" height="${H}" rx="24" fill="${c}"/>`;
const svg = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${inner}</svg>`;

const N = 14;
const TAU = Math.PI * 2;

// 1) Cœur qui bat
{
  const frames = [];
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const s = 62 + Math.sin(t * TAU) * 10;
    frames.push(render(svg(bg('#FBF6EF') + `<path d="${heartPath(110, 120, s)}" fill="#EF8C7C"/>`)));
  }
  encode(frames, 70, 'coeur-bat');
}

// 2) Pluie de cœurs
{
  const cols = ['#EF8C7C', '#F2A65A', '#A8C3A0', '#4A3B6B'];
  const seeds = Array.from({ length: 9 }, (_, k) => ({
    x: 20 + (k * 23) % 190, off: (k * 0.13) % 1, c: cols[k % cols.length], s: 12 + (k % 3) * 5,
  }));
  const frames = [];
  for (let i = 0; i < N; i++) {
    const t = i / N;
    let inner = bg('#1B1B3A');
    for (const p of seeds) {
      const yy = (((t + p.off) % 1)) * 240 - 20;
      inner += `<path d="${heartPath(p.x, H - yy, p.s)}" fill="${p.c}" opacity="0.9"/>`;
    }
    frames.push(render(svg(inner)));
  }
  encode(frames, 90, 'pluie-coeurs');
}

// 3) Deux cœurs reliés (motif de l'appli)
{
  const frames = [];
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const gap = 30 + Math.abs(Math.sin(t * TAU)) * 18;
    const inner =
      bg('#FBF6EF') +
      `<path d="M ${110 - gap} 120 C 110 90, 110 90, ${110 + gap} 120" stroke="#EF8C7C" stroke-width="4" fill="none"/>` +
      `<path d="${heartPath(110 - gap, 122, 34)}" fill="#F2A65A"/>` +
      `<path d="${heartPath(110 + gap, 122, 34)}" fill="#EF8C7C"/>`;
    frames.push(render(svg(inner)));
  }
  encode(frames, 80, 'deux-coeurs');
}

// 4) Bonne nuit (lune + étoiles)
{
  const stars = Array.from({ length: 12 }, (_, k) => ({ x: 15 + (k * 37) % 200, y: 15 + (k * 53) % 150, ph: (k * 0.17) % 1 }));
  const frames = [];
  for (let i = 0; i < N; i++) {
    const t = i / N;
    let inner = bg('#1B1B3A');
    inner += `<circle cx="150" cy="70" r="34" fill="#F2A65A"/><circle cx="162" cy="62" r="30" fill="#1B1B3A"/>`;
    for (const s of stars) {
      const tw = 0.4 + 0.6 * Math.abs(Math.sin((t + s.ph) * TAU));
      inner += `<circle cx="${s.x}" cy="${s.y}" r="${2.4 * tw + 0.6}" fill="#FBF6EF" opacity="${tw}"/>`;
    }
    frames.push(render(svg(inner)));
  }
  encode(frames, 110, 'bonne-nuit');
}

// 5) Explosion de cœurs
{
  const cols = ['#EF8C7C', '#F2A65A', '#A8C3A0', '#FBF6EF'];
  const parts = Array.from({ length: 10 }, (_, k) => ({ a: (k / 10) * TAU, c: cols[k % cols.length] }));
  const frames = [];
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const r = t * 78;
    let inner = bg('#4A3B6B');
    for (const p of parts) {
      const x = 110 + Math.cos(p.a) * r;
      const y = 110 + Math.sin(p.a) * r;
      const s = 10 + (1 - t) * 16;
      inner += `<path d="${heartPath(x, y, s)}" fill="${p.c}" opacity="${1 - t * 0.7}"/>`;
    }
    inner += `<path d="${heartPath(110, 112, 14 + (1 - Math.abs(0.5 - t) * 2) * 10)}" fill="#EF8C7C"/>`;
    frames.push(render(svg(inner)));
  }
  encode(frames, 75, 'explosion-coeurs');
}

// 6) Cœur arc-en-ciel
{
  const cols = ['#EF8C7C', '#F2A65A', '#A8C3A0', '#4A3B6B', '#EF8C7C'];
  const frames = [];
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const idx = Math.floor(t * (cols.length - 1));
    const s = 64 + Math.sin(t * TAU) * 6;
    frames.push(render(svg(bg('#FBF6EF') + `<path d="${heartPath(110, 120, s)}" fill="${cols[idx]}"/>`)));
  }
  encode(frames, 90, 'coeur-arc');
}

console.log('Tous les GIF sont générés dans', OUT);
