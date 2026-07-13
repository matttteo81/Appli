import React, { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Button, Input, Screen, ThemedText } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';
import { fonts, radius, spacing } from '../../src/theme/typography';
import { useAuth } from '../../src/store/auth';
import { CITIES, City, searchCities } from '../../src/lib/cities';
import { distanceKm } from '../../src/lib/geo';

export default function MapScreen() {
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const updateProfile = useAuth((s) => s.updateProfile);
  const mapRef = useRef<MapView>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');

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
    // On ajuste la carte pour voir les deux villes.
    setTimeout(() => fitBoth(city), 400);
  };

  const fitBoth = (mine?: City) => {
    const points: { latitude: number; longitude: number }[] = [];
    const myLat = mine?.lat ?? profile?.city_lat;
    const myLng = mine?.lng ?? profile?.city_lng;
    if (myLat != null && myLng != null)
      points.push({ latitude: myLat, longitude: myLng });
    if (partnerHasCity)
      points.push({
        latitude: partner!.city_lat!,
        longitude: partner!.city_lng!,
      });
    if (points.length > 0) {
      mapRef.current?.fitToCoordinates(points, {
        edgePadding: { top: 120, bottom: 120, left: 80, right: 80 },
        animated: true,
      });
    }
  };

  const initialRegion = {
    latitude: profile?.city_lat ?? 46.6,
    longitude: profile?.city_lng ?? 2.4,
    latitudeDelta: 40,
    longitudeDelta: 40,
  };

  return (
    <Screen edges={['top']}>
      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          onMapReady={() => fitBoth()}
        >
          {meHasCity && (
            <Marker
              coordinate={{
                latitude: profile!.city_lat!,
                longitude: profile!.city_lng!,
              }}
              title={profile?.display_name ?? 'Moi'}
              description={profile?.city_name ?? ''}
              pinColor={colors.ambre}
            />
          )}
          {partnerHasCity && (
            <Marker
              coordinate={{
                latitude: partner!.city_lat!,
                longitude: partner!.city_lng!,
              }}
              title={partner?.display_name ?? 'Ma moitié'}
              description={partner?.city_name ?? ''}
              pinColor={colors.corail}
            />
          )}
          {meHasCity && partnerHasCity && (
            <Polyline
              coordinates={[
                { latitude: profile!.city_lat!, longitude: profile!.city_lng! },
                { latitude: partner!.city_lat!, longitude: partner!.city_lng! },
              ]}
              strokeColor={colors.corail}
              strokeWidth={3}
              lineDashPattern={[6, 6]}
            />
          )}
        </MapView>

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

        {/* Bouton choisir ma ville */}
        <View style={styles.bottomBar}>
          <Button
            title={
              meHasCity
                ? `Ma ville : ${profile?.city_name}`
                : 'Choisir ma ville'
            }
            onPress={() => setPickerOpen(true)}
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
                <Pressable
                  onPress={() => chooseCity(item)}
                  style={styles.cityRow}
                >
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
  pillText: {
    color: colors.creme,
    fontFamily: fonts.monoMedium,
    fontSize: 15,
  },
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
