import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { encode as b64encode } from 'base64-arraybuffer';
import {
  EmptyState,
  Input,
  Screen,
  ScreenHeader,
  ThemedText,
} from '../../src/components/ui';
import { colors } from '../../src/theme/colors';
import { fonts, radius, spacing } from '../../src/theme/typography';
import { useCoupleTable } from '../../src/hooks/useCoupleTable';
import { useAuth } from '../../src/store/auth';
import { supabase } from '../../src/lib/supabase';
import type { Message } from '../../src/types/db';
import { BUILTIN_GIFS, gifSource } from '../../src/lib/gifs';
import { detectLang, readerLang, translateText } from '../../src/lib/translate';

const MSG_REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

/** Rangée de message qui « arrive » en douceur (fondu + montée + zoom). */
function MsgRow({ mine, children }: { mine: boolean; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  return (
    <Animated.View
      style={[
        styles.bubbleRow,
        { justifyContent: mine ? 'flex-end' : 'flex-start', opacity: v, transform: [{ translateY }, { scale }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export default function Messages() {
  const { rows, loading } = useCoupleTable<Message>('messages', 'created_at', false);
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const [text, setText] = useState('');
  const [gifOpen, setGifOpen] = useState(false);
  const [tab, setTab] = useState<'gifs' | 'create'>('gifs');
  const [busy, setBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<Message | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // Traduction : langue de lecture (appareil) + état par message.
  const reader = React.useMemo(() => readerLang(), []);
  const [tr, setTr] = useState<
    Record<string, { text?: string; loading?: boolean; shown?: boolean }>
  >({});

  const toggleTranslate = async (m: Message) => {
    if (!m.body) return;
    const cur = tr[m.id];
    if (cur?.shown) {
      setTr((s) => ({ ...s, [m.id]: { ...cur, shown: false } }));
      return;
    }
    if (cur?.text !== undefined || cur?.loading) {
      setTr((s) => ({ ...s, [m.id]: { ...cur, shown: true } }));
      return;
    }
    setTr((s) => ({ ...s, [m.id]: { loading: true, shown: true } }));
    const out = await translateText(m.body, reader);
    setTr((s) => ({ ...s, [m.id]: { text: out ?? '', loading: false, shown: true } }));
  };

  const msgById = React.useMemo(() => {
    const m: Record<string, Message> = {};
    for (const r of rows) m[r.id] = r;
    return m;
  }, [rows]);

  const send = async () => {
    const body = text.trim();
    if (!body || !couple || !profile) return;
    setText('');
    const replyId = replyTo?.id ?? null;
    setReplyTo(null);
    await supabase.from('messages').insert({
      couple_id: couple.id,
      author_id: profile.id,
      body,
      reply_to: replyId,
    });
  };

  const react = async (message: Message, emoji: string) => {
    setActionMsg(null);
    await supabase.rpc('react_to_message', { p_message: message.id, p_emoji: emoji });
  };

  const previewOf = (m: Message | undefined) => {
    if (!m) return 'Message supprimé';
    if (m.image_url) return '🎞️ GIF';
    return m.body ?? '';
  };

  const sendGif = async (imageUrl: string) => {
    if (!couple || !profile) return;
    await supabase.from('messages').insert({
      couple_id: couple.id,
      author_id: profile.id,
      body: null,
      image_url: imageUrl,
    });
  };

  const sendBuiltin = async (id: string) => {
    setGifOpen(false);
    await sendGif(`builtin:${id}`);
  };

  const createFromPhotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Accès refusé', 'Autorise l’accès aux photos dans les réglages.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 8,
      quality: 1,
    });
    if (res.canceled || res.assets.length < 2) {
      if (!res.canceled) Alert.alert('Choisis au moins 2 photos', 'Un GIF a besoin de plusieurs images.');
      return;
    }
    setBusy(true);
    try {
      // Chargé à la demande (garde jpeg-js/gifenc hors du démarrage).
      const { makeGifFromPhotos } = await import('../../src/lib/makegif');
      const uris = res.assets.map((a) => a.uri);
      const bytes = await makeGifFromPhotos(uris, 500);
      const path = `${couple!.id}/${Date.now()}.gif`;
      const { error } = await supabase.storage
        .from('gifs')
        .upload(path, b64encode(bytes.buffer as ArrayBuffer), {
          contentType: 'image/gif',
        });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('gifs').getPublicUrl(path);
      await sendGif(pub.publicUrl);
      setGifOpen(false);
    } catch (e: any) {
      Alert.alert('Oups', e?.message ?? 'Création du GIF impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Messages" subtitle="Votre fil de discussion" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {rows.length === 0 && !loading ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <EmptyState
              emoji="💬"
              title="Aucun message"
              subtitle="Écris le premier message ci-dessous."
            />
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(m) => m.id}
            inverted
            contentContainerStyle={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
              gap: 4,
            }}
            renderItem={({ item }) => {
              const mine = item.author_id === profile?.id;
              const src = item.image_url ? gifSource(item.image_url) : null;
              const reactionEmojis = Object.values(item.reactions ?? {});
              const repliedTo = item.reply_to ? msgById[item.reply_to] : undefined;
              return (
                <MsgRow mine={mine}>
                  <Pressable
                    onLongPress={() => setActionMsg(item)}
                    delayLongPress={250}
                    style={{ maxWidth: '80%' }}
                  >
                    {/* Extrait du message auquel on répond */}
                    {item.reply_to ? (
                      <View
                        style={[
                          styles.replySnippet,
                          { alignSelf: mine ? 'flex-end' : 'flex-start' },
                        ]}
                      >
                        <Text style={styles.replySnippetText} numberOfLines={1}>
                          ↩︎ {previewOf(repliedTo)}
                        </Text>
                      </View>
                    ) : null}

                    {src ? (
                      <View style={[styles.gifWrap, { alignSelf: mine ? 'flex-end' : 'flex-start' }]}>
                        <Image source={src} style={styles.gif} contentFit="cover" />
                        <Text style={[styles.gifTime, { color: colors.texteGris }]}>
                          {formatTime(item.created_at)}
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.bubble,
                          mine ? styles.mine : styles.theirs,
                          { alignSelf: mine ? 'flex-end' : 'flex-start' },
                        ]}
                      >
                        <Text style={[styles.body, { color: mine ? colors.creme : colors.encre }]}>
                          {item.body}
                        </Text>
                        <Text style={[styles.time, { color: mine ? 'rgba(251,246,239,0.7)' : colors.texteGris }]}>
                          {formatTime(item.created_at)}
                        </Text>
                      </View>
                    )}

                    {/* Réactions posées sur le message */}
                    {reactionEmojis.length > 0 ? (
                      <View style={[styles.reactionsRow, { alignSelf: mine ? 'flex-end' : 'flex-start' }]}>
                        {reactionEmojis.map((e, i) => (
                          <Text key={i} style={styles.reactionBadge}>{e}</Text>
                        ))}
                      </View>
                    ) : null}

                    {/* Traduction (si le message n'est pas déjà dans ta langue) */}
                    {item.body && detectLang(item.body) !== reader ? (
                      <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>
                        <Pressable onPress={() => toggleTranslate(item)} hitSlop={6}>
                          <Text style={styles.translateLink}>
                            {tr[item.id]?.loading
                              ? '🌐 …'
                              : tr[item.id]?.shown
                              ? 'Masquer'
                              : '🌐 Traduire'}
                          </Text>
                        </Pressable>
                        {tr[item.id]?.shown && !tr[item.id]?.loading ? (
                          tr[item.id]?.text ? (
                            <View style={styles.translated}>
                              <Text style={styles.translatedText}>{tr[item.id]?.text}</Text>
                            </View>
                          ) : (
                            <Text style={styles.translateFail}>Traduction indisponible</Text>
                          )
                        ) : null}
                      </View>
                    ) : null}
                  </Pressable>
                </MsgRow>
              );
            }}
          />
        )}

        {/* Aperçu du message auquel on répond */}
        {replyTo ? (
          <View style={styles.replyBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.replyBarLabel}>Réponse à</Text>
              <Text style={styles.replyBarText} numberOfLines={1}>
                {previewOf(replyTo)}
              </Text>
            </View>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={10}>
              <Text style={styles.replyBarClose}>✕</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.inputBar}>
          <Pressable onPress={() => { setGifOpen(true); setTab('gifs'); }} style={styles.gifBtn}>
            <Text style={styles.gifBtnTxt}>GIF</Text>
          </Pressable>
          <Input
            placeholder="Message…"
            value={text}
            onChangeText={setText}
            style={{ flex: 1 }}
            multiline
            onSubmitEditing={send}
          />
          <Pressable
            onPress={send}
            disabled={text.trim().length === 0}
            style={[styles.send, text.trim().length === 0 && { opacity: 0.4 }]}
          >
            <Text style={{ fontSize: 20 }}>➤</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Menu réactions / répondre (appui long) */}
      <Modal visible={!!actionMsg} transparent animationType="fade" onRequestClose={() => setActionMsg(null)}>
        <Pressable style={styles.actionBackdrop} onPress={() => setActionMsg(null)}>
          <View style={styles.actionSheet}>
            <View style={styles.reactPickRow}>
              {MSG_REACTIONS.map((e) => (
                <Pressable key={e} onPress={() => actionMsg && react(actionMsg, e)} style={styles.reactPick}>
                  <Text style={{ fontSize: 30 }}>{e}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={styles.replyAction}
              onPress={() => { setReplyTo(actionMsg); setActionMsg(null); }}
            >
              <Text style={styles.replyActionText}>↩︎  Répondre</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Sélecteur de GIF */}
      <Modal visible={gifOpen} transparent animationType="slide" onRequestClose={() => setGifOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => !busy && setGifOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.tabs}>
            <Pressable onPress={() => setTab('gifs')} style={[styles.tab, tab === 'gifs' && styles.tabOn]}>
              <Text style={[styles.tabTxt, tab === 'gifs' && styles.tabTxtOn]}>GIFs</Text>
            </Pressable>
            <Pressable onPress={() => setTab('create')} style={[styles.tab, tab === 'create' && styles.tabOn]}>
              <Text style={[styles.tabTxt, tab === 'create' && styles.tabTxtOn]}>Créer</Text>
            </Pressable>
          </View>

          {tab === 'gifs' ? (
            <View style={styles.gifGrid}>
              {BUILTIN_GIFS.map((g) => (
                <Pressable key={g.id} onPress={() => sendBuiltin(g.id)} style={styles.gifCell}>
                  <Image source={g.source} style={styles.gifThumb} contentFit="cover" />
                  <Text style={styles.gifLabel} numberOfLines={1}>{g.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.createBox}>
              <Text style={{ fontSize: 44 }}>🎞️</Text>
              <ThemedText variant="bodyMedium" center style={{ marginTop: spacing.sm }}>
                Crée ton GIF à partir de tes photos
              </ThemedText>
              <ThemedText variant="body" color={colors.texteGris} center style={{ marginTop: 4, paddingHorizontal: spacing.lg }}>
                Choisis 2 à 8 photos : elles s'animeront en boucle 💛
              </ThemedText>
              <Pressable onPress={createFromPhotos} disabled={busy} style={[styles.createBtn, busy && { opacity: 0.6 }]}>
                {busy ? (
                  <ActivityIndicator color={colors.encre} />
                ) : (
                  <Text style={styles.createBtnTxt}>📷 Choisir mes photos</Text>
                )}
              </Pressable>
              {busy ? (
                <ThemedText variant="body" color={colors.texteGris} center style={{ marginTop: spacing.sm }}>
                  Création du GIF…
                </ThemedText>
              ) : null}
            </View>
          )}
        </View>
      </Modal>
    </Screen>
  );
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

const styles = StyleSheet.create({
  bubbleRow: { flexDirection: 'row', marginTop: 6 },
  bubble: {
    maxWidth: '78%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  mine: { backgroundColor: colors.prune, borderBottomRightRadius: 6 },
  theirs: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  body: { fontFamily: fonts.bodyRegular, fontSize: 16, lineHeight: 22 },
  time: { fontFamily: fonts.bodyMedium, fontSize: 10, marginTop: 3, alignSelf: 'flex-end' },
  gifWrap: { alignItems: 'flex-end' },
  gif: { width: 160, height: 160, borderRadius: radius.lg, backgroundColor: colors.cremeDoux },
  gifTime: { fontFamily: fonts.bodyMedium, fontSize: 10, marginTop: 3 },
  replySnippet: {
    backgroundColor: 'rgba(74,59,107,0.12)',
    borderLeftWidth: 3,
    borderLeftColor: colors.prune,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 2,
    maxWidth: '100%',
  },
  replySnippetText: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.texteGris },
  reactionsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: -6,
    backgroundColor: colors.creme,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  reactionBadge: { fontSize: 13 },
  translateLink: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.corail, marginTop: 4 },
  translated: {
    backgroundColor: colors.cremeDoux,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 3,
    maxWidth: '100%',
  },
  translatedText: { fontFamily: fonts.bodyRegular, fontSize: 15, color: colors.encre, fontStyle: 'italic' },
  translateFail: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.texteGris, marginTop: 3 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.cremeDoux,
    borderTopWidth: 1,
    borderTopColor: colors.bordure,
  },
  replyBarLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.prune },
  replyBarText: { fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.texteGris },
  replyBarClose: { fontSize: 18, color: colors.texteGris, paddingHorizontal: 4 },
  actionBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSheet: {
    backgroundColor: colors.creme,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
    width: '86%',
  },
  reactPickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  reactPick: { padding: 6 },
  replyAction: {
    borderTopWidth: 1,
    borderTopColor: colors.bordure,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  replyActionText: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.prune },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.creme,
    borderTopWidth: 1,
    borderTopColor: colors.bordure,
  },
  gifBtn: {
    height: 48,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.cremeDoux,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  gifBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.prune },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.ambre,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.creme,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    minHeight: 320,
  },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: colors.cremeDoux,
  },
  tabOn: { backgroundColor: colors.prune },
  tabTxt: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.texteGris },
  tabTxtOn: { color: colors.creme },
  gifGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  gifCell: { width: '31%', alignItems: 'center' },
  gifThumb: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.cremeDoux },
  gifLabel: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.texteGris, marginTop: 4 },
  createBox: { alignItems: 'center', paddingVertical: spacing.xl },
  createBtn: {
    backgroundColor: colors.ambre,
    borderRadius: radius.pill,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  createBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.encre },
});
