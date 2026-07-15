/**
 * Notifications push (« Tu me manques »).
 *
 * Deux choses ici :
 *  1) enregistrer ce téléphone pour recevoir des notifications → on obtient un
 *     « jeton Expo » (Expo push token) qu'on stocke dans Supabase ;
 *  2) envoyer une notification au téléphone du partenaire à partir de SON jeton.
 *
 * ⚠️ Important : les vraies notifications push (app fermée) ne fonctionnent
 * PAS dans l'app de test « Expo Go » (limitation d'Expo). Il faut un
 * « development build » (voir le README). En attendant, même dans Expo Go,
 * le popup « Tu me manques » s'affiche en temps réel quand l'app est ouverte,
 * grâce au temps réel de Supabase.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Comment afficher une notification reçue quand l'app est au premier plan.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Demande la permission et renvoie le jeton push de CE téléphone (ou null).
 * À appeler après la connexion, puis stocker le jeton dans le profil.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Les notifications push nécessitent un vrai téléphone (pas un simulateur).
  if (!Device.isDevice) {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Fil',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#EF8C7C',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  if (status !== 'granted') {
    return null;
  }

  // L'identifiant du projet EAS est nécessaire pour obtenir le jeton.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  try {
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return token.data;
  } catch (e) {
    console.warn('[Fil] Impossible d’obtenir le jeton push :', e);
    return null;
  }
}

/**
 * Envoie une notification au téléphone du partenaire via l'API push d'Expo.
 * `toToken` est le jeton Expo du partenaire (récupéré depuis Supabase).
 */
export async function sendPushToPartner(
  toToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!toToken) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: toToken,
        sound: 'default',
        title,
        body,
        data: data ?? {},
        priority: 'high',
      }),
    });
  } catch (e) {
    console.warn('[Fil] Échec de l’envoi de la notification :', e);
  }
}
