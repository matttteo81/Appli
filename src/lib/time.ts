/**
 * Tout ce qui touche à l'heure locale d'un fuseau horaire donné, et à la
 * « phase du ciel » (aube / jour / crépuscule / nuit) pour le bandeau
 * « ciel jumeau » de l'écran d'accueil.
 *
 * On s'appuie sur `Intl.DateTimeFormat`, disponible nativement sur iOS. Sur
 * Android, un build récent d'Expo le gère aussi. En dernier recours, si un
 * fuseau n'est pas reconnu, on retombe sur l'heure du téléphone.
 */
import { Palette } from '@/constants/theme';

export type SkyPhase = 'aube' | 'jour' | 'crepuscule' | 'nuit';

export type SkyLook = {
  phase: SkyPhase;
  label: string;
  emoji: string;
  /** Dégradé du haut vers le bas (2 à 3 couleurs). */
  gradient: [string, string, ...string[]];
  /** Couleur du texte lisible par-dessus ce dégradé. */
  textColor: string;
};

/** Renvoie l'heure (0–23) dans un fuseau horaire donné. */
export function hourInTimezone(timezone: string, date: Date = new Date()): number {
  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      hour12: false,
    }).format(date);
    // "24" peut apparaître à minuit selon les plateformes → on ramène à 0.
    const h = parseInt(formatted, 10) % 24;
    return Number.isNaN(h) ? date.getHours() : h;
  } catch {
    return date.getHours();
  }
}

/** Heure formatée « 14:05 » dans un fuseau horaire donné. */
export function timeInTimezone(timezone: string, date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }
}

/** Détermine la phase du ciel à partir de l'heure (0–23). */
export function phaseForHour(hour: number): SkyPhase {
  if (hour >= 5 && hour < 8) return 'aube';
  if (hour >= 8 && hour < 18) return 'jour';
  if (hour >= 18 && hour < 21) return 'crepuscule';
  return 'nuit';
}

/** L'apparence complète (dégradé, emoji, libellé) pour un fuseau donné. */
export function skyLookForTimezone(timezone: string, date: Date = new Date()): SkyLook {
  return skyLookForPhase(phaseForHour(hourInTimezone(timezone, date)));
}

export function skyLookForPhase(phase: SkyPhase): SkyLook {
  switch (phase) {
    case 'aube':
      return {
        phase,
        label: 'Aube',
        emoji: '🌅',
        gradient: ['#F2A65A', '#EF8C7C', '#FBD9B8'],
        textColor: Palette.encre,
      };
    case 'jour':
      return {
        phase,
        label: 'Jour',
        emoji: '☀️',
        gradient: ['#8EC5E8', '#BFE0F2', '#FBF6EF'],
        textColor: Palette.encre,
      };
    case 'crepuscule':
      return {
        phase,
        label: 'Crépuscule',
        emoji: '🌆',
        gradient: ['#4A3B6B', '#EF8C7C', '#F2A65A'],
        textColor: Palette.blanc,
      };
    case 'nuit':
    default:
      return {
        phase: 'nuit',
        label: 'Nuit',
        emoji: '🌙',
        gradient: ['#12122B', '#1B1B3A', '#4A3B6B'],
        textColor: Palette.blanc,
      };
  }
}

/**
 * Décompose une durée (en millisecondes) en jours / heures / minutes / secondes.
 * Utile pour le compte à rebours des retrouvailles.
 */
export function breakdownDuration(ms: number) {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, isPast: clamped === 0 };
}
