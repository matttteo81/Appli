/** Écran de connexion (compte existant). */
import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSignIn() {
    if (!email || !password) {
      Alert.alert('Oups', 'Renseigne ton email et ton mot de passe.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Connexion impossible', error.message);
    }
    // En cas de succès, la redirection est automatique (voir _layout.tsx).
  }

  return (
    <Screen scroll bottomInset={Spacing.xxl}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <AppText variant="display" center>
            Fil
          </AppText>
          <AppText variant="body" color={Colors.textSecondary} center>
            Le fil qui vous relie, où que vous soyez.
          </AppText>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="toi@exemple.com"
          />
          <TextField
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />
          <Button label="Se connecter" onPress={onSignIn} loading={loading} />
        </View>

        <View style={styles.footer}>
          <AppText variant="body" color={Colors.textSecondary}>
            Pas encore de compte ?
          </AppText>
          <Link href="/(auth)/sign-up">
            <AppText variant="label" color={Colors.secondary}>
              Créer un compte
            </AppText>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.sm, marginTop: Spacing.xxxl, marginBottom: Spacing.xxl },
  form: { gap: Spacing.lg },
  footer: {
    marginTop: Spacing.xl,
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
