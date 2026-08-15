import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Canvas, Skottie, Skia, useClock } from '@shopify/react-native-skia';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

const { width: W } = Dimensions.get('window');

// Caractéristiques du fichier Lottie d'origine (plane_heart.json).
const NATIVE_W = 1242;
const NATIVE_H = 600;
const FPS = 30;
const END_FRAME = 150;
const SPEED = 1.5;

// Taille d'affichage (≈ pleine largeur, 15 % plus grand qu'avant).
const DISPLAY_W = Math.min(W * 0.96, 460);
const SCALE = DISPLAY_W / NATIVE_W;
const DISPLAY_H = NATIVE_H * SCALE;

// Durée de lecture de l'avion (ms), puis instants d'apparition du texte.
const PLANE_MS = (END_FRAME / FPS / SPEED) * 1000; // ≈ 3333 ms
const TITLE_AT = 1300;
const TAGLINE_AT = 2300;

// L'animation Lottie, préparée une seule fois pour le GPU (Skottie).
const LOTTIE = JSON.stringify(require('../../assets/plane_heart.json'));

/**
 * Écran de démarrage : l'animation Lottie d'origine (avion qui trace un cœur
 * avec sa corde), rendue sur le GPU via Skottie → fluide, sans le rendu
 * logiciel qui saccadait. Puis « FIL » et la phrase en fondu.
 */
export function AnimatedSplash({
  onDone,
  onReveal,
}: {
  onDone: () => void;
  onReveal?: () => void;
}) {
  const animation = useMemo(() => {
    try {
      return Skia.Skottie.Make(LOTTIE);
    } catch {
      return null;
    }
  }, []);

  const clock = useClock();
  const frame = useDerivedValue(() => {
    const f = (clock.value / 1000) * FPS * SPEED;
    return f >= END_FRAME ? END_FRAME - 0.001 : f;
  });

  const titleV = useSharedValue(0);
  const taglineV = useSharedValue(0);
  const container = useSharedValue(1);

  useEffect(() => {
    let revealed = false;
    const reveal = () => { if (!revealed) { revealed = true; onReveal?.(); } };

    const t1 = setTimeout(() => {
      titleV.value = withTiming(1, { duration: 480, easing: Easing.out(Easing.quad) });
    }, TITLE_AT);
    const t2 = setTimeout(() => {
      taglineV.value = withTiming(1, { duration: 480, easing: Easing.out(Easing.quad) });
    }, TAGLINE_AT);
    const t3 = setTimeout(() => {
      // On monte l'app sous le splash opaque, puis on fond en douceur.
      reveal();
      setTimeout(() => {
        container.value = withTiming(0, { duration: 500 }, (fin) => {
          if (fin) runOnJS(onDone)();
        });
      }, 450);
    }, Math.max(PLANE_MS + 300, TAGLINE_AT + 600));
    // Filet de sécurité.
    const safety = setTimeout(() => { reveal(); onDone(); }, 7000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(safety); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: container.value }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleV.value,
    transform: [{ translateY: interpolate(titleV.value, [0, 1], [14, 0]) }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineV.value,
    transform: [{ translateY: interpolate(taglineV.value, [0, 1], [14, 0]) }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents="none">
      <View style={styles.stack}>
        {animation ? (
          <Canvas style={{ width: DISPLAY_W, height: DISPLAY_H }}>
            <Skottie animation={animation} frame={frame} transform={[{ scale: SCALE }]} />
          </Canvas>
        ) : (
          <View style={{ width: DISPLAY_W, height: DISPLAY_H }} />
        )}

        <Animated.Text style={[styles.title, titleStyle]}>FIL</Animated.Text>
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          loin des yeux, près du cœur
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10000,
    backgroundColor: colors.beigeOleron,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: { alignItems: 'center', width: '100%' },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 56,
    letterSpacing: 4,
    color: colors.encre,
    marginTop: 4,
    alignSelf: 'stretch',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  tagline: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.grenat,
    marginTop: 6,
    alignSelf: 'stretch',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
