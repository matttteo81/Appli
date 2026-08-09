import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path } from 'react-native-svg';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

const { width: W, height: H } = Dimensions.get('window');

// Cœurs de départ (gauche = toi) et d'arrivée (droite = ta moitié).
const P0 = { x: W * 0.2, y: H * 0.5 };
const P1 = { x: W * 0.8, y: H * 0.42 };
// Point de contrôle de la courbe (arc au-dessus du monde).
const C = { x: W * 0.5, y: H * 0.14 };

const ARROW_W = 44;
const ARROW_H = 14;
const N = 16;

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

/** Bonhomme minimaliste (tête + corps + bras + jambes). */
function Person({ x, feetY, color, aim }: { x: number; feetY: number; color: string; aim?: boolean }) {
  const armY = feetY - 40;
  return (
    <>
      <Circle cx={x} cy={feetY - 54} r={8} fill={color} />
      <Line x1={x} y1={feetY - 46} x2={x} y2={feetY - 20} stroke={color} strokeWidth={4} strokeLinecap="round" />
      {/* bras : tendus vers l'avant s'il vise */}
      {aim ? (
        <Line x1={x} y1={armY} x2={x + 22} y2={feetY - 48} stroke={color} strokeWidth={4} strokeLinecap="round" />
      ) : (
        <Line x1={x - 12} y1={armY} x2={x + 12} y2={armY - 4} stroke={color} strokeWidth={4} strokeLinecap="round" />
      )}
      <Line x1={x} y1={feetY - 20} x2={x - 9} y2={feetY} stroke={color} strokeWidth={4} strokeLinecap="round" />
      <Line x1={x} y1={feetY - 20} x2={x + 9} y2={feetY} stroke={color} strokeWidth={4} strokeLinecap="round" />
    </>
  );
}

export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const container = useRef(new Animated.Value(1)).current;
  const scene = useRef(new Animated.Value(0)).current;
  const fly = useRef(new Animated.Value(0)).current;
  const rightHeart = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const title = useRef(new Animated.Value(0)).current;

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

  const burstHearts = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ((i * 60) * Math.PI) / 180),
    [],
  );

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scene, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(350),
      Animated.timing(fly, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(rightHeart, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }),
        Animated.timing(burst, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.timing(title, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(750),
    ]).start(() => {
      Animated.timing(container, { toValue: 0, duration: 450, useNativeDriver: true }).start(() => onDone());
    });
  }, [scene, fly, rightHeart, burst, title, container, onDone]);

  const arrowOpacity = fly.interpolate({ inputRange: [0, 0.03, 0.97, 1], outputRange: [0, 1, 1, 0] });
  const translateX = fly.interpolate({ inputRange: path.inputRange, outputRange: path.xs });
  const translateY = fly.interpolate({ inputRange: path.inputRange, outputRange: path.ys });
  const rotate = fly.interpolate({ inputRange: path.inputRange, outputRange: path.rot });

  const leftHeartScale = fly.interpolate({ inputRange: [0, 0.06, 0.14, 1], outputRange: [1, 1.4, 1, 1] });
  const rHeartScale = rightHeart.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.6, 1.35, 1.1] });

  return (
    <Animated.View style={[styles.container, { opacity: container }]} pointerEvents="none">
      <Animated.View style={{ flex: 1, opacity: scene }}>
        <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
          {/* Le monde */}
          <Circle cx={W / 2} cy={H * 1.02} r={W * 0.72} fill={colors.prune} />
          <Ellipse cx={W * 0.32} cy={H * 0.86} rx={W * 0.16} ry={22} fill={colors.pruneDoux} />
          <Ellipse cx={W * 0.66} cy={H * 0.92} rx={W * 0.2} ry={26} fill={colors.pruneDoux} />
          <Path d={`M ${W * 0.5} ${H * 0.36} Q ${W / 2} ${H * 0.95} ${W * 0.5} ${H * 1.5}`} stroke={colors.pruneDoux} strokeWidth={1} fill="none" opacity={0.5} />
          <Path d={`M ${W * 0.2} ${H * 0.45} Q ${W / 2} ${H * 0.95} ${W * 0.8} ${H * 0.45}`} stroke={colors.pruneDoux} strokeWidth={1} fill="none" opacity={0.4} />

          {/* Trajectoire en pointillés */}
          <Path
            d={`M ${P0.x} ${P0.y} Q ${C.x} ${C.y} ${P1.x} ${P1.y}`}
            stroke={colors.ambre}
            strokeWidth={2}
            strokeDasharray="2 7"
            fill="none"
            opacity={0.5}
          />

          {/* Les deux personnes */}
          <Person x={P0.x} feetY={P0.y + 62} color={colors.creme} aim />
          <Person x={P1.x} feetY={P1.y + 62} color={colors.creme} />
        </Svg>

        {/* Cœur de départ */}
        <Animated.Text style={[styles.heart, { left: P0.x - 14, top: P0.y - 16, transform: [{ scale: leftHeartScale }] }]}>
          ❤️
        </Animated.Text>

        {/* Cœur d'arrivée (bat à l'impact) */}
        <Animated.Text style={[styles.heart, { left: P1.x - 14, top: P1.y - 16, transform: [{ scale: rHeartScale }] }]}>
          ❤️
        </Animated.Text>

        {/* Éclat de petits cœurs à l'arrivée */}
        {burstHearts.map((ang, i) => {
          const tx = burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(ang) * 42] });
          const ty = burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(ang) * 42] });
          const op = burst.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 0] });
          return (
            <Animated.Text
              key={i}
              style={[styles.spark, { left: P1.x - 6, top: P1.y - 6, opacity: op, transform: [{ translateX: tx }, { translateY: ty }] }]}
            >
              💕
            </Animated.Text>
          );
        })}

        {/* La flèche qui vole */}
        <Animated.View style={[styles.arrow, { opacity: arrowOpacity, transform: [{ translateX }, { translateY }, { rotate }] }]}>
          <Svg width={ARROW_W} height={ARROW_H} viewBox="0 0 44 14">
            <Line x1={2} y1={7} x2={34} y2={7} stroke={colors.ambre} strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M34 1 L43 7 L34 13 Z" fill={colors.ambre} />
            <Line x1={2} y1={7} x2={8} y2={2} stroke={colors.ambre} strokeWidth={2} strokeLinecap="round" />
            <Line x1={2} y1={7} x2={8} y2={12} stroke={colors.ambre} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </Animated.View>

        {/* Titre */}
        <Animated.View style={[styles.titleWrap, { opacity: title }]}>
          <Text style={styles.title}>Fil</Text>
          <Text style={styles.tagline}>Reliés, où que vous soyez</Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10000,
    backgroundColor: colors.encre,
  },
  heart: { position: 'absolute', fontSize: 28 },
  spark: { position: 'absolute', fontSize: 12 },
  arrow: { position: 'absolute', top: 0, left: 0, width: ARROW_W, height: ARROW_H },
  titleWrap: { position: 'absolute', bottom: H * 0.16, left: 0, right: 0, alignItems: 'center' },
  title: { fontFamily: fonts.displayBold, fontSize: 52, color: colors.creme },
  tagline: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.ambre, marginTop: 4 },
});
