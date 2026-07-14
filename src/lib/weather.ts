/**
 * Météo actuelle via l'API Open-Meteo (gratuite, sans clé, mondiale).
 * Renvoie aussi le fuseau horaire IANA déduit des coordonnées.
 */
export type Weather = {
  temp: number;
  emoji: string;
  label: string;
  timezone: string;
};

export async function fetchWeather(
  lat: number,
  lng: number,
): Promise<Weather | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,weather_code&timezone=auto`;
    const res = await fetch(url);
    const json = await res.json();
    const code = json?.current?.weather_code ?? 0;
    const info = codeInfo(code);
    return {
      temp: Math.round(json?.current?.temperature_2m ?? 0),
      emoji: info.emoji,
      label: info.label,
      timezone: json?.timezone ?? 'UTC',
    };
  } catch {
    return null;
  }
}

/** Correspondance code météo WMO → emoji + description (français). */
export function codeInfo(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: '☀️', label: 'Dégagé' };
  if (code === 1) return { emoji: '🌤️', label: 'Peu nuageux' };
  if (code === 2) return { emoji: '⛅', label: 'Partiellement nuageux' };
  if (code === 3) return { emoji: '☁️', label: 'Couvert' };
  if (code === 45 || code === 48) return { emoji: '🌫️', label: 'Brouillard' };
  if (code >= 51 && code <= 57) return { emoji: '🌦️', label: 'Bruine' };
  if (code >= 61 && code <= 67) return { emoji: '🌧️', label: 'Pluie' };
  if (code >= 71 && code <= 77) return { emoji: '🌨️', label: 'Neige' };
  if (code >= 80 && code <= 82) return { emoji: '🌦️', label: 'Averses' };
  if (code >= 85 && code <= 86) return { emoji: '🌨️', label: 'Averses de neige' };
  if (code >= 95) return { emoji: '⛈️', label: 'Orage' };
  return { emoji: '🌡️', label: '' };
}
