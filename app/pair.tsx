import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Input, ThemedText } from '../src/components/ui';
import { colors, skyGradients } from '../src/theme/colors';
import { fonts, spacing } from '../src/theme/typography';
import { useAuth } from '../src/store/auth';

export default function Pair() {
  const createCouple = useAuth((s) => s.createCouple);
  const joinCouple = useAuth((s) => s.joinCouple);
  const signOut = useAuth((s) => s.signOut);
  const profile = useAuth((s) => s.profile);

  const [mode, setMode] = useState<'choix' | 'rejoindre'>('choix');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Après création/adhésion, AuthGate (app/_layout.tsx) redirige tout seul
  // vers les onglets. Le code d'invitation s'affichera sur l'écran d'accueil
  // tant que la moitié n'a pas rejoint.
  const onCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      await createCouple();
    } catch (e: any) {
      setError(e?.message ?? 'Erreur');
      setBusy(false);
    }
  };

  const onJoin = async () => {
    setBusy(true);
    setError(null);
    try {
      await joinCouple(joinCode);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur');
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={skyGradients.aube} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            padding: spacing.lg,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText variant="display" color={colors.encre} center>
            Bonjour {profile?.display_name} 🌸
          </ThemedText>
          <ThemedText
            variant="body"
            color={colors.encre}
            center
            style={{ marginTop: 6, marginBottom: spacing.xl, opacity: 0.85 }}
          >
            Reliez vos deux téléphones pour commencer.
          </ThemedText>

          {mode === 'choix' && (
            <View style={{ gap: spacing.md }}>
              <Button
                title="Créer notre couple"
                onPress={onCreate}
                loading={busy}
              />
              <Button
                title="J'ai un code d'invitation"
                variant="secondary"
                onPress={() => setMode('rejoindre')}
              />
            </View>
          )}

          {mode === 'rejoindre' && (
            <View style={{ gap: spacing.md }}>
              <Input
                placeholder="Code (ex : ABC123)"
                autoCapitalize="characters"
                value={joinCode}
                onChangeText={setJoinCode}
                maxLength={6}
                style={{
                  textAlign: 'center',
                  fontFamily: fonts.monoMedium,
                  fontSize: 24,
                  letterSpacing: 4,
                }}
              />
              <Button title="Nous relier" onPress={onJoin} loading={busy} />
              <Button
                title="Retour"
                variant="ghost"
                onPress={() => {
                  setMode('choix');
                  setError(null);
                }}
              />
            </View>
          )}

          {error ? (
            <ThemedText
              variant="body"
              color={colors.prune}
              center
              style={{ marginTop: spacing.md }}
            >
              {error}
            </ThemedText>
          ) : null}

          <Pressable
            onPress={signOut}
            style={{ marginTop: spacing.xxl, alignItems: 'center' }}
          >
            <ThemedText
              variant="body"
              color={colors.encre}
              style={{ opacity: 0.7 }}
            >
              Se déconnecter
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
