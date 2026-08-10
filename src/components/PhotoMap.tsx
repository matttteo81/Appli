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
  return (
    <AppleMaps.View
      ref={ref}
      style={{ flex: 1 }}
      cameraPosition={{ coordinates: center, zoom }}
      properties={{
        mapType: satellite ? AppleMaps.MapType.HYBRID : AppleMaps.MapType.STANDARD,
        isMyLocationEnabled: !!showUserLocation,
        selectionEnabled: false,
      }}
      markers={pins.map((p) => ({
        id: p.id,
        coordinates: { latitude: p.latitude, longitude: p.longitude },
        title: p.title,
        ...STYLE_FOR[p.kind],
      }))}
      onMarkerClick={(m) => {
        const pin = pins.find((p) => p.id === m.id);
        if (pin) onPinPress?.(pin);
      }}
    />
  );
});

export default PhotoMap;
