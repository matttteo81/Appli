import React, { useState } from 'react';
import { Pressable, View, Text, StyleSheet, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { useAuth } from '../store/auth';
import { supabase } from '../lib/supabase';

/**
 * Bouton flottant en forme de cœur. À l'appui :
 *  1. enregistre un "nudge" en base (pour l'historique + le temps réel)
 *  2. déclenche l'Edge Function qui envoie la vraie notification push
 */
export function MissYouButton({ bottom = 90 }: { bottom?: number }) {
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const couple = useAuth((s) => s.couple);
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);

  const onPress = async () => {
    if (sending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!partner || !couple || !profile) {
      Alert.alert(
        'Ta moitié n’est pas encore reliée',
        'Partage ton code de couple depuis l’accueil pour vous relier.',
      );
      return;
    }

    setSending(true);
    try {
      // 1) On enregistre le nudge (déclenche le popup en direct côté partenaire).
      await supabase.from('nudges').insert({
        couple_id: couple.id,
        from_id: profile.id,
        to_id: partner.id,
        message: 'Tu me manques',
      });

      // 2) On envoie la notification push (même app fermée).
      await supabase.functions.invoke('send-nudge', {
        body: {
          to_id: partner.id,
          from_name: profile.display_name,
          message: 'Tu me manques',
        },
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setJustSent(true);
      setTimeout(() => setJustSent(false), 1800);
    } catch (e) {
      Alert.alert('Oups', "L'envoi a échoué. Vérifie ta connexion.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        { bottom },
        pressed && { transform: [{ scale: 0.92 }] },
      ]}
      accessibilityLabel="Envoyer « Tu me manques » à ta moitié"
    >
      <View style={styles.inner}>
        <Text style={styles.heart}>{justSent ? '💛' : '🤍'}</Text>
      </View>
      {justSent ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>Envoyé 💛</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.corail,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.encre,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  inner: { alignItems: 'center', justifyContent: 'center' },
  heart: { fontSize: 30 },
  toast: {
    position: 'absolute',
    right: 70,
    backgroundColor: colors.encre,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  toastText: {
    color: colors.creme,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
  },
});
