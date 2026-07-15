import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Ellipse, Line, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

const SCENE_H = 280;
const GROUND_H = 96;
const MAX_ROAMING = 9;

type SceneAnimal = { id: string; species: string };

type Props = {
  activeEmoji: string;
  activeSize: number;
  activeScale: Animated.AnimatedInterpolation<number> | Animated.Value;
  badge: string;
  herd: SceneAnimal[];
  night?: boolean;
};

/** Petit hash déterministe (0..1) à partir d'un id, pour disperser sans sauts. */
function hash01(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973;
  return h / 9973;
}

/** Une bestiole qui sautille et dérive doucement sur l'herbe. */
function Critter({
  emoji,
  size,
  left,
  bottom,
  seed,
}: {
  emoji: string;
  size: number;
  left: number;
  bottom: number;
  seed: number;
}) {
  const bob = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bobDur = 620 + Math.round(seed * 500);
    const driftDur = 3200 + Math.round(seed * 2600);
    const delay = Math.round(seed * 900);
    const loopBob = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: bobDur,
          delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: bobDur,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    const loopDrift = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: driftDur,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: driftDur,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loopBob.start();
    loopDrift.start();
    return () => {
      loopBob.stop();
      loopDrift.stop();
    };
  }, [bob, drift, seed]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -9] });
  const translateX = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-16, 16],
  });

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left,
        bottom,
        fontSize: size,
        transform: [{ translateX }, { translateY }],
      }}
    >
      {emoji}
    </Animated.Text>
  );
}

/** Scène de ferme animée : ciel, collines, clôture, et les animaux qui vivent. */
export function FarmScene({
  activeEmoji,
  activeSize,
  activeScale,
  badge,
  herd,
  night,
}: Props) {
  const sky = night
    ? (['#1B1B3A', '#2A2A4E', '#3E3763'] as const)
    : (['#AEE0F3', '#CDEBEA', '#E9F3DE'] as const);
  const roaming = herd.slice(-MAX_ROAMING);
  const extra = herd.length - roaming.length;

  return (
    <View style={styles.scene}>
      <LinearGradient colors={sky} style={StyleSheet.absoluteFill} />

      {/* Soleil ou lune */}
      <Text style={styles.orb}>{night ? '🌙' : '☀️'}</Text>
      <Text style={[styles.cloud, { top: 26, left: 24 }]}>☁️</Text>
      <Text style={[styles.cloud, { top: 52, left: 150, fontSize: 22 }]}>☁️</Text>

      {/* Collines + herbe + clôture (SVG) */}
      <Svg width="100%" height={SCENE_H} style={StyleSheet.absoluteFill}>
        <Ellipse cx="18%" cy={SCENE_H - GROUND_H + 6} rx="150" ry="60" fill="#BFD9AE" />
        <Ellipse cx="88%" cy={SCENE_H - GROUND_H + 10} rx="170" ry="70" fill="#B2D0A0" />
        <Rect
          x="0"
          y={SCENE_H - GROUND_H}
          width="100%"
          height={GROUND_H}
          fill="#A8C3A0"
        />
        {/* Clôture */}
        <Line x1="0" y1={SCENE_H - GROUND_H + 8} x2="100%" y2={SCENE_H - GROUND_H + 8} stroke="#8A6D4B" strokeWidth="4" />
        {[10, 26, 42, 58, 74, 90].map((p) => (
          <Line
            key={p}
            x1={`${p}%`}
            y1={SCENE_H - GROUND_H - 8}
            x2={`${p}%`}
            y2={SCENE_H - GROUND_H + 20}
            stroke="#8A6D4B"
            strokeWidth="4"
          />
        ))}
      </Svg>

      {/* Le troupeau qui se balade */}
      {roaming.map((a, i) => {
        const seed = hash01(a.id);
        const left = 14 + (i * 70) / Math.max(1, Math.min(roaming.length, MAX_ROAMING)) * 3.2;
        const bottom = 12 + Math.round(seed * 46);
        const size = 26 + Math.round(seed * 8);
        return (
          <Critter
            key={a.id}
            emoji={a.species}
            size={size}
            left={left}
            bottom={bottom}
            seed={seed}
          />
        );
      })}
      {extra > 0 ? (
        <View style={styles.extraPill}>
          <Text style={styles.extraText}>+{extra}</Text>
        </View>
      ) : null}

      {/* L'animal qu'on élève en ce moment, au centre */}
      <View style={styles.activeWrap} pointerEvents="none">
        <Animated.Text
          style={{ fontSize: activeSize, transform: [{ scale: activeScale }] }}
        >
          {activeEmoji}
        </Animated.Text>
      </View>

      {/* Badge de stade */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    height: SCENE_H,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  orb: { position: 'absolute', top: 18, right: 22, fontSize: 40 },
  cloud: { position: 'absolute', fontSize: 30, opacity: 0.85 },
  activeWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: GROUND_H - 40,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  badge: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    backgroundColor: colors.ambre,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: fonts.bodySemiBold,
    color: colors.encre,
    fontSize: 14,
  },
  extraPill: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(27,27,58,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  extraText: { color: colors.creme, fontFamily: fonts.monoMedium, fontSize: 12 },
});
