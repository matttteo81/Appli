import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Line,
  LinearGradient,
  Polygon,
  Rect,
  Stop,
} from 'react-native-svg';
import type { FarmResident } from '../types/db';
import { SPRITES, activeDisplay, houseFor } from '../lib/farmpixel';

type ActiveInfo = { species: string; feeds: number; name: string | null } | null;

type Props = {
  residents: FarmResident[];
  active: ActiveInfo;
  night: boolean;
};

/** Un animal (image) qui sautille et dérive doucement (le jour). */
function Critter({
  src,
  w,
  h,
  left,
  top,
  animate,
  seed,
}: {
  src: any;
  w: number;
  h: number;
  left: number;
  top: number;
  animate: boolean;
  seed: number;
}) {
  const bob = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animate) return;
    const l1 = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 620 + seed * 400, delay: seed * 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 620 + seed * 400, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    const l2 = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 3400 + seed * 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 3400 + seed * 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    l1.start();
    l2.start();
    return () => { l1.stop(); l2.stop(); };
  }, [animate, bob, drift, seed]);
  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] });
  return (
    <Animated.View style={{ position: 'absolute', left, top, transform: [{ translateX }, { translateY }] }}>
      <Image source={src} style={{ width: w, height: h }} contentFit="contain" />
    </Animated.View>
  );
}

/** Petits « Zzz » qui montent et s'estompent. */
function Zzz({ left, top }: { left: number; top: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -22] });
  const opacity = v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.9, 0.9, 0] });
  return (
    <Animated.Text style={{ position: 'absolute', left, top, fontSize: 20, opacity, transform: [{ translateY }] }}>
      💤
    </Animated.Text>
  );
}

export function PixelFarm({ residents, active, night }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };
  const { w, h } = size;

  if (w === 0 || h === 0) {
    return <View style={StyleSheet.absoluteFill} onLayout={onLayout} />;
  }

  const grassTop = Math.round(h * 0.33);
  const gh = h - grassTop;
  const S = w / 180; // échelle (le décor a été pensé sur une base de 180 de large)

  // Couleurs jour / nuit
  const sky = night ? ['#141131', '#1c1840', '#29234e'] : ['#AEE0F3', '#C6E7EA', '#E4F1D9'];
  const grass = night ? '#2c3a2c' : '#93B788';
  const hill1 = night ? '#3a4a3a' : '#BFD9AE';
  const hill2 = night ? '#2f3d30' : '#A8C3A0';
  const wood = night ? '#5b4632' : '#8A6D4B';
  const pond = night ? '#2a4a63' : '#6FB6D6';
  const treeC = night ? '#33502f' : '#6FA65E';

  // Bâtiments (positions à l'échelle S) — dessinés en SVG
  const buildings: React.ReactNode[] = [];
  const houseAt: Record<string, { x: number; y: number }> = {};
  // Votre maison, toujours là
  const fhx = w * 0.3, fhy = grassTop + gh * 0.16;
  buildings.push(<Farmhouse key="fh" x={fhx} y={fhy} s={S} night={night} />);
  const have = (sp: string) => residents.some((r) => r.species === sp);
  if (have('hen')) { const x = w - 30 * S, y = grassTop + gh * 0.14; buildings.push(<Coop key="coop" x={x} y={y} s={S} night={night} />); houseAt.hen = { x: x + 8 * S, y: y - 24 * S }; }
  if (have('cat')) { const x = 10 * S, y = grassTop + gh * 0.48; buildings.push(<Cathouse key="cat" x={x} y={y} s={S} night={night} />); houseAt.cat = { x: x + 5 * S, y: y - 20 * S }; }
  if (have('dog')) { const x = w - 40 * S, y = grassTop + gh * 0.56; buildings.push(<Doghouse key="dh" x={x} y={y} s={S} night={night} />); houseAt.dog = { x: x + 6 * S, y: y - 21 * S }; }

  // Animaux (images) en overlay
  const overlays: React.ReactNode[] = [];
  const zzz: React.ReactNode[] = [];

  residents.forEach((r, i) => {
    const sp = SPRITES[r.species] ?? SPRITES.hen;
    const dispH = h * 0.11;
    const dispW = dispH * (sp.w / sp.h);
    const left = r.x * w - dispW / 2;
    const top = grassTop + r.y * gh - dispH;
    const house = houseFor(r.species);
    if (night) {
      if (house) {
        // dort dans sa maison : non affiché
      } else {
        overlays.push(<Critter key={r.id} src={sp.src} w={dispW} h={dispH} left={left} top={top} animate={false} seed={(i % 5) / 5} />);
        zzz.push(<Zzz key={'z' + r.id} left={left + dispW * 0.6} top={top - 14} />);
      }
    } else {
      overlays.push(<Critter key={r.id} src={sp.src} w={dispW} h={dispH} left={left} top={top} animate seed={(i % 5) / 5} />);
    }
  });

  // Zzz au-dessus des maisons occupées (la nuit) + votre maison
  if (night) {
    for (const sp of Object.keys(houseAt)) {
      if (have(sp)) zzz.push(<Zzz key={'zh' + sp} left={houseAt[sp].x} top={houseAt[sp].y} />);
    }
    zzz.push(<Zzz key="zfh" left={fhx + 15 * S} top={fhy - 28 * S} />);
  }

  // Animal en cours d'élevage, au centre
  let activeNode: React.ReactNode = null;
  if (active) {
    const { sprite, scale } = activeDisplay(active.species, active.feeds);
    const dispH = h * 0.15 * scale;
    const dispW = dispH * (sprite.w / sprite.h);
    const left = w / 2 - dispW / 2;
    const top = grassTop + gh * 0.5 - dispH;
    activeNode = <Critter key="active" src={sprite.src} w={dispW} h={dispH} left={left} top={top} animate={!night} seed={0.5} />;
    if (night && active.feeds >= 6) zzz.push(<Zzz key="zactive" left={left + dispW * 0.6} top={top - 14} />);
  }

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sky[0]} />
            <Stop offset="0.6" stopColor={sky[1]} />
            <Stop offset="1" stopColor={sky[2]} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={w} height={grassTop} fill="url(#sky)" />
        {/* soleil ou lune */}
        {night ? (
          <>
            <Circle cx={w - 34 * S} cy={40 * S} r={12 * S} fill="#F3ECE1" />
            <Circle cx={w - 28 * S} cy={35 * S} r={11 * S} fill={sky[1]} />
            {STAR_POS.map((p, i) => (
              <Circle key={i} cx={p[0] * w} cy={p[1] * grassTop} r={1.3} fill="#F3ECE1" opacity={0.85} />
            ))}
          </>
        ) : (
          <>
            <Circle cx={w - 30 * S} cy={40 * S} r={13 * S} fill="#F2A65A" />
            <Circle cx={w - 30 * S} cy={40 * S} r={9 * S} fill="#F8CE93" />
          </>
        )}
        {/* collines */}
        <Ellipse cx={w * 0.25} cy={grassTop + 6} rx={w * 0.5} ry={26 * S} fill={hill1} />
        <Ellipse cx={w * 0.85} cy={grassTop + 10} rx={w * 0.5} ry={32 * S} fill={hill2} />
        {/* herbe */}
        <Rect x={0} y={grassTop} width={w} height={gh} fill={grass} />
        {/* clôture */}
        <Rect x={0} y={grassTop - 4 * S} width={w} height={2 * S} fill={wood} />
        {fencePosts(w, grassTop, S, wood)}
        {/* arbre */}
        <Rect x={16 * S} y={grassTop - 20 * S} width={5 * S} height={20 * S} fill={wood} />
        <Circle cx={18 * S} cy={grassTop - 24 * S} r={14 * S} fill={treeC} />
        {/* mare */}
        <Ellipse cx={32 * S} cy={h - 26 * S} rx={22 * S} ry={8 * S} fill={pond} />
        {/* bâtiments */}
        {buildings}
      </Svg>
      {overlays}
      {activeNode}
      {zzz}
    </View>
  );
}

const STAR_POS: [number, number][] = Array.from({ length: 24 }, (_, i) => [
  ((i * 37) % 100) / 100,
  ((i * 53) % 90) / 100,
]);

function fencePosts(w: number, grassTop: number, s: number, color: string) {
  const posts = [];
  for (let x = 8 * s; x < w; x += 22 * s) {
    posts.push(<Rect key={x} x={x} y={grassTop - 10 * s} width={3 * s} height={10 * s} fill={color} />);
  }
  return posts;
}

// ---- Bâtiments (SVG) ----
function Farmhouse({ x, y, s, night }: { x: number; y: number; s: number; night: boolean }) {
  const wall = night ? '#8a6f47' : '#E0C089', roof = night ? '#7a3b3b' : '#C0584E',
    door = night ? '#4a2323' : '#7d3830', win = night ? '#2a4a63' : '#8FD0E8', wood = night ? '#5b4632' : '#8A6D4B';
  return (
    <>
      <Rect x={x} y={y - 16 * s} width={28 * s} height={16 * s} fill={wall} />
      <Polygon points={`${x - 3 * s},${y - 16 * s} ${x + 14 * s},${y - 27 * s} ${x + 31 * s},${y - 16 * s}`} fill={roof} />
      <Rect x={x + 21 * s} y={y - 26 * s} width={4 * s} height={7 * s} fill={wood} />
      <Rect x={x + 4 * s} y={y - 11 * s} width={6 * s} height={6 * s} fill={win} />
      <Rect x={x + 16 * s} y={y - 9 * s} width={7 * s} height={9 * s} fill={door} />
    </>
  );
}
function Coop({ x, y, s, night }: { x: number; y: number; s: number; night: boolean }) {
  const wall = night ? '#7a5a3a' : '#D6A15C', roof = night ? '#5b4632' : '#8A6D4B', hole = night ? '#241c18' : '#3a2a1c';
  return (
    <>
      <Rect x={x} y={y - 14 * s} width={20 * s} height={14 * s} fill={wall} />
      <Polygon points={`${x - 2 * s},${y - 14 * s} ${x + 10 * s},${y - 22 * s} ${x + 22 * s},${y - 14 * s}`} fill={roof} />
      <Rect x={x + 7 * s} y={y - 9 * s} width={7 * s} height={9 * s} fill={hole} />
    </>
  );
}
function Doghouse({ x, y, s, night }: { x: number; y: number; s: number; night: boolean }) {
  const wall = night ? '#6e5638' : '#B07C43', roof = night ? '#4a3a24' : '#7A5024', hole = night ? '#221a12' : '#2e2016';
  return (
    <>
      <Rect x={x} y={y - 11 * s} width={16 * s} height={11 * s} fill={wall} />
      <Polygon points={`${x - 2 * s},${y - 11 * s} ${x + 8 * s},${y - 19 * s} ${x + 18 * s},${y - 11 * s}`} fill={roof} />
      <Rect x={x + 4 * s} y={y - 7 * s} width={8 * s} height={7 * s} rx={3 * s} fill={hole} />
    </>
  );
}
function Cathouse({ x, y, s, night }: { x: number; y: number; s: number; night: boolean }) {
  const wall = night ? '#5b5488' : '#9C93C4', roof = night ? '#3a3466' : '#6C63A0', hole = night ? '#241f3a' : '#2e2850';
  return (
    <>
      <Polygon points={`${x + 1 * s},${y - 11 * s} ${x + 3 * s},${y - 15 * s} ${x + 5 * s},${y - 11 * s}`} fill={wall} />
      <Polygon points={`${x + 9 * s},${y - 11 * s} ${x + 11 * s},${y - 15 * s} ${x + 13 * s},${y - 11 * s}`} fill={wall} />
      <Rect x={x} y={y - 12 * s} width={14 * s} height={12 * s} fill={wall} />
      <Polygon points={`${x - 2 * s},${y - 12 * s} ${x + 7 * s},${y - 18 * s} ${x + 16 * s},${y - 12 * s}`} fill={roof} />
      <Circle cx={x + 7 * s} cy={y - 3 * s} r={4 * s} fill={hole} />
    </>
  );
}
