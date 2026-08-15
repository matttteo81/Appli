import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, type Region } from 'react-native-maps';

/**
 * Une épingle sur la carte : une photo géolocalisée (vignette), un souvenir du
 * Journal, ou l'un de vous deux.
 */
export type Pin = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  kind: 'photo' | 'me' | 'partner' | 'memory';
  /** Pour les photos : vignette affichée façon Snap Map. */
  imageUrl?: string;
  /** Nombre de photos regroupées à cet endroit. */
  count?: number;
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
    latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.05),
    longitudeDelta: Math.max((maxLng - minLng) * 1.6, 0.05),
  };
}

/** Marqueur vignette photo (façon Snap Map) — suit son propre chargement. */
function PhotoThumbMarker({ pin, onPress }: { pin: Pin; onPress?: (p: Pin) => void }) {
  const [loaded, setLoaded] = React.useState(false);
  return (
    <Marker
      coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
      onPress={() => onPress?.(pin)}
      tracksViewChanges={!loaded}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={styles.thumbWrap}>
        <Image
          source={{ uri: pin.imageUrl }}
          style={styles.thumbImg}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
        />
        {pin.count && pin.count > 1 ? (
          <View style={styles.thumbBadge}>
            <Text style={styles.thumbBadgeTxt}>{pin.count > 9 ? '9+' : pin.count}</Text>
          </View>
        ) : null}
      </View>
    </Marker>
  );
}

/**
 * Carte INTERACTIVE (react-native-maps / Apple Maps sur iOS) : pincer pour
 * zoomer, déplacer, imagerie satellite + libellés, point bleu « ma position ».
 * Les photos apparaissent en vignettes façon Snap Map.
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
  const [tracks, setTracks] = React.useState(true);

  const cleanPins = React.useMemo(
    () => pins.filter((p) => validCoord(p.latitude, p.longitude)),
    [pins],
  );

  const initialRegion = React.useMemo(
    () => regionForPins(cleanPins, center),
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
      const delta = Math.max(0.005, Math.min(160, 360 / Math.pow(2, zoom)));
      mapRef.current?.animateToRegion(
        { latitude: c.latitude, longitude: c.longitude, latitudeDelta: delta, longitudeDelta: delta },
        550,
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
          if (p.imageUrl) {
            return <PhotoThumbMarker key={p.id} pin={p} onPress={onPinPress} />;
          }
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
  thumbWrap: {
    width: 46, height: 56, borderRadius: 12,
    borderWidth: 3, borderColor: '#7C3AED',
    backgroundColor: '#FBF6EF', overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbBadge: {
    position: 'absolute', top: -6, right: -6,
    minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 4,
    backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FBF6EF',
  },
  thumbBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
});

export default PhotoMap;
