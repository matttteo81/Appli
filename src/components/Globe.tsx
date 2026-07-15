import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Line,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

type Place = { lat: number; lng: number; name: string | null };

type Props = {
  me: Place | null;
  partner: Place | null;
  size: number;
};

const DEG = Math.PI / 180;

/** Projection orthographique (globe vu de face), centrée sur (lat0, lon0). */
function project(
  lat: number,
  lng: number,
  lat0: number,
  lon0: number,
  R: number,
  cx: number,
  cy: number,
) {
  const φ = lat * DEG;
  const λ = lng * DEG;
  const φ0 = lat0 * DEG;
  const dλ = λ - lon0 * DEG;
  const cosc = Math.sin(φ0) * Math.sin(φ) + Math.cos(φ0) * Math.cos(φ) * Math.cos(dλ);
  const x = Math.cos(φ) * Math.sin(dλ);
  const y = Math.cos(φ0) * Math.sin(φ) - Math.sin(φ0) * Math.cos(φ) * Math.cos(dλ);
  return { x: cx + x * R, y: cy - y * R, visible: cosc >= -0.05 };
}

/** Point d'une courbe de Bézier quadratique. */
function bezier(t: number, p0: number, p1: number, p2: number) {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

/** Globe stylisé : océan, graticule, les deux villes, l'arc et l'avion. */
export function Globe({ me, partner, size }: Props) {
  const R = size * 0.42;
  const cx = size / 2;
  const cy = size / 2;

  // Centre du globe : milieu des deux villes (ou la ville connue).
  const { lat0, lon0 } = useMemo(() => {
    const pts = [me, partner].filter(Boolean) as Place[];
    if (pts.length === 2) {
      const la = (pts[0].lat + pts[1].lat) / 2;
      // moyenne de longitude en tenant compte du passage ±180°
      const x = pts.reduce((s, p) => s + Math.cos(p.lng * DEG), 0);
      const y = pts.reduce((s, p) => s + Math.sin(p.lng * DEG), 0);
      const lo = Math.atan2(y, x) / DEG;
      return { lat0: Math.max(-40, Math.min(60, la)), lon0: lo };
    }
    if (pts.length === 1) return { lat0: pts[0].lat, lon0: pts[0].lng };
    return { lat0: 30, lon0: 20 };
  }, [me, partner]);

  const pMe = me ? project(me.lat, me.lng, lat0, lon0, R, cx, cy) : null;
  const pPa = partner ? project(partner.lat, partner.lng, lat0, lon0, R, cx, cy) : null;

  // Graticule : méridiens + parallèles (échantillonnés, seulement la face visible).
  const grid = useMemo(() => {
    const paths: string[] = [];
    for (let mer = -180; mer < 180; mer += 30) {
      let d = '';
      let started = false;
      for (let la = -90; la <= 90; la += 6) {
        const p = project(la, mer, lat0, lon0, R, cx, cy);
        if (p.visible) {
          d += `${started ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
          started = true;
        } else started = false;
      }
      if (d) paths.push(d);
    }
    for (let par = -60; par <= 60; par += 30) {
      let d = '';
      let started = false;
      for (let lo = -180; lo <= 180; lo += 6) {
        const p = project(par, lo, lat0, lon0, R, cx, cy);
        if (p.visible) {
          d += `${started ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
          started = true;
        } else started = false;
      }
      if (d) paths.push(d);
    }
    return paths;
  }, [lat0, lon0, R, cx, cy]);

  // Arc de vol (Bézier bombant vers l'extérieur du globe).
  const arc = useMemo(() => {
    if (!pMe || !pPa) return null;
    const mx = (pMe.x + pPa.x) / 2;
    const my = (pMe.y + pPa.y) / 2;
    // pousser le point de contrôle loin du centre du globe
    const dx = mx - cx;
    const dy = my - cy;
    const len = Math.hypot(dx, dy) || 1;
    const push = R * 0.5;
    const controlX = mx + (dx / len) * push;
    const controlY = my + (dy / len) * push;
    return { controlX, controlY };
  }, [pMe, pPa, cx, cy, R]);

  // Animation de l'avion le long de l'arc.
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!arc) return;
    const loop = Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: 5200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    t.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [arc, t]);

  const planeStyle = useMemo(() => {
    if (!arc || !pMe || !pPa) return null;
    const N = 24;
    const xs: number[] = [];
    const ys: number[] = [];
    const input: number[] = [];
    for (let i = 0; i <= N; i++) {
      const tt = i / N;
      input.push(tt);
      xs.push(bezier(tt, pMe.x, arc.controlX, pPa.x));
      ys.push(bezier(tt, pMe.y, arc.controlY, pPa.y));
    }
    return {
      transform: [
        { translateX: t.interpolate({ inputRange: input, outputRange: xs }) },
        { translateY: t.interpolate({ inputRange: input, outputRange: ys }) },
      ],
    };
  }, [arc, pMe, pPa, t]);

  const arcPath =
    arc && pMe && pPa
      ? `M ${pMe.x} ${pMe.y} Q ${arc.controlX} ${arc.controlY} ${pPa.x} ${pPa.y}`
      : null;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="ocean" cx="38%" cy="34%" r="75%">
            <Stop offset="0%" stopColor="#5FB0D8" />
            <Stop offset="55%" stopColor="#2E6C9E" />
            <Stop offset="100%" stopColor="#173A5E" />
          </RadialGradient>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#8FD0F0" stopOpacity="0.35" />
            <Stop offset="100%" stopColor="#8FD0F0" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* halo */}
        <Circle cx={cx} cy={cy} r={R * 1.18} fill="url(#glow)" />
        {/* océan */}
        <Circle cx={cx} cy={cy} r={R} fill="url(#ocean)" />

        {/* graticule */}
        {grid.map((d, i) => (
          <Path
            key={i}
            d={d}
            stroke="#BfE3F5"
            strokeWidth={1}
            strokeOpacity={0.28}
            fill="none"
          />
        ))}
        {/* contour */}
        <Circle cx={cx} cy={cy} r={R} stroke="#BfE3F5" strokeOpacity={0.5} strokeWidth={1.5} fill="none" />
        {/* ombré pour le relief de la sphère */}
        <Ellipse cx={cx + R * 0.28} cy={cy + R * 0.3} rx={R * 0.9} ry={R * 0.9} fill="#0B1E33" opacity={0.18} />

        {/* arc de vol */}
        {arcPath ? (
          <Path
            d={arcPath}
            stroke={colors.ambre}
            strokeWidth={2}
            strokeDasharray="5 5"
            fill="none"
            strokeOpacity={0.9}
          />
        ) : null}

        {/* pins des villes */}
        {pMe?.visible ? (
          <>
            <Circle cx={pMe.x} cy={pMe.y} r={7} fill={colors.ambre} stroke="#fff" strokeWidth={1.5} />
            <Circle cx={pMe.x} cy={pMe.y} r={13} fill={colors.ambre} opacity={0.25} />
          </>
        ) : null}
        {pPa?.visible ? (
          <>
            <Circle cx={pPa.x} cy={pPa.y} r={7} fill={colors.corail} stroke="#fff" strokeWidth={1.5} />
            <Circle cx={pPa.x} cy={pPa.y} r={13} fill={colors.corail} opacity={0.25} />
          </>
        ) : null}
      </Svg>

      {/* l'avion animé, en overlay */}
      {planeStyle ? (
        <Animated.Text style={[styles.plane, planeStyle]}>✈️</Animated.Text>
      ) : null}

      {/* étiquettes des villes */}
      {pMe?.visible && me ? (
        <Text style={[styles.label, { left: pMe.x - 40, top: pMe.y + 12, color: colors.ambre }]} numberOfLines={1}>
          {me.name ?? 'Moi'}
        </Text>
      ) : null}
      {pPa?.visible && partner ? (
        <Text style={[styles.label, { left: pPa.x - 40, top: pPa.y + 12, color: colors.corail }]} numberOfLines={1}>
          {partner.name ?? 'Ma moitié'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  plane: {
    position: 'absolute',
    fontSize: 22,
    // on recadre l'emoji autour du point (translate déplace le coin haut-gauche)
    marginLeft: -11,
    marginTop: -14,
    left: 0,
    top: 0,
  },
  label: {
    position: 'absolute',
    width: 80,
    textAlign: 'center',
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
  },
});
