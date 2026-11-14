import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Input, ThemedText } from '../../src/components/ui';
import { colors, skyGradients } from '../../src/theme/colors';
import { spacing } from '../../src/theme/typography';
import { useAuth } from '../../src/store/auth';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import { SupabaseSetupNotice } from '../../src/components/SupabaseSetupNotice';

/**
 * Mot de passe oublié — en deux temps, sans quitter l'app :
 *   1. on saisit son e-mail → Supabase envoie un code par e-mail ;
 *   2. on saisit le code + un nouveau mot de passe.
 *
 * On passe par un CODE (et non un lien) pour ne dépendre d'aucun lien profond :
 * le modèle d'e-mail « Reset Password » de Supabase doit afficher {{ .Token }}.
 */
export default function MotDePasseOublie() {
  const router = useRouter();
  const setRecovering = useAuth((s) => s.setRecovering);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Si on quitte l'écran en cours de route, on rend la main à la navigation.
  useEffect(() => () => setRecovering(false), [setRecovering]);

  if (!isSupabaseConfigured) return <SupabaseSetupNotice />;

  const sendCode = async () => {
    setError(null);
    setInfo(null);
    const mail = email.trim();
    if (!mail.includes('@')) {
      setError('Indique ton adresse e-mail.');
      return;
    }
    setBusy(true);
    try {
      const { error: e } = await supabase.auth.resetPasswordForEmail(mail);
      if (e) throw e;
      setStep('code');
      setInfo(
        "Si un compte existe pour cette adresse, un code vient de t'être envoyé par e-mail.",
      );
    } catch (e: any) {
      setError(traduire(e?.message));
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    setError(null);
    setInfo(null);
    if (code.trim().length < 6) {
      setError('Saisis le code reçu par e-mail.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }
    setBusy(true);
    // La validation du code ouvre une session : on bloque la redirection
    // automatique le temps d'enregistrer le nouveau mot de passe.
    setRecovering(true);
    try {
      const { error: e1 } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'recovery',
      });
      if (e1) throw e1;
      const { error: e2 } = await supabase.auth.updateUser({ password });
      if (e2) throw e2;
      // Terminé : la session est ouverte, la navigation reprend la main.
      setRecovering(false);
      router.replace('/(tabs)');
    } catch (e: any) {
      setRecovering(false);
      setError(traduire(e?.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={skyGradients.nuit} style={{ flex: 1 }}>
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
          <ThemedText variant="title" color={colors.creme} center>
            Mot de passe oublié
          </ThemedText>
          <ThemedText
            variant="body"
            color={colors.cremeDoux}
            center
            style={{ marginTop: 6, marginBottom: spacing.xl }}
          >
            {step === 'email'
              ? 'Indique ton adresse : on t’envoie un code pour en choisir un nouveau.'
              : 'Saisis le code reçu par e-mail, puis ton nouveau mot de passe.'}
          </ThemedText>

          <View style={{ gap: spacing.md }}>
            {step === 'email' ? (
              <Input
                placeholder="Adresse e-mail"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            ) : (
              <>
                <Input
                  placeholder="Code reçu par e-mail"
                  autoCapitalize="none"
                  keyboardType="number-pad"
                  value={code}
                  onChangeText={setCode}
                />
                <Input
                  placeholder="Nouveau mot de passe"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </>
            )}
            {info ? (
              <ThemedText variant="body" color={colors.cremeDoux} center>
                {info}
              </ThemedText>
            ) : null}
            {error ? (
              <ThemedText variant="body" color={colors.corail} center>
                {error}
              </ThemedText>
            ) : null}
            {step === 'email' ? (
              <Button title="Recevoir un code" onPress={sendCode} loading={busy} />
            ) : (
              <>
                <Button
                  title="Changer mon mot de passe"
                  onPress={changePassword}
                  loading={busy}
                />
                <Button
                  title="Renvoyer un code"
                  variant="ghost"
                  onPress={sendCode}
                  disabled={busy}
                />
              </>
            )}
          </View>

          <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
            <Link href="/(auth)/sign-in">
              <ThemedText variant="bodyMedium" color={colors.ambre}>
                Retour à la connexion
              </ThemedText>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function traduire(msg?: string): string {
  if (!msg) return 'Une erreur est survenue.';
  const m = msg.toLowerCase();
  if (m.includes('expired') || m.includes('invalid'))
    return 'Code incorrect ou expiré. Demande-en un nouveau.';
  if (m.includes('rate limit') || m.includes('security purposes'))
    return 'Trop de demandes. Patiente une minute avant de réessayer.';
  if (m.includes('different from the old'))
    return 'Choisis un mot de passe différent de l’ancien.';
  if (m.includes('password'))
    return 'Le mot de passe doit faire au moins 6 caractères.';
  return msg;
}
