/** Calcul de distance entre deux points GPS (formule de Haversine), en km. */
export function distanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371; // rayon de la Terre en km
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Heure locale (HH:MM) dans un fuseau horaire IANA donné. */
export function localTime(timezone: string, date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
      hour12: false,
    }).format(date);
  } catch {
    return '--:--';
  }
}

/** Heure (0-23) dans un fuseau horaire IANA donné. */
export function localHour(timezone: string, date = new Date()): number {
  try {
    const s = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      hour12: false,
      timeZone: timezone,
    }).format(date);
    const h = parseInt(s, 10);
    return Number.isNaN(h) ? date.getHours() : h % 24;
  } catch {
    return date.getHours();
  }
}
