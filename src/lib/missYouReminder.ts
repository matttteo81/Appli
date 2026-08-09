import * as Notifications from 'expo-notifications';

/**
 * Rappel doux local : « ça fait 2 jours qu'on ne s'est pas écrit ».
 * Reprogrammé à chaque fois que la liste des messages change (donc l'horloge
 * repart à zéro dès qu'un message est envoyé/reçu). Programmé sur CE téléphone,
 * il se déclenche même app fermée. Aucun serveur requis.
 */
const ID = 'missyou';
const DELAY_MS = 2 * 86400000; // 2 jours

export async function scheduleMissYouReminder(lastMessageAt: Date | null, partnerName?: string | null) {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    await Notifications.cancelScheduledNotificationAsync(ID).catch(() => {});
    const base = lastMessageAt ? lastMessageAt.getTime() : Date.now();
    const when = new Date(base + DELAY_MS);
    // On ne programme que si c'est dans le futur (pas de rappel « en retard »).
    if (when.getTime() <= Date.now() + 60000) return;
    await Notifications.scheduleNotificationAsync({
      identifier: ID,
      content: {
        title: 'Fil 💛',
        body: partnerName
          ? `Ça fait deux jours… un petit mot à ${partnerName} ?`
          : 'Ça fait deux jours… envoie un petit mot doux ?',
        data: { type: 'missyou' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
  } catch {
    // silencieux : c'est un bonus
  }
}
