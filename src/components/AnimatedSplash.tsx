import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '../theme/colors';

/**
 * Écran de démarrage animé (l'archer qui relie les deux cœurs).
 * Joue ~4 s puis disparaît en fondu et appelle onDone().
 */
export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => onDone());
    }, 4000);
    return () => clearTimeout(timer);
  }, [opacity, onDone]);

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      <Image
        source={require('../../assets/splash-anim.gif')}
        style={styles.image}
        contentFit="contain"
        // On rejoue depuis le début à chaque lancement.
        recyclingKey={String(Date.now())}
      />
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
  image: { width: '100%', height: '100%' },
});
