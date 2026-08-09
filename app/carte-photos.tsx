import React, { Suspense, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, EmptyState, Screen, ThemedText } from '../src/components/ui';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { colors } from '../src/theme/colors';
import { spacing } from '../src/theme/typography';
import { useCoupleTable } from '../src/hooks/useCoupleTable';
import { useAuth } from '../src/store/auth';
import type { Photo, Memory } from '../src/types/db';
import type { Pin } from '../src/components/PhotoMap';

// Chargé à la demande : le module natif de la carte n'est touché que
// lorsqu'on ouvre cet écran, jamais au démarrage de l'app.
const PhotoMap = React.lazy(() => import('../src/components/PhotoMap'));

function frShort(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Choisit un niveau de zoom qui englobe toutes les épingles. */
function zoomForSpan(pins: Pin[]): number {
  if (pins.length < 2) return 6;
  const lats = pins.map((p) => p.latitude);
  const lngs = pins.map((p) => p.longitude);
  const span = Math.max(
    Math.max(...lats) - Math.min(...lats),
    Math.max(...lngs) - Math.min(...lngs),
  );
  if (span <= 0) return 8;
  const z = Math.log2(360 / span) - 1;
  return Math.max(1, Math.min(12, z));
}

export default function CartePhotos() {
  const router = useRouter();
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const { rows, loading } = useCoupleTable<Photo>('photos');
  const { rows: memories } = useCoupleTable<Memory>('memories', 'memory_date', false);

  const pins = useMemo<Pin[]>(() => {
    const out: Pin[] = [];

    // Vos deux villes.
    if (profile?.city_lat != null && profile?.city_lng != null) {
      out.push({
        id: 'me',
        latitude: profile.city_lat,
        longitude: profile.city_lng,
        title: `${profile.display_name ?? 'Toi'} · ${profile.city_name ?? ''}`.trim(),
        kind: 'me',
      });
    }
    if (partner?.city_lat != null && partner?.city_lng != null) {
      out.push({
        id: 'partner',
        latitude: partner.city_lat,
        longitude: partner.city_lng,
        title: `${partner.display_name ?? 'Ta moitié'} · ${partner.city_name ?? ''}`.trim(),
        kind: 'partner',
      });
    }

    // Photos géolocalisées, regroupées par lieu (~11 km).
    const geo = rows.filter((p) => p.lat != null && p.lng != null);
    const clusters: Record<string, { lat: number; lng: number; photos: Photo[] }> = {};
    for (const p of geo) {
      const key = `${p.lat!.toFixed(1)},${p.lng!.toFixed(1)}`;
      const c = (clusters[key] ??= { lat: 0, lng: 0, photos: [] });
      c.lat += p.lat!;
      c.lng += p.lng!;
      c.photos.push(p);
    }
    for (const [key, c] of Object.entries(clusters)) {
      const n = c.photos.length;
      const first = c.photos[0];
      out.push({
        id: `photo-${key}`,
        latitude: c.lat / n,
        longitude: c.lng / n,
        title: n > 1 ? `${n} souvenirs ici` : first.caption?.trim() || frShort(first.created_at),
        kind: 'photo',
      });
    }

    // Souvenirs du Journal géolocalisés (📔).
    for (const m of memories) {
      if (m.lat == null || m.lng == null) continue;
      out.push({
        id: `memory-${m.id}`,
        latitude: m.lat,
        longitude: m.lng,
        title: m.title?.trim() || frShort(m.memory_date),
        kind: 'memory',
      });
    }
    return out;
  }, [rows, memories, profile, partner]);

  const center = useMemo(() => {
    if (pins.length === 0) return { latitude: 20, longitude: 0 };
    const lat = pins.reduce((s, p) => s + p.latitude, 0) / pins.length;
    const lng = pins.reduce((s, p) => s + p.longitude, 0) / pins.length;
    return { latitude: lat, longitude: lng };
  }, [pins]);

  const header = (
    <View style={styles.head}>
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <ThemedText variant="bodyMedium" color={colors.corail}>‹ Retour</ThemedText>
      </Pressable>
      <ThemedText variant="title">Notre carte 🗺️</ThemedText>
      <Pressable onPress={() => router.push('/souvenirs')} hitSlop={12}>
        <ThemedText variant="bodyMedium" color={colors.corail}>Liste</ThemedText>
      </Pressable>
    </View>
  );

  const mapFallback = (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <EmptyState
        emoji="🗺️"
        title="Carte indisponible"
        subtitle="La carte n'a pas pu se charger sur cet appareil. Vos souvenirs restent consultables en liste."
      />
      <Button title="📸 Voir la liste par lieu" onPress={() => router.push('/souvenirs')} style={{ margin: spacing.lg }} />
    </View>
  );

  return (
    <Screen edges={['top']}>
      {header}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.prune} />
        </View>
      ) : pins.length === 0 ? (
        <EmptyState
          emoji="📍"
          title="Rien à afficher pour l'instant"
          subtitle="Choisissez vos villes et ajoutez des photos géolocalisées : elles apparaîtront ici comme des épingles."
        />
      ) : (
        <View style={{ flex: 1 }}>
          <ErrorBoundary fallback={mapFallback}>
            <Suspense
              fallback={
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color={colors.prune} />
                </View>
              }
            >
              <PhotoMap
                center={center}
                zoom={zoomForSpan(pins)}
                pins={pins}
                onPinPress={(pin) => {
                  if (pin.kind === 'photo') router.push('/souvenirs');
                  else if (pin.kind === 'memory') router.push('/journal');
                }}
              />
            </Suspense>
          </ErrorBoundary>
          <View style={styles.legend}>
            <Text style={styles.legendItem}>💛 Toi</Text>
            <Text style={styles.legendItem}>💚 Ta moitié</Text>
            <Text style={styles.legendItem}>📷 Photos</Text>
            <Text style={styles.legendItem}>📔 Journal</Text>
          </View>
        </View>
      )}
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
  legend: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: 'rgba(27,27,58,0.82)',
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  legendItem: { color: colors.creme, fontSize: 13 },
});
