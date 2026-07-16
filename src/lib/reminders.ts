import * as Notifications from 'expo-notifications';
import type { CoupleEvent } from '../types/db';

/**
 * (Re)programme les rappels locaux pour les événements de l'agenda.
 * Appelé à l'ouverture de l'agenda : on efface les anciens rappels
 * et on reprogramme tous les événements futurs. Chaque téléphone
 * programme ses propres rappels (l'app ne planifie aucune autre
 * notification locale, donc tout effacer est sans risque).
 */
export async function syncEventReminders(events: CoupleEvent[]) {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = Date.now();
    for (const e of events) {
      const when = eventReminderDate(e);
      if (!when || when.getTime() <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${e.emoji} ${e.title}`,
          body: e.event_time ? `C'est à ${e.event_time} 💛` : "C'est aujourd'hui 💛",
          data: { type: 'event', id: e.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
      });
    }
  } catch {
    // silencieux : les rappels sont un bonus
  }
}

/** Moment du rappel : l'heure de l'événement, ou 9 h le jour même. */
function eventReminderDate(e: CoupleEvent): Date | null {
  const [y, m, d] = e.event_date.split('-').map(Number);
  if (!y || !m || !d) return null;
  let hh = 9;
  let mm = 0;
  if (e.event_time) {
    const parts = e.event_time.split(':').map(Number);
    if (parts.length === 2 && !Number.isNaN(parts[0])) {
      hh = parts[0];
      mm = parts[1] || 0;
    }
  }
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}
