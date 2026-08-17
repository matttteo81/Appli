import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, Screen, ScreenHeader, ThemedText } from '../src/components/ui';
import { colors } from '../src/theme/colors';
import { spacing } from '../src/theme/typography';
import { useAuth } from '../src/store/auth';
import { supabase } from '../src/lib/supabase';
import { toast } from '../src/store/toast';

/**
 * Écran « Faire un retour » : le testeur écrit un message, qui est enregistré
 * dans la table `feedback` (lisible dans le tableau de bord Supabase).
 */
export default function Retour() {
  const router = useRouter();
  const profile = useAuth((s) => s.profile);
  const couple = useAuth((s) => s.couple);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const message = msg.trim();
    if (!message) return;
    setSending(true);
    const { error } = await supabase.from('feedback').insert({
      couple_id: couple?.id ?? null,
      author_id: profile?.id ?? null,
      author_name: profile?.display_name ?? null,
      message,
    });
    setSending(false);
    if (error) {
      Alert.alert('Oups', "L'envoi a échoué. Vérifie ta connexion et réessaie.");
      return;
    }
    toast('Merci pour ton retour 💛');
    router.back();
  };

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title="Faire un retour"
        subtitle="Un bug, une idée, un détail à améliorer…"
        onBack={() => router.back()}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <ThemedText variant="body" color={colors.texteGris}>
            Fil est en bêta 🧪 Dis-moi tout : ce qui te plaît, ce qui bug, ce qui
            manque. Chaque retour aide à améliorer l'appli 💛
          </ThemedText>
          <Input
            placeholder="Ton message…"
            value={msg}
            onChangeText={setMsg}
            multiline
            style={{ minHeight: 150, textAlignVertical: 'top' }}
          />
          <Button
            title="Envoyer mon retour"
            onPress={send}
            loading={sending}
            disabled={msg.trim().length === 0}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
