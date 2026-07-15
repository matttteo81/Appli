/** Logique de croissance des animaux de la ferme. */
import type { FarmAnimal } from '../types/db';

export const HATCH_AT = 5; // éclosion de l'œuf
export const ADULT_AT = 50; // devient adulte → renaissance possible

type StageInfo = {
  emoji: string; // ce qu'on affiche (œuf tant que pas éclos)
  label: string;
  size: number; // taille de l'emoji à l'écran
  progress: number; // progression 0..1 vers le stade suivant
  remaining: number; // nourritures restantes avant le stade suivant
  nextLabel: string | null;
  isEgg: boolean;
  isAdult: boolean;
};

const STAGES = [
  { key: 'oeuf', min: 0, label: 'Œuf', size: 96 },
  { key: 'bebe', min: HATCH_AT, label: 'Bébé', size: 70 },
  { key: 'ado', min: 20, label: 'Ado', size: 104 },
  { key: 'adulte', min: ADULT_AT, label: 'Adulte', size: 150 },
] as const;

/** Renvoie les infos d'affichage d'un animal selon son compteur. */
export function animalStage(animal: Pick<FarmAnimal, 'species' | 'feed_count'>): StageInfo {
  const count = animal.feed_count;

  let idx = 0;
  for (let i = 0; i < STAGES.length; i++) {
    if (count >= STAGES[i].min) idx = i;
  }
  const cur = STAGES[idx];
  const next = STAGES[idx + 1] ?? null;

  const isEgg = count < HATCH_AT;
  const isAdult = count >= ADULT_AT;

  // Taille : on interpole doucement entre le stade courant et le suivant
  // pour donner l'impression que l'animal grandit à chaque bouchée.
  let size: number = cur.size;
  if (next) {
    const t = (count - cur.min) / (next.min - cur.min);
    size = Math.round(cur.size + (next.size - cur.size) * Math.min(1, t));
  }

  const progress = next
    ? Math.min(1, (count - cur.min) / (next.min - cur.min))
    : 1;

  return {
    emoji: isEgg ? '🥚' : animal.species,
    label: cur.label,
    size: isEgg ? 96 : size,
    progress,
    remaining: next ? Math.max(0, next.min - count) : 0,
    nextLabel: next ? next.label : null,
    isEgg,
    isAdult,
  };
}
