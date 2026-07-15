import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Input, ThemedText } from '../src/components/ui';
import { Screen } from '../src/components/ui';
import { colors } from '../src/theme/colors';
import { fonts, radius, spacing } from '../src/theme/typography';
import { useAuth } from '../src/store/auth';
import { supabase } from '../src/lib/supabase';
import type { WatchSession } from '../src/types/db';

const REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '🍿'];

export default function CineADeux() {
  const router = useRouter();
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const [session, setSession] = useState<WatchSession | null>(null);
  const [title, setTitle] = useState('');
  const [now, setNow] = useState(Date.now());
  const [floats, setFloats] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // horloge locale
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  // chargement + temps réel de la séance + réactions
  useEffect(() => {
    if (!couple) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('watch_sessions')
        .select('*')
        .eq('couple_id', couple.id)
        .maybeSingle();
      if (active) {
        setSession((data as WatchSession) ?? null);
        if (data?.title) setTitle(data.title);
      }
    })();

    const channel = supabase
      .channel(`watch-${couple.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'watch_sessions', filter: `couple_id=eq.${couple.id}` },
        (payload) => setSession(payload.new as WatchSession),
      )
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        addFloat(payload.emoji);
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [couple]);

  const addFloat = (emoji: string) => {
    const id = Date.now() + Math.random();
    const x = 20 + Math.random() * 60; // % horizontal
    setFloats((f) => [...f, { id, emoji, x }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1900);
  };

  const pos = useMemo(() => {
    if (!session) return 0;
    if (session.is_playing) {
      const baseAt = new Date(session.base_at).getTime();
      return Math.floor((session.base_seconds * 1000 + (now - baseAt)) / 1000);
    }
    return session.base_seconds;
  }, [session, now]);

  const save = async (patch: Partial<WatchSession>) => {
    if (!couple) return;
    const next = {
      couple_id: couple.id,
      title: title.trim() || null,
      is_playing: session?.is_playing ?? false,
      base_seconds: session?.base_seconds ?? 0,
      base_at: session?.base_at ?? new Date().toISOString(),
      ...patch,
      updated_at: new Date().toISOString(),
    };
    setSession(next as WatchSession);
    await supabase.from('watch_sessions').upsert(next, { onConflict: 'couple_id' });
  };

  const start = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    save({ is_playing: true, base_seconds: 0, base_at: new Date(Date.now() + 3000).toISOString() });
  };
  const pause = () => save({ is_playing: false, base_seconds: Math.max(0, pos), base_at: new Date().toISOString() });
  const resume = () => save({ is_playing: true, base_at: new Date().toISOString() });
  const nudge = (d: number) => save({ base_seconds: Math.max(0, pos + d), base_at: new Date().toISOString() });
  const reset = () => save({ is_playing: false, base_seconds: 0, base_at: new Date().toISOString() });

  const sendReaction = (emoji: string) => {
    Haptics.selectionAsync();
    addFloat(emoji);
    channelRef.current?.send({ type: 'broadcast', event: 'reaction', payload: { emoji } });
  };

  const counting = session?.is_playing && pos < 0;
  const playing = session?.is_playing && pos >= 0;
  const display = counting ? String(Math.ceil(-pos)) : formatTime(Math.max(0, pos));

  return (
    <LinearGradient colors={['#0E0E22', '#1B1B3A', '#2A2A4E']} style={{ flex: 1 }}>
      <Screen background="transparent" edges={['top']}>
        <View style={styles.head}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ThemedText variant="bodyMedium" color={colors.ambre}>‹ Retour</ThemedText>
          </Pressable>
          <ThemedText variant="displaySmall" color={colors.creme}>Ciné à deux</ThemedText>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 60 }}>
          <ThemedText variant="body" color={colors.cremeDoux} center>
            Lancez le film chacun de votre côté — on synchronise votre lecture à
            la seconde, même à des milliers de km 🍿
          </ThemedText>

          {/* L'écran de cinéma */}
          <View style={styles.screenFrame}>
            <View style={styles.marquee}>
              <Text style={styles.marqueeText} numberOfLines={1}>
                🎬 {title.trim() || 'Choisissez votre séance'}
              </Text>
            </View>
            <View style={styles.screenBody}>
              {counting ? (
                <>
                  <Text style={styles.count}>{display}</Text>
                  <ThemedText variant="label" color={colors.ambre}>
                    LES LUMIÈRES S'ÉTEIGNENT…
                  </ThemedText>
                </>
              ) : (
                <>
                  <Text style={styles.timer}>{display}</Text>
                  <ThemedText variant="label" color={colors.cremeDoux}>
                    {playing ? '● EN COURS — SYNCHRONISÉ' : 'EN PAUSE'}
                  </ThemedText>
                </>
              )}
            </View>
          </View>

          {/* Les deux places */}
          <View style={styles.seats}>
            <Seat name={profile?.display_name ?? 'Toi'} />
            <Text style={{ fontSize: 20 }}>·</Text>
            <Seat name={partner?.display_name ?? 'Ta moitié'} />
          </View>

          <Input
            placeholder="Qu'est-ce qu'on regarde ?"
            value={title}
            onChangeText={setTitle}
            onBlur={() => save({})}
            style={{ backgroundColor: colors.encreDoux, color: colors.creme, borderColor: colors.bordureClaire }}
            placeholderTextColor={colors.cremeDoux}
          />

          {/* Contrôles */}
          {!playing ? (
            <Pressable style={styles.bigBtn} onPress={session && session.base_seconds > 0 && !counting ? resume : start}>
              <Text style={styles.bigBtnTxt}>
                {session && session.base_seconds > 0 && !counting ? '▶️  Reprendre ensemble' : '🎬  Lancer (3・2・1)'}
              </Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.bigBtn, { backgroundColor: colors.prune }]} onPress={pause}>
              <Text style={[styles.bigBtnTxt, { color: colors.creme }]}>⏸  Pause</Text>
            </Pressable>
          )}

          <View style={styles.rowBtns}>
            <Pressable style={styles.smallBtn} onPress={() => nudge(-10)}><Text style={styles.smallTxt}>−10 s</Text></Pressable>
            <Pressable style={styles.smallBtn} onPress={reset}><Text style={styles.smallTxt}>⟲ Début</Text></Pressable>
            <Pressable style={styles.smallBtn} onPress={() => nudge(10)}><Text style={styles.smallTxt}>+10 s</Text></Pressable>
          </View>

          {/* Réactions */}
          <View>
            <ThemedText variant="label" color={colors.cremeDoux} center style={{ marginBottom: spacing.sm }}>
              RÉACTIONS EN DIRECT
            </ThemedText>
            <View style={styles.reactions}>
              {REACTIONS.map((e) => (
                <Pressable key={e} onPress={() => sendReaction(e)} style={styles.reactBtn}>
                  <Text style={{ fontSize: 26 }}>{e}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* réactions flottantes animées */}
        <View style={styles.floatLayer} pointerEvents="none">
          {floats.map((f) => (
            <FloatingReaction key={f.id} emoji={f.emoji} x={f.x} />
          ))}
        </View>
      </Screen>
    </LinearGradient>
  );
}

function Seat({ name }: { name: string }) {
  return (
    <View style={styles.seat}>
      <Text style={{ fontSize: 26 }}>🍿</Text>
      <ThemedText variant="label" color={colors.creme} numberOfLines={1}>
        {name}
      </ThemedText>
    </View>
  );
}

function FloatingReaction({ emoji, x }: { emoji: string; x: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 1800,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [v]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -220] });
  const opacity = v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
  const scale = v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.6, 1.2, 1] });
  return (
    <Animated.Text
      style={[
        styles.floatEmoji,
        { left: `${x}%`, opacity, transform: [{ translateY }, { scale }] },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
}

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  screenFrame: {
    borderRadius: radius.lg,
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: colors.ambre,
    overflow: 'hidden',
    shadowColor: colors.ambre,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  marquee: {
    backgroundColor: colors.encreDoux,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    alignItems: 'center',
  },
  marqueeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ambre,
  },
  screenBody: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
    minHeight: 150,
  },
  timer: { fontFamily: fonts.monoMedium, fontSize: 62, color: colors.creme, letterSpacing: 1 },
  count: { fontFamily: fonts.monoMedium, fontSize: 100, color: colors.ambre },
  seats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  seat: { alignItems: 'center', gap: 2, maxWidth: 130 },
  bigBtn: {
    backgroundColor: colors.ambre,
    borderRadius: radius.pill,
    paddingVertical: 18,
    alignItems: 'center',
  },
  bigBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.encre },
  rowBtns: { flexDirection: 'row', gap: spacing.sm },
  smallBtn: {
    flex: 1,
    backgroundColor: colors.encreDoux,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  smallTxt: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.creme },
  reactions: { flexDirection: 'row', justifyContent: 'space-between' },
  reactBtn: {
    backgroundColor: colors.encreDoux,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatLayer: { position: 'absolute', bottom: 90, left: 0, right: 0, height: 260 },
  floatEmoji: { fontSize: 48, position: 'absolute', bottom: 0 },
});
