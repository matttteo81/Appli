/**
 * Connexion à Supabase (notre backend).
 *
 * Supabase nous donne : une base de données partagée en temps réel + la
 * gestion des comptes (inscription / connexion). Les deux « clés » ci-dessous
 * ne sont PAS secrètes (elles sont prévues pour être dans l'app), mais on les
 * met quand même dans un fichier `.env` pour ne pas les coder en dur.
 *
 * Ces valeurs viennent du fichier `.env` à la racine du projet :
 *   EXPO_PUBLIC_SUPABASE_URL=...
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
 * (voir le fichier `.env.example` pour le modèle)
 */
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/db';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Vrai seulement si les deux clés sont renseignées dans `.env`. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // On n'arrête pas l'app : on affiche juste un écran d'aide (voir _layout).
  console.warn(
    "[Fil] Supabase n'est pas configuré. Copie `.env.example` en `.env` et " +
      'ajoute ton URL et ta clé anon (voir le README).',
  );
}

export const supabase = createClient<Database>(
  supabaseUrl ?? 'http://localhost',
  supabaseAnonKey ?? 'public-anon-key',
  {
    auth: {
      // On stocke la session sur le téléphone pour rester connecté·e.
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Inutile hors navigateur (pas de redirection d'URL).
      detectSessionInUrl: false,
    },
  },
);
