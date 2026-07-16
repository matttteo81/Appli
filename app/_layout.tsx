import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import * as Notifications from 'expo-notifications';
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
import { useLock } from '../src/store/lock';
import { LockGate } from '../src/components/LockGate';
import { AnimatedSplash } from '../src/components/AnimatedSplash';
import { supabase } from '../src/lib/supabase';
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
  const initLock = useLock((s) => s.init);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    init();
    initLock();
  }, [init, initLock]);

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
        <NotificationBridge />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="pair" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="ensemble" />
          <Stack.Screen name="dessin" />
          <Stack.Screen name="souvenirs" />
          <Stack.Screen
            name="nudge"
            options={{ presentation: 'transparentModal', animation: 'fade' }}
          />
        </Stack>
        <LockGate />
        {showSplash && <AnimatedSplash onDone={() => setShowSplash(false)} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Redirige l'utilisateur selon son état :
 * - pas connecté         -> écran de connexion
 * - connecté sans couple -> écran d'appairage
 * - connecté avec couple -> onglets principaux
 */
function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const session = useAuth((s) => s.session);
  const profile = useAuth((s) => s.profile);

  useEffect(() => {
    const group = segments[0];
    const inAuth = group === '(auth)';
    const inPair = group === 'pair';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/sign-in');
      return;
    }
    // Connecté mais profil pas encore chargé : on attend.
    if (!profile) return;

    if (!profile.couple_id) {
      if (!inPair) router.replace('/pair');
      return;
    }
    // Connecté + en couple : on autorise les onglets, le popup nudge
    // et l'écran « Ensemble ».
    const allowed =
      group === '(tabs)' ||
      group === 'nudge' ||
      group === 'ensemble' ||
      group === 'dessin' ||
      group === 'souvenirs';
    if (!allowed) {
      router.replace('/(tabs)');
    }
  }, [session, profile, segments, router]);

  return null;
}

/**
 * Gère les notifications push :
 * - enregistre le jeton du téléphone dans le profil
 * - écoute les nudges reçus (en direct + au tap) pour afficher le popup
 */
function NotificationBridge() {
  const router = useRouter();
  const profile = useAuth((s) => s.profile);
  const updateProfile = useAuth((s) => s.updateProfile);
  const tokenSaved = useRef<string | null>(null);

  // 1) Enregistrement du jeton push dès qu'on a un profil.
  useEffect(() => {
    if (!profile) return;
    (async () => {
      const token = await registerForPushNotifications();
      if (token && token !== tokenSaved.current && token !== profile.push_token) {
        tokenSaved.current = token;
        try {
          await updateProfile({ push_token: token });
        } catch {
          // silencieux : réessaiera au prochain lancement
        }
      }
    })();
  }, [profile, updateProfile]);

  // 2) Popup quand on tape une notification (app en arrière-plan/fermée).
  useEffect(() => {
    const openNudge = (data: any) => {
      if (data?.type === 'nudge') {
        router.push({
          pathname: '/nudge',
          params: {
            message: String(data.message ?? 'Tu me manques'),
            from: String(data.from_name ?? ''),
            audio: String(data.audio_url ?? ''),
          },
        });
      }
    };

    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      openNudge(resp.notification.request.content.data);
    });

    // Cas "app démarrée à froid" via une notification.
    Notifications.getLastNotificationResponseAsync().then((resp) => {
      if (resp) openNudge(resp.notification.request.content.data);
    });

    return () => sub.remove();
  }, [router]);

  // 3) Popup en direct via Realtime quand l'app est déjà ouverte.
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`nudges-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'nudges',
          filter: `to_id=eq.${profile.id}`,
        },
        (payload) => {
          const n = payload.new as { message?: string; audio_url?: string };
          router.push({
            pathname: '/nudge',
            params: {
              message: String(n.message ?? 'Tu me manques'),
              from: '',
              audio: String(n.audio_url ?? ''),
            },
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, router]);

  return null;
}
