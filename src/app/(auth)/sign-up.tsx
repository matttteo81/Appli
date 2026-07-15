/** Écran d'inscription (nouveau compte). */
import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSignUp() {
    if (!name.trim() || !email || password.length < 6) {
      Alert.alert(
        'Il manque quelque chose',
        'Ton prénom, un email valide et un mot de passe d’au moins 6 caractères.',
      );
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: name.trim() } },
    });
    setLoading(false);

    if (error) {
      Alert.alert('Inscription impossible', error.message);
      return;
    }
    // Si la confirmation par email est activée dans Supabase, il n'y a pas
    // encore de session : on prévient l'utilisateur.
    if (!data.session) {
      Alert.alert(
        'Vérifie tes emails ✉️',
        'Confirme ton adresse via le lien reçu, puis connecte-toi.',
      );
    }
    // Sinon, la redirection est automatique (voir _layout.tsx).
  }

  return (
    <Screen scroll bottomInset={Spacing.xxl}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <AppText variant="display" center>
            Créer un compte
          </AppText>
          <AppText variant="body" color={Colors.textSecondary} center>
            Une fois inscrit·e, tu relieras ton compte à celui de ton amour.
          </AppText>
        </View>

        <View style={styles.form}>
          <TextField
            label="Ton prénom"
            value={name}
            onChangeText={setName}
            placeholder="Camille"
            autoCapitalize="words"
          />
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
            placeholder="6 caractères minimum"
          />
          <Button label="Créer mon compte" onPress={onSignUp} loading={loading} />
        </View>

        <View style={styles.footer}>
          <AppText variant="body" color={Colors.textSecondary}>
            Déjà un compte ?
          </AppText>
          <Link href="/(auth)/sign-in">
            <AppText variant="label" color={Colors.secondary}>
              Se connecter
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
