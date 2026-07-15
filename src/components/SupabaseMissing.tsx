/**
 * Écran affiché si les clés Supabase ne sont pas encore configurées.
 * Il évite un écran blanc mystérieux et explique quoi faire.
 */
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Colors, Spacing } from '@/constants/theme';

export function SupabaseMissing() {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <AppText variant="title" center>
          Presque prêt 🌙
        </AppText>
        <AppText variant="body" color={Colors.textSecondary} center>
          Il manque juste la connexion au backend. Crée un fichier{' '}
          <AppText variant="label">.env</AppText> à la racine du projet (copie{' '}
          <AppText variant="label">.env.example</AppText>) et ajoute :
        </AppText>
        <View style={styles.codeBlock}>
          <AppText variant="mono" color={Colors.text}>
            EXPO_PUBLIC_SUPABASE_URL=…
          </AppText>
          <AppText variant="mono" color={Colors.text}>
            EXPO_PUBLIC_SUPABASE_ANON_KEY=…
          </AppText>
        </View>
        <AppText variant="caption" color={Colors.textMuted} center>
          Puis relance l'app. Les étapes détaillées sont dans le README.
        </AppText>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: { gap: Spacing.lg, maxWidth: 440 },
  codeBlock: {
    backgroundColor: Colors.surfaceSunk,
    borderRadius: 12,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
});
