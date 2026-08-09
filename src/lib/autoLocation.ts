import * as Location from 'expo-location';
import { fetchWeather } from './weather';
import { distanceKm } from './geo';
import type { Profile } from '../types/db';

/**
 * Met à jour la position exacte du profil si l'utilisateur a autorisé la
 * localisation. Appelée à l'ouverture de l'app et à chaque retour au premier
 * plan : si la personne a changé de ville, sa position (et donc la distance,
 * la météo et la carte) se met à jour automatiquement.
 *
 * - Ne demande JAMAIS la permission ici (silencieux) : on ne fait rien si
 *   elle n'a pas déjà été accordée. La demande se fait via le bouton dédié
 *   dans la carte ou l'interrupteur des réglages.
 * - Seuil de 2 km : on n'écrit rien si la personne n'a quasiment pas bougé,
 *   pour éviter des mises à jour et des appels réseau inutiles.
 */
export async function refreshMyLocation(
  profile: Profile,
  updateProfile: (patch: Partial<Profile>) => Promise<void>,
) {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) return;

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = pos.coords;

    // Rien à faire si on n'a quasiment pas bougé (< 2 km).
    if (
      profile.city_lat != null &&
      profile.city_lng != null &&
      distanceKm(profile.city_lat, profile.city_lng, latitude, longitude) < 2
    ) {
      return;
    }

    let cityName = profile.city_name ?? 'Ma position';
    try {
      const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
      const g = geo[0];
      if (g) cityName = [g.city ?? g.subregion, g.country].filter(Boolean).join(', ');
    } catch {}

    let timezone = profile.timezone ?? null;
    try {
      const w = await fetchWeather(latitude, longitude);
      if (w?.timezone) timezone = w.timezone;
    } catch {}

    await updateProfile({
      city_name: cityName,
      city_lat: latitude,
      city_lng: longitude,
      timezone,
    });
  } catch {
    // silencieux : on réessaiera au prochain passage au premier plan.
  }
}
