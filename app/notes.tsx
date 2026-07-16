import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, EmptyState, Screen, ThemedText } from '../src/components/ui';
import { colors } from '../src/theme/colors';
import { fonts, radius, spacing } from '../src/theme/typography';
import { useCoupleTable } from '../src/hooks/useCoupleTable';
import { useAuth } from '../src/store/auth';
import { supabase } from '../src/lib/supabase';
import type { LoveNote } from '../src/types/db';

function frDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function Notes() {
  const router = useRouter();
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const { rows, loading } = useCoupleTable<LoveNote>('love_notes', 'created_at', false);

  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState('');
  const [scheduled, setScheduled] = useState(false);
  const [revealAt, setRevealAt] = useState<Date>(() => new Date(Date.now() + 24 * 3600 * 1000));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [opened, setOpened] = useState<LoveNote | null>(null);

  const now = Date.now();

  const send = async () => {
    const t = body.trim();
    if (!t || !couple || !profile) return;
    setSending(true);
    await supabase.from('love_notes').insert({
      couple_id: couple.id,
      author_id: profile.id,
      to_id: partner?.id ?? null,
      body: t,
      reveal_at: scheduled ? revealAt.toISOString() : null,
    });
    setSending(false);
    setBody('');
    setScheduled(false);
    setComposing(false);
  };

  const openNote = async (n: LoveNote) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!n.opened) {
      await supabase
        .from('love_notes')
        .update({ opened: true, opened_at: new Date().toISOString() })
        .eq('id', n.id);
    }
    setOpened({ ...n, opened: true });
  };

  const remove = async (n: LoveNote) => {
    await supabase.from('love_notes').delete().eq('id', n.id);
  };

  const renderNote = (n: LoveNote) => {
    const mine = n.author_id === profile?.id;
    const locked = n.reveal_at != null && new Date(n.reveal_at).getTime() > now;

    // Note que J'AI envoyée : je vois son statut, pas de mystère.
    if (mine) {
      return (
        <Pressable onLongPress={() => remove(n)} style={[styles.env, styles.sent]}>
          <Text style={styles.stamp}>➤</Text>
          <View style={{ flex: 1 }}>
            <ThemedText variant="label" color={colors.texteGris}>
              ENVOYÉE À {partner?.display_name?.toUpperCase() ?? '❤'}
            </ThemedText>
            <ThemedText variant="body" color={colors.texteSombre} numberOfLines={2} style={{ marginTop: 2 }}>
              {n.body}
            </ThemedText>
            <ThemedText variant="body" color={locked ? colors.corail : colors.sauge} style={{ marginTop: 4, fontSize: 13 }}>
              {locked
                ? `🔒 scellée jusqu'au ${frDate(n.reveal_at!)}`
                : n.opened
                ? `💗 ouverte le ${n.opened_at ? frDate(n.opened_at) : ''}`
                : '📬 pas encore ouverte'}
            </ThemedText>
          </View>
        </Pressable>
      );
    }

    // Note que J'AI reçue.
    if (locked) {
      return (
        <View style={[styles.env, styles.locked]}>
          <Text style={styles.stampBig}>🔒</Text>
          <View style={{ flex: 1 }}>
            <ThemedText variant="title" color={colors.creme}>Une surprise scellée…</ThemedText>
            <ThemedText variant="body" color={colors.creme} style={{ opacity: 0.85, marginTop: 2 }}>
              Ouvrable le {frDate(n.reveal_at!)}
            </ThemedText>
          </View>
        </View>
      );
    }

    // Ouvrable maintenant.
    return (
      <Pressable onPress={() => openNote(n)} onLongPress={() => remove(n)} style={[styles.env, n.opened ? styles.read : styles.unread]}>
        <Text style={styles.stampBig}>{n.opened ? '💌' : '✉️'}</Text>
        <View style={{ flex: 1 }}>
          <ThemedText variant="title" color={n.opened ? colors.encre : colors.creme}>
            {n.opened ? 'Un mot de ' + (partner?.display_name ?? '❤') : 'Un mot t’attend 💛'}
          </ThemedText>
          {n.opened ? (
            <ThemedText variant="body" color={colors.texteSombre} numberOfLines={2} style={{ marginTop: 2 }}>
              {n.body}
            </ThemedText>
          ) : (
            <ThemedText variant="body" color={colors.creme} style={{ opacity: 0.9, marginTop: 2 }}>
              Touche pour l’ouvrir
            </ThemedText>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ThemedText variant="bodyMedium" color={colors.corail}>‹ Retour</ThemedText>
        </Pressable>
        <ThemedText variant="title">Petits mots 💌</ThemedText>
        <View style={{ width: 50 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.prune} />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState emoji="💌" title="Des mots doux, quand il le faut" subtitle="Écris un petit mot scellé. Ouvrable tout de suite, ou programmé pour une date qui compte." />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: 100 }}
          renderItem={({ item }) => renderNote(item)}
        />
      )}

      <Pressable style={styles.fab} onPress={() => setComposing(true)}>
        <Text style={{ fontSize: 26 }}>✍️</Text>
      </Pressable>

      {/* Rédaction */}
      <Modal visible={composing} animationType="slide" transparent onRequestClose={() => setComposing(false)}>
        <KeyboardAvoidingView style={styles.modalWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <ThemedText variant="title" center>Un mot pour {partner?.display_name ?? '❤'}</ThemedText>
            <TextInput
              placeholder="Écris ce que tu ressens…"
              placeholderTextColor={colors.texteGris}
              value={body}
              onChangeText={setBody}
              multiline
              style={styles.area}
            />
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <ThemedText variant="bodyMedium">Programmer l’ouverture</ThemedText>
                <ThemedText variant="body" color={colors.texteGris} style={{ fontSize: 13 }}>
                  {scheduled ? `Scellé jusqu’au ${frDate(revealAt.toISOString())}` : 'Ouvrable tout de suite'}
                </ThemedText>
              </View>
              <Switch value={scheduled} onValueChange={setScheduled} trackColor={{ true: colors.ambre }} />
            </View>
            {scheduled ? (
              <Pressable onPress={() => setPickerOpen(true)} style={styles.dateBtn}>
                <ThemedText variant="bodyMedium" color={colors.prune}>📅 {frDate(revealAt.toISOString())}</ThemedText>
              </Pressable>
            ) : null}
            {pickerOpen ? (
              <DateTimePicker
                value={revealAt}
                mode="datetime"
                minimumDate={new Date()}
                onChange={(_, d) => {
                  if (Platform.OS !== 'ios') setPickerOpen(false);
                  if (d) setRevealAt(d);
                }}
              />
            ) : null}
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
              <Button title="Annuler" variant="ghost" onPress={() => setComposing(false)} style={{ flex: 1 }} />
              <Button title="Sceller 💌" onPress={send} loading={sending} disabled={!body.trim()} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Lecture d'une note ouverte */}
      <Modal visible={!!opened} animationType="fade" transparent onRequestClose={() => setOpened(null)}>
        <Pressable style={styles.readWrap} onPress={() => setOpened(null)}>
          <View style={styles.card}>
            <Text style={{ fontSize: 40, textAlign: 'center' }}>💌</Text>
            <ThemedText variant="body" center color={colors.texteSombre} style={{ fontSize: 18, lineHeight: 28, marginVertical: spacing.md }}>
              {opened?.body}
            </ThemedText>
            <ThemedText variant="label" center color={colors.texteGris}>
              — {partner?.display_name ?? '❤'}
            </ThemedText>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  env: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  sent: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.bordure },
  locked: { backgroundColor: colors.prune },
  unread: { backgroundColor: colors.corail },
  read: { backgroundColor: colors.cremeDoux, borderWidth: 1, borderColor: colors.bordure },
  stamp: { fontSize: 20, color: colors.sauge },
  stampBig: { fontSize: 30 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.ambre,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.encre,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.creme,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  area: {
    minHeight: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.md,
    fontFamily: fonts.bodyRegular,
    fontSize: 16,
    color: colors.texteSombre,
    textAlignVertical: 'top',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  dateBtn: {
    backgroundColor: colors.cremeDoux,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  readWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.overlay, padding: spacing.lg },
  card: {
    backgroundColor: colors.creme,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
  },
});
