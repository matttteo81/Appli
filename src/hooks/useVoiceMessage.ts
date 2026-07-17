import { useCallback, useState } from 'react';
import { File } from 'expo-file-system';
import {
  AudioModule,
  RecordingPresets,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { supabase } from '../lib/supabase';

const MAX_SECONDS = 60;

/**
 * Enregistrement d'un message vocal + envoi vers le bucket `voice-messages`.
 * Renvoie le chemin storage et la durée pour créer un message de type 'voice'.
 */
export function useVoiceMessage(userId: string | undefined) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [uploading, setUploading] = useState(false);

  const seconds = Math.floor((state.durationMillis ?? 0) / 1000);

  const start = useCallback(async () => {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) return false;
    await recorder.prepareToRecordAsync();
    recorder.record();
    return true;
  }, [recorder]);

  /** Arrête, téléverse, renvoie { path, ms } ou null si trop court/erreur. */
  const stopAndUpload = useCallback(async (): Promise<{
    path: string;
    ms: number;
  } | null> => {
    await recorder.stop();
    const uri = recorder.uri;
    const ms = state.durationMillis ?? 0;
    if (!uri || !userId || ms < 700) return null;
    setUploading(true);
    try {
      const bytes = await new File(uri).arrayBuffer();
      const path = `${userId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.m4a`;
      const { error } = await supabase.storage
        .from('voice-messages')
        .upload(path, bytes, { contentType: 'audio/m4a', upsert: false });
      if (error) return null;
      return { path, ms };
    } finally {
      setUploading(false);
    }
  }, [recorder, state.durationMillis, userId]);

  const cancel = useCallback(async () => {
    try {
      if (state.isRecording) await recorder.stop();
    } catch {
      /* ignore */
    }
  }, [recorder, state.isRecording]);

  return {
    isRecording: state.isRecording,
    seconds,
    maxSeconds: MAX_SECONDS,
    uploading,
    start,
    stopAndUpload,
    cancel,
  };
}

/** URL publique d'un message vocal stocké. */
export function voiceMessageUrl(path: string): string {
  return supabase.storage.from('voice-messages').getPublicUrl(path).data.publicUrl;
}
