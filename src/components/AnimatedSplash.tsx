import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { fonts } from '../theme/typography';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Splash animé de Wingo (échange linguistique).
 * Scénario :
 *  1. Un avion blanc file du bas-gauche vers le haut-droite (traînée blanche).
 *  2. À son passage au centre, les deux bulles (bleue + orange) apparaissent.
 *  3. Un petit avion bleu sort de la bulle bleue vers la bulle orange,
 *     un petit avion orange sort de la bulle orange vers la bulle bleue :
 *     ils se croisent au centre → l'échange.
 *  4. Le logo se forme au centre, puis « Wingo » apparaît en fondu.
 */
export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const { width: W, height: H } = useWindowDimensions();

  const fly = useRef(new Animated.Value(0)).current; // avion blanc + traînée
  const bBlue = useRef(new Animated.Value(0)).current; // pop bulle bleue
  const bOrange = useRef(new Animated.Value(0)).current; // pop bulle orange
  const ex = useRef(new Animated.Value(0)).current; // échange des petits avions
  const core = useRef(new Animated.Value(0)).current; // avion central (logo)
  const title = useRef(new Animated.Value(0)).current; // « Wingo »
  const container = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const NO = { useNativeDriver: false } as const;

    // 1) Avion blanc traverse l'écran.
    Animated.timing(fly, {
      toValue: 1,
      duration: 1200,
      easing: Easing.inOut(Easing.ease),
      ...NO,
    }).start();

    const pop = (v: Animated.Value) =>
      Animated.spring(v, { toValue: 1, friction: 5, tension: 90, ...NO });

    // 2) Bulles au passage au centre.
    timers.push(setTimeout(() => pop(bBlue).start(), 760));
    timers.push(setTimeout(() => pop(bOrange).start(), 960));

    // 3) Échange des petits avions.
    timers.push(
      setTimeout(
        () =>
          Animated.timing(ex, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            ...NO,
          }).start(),
        1300,
      ),
    );

    // 4) Avion central (le logo se forme).
    timers.push(
      setTimeout(
        () =>
          Animated.spring(core, { toValue: 1, friction: 6, tension: 70, ...NO }).start(),
        2100,
      ),
    );

    // 5) Nom.
    timers.push(
      setTimeout(
        () =>
          Animated.timing(title, {
            toValue: 1,
            duration: 450,
            easing: Easing.out(Easing.ease),
            ...NO,
          }).start(),
        2900,
      ),
    );

    // Transition finale.
    timers.push(
      setTimeout(() => {
        Animated.timing(container, {
          toValue: 0,
          duration: 400,
          easing: Easing.in(Easing.ease),
          ...NO,
        }).start(() => onDone());
      }, 3800),
    );

    return () => timers.forEach(clearTimeout);
  }, [fly, bBlue, bOrange, ex, core, title, container, onDone]);

  // --- Géométrie ---
  const BLx = 0.12 * W, BLy = 0.86 * H; // départ (bas-gauche)
  const TRx = 0.88 * W, TRy = 0.14 * H; // arrivée (haut-droite)
  const trailLen = Math.hypot(TRx - BLx, TRy - BLy);

  // Bulles (positions finales = logo)
  const b1x = -0.16 * W, b1y = -0.09 * H; // bleue (haut-gauche)
  const b2x = 0.16 * W, b2y = 0.09 * H; // orange (bas-droite)

  const bubbleSize = 0.28 * W;
  const bigPlane = 0.34 * W;
  const smallPlane = 0.16 * W;
  const corePlane = 0.4 * W;

  // Avion blanc : translation depuis le centre le long de la diagonale.
  const flyX = fly.interpolate({ inputRange: [0, 1], outputRange: [BLx - 0.5 * W, TRx - 0.5 * W] });
  const flyY = fly.interpolate({ inputRange: [0, 1], outputRange: [BLy - 0.5 * H, TRy - 0.5 * H] });
  const flyOpacity = fly.interpolate({ inputRange: [0, 0.06, 0.82, 1], outputRange: [0, 1, 1, 0] });
  const trailOffset = fly.interpolate({ inputRange: [0, 1], outputRange: [trailLen, 0] });
  const trailOpacity = fly.interpolate({ inputRange: [0, 0.05, 0.7, 1], outputRange: [0, 0.9, 0.85, 0] });

  // Petits avions qui s'échangent (bleu ↔ orange), avec une légère courbe.
  const blueX = ex.interpolate({ inputRange: [0, 0.5, 1], outputRange: [b1x, 0.05 * W, b2x] });
  const blueY = ex.interpolate({ inputRange: [0, 0.5, 1], outputRange: [b1y, -0.05 * H, b2y] });
  const orangeX = ex.interpolate({ inputRange: [0, 0.5, 1], outputRange: [b2x, -0.05 * W, b1x] });
  const orangeY = ex.interpolate({ inputRange: [0, 0.5, 1], outputRange: [b2y, 0.05 * H, b1y] });
  const smallOpacity = ex.interpolate({ inputRange: [0, 0.1, 0.72, 1], outputRange: [0, 1, 1, 0] });

  const popStyle = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }],
  });

  return (
    <Animated.View style={[styles.container, { opacity: container }]} pointerEvents="none">
      <LinearGradient
        colors={['#0A5CFF', '#4FA3FF']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Traînée blanche (se dessine derrière l'avion) */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: trailOpacity }]}>
        <Svg width={W} height={H}>
          <AnimatedPath
            d={`M ${BLx} ${BLy} L ${TRx} ${TRy}`}
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={6}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={trailLen}
            strokeDashoffset={trailOffset}
          />
        </Svg>
      </Animated.View>

      <View style={styles.center}>
        {/* Bulles */}
        <Animated.View style={[styles.abs, { transform: [{ translateX: b1x }, { translateY: b1y }] }]}>
          <Animated.View style={popStyle(bBlue)}>
            <Bubble size={bubbleSize} color="#1B4DFF" />
          </Animated.View>
        </Animated.View>
        <Animated.View style={[styles.abs, { transform: [{ translateX: b2x }, { translateY: b2y }] }]}>
          <Animated.View style={popStyle(bOrange)}>
            <Bubble size={bubbleSize} color="#FF8A3D" flip />
          </Animated.View>
        </Animated.View>

        {/* Petit avion bleu (bulle bleue → bulle orange) */}
        <Animated.View
          style={[
            styles.abs,
            { opacity: smallOpacity, transform: [{ translateX: blueX }, { translateY: blueY }, { rotate: '130deg' }] },
          ]}
        >
          <Plane size={smallPlane} color="#1B4DFF" />
        </Animated.View>

        {/* Petit avion orange (bulle orange → bulle bleue) */}
        <Animated.View
          style={[
            styles.abs,
            { opacity: smallOpacity, transform: [{ translateX: orangeX }, { translateY: orangeY }, { rotate: '-50deg' }] },
          ]}
        >
          <Plane size={smallPlane} color="#FF8A3D" />
        </Animated.View>

        {/* Avion central (le logo se forme) */}
        <Animated.View
          style={{
            opacity: core,
            transform: [{ scale: core.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
          }}
        >
          <Plane size={corePlane} color="#0A2540" />
        </Animated.View>

        {/* Avion blanc traversant */}
        <Animated.View
          style={{
            opacity: flyOpacity,
            transform: [{ translateX: flyX }, { translateY: flyY }, { rotate: '48deg' }],
          }}
        >
          <Plane size={bigPlane} color="#FFFFFF" />
        </Animated.View>
      </View>

      {/* Nom « Wingo » */}
      <Animated.Text
        style={[
          styles.title,
          {
            top: H * 0.62,
            opacity: title,
            transform: [{ translateY: title.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          },
        ]}
      >
        Wingo
      </Animated.Text>
    </Animated.View>
  );
}

/** Avion stylisé (icône « flight »), couleur paramétrable. */
function Plane({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
        fill={color}
      />
    </Svg>
  );
}

/** Bulle de discussion arrondie avec 3 points et une petite queue. */
function Bubble({ size, color, flip }: { size: number; color: string; flip?: boolean }) {
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
  abs: { position: 'absolute' },
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
