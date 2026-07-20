import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { fonts } from '../theme/typography';

/**
 * Splash animé de Wingo (échange linguistique).
 * Scénario :
 *  1. Un avion blanc file du bas-gauche vers le haut-droite, en laissant une
 *     traînée de fumée douce (dégradé transparent → blanc) accrochée à sa queue.
 *  2. Le vrai logo Wingo (avion + deux bulles) apparaît au centre en « pop ».
 *  3. Le nom « Wingo » apparaît en fondu sous le logo, puis transition.
 */
export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const { width: W, height: H } = useWindowDimensions();

  const fly = useRef(new Animated.Value(0)).current; // avion blanc + fumée
  const logo = useRef(new Animated.Value(0)).current; // apparition du vrai logo
  const title = useRef(new Animated.Value(0)).current; // « Wingo »
  const container = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const NO = { useNativeDriver: false } as const;

    Animated.timing(fly, {
      toValue: 1,
      duration: 1400,
      easing: Easing.inOut(Easing.ease),
      ...NO,
    }).start();

    // Le logo « pop » quand l'avion a traversé.
    timers.push(
      setTimeout(
        () =>
          Animated.spring(logo, { toValue: 1, friction: 6, tension: 65, ...NO }).start(),
        1250,
      ),
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
        2050,
      ),
    );

    timers.push(
      setTimeout(() => {
        Animated.timing(container, {
          toValue: 0,
          duration: 450,
          easing: Easing.in(Easing.ease),
          ...NO,
        }).start(() => onDone());
      }, 3300),
    );

    return () => timers.forEach(clearTimeout);
  }, [fly, logo, title, container, onDone]);

  // --- Géométrie ---
  const BLx = 0.1 * W, BLy = 0.88 * H;
  const TRx = 0.9 * W, TRy = 0.12 * H;
  const trailLen = Math.hypot(TRx - BLx, TRy - BLy);
  const trailDeg = (Math.atan2(TRy - BLy, TRx - BLx) * 180) / Math.PI;
  const whiteDeg = `${(Math.atan2(TRx - BLx, -(TRy - BLy)) * 180) / Math.PI}deg`;

  const bigPlane = 0.3 * W;
  const logoSize = 0.52 * W;

  const flyX = fly.interpolate({ inputRange: [0, 1], outputRange: [BLx - 0.5 * W, TRx - 0.5 * W] });
  const flyY = fly.interpolate({ inputRange: [0, 1], outputRange: [BLy - 0.5 * H, TRy - 0.5 * H] });
  const flyOpacity = fly.interpolate({ inputRange: [0, 0.05, 0.85, 1], outputRange: [0, 1, 1, 0] });
  // La fumée s'étire de la queue de l'avion jusqu'au point de départ.
  const trailWidth = fly.interpolate({ inputRange: [0, 1], outputRange: [0, trailLen] });
  const trailOpacity = fly.interpolate({ inputRange: [0, 0.08, 0.75, 1], outputRange: [0, 1, 0.9, 0] });

  const logoScale = logo.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const glowScale = logo.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.1] });
  const glowOpacity = logo.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0.35, 0.35] });

  return (
    <Animated.View style={[styles.container, { opacity: container }]} pointerEvents="none">
      <LinearGradient
        colors={['#0A5CFF', '#4FA3FF']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Traînée de fumée douce, accrochée à la queue de l'avion. */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: trailOpacity }]} pointerEvents="none">
        <View style={{ position: 'absolute', left: BLx, top: BLy, width: 0, height: 0, transform: [{ rotate: `${trailDeg}deg` }] }}>
          {/* Halo large et très diffus */}
          <Animated.View style={{ position: 'absolute', left: 0, top: -13, height: 26, width: trailWidth }}>
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.16)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1, borderRadius: 13 }}
            />
          </Animated.View>
          {/* Cœur de la traînée */}
          <Animated.View style={{ position: 'absolute', left: 0, top: -4, height: 8, width: trailWidth }}>
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1, borderRadius: 4 }}
            />
          </Animated.View>
        </View>
      </Animated.View>

      <View style={styles.center}>
        {/* Halo doux derrière le logo */}
        <Animated.View style={{ position: 'absolute', opacity: glowOpacity, transform: [{ scale: glowScale }] }}>
          <View style={{ width: logoSize * 1.5, height: logoSize * 1.5, borderRadius: logoSize, backgroundColor: 'rgba(255,255,255,0.5)' }} />
        </Animated.View>

        {/* Vrai logo Wingo (image), présenté comme une tuile arrondie. */}
        <Animated.View style={{ opacity: logo, transform: [{ scale: logoScale }] }}>
          <View style={[styles.logoTile, { width: logoSize, height: logoSize, borderRadius: logoSize * 0.23 }]}>
            <Image source={require('../../assets/icon.png')} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </View>
        </Animated.View>

        {/* Avion blanc traversant */}
        <Animated.View
          style={{ position: 'absolute', opacity: flyOpacity, transform: [{ translateX: flyX }, { translateY: flyY }, { rotate: whiteDeg }] }}
        >
          <Plane size={bigPlane} color="#FFFFFF" />
        </Animated.View>
      </View>

      {/* Nom « Wingo » */}
      <Animated.Text
        style={[
          styles.title,
          { top: H * 0.66, opacity: title, transform: [{ translateY: title.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
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
  logoTile: {
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#001A4D',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
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
