import React from 'react';
import { AppleMaps } from 'expo-maps';

/**
 * Une épingle sur la carte : une photo géolocalisée, un souvenir du Journal,
 * ou l'un de vous deux. On garde un type « maison » pour que l'écran appelant
 * n'ait pas besoin d'importer expo-maps (le module natif reste isolé ici).
 */
export type Pin = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  kind: 'photo' | 'me' | 'partner' | 'memory';
};

const STYLE_FOR: Record<Pin['kind'], { systemImage: string; tintColor: string }> = {
  photo: { systemImage: 'photo.fill', tintColor: '#EF8C7C' },
  me: { systemImage: 'heart.fill', tintColor: '#F2A65A' },
  partner: { systemImage: 'heart.fill', tintColor: '#A8C3A0' },
  memory: { systemImage: 'book.fill', tintColor: '#7C2D3A' },
};

export type PhotoMapHandle = AppleMaps.MapView;

/** Une coordonnée est valide si finie et dans les bornes géographiques. */
function validCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

const PhotoMap = React.forwardRef<PhotoMapHandle, {
  center: { latitude: number; longitude: number };
  zoom: number;
  pins: Pin[];
  onPinPress?: (pin: Pin) => void;
  /** Imagerie satellite + noms de lieux (HYBRID) plutôt que la carte standard. */
  satellite?: boolean;
  /** Affiche le point bleu « ma position » en direct. */
  showUserLocation?: boolean;
}>(function PhotoMap({ center, zoom, pins, onPinPress, satellite, showUserLocation }, ref) {
  // On assainit les entrées : MapKit plante si on lui passe une coordonnée ou
  // un zoom non finis (NaN / Infinity).
  const safeCenter = validCoord(center?.latitude, center?.longitude)
    ? center
    : { latitude: 20, longitude: 0 };
  const safeZoom = Number.isFinite(zoom) ? Math.max(1, Math.min(20, zoom)) : 2;

  const markers = React.useMemo(
    () =>
      pins
        .filter((p) => validCoord(p.latitude, p.longitude))
        .map((p) => ({
          id: p.id,
          coordinates: { latitude: p.latitude, longitude: p.longitude },
          title: p.title,
          ...STYLE_FOR[p.kind],
        })),
    [pins],
  );

  return (
    <AppleMaps.View
      ref={ref}
      style={{ flex: 1 }}
      cameraPosition={{ coordinates: safeCenter, zoom: safeZoom }}
      properties={{
        mapType: satellite ? AppleMaps.MapType.HYBRID : AppleMaps.MapType.STANDARD,
        isMyLocationEnabled: !!showUserLocation,
        selectionEnabled: false,
      }}
      markers={markers}
      onMarkerClick={(m) => {
        const pin = pins.find((p) => p.id === m.id);
        if (pin) onPinPress?.(pin);
      }}
    />
  );
});

export default PhotoMap;
