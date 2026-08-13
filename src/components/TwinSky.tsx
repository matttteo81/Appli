import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, momentForHour, skyGradients } from '../theme/colors';
import { fonts, radius } from '../theme/typography';
import { localHour, localTime } from '../lib/geo';
import type { Weather } from '../lib/weather';

type Side = {
  name: string;
  city: string | null;
  timezone: string | null;
  weather?: Weather | null;
};

/**
 * Deux moitiés de ciel. Chaque côté a un dégradé selon l'heure locale de
 * la personne (aube / jour / crépuscule / nuit) et affiche son heure.
 */
export function TwinSky({
  me,
  partner,
  streak,
}: {
  me: Side;
  partner: Side;
  streak?: number | null;
}) {
  // On rafraîchit l'heure chaque minute.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={styles.row}>
      <SkyHalf side={me} align="flex-start" />
      <SkyHalf side={partner} align="flex-end" />
      <View style={styles.seam} />
      {/* Série « à deux » : nombre de jours où vous êtes venus tous les deux. */}
      {streak && streak > 0 ? (
        <View style={styles.streakWrap} pointerEvents="none">
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {streak} jour{streak > 1 ? 's' : ''}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function SkyHalf({
  side,
  align,
}: {
  side: Side;
  align: 'flex-start' | 'flex-end';
}) {
  const tz =
    side.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const hour = localHour(tz);
  const moment = momentForHour(hour);
  const gradient = skyGradients[moment];
  const textColor = moment === 'jour' ? colors.encre : colors.creme;

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.half, { alignItems: align }]}
    >
      <Text style={[styles.emoji]}>{momentEmoji(moment)}</Text>
      <Text style={[styles.time, { color: textColor }]}>
        {localTime(tz)}
      </Text>
      <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
        {side.name}
      </Text>
      <Text style={[styles.city, { color: textColor }]} numberOfLines={1}>
        {side.city ?? 'Ville non choisie'}
      </Text>
      {side.weather ? (
        <Text style={[styles.weather, { color: textColor }]} numberOfLines={1}>
          {side.weather.emoji} {side.weather.temp}° · {side.weather.label}
        </Text>
      ) : null}
    </LinearGradient>
  );
}

function momentEmoji(m: ReturnType<typeof momentForHour>): string {
  switch (m) {
    case 'aube':
      return '🌅';
    case 'jour':
      return '☀️';
    case 'crepuscule':
      return '🌇';
    case 'nuit':
      return '🌙';
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    height: 176,
    position: 'relative',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  half: {
    flex: 1,
    padding: 18,
    justifyContent: 'center',
    gap: 2,
  },
  seam: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  streakWrap: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  streakBadge: {
    backgroundColor: 'rgba(27,27,58,0.55)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(251,246,239,0.3)',
  },
  streakText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.creme,
  },
  emoji: { fontSize: 26, marginBottom: 4 },
  time: { fontFamily: fonts.monoMedium, fontSize: 34, letterSpacing: 1 },
  name: { fontFamily: fonts.displayMedium, fontSize: 18, marginTop: 2 },
  city: { fontFamily: fonts.bodyRegular, fontSize: 13, opacity: 0.9 },
  weather: { fontFamily: fonts.bodyMedium, fontSize: 12, marginTop: 3, opacity: 0.95 },
});
