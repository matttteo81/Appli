import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

/**
 * Écran de démarrage animé de Lingo : le logo apparaît, respire un instant,
 * puis disparaît en fondu. Pas d'asset externe (texte + emoji).
 */
export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const rise = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    // Entrée : le logo grandit et monte légèrement.
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Sortie en fondu après un court instant.
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }).start(() => onDone());
    }, 1500);
    return () => clearTimeout(timer);
  }, [opacity, scale, rise, onDone]);

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      <Animated.Text
        style={[styles.logo, { transform: [{ scale }, { translateY: rise }] }]}
      >
        Lingo
      </Animated.Text>
      <Animated.Text style={[styles.globe, { opacity }]}>🌍</Animated.Text>
      <Text style={styles.tagline}>Apprends les langues, ensemble</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    backgroundColor: colors.encre,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontFamily: fonts.displayBold,
    fontSize: 56,
    color: colors.creme,
    letterSpacing: 1,
  },
  globe: { fontSize: 40, marginTop: 8 },
  tagline: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.ambre,
    marginTop: 14,
  },
});
