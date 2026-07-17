/**
 * Langues proposées dans Lingo (échange linguistique).
 * Le `code` est un identifiant court (ISO 639-1 quand il existe) stocké en base.
 */
export type Language = {
  code: string;
  name: string; // nom en français
  native: string; // endonyme (nom dans la langue)
  flag: string; // emoji drapeau représentatif
};

export const LANGUAGES: Language[] = [
  { code: 'fr', name: 'Français', native: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'Anglais', native: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Espagnol', native: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Allemand', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italien', native: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portugais', native: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russe', native: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinois', native: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japonais', native: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Coréen', native: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabe', native: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'nl', name: 'Néerlandais', native: 'Nederlands', flag: '🇳🇱' },
  { code: 'sv', name: 'Suédois', native: 'Svenska', flag: '🇸🇪' },
  { code: 'pl', name: 'Polonais', native: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Turc', native: 'Türkçe', flag: '🇹🇷' },
  { code: 'el', name: 'Grec', native: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'he', name: 'Hébreu', native: 'עברית', flag: '🇮🇱' },
  { code: 'th', name: 'Thaï', native: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamien', native: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', name: 'Indonésien', native: 'Bahasa', flag: '🇮🇩' },
  { code: 'uk', name: 'Ukrainien', native: 'Українська', flag: '🇺🇦' },
];

const BY_CODE: Record<string, Language> = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, l]),
);

export function getLanguage(code: string): Language | undefined {
  return BY_CODE[code];
}

export function languageName(code: string): string {
  return BY_CODE[code]?.name ?? code.toUpperCase();
}

export function languageFlag(code: string): string {
  return BY_CODE[code]?.flag ?? '🏳️';
}

/** Niveaux d'apprentissage (1 → 5). */
export type LangLevel = 1 | 2 | 3 | 4 | 5;

export const LEVELS: { value: LangLevel; label: string; dots: string }[] = [
  { value: 1, label: 'Débutant·e', dots: '●○○○○' },
  { value: 2, label: 'Élémentaire', dots: '●●○○○' },
  { value: 3, label: 'Intermédiaire', dots: '●●●○○' },
  { value: 4, label: 'Avancé·e', dots: '●●●●○' },
  { value: 5, label: 'Courant·e', dots: '●●●●●' },
];

export function levelLabel(level: number): string {
  return LEVELS.find((l) => l.value === level)?.label ?? '—';
}

export function levelDots(level: number): string {
  return LEVELS.find((l) => l.value === level)?.dots ?? '○○○○○';
}

/** Une langue en cours d'apprentissage (avec son niveau). */
export type LearningLang = { code: string; level: LangLevel };

/**
 * Score de complémentarité entre « moi » et un partenaire, façon tandem :
 * idéal si le partenaire parle nativement ce que j'apprends
 * ET si le partenaire apprend une de mes langues natives.
 * Renvoie un score (0-2) + les langues concernées.
 */
export function tandemMatch(
  myNative: string[],
  myLearning: LearningLang[],
  theirNative: string[],
  theirLearning: LearningLang[],
): { score: number; theyTeach: string[]; iTeach: string[] } {
  const myLearningCodes = myLearning.map((l) => l.code);
  const theirLearningCodes = theirLearning.map((l) => l.code);

  // Ce qu'ils peuvent m'enseigner : leur langue native ∈ ce que j'apprends.
  const theyTeach = theirNative.filter((c) => myLearningCodes.includes(c));
  // Ce que je peux leur enseigner : ma langue native ∈ ce qu'ils apprennent.
  const iTeach = myNative.filter((c) => theirLearningCodes.includes(c));

  let score = 0;
  if (theyTeach.length > 0) score += 1;
  if (iTeach.length > 0) score += 1;
  return { score, theyTeach, iTeach };
}

export const AVATAR_EMOJIS = [
  '🙂', '😄', '😎', '🤓', '🥳', '🌸', '🌟', '🚀', '🐨', '🦊',
  '🐼', '🦁', '🐙', '🦋', '🌈', '🎧', '📚', '☕', '🎨', '⚽',
];

export const INTERESTS: { key: string; label: string; emoji: string }[] = [
  { key: 'music', label: 'Musique', emoji: '🎵' },
  { key: 'travel', label: 'Voyage', emoji: '✈️' },
  { key: 'movies', label: 'Cinéma', emoji: '🎬' },
  { key: 'books', label: 'Lecture', emoji: '📚' },
  { key: 'food', label: 'Cuisine', emoji: '🍜' },
  { key: 'sport', label: 'Sport', emoji: '⚽' },
  { key: 'gaming', label: 'Jeux vidéo', emoji: '🎮' },
  { key: 'art', label: 'Art', emoji: '🎨' },
  { key: 'tech', label: 'Tech', emoji: '💻' },
  { key: 'nature', label: 'Nature', emoji: '🌿' },
  { key: 'photo', label: 'Photo', emoji: '📷' },
  { key: 'business', label: 'Business', emoji: '💼' },
  { key: 'science', label: 'Sciences', emoji: '🔬' },
  { key: 'fashion', label: 'Mode', emoji: '👗' },
  { key: 'pets', label: 'Animaux', emoji: '🐾' },
];

export function interestLabel(key: string): string {
  const i = INTERESTS.find((x) => x.key === key);
  return i ? `${i.emoji} ${i.label}` : key;
}
