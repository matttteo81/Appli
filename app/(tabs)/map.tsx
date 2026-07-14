import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Input, Screen, ThemedText } from '../../src/components/ui';
import { fetchWeather } from '../../src/lib/weather';
import { colors, skyGradients } from '../../src/theme/colors';
import { fonts, radius, spacing } from '../../src/theme/typography';
import { useAuth } from '../../src/store/auth';
import { City, searchCities } from '../../src/lib/cities';
import { distanceKm } from '../../src/lib/geo';

// Dans Expo Go, le module natif de la carte n'existe pas : on le charge
// seulement dans un development build (via require paresseux).
const isExpoGo = Constants.executionEnvironment === 'storeClient';
const canUseNativeMap = !isExpoGo && Platform.OS !== 'web';
const CoupleMap = canUseNativeMap
  ? (require('../../src/components/CoupleMap').default as React.ComponentType<{
      profile: any;
      partner: any;
    }>)
  : null;

export default function MapScreen() {
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const updateProfile = useAuth((s) => s.updateProfile);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);

  const useExactLocation = async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Localisation refusée',
          'Autorise la localisation dans les réglages pour utiliser ta position exacte.',
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;
      // Nom de la ville (géocodage inverse) + fuseau horaire (via météo).
      let cityName = 'Ma position';
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        const g = geo[0];
        if (g) cityName = [g.city ?? g.subregion, g.country].filter(Boolean).join(', ');
      } catch {}
      const w = await fetchWeather(latitude, longitude);
      await updateProfile({
        city_name: cityName,
        city_lat: latitude,
        city_lng: longitude,
        timezone: w?.timezone ?? profile?.timezone ?? null,
      });
    } catch (e: any) {
      Alert.alert('Oups', e?.message ?? 'Localisation impossible.');
    } finally {
      setLocating(false);
    }
  };

  const meHasCity = profile?.city_lat != null && profile?.city_lng != null;
  const partnerHasCity = partner?.city_lat != null && partner?.city_lng != null;

  const distance = useMemo(() => {
    if (meHasCity && partnerHasCity) {
      return distanceKm(
        profile!.city_lat!,
        profile!.city_lng!,
        partner!.city_lat!,
        partner!.city_lng!,
      );
    }
    return null;
  }, [profile, partner, meHasCity, partnerHasCity]);

  const results = useMemo(() => searchCities(query), [query]);

  const chooseCity = async (city: City) => {
    setPickerOpen(false);
    setQuery('');
    await updateProfile({
      city_name: `${city.name}, ${city.country}`,
      city_lat: city.lat,
      city_lng: city.lng,
      timezone: city.timezone,
    });
  };

  return (
    <Screen edges={['top']}>
      <View style={{ flex: 1 }}>
        {/* La vraie carte (dev build) OU un aperçu (Expo Go) */}
        {CoupleMap ? (
          <CoupleMap profile={profile} partner={partner} />
        ) : (
          <LinearGradient
            colors={skyGradients.jour}
            style={StyleSheet.absoluteFill}
          >
            <View style={styles.placeholder}>
              <Text style={{ fontSize: 60 }}>🗺️</Text>
              <ThemedText
                variant="title"
                center
                color={colors.encre}
                style={{ marginTop: spacing.md }}
              >
                Aperçu de la carte
              </ThemedText>
              <ThemedText
                variant="body"
                center
                color={colors.encre}
                style={{ marginTop: 6, opacity: 0.8, paddingHorizontal: spacing.lg }}
              >
                La vraie carte interactive s'affichera dans la version complète
                de l'appli. Ici, tu peux déjà choisir ta ville et voir la
                distance.
              </ThemedText>

              <View style={styles.cityCards}>
                <CityChip
                  emoji="🟠"
                  name={profile?.display_name ?? 'Moi'}
                  city={profile?.city_name ?? null}
                />
                <CityChip
                  emoji="🔴"
                  name={partner?.display_name ?? 'Ma moitié'}
                  city={partner?.city_name ?? null}
                />
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Bandeau distance en haut */}
        <View style={styles.topBanner} pointerEvents="none">
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              {distance != null
                ? `${distance.toLocaleString('fr-FR')} km vous séparent`
                : 'Choisissez vos villes'}
            </Text>
          </View>
        </View>

        {/* Boutons localisation */}
        <View style={styles.bottomBar}>
          {meHasCity ? (
            <ThemedText
              variant="label"
              color={colors.creme}
              center
              style={{ marginBottom: spacing.sm, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 }}
            >
              📍 {profile?.city_name}
            </ThemedText>
          ) : null}
          <Button
            title={locating ? 'Localisation…' : '📍 Ma position exacte'}
            onPress={useExactLocation}
            loading={locating}
          />
          <Button
            title="Ou choisir une ville"
            variant="ghost"
            onPress={() => setPickerOpen(true)}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </View>

      {/* Recherche de ville */}
      <Modal visible={pickerOpen} animationType="slide">
        <Screen>
          <View style={{ padding: spacing.lg, gap: spacing.md, flex: 1 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <ThemedText variant="displaySmall">Ta ville</ThemedText>
              <Pressable onPress={() => setPickerOpen(false)}>
                <ThemedText variant="bodyMedium" color={colors.corail}>
                  Fermer
                </ThemedText>
              </Pressable>
            </View>
            <Input
              placeholder="Rechercher une ville…"
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            <FlatList
              data={results}
              keyExtractor={(c) => `${c.name}-${c.country}`}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable onPress={() => chooseCity(item)} style={styles.cityRow}>
                  <View>
                    <ThemedText variant="bodyMedium">{item.name}</ThemedText>
                    <ThemedText variant="body" color={colors.texteGris}>
                      {item.country}
                    </ThemedText>
                  </View>
                  <Text style={{ fontSize: 18 }}>📍</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <ThemedText
                  variant="body"
                  color={colors.texteGris}
                  center
                  style={{ marginTop: spacing.lg }}
                >
                  Aucune ville trouvée. Essaie une grande ville proche.
                </ThemedText>
              }
            />
          </View>
        </Screen>
      </Modal>
    </Screen>
  );
}

function CityChip({
  emoji,
  name,
  city,
}: {
  emoji: string;
  name: string;
  city: string | null;
}) {
  return (
    <View style={styles.chip}>
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <ThemedText variant="bodyMedium" color={colors.encre} numberOfLines={1}>
          {name}
        </ThemedText>
        <ThemedText variant="body" color={colors.encre} numberOfLines={1} style={{ opacity: 0.7 }}>
          {city ?? 'Ville non choisie'}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  cityCards: { marginTop: spacing.xl, width: '100%', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  topBanner: {
    position: 'absolute',
    top: spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    backgroundColor: colors.encre,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    shadowColor: colors.encre,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  pillText: { color: colors.creme, fontFamily: fonts.monoMedium, fontSize: 15 },
  bottomBar: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.bordure,
  },
});
