import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { Screen, ThemedText, EmptyState } from '../src/components/ui';
import { colors } from '../src/theme/colors';
import { fonts, radius, spacing } from '../src/theme/typography';
import { useCoupleTable } from '../src/hooks/useCoupleTable';
import { supabase } from '../src/lib/supabase';
import type { Photo } from '../src/types/db';

type Place = { name: string; count: number; photos: Photo[] };

export default function Souvenirs() {
  const router = useRouter();
  const { rows, loading } = useCoupleTable<Photo>('photos');
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [viewer, setViewer] = useState<Photo | null>(null);

  const geoPhotos = useMemo(
    () => rows.filter((p) => p.lat != null && p.lng != null),
    [rows],
  );
  const noPlaceCount = rows.length - geoPhotos.length;

  // Regroupe par lieu (arrondi ~11 km) puis nomme chaque lieu (Apple géocode).
  useEffect(() => {
    let active = true;
    (async () => {
      if (geoPhotos.length === 0) {
        setPlaces([]);
        return;
      }
      const clusters: Record<string, { photos: Photo[]; lat: number; lng: number }> = {};
      for (const p of geoPhotos) {
        const key = `${p.lat!.toFixed(1)},${p.lng!.toFixed(1)}`;
        const c = (clusters[key] ??= { photos: [], lat: 0, lng: 0 });
        c.photos.push(p);
        c.lat += p.lat!;
        c.lng += p.lng!;
      }
      const list = Object.values(clusters).map((c) => ({
        photos: c.photos.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
        lat: c.lat / c.photos.length,
        lng: c.lng / c.photos.length,
      }));
      const out: Place[] = [];
      for (const c of list) {
        let name = 'Quelque part 🌍';
        try {
          const g = await Location.reverseGeocodeAsync({ latitude: c.lat, longitude: c.lng });
          const a = g[0];
          if (a) name = [a.city ?? a.subregion ?? a.region, a.country].filter(Boolean).join(', ') || name;
        } catch {}
        out.push({ name, count: c.photos.length, photos: c.photos });
      }
      out.sort((a, b) => b.count - a.count);
      if (active) setPlaces(out);
    })();
    return () => {
      active = false;
    };
  }, [geoPhotos]);

  // URLs signées pour les vignettes.
  useEffect(() => {
    const paths = geoPhotos.map((p) => p.storage_path).filter((p) => !urls[p]);
    if (paths.length === 0) return;
    (async () => {
      const { data } = await supabase.storage.from('photos').createSignedUrls(paths, 60 * 60);
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
  }, [geoPhotos, urls]);

  return (
    <Screen edges={['top']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ThemedText variant="bodyMedium" color={colors.corail}>‹ Retour</ThemedText>
        </Pressable>
        <ThemedText variant="title">Nos souvenirs 📍</ThemedText>
        <View style={{ width: 50 }} />
      </View>

      {loading || places === null ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.prune} />
        </View>
      ) : places.length === 0 ? (
        <EmptyState
          emoji="🗺️"
          title="Pas encore de lieu"
          subtitle="Ajoutez des photos à l'album : celles qui contiennent leur position apparaîtront ici, regroupées par endroit."
        />
      ) : (
        <FlatList
          data={places}
          keyExtractor={(p, i) => p.name + i}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 }}
          ListHeaderComponent={
            <ThemedText variant="body" color={colors.texteGris} style={{ marginBottom: spacing.sm }}>
              {geoPhotos.length} photo{geoPhotos.length > 1 ? 's' : ''} · {places.length} lieu{places.length > 1 ? 'x' : ''}
              {noPlaceCount > 0 ? ` · ${noPlaceCount} sans position` : ''}
            </ThemedText>
          }
          renderItem={({ item }) => (
            <View>
              <View style={styles.placeRow}>
                <Text style={{ fontSize: 18 }}>📍</Text>
                <ThemedText variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>
                  {item.name}
                </ThemedText>
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt}>{item.count}</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 8 }}>
                {item.photos.map((p) => (
                  <Pressable key={p.id} onPress={() => setViewer(p)}>
                    <Image source={{ uri: urls[p.storage_path] }} style={styles.thumb} contentFit="cover" transition={200} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        />
      )}

      <Modal visible={!!viewer} transparent animationType="fade">
        <Pressable style={styles.viewer} onPress={() => setViewer(null)}>
          {viewer ? (
            <>
              <Image source={{ uri: urls[viewer.storage_path] }} style={styles.full} contentFit="contain" />
              {viewer.caption ? <Text style={styles.caption}>{viewer.caption}</Text> : null}
            </>
          ) : null}
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
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { backgroundColor: colors.prune, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeTxt: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.creme },
  thumb: { width: 110, height: 110, borderRadius: radius.md, backgroundColor: colors.cremeDoux },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%', height: '80%' },
  caption: { color: '#fff', fontSize: 16, padding: spacing.lg, textAlign: 'center' },
});
