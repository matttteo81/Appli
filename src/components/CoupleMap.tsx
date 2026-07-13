import React, { useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { colors } from '../theme/colors';
import type { Profile } from '../types/db';

/**
 * La vraie carte (react-native-maps). Ce composant n'est chargé QUE dans un
 * development build — jamais dans Expo Go, qui ne contient pas le module natif.
 * C'est pour ça qu'il est dans un fichier séparé, importé de façon paresseuse.
 */
export default function CoupleMap({
  profile,
  partner,
}: {
  profile: Profile | null;
  partner: Profile | null;
}) {
  const mapRef = useRef<MapView>(null);

  const meHasCity = profile?.city_lat != null && profile?.city_lng != null;
  const partnerHasCity = partner?.city_lat != null && partner?.city_lng != null;

  const fitBoth = () => {
    const points: { latitude: number; longitude: number }[] = [];
    if (meHasCity)
      points.push({ latitude: profile!.city_lat!, longitude: profile!.city_lng! });
    if (partnerHasCity)
      points.push({
        latitude: partner!.city_lat!,
        longitude: partner!.city_lng!,
      });
    if (points.length > 0) {
      mapRef.current?.fitToCoordinates(points, {
        edgePadding: { top: 120, bottom: 160, left: 80, right: 80 },
        animated: true,
      });
    }
  };

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={{
        latitude: profile?.city_lat ?? 46.6,
        longitude: profile?.city_lng ?? 2.4,
        latitudeDelta: 40,
        longitudeDelta: 40,
      }}
      onMapReady={fitBoth}
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
  );
}
