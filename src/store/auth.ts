import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Couple, Profile } from '../types/db';

type AuthState = {
  initialized: boolean;
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  couple: Couple | null;
  partner: Profile | null;

  init: () => Promise<void>;
  refresh: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  updateCouple: (patch: Partial<Couple>) => Promise<void>;
  createCouple: () => Promise<string>; // renvoie le code d'invitation
  joinCouple: (code: string) => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  initialized: false,
  loading: false,
  session: null,
  profile: null,
  couple: null,
  partner: null,

  async init() {
    const { data } = await supabase.auth.getSession();
    set({ session: data.session });
    if (data.session) {
      await get().refresh();
    }
    // On écoute les changements de connexion (connexion/déconnexion).
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
      if (session) {
        get().refresh();
      } else {
        set({ profile: null, couple: null, partner: null });
      }
    });
    set({ initialized: true });
  },

  async refresh() {
    const session = get().session;
    if (!session) return;
    const userId = session.user.id;

    // 1) Profil de l'utilisateur — on le crée s'il n'existe pas encore.
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) {
      const displayName =
        (session.user.user_metadata?.display_name as string) ?? 'Moi';
      // upsert (au lieu d'insert) : évite l'erreur de conflit si deux
      // rafraîchissements tentent de créer le profil en même temps.
      const { data: created } = await supabase
        .from('profiles')
        .upsert({ id: userId, display_name: displayName }, { onConflict: 'id' })
        .select('*')
        .single();
      if (created) {
        profile = created;
      } else {
        // Filet de sécurité : un appel concurrent a peut-être créé le profil,
        // on le relit plutôt que de laisser le profil à null.
        const { data: refetched } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        profile = refetched ?? null;
      }
    }
    set({ profile: profile as Profile | null });

    // 2) Couple + partenaire éventuels.
    if (profile?.couple_id) {
      const { data: couple } = await supabase
        .from('couples')
        .select('*')
        .eq('id', profile.couple_id)
        .maybeSingle();
      set({ couple: (couple as Couple) ?? null });

      const { data: partner } = await supabase
        .from('profiles')
        .select('*')
        .eq('couple_id', profile.couple_id)
        .neq('id', userId)
        .maybeSingle();
      set({ partner: (partner as Profile) ?? null });
    } else {
      set({ couple: null, partner: null });
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
      // Selon la config Supabase, la session peut être immédiate.
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
    set({ session: null, profile: null, couple: null, partner: null });
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

  async updateCouple(patch) {
    const couple = get().couple;
    if (!couple) return;
    const { data, error } = await supabase
      .from('couples')
      .update(patch)
      .eq('id', couple.id)
      .select('*')
      .single();
    if (error) throw error;
    set({ couple: data as Couple });
  },

  async createCouple() {
    const profile = get().profile;
    if (!profile) throw new Error('Profil introuvable');

    // Création sécurisée côté serveur (génère le code, crée l'animal,
    // rattache le créateur). Voir la fonction SQL create_couple().
    const { data, error } = await supabase.rpc('create_couple');
    if (error) throw error;

    await get().refresh();
    return (data as Couple).invite_code;
  },

  async joinCouple(code) {
    const profile = get().profile;
    if (!profile) throw new Error('Profil introuvable');

    // Adhésion sécurisée côté serveur (recherche par code sans exposer
    // la table couples). Voir la fonction SQL join_couple_by_code().
    const { error } = await supabase.rpc('join_couple_by_code', {
      p_code: code.trim().toUpperCase(),
    });
    if (error) throw error;

    await get().refresh();
  },
}));
