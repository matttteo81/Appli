import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { EmptyState, Input, Screen, ThemedText } from '../../src/components/ui';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { fetchWeather } from '../../src/lib/weather';
import { colors } from '../../src/theme/colors';
import { fonts, radius, spacing } from '../../src/theme/typography';
import { useAuth } from '../../src/store/auth';
import { useCoupleTable } from '../../src/hooks/useCoupleTable';
import { City, searchCities } from '../../src/lib/cities';
import { distanceKm } from '../../src/lib/geo';
import { supabase } from '../../src/lib/supabase';
import type { Photo, Memory } from '../../src/types/db';
import type { Pin, PhotoMapHandle } from '../../src/components/PhotoMap';

// Carte interactive (react-native-maps / Apple Maps) chargée à la demande.
const PhotoMap = React.lazy(() => import('../../src/components/PhotoMap'));

type LatLng = { latitude: number; longitude: number };

const VIEWER_W = Dimensions.get('window').width;

/** Niveau de zoom qui englobe un ensemble de points. */
function zoomForSpan(coords: LatLng[]): number {
  if (coords.length < 2) return 5;
  const lats = coords.map((c) => c.latitude);
  const lngs = coords.map((c) => c.longitude);
  const span = Math.max(
    Math.max(...lats) - Math.min(...lats),
    Math.max(...lngs) - Math.min(...lngs),
  );
  if (span <= 0) return 8;
  return Math.max(1, Math.min(12, Math.log2(360 / span) - 1));
}

function fitOf(coords: LatLng[]): { center: LatLng; zoom: number } {
  if (coords.length === 0) return { center: { latitude: 20, longitude: 0 }, zoom: 1.5 };
  const lat = coords.reduce((s, c) => s + c.latitude, 0) / coords.length;
  const lng = coords.reduce((s, c) => s + c.longitude, 0) / coords.length;
  return { center: { latitude: lat, longitude: lng }, zoom: zoomForSpan(coords) };
}

function frShort(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

/** Formatage du nombre de km, tolérant aux moteurs sans Intl complet. */
function kmLabel(km: number): string {
  try {
    return km.toLocaleString('fr-FR');
  } catch {
    return String(Math.round(km));
  }
}

/**
 * Repli plein écran si l'écran Carte lève une erreur au rendu : on affiche un
 * message doux au lieu de faire tomber toute l'application.
 */
function MapScreenFallback() {
  return (
    <Screen edges={['top']}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          emoji="🗺️"
          title="Carte momentanément indisponible"
          subtitle="Réessaie dans un instant. Le reste de l'application fonctionne normalement."
        />
      </View>
    </Screen>
  );
}

export default function MapScreen() {
  // Toute erreur inattendue sur cet écran est rattrapée ici : plus de crash.
  return (
    <ErrorBoundary fallback={<MapScreenFallback />}>
      <MapScreenInner />
    </ErrorBoundary>
  );
}

function MapScreenInner() {
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const updateProfile = useAuth((s) => s.updateProfile);
  const { rows: photos } = useCoupleTable<Photo>('photos');
  const { rows: memories } = useCoupleTable<Memory>('memories', 'memory_date', false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [avatarUrls, setAvatarUrls] = useState<{ me?: string; partner?: string }>({});
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [viewer, setViewer] = useState<Photo[] | null>(null);
  // Le point bleu « ma position » n'est activé qu'une fois la permission
  // accordée : activer la localisation MapKit sans autorisation peut faire
  // planter la carte sur iOS.
  const [canShowLocation, setCanShowLocation] = useState(false);
  const mapRef = useRef<PhotoMapHandle>(null);

  useEffect(() => {
    let active = true;
    Location.getForegroundPermissionsAsync()
      .then((p) => { if (active) setCanShowLocation(p.granted); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const meHasCity = profile?.city_lat != null && profile?.city_lng != null;
  const partnerHasCity = partner?.city_lat != null && partner?.city_lng != null;

  const mePos: LatLng | null = meHasCity
    ? { latitude: profile!.city_lat!, longitude: profile!.city_lng! }
    : null;
  const partnerPos: LatLng | null = partnerHasCity
    ? { latitude: partner!.city_lat!, longitude: partner!.city_lng! }
    : null;

  const distance = useMemo(
    () => (mePos && partnerPos
      ? distanceKm(mePos.latitude, mePos.longitude, partnerPos.latitude, partnerPos.longitude)
      : null),
    [mePos, partnerPos],
  );

  // URLs signées des photos de profil (bucket privé).
  useEffect(() => {
    const paths = [profile?.avatar_path, partner?.avatar_path].filter((p): p is string => !!p);
    if (paths.length === 0) { setAvatarUrls({}); return; }
    let active = true;
    (async () => {
      const { data } = await supabase.storage.from('photos').createSignedUrls(paths, 60 * 60);
      if (!active || !data) return;
      const map: Record<string, string> = {};
      data.forEach((d) => { if (d.signedUrl && d.path) map[d.path] = d.signedUrl; });
      setAvatarUrls({
        me: profile?.avatar_path ? map[profile.avatar_path] : undefined,
        partner: partner?.avatar_path ? map[partner.avatar_path] : undefined,
      });
    })();
    return () => { active = false; };
  }, [profile?.avatar_path, partner?.avatar_path]);

  // URLs signées des photos géolocalisées (pour les vignettes + la visionneuse).
  const geoKey = photos
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => p.storage_path)
    .join(',');
  useEffect(() => {
    const paths = geoKey ? geoKey.split(',').filter(Boolean) : [];
    if (paths.length === 0) { setPhotoUrls({}); return; }
    let active = true;
    (async () => {
      const { data } = await supabase.storage.from('photos').createSignedUrls(paths, 60 * 60);
      if (!active || !data) return;
      const map: Record<string, string> = {};
      data.forEach((d) => { if (d.signedUrl && d.path) map[d.path] = d.signedUrl; });
      setPhotoUrls(map);
    })();
    return () => { active = false; };
  }, [geoKey]);

  // Toutes les épingles : vous deux + photos géolocalisées + souvenirs du Journal.
  const { pins, photoGroups } = useMemo(() => {
    const out: Pin[] = [];
    const groups: Record<string, Photo[]> = {};
    if (mePos) {
      out.push({ id: 'me', ...mePos, kind: 'me', title: profile?.display_name ?? 'Toi' });
    }
    if (partnerPos) {
      out.push({ id: 'partner', ...partnerPos, kind: 'partner', title: partner?.display_name ?? 'Ta moitié' });
    }

    // Photos regroupées par lieu (~11 km) → vignette façon Snap Map.
    const geo = photos.filter((p) => p.lat != null && p.lng != null);
    const clusters: Record<string, { lat: number; lng: number; items: Photo[] }> = {};
    for (const p of geo) {
      const key = `${p.lat!.toFixed(1)},${p.lng!.toFixed(1)}`;
      const c = (clusters[key] ??= { lat: 0, lng: 0, items: [] });
      c.lat += p.lat!; c.lng += p.lng!; c.items.push(p);
    }
    for (const [key, c] of Object.entries(clusters)) {
      const n = c.items.length;
      const id = `photo-${key}`;
      // Photo la plus récente en premier (vignette + ouverture).
      const sorted = [...c.items].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      groups[id] = sorted;
      out.push({
        id,
        latitude: c.lat / n,
        longitude: c.lng / n,
        title: n > 1 ? `${n} photos ici` : sorted[0].caption?.trim() || frShort(sorted[0].created_at),
        kind: 'photo',
        imageUrl: photoUrls[sorted[0].storage_path],
        count: n,
      });
    }

    // Souvenirs du Journal géolocalisés.
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
    return { pins: out, photoGroups: groups };
  }, [mePos, partnerPos, photos, memories, photoUrls, profile?.display_name, partner?.display_name]);

  // Ouvre la visionneuse quand on tape une vignette photo.
  const onPinPress = (pin: Pin) => {
    if (pin.id.startsWith('photo-') && photoGroups[pin.id]?.length) {
      setViewer(photoGroups[pin.id]);
    }
  };

  // Zoom rapproché sur une personne (tape son avatar dans le bandeau).
  const zoomTo = (pos: LatLng | null) => {
    if (pos) mapRef.current?.setCameraPosition({ coordinates: pos, zoom: 13 });
  };

  const initial = useMemo(() => fitOf(pins.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))), [pins]);

  const useExactLocation = async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Localisation refusée', 'Autorise la localisation dans les réglages pour utiliser ta position exacte.');
        return;
      }
      setCanShowLocation(true);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      let cityName = 'Ma position';
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        const g = geo[0];
        if (g) cityName = [g.city ?? g.subregion, g.country].filter(Boolean).join(', ');
      } catch {}
      const w = await fetchWeather(latitude, longitude);
      await updateProfile({
        city_name: cityName, city_lat: latitude, city_lng: longitude,
        timezone: w?.timezone ?? profile?.timezone ?? null,
      });
    } catch (e: any) {
      Alert.alert('Oups', e?.message ?? 'Localisation impossible.');
    } finally {
      setLocating(false);
    }
  };

  const results = useMemo(() => searchCities(query), [query]);
  const chooseCity = async (city: City) => {
    setPickerOpen(false);
    setQuery('');
    await updateProfile({
      city_name: `${city.name}, ${city.country}`,
      city_lat: city.lat, city_lng: city.lng, timezone: city.timezone,
    });
  };

  const mapFallback = (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <EmptyState
        emoji="🗺️"
        title="Carte indisponible"
        subtitle="La carte n'a pas pu se charger sur cet appareil."
      />
    </View>
  );

  return (
    <Screen edges={['top']} background="transparent">
      <View style={StyleSheet.absoluteFill}>
        <ErrorBoundary fallback={mapFallback}>
          <Suspense
            fallback={
              <View style={[StyleSheet.absoluteFill, styles.loading]}>
                <ActivityIndicator color={colors.creme} />
              </View>
            }
          >
            <PhotoMap
              ref={mapRef}
              center={initial.center}
              zoom={initial.zoom}
              pins={pins}
              satellite
              showUserLocation={canShowLocation}
              onPinPress={onPinPress}
            />
          </Suspense>
        </ErrorBoundary>
      </View>

      {/* Bandeau distance : large et fin */}
      <View style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.distanceBar}>
          <Text style={styles.distanceText} numberOfLines={1}>
            {distance != null
              ? `✈️  ${kmLabel(distance)} km vous séparent`
              : 'Choisissez vos villes'}
          </Text>
        </View>

        {/* Vous deux : touchez un visage pour zoomer précisément dessus. */}
        {mePos || partnerPos ? (
          <View style={styles.peopleChip}>
            <PersonMini
              url={avatarUrls.me}
              emoji={profile?.avatar_emoji}
              city={profile?.city_name}
              ring={colors.ambre}
              onPress={() => zoomTo(mePos)}
            />
            <View style={styles.chipDivider} />
            <PersonMini
              url={avatarUrls.partner}
              emoji={partner?.avatar_emoji}
              city={partner?.city_name}
              ring={colors.sauge}
              onPress={() => zoomTo(partnerPos)}
            />
          </View>
        ) : null}
      </View>

      {/* Contrôles position (pastilles compactes) */}
      <View style={styles.bottomBar} pointerEvents="box-none">
        <Pressable
          onPress={useExactLocation}
          disabled={locating}
          style={[styles.miniBtn, styles.miniPrimary, locating && { opacity: 0.7 }]}
        >
          {locating ? (
            <ActivityIndicator color={colors.encre} size="small" />
          ) : (
            <Text style={styles.miniPrimaryText}>📍 Ma position exacte</Text>
          )}
        </Pressable>
        <Pressable onPress={() => setPickerOpen(true)} style={[styles.miniBtn, styles.miniGhost]}>
          <Text style={styles.miniGhostText}>Ou choisir une ville</Text>
        </Pressable>
      </View>

      {/* Recherche de ville */}
      <Modal visible={pickerOpen} animationType="slide">
        <Screen>
          <View style={{ padding: spacing.lg, gap: spacing.md, flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <ThemedText variant="displaySmall">Ta ville</ThemedText>
              <Pressable onPress={() => setPickerOpen(false)}>
                <ThemedText variant="bodyMedium" color={colors.corail}>Fermer</ThemedText>
              </Pressable>
            </View>
            <Input placeholder="Rechercher une ville…" value={query} onChangeText={setQuery} autoFocus />
            <FlatList
              data={results}
              keyExtractor={(c) => `${c.name}-${c.country}`}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable onPress={() => chooseCity(item)} style={styles.cityRow}>
                  <View>
                    <ThemedText variant="bodyMedium">{item.name}</ThemedText>
                    <ThemedText variant="body" color={colors.texteGris}>{item.country}</ThemedText>
                  </View>
                  <Text style={{ fontSize: 18 }}>📍</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <ThemedText variant="body" color={colors.texteGris} center style={{ marginTop: spacing.lg }}>
                  Aucune ville trouvée. Essaie une grande ville proche.
                </ThemedText>
              }
            />
          </View>
        </Screen>
      </Modal>

      {/* Visionneuse photo (au tap d'une vignette) */}
      <Modal visible={viewer !== null} animationType="fade" transparent onRequestClose={() => setViewer(null)}>
        <View style={styles.viewerBackdrop}>
          <FlatList
            data={viewer ?? []}
            keyExtractor={(p) => p.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={{ width: VIEWER_W, alignItems: 'center', justifyContent: 'center' }}>
                <Image
                  source={{ uri: photoUrls[item.storage_path] }}
                  style={styles.viewerImg}
                  contentFit="contain"
                />
                {item.caption ? (
                  <Text style={styles.viewerCaption} numberOfLines={2}>{item.caption}</Text>
                ) : null}
              </View>
            )}
          />
          <Pressable style={styles.viewerClose} onPress={() => setViewer(null)} hitSlop={12}>
            <Text style={styles.viewerCloseTxt}>✕</Text>
          </Pressable>
        </View>
      </Modal>
    </Screen>
  );
}

/** Petite pastille : photo de profil (ou emoji) + ville. Touche pour zoomer. */
function PersonMini({
  url, emoji, city, ring, onPress,
}: { url?: string; emoji?: string | null; city?: string | null; ring: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.personMini} onPress={onPress} hitSlop={6}>
      <View style={[styles.avatar, { borderColor: ring }]}>
        {url ? (
          <Image source={{ uri: url }} style={styles.avatarImg} contentFit="cover" />
        ) : (
          <Text style={styles.avatarEmoji}>{emoji ?? '💛'}</Text>
        )}
      </View>
      <Text style={styles.personCity} numberOfLines={1}>{city ?? '—'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.encre },
  topOverlay: {
    position: 'absolute',
    top: spacing.md + 44, // descendu de ~1,5 cm sous la barre d'état
    left: spacing.md,
    right: spacing.md,
    gap: spacing.sm,
  },
  distanceBar: {
    backgroundColor: 'rgba(27,27,58,0.72)',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.bordureClaire,
    paddingVertical: 7,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  distanceText: {
    color: colors.creme,
    fontFamily: fonts.monoMedium,
    fontSize: 14,
  },
  peopleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(251,246,239,0.94)',
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  chipDivider: { width: 1, height: 26, backgroundColor: colors.bordure },
  personMini: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 130 },
  avatar: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    backgroundColor: colors.cremeDoux,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarEmoji: { fontSize: 16 },
  personCity: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.encre, flexShrink: 1 },
  bottomBar: {
    position: 'absolute',
    bottom: spacing.lg,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
  },
  miniBtn: {
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  miniPrimary: { backgroundColor: colors.ambre },
  miniPrimaryText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.encre },
  miniGhost: {
    backgroundColor: 'rgba(27,27,58,0.6)',
    borderWidth: 1,
    borderColor: colors.bordureClaire,
  },
  miniGhostText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.creme },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.bordure,
  },
  viewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', justifyContent: 'center' },
  viewerImg: { width: VIEWER_W - 24, height: '76%', borderRadius: radius.lg },
  viewerCaption: {
    color: colors.creme,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  viewerClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerCloseTxt: { color: '#fff', fontSize: 20, fontWeight: '600' },
});
