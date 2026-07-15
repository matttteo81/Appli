import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Screen, ThemedText } from '../src/components/ui';
import { colors } from '../src/theme/colors';
import { fonts, radius, spacing } from '../src/theme/typography';
import { useAuth } from '../src/store/auth';
import { supabase } from '../src/lib/supabase';
import type { DrawingStroke } from '../src/types/db';

const PALETTE = [
  colors.encre,
  colors.corail,
  colors.ambre,
  colors.sauge,
  colors.prune,
  '#FFFFFF',
];
const STROKE_WIDTH = 4;

type Pt = [number, number];

/** Construit l'attribut "d" d'un <Path> à partir de points en pixels. */
function toPath(points: Pt[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    // un simple point : petit trait pour qu'il soit visible
    const [x, y] = points[0];
    return `M ${x} ${y} L ${x + 0.1} ${y + 0.1}`;
  }
  return points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`)
    .join(' ');
}

export default function Dessin() {
  const router = useRouter();
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);

  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [color, setColor] = useState<string>(colors.encre);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Trait en cours de tracé (en pixels), rendu à part pour la fluidité.
  const [current, setCurrent] = useState<Pt[]>([]);
  const currentRef = useRef<Pt[]>([]);
  const sizeRef = useRef(size);
  const colorRef = useRef(color);
  sizeRef.current = size;
  colorRef.current = color;

  // Chargement initial + temps réel.
  useEffect(() => {
    if (!couple) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('drawing_strokes')
        .select('*')
        .eq('couple_id', couple.id)
        .order('created_at', { ascending: true });
      if (active) setStrokes((data as DrawingStroke[]) ?? []);
    })();

    const channel = supabase
      .channel(`draw-${couple.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'drawing_strokes',
          filter: `couple_id=eq.${couple.id}`,
        },
        (payload) => {
          const s = payload.new as DrawingStroke;
          // dédoublonnage : mes propres traits sont déjà affichés.
          setStrokes((prev) =>
            prev.some((p) => p.id === s.id) ? prev : [...prev, s],
          );
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'drawing_strokes',
          filter: `couple_id=eq.${couple.id}`,
        },
        () => setStrokes([]),
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [couple]);

  const commitStroke = async (pts: Pt[]) => {
    const { w, h } = sizeRef.current;
    if (!couple || !profile || w === 0 || h === 0 || pts.length === 0) return;
    // Normalisation 0..1 pour s'afficher pareil sur les deux téléphones.
    const norm = pts.map(([x, y]) => [
      Math.max(0, Math.min(1, x / w)),
      Math.max(0, Math.min(1, y / h)),
    ]);
    const { data } = await supabase
      .from('drawing_strokes')
      .insert({
        couple_id: couple.id,
        author_id: profile.id,
        color: colorRef.current,
        width: STROKE_WIDTH,
        points: norm,
      })
      .select()
      .single();
    if (data) {
      setStrokes((prev) =>
        prev.some((p) => p.id === (data as DrawingStroke).id)
          ? prev
          : [...prev, data as DrawingStroke],
      );
    }
  };

  // Gestion du doigt sur la toile.
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        currentRef.current = [[locationX, locationY]];
        setCurrent(currentRef.current);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        currentRef.current = [...currentRef.current, [locationX, locationY]];
        setCurrent(currentRef.current);
      },
      onPanResponderRelease: () => {
        const pts = currentRef.current;
        currentRef.current = [];
        setCurrent([]);
        commitStroke(pts);
      },
      onPanResponderTerminate: () => {
        const pts = currentRef.current;
        currentRef.current = [];
        setCurrent([]);
        commitStroke(pts);
      },
    }),
  ).current;

  const onCanvasLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  const clearAll = () => {
    if (!couple) return;
    Alert.alert('Effacer la toile ?', 'Le dessin sera effacé pour vous deux.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Effacer',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setStrokes([]);
          await supabase
            .from('drawing_strokes')
            .delete()
            .eq('couple_id', couple.id);
        },
      },
    ]);
  };

  const { w, h } = size;

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ThemedText variant="bodyMedium" color={colors.corail}>
            ‹ Retour
          </ThemedText>
        </Pressable>
        <ThemedText variant="title">Dessin partagé ✏️</ThemedText>
        <Pressable onPress={clearAll} hitSlop={12}>
          <ThemedText variant="bodyMedium" color={colors.texteGris}>
            Effacer
          </ThemedText>
        </Pressable>
      </View>

      {/* La toile */}
      <View style={styles.canvas} onLayout={onCanvasLayout} {...pan.panHandlers}>
        <Svg width="100%" height="100%">
          {/* Traits déjà enregistrés (points normalisés → pixels) */}
          {w > 0 &&
            strokes.map((s) => (
              <Path
                key={s.id}
                d={toPath(s.points.map(([x, y]) => [x * w, y * h] as Pt))}
                stroke={s.color}
                strokeWidth={s.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
          {/* Trait en cours (déjà en pixels) */}
          {current.length > 0 && (
            <Path
              d={toPath(current)}
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          )}
        </Svg>

        {strokes.length === 0 && current.length === 0 ? (
          <View style={styles.hint} pointerEvents="none">
            <Text style={{ fontSize: 40 }}>🎨</Text>
            <ThemedText variant="body" color={colors.texteGris} center>
              Dessine avec ton doigt. Ta moitié voit tes traits apparaître en
              direct.
            </ThemedText>
          </View>
        ) : null}
      </View>

      {/* Palette de couleurs */}
      <View style={styles.palette}>
        {PALETTE.map((c) => (
          <Pressable
            key={c}
            onPress={() => {
              setColor(c);
              Haptics.selectionAsync();
            }}
            style={[
              styles.swatch,
              { backgroundColor: c },
              color === c && styles.swatchActive,
            ]}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  canvas: {
    flex: 1,
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.cremeDoux,
    borderWidth: 1,
    borderColor: colors.bordure,
    overflow: 'hidden',
  },
  hint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  palette: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: colors.encre,
    transform: [{ scale: 1.15 }],
  },
});
