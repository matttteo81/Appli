/**
 * Crée un vrai GIF animé à partir de photos de la galerie, entièrement sur
 * le téléphone (aucun service externe → marche partout, même en Chine).
 * Les photos sont réduites, décodées en pixels, puis encodées en GIF.
 */
import * as ImageManipulator from 'expo-image-manipulator';
import { decode as b64decode } from 'base64-arraybuffer';
import jpeg from 'jpeg-js';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

const SIZE = 240;

export async function makeGifFromPhotos(
  uris: string[],
  delayMs = 500,
): Promise<Uint8Array> {
  const enc = GIFEncoder();
  for (const uri of uris) {
    // 1) Réduire à un carré 240×240 en JPEG (rapide + cadres uniformes).
    const out = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: SIZE, height: SIZE } }],
      { base64: true, compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
    );
    if (!out.base64) continue;
    // 2) Décoder le JPEG en pixels RGBA.
    const bytes = new Uint8Array(b64decode(out.base64));
    const { data, width, height } = jpeg.decode(bytes, {
      useTArray: true,
      formatAsRGBA: true,
    });
    // 3) Ajouter la frame au GIF.
    const palette = quantize(data, 256, { format: 'rgba4444' });
    const index = applyPalette(data, palette, 'rgba4444');
    enc.writeFrame(index, width, height, { palette, delay: delayMs });
  }
  enc.finish();
  return enc.bytes();
}
