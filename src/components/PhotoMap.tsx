import React from 'react';
import { WebView } from 'react-native-webview';

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

/**
 * Poignée impérative exposée à l'écran : permet de recentrer la caméra.
 * (On garde la même forme qu'avant pour ne rien changer côté appelant.)
 */
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

/**
 * Carte rendue dans une WebView (Leaflet + imagerie satellite Esri).
 * On évite ainsi le module natif expérimental `expo-maps`, source de
 * plantages : une WebView est stable et ne fait pas tomber l'application.
 */
function buildHtml(satellite: boolean): string {
  const tiles = satellite
    ? `
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: '' }).addTo(map);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: '' }).addTo(map);
    `
    : `
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '' }).addTo(map);
    `;
  return `<!doctype html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html,body,#map{height:100%;margin:0;padding:0;background:#0b1a2b;}
  .pin{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:#FBF6EF;border:2.5px solid #ccc;box-shadow:0 2px 6px rgba(0,0,0,.4);font-size:15px;}
  .leaflet-container{background:#0b1a2b;}
</style>
</head><body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl:false, attributionControl:false }).setView([20,0], 2);
  ${tiles}
  var MARKER = ${JSON.stringify(MARKER)};
  var layer = L.layerGroup().addTo(map);
  function post(msg){ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } }
  function setPins(pins){
    layer.clearLayers();
    (pins||[]).forEach(function(p){
      var m = MARKER[p.kind] || MARKER.photo;
      var icon = L.divIcon({ html:'<div class="pin" style="border-color:'+m.ring+'">'+m.emoji+'</div>', className:'', iconSize:[30,30], iconAnchor:[15,15] });
      var mk = L.marker([p.latitude, p.longitude], { icon: icon }).addTo(layer);
      if(p.title){ mk.bindTooltip(p.title, {direction:'top', offset:[0,-14]}); }
      mk.on('click', function(){ post({ type:'pin', id:p.id }); });
    });
  }
  function setView(lat,lng,zoom){ map.setView([lat,lng], zoom); }
  document.addEventListener('message', handle);      // Android
  window.addEventListener('message', handle);         // iOS
  function handle(e){
    try{
      var d = JSON.parse(e.data);
      if(d.type==='pins'){ setPins(d.pins); }
      else if(d.type==='view'){ setView(d.lat, d.lng, d.zoom); }
    }catch(err){}
  }
  post({ type:'ready' });
</script>
</body></html>`;
}

const PhotoMap = React.forwardRef<PhotoMapHandle, {
  center: { latitude: number; longitude: number };
  zoom: number;
  pins: Pin[];
  onPinPress?: (pin: Pin) => void;
  satellite?: boolean;
  showUserLocation?: boolean;
}>(function PhotoMap({ center, zoom, pins, onPinPress, satellite = true }, ref) {
  const webRef = React.useRef<WebView>(null);
  const readyRef = React.useRef(false);

  const html = React.useMemo(() => buildHtml(satellite), [satellite]);

  const cleanPins = React.useMemo(
    () => pins.filter((p) => validCoord(p.latitude, p.longitude)),
    [pins],
  );

  const post = React.useCallback((obj: unknown) => {
    webRef.current?.postMessage(JSON.stringify(obj));
  }, []);

  // Pousse les épingles + la vue initiale une fois la carte prête, puis à
  // chaque changement d'épingles.
  const pushAll = React.useCallback(() => {
    post({ type: 'pins', pins: cleanPins });
    const safeZoom = Number.isFinite(zoom) ? Math.max(1, Math.min(18, Math.round(zoom))) : 2;
    if (validCoord(center?.latitude, center?.longitude)) {
      post({ type: 'view', lat: center.latitude, lng: center.longitude, zoom: safeZoom });
    }
  }, [post, cleanPins, center, zoom]);

  React.useEffect(() => {
    if (readyRef.current) post({ type: 'pins', pins: cleanPins });
  }, [cleanPins, post]);

  React.useImperativeHandle(ref, () => ({
    setCameraPosition: (config) => {
      const c = config?.coordinates;
      if (c && validCoord(c.latitude, c.longitude)) {
        const z = Number.isFinite(config?.zoom) ? Math.max(1, Math.min(18, Math.round(config!.zoom!))) : 6;
        post({ type: 'view', lat: c.latitude, lng: c.longitude, zoom: z });
      }
    },
  }), [post]);

  return (
    <WebView
      ref={webRef}
      style={{ flex: 1, backgroundColor: '#0b1a2b' }}
      originWhitelist={['*']}
      source={{ html }}
      javaScriptEnabled
      domStorageEnabled
      // Empêche le zoom/scroll de la page elle-même (seule la carte bouge).
      scrollEnabled={false}
      onMessage={(e) => {
        try {
          const d = JSON.parse(e.nativeEvent.data);
          if (d.type === 'ready') {
            readyRef.current = true;
            pushAll();
          } else if (d.type === 'pin') {
            const pin = pins.find((p) => p.id === d.id);
            if (pin) onPinPress?.(pin);
          }
        } catch {}
      }}
    />
  );
});

export default PhotoMap;
