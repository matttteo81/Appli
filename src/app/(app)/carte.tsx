/**
 * Écran CARTE : chaque partenaire choisit sa ville. On affiche les deux sur
 * une vraie carte, reliées par un trait, avec la distance recalculée.
 *
 * ⚠️ `react-native-maps` a besoin d'un « development build » (il ne marche pas
 * toujours dans Expo Go). On le charge donc de façon protégée : si la carte
 * n'est pas disponible, on affiche un joli repli — le choix des villes et la
 * distance continuent de fonctionner.
 */
import { useMemo, useState } from 'react';
import { FlatList, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { CITIES, findCity, searchCities, type City } from '@/lib/cities';
import { distanceKm, formatKm } from '@/lib/distance';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/store/useSession';

// Chargement protégé de react-native-maps (peut être absent dans Expo Go).
function loadMaps() {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-maps');
    return {
      MapView: mod.default,
      Marker: mod.Marker,
      Polyline: mod.Polyline,
    };
  } catch {
    return null;
  }
}
const Maps = loadMaps();

export default function Carte() {
  const profile = useSession((s) => s.profile);
  const partner = useSession((s) => s.partner);
  const patchProfile = useSession((s) => s.patchProfile);
  const [pickerOpen, setPickerOpen] = useState(false);

  const myCity = findCity(profile?.city_id);
  const partnerCity = findCity(partner?.city_id);
  const km = myCity && partnerCity ? formatKm(distanceKm(myCity, partnerCity)) : null;

  async function chooseCity(city: City) {
    setPickerOpen(false);
    if (!profile) return;
    patchProfile({ city_id: city.id });
    await supabase.from('profiles').update({ city_id: city.id }).eq('id', profile.id);
  }

  return (
    <Screen>
      <AppText variant="display" style={styles.title}>
        Carte
      </AppText>
      <AppText variant="body" color={Colors.textSecondary} style={styles.subtitle}>
        Choisis ta ville : elle sert aussi à ton heure locale sur l'accueil.
      </AppText>

      <MapArea myCity={myCity} partnerCity={partnerCity} />

      <Card style={styles.infoCard}>
        <View style={styles.row}>
          <View style={styles.legendDot} />
          <View style={styles.flex}>
            <AppText variant="label" color={Colors.textMuted}>
              Ta ville
            </AppText>
            <AppText variant="subtitle">{myCity ? `${myCity.name}, ${myCity.country}` : 'À choisir'}</AppText>
          </View>
          <Button label={myCity ? 'Changer' : 'Choisir'} variant="ghost" onPress={() => setPickerOpen(true)} />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
          <View style={styles.flex}>
            <AppText variant="label" color={Colors.textMuted}>
              {partner?.display_name ?? 'Ton amour'}
            </AppText>
            <AppText variant="subtitle">
              {partnerCity ? `${partnerCity.name}, ${partnerCity.country}` : 'Pas encore choisie'}
            </AppText>
          </View>
        </View>
      </Card>

      {km ? (
        <AppText variant="title" center color={Colors.secondary} style={styles.km}>
          {km} vous séparent
        </AppText>
      ) : null}

      <CityPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={chooseCity}
      />
    </Screen>
  );
}

/** La carte (ou son repli si react-native-maps est indisponible). */
function MapArea({ myCity, partnerCity }: { myCity?: City; partnerCity?: City }) {
  const points = [myCity, partnerCity].filter(Boolean) as City[];

  // Hook appelé sans condition (les règles React l'exigent), avant tout retour.
  const initialRegion = useMemo(() => {
    if (points.length === 0) {
      return { latitude: 20, longitude: 0, latitudeDelta: 120, longitudeDelta: 120 };
    }
    const lat = points.reduce((s, p) => s + p.latitude, 0) / points.length;
    const lng = points.reduce((s, p) => s + p.longitude, 0) / points.length;
    return { latitude: lat, longitude: lng, latitudeDelta: 90, longitudeDelta: 90 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myCity?.id, partnerCity?.id]);

  if (!Maps) {
    // Repli visuel (Expo Go / web) : pas de carte, mais on reste joli.
    return (
      <Card style={styles.fallback}>
        <AppText style={styles.fallbackEmoji}>🗺️</AppText>
        <AppText variant="body" color={Colors.textSecondary} center>
          La carte interactive nécessite un « development build ». En attendant,
          tes villes et la distance fonctionnent déjà ci-dessous.
        </AppText>
      </Card>
    );
  }

  const { MapView, Marker, Polyline } = Maps;

  return (
    <View style={styles.mapWrap}>
      <MapView style={StyleSheet.absoluteFill} initialRegion={initialRegion}>
        {myCity && (
          <Marker
            coordinate={{ latitude: myCity.latitude, longitude: myCity.longitude }}
            title="Toi"
            description={myCity.name}
            pinColor={Colors.secondary}
          />
        )}
        {partnerCity && (
          <Marker
            coordinate={{ latitude: partnerCity.latitude, longitude: partnerCity.longitude }}
            title="Ton amour"
            description={partnerCity.name}
            pinColor={Colors.primary}
          />
        )}
        {myCity && partnerCity && (
          <Polyline
            coordinates={[
              { latitude: myCity.latitude, longitude: myCity.longitude },
              { latitude: partnerCity.latitude, longitude: partnerCity.longitude },
            ]}
            strokeColor={Colors.secondary}
            strokeWidth={2}
          />
        )}
      </MapView>
    </View>
  );
}

/** Fenêtre de recherche + sélection d'une ville. */
function CityPickerModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (city: City) => void;
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const results = useMemo(() => (query ? searchCities(query) : CITIES), [query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modal, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.modalHeader}>
          <AppText variant="title">Choisir ta ville</AppText>
          <Pressable onPress={onClose} hitSlop={10}>
            <AppText variant="label" color={Colors.secondary}>
              Fermer
            </AppText>
          </Pressable>
        </View>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher une ville…"
          autoFocus
        />
        <FlatList
          data={results}
          keyExtractor={(c) => c.id}
          keyboardShouldPersistTaps="handled"
          style={styles.results}
          renderItem={({ item }) => (
            <Pressable style={styles.cityRow} onPress={() => onSelect(item)}>
              <AppText variant="subtitle">{item.name}</AppText>
              <AppText variant="caption" color={Colors.textMuted}>
                {item.country}
              </AppText>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: Spacing.sm },
  subtitle: { marginTop: 2, marginBottom: Spacing.lg },
  mapWrap: {
    height: 260,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fallback: { height: 200, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  fallbackEmoji: { fontSize: 44 },
  infoCard: { marginTop: Spacing.lg, gap: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  flex: { flex: 1 },
  legendDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.secondary },
  divider: { height: 1, backgroundColor: Colors.border },
  km: { marginTop: Spacing.xl },
  modal: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: Spacing.lg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  results: { marginTop: Spacing.md },
  cityRow: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 2,
  },
});
