/**
 * Convertit une chaîne base64 (fournie par le sélecteur de photos) en octets
 * bruts (Uint8Array), pour l'envoyer à Supabase Storage. On l'écrit « à la
 * main » pour ne dépendre d'aucune librairie externe.
 */
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const LOOKUP = (() => {
  const table = new Uint8Array(256);
  for (let i = 0; i < CHARS.length; i++) {
    table[CHARS.charCodeAt(i)] = i;
  }
  return table;
})();

export function base64ToUint8Array(base64: string): Uint8Array {
  // On enlève un éventuel préfixe « data:image/...;base64, ».
  const clean = base64.includes(',') ? base64.slice(base64.indexOf(',') + 1) : base64;

  let bufferLength = clean.length * 0.75;
  const len = clean.length;
  if (clean[len - 1] === '=') {
    bufferLength--;
    if (clean[len - 2] === '=') bufferLength--;
  }

  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const e1 = LOOKUP[clean.charCodeAt(i)];
    const e2 = LOOKUP[clean.charCodeAt(i + 1)];
    const e3 = LOOKUP[clean.charCodeAt(i + 2)];
    const e4 = LOOKUP[clean.charCodeAt(i + 3)];

    bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (p < bufferLength) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (p < bufferLength) bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
  }
  return bytes;
}
