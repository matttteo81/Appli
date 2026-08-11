import { create } from 'zustand';

/**
 * Petit signal global pour recalculer les pastilles de non-lus des onglets.
 * On appelle `refresh()` quand du nouveau contenu arrive (temps réel) ou
 * quand on vient de « voir » un onglet.
 */
export const useBadgeRefresh = create<{ tick: number; refresh: () => void }>((set) => ({
  tick: 0,
  refresh: () => set((s) => ({ tick: s.tick + 1 })),
}));
