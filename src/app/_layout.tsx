/**
 * Fichier racine de l'app.
 *
 * Il fait 4 choses :
 *  1) charge les polices Google (Fraunces, Plus Jakarta Sans, IBM Plex Mono) ;
 *  2) démarre l'état de session (qui est connecté·e, à quel couple) ;
 *  3) garde l'écran de démarrage visible tant que tout n'est pas prêt ;
 *  4) aiguille automatiquement l'utilisateur vers le bon écran.
 */
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
} from '@expo-google-fonts/ibm-plex-mono';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SupabaseMissing } from '@/components/SupabaseMissing';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useSession } from '@/store/useSession';

// On empêche l'écran de démarrage de disparaître tant qu'on n'est pas prêt.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  const init = useSession((s) => s.init);
  const initialized = useSession((s) => s.initialized);

  // Démarre l'écoute de la session (une seule fois).
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const cleanup = init();
    return cleanup;
  }, [init]);

  const ready = fontsLoaded && (initialized || !isSupabaseConfigured);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  // On aiguille l'utilisateur en fonction de son état (voir le hook plus bas).
  useProtectedRoute(ready);

  if (!ready) {
    return null; // l'écran de démarrage reste affiché
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {isSupabaseConfigured ? (
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FBF6EF' } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="pair" />
            <Stack.Screen name="(app)" />
          </Stack>
        ) : (
          <SupabaseMissing />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Redirige automatiquement :
 *  - pas connecté·e            → écran de connexion
 *  - connecté·e mais seul·e    → écran d'appairage (code d'invitation)
 *  - connecté·e et en couple   → l'app (accueil)
 */
function useProtectedRoute(ready: boolean) {
  const segments = useSegments();
  const router = useRouter();
  const session = useSession((s) => s.session);
  const profile = useSession((s) => s.profile);

  useEffect(() => {
    if (!ready || !isSupabaseConfigured) return;

    const root = segments[0];
    const inAuth = root === '(auth)';
    const onPair = root === 'pair';
    const inApp = root === '(app)';
    const paired = Boolean(profile?.couple_id);

    if (!session) {
      if (!inAuth) router.replace('/(auth)/sign-in');
    } else if (!paired) {
      if (!onPair) router.replace('/pair');
    } else if (!inApp) {
      router.replace('/(app)/accueil');
    }
  }, [ready, segments, session, profile, router]);
}
