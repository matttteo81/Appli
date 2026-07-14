import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

const KEY = 'fil.lockEnabled';

type LockState = {
  enabled: boolean;
  locked: boolean;
  ready: boolean;
  init: () => Promise<void>;
  setEnabled: (v: boolean) => Promise<boolean>;
  lockNow: () => void;
  unlock: () => Promise<void>;
};

/** Verrou local de l'app par Face ID / code (aucune donnée envoyée). */
export const useLock = create<LockState>((set, get) => ({
  enabled: false,
  locked: false,
  ready: false,

  async init() {
    const stored = await AsyncStorage.getItem(KEY);
    const enabled = stored === '1';
    set({ enabled, locked: enabled, ready: true });
  },

  async setEnabled(v) {
    if (v) {
      // On vérifie qu'un Face ID / code est disponible avant d'activer.
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) {
        return false;
      }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Activer le verrou de Fil',
      });
      if (!res.success) return false;
    }
    await AsyncStorage.setItem(KEY, v ? '1' : '0');
    set({ enabled: v, locked: false });
    return true;
  },

  lockNow() {
    if (get().enabled) set({ locked: true });
  },

  async unlock() {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Déverrouiller Fil',
      fallbackLabel: 'Utiliser le code',
    });
    if (res.success) set({ locked: false });
  },
}));
