/**
 * Écran d'appairage : relier son compte à celui de son/sa partenaire.
 * Deux possibilités :
 *   - « Créer notre fil » → génère un code à 6 caractères à partager ;
 *   - « Rejoindre » → saisir le code reçu de l'autre.
 */
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/store/useSession';

export default function Pair() {
  const profile = useSession((s) => s.profile);
  const refresh = useSession((s) => s.refresh);
  const [code, setCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  async function onCreate() {
    setCreating(true);
    const { data, error } = await supabase.rpc('create_couple');
    setCreating(false);
    if (error) {
      Alert.alert('Impossible de créer le fil', error.message);
      return;
    }
    // On affiche le code à partager. Le/la partenaire le saisira de son côté.
    setCreatedCode(data?.invite_code ?? null);
    await refresh();
  }

  async function onJoin() {
    const clean = code.trim().toUpperCase();
    if (clean.length !== 6) {
      Alert.alert('Code incomplet', 'Le code fait 6 caractères (ex. 7F3A9C).');
      return;
    }
    setJoining(true);
    const { error } = await supabase.rpc('join_couple', { p_code: clean });
    setJoining(false);
    if (error) {
      Alert.alert('Impossible de rejoindre', error.message);
      return;
    }
    await refresh(); // la redirection vers l'app se fait automatiquement
  }

  async function onSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="display" center>
          Reliez vos fils
        </AppText>
        <AppText variant="body" color={Colors.textSecondary} center>
          {profile?.display_name ? `Bonjour ${profile.display_name} ! ` : ''}
          Une personne crée le fil, l'autre le rejoint avec le code.
        </AppText>
      </View>

      {/* Créer */}
      <Card style={styles.card}>
        <AppText variant="subtitle">Créer notre fil</AppText>
        {createdCode ? (
          <>
            <AppText variant="body" color={Colors.textSecondary}>
              Partage ce code avec ton amour. Dès qu'il/elle le saisit, vous êtes reliés.
            </AppText>
            <View style={styles.codeBox}>
              <AppText variant="mono" color={Colors.text} style={styles.codeText}>
                {createdCode}
              </AppText>
            </View>
            <AppText variant="caption" color={Colors.textMuted} center>
              En attente que ton/ta partenaire rejoigne…
            </AppText>
          </>
        ) : (
          <>
            <AppText variant="body" color={Colors.textSecondary}>
              Tu obtiendras un code à partager.
            </AppText>
            <Button label="Créer notre fil" onPress={onCreate} loading={creating} />
          </>
        )}
      </Card>

      {/* Rejoindre */}
      {!createdCode && (
        <Card style={styles.card}>
          <AppText variant="subtitle">Rejoindre avec un code</AppText>
          <TextField
            label="Code reçu"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={6}
            placeholder="7F3A9C"
            style={styles.codeInput}
          />
          <Button
            label="Rejoindre"
            variant="secondary"
            onPress={onJoin}
            loading={joining}
          />
        </Card>
      )}

      <View style={styles.footer}>
        <Button label="Se déconnecter" variant="ghost" onPress={onSignOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.sm, marginTop: Spacing.xl, marginBottom: Spacing.xl },
  card: { gap: Spacing.md, marginBottom: Spacing.lg },
  codeBox: {
    backgroundColor: Colors.surfaceSunk,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  codeText: { fontSize: 32, letterSpacing: 6 },
  codeInput: { fontSize: 22, letterSpacing: 4, textAlign: 'center' },
  footer: { marginTop: Spacing.md },
});
