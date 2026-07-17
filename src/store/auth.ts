import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/db';

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
    const { data } = await supabase.auth.getSession();
    set({ session: data.session });
    if (data.session) {
      await get().refresh();
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
  },

  async refresh() {
    const session = get().session;
    if (!session) return;
    const userId = session.user.id;

    // Profil de l'utilisateur — créé automatiquement s'il n'existe pas encore.
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) {
      const displayName =
        (session.user.user_metadata?.display_name as string) ?? 'Apprenant·e';
      const { data: created } = await supabase
        .from('profiles')
        .upsert({ id: userId, display_name: displayName }, { onConflict: 'id' })
        .select('*')
        .single();
      profile = created ?? null;
      if (!profile) {
        const { data: refetched } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        profile = refetched ?? null;
      }
    }
    set({ profile: (profile as Profile) ?? null });
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
      const { data } = await supabase.auth.getSession();
      set({ session: data.session });
      if (data.session) await get().refresh();
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
      const { data } = await supabase.auth.getSession();
      set({ session: data.session });
      await get().refresh();
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
