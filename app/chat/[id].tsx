import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';
import { fonts, radius, spacing } from '../../src/theme/typography';
import { useAuth } from '../../src/store/auth';
import { supabase } from '../../src/lib/supabase';
import { translateText } from '../../src/lib/translate';
import { useVoiceMessage, voiceMessageUrl } from '../../src/hooks/useVoiceMessage';
import type { Message } from '../../src/types/db';

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    emoji?: string;
  }>();
  const conversationId = params.id;
  const me = useAuth((s) => s.profile);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [correcting, setCorrecting] = useState<Message | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const voice = useVoiceMessage(me?.id);

  // Ma langue native = langue cible par défaut pour traduire ce que je reçois.
  const myTargetLang = me?.native_langs?.[0] ?? 'fr';

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);
  }, [conversationId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  // Réception en direct des nouveaux messages.
  useEffect(() => {
    const channel = supabase
      .channel(`conv-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m],
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const insert = useCallback(
    async (patch: Partial<Message>) => {
      if (!me) return;
      const { data } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: me.id,
          kind: 'text',
          ...patch,
        })
        .select('*')
        .single();
      if (data) {
        setMessages((prev) =>
          prev.some((x) => x.id === data.id) ? prev : [...prev, data as Message],
        );
      }
    },
    [me, conversationId],
  );

  const sendText = useCallback(async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    if (correcting) {
      const target = correcting;
      setCorrecting(null);
      await insert({ kind: 'correction', body, corrects_id: target.id });
    } else {
      await insert({ kind: 'text', body });
    }
  }, [text, correcting, insert]);

  const onMicPressIn = useCallback(async () => {
    await voice.start();
  }, [voice]);

  const onMicPressOut = useCallback(async () => {
    const res = await voice.stopAndUpload();
    if (res) {
      await insert({
        kind: 'voice',
        audio_path: res.path,
        audio_ms: res.ms,
      });
    }
  }, [voice, insert]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* En-tête */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ThemedText style={{ fontSize: 24 }}>‹</ThemedText>
        </Pressable>
        <View style={styles.headerAvatar}>
          <ThemedText style={{ fontSize: 22 }}>
            {params.emoji ?? '🙂'}
          </ThemedText>
        </View>
        <ThemedText variant="title" color={colors.encre} numberOfLines={1}>
          {params.name ?? 'Partenaire'}
        </ThemedText>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.prune} size="large" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
            renderItem={({ item }) => (
              <Bubble
                message={item}
                mine={item.sender_id === me?.id}
                targetLang={myTargetLang}
                original={
                  item.corrects_id
                    ? messages.find((x) => x.id === item.corrects_id) ?? null
                    : null
                }
                onCorrect={() => setCorrecting(item)}
              />
            )}
          />

          {/* Barre de correction active */}
          {correcting ? (
            <View style={styles.correctBanner}>
              <ThemedText variant="label" color={colors.encre}>
                ✏️ Correction de : « {correcting.body} »
              </ThemedText>
              <Pressable onPress={() => setCorrecting(null)} hitSlop={8}>
                <ThemedText color={colors.encre}>✕</ThemedText>
              </Pressable>
            </View>
          ) : null}

          {/* Composeur */}
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={correcting ? 'Écris la version correcte…' : 'Message…'}
              placeholderTextColor={colors.texteGris}
              multiline
            />
            {text.trim().length > 0 ? (
              <Pressable style={styles.sendBtn} onPress={sendText}>
                <ThemedText style={{ fontSize: 18 }}>➤</ThemedText>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.sendBtn, voice.isRecording && styles.recording]}
                onPressIn={onMicPressIn}
                onPressOut={onMicPressOut}
              >
                <ThemedText style={{ fontSize: 18 }}>
                  {voice.isRecording ? `${voice.seconds}s` : '🎙️'}
                </ThemedText>
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function Bubble({
  message,
  mine,
  targetLang,
  original,
  onCorrect,
}: {
  message: Message;
  mine: boolean;
  targetLang: string;
  original: Message | null;
  onCorrect: () => void;
}) {
  const [translation, setTranslation] = useState<string | null>(
    message.translation,
  );
  const [translating, setTranslating] = useState(false);

  const doTranslate = async () => {
    if (translation || !message.body) return;
    setTranslating(true);
    const out = await translateText(message.body, targetLang);
    setTranslation(out ?? '— traduction indisponible —');
    setTranslating(false);
  };

  const isCorrection = message.kind === 'correction';

  return (
    <Pressable
      onLongPress={!mine && message.kind === 'text' ? onCorrect : undefined}
      style={[
        styles.bubble,
        mine ? styles.bubbleMine : styles.bubbleTheirs,
        isCorrection && styles.bubbleCorrection,
      ]}
    >
      {isCorrection ? (
        <ThemedText variant="label" color={colors.encre} style={{ marginBottom: 4 }}>
          ✏️ Correction
        </ThemedText>
      ) : null}

      {isCorrection && original?.body ? (
        <ThemedText
          variant="body"
          color={colors.texteGris}
          style={{ textDecorationLine: 'line-through', marginBottom: 2 }}
        >
          {original.body}
        </ThemedText>
      ) : null}

      {message.kind === 'voice' && message.audio_path ? (
        <VoicePlayer path={message.audio_path} ms={message.audio_ms ?? 0} mine={mine} />
      ) : (
        <ThemedText
          variant="body"
          color={mine ? colors.encre : colors.texteSombre}
        >
          {message.body}
        </ThemedText>
      )}

      {translation ? (
        <ThemedText
          variant="body"
          color={colors.prune}
          style={styles.translation}
        >
          {translation}
        </ThemedText>
      ) : null}

      {message.kind === 'text' ? (
        <Pressable onPress={doTranslate} hitSlop={6} style={styles.translateBtn}>
          <ThemedText variant="label" color={mine ? colors.encreDoux : colors.prune}>
            {translating ? '…' : translation ? '' : '🌐 Traduire'}
          </ThemedText>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function VoicePlayer({
  path,
  ms,
  mine,
}: {
  path: string;
  ms: number;
  mine: boolean;
}) {
  const url = voiceMessageUrl(path);
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (status.playing) {
      player.pause();
    } else {
      if (status.didJustFinish || status.currentTime >= (status.duration || 0)) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  return (
    <Pressable onPress={toggle} style={styles.voiceRow}>
      <ThemedText style={{ fontSize: 22 }}>
        {status.playing ? '⏸️' : '▶️'}
      </ThemedText>
      <View style={styles.waveform}>
        <ThemedText variant="mono" color={mine ? colors.encre : colors.prune}>
          🎙️ {Math.max(1, Math.round(ms / 1000))}s
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.creme },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.bordure,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.cremeDoux,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.ambre,
    borderBottomRightRadius: 6,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
  },
  bubbleCorrection: {
    backgroundColor: colors.sauge,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
  },
  translation: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.bordure,
    fontStyle: 'italic',
  },
  translateBtn: { marginTop: 4 },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  waveform: { justifyContent: 'center' },
  correctBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.sauge,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.bordure,
    backgroundColor: colors.creme,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontFamily: fonts.bodyRegular,
    fontSize: 16,
    color: colors.texteSombre,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.ambre,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recording: { backgroundColor: colors.corail },
});
