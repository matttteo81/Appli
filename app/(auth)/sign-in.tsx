import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Input, ThemedText } from '../../src/components/ui';
import { colors, skyGradients } from '../../src/theme/colors';
import { spacing } from '../../src/theme/typography';
import { useAuth } from '../../src/store/auth';
import { isSupabaseConfigured } from '../../src/lib/supabase';
import { SupabaseSetupNotice } from '../../src/components/SupabaseSetupNotice';

export default function SignIn() {
  const signIn = useAuth((s) => s.signIn);
  const loading = useAuth((s) => s.loading);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isSupabaseConfigured) return <SupabaseSetupNotice />;

  const onSubmit = async () => {
    setError(null);
    try {
      await signIn(email, password);
    } catch (e: any) {
      setError(traduireErreur(e?.message));
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
          <ThemedText variant="display" color={colors.creme} center>
            Lingo 🌍
          </ThemedText>
          <ThemedText
            variant="body"
            color={colors.cremeDoux}
            center
            style={{ marginTop: 6, marginBottom: spacing.xl }}
          >
            Apprends les langues avec de vrais partenaires.
          </ThemedText>

          <View style={{ gap: spacing.md }}>
            <Input
              placeholder="Adresse e-mail"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              placeholder="Mot de passe"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            {error ? (
              <ThemedText variant="body" color={colors.corail} center>
                {error}
              </ThemedText>
            ) : null}
            <Button title="Se connecter" onPress={onSubmit} loading={loading} />
          </View>

          <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
            <ThemedText variant="body" color={colors.cremeDoux}>
              Pas encore de compte ?
            </ThemedText>
            <Link href="/(auth)/sign-up" style={{ marginTop: 4 }}>
              <ThemedText variant="bodyMedium" color={colors.ambre}>
                Créer un compte
              </ThemedText>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

export function traduireErreur(msg?: string): string {
  if (!msg) return 'Une erreur est survenue.';
  if (msg.includes('Invalid login')) return 'E-mail ou mot de passe incorrect.';
  if (msg.includes('already registered'))
    return 'Cette adresse e-mail a déjà un compte.';
  if (msg.toLowerCase().includes('password'))
    return 'Le mot de passe doit faire au moins 6 caractères.';
  if (msg.includes('Email not confirmed'))
    return 'Confirme ton e-mail avant de te connecter.';
  return msg;
}
