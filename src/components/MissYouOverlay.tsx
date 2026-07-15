/**
 * Popup plein écran « Tu me manques ».
 *
 * On écoute en temps réel les nouveaux « Tu me manques » de notre couple. Dès
 * qu'un arrive de la part du/de la partenaire, on affiche un voile plein écran
 * et on lit le message à voix haute (synthèse vocale, expo-speech).
 *
 * Ça couvre le cas « app ouverte ». Le cas « app fermée » est géré par la vraie
 * notification push envoyée en parallèle (voir HeartButton).
 */
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Palette, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/store/useSession';

export function MissYouOverlay() {
  const couple = useSession((s) => s.couple);
  const session = useSession((s) => s.session);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!couple || !session) return;
    const myId = session.user.id;

    const channel = supabase
      .channel(`missyou:${couple.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'miss_you',
          filter: `couple_id=eq.${couple.id}`,
        },
        (payload) => {
          const row = payload.new as { sender_id: string; message: string | null };
          // On n'affiche que les messages venant de l'autre personne.
          if (row.sender_id === myId) return;
          const text = row.message ?? 'Tu me manques 💛';
          setMessage(text);
          Speech.speak(text, { language: 'fr-FR', rate: 0.95, pitch: 1.05 });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [couple, session]);

  function dismiss() {
    Speech.stop();
    setMessage(null);
  }

  return (
    <Modal visible={message !== null} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <AppText style={styles.bigHeart}>♥</AppText>
        <AppText variant="display" color={Palette.blanc} center style={styles.text}>
          {message}
        </AppText>
        <View style={styles.button}>
          <Button label="Moi aussi 💛" variant="primary" onPress={dismiss} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(27,27,58,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  bigHeart: { color: Palette.corail, fontSize: 96, lineHeight: 104 },
  text: { paddingHorizontal: Spacing.lg },
  button: { alignSelf: 'stretch', paddingHorizontal: Spacing.xxl },
});
