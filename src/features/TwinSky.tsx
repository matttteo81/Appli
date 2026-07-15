/**
 * « Ciel jumeau » : deux moitiés d'écran. Chacune montre le prénom, la ville,
 * l'heure locale et un dégradé qui suit le moment de la journée (aube / jour /
 * crépuscule / nuit) de chaque partenaire.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Palette, Radius, softShadow } from '@/constants/theme';
import { findCity } from '@/lib/cities';
import { skyLookForTimezone, timeInTimezone } from '@/lib/time';
import type { Profile } from '@/types/db';

type SideData = {
  name: string;
  cityLabel: string;
  timezone: string;
};

function toSide(profile: Profile | null, fallbackName: string): SideData {
  const city = findCity(profile?.city_id);
  // Si aucune ville n'est choisie, on retombe sur le fuseau du téléphone.
  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return {
    name: profile?.display_name?.trim() || fallbackName,
    cityLabel: city ? city.name : 'Ville à choisir',
    timezone: city?.timezone ?? deviceTz,
  };
}

function Half({ side }: { side: SideData }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  const look = skyLookForTimezone(side.timezone, now);
  const time = timeInTimezone(side.timezone, now);

  return (
    <LinearGradient colors={look.gradient} style={styles.half}>
      <AppText style={styles.emoji}>{look.emoji}</AppText>
      <View style={styles.halfBottom}>
        <AppText variant="label" color={look.textColor} numberOfLines={1}>
          {side.name}
        </AppText>
        <AppText variant="mono" color={look.textColor} style={styles.time}>
          {time}
        </AppText>
        <AppText variant="caption" color={look.textColor} numberOfLines={1}>
          {side.cityLabel} · {look.label}
        </AppText>
      </View>
    </LinearGradient>
  );
}

export function TwinSky({
  me,
  partner,
}: {
  me: Profile | null;
  partner: Profile | null;
}) {
  const myside = toSide(me, 'Toi');
  const otherside = toSide(partner, 'Ton amour');

  return (
    <View style={styles.card}>
      <Half side={myside} />
      <View style={styles.divider} />
      <Half side={otherside} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    height: 210,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...softShadow,
  },
  half: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  halfBottom: { gap: 2 },
  emoji: { fontSize: 30 },
  time: { fontSize: 30, letterSpacing: 2 },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.35)' },
});
