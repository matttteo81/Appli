/** Logique des stades de croissance de l'oiseau partagé. */
export type Stage = 'oeuf' | 'bebe' | 'ado' | 'adulte';

const THRESHOLDS: { stage: Stage; min: number; emoji: string; label: string }[] =
  [
    { stage: 'oeuf', min: 0, emoji: '🥚', label: 'Œuf' },
    { stage: 'bebe', min: 5, emoji: '🐣', label: 'Bébé' },
    { stage: 'ado', min: 20, emoji: '🐤', label: 'Ado' },
    { stage: 'adulte', min: 50, emoji: '🐦', label: 'Adulte' },
  ];

export function stageForCount(count: number) {
  let current = THRESHOLDS[0];
  for (const t of THRESHOLDS) {
    if (count >= t.min) current = t;
  }
  const idx = THRESHOLDS.indexOf(current);
  const next = THRESHOLDS[idx + 1] ?? null;
  const progress = next
    ? Math.min(1, (count - current.min) / (next.min - current.min))
    : 1;
  return {
    ...current,
    next,
    progress,
    remaining: next ? Math.max(0, next.min - count) : 0,
  };
}
