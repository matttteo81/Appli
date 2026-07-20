import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/db';

/**
 * Enveloppe une promesse avec un délai maximal : si l'appel réseau traîne
 * (Supabase injoignable, session périmée…), on rejette au lieu de bloquer
 * l'app indéfiniment sur un écran de chargement.
 */
function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

type AuthState = {
  initialized: boolean;
  loading: boolean;
  session: Session | null;
  profile: Profile | null;

  init: () => Promise<void>;
  refresh: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  touchActive: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  initialized: false,
  loading: false,
  session: null,
  profile: null,

  async init() {
    // On ne bloque JAMAIS le démarrage : même si le réseau/Supabase traîne,
    // l'app se monte et le rafraîchissement se fait en arrière-plan.
    try {
      const { data } = await withTimeout(supabase.auth.getSession(), 8000);
      set({ session: data?.session ?? null });
    } catch {
      set({ session: null });
    }
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
      if (session) {
        get().refresh();
      } else {
        set({ profile: null });
      }
    });
    set({ initialized: true });
    if (get().session) {
      // fire-and-forget (déjà robuste : voir refresh())
      get().refresh();
    }
  },

  async refresh() {
    const session = get().session;
    if (!session) return;
    const userId = session.user.id;

    try {
      // Profil de l'utilisateur — créé automatiquement s'il n'existe pas encore.
      const { data: profile, error } = await withTimeout(
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        8000,
      );
      if (error) throw error;

      if (profile) {
        set({ profile: profile as Profile });
        return;
      }

      const displayName =
        (session.user.user_metadata?.display_name as string) ?? 'Apprenant·e';
      const { data: created } = await withTimeout(
        supabase
          .from('profiles')
          .upsert({ id: userId, display_name: displayName }, { onConflict: 'id' })
          .select('*')
          .single(),
        8000,
      );
      if (created) {
        set({ profile: created as Profile });
        return;
      }
      throw new Error('profil introuvable');
    } catch {
      // Session invalide/expirée ou backend injoignable : on déconnecte
      // proprement pour renvoyer vers l'écran de connexion (jamais bloqué).
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
      set({ session: null, profile: null });
    }
  },

  async signUp(email, password, displayName) {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: displayName.trim() } },
      });
      if (error) throw error;
      // La session + le profil sont pris en charge par onAuthStateChange.
    } finally {
      set({ loading: false });
    }
  },

  async signIn(email, password) {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      // La session + le profil sont pris en charge par onAuthStateChange.
    } finally {
      set({ loading: false });
    }
  },

  async signOut() {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },

  async deleteAccount() {
    const { error } = await supabase.rpc('delete_my_account');
    if (error) throw error;
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },

  async updateProfile(patch) {
    const profile = get().profile;
    if (!profile) return;
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
      .select('*')
      .single();
    if (error) throw error;
    set({ profile: data as Profile });
  },

  /** Marque l'utilisateur comme actif (pour le tri « en ligne récemment »). */
  async touchActive() {
    const profile = get().profile;
    if (!profile) return;
    await supabase
      .from('profiles')
      .update({ last_active: new Date().toISOString() })
      .eq('id', profile.id);
  },
}));
