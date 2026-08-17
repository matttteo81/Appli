import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { Milestone } from '../lib/anniversary';
import { colors } from '../theme/colors';
import { fonts, radius, spacing } from '../theme/typography';

/**
 * Petite carte festive affichée le jour d'un mensiversaire / anniversaire.
 */
export function MilestoneCard({ milestone }: { milestone: Milestone }) {
  const isYear = milestone.kind === 'year';
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.back(1.4)) });
  }, [v]);
  const style = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ scale: 0.9 + v.value * 0.1 }],
  }));

  return (
    <Animated.View style={style}>
      <LinearGradient
        colors={isYear ? [colors.ambre, colors.corail] : [colors.corail, colors.prune]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <Text style={styles.confetti}>🎉✨💞✨🎉</Text>
        <Text style={styles.emoji}>{isYear ? '🥂' : '💞'}</Text>
        <Text style={styles.title}>{milestone.label} aujourd'hui !</Text>
        <Text style={styles.sub}>
          {isYear ? 'Joyeux anniversaire à vous deux 💛' : 'Joyeux mensiversaire 💛'}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 4,
  },
  confetti: { fontSize: 15, letterSpacing: 2, marginBottom: 2 },
  emoji: { fontSize: 40 },
  title: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 22,
    color: colors.creme,
    textAlign: 'center',
    marginTop: 2,
  },
  sub: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.creme,
    opacity: 0.92,
    textAlign: 'center',
  },
});
