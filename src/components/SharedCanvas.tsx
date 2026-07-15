import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';
import { supabase } from '../lib/supabase';
import type { DrawingStroke } from '../types/db';

const STROKE_WIDTH = 4;
type Pt = [number, number];

function toPath(points: Pt[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const [x, y] = points[0];
    return `M ${x} ${y} L ${x + 0.1} ${y + 0.1}`;
  }
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
}

type Props = {
  coupleId: string;
  authorId: string;
  board: 'free' | 'game';
  editable: boolean;
  color: string;
  style?: ViewStyle;
};

/**
 * Toile de dessin partagée en temps réel, pour un « board » donné
 * ('free' = dessin libre, 'game' = Dessine & devine). Les points sont
 * normalisés 0..1 pour un rendu identique sur les deux téléphones.
 */
export function SharedCanvas({ coupleId, authorId, board, editable, color, style }: Props) {
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [current, setCurrent] = useState<Pt[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const currentRef = useRef<Pt[]>([]);
  const sizeRef = useRef(size);
  const colorRef = useRef(color);
  sizeRef.current = size;
  colorRef.current = color;

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('drawing_strokes')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('board', board)
        .order('created_at', { ascending: true });
      if (active) setStrokes((data as DrawingStroke[]) ?? []);
    })();

    const channel = supabase
      .channel(`canvas-${board}-${coupleId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'drawing_strokes', filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          const s = payload.new as DrawingStroke;
          if (s.board !== board) return;
          setStrokes((prev) => (prev.some((p) => p.id === s.id) ? prev : [...prev, s]));
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'drawing_strokes', filter: `couple_id=eq.${coupleId}` },
        () => {
          // Un effacement supprime tout le board : on recharge.
          supabase
            .from('drawing_strokes')
            .select('*')
            .eq('couple_id', coupleId)
            .eq('board', board)
            .order('created_at', { ascending: true })
            .then(({ data }) => setStrokes((data as DrawingStroke[]) ?? []));
        },
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [coupleId, board]);

  const commit = async (pts: Pt[]) => {
    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0 || pts.length === 0) return;
    const norm = pts.map(([x, y]) => [
      Math.max(0, Math.min(1, x / w)),
      Math.max(0, Math.min(1, y / h)),
    ]);
    const { data } = await supabase
      .from('drawing_strokes')
      .insert({
        couple_id: coupleId,
        author_id: authorId,
        color: colorRef.current,
        width: STROKE_WIDTH,
        points: norm,
        board,
      })
      .select()
      .single();
    if (data) {
      setStrokes((prev) =>
        prev.some((p) => p.id === (data as DrawingStroke).id) ? prev : [...prev, data as DrawingStroke],
      );
    }
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => editable,
      onMoveShouldSetPanResponder: () => editable,
      onPanResponderGrant: (e) => {
        currentRef.current = [[e.nativeEvent.locationX, e.nativeEvent.locationY]];
        setCurrent(currentRef.current);
      },
      onPanResponderMove: (e) => {
        currentRef.current = [...currentRef.current, [e.nativeEvent.locationX, e.nativeEvent.locationY]];
        setCurrent(currentRef.current);
      },
      onPanResponderRelease: () => {
        const pts = currentRef.current;
        currentRef.current = [];
        setCurrent([]);
        commit(pts);
      },
      onPanResponderTerminate: () => {
        const pts = currentRef.current;
        currentRef.current = [];
        setCurrent([]);
        commit(pts);
      },
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  const { w, h } = size;

  return (
    <View style={[styles.canvas, style]} onLayout={onLayout} {...(editable ? pan.panHandlers : {})}>
      <Svg width="100%" height="100%">
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
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: colors.cremeDoux,
    borderWidth: 1,
    borderColor: colors.bordure,
    overflow: 'hidden',
  },
});
