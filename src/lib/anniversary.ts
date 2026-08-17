import * as Notifications from 'expo-notifications';

/**
 * Anniversaires de couple : « mensiversaires » (chaque mois, le jour de mise en
 * couple) et anniversaires annuels. Tout est dérivé de `together_since` —
 * aucune base de données requise.
 */

export type Milestone = {
  kind: 'year' | 'month';
  count: number;
  label: string; // ex. « 8 mois ensemble », « 2 ans ensemble »
};

function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate(); // m : 0-indexé
}

/** Renvoie le palier atteint AUJOURD'HUI, ou null. */
export function getTodayMilestone(sinceStr?: string | null): Milestone | null {
  if (!sinceStr) return null;
  const since = new Date(sinceStr + 'T00:00:00');
  if (isNaN(since.getTime())) return null;
  const now = new Date();
  const sy = since.getFullYear(), sm = since.getMonth(), sd = since.getDate();
  const ny = now.getFullYear(), nm = now.getMonth(), nd = now.getDate();

  // Jour effectif ce mois-ci (gère les fins de mois : le 31 → dernier jour).
  const eff = Math.min(sd, daysInMonth(ny, nm));
  if (nd !== eff) return null;

  const months = (ny - sy) * 12 + (nm - sm);
  if (months <= 0) return null;

  if (months % 12 === 0) {
    const years = months / 12;
    return { kind: 'year', count: years, label: `${years} an${years > 1 ? 's' : ''} ensemble` };
  }
  return { kind: 'month', count: months, label: `${months} mois ensemble` };
}

/** Date du PROCHAIN mensiversaire (à 9 h), pour programmer la notification. */
function nextMilestoneDate(since: Date): Date {
  const sd = since.getDate();
  const now = new Date();
  const cand = (y: number, m: number) =>
    new Date(y, m, Math.min(sd, daysInMonth(y, m)), 9, 0, 0);
  let y = now.getFullYear(), m = now.getMonth();
  let d = cand(y, m);
  if (d.getTime() <= Date.now() + 60000) {
    m += 1;
    if (m > 11) { m = 0; y += 1; }
    d = cand(y, m);
  }
  return d;
}

const NOTIF_ID = 'anniversary';

/** Programme (sur ce téléphone) une notification pour le prochain palier. */
export async function scheduleAnniversaryNotification(
  sinceStr?: string | null,
  partnerName?: string | null,
) {
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID).catch(() => {});
    if (!sinceStr) return;
    const since = new Date(sinceStr + 'T00:00:00');
    if (isNaN(since.getTime())) return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const when = nextMilestoneDate(since);
    const months = (when.getFullYear() - since.getFullYear()) * 12 + (when.getMonth() - since.getMonth());
    if (months <= 0) return;
    const isYear = months % 12 === 0;
    const label = isYear
      ? `${months / 12} an${months / 12 > 1 ? 's' : ''}`
      : `${months} mois`;
    const withWhom = partnerName ? ` avec ${partnerName}` : '';

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID,
      content: {
        title: isYear ? '🎉 Joyeux anniversaire !' : '💞 Joyeux mensiversaire !',
        body: `Aujourd'hui, ça fait ${label} ensemble${withWhom} 💛`,
        data: { type: 'anniversary' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
  } catch {
    // silencieux : c'est un bonus
  }
}
