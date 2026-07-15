/**
 * Écran d'entrée. Il n'affiche presque rien : le fichier racine (_layout.tsx)
 * redirige tout de suite vers le bon écran selon que tu es connecté·e / en
 * couple. On montre juste un petit voile crème le temps de la bascule.
 */
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

export default function Index() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
