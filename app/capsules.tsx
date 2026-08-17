import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { decode } from 'base64-arraybuffer';
import { Button, EmptyState, Input, Screen, ThemedText } from '../src/components/ui';
import { colors } from '../src/theme/colors';
import { fonts, radius, spacing } from '../src/theme/typography';
import { useCoupleTable } from '../src/hooks/useCoupleTable';
import { useAuth } from '../src/store/auth';
import { supabase } from '../src/lib/supabase';
import { pushToPartner } from '../src/lib/push';
import type { Capsule } from '../src/types/db';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function frDate(iso: string) {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function Capsules() {
  const router = useRouter();
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const { rows, loading } = useCoupleTable<Capsule>('capsules', 'open_date', true);

  const [urls, setUrls] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [viewer, setViewer] = useState<Capsule | null>(null);

  // Formulaire de création
  const [msg, setMsg] = useState('');
  const [pic, setPic] = useState<{ base64: string; ext: string } | null>(null);
  const [openDate, setOpenDate] = useState<Date>(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d;
  });
  const [showPicker, setShowPicker] = useState(false);
  const [sending, setSending] = useState(false);

  const isSealed = (c: Capsule) => c.open_date > todayISO() && c.author_id !== profile?.id;

  // URLs signées des images des capsules DÉJÀ ouvertes (ou les miennes).
  useEffect(() => {
    const paths = rows
      .filter((c) => c.image_path && !isSealed(c))
      .map((c) => c.image_path as string)
      .filter((p) => !urls[p]);
    if (paths.length === 0) return;
    let active = true;
    (async () => {
      const { data } = await supabase.storage.from('photos').createSignedUrls(paths, 60 * 60);
      if (!active || !data) return;
      setUrls((prev) => {
        const next = { ...prev };
        data.forEach((d) => { if (d.signedUrl && d.path) next[d.path] = d.signedUrl; });
        return next;
      });
    })();
    return () => { active = false; };
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notifications locales : prévient quand une capsule qui M'EST adressée s'ouvre.
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') return;
        for (const c of rows) {
          if (c.author_id === profile?.id) continue; // c'est moi qui l'ai créée
          if (c.open_date <= todayISO()) continue;
          const when = new Date(c.open_date + 'T09:00:00');
          if (when.getTime() <= Date.now() + 60000) continue;
          await Notifications.scheduleNotificationAsync({
            identifier: `capsule-${c.id}`,
            content: {
              title: '🎁 Une capsule s’ouvre aujourd’hui !',
              body: `${c.author_name ?? 'Ta moitié'} t’a laissé un message scellé. Ouvre Fil 💛`,
              data: { type: 'capsule' },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
          });
        }
      } catch {}
    })();
  }, [rows, profile?.id]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Accès refusé', 'Autorise l’accès aux photos dans les réglages.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, base64: true });
    if (res.canceled || !res.assets[0]?.base64) return;
    const a = res.assets[0];
    const ext = (a.uri.split('.').pop() || 'jpg').toLowerCase();
    setPic({ base64: a.base64!, ext: ext === 'png' ? 'png' : 'jpg' });
  };

  const resetForm = () => { setMsg(''); setPic(null); setSending(false); };

  const create = async () => {
    const message = msg.trim();
    if (!message && !pic) { Alert.alert('Capsule vide', 'Ajoute un petit mot ou une photo 💛'); return; }
    if (!couple || !profile) return;
    setSending(true);
    try {
      let image_path: string | null = null;
      if (pic) {
        const path = `${couple.id}/capsules/${Date.now()}.${pic.ext}`;
        const { error } = await supabase.storage
          .from('photos')
          .upload(path, decode(pic.base64), { contentType: pic.ext === 'png' ? 'image/png' : 'image/jpeg' });
        if (error) throw error;
        image_path = path;
      }
      const open_date = openDate.toISOString().slice(0, 10);
      const { error } = await supabase.from('capsules').insert({
        couple_id: couple.id,
        author_id: profile.id,
        author_name: profile.display_name,
        message: message || null,
        image_path,
        open_date,
      });
      if (error) throw error;
      pushToPartner(partner?.id, `🔒 ${profile.display_name}`, `t’a laissé une capsule à ouvrir le ${frDate(open_date)}`);
      setCreating(false);
      resetForm();
    } catch (e: any) {
      Alert.alert('Oups', e?.message ?? 'La capsule n’a pas pu être créée.');
      setSending(false);
    }
  };

  const removeCapsule = async (c: Capsule) => {
    if (c.author_id !== profile?.id) return;
    Alert.alert('Supprimer', 'Retirer cette capsule ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => supabase.from('capsules').delete().eq('id', c.id) },
    ]);
  };

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (a.open_date < b.open_date ? -1 : 1)),
    [rows],
  );

  return (
    <Screen edges={['top']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ThemedText variant="bodyMedium" color={colors.corail}>‹ Retour</ThemedText>
        </Pressable>
        <ThemedText variant="title">Capsules 🔒</ThemedText>
        <View style={{ width: 50 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.prune} />
        </View>
      ) : rows.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            emoji="🔒"
            title="Capsules temporelles"
            subtitle="Laissez-vous un mot ou une photo scellés, à ouvrir à une date précise (vos retrouvailles, un anniversaire…)."
          />
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 100 }}
          renderItem={({ item }) => {
            const sealed = isSealed(item);
            const mine = item.author_id === profile?.id;
            const futureMine = mine && item.open_date > todayISO();
            return (
              <Pressable
                onPress={() => { if (!sealed) setViewer(item); }}
                onLongPress={() => removeCapsule(item)}
                style={[styles.capsule, sealed && styles.capsuleSealed]}
              >
                <Text style={styles.capsuleEmoji}>{sealed || futureMine ? '🔒' : '🎁'}</Text>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="bodyMedium" color={colors.encre}>
                    {sealed
                      ? `Capsule de ${item.author_name ?? 'ta moitié'}`
                      : mine ? 'Ta capsule' : `Capsule de ${item.author_name ?? 'ta moitié'}`}
                  </ThemedText>
                  <ThemedText variant="body" color={colors.texteGris} style={{ marginTop: 2 }}>
                    {item.open_date > todayISO()
                      ? `Scellée · s’ouvre le ${frDate(item.open_date)}`
                      : `Ouverte · ${frDate(item.open_date)}`}
                  </ThemedText>
                </View>
                {!sealed ? <Text style={{ fontSize: 20, color: colors.texteGris }}>›</Text> : null}
              </Pressable>
            );
          }}
        />
      )}

      <Pressable style={styles.fab} onPress={() => setCreating(true)}>
        <Text style={styles.fabText}>＋ Nouvelle capsule</Text>
      </Pressable>

      {/* Création */}
      <Modal visible={creating} animationType="slide" onRequestClose={() => setCreating(false)}>
        <Screen edges={['top']}>
          <View style={styles.head}>
            <Pressable onPress={() => { setCreating(false); resetForm(); }} hitSlop={12}>
              <ThemedText variant="bodyMedium" color={colors.corail}>Annuler</ThemedText>
            </Pressable>
            <ThemedText variant="title">Nouvelle capsule</ThemedText>
            <View style={{ width: 60 }} />
          </View>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={{ padding: spacing.lg, gap: spacing.md }}>
                <ThemedText variant="body" color={colors.texteGris}>
                  Écris un petit mot et/ou ajoute une photo. La capsule restera scellée jusqu'à la date choisie 💛
                </ThemedText>
                <Input
                  placeholder="Ton message scellé…"
                  value={msg}
                  onChangeText={setMsg}
                  multiline
                  style={{ minHeight: 120, textAlignVertical: 'top' }}
                />

                {pic ? (
                  <View>
                    <Image source={{ uri: `data:image/${pic.ext};base64,${pic.base64}` }} style={styles.preview} contentFit="cover" />
                    <Pressable onPress={() => setPic(null)} style={{ marginTop: 6 }}>
                      <ThemedText variant="bodyMedium" color={colors.corail}>Retirer la photo</ThemedText>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={pickImage} style={styles.addPhoto}>
                    <Text style={{ fontSize: 22 }}>🖼️</Text>
                    <ThemedText variant="bodyMedium" color={colors.prune}>Ajouter une photo (facultatif)</ThemedText>
                  </Pressable>
                )}

                <Pressable onPress={() => setShowPicker(true)} style={styles.dateRow}>
                  <ThemedText variant="bodyMedium">📅 À ouvrir le</ThemedText>
                  <ThemedText variant="bodyMedium" color={colors.corail}>{frDate(openDate.toISOString().slice(0, 10))}</ThemedText>
                </Pressable>
                {showPicker ? (
                  <DateTimePicker
                    value={openDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    minimumDate={new Date(Date.now() + 86400000)}
                    onChange={(_e, d) => {
                      if (Platform.OS !== 'ios') setShowPicker(false);
                      if (d) setOpenDate(d);
                    }}
                  />
                ) : null}

                <Button title="Sceller la capsule 🔒" onPress={create} loading={sending} />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Screen>
      </Modal>

      {/* Visionneuse */}
      <Modal visible={viewer !== null} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable style={styles.viewerBackdrop} onPress={() => setViewer(null)}>
          <Pressable style={styles.viewerCard} onPress={() => {}}>
            <Text style={styles.viewerEmoji}>🎁</Text>
            {viewer?.image_path && urls[viewer.image_path] ? (
              <Image source={{ uri: urls[viewer.image_path] }} style={styles.viewerImg} contentFit="cover" />
            ) : null}
            {viewer?.message ? (
              <ThemedText variant="body" center style={{ marginTop: spacing.md }}>{viewer.message}</ThemedText>
            ) : null}
            <ThemedText variant="label" color={colors.texteGris} center style={{ marginTop: spacing.md }}>
              {viewer?.author_name ?? ''} · {viewer ? frDate(viewer.open_date) : ''}
            </ThemedText>
            <Button title="Fermer" variant="ghost" onPress={() => setViewer(null)} style={{ marginTop: spacing.md }} />
          </Pressable>
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
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  capsuleSealed: { backgroundColor: colors.cremeDoux, borderStyle: 'dashed' },
  capsuleEmoji: { fontSize: 30 },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    backgroundColor: colors.prune,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    shadowColor: colors.encre,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  fabText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.creme },
  preview: { width: '100%', height: 200, borderRadius: radius.md, backgroundColor: colors.cremeDoux },
  addPhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cremeDoux,
    borderRadius: radius.md,
    padding: spacing.md,
    justifyContent: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  viewerCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.creme,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
  },
  viewerEmoji: { fontSize: 40, marginBottom: spacing.sm },
  viewerImg: { width: '100%', height: 240, borderRadius: radius.lg, backgroundColor: colors.cremeDoux },
});
