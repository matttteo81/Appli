import React, { useEffect, useState } from 'react';
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  Alert,
  Keyboard,
  Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { useAuth } from '../store/auth';
import { supabase } from '../lib/supabase';
import { VoiceRecorder } from './VoiceRecorder';

// Les petites attentions envoyables d'un tap. On réutilise le système de
// « nudge » (notification push + popup en temps réel chez la moitié).
const ATTENTIONS = [
  { emoji: '😢', message: 'Tu me manques' },
  { emoji: '💗', message: 'Je pense fort à toi' },
];

/**
 * Bouton flottant en forme de cœur. À l'appui, un petit choix s'ouvre :
 *  - « Tu me manques » / « Je pense fort à toi » → nudge + push
 *  - 🎙️ message vocal (aussi accessible en appui long)
 */
export function MissYouButton({ bottom = 90 }: { bottom?: number }) {
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const couple = useAuth((s) => s.couple);
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);

  // On masque le cœur quand le clavier est ouvert, pour ne pas gêner
  // le champ de saisie (Mots, Playlist…).
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboardOpen(true));
    const showA = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardOpen(false));
    const hideA = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      showA.remove();
      hide.remove();
      hideA.remove();
    };
  }, []);

  const notLinked = () => {
    Alert.alert(
      'Ta moitié n’est pas encore reliée',
      'Partage ton code de couple depuis l’accueil pour vous relier.',
    );
  };

  const openChooser = () => {
    if (!partner || !couple || !profile) return notLinked();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChooserOpen(true);
  };

  const sendAttention = async (message: string) => {
    if (sending || !partner || !couple || !profile) return;
    setChooserOpen(false);
    setSending(true);
    try {
      // 1) On enregistre le nudge (déclenche le popup en direct côté partenaire).
      await supabase.from('nudges').insert({
        couple_id: couple.id,
        from_id: profile.id,
        to_id: partner.id,
        message,
      });
      // 2) On envoie la notification push (même app fermée).
      await supabase.functions.invoke('send-nudge', {
        body: { to_id: partner.id, from_name: profile.display_name, message },
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

  const openRecorder = () => {
    if (!partner || !couple || !profile) return notLinked();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChooserOpen(false);
    setRecorderOpen(true);
  };

  if (keyboardOpen) return null;

  return (
    <>
      <Pressable
        onPress={openChooser}
        onLongPress={openRecorder}
        delayLongPress={280}
        style={({ pressed }) => [
          styles.fab,
          { bottom },
          pressed && { transform: [{ scale: 0.92 }] },
        ]}
        accessibilityLabel="Envoyer une attention à ta moitié. Appui long pour un message vocal."
      >
        <View style={styles.inner}>
          <Text style={styles.heart}>{justSent ? '💛' : '🤍'}</Text>
        </View>
        <View style={styles.micHint}>
          <Text style={styles.micHintText}>🎙️</Text>
        </View>
        {justSent ? (
          <View style={styles.toast}>
            <Text style={styles.toastText}>Envoyé 💛</Text>
          </View>
        ) : null}
      </Pressable>

      {/* Petit choix d'attentions */}
      <Modal visible={chooserOpen} transparent animationType="fade" onRequestClose={() => setChooserOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setChooserOpen(false)}>
          <View style={[styles.chooser, { bottom: bottom + 74 }]}>
            {ATTENTIONS.map((a) => (
              <Pressable
                key={a.message}
                style={styles.option}
                onPress={() => sendAttention(a.message)}
              >
                <Text style={styles.optionEmoji}>{a.emoji}</Text>
                <Text style={styles.optionText}>{a.message}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.option} onPress={openRecorder}>
              <Text style={styles.optionEmoji}>🎙️</Text>
              <Text style={styles.optionText}>Message vocal</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {recorderOpen && partner && couple && profile ? (
        <VoiceRecorder
          visible={recorderOpen}
          onClose={() => setRecorderOpen(false)}
          couple={couple}
          profile={profile}
          partner={partner}
        />
      ) : null}
    </>
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
  micHint: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.encre,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.creme,
  },
  micHintText: { fontSize: 11 },
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
  backdrop: { flex: 1, backgroundColor: 'rgba(27,27,58,0.25)' },
  chooser: {
    position: 'absolute',
    right: 20,
    gap: 8,
    alignItems: 'flex-end',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.creme,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: colors.encre,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  optionEmoji: { fontSize: 20 },
  optionText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.encre },
});
