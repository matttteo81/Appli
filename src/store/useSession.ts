/**
 * État global de la session : qui est connecté·e, son profil, son couple et
 * son/sa partenaire. Toute l'app lit ces informations ici (grâce à Zustand),
 * et elles se mettent à jour en temps réel via Supabase.
 */
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { registerForPushNotifications } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import type { Couple, Profile } from '@/types/db';

type SessionState = {
  initialized: boolean; // le premier chargement est-il terminé ?
  session: Session | null;
  profile: Profile | null;
  couple: Couple | null;
  partner: Profile | null;

  /** À appeler une seule fois au démarrage de l'app. Renvoie une fonction de nettoyage. */
  init: () => () => void;
  /** Recharge profil + couple + partenaire depuis le serveur. */
  refresh: () => Promise<void>;
  /** Met à jour localement le profil (après une modif optimiste). */
  patchProfile: (patch: Partial<Profile>) => void;
  patchCouple: (patch: Partial<Couple>) => void;
};

// Canal temps réel courant (pour l'oublier quand le couple change).
let coupleChannel: RealtimeChannel | null = null;

export const useSession = create<SessionState>((set, get) => ({
  initialized: false,
  session: null,
  profile: null,
  couple: null,
  partner: null,

  init: () => {
    // 1) Charger la session existante (déjà connecté·e ?)
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session });
      get()
        .refresh()
        .finally(() => set({ initialized: true }));
    });

    // 2) Écouter les connexions / déconnexions
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
      if (session) {
        get().refresh();
      } else {
        // Déconnexion : on nettoie tout.
        if (coupleChannel) {
          supabase.removeChannel(coupleChannel);
          coupleChannel = null;
        }
        set({ profile: null, couple: null, partner: null });
      }
    });

    return () => {
      sub.subscription.unsubscribe();
      if (coupleChannel) {
        supabase.removeChannel(coupleChannel);
        coupleChannel = null;
      }
    };
  },

  refresh: async () => {
    const session = get().session;
    if (!session) {
      set({ profile: null, couple: null, partner: null });
      return;
    }
    const userId = session.user.id;

    // Mon profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    set({ profile: profile ?? null });

    // Enregistrer / mettre à jour le jeton de notifications push si besoin.
    void syncPushToken(profile ?? null);

    if (!profile?.couple_id) {
      set({ couple: null, partner: null });
      subscribeToCouple(null, get);
      return;
    }

    // Le couple + le/la partenaire
    const [{ data: couple }, { data: members }] = await Promise.all([
      supabase.from('couples').select('*').eq('id', profile.couple_id).maybeSingle(),
      supabase.from('profiles').select('*').eq('couple_id', profile.couple_id),
    ]);

    const partner = (members ?? []).find((m) => m.id !== userId) ?? null;
    set({ couple: couple ?? null, partner });

    subscribeToCouple(profile.couple_id, get);
  },

  patchProfile: (patch) =>
    set((s) => ({ profile: s.profile ? { ...s.profile, ...patch } : s.profile })),
  patchCouple: (patch) =>
    set((s) => ({ couple: s.couple ? { ...s.couple, ...patch } : s.couple })),
}));

/** Met à jour le jeton push dans le profil s'il a changé. */
async function syncPushToken(profile: Profile | null) {
  if (!profile) return;
  const token = await registerForPushNotifications();
  if (token && token !== profile.expo_push_token) {
    await supabase.from('profiles').update({ expo_push_token: token }).eq('id', profile.id);
  }
}

/**
 * (Re)branche l'écoute temps réel du couple : dès qu'un profil du couple ou le
 * couple lui-même change (partenaire qui rejoint, date de retrouvailles, ville…),
 * on recharge.
 */
function subscribeToCouple(coupleId: string | null, get: () => SessionState) {
  if (coupleChannel) {
    supabase.removeChannel(coupleChannel);
    coupleChannel = null;
  }
  if (!coupleId) return;

  coupleChannel = supabase
    .channel(`couple:${coupleId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles', filter: `couple_id=eq.${coupleId}` },
      () => get().refresh(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'couples', filter: `id=eq.${coupleId}` },
      () => get().refresh(),
    )
    .subscribe();
}
