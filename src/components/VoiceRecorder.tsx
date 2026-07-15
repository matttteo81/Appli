import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { File } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { supabase } from '../lib/supabase';
import type { Profile, Couple } from '../types/db';

const MAX_SECONDS = 30;

type Props = {
  visible: boolean;
  onClose: () => void;
  couple: Couple;
  profile: Profile;
  partner: Profile;
};

/**
 * Enregistreur de message vocal pour « Tu me manques ».
 * L'utilisateur enregistre sa voix, l'écoute, puis l'envoie : le clip
 * part dans le storage et une notification prévient sa moitié.
 */
export function VoiceRecorder({ visible, onClose, couple, profile, partner }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const player = useAudioPlayer(recordedUri ?? undefined);
  const playerStatus = useAudioPlayerStatus(player);

  const seconds = Math.floor((recState.durationMillis ?? 0) / 1000);

  // Auto-stop à 30 s pour garder des messages courts.
  useEffect(() => {
    if (recState.isRecording && seconds >= MAX_SECONDS) {
      stopRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, recState.isRecording]);

  // On repart de zéro à chaque ouverture.
  useEffect(() => {
    if (visible) {
      setRecordedUri(null);
      setSending(false);
    }
  }, [visible]);

  const startRecording = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Micro refusé',
          'Autorise le micro dans les réglages pour enregistrer ta voix.',
        );
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      setRecordedUri(null);
      await recorder.prepareToRecordAsync();
      recorder.record();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e: any) {
      Alert.alert('Oups', e?.message ?? "L'enregistrement a échoué.");
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setRecordedUri(recorder.uri ?? null);
    } catch {
      // ignore
    }
  };

  const togglePlay = () => {
    if (playerStatus.playing) {
      player.pause();
    } else {
      player.seekTo(0);
      player.play();
    }
  };

  const send = async () => {
    if (!recordedUri) return;
    setSending(true);
    try {
      // 1) Lire le fichier et l'envoyer dans le bucket "voice".
      const file = new File(recordedUri);
      const bytes = await file.arrayBuffer();
      const path = `${couple.id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.m4a`;
      const { error: upErr } = await supabase.storage
        .from('voice')
        .upload(path, bytes, { contentType: 'audio/m4a', upsert: false });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('voice').getPublicUrl(path);
      const audioUrl = pub.publicUrl;

      // 2) Enregistrer le nudge (popup en direct côté partenaire).
      await supabase.from('nudges').insert({
        couple_id: couple.id,
        from_id: profile.id,
        to_id: partner.id,
        message: 'Tu me manques',
        audio_url: audioUrl,
      });

      // 3) Notification push (même app fermée).
      await supabase.functions.invoke('send-nudge', {
        body: {
          to_id: partner.id,
          from_name: profile.display_name,
          message: 'Tu me manques',
          audio_url: audioUrl,
        },
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (e: any) {
      Alert.alert('Oups', "L'envoi a échoué. Vérifie ta connexion.");
      setSending(false);
    }
  };

  const close = () => {
    if (recState.isRecording) recorder.stop().catch(() => {});
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Message vocal 🎙️</Text>
        <Text style={styles.subtitle}>
          {recordedUri
            ? 'Écoute-le, puis envoie-le à ta moitié.'
            : recState.isRecording
              ? 'Parle… (30 s max)'
              : `Appuie pour enregistrer ta voix pour ${partner.display_name}.`}
        </Text>

        {/* Zone principale */}
        {!recordedUri ? (
          <Pressable
            onPress={recState.isRecording ? stopRecording : startRecording}
            style={styles.recWrap}
          >
            <LinearGradient
              colors={
                recState.isRecording
                  ? [colors.corail, colors.ambre]
                  : [colors.prune, colors.encre]
              }
              style={styles.recBtn}
            >
              <Text style={styles.recIcon}>
                {recState.isRecording ? '⏹' : '🎙️'}
              </Text>
            </LinearGradient>
            {recState.isRecording ? (
              <Text style={styles.timer}>
                {String(Math.floor(seconds / 60)).padStart(1, '0')}:
                {String(seconds % 60).padStart(2, '0')}
              </Text>
            ) : null}
          </Pressable>
        ) : (
          <View style={styles.previewRow}>
            <Pressable onPress={togglePlay} style={styles.playBtn}>
              <Text style={styles.playIcon}>
                {playerStatus.playing ? '⏸' : '▶️'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setRecordedUri(null)}
              style={styles.redoBtn}
            >
              <Text style={styles.redoText}>↺ Recommencer</Text>
            </Pressable>
          </View>
        )}

        {/* Boutons bas */}
        <View style={styles.actions}>
          {recordedUri ? (
            <Pressable
              onPress={send}
              disabled={sending}
              style={[styles.sendBtn, sending && { opacity: 0.6 }]}
            >
              {sending ? (
                <ActivityIndicator color={colors.creme} />
              ) : (
                <Text style={styles.sendText}>Envoyer 💛</Text>
              )}
            </Pressable>
          ) : null}
          <Pressable onPress={close} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.creme,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 14,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.bordure,
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 24,
    color: colors.encre,
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 15,
    color: colors.texteGris,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  recWrap: { alignItems: 'center', gap: 10, marginVertical: 10 },
  recBtn: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.encre,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  recIcon: { fontSize: 46 },
  timer: {
    fontFamily: fonts.monoMedium,
    fontSize: 26,
    color: colors.corail,
    letterSpacing: 1,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 16,
  },
  playBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.sauge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 32 },
  redoBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(27,27,58,0.08)',
  },
  redoText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.encre },
  actions: { width: '100%', gap: 10, marginTop: 6 },
  sendBtn: {
    backgroundColor: colors.corail,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sendText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 17,
    color: colors.creme,
  },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.texteGris },
});
