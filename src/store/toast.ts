import { create } from 'zustand';

/** Petit toast global, discret, à la place des Alert pour les infos/succès. */
type ToastState = {
  message: string | null;
  show: (m: string) => void;
  hide: () => void;
};

export const useToast = create<ToastState>((set) => ({
  message: null,
  show: (m) => set({ message: m }),
  hide: () => set({ message: null }),
}));

/** Raccourci : toast('Copié 💛') depuis n'importe où. */
export const toast = (m: string) => useToast.getState().show(m);
