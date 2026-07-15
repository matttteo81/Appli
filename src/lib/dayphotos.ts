/**
 * « La journée à deux » : chaque jour, sept moments à immortaliser, chacun
 * de son côté. Les photos sont taguées `AAAA-MM-JJ#clé` dans photos.challenge.
 */
export type DaySlot = { key: string; label: string; emoji: string };

export const DAY_SLOTS: DaySlot[] = [
  { key: 'matin', label: 'Le matin', emoji: '🌅' },
  { key: 'petitdej', label: 'Petit-déjeuner', emoji: '☕' },
  { key: 'act_matin', label: 'Activité du matin', emoji: '🏃' },
  { key: 'dejeuner', label: 'Déjeuner', emoji: '🍽️' },
  { key: 'act_aprem', label: "Activité de l'après-midi", emoji: '🎨' },
  { key: 'diner', label: 'Dîner', emoji: '🍷' },
  { key: 'soir', label: 'Le soir', emoji: '🌙' },
];

/** Clé du jour au format AAAA-MM-JJ. */
export function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

/** Tag stocké dans photos.challenge pour un créneau donné. */
export function slotTag(slotKey: string, date = new Date()): string {
  return `${todayKey(date)}#${slotKey}`;
}
