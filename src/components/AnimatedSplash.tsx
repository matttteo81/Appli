import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { fonts } from '../theme/typography';

/**
 * Splash animé de Wingo (échange linguistique).
 * Timeline (~4 s) :
 *  0.0–0.5s  traînée lumineuse depuis le coin inférieur gauche
 *  0.5–1.8s  l'avion bleu marine suit la traînée et monte en arc
 *  1.8–2.2s  pop de la bulle bleue (haut-gauche)
 *  2.2–2.5s  pop de la bulle orange (bas-droite)
 *  2.5–3.5s  l'avion revient au centre : le logo se forme
 *  3.5–4.0s  « Wingo » apparaît en fondu, puis transition
 */
export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const { width: W, height: H } = useWindowDimensions();

  // Pilote maître 0 → 1 sur 4 s (mouvement de l'avion, traînée).
  const t = useRef(new Animated.Value(0)).current;
  const bubble1 = useRef(new Animated.Value(0)).current; // pop bleu (1.8s)
  const bubble2 = useRef(new Animated.Value(0)).current; // pop orange (2.2s)
  const title = useRef(new Animated.Value(0)).current; // « Wingo » (3.5s)
  const container = useRef(new Animated.Value(1)).current; // fondu de sortie

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    Animated.timing(t, {
      toValue: 1,
      duration: 4000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();

    const pop = (v: Animated.Value) =>
      Animated.spring(v, {
        toValue: 1,
        friction: 5,
        tension: 90,
        useNativeDriver: true,
      });

    timers.push(setTimeout(() => pop(bubble1).start(), 1800));
    timers.push(setTimeout(() => pop(bubble2).start(), 2200));
    timers.push(
      setTimeout(
        () =>
          Animated.timing(title, {
            toValue: 1,
            duration: 450,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start(),
        3500,
      ),
    );
    // Transition finale vers l'écran d'accueil.
    timers.push(
      setTimeout(() => {
        Animated.timing(container, {
          toValue: 0,
          duration: 400,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start(() => onDone());
      }, 4000),
    );

    return () => timers.forEach(clearTimeout);
  }, [t, bubble1, bubble2, title, container, onDone]);

  // --- Trajectoire de l'avion (arc bas-gauche → centre-haut → centre) ---
  const kf = [0, 0.125, 0.28, 0.45, 0.625, 0.875, 1];
  const planeX = t.interpolate({
    inputRange: kf,
    outputRange: [-0.32 * W, -0.32 * W, -0.12 * W, 0, 0, 0, 0],
  });
  const planeY = t.interpolate({
    inputRange: kf,
    outputRange: [0.42 * H, 0.42 * H, 0.1 * H, -0.16 * H, -0.13 * H, 0, 0],
  });
  const planeRot = t.interpolate({
    inputRange: kf,
    outputRange: ['38deg', '38deg', '22deg', '14deg', '9deg', '0deg', '0deg'],
  });
  const planeScale = t.interpolate({
    inputRange: kf,
    outputRange: [0.6, 0.6, 0.85, 1.05, 1.02, 1, 1],
  });
  const planeOpacity = t.interpolate({
    inputRange: [0, 0.09, 0.13, 1],
    outputRange: [0, 0, 1, 1],
  });

  // Halo doux qui pulse doucement une fois le logo formé.
  const glowScale = t.interpolate({
    inputRange: [0, 0.6, 0.875, 1],
    outputRange: [0.4, 0.6, 1, 1.05],
  });
  const glowOpacity = t.interpolate({
    inputRange: [0, 0.6, 0.85, 1],
    outputRange: [0, 0, 0.5, 0.5],
  });

  // Traînée lumineuse : apparaît puis s'efface derrière l'avion.
  const trailOpacity = t.interpolate({
    inputRange: [0, 0.06, 0.13, 0.4, 0.5],
    outputRange: [0, 0.9, 0.9, 0.5, 0],
  });

  const planeSize = 0.44 * W;
  const bubbleSize = 0.3 * W;
  const glowSize = 0.85 * W;

  // Positions finales des bulles (autour du centre = logo).
  const b1x = -0.16 * W;
  const b1y = -0.15 * H * 0.55;
  const b2x = 0.16 * W;
  const b2y = 0.15 * H * 0.5;

  const popStyle = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
    transform: [
      { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
    ],
  });

  return (
    <Animated.View
      style={[styles.container, { opacity: container }]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={['#0A5CFF', '#4FA3FF']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Traînée lumineuse (coin inférieur gauche → centre) */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: trailOpacity }]}>
        <Svg width={W} height={H}>
          <Path
            d={`M ${0.1 * W} ${0.86 * H} Q ${0.2 * W} ${0.55 * H} ${0.5 * W} ${
              0.36 * H
            }`}
            stroke="rgba(255,255,255,0.85)"
            strokeWidth={7}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>

      {/* Scène centrée : halo + bulles + avion */}
      <View style={styles.center}>
        {/* Halo lumineux doux */}
        <Animated.View
          style={{
            position: 'absolute',
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          }}
        >
          <Svg width={glowSize} height={glowSize}>
            <Circle
              cx={glowSize / 2}
              cy={glowSize / 2}
              r={glowSize / 2}
              fill="rgba(255,255,255,0.18)"
            />
          </Svg>
        </Animated.View>

        {/* Bulle bleue (haut-gauche) */}
        <Animated.View
          style={[
            styles.absolute,
            { transform: [{ translateX: b1x }, { translateY: b1y }] },
          ]}
        >
          <Animated.View style={popStyle(bubble1)}>
            <Bubble size={bubbleSize} color="#1B4DFF" />
          </Animated.View>
        </Animated.View>

        {/* Bulle orange (bas-droite) */}
        <Animated.View
          style={[
            styles.absolute,
            { transform: [{ translateX: b2x }, { translateY: b2y }] },
          ]}
        >
          <Animated.View style={popStyle(bubble2)}>
            <Bubble size={bubbleSize} color="#FF8A3D" flip />
          </Animated.View>
        </Animated.View>

        {/* Avion */}
        <Animated.View
          style={{
            opacity: planeOpacity,
            transform: [
              { translateX: planeX },
              { translateY: planeY },
              { rotate: planeRot },
              { scale: planeScale },
            ],
          }}
        >
          <Plane size={planeSize} />
        </Animated.View>
      </View>

      {/* Nom « Wingo » */}
      <Animated.Text
        style={[
          styles.title,
          {
            top: H * 0.62,
            opacity: title,
            transform: [
              {
                translateY: title.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0],
                }),
              },
            ],
          },
        ]}
      >
        Wingo
      </Animated.Text>
    </Animated.View>
  );
}

/** Avion stylisé bleu marine (icône « flight » orientée). */
function Plane({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
        fill="#0A2540"
      />
    </Svg>
  );
}

/** Bulle de discussion arrondie avec 3 points et une petite queue. */
function Bubble({
  size,
  color,
  flip,
}: {
  size: number;
  color: string;
  flip?: boolean;
}) {
  const h = size * 0.78;
  return (
    <Svg width={size} height={h} viewBox="0 0 100 78">
      <G transform={flip ? 'scale(-1,1) translate(-100,0)' : undefined}>
        <Rect x={4} y={4} width={92} height={58} rx={20} fill={color} />
        <Path d="M22 60 L18 74 L40 60 Z" fill={color} />
        <Circle cx={34} cy={33} r={6.5} fill="#FFFFFF" />
        <Circle cx={52} cy={33} r={6.5} fill="#FFFFFF" />
        <Circle cx={70} cy={33} r={6.5} fill="#FFFFFF" />
      </G>
    </Svg>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  absolute: { position: 'absolute' },
  title: {
    position: 'absolute',
    alignSelf: 'center',
    fontFamily: fonts.displayBold,
    fontSize: 46,
    letterSpacing: 2,
    color: '#FFFFFF',
    textShadowColor: 'rgba(255,255,255,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
});
