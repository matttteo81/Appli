import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
} from 'react-native-svg';
import type { FarmResident } from '../types/db';
import { activeDisplay, houseFor, residentSprite, Season } from '../lib/farmpixel';

type ActiveInfo = { species: string; feeds: number; name: string | null; color: number } | null;
type WeatherKind = 'clear' | 'clouds' | 'rain' | 'snow' | 'fog' | 'storm';

type Props = {
  residents: FarmResident[];
  active: ActiveInfo;
  night: boolean;
  weather?: WeatherKind;
  season?: Season;
};

const POKES = ['❤️', '✨', '💛', '🥰'];

/** Un animal (image) qui sautille et dérive doucement (le jour). On peut le
 *  toucher : il fait un bond et un petit cœur s'envole. */
function Critter({
  src, w, h, left, top, animate, seed, pokeable = false,
}: {
  src: any; w: number; h: number; left: number; top: number; animate: boolean; seed: number; pokeable?: boolean;
}) {
  const bob = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const jump = useRef(new Animated.Value(0)).current;
  const heart = useRef(new Animated.Value(0)).current;
  const [emoji, setEmoji] = useState('❤️');

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

  const onPoke = () => {
    setEmoji(POKES[Math.floor(Math.random() * POKES.length)]);
    jump.setValue(0);
    heart.setValue(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(jump, { toValue: 1, duration: 480, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => jump.setValue(0));
    Animated.timing(heart, { toValue: 1, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] });
  const jumpY = jump.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, -h * 0.55, 0] });
  const heartY = heart.interpolate({ inputRange: [0, 1], outputRange: [-4, -48] });
  const heartOp = heart.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.View style={{ position: 'absolute', left, top, transform: [{ translateX }, { translateY }] }}>
      <Pressable onPress={pokeable ? onPoke : undefined} disabled={!pokeable}>
        <Animated.View style={{ transform: [{ translateY: jumpY }] }}>
          <Image source={src} style={{ width: w, height: h }} contentFit="contain" />
        </Animated.View>
      </Pressable>
      <Animated.Text style={{ position: 'absolute', left: w * 0.55, top: -4, fontSize: 20, opacity: heartOp, transform: [{ translateY: heartY }] }}>
        {emoji}
      </Animated.Text>
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

/** Papillon qui vole en zigzag et bat des ailes (le jour, beau temps). */
function Butterfly({ areaW, top, size, dur, delay, c1, c2, dir }: {
  areaW: number; top: number; size: number; dur: number; delay: number; c1: string; c2: string; dir: 1 | -1;
}) {
  const move = useRef(new Animated.Value(0)).current;
  const wob = useRef(new Animated.Value(0)).current;
  const flap = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const m = Animated.loop(Animated.sequence([
      Animated.timing(move, { toValue: 1, duration: dur, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(move, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const wo = Animated.loop(Animated.sequence([
      Animated.timing(wob, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(wob, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const fl = Animated.loop(Animated.timing(flap, { toValue: 1, duration: 190, easing: Easing.linear, useNativeDriver: true }));
    m.start(); wo.start(); fl.start();
    return () => { m.stop(); wo.stop(); fl.stop(); };
  }, [move, wob, flap, dur, delay]);
  const tx = move.interpolate({ inputRange: [0, 1], outputRange: dir > 0 ? [0, areaW - size] : [areaW - size, 0] });
  const ty = wob.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  const sx = flap.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.3, 1] });
  return (
    <Animated.View style={{ position: 'absolute', left: 0, top, transform: [{ translateX: tx }, { translateY: ty }] }}>
      <Animated.View style={{ transform: [{ scaleX: sx }] }}>
        <Svg width={size} height={size * 0.85} viewBox="0 0 24 20">
          <Path d="M12 10 C 1 -1, -1 9, 6 11 C 0 17, 10 18, 12 11 Z" fill={c1} />
          <Path d="M12 10 C 23 -1, 25 9, 18 11 C 24 17, 14 18, 12 11 Z" fill={c2} />
          <Rect x={11.2} y={4} width={1.6} height={12} rx={0.8} fill="#3a2f57" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

/** Oiseau qui traverse le ciel en battant des ailes. */
function Bird({ areaW, top, size, dur, delay }: { areaW: number; top: number; size: number; dur: number; delay: number }) {
  const move = useRef(new Animated.Value(0)).current;
  const beat = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const m = Animated.loop(Animated.timing(move, { toValue: 1, duration: dur, delay, easing: Easing.linear, useNativeDriver: true }));
    const b = Animated.loop(Animated.sequence([
      Animated.timing(beat, { toValue: 1, duration: 320, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(beat, { toValue: 0, duration: 320, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    m.start(); b.start();
    return () => { m.stop(); b.stop(); };
  }, [move, beat, dur, delay]);
  const tx = move.interpolate({ inputRange: [0, 1], outputRange: [-size * 2, areaW + size] });
  const ty = move.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -12, 0] });
  const sy = beat.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] });
  return (
    <Animated.View style={{ position: 'absolute', left: 0, top, transform: [{ translateX: tx }, { translateY: ty }] }}>
      <Animated.View style={{ transform: [{ scaleY: sy }] }}>
        <Svg width={size} height={size * 0.5} viewBox="0 0 28 14">
          <Path d="M2 10 Q 9 2 14 8 Q 19 2 26 10" fill="none" stroke="#2f2b45" strokeWidth={2.4} strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

/** Une goutte de pluie ou un flocon qui tombe en boucle. */
function Particle({ kind, x, w, h, dur, delay, size }: {
  kind: 'rain' | 'snow'; x: number; w: number; h: number; dur: number; delay: number; size: number;
}) {
  const fall = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const f = Animated.loop(Animated.timing(fall, { toValue: 1, duration: dur, delay, easing: Easing.linear, useNativeDriver: true }));
    f.start();
    let s: Animated.CompositeAnimation | null = null;
    if (kind === 'snow') {
      s = Animated.loop(Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
      s.start();
    }
    return () => { f.stop(); s?.stop(); };
  }, [fall, sway, dur, delay, kind]);
  const ty = fall.interpolate({ inputRange: [0, 1], outputRange: [-10, h] });
  const tx = sway.interpolate({ inputRange: [0, 1], outputRange: [-8, 8] });
  if (kind === 'snow') {
    return (
      <Animated.Text style={{ position: 'absolute', left: x, top: 0, color: '#FFFFFF', fontSize: size, opacity: 0.9, transform: [{ translateY: ty }, { translateX: tx }] }}>
        ❄
      </Animated.Text>
    );
  }
  return (
    <Animated.View style={{ position: 'absolute', left: x, top: 0, width: 2, height: 12, borderRadius: 2, backgroundColor: 'rgba(180,210,240,0.75)', transform: [{ translateY: ty }] }} />
  );
}

export function PixelFarm({ residents, active, night, weather = 'clear', season = 'summer' }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };
  const { w, h } = size;

  const flakes = useMemo(() => {
    if (weather !== 'rain' && weather !== 'snow' && weather !== 'storm') return [];
    const kind: 'rain' | 'snow' = weather === 'snow' ? 'snow' : 'rain';
    const n = kind === 'snow' ? 16 : 18;
    return Array.from({ length: n }, (_, i) => ({
      id: i, kind, x: Math.random(),
      dur: kind === 'snow' ? 4200 + Math.random() * 3500 : 750 + Math.random() * 500,
      delay: Math.random() * 2500, size: 8 + Math.random() * 10,
    }));
  }, [weather]);

  if (w === 0 || h === 0) {
    return <View style={StyleSheet.absoluteFill} onLayout={onLayout} />;
  }

  const grassTop = Math.round(h * 0.33);
  const gh = h - grassTop;
  const S = w / 180;

  const sky = night ? ['#141131', '#1c1840', '#29234e'] : ['#AEE0F3', '#C6E7EA', '#E4F1D9'];
  const grass = night ? '#2c3a2c' : '#93B788';
  const hill1 = night ? '#3a4a3a' : '#BFD9AE';
  const hill2 = night ? '#2f3d30' : '#A8C3A0';
  const wood = night ? '#5b4632' : '#8A6D4B';
  const pond = night ? '#2a4a63' : '#6FB6D6';
  const treeC = night ? '#33502f' : '#6FA65E';

  const buildings: React.ReactNode[] = [];
  const houseAt: Record<string, { x: number; y: number }> = {};
  const fhx = w * 0.3, fhy = grassTop + gh * 0.16;
  buildings.push(<Farmhouse key="fh" x={fhx} y={fhy} s={S} night={night} />);
  const have = (sp: string) => residents.some((r) => r.species === sp);
  if (have('hen')) { const x = w - 30 * S, y = grassTop + gh * 0.14; buildings.push(<Coop key="coop" x={x} y={y} s={S} night={night} />); houseAt.hen = { x: x + 8 * S, y: y - 24 * S }; }
  if (have('cat')) { const x = 10 * S, y = grassTop + gh * 0.48; buildings.push(<Cathouse key="cat" x={x} y={y} s={S} night={night} />); houseAt.cat = { x: x + 5 * S, y: y - 20 * S }; }
  if (have('dog')) { const x = w - 40 * S, y = grassTop + gh * 0.56; buildings.push(<Doghouse key="dh" x={x} y={y} s={S} night={night} />); houseAt.dog = { x: x + 6 * S, y: y - 21 * S }; }

  const overlays: React.ReactNode[] = [];
  const zzz: React.ReactNode[] = [];

  residents.forEach((r, i) => {
    const sp = residentSprite(r.species, r.color ?? 0);
    const dispH = h * 0.11;
    const dispW = dispH * (sp.w / sp.h);
    const left = r.x * w - dispW / 2;
    const top = grassTop + r.y * gh - dispH;
    const house = houseFor(r.species);
    if (night) {
      if (!house) {
        overlays.push(<Critter key={r.id} src={sp.src} w={dispW} h={dispH} left={left} top={top} animate={false} seed={(i % 5) / 5} />);
        zzz.push(<Zzz key={'z' + r.id} left={left + dispW * 0.6} top={top - 14} />);
      }
    } else {
      overlays.push(<Critter key={r.id} src={sp.src} w={dispW} h={dispH} left={left} top={top} animate seed={(i % 5) / 5} pokeable />);
    }
  });

  if (night) {
    for (const sp of Object.keys(houseAt)) {
      if (have(sp)) zzz.push(<Zzz key={'zh' + sp} left={houseAt[sp].x} top={houseAt[sp].y} />);
    }
    zzz.push(<Zzz key="zfh" left={fhx + 15 * S} top={fhy - 28 * S} />);
  }

  let activeNode: React.ReactNode = null;
  if (active) {
    const { sprite, scale } = activeDisplay(active.species, active.color, active.feeds);
    const dispH = h * 0.15 * scale;
    const dispW = dispH * (sprite.w / sprite.h);
    const left = w / 2 - dispW / 2;
    const top = grassTop + gh * 0.5 - dispH;
    activeNode = <Critter key="active" src={sprite.src} w={dispW} h={dispH} left={left} top={top} animate={!night} seed={0.5} pokeable={!night} />;
    if (night && active.feeds >= 6) zzz.push(<Zzz key="zactive" left={left + dispW * 0.6} top={top - 14} />);
  }

  // Feuilles mortes au sol au printemps.
  const springLeaves = season === 'spring'
    ? [[0.18, 0.78], [0.31, 0.9], [0.47, 0.83], [0.63, 0.92], [0.77, 0.8], [0.4, 0.73]].map(([fx, fy], i) => (
        <View key={'lf' + i} style={{ position: 'absolute', left: fx * w, top: grassTop + fy * gh, transform: [{ rotate: `${(i * 47) % 90 - 30}deg` }] }}>
          <Svg width={12 * S} height={9 * S} viewBox="0 0 12 9"><Path d="M1 8 Q 6 -2 11 4 Q 7 9 1 8 Z" fill="#9C6B3F" /></Svg>
        </View>
      ))
    : null;

  const showButterflies = !night && (weather === 'clear' || weather === 'clouds');
  const showBirds = !night && weather !== 'storm';

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
        <Ellipse cx={w * 0.25} cy={grassTop + 6} rx={w * 0.5} ry={26 * S} fill={hill1} />
        <Ellipse cx={w * 0.85} cy={grassTop + 10} rx={w * 0.5} ry={32 * S} fill={hill2} />
        <Rect x={0} y={grassTop} width={w} height={gh} fill={grass} />
        <Rect x={0} y={grassTop - 4 * S} width={w} height={2 * S} fill={wood} />
        {fencePosts(w, grassTop, S, wood)}
        <Rect x={16 * S} y={grassTop - 20 * S} width={5 * S} height={20 * S} fill={wood} />
        <Circle cx={18 * S} cy={grassTop - 24 * S} r={14 * S} fill={treeC} />
        <Ellipse cx={32 * S} cy={h - 26 * S} rx={22 * S} ry={8 * S} fill={pond} />

        {/* Flaques quand il pleut */}
        {weather === 'rain' || weather === 'storm' ? (
          <>
            <Ellipse cx={w * 0.22} cy={grassTop + gh * 0.82} rx={26 * S} ry={6 * S} fill="#8FD0E8" opacity={0.5} />
            <Ellipse cx={w * 0.62} cy={grassTop + gh * 0.92} rx={30 * S} ry={7 * S} fill="#8FD0E8" opacity={0.5} />
            <Ellipse cx={w * 0.82} cy={grassTop + gh * 0.72} rx={19 * S} ry={5 * S} fill="#8FD0E8" opacity={0.5} />
          </>
        ) : null}

        {/* Neige au sol */}
        {weather === 'snow' ? (
          <>
            <Rect x={0} y={grassTop} width={w} height={gh} fill="#FFFFFF" opacity={0.5} />
            <Ellipse cx={w * 0.22} cy={h - 12 * S} rx={40 * S} ry={11 * S} fill="#FFFFFF" opacity={0.92} />
            <Ellipse cx={w * 0.72} cy={h - 6 * S} rx={46 * S} ry={12 * S} fill="#FFFFFF" opacity={0.92} />
          </>
        ) : null}

        {buildings}
      </Svg>

      {springLeaves}
      {showButterflies ? (
        <>
          <Butterfly areaW={w} top={grassTop * 0.55} size={22 * Math.max(1, S)} dur={7000} delay={0} c1="#EF8C7C" c2="#F2A65A" dir={1} />
          <Butterfly areaW={w} top={grassTop * 0.8} size={20 * Math.max(1, S)} dur={9000} delay={1500} c1="#C58BC0" c2="#EF8C7C" dir={-1} />
        </>
      ) : null}
      {showBirds ? (
        <>
          <Bird areaW={w} top={grassTop * 0.28} size={26 * Math.max(1, S)} dur={11000} delay={0} />
          <Bird areaW={w} top={grassTop * 0.42} size={22 * Math.max(1, S)} dur={13000} delay={3000} />
        </>
      ) : null}

      {overlays}
      {activeNode}
      {zzz}

      {/* Pluie / neige qui tombe */}
      {flakes.map((f) => (
        <Particle key={f.id} kind={f.kind} x={f.x * w} w={w} h={h} dur={f.dur} delay={f.delay} size={f.size} />
      ))}
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
      <Rect x={x} y={y - 12 * s} width={14 * s} height={12 * s} fill={wall} />
      <Polygon points={`${x - 2 * s},${y - 12 * s} ${x + 7 * s},${y - 18 * s} ${x + 16 * s},${y - 12 * s}`} fill={roof} />
      <Circle cx={x + 7 * s} cy={y - 3 * s} r={4 * s} fill={hole} />
    </>
  );
}
