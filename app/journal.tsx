import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, EmptyState, Input, Screen, ThemedText } from '../src/components/ui';
import { colors } from '../src/theme/colors';
import { fonts, radius, spacing } from '../src/theme/typography';
import { useCoupleTable } from '../src/hooks/useCoupleTable';
import { useAuth } from '../src/store/auth';
import { supabase } from '../src/lib/supabase';
import type { Memory } from '../src/types/db';

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatDate(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

export default function Journal() {
  const router = useRouter();
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const { rows, loading, reload } = useCoupleTable<Memory>('memories', 'memory_date', false);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => { setRefreshing(true); await reload(); setRefreshing(false); };

  const [urls, setUrls] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<{ base64: string; ext: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);

  // URLs signées des photos.
  useEffect(() => {
    const paths = rows.map((r) => r.photo_path).filter((p): p is string => !!p && !urls[p]);
    if (paths.length === 0) return;
    (async () => {
      const { data } = await supabase.storage.from('photos').createSignedUrls(paths, 60 * 60);
      if (data) {
        setUrls((prev) => {
          const next = { ...prev };
          data.forEach((d) => { if (d.signedUrl && d.path) next[d.path] = d.signedUrl; });
          return next;
        });
      }
    })();
  }, [rows, urls]);

  const reset = () => {
    setDate(new Date());
    setTitle('');
    setBody('');
    setPhoto(null);
    setShowPicker(Platform.OS === 'ios');
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Accès refusé', 'Autorise l’accès aux photos dans les réglages.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, base64: true });
    if (res.canceled || !res.assets[0]?.base64) return;
    const ext = (res.assets[0].uri.split('.').pop() || 'jpg').toLowerCase();
    setPhoto({ base64: res.assets[0].base64!, ext: ext === 'png' ? 'png' : 'jpg' });
  };

  const save = async () => {
    if (!couple || !profile) return;
    if (!body.trim() && !title.trim() && !photo) {
      Alert.alert('Souvenir vide', 'Ajoute au moins un mot ou une photo 💛');
      return;
    }
    setSaving(true);
    try {
      let photo_path: string | null = null;
      if (photo) {
        photo_path = `${couple.id}/mem-${Date.now()}.${photo.ext}`;
        const { error } = await supabase.storage
          .from('photos')
          .upload(photo_path, decode(photo.base64), { contentType: photo.ext === 'png' ? 'image/png' : 'image/jpeg' });
        if (error) throw error;
      }
      await supabase.from('memories').insert({
        couple_id: couple.id,
        author_id: profile.id,
        title: title.trim() || null,
        body: body.trim() || null,
        photo_path,
        memory_date: toISODate(date),
      });
      setOpen(false);
      reset();
    } catch (e: any) {
      Alert.alert('Oups', e?.message ?? 'Impossible d’enregistrer.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (m: Memory) => {
    if (m.author_id !== profile?.id) return;
    Alert.alert('Supprimer ce souvenir ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => { await supabase.from('memories').delete().eq('id', m.id); } },
    ]);
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ThemedText variant="bodyMedium" color={colors.corail}>‹ Retour</ThemedText>
        </Pressable>
        <ThemedText variant="title">Notre journal 📔</ThemedText>
        <View style={{ width: 50 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.prune} />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState emoji="📔" title="Votre histoire commence ici" subtitle="Ajoutez votre premier souvenir : une date, quelques mots, une photo." />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(m) => m.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.prune} />}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          renderItem={({ item, index }) => {
            const mine = item.author_id === profile?.id;
            return (
              <View style={styles.row}>
                <View style={styles.rail}>
                  <View style={[styles.line, index === 0 && { top: 14 }, index === rows.length - 1 && { bottom: '50%' }]} />
                  <View style={[styles.dot, { backgroundColor: mine ? colors.ambre : colors.corail }]} />
                </View>
                <Pressable onLongPress={() => remove(item)} style={styles.card}>
                  <Text style={styles.date}>{formatDate(item.memory_date)}</Text>
                  {item.title ? <ThemedText variant="bodyMedium" style={{ marginTop: 2 }}>{item.title}</ThemedText> : null}
                  {item.photo_path && urls[item.photo_path] ? (
                    <Pressable onPress={() => setViewer(urls[item.photo_path!])}>
                      <Image source={{ uri: urls[item.photo_path] }} style={styles.photo} contentFit="cover" transition={200} />
                    </Pressable>
                  ) : null}
                  {item.body ? <ThemedText variant="body" color={colors.texteSombre} style={{ marginTop: 6 }}>{item.body}</ThemedText> : null}
                </Pressable>
              </View>
            );
          }}
        />
      )}

      <View style={styles.addBar}>
        <Button title="＋ Ajouter un souvenir" onPress={() => { reset(); setOpen(true); }} />
      </View>

      {/* Modal d'ajout */}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <Screen>
          <View style={styles.head}>
            <ThemedText variant="displaySmall">Nouveau souvenir</ThemedText>
            <Pressable onPress={() => setOpen(false)}>
              <ThemedText variant="bodyMedium" color={colors.corail}>Fermer</ThemedText>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
            <ThemedText variant="label" color={colors.texteGris}>QUAND ?</ThemedText>
            {Platform.OS === 'android' && (
              <Button title={formatDate(toISODate(date))} variant="secondary" onPress={() => setShowPicker(true)} />
            )}
            {showPicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onChange={(_, d) => {
                  if (Platform.OS === 'android') setShowPicker(false);
                  if (d) setDate(d);
                }}
              />
            )}
            <Input placeholder="Titre (optionnel)" value={title} onChangeText={setTitle} />
            <Input placeholder="Racontez ce moment…" value={body} onChangeText={setBody} multiline style={{ minHeight: 100 }} />
            {photo ? (
              <Image source={{ uri: `data:image/${photo.ext};base64,${photo.base64}` }} style={styles.preview} contentFit="cover" />
            ) : null}
            <Button title={photo ? '📷 Changer la photo' : '📷 Ajouter une photo'} variant="secondary" onPress={pickPhoto} />
            <Button title="Enregistrer le souvenir 💛" onPress={save} loading={saving} />
          </ScrollView>
        </Screen>
      </Modal>

      {/* Visionneuse */}
      <Modal visible={!!viewer} transparent animationType="fade">
        <Pressable style={styles.viewer} onPress={() => setViewer(null)}>
          {viewer ? <Image source={{ uri: viewer }} style={styles.full} contentFit="contain" /> : null}
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
  row: { flexDirection: 'row', gap: spacing.md },
  rail: { width: 22, alignItems: 'center' },
  line: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: colors.bordure },
  dot: { width: 14, height: 14, borderRadius: 7, marginTop: 8, borderWidth: 2, borderColor: colors.creme },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  date: { fontFamily: fonts.monoMedium, fontSize: 12, color: colors.prune, letterSpacing: 0.5 },
  photo: { width: '100%', height: 200, borderRadius: radius.md, marginTop: 8, backgroundColor: colors.cremeDoux },
  preview: { width: '100%', height: 200, borderRadius: radius.md },
  addBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.creme,
    borderTopWidth: 1,
    borderTopColor: colors.bordure,
  },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%', height: '80%' },
});
