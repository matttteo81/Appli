import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

const { width: W } = Dimensions.get('window');

// Rouge chaud choisi pour l'avion et la corde.
const ROUGE = '#CC4B44';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/* ------------------------------------------------------------------ *
 *  Pré-calcul du cœur (fait une seule fois, au chargement du module)  *
 *  On échantillonne l'équation paramétrique du cœur, on en tire :     *
 *   - la chaîne `d` du tracé SVG                                       *
 *   - la longueur totale (pour animer strokeDashoffset)               *
 *   - les positions/fractions/angles pour faire suivre l'avion        *
 * ------------------------------------------------------------------ */
const VIEW = 300;
const PAD = 46;
const N = 180;

const HEART = (() => {
  const rx: number[] = [];
  const ry: number[] = [];
  for (let i = 0; i <= N; i++) {
    // On part du bas du cœur pour un tracé agréable.
    const t = Math.PI / 2 + (i / N) * 2 * Math.PI;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    rx.push(x);
    ry.push(y);
  }
  const minX = Math.min(...rx), maxX = Math.max(...rx);
  const minY = Math.min(...ry), maxY = Math.max(...ry);
  const scale = (VIEW - 2 * PAD) / Math.max(maxX - minX, maxY - minY);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;

  const sx: number[] = [], sy: number[] = [];
  for (let i = 0; i <= N; i++) {
    sx.push((rx[i] - cx) * scale + VIEW / 2);
    sy.push((ry[i] - cy) * scale + VIEW / 2);
  }

  let d = `M ${sx[0].toFixed(2)} ${sy[0].toFixed(2)}`;
  for (let i = 1; i <= N; i++) d += ` L ${sx[i].toFixed(2)} ${sy[i].toFixed(2)}`;

  // Longueurs cumulées → fractions (pour synchroniser corde et avion).
  const cum: number[] = [0];
  for (let i = 1; i <= N; i++) {
    const dx = sx[i] - sx[i - 1], dy = sy[i] - sy[i - 1];
    cum.push(cum[i - 1] + Math.hypot(dx, dy));
  }
  const total = cum[N] || 1;
  const frac = cum.map((c) => c / total);

  // Angles (tangente) « déroulés » pour éviter les sauts de rotation.
  const ang: number[] = [];
  for (let i = 0; i < N; i++) {
    ang.push((Math.atan2(sy[i + 1] - sy[i], sx[i + 1] - sx[i]) * 180) / Math.PI);
  }
  ang.push(ang[N - 1]);
  for (let i = 1; i <= N; i++) {
    while (ang[i] - ang[i - 1] > 180) ang[i] -= 360;
    while (ang[i] - ang[i - 1] < -180) ang[i] += 360;
  }

  return { d, total, frac, sx, sy, ang };
})();

// Constantes « plates » (nombres / tableaux) capturées par les worklets.
const HEART_D = HEART.d;
const TOTAL = HEART.total;
const FRAC = HEART.frac;
const ANG = HEART.ang;

// Taille d'affichage du cœur à l'écran.
const S = Math.min(W * 0.82, 320);
const K = S / VIEW; // facteur points/viewBox
const PLANE = 34;

// Position pixel de l'avion à chaque échantillon (dans la boîte S×S).
const PX = HEART.sx.map((v) => v * K);
const PY = HEART.sy.map((v) => v * K);

/**
 * Écran de démarrage — 100 % thread UI (Reanimated + SVG), donc fluide :
 * un avion en papier trace un cœur avec sa « corde », puis « FIL » et la
 * phrase apparaissent en fondu.
 */
export function AnimatedSplash({
  onDone,
  onReveal,
}: {
  onDone: () => void;
  onReveal?: () => void;
}) {
  const progress = useSharedValue(0); // avancée du tracé (0 → 1)
  const titleV = useSharedValue(0);
  const taglineV = useSharedValue(0);
  const container = useSharedValue(1);

  useEffect(() => {
    let revealed = false;
    const reveal = () => { if (!revealed) { revealed = true; onReveal?.(); } };

    // Tracé du cœur.
    progress.value = withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.cubic) });
    // « FIL » puis la phrase.
    const t1 = setTimeout(() => {
      titleV.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.quad) });
    }, 1650);
    const t2 = setTimeout(() => {
      taglineV.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.quad) });
    }, 2350);
    // Fin : on monte l'app sous le splash opaque, puis on fond en douceur.
    const t3 = setTimeout(() => {
      reveal();
      setTimeout(() => {
        container.value = withTiming(0, { duration: 480 }, (fin) => {
          if (fin) runOnJS(onDone)();
        });
      }, 420);
    }, 3150);
    // Filet de sécurité (callback JS classique : appel direct).
    const safety = setTimeout(() => { reveal(); onDone(); }, 6000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(safety); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: container.value }));

  const ropeProps = useAnimatedProps(() => ({
    strokeDashoffset: TOTAL * (1 - progress.value),
  }));

  const planeStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const x = interpolate(p, FRAC, PX);
    const y = interpolate(p, FRAC, PY);
    const r = interpolate(p, FRAC, ANG);
    return {
      transform: [
        { translateX: x - PLANE / 2 },
        { translateY: y - PLANE / 2 },
        { rotate: `${r}deg` },
      ],
      opacity: progress.value > 0.995 ? 0 : 1,
    };
  });

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleV.value,
    transform: [{ translateY: interpolate(titleV.value, [0, 1], [14, 0]) }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineV.value,
    transform: [{ translateY: interpolate(taglineV.value, [0, 1], [14, 0]) }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents="none">
      <View style={styles.stack}>
        <View style={{ width: S, height: S }}>
          <Svg width={S} height={S} viewBox={`0 0 ${VIEW} ${VIEW}`}>
            <AnimatedPath
              d={HEART_D}
              stroke={ROUGE}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={TOTAL}
              animatedProps={ropeProps}
            />
          </Svg>
          {/* Avion en papier (rouge) qui suit la pointe du tracé. */}
          <Animated.View style={[styles.plane, planeStyle]}>
            {/* Avion en papier orienté vers la droite (sens de déplacement). */}
            <Svg width={PLANE} height={PLANE} viewBox="0 0 24 24">
              <Path d="M23 12 L3 4 L10 12 L3 20 Z" fill={ROUGE} />
              <Path d="M10 12 L3 20 L23 12 Z" fill="#A83A34" />
            </Svg>
          </Animated.View>
        </View>

        <Animated.Text style={[styles.title, titleStyle]}>FIL</Animated.Text>
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          loin des yeux, près du cœur
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10000,
    backgroundColor: colors.beigeOleron,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: { alignItems: 'center', width: '100%' },
  plane: { position: 'absolute', top: 0, left: 0, width: PLANE, height: PLANE },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 56,
    letterSpacing: 4,
    color: colors.encre,
    marginTop: 4,
    alignSelf: 'stretch',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  tagline: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.grenat,
    marginTop: 6,
    alignSelf: 'stretch',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
