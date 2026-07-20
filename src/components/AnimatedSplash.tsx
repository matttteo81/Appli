import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { fonts } from '../theme/typography';

/**
 * Splash animé de Wingo (échange linguistique).
 * Scénario :
 *  1. Un avion blanc file du bas-gauche vers le haut-droite, sa traînée
 *     blanche se dessinant exactement derrière lui.
 *  2. À son passage au centre, les deux bulles (bleue + orange) apparaissent.
 *  3. Un petit avion bleu sort de la bulle bleue et un petit avion orange de
 *     la bulle orange : ils se croisent au centre (l'échange).
 *  4. Au croisement, l'avion central (incliné) se forme avec les bulles
 *     → le logo. Puis « Wingo » apparaît en fondu.
 */
export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const { width: W, height: H } = useWindowDimensions();

  const fly = useRef(new Animated.Value(0)).current;
  const bBlue = useRef(new Animated.Value(0)).current;
  const bOrange = useRef(new Animated.Value(0)).current;
  const ex = useRef(new Animated.Value(0)).current;
  const core = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const title = useRef(new Animated.Value(0)).current;
  const container = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const NO = { useNativeDriver: false } as const;

    Animated.timing(fly, {
      toValue: 1,
      duration: 1200,
      easing: Easing.inOut(Easing.ease),
      ...NO,
    }).start();

    const pop = (v: Animated.Value) =>
      Animated.spring(v, { toValue: 1, friction: 5, tension: 90, ...NO });

    timers.push(setTimeout(() => pop(bBlue).start(), 760));
    timers.push(setTimeout(() => pop(bOrange).start(), 960));

    timers.push(
      setTimeout(
        () =>
          Animated.timing(ex, {
            toValue: 1,
            duration: 1300,
            easing: Easing.inOut(Easing.ease),
            ...NO,
          }).start(),
        1300,
      ),
    );

    // Au croisement (centre) : flash + formation de l'avion central.
    timers.push(
      setTimeout(() => {
        Animated.timing(flash, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.ease),
          ...NO,
        }).start();
        Animated.spring(core, { toValue: 1, friction: 6, tension: 70, ...NO }).start();
      }, 2000),
    );

    timers.push(
      setTimeout(
        () =>
          Animated.timing(title, {
            toValue: 1,
            duration: 450,
            easing: Easing.out(Easing.ease),
            ...NO,
          }).start(),
        2800,
      ),
    );

    timers.push(
      setTimeout(() => {
        Animated.timing(container, {
          toValue: 0,
          duration: 400,
          easing: Easing.in(Easing.ease),
          ...NO,
        }).start(() => onDone());
      }, 3700),
    );

    return () => timers.forEach(clearTimeout);
  }, [fly, bBlue, bOrange, ex, core, flash, title, container, onDone]);

  // --- Géométrie ---
  const BLx = 0.12 * W, BLy = 0.86 * H;
  const TRx = 0.88 * W, TRy = 0.14 * H;
  const trailLen = Math.hypot(TRx - BLx, TRy - BLy);
  const trailDeg = (Math.atan2(TRy - BLy, TRx - BLx) * 180) / Math.PI;
  // Angle du nez de l'avion (le tracé pointe vers le haut par défaut).
  const noseDeg = (dx: number, dy: number) => (Math.atan2(dx, -dy) * 180) / Math.PI;

  // Bulles (logo) — resserrées pour former une unité.
  const b1x = -0.14 * W, b1y = -0.075 * H; // bleue (haut-gauche)
  const b2x = 0.14 * W, b2y = 0.075 * H; // orange (bas-droite)

  const bubbleSize = 0.26 * W;
  const bigPlane = 0.32 * W;
  const smallPlane = 0.15 * W;
  const corePlane = 0.4 * W;

  // Avion blanc + traînée.
  const flyX = fly.interpolate({ inputRange: [0, 1], outputRange: [BLx - 0.5 * W, TRx - 0.5 * W] });
  const flyY = fly.interpolate({ inputRange: [0, 1], outputRange: [BLy - 0.5 * H, TRy - 0.5 * H] });
  const flyOpacity = fly.interpolate({ inputRange: [0, 0.06, 0.82, 1], outputRange: [0, 1, 1, 0] });
  const trailWidth = fly.interpolate({ inputRange: [0, 1], outputRange: [0, trailLen] });
  const trailOpacity = fly.interpolate({ inputRange: [0, 0.05, 0.7, 1], outputRange: [0, 0.9, 0.85, 0] });
  const whiteDeg = `${noseDeg(TRx - BLx, TRy - BLy)}deg`;

  // Petits avions (croisement, puis fondu au centre).
  const blueX = ex.interpolate({ inputRange: [0, 1], outputRange: [b1x, b2x] });
  const blueY = ex.interpolate({ inputRange: [0, 1], outputRange: [b1y, b2y] });
  const orangeX = ex.interpolate({ inputRange: [0, 1], outputRange: [b2x, b1x] });
  const orangeY = ex.interpolate({ inputRange: [0, 1], outputRange: [b2y, b1y] });
  const smallOpacity = ex.interpolate({ inputRange: [0, 0.12, 0.5, 0.62], outputRange: [0, 1, 1, 0] });
  const blueDeg = `${noseDeg(b2x - b1x, b2y - b1y)}deg`;
  const orangeDeg = `${noseDeg(b1x - b2x, b1y - b2y)}deg`;

  // Flash au centre.
  const flashScale = flash.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.5] });
  const flashOpacity = flash.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.7, 0.5, 0] });

  const popStyle = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }],
  });

  const flashSize = 0.5 * W;

  return (
    <Animated.View style={[styles.container, { opacity: container }]} pointerEvents="none">
      <LinearGradient
        colors={['#0A5CFF', '#4FA3FF']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Traînée blanche : barre qui grandit exactement jusqu'à l'avion. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ position: 'absolute', left: BLx, top: BLy, width: 0, height: 0, transform: [{ rotate: `${trailDeg}deg` }] }}>
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              top: -3,
              height: 6,
              width: trailWidth,
              opacity: trailOpacity,
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderRadius: 3,
            }}
          />
        </View>
      </View>

      <View style={styles.center}>
        {/* Flash au croisement */}
        <Animated.View style={{ position: 'absolute', opacity: flashOpacity, transform: [{ scale: flashScale }] }}>
          <Svg width={flashSize} height={flashSize}>
            <Circle cx={flashSize / 2} cy={flashSize / 2} r={flashSize / 2} fill="rgba(255,255,255,0.5)" />
          </Svg>
        </Animated.View>

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

        {/* Petit avion bleu (bulle bleue → centre → bulle orange) */}
        <Animated.View
          style={[styles.abs, { opacity: smallOpacity, transform: [{ translateX: blueX }, { translateY: blueY }, { rotate: blueDeg }] }]}
        >
          <Plane size={smallPlane} color="#1B4DFF" />
        </Animated.View>

        {/* Petit avion orange (bulle orange → centre → bulle bleue) */}
        <Animated.View
          style={[styles.abs, { opacity: smallOpacity, transform: [{ translateX: orangeX }, { translateY: orangeY }, { rotate: orangeDeg }] }]}
        >
          <Plane size={smallPlane} color="#FF8A3D" />
        </Animated.View>

        {/* Avion central incliné (le logo se forme) */}
        <Animated.View
          style={{
            opacity: core,
            transform: [
              { scale: core.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
              { rotate: '28deg' },
            ],
          }}
        >
          <Plane size={corePlane} color="#0A2540" />
        </Animated.View>

        {/* Avion blanc traversant */}
        <Animated.View
          style={{ opacity: flyOpacity, transform: [{ translateX: flyX }, { translateY: flyY }, { rotate: whiteDeg }] }}
        >
          <Plane size={bigPlane} color="#FFFFFF" />
        </Animated.View>
      </View>

      {/* Nom « Wingo » */}
      <Animated.Text
        style={[
          styles.title,
          { top: H * 0.62, opacity: title, transform: [{ translateY: title.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
        ]}
      >
        Wingo
      </Animated.Text>
    </Animated.View>
  );
}

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
