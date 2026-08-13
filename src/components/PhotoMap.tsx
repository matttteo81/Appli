import React from 'react';
import { View, Text, StyleSheet, Pressable, PixelRatio, LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';

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

/** Poignée impérative : recentrer la carte sur une position. */
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

const R = 6378137; // rayon terrestre (Web Mercator, mètres)
const MAX_MERC = Math.PI * R; // ~20037508

function validCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  );
}

/** Projection Web Mercator (degrés → mètres). */
function toMerc(lat: number, lng: number) {
  const x = R * (lng * Math.PI) / 180;
  const clampedLat = Math.max(-85.05, Math.min(85.05, lat));
  const y = R * Math.log(Math.tan(Math.PI / 4 + (clampedLat * Math.PI) / 180 / 2));
  return { x, y };
}

type Box = { xmin: number; ymin: number; xmax: number; ymax: number };

/**
 * Carte = image satellite STATIQUE (API Esri, sans clé) rendue avec expo-image,
 * plus des épingles positionnées par-dessus. Aucune vue native fragile (ni
 * WebView, ni module carte natif), donc aucun risque de plantage au démontage.
 */
const PhotoMap = React.forwardRef<PhotoMapHandle, {
  center: { latitude: number; longitude: number };
  zoom: number;
  pins: Pin[];
  onPinPress?: (pin: Pin) => void;
  satellite?: boolean;
  showUserLocation?: boolean;
}>(function PhotoMap({ center, pins, onPinPress }, ref) {
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  const [focus, setFocus] = React.useState<null | { lat: number; lng: number; span: number }>(null);

  const cleanPins = React.useMemo(
    () => pins.filter((p) => validCoord(p.latitude, p.longitude)),
    [pins],
  );

  React.useImperativeHandle(ref, () => ({
    setCameraPosition: (config) => {
      const c = config?.coordinates;
      if (c && validCoord(c.latitude, c.longitude)) {
        const zoom = Number.isFinite(config?.zoom) ? config!.zoom! : 5;
        // span (mètres) ≈ circonférence / 2^zoom, borné.
        const span = Math.max(3000, Math.min(2 * MAX_MERC, (2 * MAX_MERC) / Math.pow(2, zoom)));
        setFocus({ lat: c.latitude, lng: c.longitude, span });
      }
    },
  }), []);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: Math.round(width), h: Math.round(height) });
  };

  // Boîte englobante (Web Mercator) qui cadre les épingles (ou le focus).
  const box: Box | null = React.useMemo(() => {
    const { w, h } = size;
    if (w <= 0 || h <= 0) return null;
    const aspect = w / h;

    let cx: number, cy: number, spanX: number, spanY: number;

    if (focus) {
      const c = toMerc(focus.lat, focus.lng);
      cx = c.x; cy = c.y;
      spanX = focus.span; spanY = focus.span;
    } else if (cleanPins.length > 0) {
      let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
      for (const p of cleanPins) {
        const m = toMerc(p.latitude, p.longitude);
        xmin = Math.min(xmin, m.x); xmax = Math.max(xmax, m.x);
        ymin = Math.min(ymin, m.y); ymax = Math.max(ymax, m.y);
      }
      cx = (xmin + xmax) / 2; cy = (ymin + ymax) / 2;
      // Marge de 60 % + span minimal (~150 km) pour ne pas trop zoomer.
      spanX = Math.max((xmax - xmin) * 1.6, 150000);
      spanY = Math.max((ymax - ymin) * 1.6, 150000);
    } else {
      const c = toMerc(center?.latitude ?? 20, center?.longitude ?? 0);
      cx = c.x; cy = c.y;
      spanX = 2 * MAX_MERC; spanY = 2 * MAX_MERC;
    }

    // Ajuste au ratio du conteneur (image non déformée + placement correct).
    if (spanX / spanY < aspect) spanX = spanY * aspect;
    else spanY = spanX / aspect;

    return {
      xmin: cx - spanX / 2, xmax: cx + spanX / 2,
      ymin: cy - spanY / 2, ymax: cy + spanY / 2,
    };
  }, [size, focus, cleanPins, center]);

  // URL de l'image satellite Esri (export, sans clé).
  const imgSize = React.useMemo(() => {
    const scale = Math.min(2, PixelRatio.get());
    const w = Math.min(2048, Math.max(1, Math.round(size.w * scale)));
    const h = Math.min(2048, Math.max(1, Math.round(size.h * scale)));
    return { w, h };
  }, [size]);

  const satUrl = box
    ? `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${box.xmin},${box.ymin},${box.xmax},${box.ymax}&bboxSR=3857&imageSR=3857&size=${imgSize.w},${imgSize.h}&format=jpg&f=image`
    : null;
  const labelUrl = box
    ? `https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/export?bbox=${box.xmin},${box.ymin},${box.xmax},${box.ymax}&bboxSR=3857&imageSR=3857&size=${imgSize.w},${imgSize.h}&format=png&transparent=true&f=image`
    : null;

  // Position en points (dans le conteneur) d'une épingle.
  const project = (lat: number, lng: number) => {
    if (!box) return null;
    const m = toMerc(lat, lng);
    const px = ((m.x - box.xmin) / (box.xmax - box.xmin)) * size.w;
    const py = ((box.ymax - m.y) / (box.ymax - box.ymin)) * size.h;
    return { px, py };
  };

  return (
    <View style={styles.container} onLayout={onLayout}>
      {satUrl ? (
        <Image
          key={satUrl}
          source={{ uri: satUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      ) : null}
      {labelUrl ? (
        <Image
          key={labelUrl}
          source={{ uri: labelUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      ) : null}

      {box && size.w > 0
        ? cleanPins.map((p) => {
            const pos = project(p.latitude, p.longitude);
            if (!pos) return null;
            const m = MARKER[p.kind] ?? MARKER.photo;
            return (
              <Pressable
                key={p.id}
                onPress={() => onPinPress?.(p)}
                style={[styles.pinWrap, { left: pos.px - 16, top: pos.py - 16 }]}
                hitSlop={8}
              >
                <View style={[styles.pin, { borderColor: m.ring }]}>
                  <Text style={styles.pinEmoji}>{m.emoji}</Text>
                </View>
              </Pressable>
            );
          })
        : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1a2b', overflow: 'hidden' },
  pinWrap: { position: 'absolute', width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  pin: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FBF6EF', borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  pinEmoji: { fontSize: 16 },
});

export default PhotoMap;
