/** Petits mots doux « du jour » — choisis de façon stable selon la date. */
const WORDS = [
  'Chaque jour loin de toi me rapproche du prochain câlin. 💛',
  'La distance n’est qu’un fil ; l’amour, c’est le nœud.',
  'Quelque part, sous le même ciel, on pense l’un à l’autre. 🌙',
  'Un jour de plus ensemble, même à des milliers de kilomètres.',
  'Ton sourire vaut tous les fuseaux horaires du monde. 😊',
  'On compte les jours, pas pour qu’ils passent, mais pour se retrouver. ⏳',
  'Le cœur n’a pas de kilomètres. 💞',
  'Aujourd’hui encore, je choisis toi.',
  'Nos deux villes, un seul « nous ». 🏡',
  'Prends soin de toi — quelqu’un t’aime très fort d’ici. 🤍',
  'Même à distance, tu es mon chez-moi.',
  'Une pensée pour toi, comme chaque matin. ☀️',
];

/** Salutation selon l'heure locale. */
export function greeting(hour = new Date().getHours()): string {
  if (hour < 6) return 'Encore debout';
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

/** Le mot du jour, identique toute la journée (change chaque jour). */
export function wordOfTheDay(d = new Date()): string {
  const dayIndex = Math.floor(d.getTime() / 86400000);
  return WORDS[dayIndex % WORDS.length];
}
