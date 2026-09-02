import { safeFetch } from './fetchFix';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/db';

/**
 * Les clés Supabase sont lues depuis les variables d'environnement.
 * Elles doivent être définies dans le fichier `.env` à la racine du projet :
 *
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
 *
 * (Le préfixe EXPO_PUBLIC_ est obligatoire pour qu'Expo les rende accessibles.)
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

if (!isSupabaseConfigured) {
  // On n'interrompt pas l'app : un écran d'aide s'affichera à la place.
  console.warn(
    "[Fil] Supabase n'est pas configuré. Crée un fichier .env avec EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    // On force Supabase à utiliser notre fetch sécurisé : il nettoie les
    // en-têtes avant le fetch natif d'Expo (qui plante sinon à la connexion).
    global: { fetch: safeFetch },
  },
);
