import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Comportement d'une notification reçue quand l'app est OUVERTE :
 * on l'affiche quand même (bannière + son).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Demande la permission et récupère le "jeton push Expo" de ce téléphone.
 * Ce jeton est ce qui permet au serveur d'envoyer une notification précise
 * à CE téléphone. Renvoie null si refusé ou sur simulateur.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Les notifications push ne marchent que sur un vrai appareil.
  if (!Device.isDevice) {
    console.warn('[Wingo] Les notifications push nécessitent un vrai téléphone.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Wingo',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F2A65A',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const res = await Notifications.requestPermissionsAsync();
    status = res.status;
  }
  if (status !== 'granted') {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn(
      "[Wingo] projectId EAS manquant : impossible d'obtenir le jeton push. " +
        'Il sera disponible après `eas init` / le premier build.',
    );
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (e) {
    console.warn('[Wingo] Échec récupération du jeton push :', e);
    return null;
  }
}
