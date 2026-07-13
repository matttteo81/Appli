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

/** Génère un code d'invitation lisible (6 caractères sans ambiguïté). */
function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

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
      const { data: created } = await supabase
        .from('profiles')
        .insert({ id: userId, display_name: displayName })
        .select('*')
        .single();
      profile = created ?? null;
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

    const code = generateInviteCode();
    const { data: couple, error } = await supabase
      .from('couples')
      .insert({ invite_code: code })
      .select('*')
      .single();
    if (error) throw error;

    // On rattache le profil au couple.
    await supabase
      .from('profiles')
      .update({ couple_id: couple.id })
      .eq('id', profile.id);

    // On crée l'animal virtuel du couple (une seule fois).
    await supabase.from('pets').insert({ couple_id: couple.id }).select();

    await get().refresh();
    return code;
  },

  async joinCouple(code) {
    const profile = get().profile;
    if (!profile) throw new Error('Profil introuvable');

    const cleaned = code.trim().toUpperCase();
    const { data: couple, error } = await supabase
      .from('couples')
      .select('*')
      .eq('invite_code', cleaned)
      .maybeSingle();
    if (error) throw error;
    if (!couple) throw new Error('Code invalide. Vérifie les lettres.');

    // Sécurité : on refuse si le couple a déjà 2 membres.
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('couple_id', couple.id);
    if ((count ?? 0) >= 2) {
      throw new Error('Ce couple est déjà complet.');
    }

    await supabase
      .from('profiles')
      .update({ couple_id: couple.id })
      .eq('id', profile.id);

    await get().refresh();
  },
}));
