import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, type Region } from 'react-native-maps';

/**
 * Une épingle sur la carte : une photo géolocalisée, un souvenir du Journal,
 * ou l'un de vous deux.
 */
export type Pin = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  kind: 'photo' | 'me' | 'partner' | 'memory';
};

/** Poignée impérative : recentrer/zoomer la carte. */
export type PhotoMapHandle = {
  setCameraPosition: (config?: {
    coordinates: { latitude: number; longitude: number };
    zoom?: number;
  }) => void;
};

const MARKER = {
  me: { emoji: '🧡', ring: '#F2A65A' },
  partner: { emoji: '💚', ring: '#A8C3A0' },
  photo: { emoji: '📸', ring: '#EF8C7C' },
  memory: { emoji: '📖', ring: '#7C2D3A' },
} as const;

function validCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  );
}

/** Région (centre + zoom) qui cadre toutes les épingles. */
function regionForPins(pins: Pin[], center: { latitude: number; longitude: number }): Region {
  const pts = pins.filter((p) => validCoord(p.latitude, p.longitude));
  if (pts.length === 0) {
    const lat = validCoord(center?.latitude, center?.longitude) ? center.latitude : 20;
    const lng = validCoord(center?.latitude, center?.longitude) ? center.longitude : 0;
    return { latitude: lat, longitude: lng, latitudeDelta: 80, longitudeDelta: 80 };
  }
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const p of pts) {
    minLat = Math.min(minLat, p.latitude); maxLat = Math.max(maxLat, p.latitude);
    minLng = Math.min(minLng, p.longitude); maxLng = Math.max(maxLng, p.longitude);
  }
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    // Marge de 60 %, et un zoom minimal (~0.05° ≈ niveau ville) pour un seul point.
    latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.05),
    longitudeDelta: Math.max((maxLng - minLng) * 1.6, 0.05),
  };
}

/**
 * Carte INTERACTIVE (react-native-maps, adossée à Apple Maps sur iOS) :
 * pincer pour zoomer, déplacer, imagerie satellite + libellés (hybrid), point
 * bleu « ma position ». Bibliothèque mature et stable (pas comme expo-maps
 * alpha, ni la WebView qui plantait au démontage).
 */
const PhotoMap = React.forwardRef<PhotoMapHandle, {
  center: { latitude: number; longitude: number };
  zoom: number;
  pins: Pin[];
  onPinPress?: (pin: Pin) => void;
  satellite?: boolean;
  showUserLocation?: boolean;
}>(function PhotoMap({ center, pins, onPinPress, satellite = true, showUserLocation }, ref) {
  const mapRef = React.useRef<MapView>(null);
  // Les marqueurs personnalisés (emoji) doivent être « capturés » au moins une
  // fois ; on coupe ensuite le suivi pour économiser la batterie.
  const [tracks, setTracks] = React.useState(true);

  const cleanPins = React.useMemo(
    () => pins.filter((p) => validCoord(p.latitude, p.longitude)),
    [pins],
  );

  const initialRegion = React.useMemo(
    () => regionForPins(cleanPins, center),
    // région initiale seulement : on ne veut pas re-cadrer à chaque changement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  React.useEffect(() => {
    const t = setTimeout(() => setTracks(false), 1500);
    return () => clearTimeout(t);
  }, [cleanPins.length]);

  React.useImperativeHandle(ref, () => ({
    setCameraPosition: (config) => {
      const c = config?.coordinates;
      if (!c || !validCoord(c.latitude, c.longitude)) return;
      const zoom = Number.isFinite(config?.zoom) ? config!.zoom! : 6;
      const delta = Math.max(0.01, Math.min(160, 360 / Math.pow(2, zoom)));
      mapRef.current?.animateToRegion(
        { latitude: c.latitude, longitude: c.longitude, latitudeDelta: delta, longitudeDelta: delta },
        450,
      );
    },
  }), []);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        mapType={satellite ? 'hybrid' : 'standard'}
        initialRegion={initialRegion}
        showsUserLocation={!!showUserLocation}
        showsMyLocationButton={false}
        showsCompass
        rotateEnabled
        pitchEnabled
        zoomEnabled
        scrollEnabled
        toolbarEnabled={false}
      >
        {cleanPins.map((p) => {
          const m = MARKER[p.kind] ?? MARKER.photo;
          return (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.latitude, longitude: p.longitude }}
              title={p.title}
              onPress={() => onPinPress?.(p)}
              tracksViewChanges={tracks}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.pin, { borderColor: m.ring }]}>
                <Text style={styles.pinEmoji}>{m.emoji}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1a2b' },
  pin: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#FBF6EF', borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  pinEmoji: { fontSize: 17 },
});

export default PhotoMap;
