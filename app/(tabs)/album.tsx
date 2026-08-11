import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { decode } from 'base64-arraybuffer';
import { gpsFromExif } from '../../src/lib/exifgps';
import {
  Button,
  EmptyState,
  Input,
  Screen,
  ScreenHeader,
  ThemedText,
} from '../../src/components/ui';
import { colors } from '../../src/theme/colors';
import { radius, spacing } from '../../src/theme/typography';
import { useCoupleTable } from '../../src/hooks/useCoupleTable';
import { useAuth } from '../../src/store/auth';
import { supabase } from '../../src/lib/supabase';
import type { Photo } from '../../src/types/db';
import { DAY_SLOTS, slotTag, todayKey } from '../../src/lib/dayphotos';
import { fonts } from '../../src/theme/typography';

const GAP = 4;
const COLS = 3;
const SIZE = (Dimensions.get('window').width - GAP * (COLS - 1)) / COLS;

export default function Album() {
  const { rows, loading, reload } = useCoupleTable<Photo>('photos');
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => { setRefreshing(true); await reload(); setRefreshing(false); };
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);

  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<{
    base64: string;
    ext: string;
    lat: number | null;
    lng: number | null;
  } | null>(null);
  const [caption, setCaption] = useState('');
  const [viewer, setViewer] = useState<Photo | null>(null);
  const [pendingChallenge, setPendingChallenge] = useState<string | null>(null);
  const [dayOpen, setDayOpen] = useState(true);

  // Mémorise l'état plié/déplié du défi « journée à deux ».
  useEffect(() => {
    AsyncStorage.getItem('fil_album_day_open').then((v) => {
      if (v === '0') setDayOpen(false);
    });
  }, []);
  const toggleDay = () => {
    setDayOpen((o) => {
      const next = !o;
      AsyncStorage.setItem('fil_album_day_open', next ? '1' : '0');
      return next;
    });
  };

  const dayKey = todayKey();
  // Photos de la journée, rangées par créneau : { slotKey: { mine, theirs } }
  const dayPhotos = React.useMemo(() => {
    const map: Record<string, { mine?: Photo; theirs?: Photo }> = {};
    for (const slot of DAY_SLOTS) map[slot.key] = {};
    for (const p of rows) {
      if (!p.challenge || !p.challenge.startsWith(`${dayKey}#`)) continue;
      const slotKey = p.challenge.split('#')[1];
      if (!map[slotKey]) continue;
      if (p.author_id === profile?.id) map[slotKey].mine = p;
      else if (p.author_id === partner?.id) map[slotKey].theirs = p;
    }
    return map;
  }, [rows, dayKey, profile?.id, partner?.id]);

  // On génère des URLs signées pour afficher les photos (bucket privé).
  useEffect(() => {
    const paths = rows.map((r) => r.storage_path).filter((p) => !urls[p]);
    if (paths.length === 0) return;
    (async () => {
      const { data } = await supabase.storage
        .from('photos')
        .createSignedUrls(paths, 60 * 60);
      if (data) {
        setUrls((prev) => {
          const next = { ...prev };
          data.forEach((d) => {
            if (d.signedUrl && d.path) next[d.path] = d.signedUrl;
          });
          return next;
        });
      }
    })();
  }, [rows, urls]);

  const pick = async (slotKey?: string, slotLabel?: string) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Accès aux photos refusé',
        'Autorise l’accès dans les réglages pour ajouter des photos.',
      );
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
      exif: true,
    });
    if (res.canceled || !res.assets[0]?.base64) return;
    const asset = res.assets[0];
    const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();

    // Où la photo a-t-elle été prise ? EXIF d'abord, sinon la position actuelle.
    let loc = gpsFromExif(asset.exif);
    if (!loc) {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.granted) {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
      } catch {}
    }

    setPending({
      base64: asset.base64!,
      ext: ext === 'png' ? 'png' : 'jpg',
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
    });
    setPendingChallenge(slotKey ? slotTag(slotKey) : null);
    setCaption(slotLabel ?? '');
  };

  const upload = async () => {
    if (!pending || !couple || !profile) return;
    setUploading(true);
    try {
      const path = `${couple.id}/${Date.now()}.${pending.ext}`;
      const { error: upErr } = await supabase.storage
        .from('photos')
        .upload(path, decode(pending.base64), {
          contentType: pending.ext === 'png' ? 'image/png' : 'image/jpeg',
        });
      if (upErr) throw upErr;

      await supabase.from('photos').insert({
        couple_id: couple.id,
        author_id: profile.id,
        storage_path: path,
        caption: caption.trim() || null,
        challenge: pendingChallenge,
        lat: pending.lat,
        lng: pending.lng,
      });
      setPending(null);
      setCaption('');
      setPendingChallenge(null);
    } catch (e: any) {
      Alert.alert('Envoi impossible', e?.message ?? 'Réessaie.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Album" subtitle="Vos souvenirs partagés" />
      <FlatList
        data={rows}
        keyExtractor={(p) => p.id}
        numColumns={COLS}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={{ gap: GAP, padding: spacing.md, paddingBottom: 160 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.prune} />}
        ListHeaderComponent={
          <View style={styles.routineCard}>
            <Pressable onPress={toggleDay} style={styles.routineHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.challengeTag}>📸 VOTRE JOURNÉE À DEUX</Text>
                <ThemedText variant="body" color={colors.cremeDoux} style={{ marginTop: 2 }}>
                  {dayOpen ? 'Immortalisez chaque moment, chacun de votre côté 💛' : 'Touche pour dérouler les moments du jour'}
                </ThemedText>
              </View>
              <Text style={styles.routineChevron}>{dayOpen ? '⌃' : '⌄'}</Text>
            </Pressable>
            {dayOpen && DAY_SLOTS.map((slot) => {
              const mine = dayPhotos[slot.key]?.mine;
              const theirs = dayPhotos[slot.key]?.theirs;
              return (
                <View key={slot.key} style={styles.slotRow}>
                  <View style={styles.slotHeader}>
                    <Text style={{ fontSize: 18 }}>{slot.emoji}</Text>
                    <Text style={styles.slotRowLabel} numberOfLines={1}>
                      {slot.label}
                    </Text>
                  </View>
                  <View style={styles.slotThumbs}>
                    <ChallengeSlot
                      label="Toi"
                      photo={mine}
                      url={mine ? urls[mine.storage_path] : undefined}
                      onAdd={() => pick(slot.key, slot.label)}
                      onView={() => mine && setViewer(mine)}
                      isMine
                    />
                    <ChallengeSlot
                      label={partner?.display_name ?? 'Ta moitié'}
                      photo={theirs}
                      url={theirs ? urls[theirs.storage_path] : undefined}
                      onView={() => theirs && setViewer(theirs)}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.prune} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState
              emoji="📸"
              title="Album vide"
              subtitle="Ajoutez votre première photo ci-dessous."
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => setViewer(item)}>
            <Image
              source={{ uri: urls[item.storage_path] }}
              style={styles.thumb}
              contentFit="cover"
              transition={200}
            />
          </Pressable>
        )}
      />

      <View style={styles.addBar}>
        <Button title="＋ Ajouter une photo" onPress={() => pick()} />
      </View>

      {/* Aperçu + légende avant envoi */}
      <Modal visible={!!pending} transparent animationType="slide">
        <Pressable style={styles.backdrop} onPress={() => setPending(null)} />
        <View style={styles.sheet}>
          <ThemedText variant="title" center>
            Ajouter une légende
          </ThemedText>
          {pending ? (
            <Image
              source={{ uri: `data:image/${pending.ext};base64,${pending.base64}` }}
              style={styles.preview}
              contentFit="cover"
            />
          ) : null}
          <Input
            placeholder="Une petite légende…"
            value={caption}
            onChangeText={setCaption}
          />
          <Button
            title="Ajouter à l'album"
            onPress={upload}
            loading={uploading}
          />
        </View>
      </Modal>

      {/* Visionneuse plein écran */}
      <Modal visible={!!viewer} transparent animationType="fade">
        <Pressable style={styles.viewer} onPress={() => setViewer(null)}>
          {viewer ? (
            <>
              <Image
                source={{ uri: urls[viewer.storage_path] }}
                style={styles.full}
                contentFit="contain"
              />
              {viewer.caption ? (
                <Text style={styles.viewerCaption}>{viewer.caption}</Text>
              ) : null}
            </>
          ) : null}
        </Pressable>
      </Modal>
    </Screen>
  );
}

function ChallengeSlot({
  label,
  photo,
  url,
  onAdd,
  onView,
  isMine,
}: {
  label: string;
  photo?: Photo;
  url?: string;
  onAdd?: () => void;
  onView?: () => void;
  isMine?: boolean;
}) {
  return (
    <View style={styles.slot}>
      {photo ? (
        <Pressable onPress={onView}>
          <Image source={{ uri: url }} style={styles.slotImg} contentFit="cover" transition={200} />
        </Pressable>
      ) : isMine ? (
        <Pressable onPress={onAdd} style={[styles.slotImg, styles.slotEmpty]}>
          <Text style={{ fontSize: 26 }}>＋</Text>
          <Text style={styles.slotAddTxt}>Relève le défi</Text>
        </Pressable>
      ) : (
        <View style={[styles.slotImg, styles.slotEmpty]}>
          <Text style={{ fontSize: 22, opacity: 0.6 }}>⏳</Text>
          <Text style={styles.slotWaitTxt}>En attente…</Text>
        </View>
      )}
      <Text style={styles.slotLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  routineCard: {
    backgroundColor: colors.prune,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  routineHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routineChevron: {
    fontSize: 22,
    color: colors.cremeDoux,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  challengeTag: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.ambre,
  },
  slotRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.bordureClaire,
  },
  slotHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  slotRowLabel: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.creme, flex: 1 },
  slotThumbs: { flexDirection: 'row', gap: spacing.md },
  slot: { flex: 1, alignItems: 'center', gap: 6 },
  slotImg: {
    width: '100%',
    height: 90,
    borderRadius: radius.md,
    backgroundColor: colors.encreDoux,
  },
  slotEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bordureClaire,
    borderStyle: 'dashed',
  },
  slotAddTxt: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.creme, marginTop: 2 },
  slotWaitTxt: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.cremeDoux, marginTop: 2 },
  slotLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.creme },
  thumb: { width: SIZE, height: SIZE, borderRadius: 6, backgroundColor: colors.cremeDoux },
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
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.creme,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: spacing.md,
  },
  preview: { width: '100%', height: 260, borderRadius: radius.md },
  viewer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  full: { width: '100%', height: '80%' },
  viewerCaption: {
    color: '#fff',
    fontSize: 16,
    padding: spacing.lg,
    textAlign: 'center',
  },
});
