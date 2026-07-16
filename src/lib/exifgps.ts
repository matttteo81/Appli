/**
 * Extrait la position (lat/lng) d'une photo à partir de ses métadonnées EXIF.
 * Les clés varient selon iOS/Android/versions : on couvre les cas courants.
 * Renvoie null si la photo n'a pas de coordonnées GPS.
 */
export function gpsFromExif(exif: any): { lat: number; lng: number } | null {
  if (!exif) return null;

  // Cas « à plat » : GPSLatitude / GPSLongitude (+ Ref N/S/E/W)
  const flatLat = num(exif.GPSLatitude ?? exif.gpsLatitude);
  const flatLng = num(exif.GPSLongitude ?? exif.gpsLongitude);
  if (flatLat != null && flatLng != null) {
    const latRef = String(exif.GPSLatitudeRef ?? exif.gpsLatitudeRef ?? 'N').toUpperCase();
    const lngRef = String(exif.GPSLongitudeRef ?? exif.gpsLongitudeRef ?? 'E').toUpperCase();
    const lat = latRef === 'S' ? -Math.abs(flatLat) : Math.abs(flatLat);
    const lng = lngRef === 'W' ? -Math.abs(flatLng) : Math.abs(flatLng);
    if (valid(lat, lng)) return { lat, lng };
  }

  // Cas objet imbriqué : exif.GPS = { Latitude, Longitude, ... } ou {GPS}
  const gps = exif.GPS ?? exif['{GPS}'] ?? exif.gps;
  if (gps) {
    const lat0 = num(gps.Latitude ?? gps.latitude);
    const lng0 = num(gps.Longitude ?? gps.longitude);
    if (lat0 != null && lng0 != null) {
      const latRef = String(gps.LatitudeRef ?? 'N').toUpperCase();
      const lngRef = String(gps.LongitudeRef ?? 'E').toUpperCase();
      const lat = latRef === 'S' ? -Math.abs(lat0) : Math.abs(lat0);
      const lng = lngRef === 'W' ? -Math.abs(lng0) : Math.abs(lng0);
      if (valid(lat, lng)) return { lat, lng };
    }
  }
  return null;
}

function num(v: any): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return typeof n === 'number' && !Number.isNaN(n) ? n : null;
}
function valid(lat: number, lng: number) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !(lat === 0 && lng === 0);
}
