/**
 * Banque de « questions du jour ». La même question s'affiche pour les deux
 * partenaires, choisie de façon déterministe selon la date (donc identique
 * sur les deux téléphones, sans base de données).
 */
export const DAILY_QUESTIONS: string[] = [
  'Quel est ton souvenir préféré de nous deux ?',
  'Qu’est-ce qui t’a fait sourire aujourd’hui ?',
  'Si on pouvait se téléporter n’importe où là, tu choisirais quoi ?',
  'Quelle est la première chose que tu remarques chez moi ?',
  'Quel petit détail de moi te manque le plus ?',
  'Décris ta journée idéale avec moi.',
  'Quelle chanson te fait penser à nous ?',
  'Qu’est-ce que tu as hâte de faire ensemble à nos retrouvailles ?',
  'Quel est ton rêve pour nous dans 5 ans ?',
  'Qu’est-ce qui t’a rendu fier·e de toi cette semaine ?',
  'Quel plat aimerais-tu qu’on cuisine ensemble ?',
  'Quelle est ta qualité que tu préfères chez moi ?',
  'Raconte-moi un moment où tu t’es senti·e vraiment aimé·e.',
  'Si tu devais me résumer en trois mots, lesquels ?',
  'Quel est ton endroit préféré au monde ?',
  'Qu’est-ce qui te rassure quand tu es loin de moi ?',
  'Quelle nouvelle habitude aimerais-tu qu’on prenne à deux ?',
  'Quel film pourrais-tu revoir cent fois avec moi ?',
  'Qu’est-ce que tu admires le plus chez moi ?',
  'Quel a été le meilleur moment de ta journée ?',
  'Si on avait un week-end en surprise, tu voudrais faire quoi ?',
  'Quelle est ta manière préférée de recevoir de l’amour ?',
  'Quel petit geste de ma part te touche le plus ?',
  'De quoi es-tu le plus reconnaissant·e aujourd’hui ?',
  'Quel voyage rêverais-tu de faire avec moi ?',
  'Qu’est-ce qui te fait te sentir proche de moi malgré la distance ?',
  'Quelle est la chose la plus folle que tu ferais par amour ?',
  'Quel surnom aimerais-tu que je te donne ?',
  'Quel est ton moment de la journée préféré pour penser à moi ?',
  'Qu’est-ce que tu veux qu’on n’oublie jamais de faire ensemble ?',
  'Quelle saison te rappelle le plus notre histoire ?',
  'Qu’est-ce qui t’a séduit·e en premier chez moi ?',
  'Si tu pouvais me préparer une surprise, ce serait quoi ?',
  'Quel est ton petit bonheur simple du moment ?',
  'Comment te sens-tu, vraiment, aujourd’hui ?',
  'Quel projet aimerais-tu qu’on réalise à deux ?',
  'Quelle photo de nous préfères-tu, et pourquoi ?',
  'Qu’est-ce que tu ferais si j’étais dans tes bras là, maintenant ?',
  'Quel est ton plus grand espoir pour nous ?',
  'Qu’est-ce que je fais qui te fait rire à tous les coups ?',
];

/** Nombre de jours depuis une date de référence, pour tourner chaque jour. */
function dayIndex(date = new Date()): number {
  const start = Date.UTC(2024, 0, 1);
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((today - start) / 86400000);
}

/** La question du jour (identique pour les deux partenaires). */
export function questionForToday(date = new Date()): {
  text: string;
  dateKey: string;
} {
  const idx = ((dayIndex(date) % DAILY_QUESTIONS.length) + DAILY_QUESTIONS.length) %
    DAILY_QUESTIONS.length;
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
  return { text: DAILY_QUESTIONS[idx], dateKey };
}
