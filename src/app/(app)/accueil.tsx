/**
 * Écran ACCUEIL : le « ciel jumeau », la distance qui vous sépare, et le
 * compte à rebours des retrouvailles.
 */
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { Countdown } from '@/features/Countdown';
import { TwinSky } from '@/features/TwinSky';
import { findCity } from '@/lib/cities';
import { distanceKm, formatKm } from '@/lib/distance';
import { useSession } from '@/store/useSession';

export default function Accueil() {
  const profile = useSession((s) => s.profile);
  const partner = useSession((s) => s.partner);

  const myCity = findCity(profile?.city_id);
  const partnerCity = findCity(partner?.city_id);
  const km =
    myCity && partnerCity ? formatKm(distanceKm(myCity, partnerCity)) : null;

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="display">Fil</AppText>
        <AppText variant="body" color={Colors.textSecondary}>
          {partner?.display_name
            ? `Toi & ${partner.display_name}, sous le même ciel.`
            : 'En attente de ton amour…'}
        </AppText>
      </View>

      <TwinSky me={profile} partner={partner} />

      <Card style={styles.distanceCard}>
        <AppText variant="caption" color={Colors.textMuted}>
          Ce qui vous sépare
        </AppText>
        {km ? (
          <AppText variant="title">{km}</AppText>
        ) : (
          <AppText variant="body" color={Colors.textSecondary}>
            Choisissez vos villes dans l'onglet « Carte » pour voir la distance.
          </AppText>
        )}
      </Card>

      <Countdown />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: Spacing.sm, marginBottom: Spacing.lg, gap: 2 },
  distanceCard: { marginTop: Spacing.lg, gap: Spacing.xs },
});
