const fs = require('fs');
const { Resvg } = require('@resvg/resvg-js');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');

const W = 1024, OUT = 440;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - ((-2 * x + 2) ** 2) / 2);
const easeOut = (x) => 1 - (1 - x) ** 3;
const pulse = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));

const HD = 'M12 21 C12 21 3 13.8 3 8.5 C3 5.4 5.5 4 7.5 4 C9.6 4 11 5.6 12 7 C13 5.6 14.4 4 16.5 4 C18.5 4 21 5.4 21 8.5 C21 13.8 12 21 12 21 Z';
const heart = (cx, cy, s, c, rot = 0, op = 1) =>
  `<g opacity="${op}" transform="translate(${cx} ${cy}) rotate(${rot}) scale(${s}) translate(-12 -12)"><path d="${HD}" fill="${c}"/></g>`;

const sky = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B1B3A"/><stop offset="1" stop-color="#4A3B6B"/></linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.45" r="0.65"><stop offset="0" stop-color="#F2A65A" stop-opacity="0.22"/><stop offset="1" stop-color="#F2A65A" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#glow)"/>
  <g transform="translate(852,150)"><circle r="42" fill="#FBF6EF"/><circle cx="16" cy="-6" r="38" fill="#221f45"/></g>
  <g fill="#FBF6EF" opacity="0.75"><circle cx="150" cy="150" r="4"/><circle cx="250" cy="110" r="3"/><circle cx="120" cy="300" r="3"/></g>`;

// Silhouette simple et neutre (tête + corps capsule + jambes)
function figure(cx, feetY, color, lean = 0) {
  const headR = 34, headY = feetY - 250;
  const bodyTop = headY + headR + 4, bodyBot = feetY - 70, bw = 40;
  return `<g transform="rotate(${lean} ${cx} ${feetY})">
    <path d="M ${cx - bw} ${bodyBot} C ${cx - bw} ${bodyTop + 20}, ${cx - bw + 6} ${bodyTop}, ${cx} ${bodyTop}
             C ${cx + bw - 6} ${bodyTop}, ${cx + bw} ${bodyTop + 20}, ${cx + bw} ${bodyBot}
             L ${cx + 22} ${feetY} L ${cx + 8} ${feetY} L ${cx} ${bodyBot + 10}
             L ${cx - 8} ${feetY} L ${cx - 22} ${feetY} Z" fill="${color}"/>
    <circle cx="${cx}" cy="${headY}" r="${headR}" fill="${color}"/>
  </g>`;
}

// Scène
const AX = 250;            // archer x
const FEET = 720;
const HEART_ARCHER = { x: AX + 26, y: 500 };
const GRIP = { x: 360, y: 512 };     // main qui tient l'arc
const TX = 792;            // cible x
const HEART_TARGET = { x: TX - 22, y: 500 };
const LAUNCH = { x: GRIP.x + 26, y: GRIP.y };
const CTRL = { x: (LAUNCH.x + HEART_TARGET.x) / 2, y: 430 };

const bez = (u, P0, P2) => {
  const a = (1 - u) ** 2, b = 2 * (1 - u) * u, c = u * u;
  return { x: a * P0.x + b * CTRL.x + c * P2.x, y: a * P0.y + b * CTRL.y + c * P2.y };
};
const tanA = (u, P0, P2) => Math.atan2(
  2 * (1 - u) * (CTRL.y - P0.y) + 2 * u * (P2.y - CTRL.y),
  2 * (1 - u) * (CTRL.x - P0.x) + 2 * u * (P2.x - CTRL.x),
);
function tracePath(from, u, P0, P2) {
  let d = `M ${from.x} ${from.y}`;
  const p0 = bez(0, P0, P2);
  d += ` L ${p0.x.toFixed(1)} ${p0.y.toFixed(1)}`;
  for (let i = 1; i <= 20; i++) { const p = bez((u * i) / 20, P0, P2); d += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`; }
  return d;
}

function frameSVG(t) {
  // phases
  const draw = easeInOut(clamp((t - 0.05) / 0.33)); // 0..1
  const held = t >= 0.38 && t < 0.46 ? 1 : draw;
  const released = t >= 0.46;
  const u = released ? easeOut(clamp((t - 0.46) / 0.34)) : 0;
  const flying = released && u < 0.999;
  const hit = released && u >= 0.999;

  const nockX = held < 1 && !released ? GRIP.x - 30 - draw * 78 : GRIP.x - 8;
  const bowTop = { x: GRIP.x + 6, y: GRIP.y - 78 };
  const bowBot = { x: GRIP.x + 6, y: GRIP.y + 78 };
  const nock = { x: released ? GRIP.x + 6 : nockX, y: GRIP.y };

  // arc + corde
  const bow = `
    <path d="M ${bowTop.x} ${bowTop.y} C ${GRIP.x + 70} ${GRIP.y - 40}, ${GRIP.x + 70} ${GRIP.y + 40}, ${bowBot.x} ${bowBot.y}"
      fill="none" stroke="#FBF6EF" stroke-width="8" stroke-linecap="round"/>
    <path d="M ${bowTop.x} ${bowTop.y} L ${nock.x} ${nock.y} L ${bowBot.x} ${bowBot.y}"
      fill="none" stroke="#FBF6EF" stroke-width="4" opacity="0.85"/>`;

  // archer : bras arrière tire vers le nock (avant tir)
  const backArm = !released
    ? `<line x1="${AX + 20}" y1="505" x2="${nock.x}" y2="${nock.y}" stroke="#F2A65A" stroke-width="12" stroke-linecap="round"/>`
    : '';
  const frontArm = `<line x1="${AX + 20}" y1="505" x2="${GRIP.x}" y2="${GRIP.y}" stroke="#F2A65A" stroke-width="12" stroke-linecap="round"/>`;
  const lean = draw * -4 + (released && t < 0.55 ? 3 : 0);

  // flèche
  let arrow = '';
  if (!released) {
    // nockée sur la corde, pointe à droite (bout en cœur)
    const tipX = nock.x + 120;
    arrow = `<line x1="${nock.x}" y1="${nock.y}" x2="${tipX}" y2="${GRIP.y}" stroke="#FBF6EF" stroke-width="6" stroke-linecap="round"/>
             ${heart(tipX, GRIP.y, 2.2, '#E8564B', 90)}`;
  } else if (flying) {
    const p = bez(u, LAUNCH, HEART_TARGET), rad = tanA(u, LAUNCH, HEART_TARGET), ang = (rad * 180) / Math.PI;
    const bx = p.x - Math.cos(rad) * 66, by = p.y - Math.sin(rad) * 66;
    const perp = rad + Math.PI / 2;
    arrow = `<line x1="${bx}" y1="${by}" x2="${p.x}" y2="${p.y}" stroke="#FBF6EF" stroke-width="6" stroke-linecap="round"/>
             <line x1="${bx}" y1="${by}" x2="${bx + Math.cos(perp) * 13}" y2="${by + Math.sin(perp) * 13}" stroke="#FBF6EF" stroke-width="5" stroke-linecap="round"/>
             <line x1="${bx}" y1="${by}" x2="${bx - Math.cos(perp) * 13}" y2="${by - Math.sin(perp) * 13}" stroke="#FBF6EF" stroke-width="5" stroke-linecap="round"/>
             ${heart(p.x, p.y, 2.4, '#E8564B', ang + 90)}`;
  }

  // fil rouge depuis le cœur de l'archer
  let thread = '';
  if (!released) {
    thread = `<path d="M ${HEART_ARCHER.x} ${HEART_ARCHER.y} Q ${(HEART_ARCHER.x + nock.x) / 2} ${GRIP.y + 30}, ${nock.x + 120} ${GRIP.y}" fill="none" stroke="#E8564B" stroke-width="6" stroke-linecap="round" opacity="0.85"/>`;
  } else if (flying) {
    thread = `<path d="${tracePath(HEART_ARCHER, u, LAUNCH, HEART_TARGET)}" fill="none" stroke="#E8564B" stroke-width="7" stroke-linecap="round" opacity="0.9"/>`;
  } else if (hit) {
    thread = `<path d="M ${HEART_ARCHER.x} ${HEART_ARCHER.y} C ${HEART_ARCHER.x + 120} ${GRIP.y + 150}, ${HEART_TARGET.x - 120} ${GRIP.y + 150}, ${HEART_TARGET.x} ${HEART_TARGET.y}" fill="none" stroke="#E8564B" stroke-width="9" stroke-linecap="round"/>`;
  }

  const targetHeartScale = hit ? 2.6 * (1 + 0.3 * pulse(t, 0.80, 0.05)) : 0;
  const archerHeart = heart(HEART_ARCHER.x, HEART_ARCHER.y, 2.2, '#E8564B');
  const targetHeart = hit ? heart(HEART_TARGET.x, HEART_TARGET.y, targetHeartScale, '#EF8C7C') : '';
  const burst = pulse(t, 0.80, 0.05) > 0.4
    ? `<g stroke="#F2A65A" stroke-width="5" stroke-linecap="round" opacity="${pulse(t, 0.80, 0.06).toFixed(2)}">
         <line x1="${HEART_TARGET.x}" y1="${HEART_TARGET.y - 34}" x2="${HEART_TARGET.x}" y2="${HEART_TARGET.y - 54}"/>
         <line x1="${HEART_TARGET.x + 28}" y1="${HEART_TARGET.y - 16}" x2="${HEART_TARGET.x + 46}" y2="${HEART_TARGET.y - 28}"/></g>` : '';
  const textOp = clamp((t - 0.86) / 0.14);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}">
    ${sky}
    ${thread}
    ${figure(AX, FEET, '#F2A65A', lean)}
    ${figure(TX, FEET, '#EF8C7C')}
    ${frontArm}${backArm}${bow}${archerHeart}${targetHeart}${burst}${arrow}
    <text x="512" y="800" text-anchor="middle" font-family="Georgia, serif" font-size="118" font-weight="700" fill="#FBF6EF" opacity="${textOp.toFixed(2)}">Fil</text>
  </svg>`;
}

if (process.argv[2] === 'check') {
  for (const t of [0.28, 0.6, 1.0]) {
    fs.writeFileSync(`/tmp/a_${Math.round(t * 100)}.png`, new Resvg(frameSVG(t), { fitTo: { mode: 'width', value: OUT } }).render().asPng());
  }
  console.log('checks ok');
} else {
  const gif = GIFEncoder();
  const N = 78, frames = [];
  for (let i = 0; i < N; i++) frames.push(i / (N - 1));
  for (let k = 0; k < 16; k++) frames.push(1);
  for (const t of frames) {
    const r = new Resvg(frameSVG(t), { fitTo: { mode: 'width', value: OUT } }).render();
    const data = new Uint8Array(r.pixels.buffer, r.pixels.byteOffset, r.pixels.length);
    const palette = quantize(data, 256);
    gif.writeFrame(applyPalette(data, palette), r.width, r.height, { palette, delay: 40 });
  }
  gif.finish();
  fs.writeFileSync('/tmp/splash_anim.gif', Buffer.from(gif.bytes()));
  console.log('GIF', frames.length, 'frames');
}
