/**
 * Écran OISEAU : un animal virtuel partagé qui grandit en 4 stades quand les
 * deux partenaires le nourrissent. Un seul oiseau par couple.
 */
import { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useCoupleRows } from '@/lib/useCoupleData';
import type { Bird } from '@/types/db';

type Stage = {
  key: string;
  emoji: string;
  name: string;
  min: number;
  next: number | null; // seuil du stade suivant (null = dernier stade)
};

const STAGES: Stage[] = [
  { key: 'oeuf', emoji: '🥚', name: 'Œuf', min: 0, next: 5 },
  { key: 'bebe', emoji: '🐣', name: 'Bébé', min: 5, next: 15 },
  { key: 'ado', emoji: '🐥', name: 'Ado', min: 15, next: 30 },
  { key: 'adulte', emoji: '🕊️', name: 'Adulte', min: 30, next: null },
];

function stageFor(count: number): Stage {
  return [...STAGES].reverse().find((s) => count >= s.min) ?? STAGES[0];
}

export default function Oiseau() {
  const { rows } = useCoupleRows('bird');
  const bird = (rows as Bird[])[0];
  const count = bird?.feed_count ?? 0;
  const stage = stageFor(count);

  const bounce = useRef(new Animated.Value(1)).current;

  async function feed() {
    Animated.sequence([
      Animated.timing(bounce, {
        toValue: 1.3,
        duration: 130,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(bounce, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    // Incrément atomique côté serveur (le/la partenaire le verra en temps réel).
    await supabase.rpc('feed_bird');
  }

  const toNext = stage.next != null ? stage.next - count : 0;
  const progress =
    stage.next != null
      ? Math.min(1, (count - stage.min) / (stage.next - stage.min))
      : 1;

  return (
    <Screen>
      <Card style={styles.hero}>
        <Animated.Text style={[styles.bird, { transform: [{ scale: bounce }] }]}>
          {stage.emoji}
        </Animated.Text>
        <AppText variant="title" center>
          {stage.name}
        </AppText>
        <AppText variant="body" color={Colors.textSecondary} center>
          Nourri {count} fois à vous deux
        </AppText>

        {/* Barre de progression vers le stade suivant */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <AppText variant="caption" color={Colors.textMuted} center>
          {stage.next != null
            ? `Encore ${toNext} pour passer au stade suivant`
            : 'Stade maximum atteint — bravo ! 🎉'}
        </AppText>
      </Card>

      <Pressable style={styles.feedBtn} onPress={feed}>
        <AppText style={styles.feedEmoji}>🌾</AppText>
        <AppText variant="label" color={Palette.encre}>
          Nourrir l'oiseau
        </AppText>
      </Pressable>

      <AppText variant="caption" color={Colors.textMuted} center style={styles.hint}>
        Nourrissez-le un peu chaque jour, chacun de votre côté : il grandira avec
        votre histoire.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg },
  bird: { fontSize: 96, lineHeight: 108 },
  progressTrack: {
    alignSelf: 'stretch',
    height: 12,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceSunk,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  progressFill: { height: '100%', backgroundColor: Colors.success },
  feedBtn: {
    marginTop: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.lg,
  },
  feedEmoji: { fontSize: 22 },
  hint: { marginTop: Spacing.lg, paddingHorizontal: Spacing.md },
});
