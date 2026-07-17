import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Screen, ScreenHeader, ThemedText, EmptyState } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';
import { radius, spacing } from '../../src/theme/typography';
import { useAuth } from '../../src/store/auth';
import { supabase } from '../../src/lib/supabase';
import {
  LANGUAGES,
  languageFlag,
  languageName,
  tandemMatch,
} from '../../src/lib/languages';
import type { DiscoveredPartner } from '../../src/types/db';

export default function DiscoverScreen() {
  const router = useRouter();
  const profile = useAuth((s) => s.profile);
  const updateProfile = useAuth((s) => s.updateProfile);

  const [partners, setPartners] = useState<DiscoveredPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [langFilter, setLangFilter] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    profile?.lat != null && profile?.lng != null
      ? { lat: profile.lat, lng: profile.lng }
      : null,
  );

  const learningCodes = (profile?.learning_langs ?? []).map((l) => l.code);

  // Demande la position et la mémorise dans le profil (pour la distance).
  const locate = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(next);
      let city: string | null = profile?.city_name ?? null;
      let country: string | null = profile?.country_code ?? null;
      try {
        const [place] = await Location.reverseGeocodeAsync(pos.coords);
        if (place) {
          city = place.city ?? place.subregion ?? city;
          country = place.isoCountryCode ?? country;
        }
      } catch {
        /* pas grave */
      }
      try {
        await updateProfile({
          lat: next.lat,
          lng: next.lng,
          city_name: city,
          country_code: country,
        });
      } catch {
        /* silencieux */
      }
      return next;
    } catch {
      return null;
    }
  }, [profile?.city_name, profile?.country_code, updateProfile]);

  const load = useCallback(
    async (useCoords: { lat: number; lng: number } | null) => {
      const { data, error } = await supabase.rpc('discover_partners', {
        p_lat: useCoords?.lat ?? null,
        p_lng: useCoords?.lng ?? null,
        p_speaks: langFilter,
        p_limit: 80,
      });
      if (!error && data) setPartners(data as DiscoveredPartner[]);
    },
    [langFilter],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const c = coords ?? (await locate());
      if (!alive) return;
      await load(c);
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const c = await locate();
    await load(c ?? coords);
    setRefreshing(false);
  }, [locate, load, coords]);

  return (
    <Screen>
      <ScreenHeader
        title="Découvrir"
        subtitle="Des partenaires près de toi pour pratiquer"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 44, marginTop: spacing.sm }}
        contentContainerStyle={styles.filters}
      >
        <Chip
          label="🌍 Tous"
          active={langFilter === null}
          onPress={() => setLangFilter(null)}
        />
        {(learningCodes.length ? learningCodes : LANGUAGES.map((l) => l.code))
          .slice(0, 8)
          .map((code) => (
            <Chip
              key={code}
              label={`${languageFlag(code)} ${languageName(code)}`}
              active={langFilter === code}
              onPress={() => setLangFilter(langFilter === code ? null : code)}
            />
          ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.prune} size="large" />
        </View>
      ) : partners.length === 0 ? (
        <EmptyState
          emoji="🧭"
          title="Personne pour l'instant"
          subtitle={
            langFilter
              ? 'Essaie de retirer le filtre de langue ou reviens plus tard.'
              : 'Invite des amis à te rejoindre pour lancer la communauté !'
          }
        />
      ) : (
        <FlatList
          data={partners}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: 120,
            gap: spacing.md,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => (
            <PartnerCard
              partner={item}
              myNative={profile?.native_langs ?? []}
              myLearning={profile?.learning_langs ?? []}
              onPress={() => router.push(`/partner/${item.id}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <ThemedText variant="label" color={active ? colors.creme : colors.prune}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function PartnerCard({
  partner,
  myNative,
  myLearning,
  onPress,
}: {
  partner: DiscoveredPartner;
  myNative: string[];
  myLearning: { code: string; level: number }[];
  onPress: () => void;
}) {
  const match = tandemMatch(
    myNative,
    myLearning as { code: string; level: 1 | 2 | 3 | 4 | 5 }[],
    partner.native_langs,
    partner.learning_langs,
  );
  const isTandem = match.score >= 2;
  const distance =
    partner.distance_km != null ? `${Math.round(partner.distance_km)} km` : null;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.avatar}>
        <ThemedText style={{ fontSize: 30 }}>{partner.avatar_emoji}</ThemedText>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowBetween}>
          <ThemedText variant="title" color={colors.encre} numberOfLines={1}>
            {partner.display_name}
          </ThemedText>
          {distance ? (
            <ThemedText variant="label" color={colors.texteGris}>
              📍 {distance}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.langRow}>
          <ThemedText variant="body" color={colors.texteGris}>
            Parle{' '}
            {partner.native_langs
              .map((c) => `${languageFlag(c)} ${languageName(c)}`)
              .join(', ') || '—'}
          </ThemedText>
        </View>
        <View style={styles.langRow}>
          <ThemedText variant="body" color={colors.texteGris}>
            Apprend{' '}
            {partner.learning_langs
              .map((l) => `${languageFlag(l.code)} ${languageName(l.code)}`)
              .join(', ') || '—'}
          </ThemedText>
        </View>

        {isTandem ? (
          <View style={styles.tandemBadge}>
            <ThemedText variant="label" color={colors.encre}>
              ✨ Tandem idéal
            </ThemedText>
          </View>
        ) : match.theyTeach.length > 0 ? (
          <View style={[styles.tandemBadge, { backgroundColor: colors.sauge }]}>
            <ThemedText variant="label" color={colors.encre}>
              Peut t'aider en {languageName(match.theyTeach[0])}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filters: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.prune,
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.prune },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: colors.encre,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.cremeDoux,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  langRow: { marginTop: 2 },
  tandemBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: colors.ambre,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
});
