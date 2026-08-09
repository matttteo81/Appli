import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

const { width: W, height: H } = Dimensions.get('window');

// Cœurs (sur la poitrine) : gauche = toi, droite = ta moitié.
const P0 = { x: W * 0.28, y: H * 0.52 };
const P1 = { x: W * 0.72, y: H * 0.44 };
const C = { x: W * 0.5, y: H * 0.1 };

const ARROW_W = 46;
const ARROW_H = 14;
const N = 18;

function bezier(t: number) {
  const mt = 1 - t;
  return {
    x: mt * mt * P0.x + 2 * mt * t * C.x + t * t * P1.x,
    y: mt * mt * P0.y + 2 * mt * t * C.y + t * t * P1.y,
  };
}
function bezierAngle(t: number) {
  const mt = 1 - t;
  const dx = 2 * mt * (C.x - P0.x) + 2 * t * (P1.x - C.x);
  const dy = 2 * mt * (C.y - P0.y) + 2 * t * (P1.y - C.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** Personnage un peu plus travaillé (tête + cheveux + torse + bras + jambes),
 *  construit autour du cœur (hx, hy) placé sur la poitrine. */
function Person({ hx, hy, shirt, hair, aim }: { hx: number; hy: number; shirt: string; hair: string; aim?: boolean }) {
  const skin = '#F0C7A0';
  const headY = hy - 34;
  return (
    <>
      {/* jambes */}
      <Path d={`M ${hx - 6} ${hy + 26} L ${hx - 8} ${hy + 60}`} stroke="#2f2b45" strokeWidth={9} strokeLinecap="round" />
      <Path d={`M ${hx + 6} ${hy + 26} L ${hx + 8} ${hy + 60}`} stroke="#2f2b45" strokeWidth={9} strokeLinecap="round" />
      {/* torse */}
      <Rect x={hx - 15} y={hy - 20} width={30} height={48} rx={13} fill={shirt} />
      {/* bras */}
      {aim ? (
        <>
          {/* bras avant tendu + arc */}
          <Path d={`M ${hx + 8} ${hy - 12} L ${hx + 30} ${hy - 20}`} stroke={skin} strokeWidth={7} strokeLinecap="round" />
          <Path d={`M ${hx + 34} ${hy - 34} Q ${hx + 46} ${hy - 20} ${hx + 34} ${hy - 6}`} stroke="#6b4b2a" strokeWidth={3} fill="none" />
          <Path d={`M ${hx + 34} ${hy - 34} L ${hx + 34} ${hy - 6}`} stroke="#caa46a" strokeWidth={1.5} />
          {/* bras qui tire la corde */}
          <Path d={`M ${hx + 6} ${hy - 12} L ${hx - 6} ${hy - 16}`} stroke={skin} strokeWidth={7} strokeLinecap="round" />
        </>
      ) : (
        <>
          <Path d={`M ${hx - 13} ${hy - 12} L ${hx - 18} ${hy + 10}`} stroke={skin} strokeWidth={7} strokeLinecap="round" />
          <Path d={`M ${hx + 13} ${hy - 12} L ${hx + 18} ${hy + 10}`} stroke={skin} strokeWidth={7} strokeLinecap="round" />
        </>
      )}
      {/* tête + cheveux */}
      <Circle cx={hx} cy={headY} r={13} fill={skin} />
      <Path d={`M ${hx - 13} ${headY - 2} Q ${hx} ${headY - 20} ${hx + 13} ${headY - 2} Q ${hx} ${headY - 8} ${hx - 13} ${headY - 2} Z`} fill={hair} />
    </>
  );
}

export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const container = useRef(new Animated.Value(1)).current;
  const fly = useRef(new Animated.Value(0)).current;
  const leftPulse = useRef(new Animated.Value(0)).current;
  const rightHeart = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const title = useRef(new Animated.Value(0)).current;

  // Caméra : on démarre zoomé sur le tireur (gauche).
  const camScale = useRef(new Animated.Value(2.2)).current;
  const camTx = useRef(new Animated.Value(W / 2 - P0.x)).current;
  const camTy = useRef(new Animated.Value(H / 2 - P0.y)).current;

  const path = useMemo(() => {
    const inputRange = Array.from({ length: N }, (_, i) => i / (N - 1));
    const xs: number[] = [];
    const ys: number[] = [];
    const rot: string[] = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const p = bezier(t);
      xs.push(p.x - ARROW_W / 2);
      ys.push(p.y - ARROW_H / 2);
      rot.push(`${bezierAngle(t)}deg`);
    }
    return { inputRange, xs, ys, rot };
  }, []);

  const burstHearts = useMemo(() => Array.from({ length: 6 }, (_, i) => (i * 60 * Math.PI) / 180), []);

  useEffect(() => {
    const ease = Easing.inOut(Easing.quad);
    Animated.parallel([
      // Caméra : tireur → plan large → cible
      Animated.sequence([
        Animated.delay(750),
        Animated.parallel([
          Animated.timing(camScale, { toValue: 1, duration: 850, easing: ease, useNativeDriver: true }),
          Animated.timing(camTx, { toValue: 0, duration: 850, easing: ease, useNativeDriver: true }),
          Animated.timing(camTy, { toValue: 0, duration: 850, easing: ease, useNativeDriver: true }),
        ]),
        Animated.delay(650),
        Animated.parallel([
          Animated.timing(camScale, { toValue: 2.4, duration: 700, easing: ease, useNativeDriver: true }),
          Animated.timing(camTx, { toValue: W / 2 - P1.x, duration: 700, easing: ease, useNativeDriver: true }),
          Animated.timing(camTy, { toValue: H / 2 - P1.y, duration: 700, easing: ease, useNativeDriver: true }),
        ]),
        Animated.delay(700),
      ]),
      // Flèche
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(fly, { toValue: 1, duration: 1950, easing: ease, useNativeDriver: true }),
      ]),
      // Cœur du tireur qui bat au lancement
      Animated.sequence([
        Animated.delay(560),
        Animated.timing(leftPulse, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.timing(leftPulse, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]),
      // Impact : cœur cible + éclat
      Animated.sequence([
        Animated.delay(2500),
        Animated.parallel([
          Animated.spring(rightHeart, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }),
          Animated.timing(burst, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
      ]),
      // Titre
      Animated.sequence([
        Animated.delay(2950),
        Animated.timing(title, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]).start(() => {
      Animated.timing(container, { toValue: 0, duration: 450, useNativeDriver: true }).start(() => onDone());
    });
  }, [camScale, camTx, camTy, fly, leftPulse, rightHeart, burst, title, container, onDone]);

  const arrowOpacity = fly.interpolate({ inputRange: [0, 0.03, 0.97, 1], outputRange: [0, 1, 1, 0] });
  const translateX = fly.interpolate({ inputRange: path.inputRange, outputRange: path.xs });
  const translateY = fly.interpolate({ inputRange: path.inputRange, outputRange: path.ys });
  const rotate = fly.interpolate({ inputRange: path.inputRange, outputRange: path.rot });

  const leftScale = leftPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
  const rScale = rightHeart.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.55, 1.15] });

  return (
    <Animated.View style={[styles.container, { opacity: container }]} pointerEvents="none">
      {/* Caméra (zoom / travelling) */}
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: camScale }, { translateX: camTx }, { translateY: camTy }] }]}>
        <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
          {/* Le monde */}
          <Circle cx={W / 2} cy={H * 1.05} r={W * 0.78} fill={colors.prune} />
          <Ellipse cx={W * 0.3} cy={H * 0.9} rx={W * 0.17} ry={24} fill={colors.pruneDoux} />
          <Ellipse cx={W * 0.68} cy={H * 0.96} rx={W * 0.22} ry={28} fill={colors.pruneDoux} />
          <Path d={`M ${W * 0.2} ${H * 0.5} Q ${W / 2} ${H} ${W * 0.8} ${H * 0.5}`} stroke={colors.pruneDoux} strokeWidth={1} fill="none" opacity={0.4} />
          {/* Trajectoire pointillée */}
          <Path d={`M ${P0.x} ${P0.y} Q ${C.x} ${C.y} ${P1.x} ${P1.y}`} stroke={colors.ambre} strokeWidth={2} strokeDasharray="2 8" fill="none" opacity={0.45} />
          {/* Personnages */}
          <Person hx={P0.x} hy={P0.y} shirt={colors.corail} hair="#5b3a2a" aim />
          <Person hx={P1.x} hy={P1.y} shirt={colors.sauge} hair="#2f2b45" />
        </Svg>

        <Animated.Text style={[styles.heart, { left: P0.x - 13, top: P0.y - 15, transform: [{ scale: leftScale }] }]}>❤️</Animated.Text>
        <Animated.Text style={[styles.heart, { left: P1.x - 13, top: P1.y - 15, transform: [{ scale: rScale }] }]}>❤️</Animated.Text>

        {burstHearts.map((ang, i) => {
          const tx = burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(ang) * 40] });
          const ty = burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(ang) * 40] });
          const op = burst.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 0] });
          return (
            <Animated.Text key={i} style={[styles.spark, { left: P1.x - 6, top: P1.y - 6, opacity: op, transform: [{ translateX: tx }, { translateY: ty }] }]}>
              💕
            </Animated.Text>
          );
        })}

        <Animated.View style={[styles.arrow, { opacity: arrowOpacity, transform: [{ translateX }, { translateY }, { rotate }] }]}>
          <Svg width={ARROW_W} height={ARROW_H} viewBox="0 0 46 14">
            <Path d="M2 7 L36 7" stroke={colors.ambre} strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M36 1 L45 7 L36 13 Z" fill={colors.ambre} />
            <Path d="M2 7 L8 2" stroke={colors.ambre} strokeWidth={2} strokeLinecap="round" />
            <Path d="M2 7 L8 12" stroke={colors.ambre} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* Titre (hors caméra) */}
      <Animated.View style={[styles.titleWrap, { opacity: title }]}>
        <Text style={styles.title}>Fil</Text>
        <Text style={styles.tagline}>Reliés, où que vous soyez</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, backgroundColor: colors.encre },
  heart: { position: 'absolute', fontSize: 26 },
  spark: { position: 'absolute', fontSize: 12 },
  arrow: { position: 'absolute', top: 0, left: 0, width: ARROW_W, height: ARROW_H },
  titleWrap: { position: 'absolute', bottom: H * 0.14, left: 0, right: 0, alignItems: 'center' },
  title: { fontFamily: fonts.displayBold, fontSize: 54, color: colors.creme },
  tagline: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.ambre, marginTop: 4 },
});
