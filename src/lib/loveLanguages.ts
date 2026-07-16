/**
 * Les 5 langages de l'amour + un mini-quiz à choix forcé.
 * Chaque réponse pointe vers un langage ; on compte les points pour
 * dresser le profil de chacun, puis on compare les deux partenaires.
 */

export type Lang = 'words' | 'time' | 'gifts' | 'service' | 'touch';

export const LANGS: Record<
  Lang,
  { emoji: string; label: string; color: string; desc: string; tip: string }
> = {
  words: {
    emoji: '💬',
    label: 'Les mots qui touchent',
    color: '#EF8C7C',
    desc: 'Un compliment, un « je t’aime », un message doux te réchauffent le cœur.',
    tip: 'Envoie-lui un petit mot sincère, sans raison.',
  },
  time: {
    emoji: '⏳',
    label: 'Les moments ensemble',
    color: '#A8C3A0',
    desc: 'Ce qui compte, c’est le temps partagé, l’attention pleine et entière.',
    tip: 'Bloquez un appel rien qu’à vous, sans écran à côté.',
  },
  gifts: {
    emoji: '🎁',
    label: 'Les petites attentions',
    color: '#F2A65A',
    desc: 'Un cadeau, même minuscule, te dit « j’ai pensé à toi ».',
    tip: 'Envoie-lui une surprise, une photo, un colis-souvenir.',
  },
  service: {
    emoji: '🤝',
    label: 'Les gestes qui aident',
    color: '#7FB0E0',
    desc: 'Quand on te facilite la vie, tu te sens aimé(e) et soutenu(e).',
    tip: 'Propose-lui de régler un truc pénible à sa place.',
  },
  touch: {
    emoji: '🤗',
    label: 'La tendresse physique',
    color: '#C58BC0',
    desc: 'Un câlin, une main tenue, la proximité valent mille mots.',
    tip: 'Prévoyez le prochain vrai câlin — comptez les jours ensemble.',
  },
};

export const LANG_ORDER: Lang[] = ['words', 'time', 'gifts', 'service', 'touch'];

type Option = { text: string; lang: Lang };
export const LOVE_QUESTIONS: { a: Option; b: Option }[] = [
  {
    a: { text: 'Recevoir un message « je pense à toi »', lang: 'words' },
    b: { text: 'Passer une soirée rien que tous les deux', lang: 'time' },
  },
  {
    a: { text: 'Trouver un petit cadeau surprise', lang: 'gifts' },
    b: { text: 'Qu’on s’occupe d’une corvée à ma place', lang: 'service' },
  },
  {
    a: { text: 'Un long câlin sans rien dire', lang: 'touch' },
    b: { text: 'Un compliment sincère et précis', lang: 'words' },
  },
  {
    a: { text: 'Une activité qu’on fait ensemble', lang: 'time' },
    b: { text: 'Un objet qui me rappelle l’autre', lang: 'gifts' },
  },
  {
    a: { text: 'Qu’on m’aide sans que je demande', lang: 'service' },
    b: { text: 'Se blottir l’un contre l’autre', lang: 'touch' },
  },
  {
    a: { text: 'Entendre « je suis fier(e) de toi »', lang: 'words' },
    b: { text: 'Ouvrir un paquet avec mon nom dessus', lang: 'gifts' },
  },
  {
    a: { text: 'Une vraie conversation sans distractions', lang: 'time' },
    b: { text: 'Se tenir la main en marchant', lang: 'touch' },
  },
  {
    a: { text: 'Qu’on prépare une chose pénible pour moi', lang: 'service' },
    b: { text: 'Un mot doux écrit à la main', lang: 'words' },
  },
  {
    a: { text: 'Une attention pensée juste pour moi', lang: 'gifts' },
    b: { text: 'Un baiser en se disant bonjour', lang: 'touch' },
  },
  {
    a: { text: 'Cuisiner ou regarder un film ensemble', lang: 'time' },
    b: { text: 'Qu’on gère un souci à ma place', lang: 'service' },
  },
  {
    a: { text: 'Un câlin quand je rentre', lang: 'touch' },
    b: { text: 'Une petite surprise emballée', lang: 'gifts' },
  },
  {
    a: { text: 'Qu’on me dise à quel point je compte', lang: 'words' },
    b: { text: 'Qu’on me rende un vrai service', lang: 'service' },
  },
  {
    a: { text: 'Du temps de qualité, sans montre', lang: 'time' },
    b: { text: 'Des mots d’encouragement au bon moment', lang: 'words' },
  },
  {
    a: { text: 'Qu’on anticipe mes besoins par des gestes', lang: 'service' },
    b: { text: 'Un cadeau qui montre qu’on me connaît', lang: 'gifts' },
  },
  {
    a: { text: 'Être enlacé(e) longtemps', lang: 'touch' },
    b: { text: 'Une parenthèse à deux, loin du reste', lang: 'time' },
  },
];

/** Transforme les réponses (langage choisi par question) en scores 0-100. */
export function scoreProfile(answers: Lang[]): Record<Lang, number> {
  const counts: Record<Lang, number> = { words: 0, time: 0, gifts: 0, service: 0, touch: 0 };
  for (const l of answers) counts[l]++;
  const total = answers.length || 1;
  const out = {} as Record<Lang, number>;
  for (const l of LANG_ORDER) out[l] = Math.round((counts[l] / total) * 100);
  return out;
}

export function topLang(profile: Record<Lang, number>): Lang {
  return LANG_ORDER.reduce((best, l) => (profile[l] > profile[best] ? l : best), LANG_ORDER[0]);
}
