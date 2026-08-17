import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
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
import { Toast } from '../src/components/Toast';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { Onboarding } from '../src/components/Onboarding';
import { AnimatedSplash } from '../src/components/AnimatedSplash';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { supabase } from '../src/lib/supabase';
import { registerForPushNotifications } from '../src/lib/notifications';
import { refreshMyLocation } from '../src/lib/autoLocation';

// On garde le splash natif (fond crème) visible jusqu'à ce que les polices et
// l'auth soient prêtes. Ainsi, aucun « écran bleu » de chargement n'apparaît :
// on passe directement du splash natif à l'animation avion + FIL.
SplashScreen.preventAutoHideAsync().catch(() => {});

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
  // NB : on ne s'abonne PAS à `initialized` ici. Pendant l'animation de
  // démarrage, init() met à jour l'auth ; s'abonner ferait re-rendre la racine
  // à chaque changement et saccaderait le Lottie. Le montage de l'app est
  // déclenché par la fin de l'animation (onReveal), pas par l'auth.
  const initLock = useLock((s) => s.init);
  const [showSplash, setShowSplash] = useState(true);
  // On ne monte l'arbre lourd (navigation + écrans) qu'une fois l'animation
  // avion + FIL terminée : elle joue ainsi sur un thread totalement dégagé,
  // sans saccade. L'app se met en place derrière le fondu de sortie du splash.
  const [mountApp, setMountApp] = useState(false);

  useEffect(() => {
    init();
    initLock();
  }, [init, initLock]);

  // On attend que les POLICES soient chargées avant de révéler l'animation :
  // ainsi « FIL » et la phrase s'affichent d'emblée dans la bonne police, sans
  // changement de police en cours de route. Le splash natif (fond beige,
  // identique) reste affiché le temps du chargement — donc aucun écran noir.
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  // Filet de sécurité : si l'animation ne se terminait jamais, on monte quand
  // même l'app au bout de 5 s.
  useEffect(() => {
    if (!mountApp) {
      const t = setTimeout(() => setMountApp(true), 5000);
      return () => clearTimeout(t);
    }
  }, [mountApp]);

  // Tant que les polices ne sont pas prêtes, on laisse le splash natif beige :
  // pas d'écran noir, et le texte n'apparaîtra jamais dans une mauvaise police.
  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#D8C7AC' }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        {mountApp && (
          <>
            <AuthGate />
            <NotificationBridge />
            <LocationBridge />
            <PresenceBridge />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="pair" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="ensemble" />
              <Stack.Screen name="dessin" />
              <Stack.Screen name="souvenirs" />
              <Stack.Screen name="journal" />
              <Stack.Screen name="wishlist" />
              <Stack.Screen name="notes" />
              <Stack.Screen name="agenda" />
              <Stack.Screen name="amour" />
              <Stack.Screen name="carte-photos" />
              <Stack.Screen name="parametres" />
              <Stack.Screen name="confidentialite" />
              <Stack.Screen name="retour" />
              <Stack.Screen name="retrouvailles" />
              <Stack.Screen name="capsules" />
              <Stack.Screen
                name="nudge"
                options={{ presentation: 'transparentModal', animation: 'fade' }}
              />
            </Stack>
            <LockGate />
            <Toast />
            <OfflineBanner />
            <Onboarding />
          </>
        )}
        {showSplash && (
          <ErrorBoundary
            fallback={
              <SplashSkip
                onReveal={() => setMountApp(true)}
                onDone={() => setShowSplash(false)}
              />
            }
          >
            <AnimatedSplash
              onReveal={() => setMountApp(true)}
              onDone={() => setShowSplash(false)}
            />
          </ErrorBoundary>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Repli si l'animation de démarrage lève une erreur : on révèle l'app et on
 * ferme le splash immédiatement, pour ne jamais rester bloqué dessus.
 */
function SplashSkip({ onReveal, onDone }: { onReveal: () => void; onDone: () => void }) {
  useEffect(() => {
    onReveal();
    onDone();
  }, [onReveal, onDone]);
  return null;
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
      group === 'souvenirs' ||
      group === 'journal' ||
      group === 'wishlist' ||
      group === 'notes' ||
      group === 'agenda' ||
      group === 'amour' ||
      group === 'carte-photos' ||
      group === 'parametres' ||
      group === 'confidentialite' ||
      group === 'retour' ||
      group === 'retrouvailles' ||
      group === 'capsules';
    if (!allowed) {
      router.replace('/(tabs)');
    }
  }, [session, profile, segments, router]);

  return null;
}

/**
 * Met à jour la position exacte au démarrage et à chaque retour au premier
 * plan, si la personne a activé la position automatique (et autorisé la
 * localisation). Ainsi, changer de ville met tout à jour tout seul.
 */
function LocationBridge() {
  const profileId = useAuth((s) => s.profile?.id);
  const autoOn = useAuth((s) => s.profile?.auto_location);
  const updateProfile = useAuth((s) => s.updateProfile);

  useEffect(() => {
    if (!profileId || autoOn === false) return;

    const run = () => {
      const p = useAuth.getState().profile;
      if (p && p.auto_location !== false) refreshMyLocation(p, updateProfile);
    };

    run(); // au démarrage
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => sub.remove();
  }, [profileId, autoOn, updateProfile]);

  return null;
}

/**
 * Présence : met à jour `last_active` de mon profil au premier plan et toutes
 * les minutes tant que l'app est active. Sert à afficher « en ligne » chez la
 * moitié. Mise à jour directe (sans toucher au store) pour éviter les re-rendus.
 */
function PresenceBridge() {
  const myId = useAuth((s) => s.profile?.id);
  useEffect(() => {
    if (!myId) return;
    const touch = () => {
      supabase.from('profiles').update({ last_active: new Date().toISOString() }).eq('id', myId).then(() => {}, () => {});
    };
    touch();
    const iv = setInterval(() => {
      if (AppState.currentState === 'active') touch();
    }, 60000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') touch(); });
    return () => { clearInterval(iv); sub.remove(); };
  }, [myId]);
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
