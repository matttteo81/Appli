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
import { traduireErreur } from './sign-in';

export default function SignUp() {
  const signUp = useAuth((s) => s.signUp);
  const loading = useAuth((s) => s.loading);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!isSupabaseConfigured) return <SupabaseSetupNotice />;

  const onSubmit = async () => {
    setError(null);
    setInfo(null);
    if (name.trim().length === 0) {
      setError('Indique ton prénom.');
      return;
    }
    try {
      await signUp(email, password, name);
      setInfo(
        "Compte créé ! Si l'app te renvoie ici, confirme ton e-mail puis connecte-toi.",
      );
    } catch (e: any) {
      setError(traduireErreur(e?.message));
    }
  };

  return (
    <LinearGradient colors={skyGradients.crepuscule} style={{ flex: 1 }}>
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
            Créer un compte
          </ThemedText>
          <ThemedText
            variant="body"
            color={colors.encre}
            center
            style={{ marginTop: 6, marginBottom: spacing.xl, opacity: 0.8 }}
          >
            Rejoins la communauté et trouve tes partenaires de langue.
          </ThemedText>

          <View style={{ gap: spacing.md }}>
            <Input placeholder="Ton prénom" value={name} onChangeText={setName} />
            <Input
              placeholder="Adresse e-mail"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              placeholder="Mot de passe (6 caractères min.)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            {error ? (
              <ThemedText variant="body" color={colors.encre} center>
                {error}
              </ThemedText>
            ) : null}
            {info ? (
              <ThemedText variant="body" color={colors.encre} center>
                {info}
              </ThemedText>
            ) : null}
            <Button
              title="Créer mon compte"
              onPress={onSubmit}
              loading={loading}
            />
          </View>

          <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
            <Link href="/(auth)/sign-in">
              <ThemedText variant="bodyMedium" color={colors.encre}>
                J'ai déjà un compte
              </ThemedText>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
