import React, { useMemo, useState } from 'react';
import {
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
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Input, Screen, ThemedText } from '../../src/components/ui';
import { Globe } from '../../src/components/Globe';
import { fetchWeather } from '../../src/lib/weather';
import { colors } from '../../src/theme/colors';
import { fonts, radius, spacing } from '../../src/theme/typography';
import { useAuth } from '../../src/store/auth';
import { City, searchCities } from '../../src/lib/cities';
import { distanceKm } from '../../src/lib/geo';

const { width } = Dimensions.get('window');
const GLOBE_SIZE = Math.min(width - 32, 340);

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

  const mePlace = meHasCity
    ? { lat: profile!.city_lat!, lng: profile!.city_lng!, name: profile?.display_name ?? 'Moi' }
    : null;
  const partnerPlace = partnerHasCity
    ? {
        lat: partner!.city_lat!,
        lng: partner!.city_lng!,
        name: partner?.display_name ?? 'Ma moitié',
      }
    : null;

  return (
    <Screen edges={['top']} background="transparent">
      <LinearGradient colors={['#0B0B1E', '#1B1B3A', '#2A2A4E']} style={StyleSheet.absoluteFill} />
      <View style={{ flex: 1 }}>
        {/* Bandeau distance */}
        <View style={styles.topBanner}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              {distance != null
                ? `${distance.toLocaleString('fr-FR')} km vous séparent`
                : 'Choisissez vos villes'}
            </Text>
          </View>
        </View>

        {/* Le globe */}
        <View style={styles.globeWrap}>
          <Globe me={mePlace} partner={partnerPlace} size={GLOBE_SIZE} />
          {!meHasCity && !partnerHasCity ? (
            <ThemedText
              variant="body"
              color={colors.cremeDoux}
              center
              style={{ marginTop: spacing.lg, paddingHorizontal: spacing.xl }}
            >
              Choisissez vos villes pour voir le fil qui vous relie sur la
              planète ✈️
            </ThemedText>
          ) : null}
        </View>

        {/* Boutons localisation */}
        <View style={styles.bottomBar}>
          {meHasCity ? (
            <ThemedText
              variant="label"
              color={colors.creme}
              center
              style={{ marginBottom: spacing.sm }}
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

const styles = StyleSheet.create({
  globeWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBanner: {
    position: 'absolute',
    top: spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  pill: {
    backgroundColor: colors.encreDoux,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.bordureClaire,
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
