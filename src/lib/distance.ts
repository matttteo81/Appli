/**
 * Calcul de la distance entre deux points sur Terre (formule de Haversine).
 * On l'utilise pour l'écran d'accueil et la carte : « X km nous séparent ».
 */

export type LatLng = { latitude: number; longitude: number };

const R = 6371; // rayon moyen de la Terre, en km

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Distance en kilomètres entre deux coordonnées. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Affichage joli : « 8 452 km » (espace insécable pour les milliers). */
export function formatKm(km: number): string {
  const rounded = Math.round(km);
  return `${rounded.toLocaleString('fr-FR')} km`;
}
