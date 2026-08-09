import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/typography';

/** Bloc gris qui « respire » — placeholder de chargement. */
export function Skeleton({ style }: { style?: ViewStyle | ViewStyle[] }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    l.start();
    return () => l.stop();
  }, [v]);
  const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });
  return <Animated.View style={[styles.base, style, { opacity }]} />;
}

/** Faux fil de discussion pendant le chargement des messages. */
export function MessagesSkeleton() {
  const rows = [0.6, 0.4, 0.75, 0.5, 0.35, 0.65];
  return (
    <View style={{ padding: spacing.md, gap: spacing.md }}>
      {rows.map((w, i) => (
        <Skeleton
          key={i}
          style={{
            alignSelf: i % 2 === 0 ? 'flex-start' : 'flex-end',
            width: `${w * 100}%`,
            height: 40,
            borderRadius: radius.lg,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.cremeDoux, borderRadius: 12 },
});
