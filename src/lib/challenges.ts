/**
 * Défis photo du jour. Le même défi s'affiche pour les deux partenaires,
 * choisi de façon déterministe selon la date (identique sur les deux
 * téléphones, sans base de données). Chacun y répond par une photo.
 */
export const PHOTO_CHALLENGES: string[] = [
  'Ton petit-déjeuner de ce matin ☕',
  'Le ciel au-dessus de toi, là, maintenant 🌤️',
  'Un objet qui te rend heureux·se 💛',
  'Ce que tu vois quand tu lèves les yeux 👀',
  'Ta tenue du jour 👕',
  'Quelque chose qui t’a fait sourire aujourd’hui 😊',
  'Ton coin préféré chez toi 🛋️',
  'Ce que tu bois là tout de suite 🥤',
  'La vue depuis ta fenêtre 🪟',
  'Un truc de ta couleur préférée 🎨',
  'Ton repas du midi 🍽️',
  'Quelque chose de mignon que tu croises 🐾',
  'Tes pieds / tes chaussures d’aujourd’hui 👟',
  'Un endroit où tu aimerais qu’on aille ensemble ✈️',
  'Ce qu’il y a dans ta main droite ✋',
  'Ton dessert du jour 🍰',
  'Une lumière qui te plaît 💡',
  'Quelque chose de vieux à côté de toi 🕰️',
  'Ton reflet quelque part 🪞',
  'La dernière chose que tu as achetée 🛍️',
  'Un petit bonheur de ta journée 🌈',
  'Ce que tu regardes ce soir 📺',
  'Une plante ou une fleur près de toi 🌿',
  'Ton lieu de travail / d’étude 💻',
  'Quelque chose qui te fait penser à moi 💭',
  'Le plat que tu aimerais qu’on cuisine ensemble 🍳',
  'Ton animal ou une peluche 🧸',
  'La rue devant chez toi 🏙️',
  'Ce que tu écoutes en ce moment 🎧',
  'Un selfie tout simple 🤳',
];

/** Nombre de jours depuis une date de référence, pour tourner chaque jour. */
function dayIndex(date = new Date()): number {
  const start = Date.UTC(2024, 0, 1);
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((today - start) / 86400000);
}

/** Le défi photo du jour (identique pour les deux partenaires). */
export function challengeForToday(date = new Date()): {
  text: string;
  dateKey: string;
} {
  const idx =
    ((dayIndex(date) % PHOTO_CHALLENGES.length) + PHOTO_CHALLENGES.length) %
    PHOTO_CHALLENGES.length;
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
  return { text: PHOTO_CHALLENGES[idx], dateKey };
}
