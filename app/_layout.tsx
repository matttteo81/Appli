import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, AppState } from 'react-native';
import { useFonts } from 'expo-font';
import {
  Fraunces_400Regular,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
} from '@expo-google-fonts/ibm-plex-mono';

import { useAuth } from '../src/store/auth';
import { AnimatedSplash } from '../src/components/AnimatedSplash';
import { registerForPushNotifications } from '../src/lib/notifications';
import { colors } from '../src/theme/colors';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  const init = useAuth((s) => s.init);
  const initialized = useAuth((s) => s.initialized);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    init();
  }, [init]);

  if (!fontsLoaded || !initialized) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.encre,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.ambre} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AuthGate />
        <PresenceBridge />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="room/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="partner/[id]" />
          <Stack.Screen name="confidentialite" />
        </Stack>
        {showSplash && <AnimatedSplash onDone={() => setShowSplash(false)} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Redirige l'utilisateur selon son état :
 * - pas connecté            -> connexion
 * - connecté sans onboarding -> écran d'onboarding (langues)
 * - connecté + onboardé      -> onglets principaux
 */
function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const session = useAuth((s) => s.session);
  const profile = useAuth((s) => s.profile);

  useEffect(() => {
    const group = segments[0];
    const inAuth = group === '(auth)';
    const inOnboarding = group === 'onboarding';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/sign-in');
      return;
    }
    if (!profile) return; // profil en cours de chargement

    if (!profile.onboarded) {
      if (!inOnboarding) router.replace('/onboarding');
      return;
    }
    // Onboardé : on empêche seulement de rester bloqué sur auth/onboarding.
    if (inAuth || inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [session, profile, segments, router]);

  return null;
}

/**
 * Enregistre le jeton push et rafraîchit « dernière activité » à l'ouverture
 * et à chaque retour au premier plan (tri « en ligne récemment »).
 */
function PresenceBridge() {
  const profile = useAuth((s) => s.profile);
  const updateProfile = useAuth((s) => s.updateProfile);
  const touchActive = useAuth((s) => s.touchActive);
  const tokenSaved = useRef<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const token = await registerForPushNotifications();
      if (
        token &&
        token !== tokenSaved.current &&
        token !== profile.push_token
      ) {
        tokenSaved.current = token;
        try {
          await updateProfile({ push_token: token });
        } catch {
          /* réessaiera au prochain lancement */
        }
      }
    })();
  }, [profile, updateProfile]);

  useEffect(() => {
    if (!profile) return;
    touchActive();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') touchActive();
    });
    return () => sub.remove();
  }, [profile?.id, touchActive]);

  return null;
}
