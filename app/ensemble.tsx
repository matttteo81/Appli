import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { colors, skyGradients } from '../src/theme/colors';
import { fonts, radius, spacing } from '../src/theme/typography';
import { useAuth } from '../src/store/auth';
import { supabase } from '../src/lib/supabase';
import type { WatchSession } from '../src/types/db';

const REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👏'];

export default function Ensemble() {
  const router = useRouter();
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const [session, setSession] = useState<WatchSession | null>(null);
  const [title, setTitle] = useState('');
  const [now, setNow] = useState(Date.now());
  const [floats, setFloats] = useState<{ id: number; emoji: string }[]>([]);
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
    setFloats((f) => [...f, { id, emoji }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1600);
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
    addFloat(emoji);
    channelRef.current?.send({ type: 'broadcast', event: 'reaction', payload: { emoji } });
  };

  const counting = session?.is_playing && pos < 0;
  const display = counting ? String(Math.ceil(-pos)) : formatTime(Math.max(0, pos));

  return (
    <LinearGradient colors={skyGradients.nuit} style={{ flex: 1 }}>
      <Screen background="transparent" edges={['top']}>
        <View style={styles.head}>
          <Pressable onPress={() => router.back()}>
            <ThemedText variant="bodyMedium" color={colors.ambre}>‹ Retour</ThemedText>
          </Pressable>
          <ThemedText variant="displaySmall" color={colors.creme}>Ensemble</ThemedText>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
          <ThemedText variant="body" color={colors.cremeDoux} center>
            Chacun lance son film ou sa musique sur son appli, et on se
            synchronise ici — même à des milliers de km 💫
          </ThemedText>

          <Input
            placeholder="Qu'est-ce qu'on regarde/écoute ?"
            value={title}
            onChangeText={setTitle}
            onBlur={() => save({})}
            style={{ backgroundColor: colors.encreDoux, color: colors.creme, borderColor: colors.bordureClaire }}
            placeholderTextColor={colors.cremeDoux}
          />

          {/* Timer synchronisé */}
          <View style={styles.timerBox}>
            <Text style={[styles.timer, counting && { fontSize: 96, color: colors.ambre }]}>{display}</Text>
            <ThemedText variant="label" color={colors.cremeDoux}>
              {counting ? 'PRÊT·E ?' : session?.is_playing ? '● EN COURS — SYNCHRONISÉ' : 'EN PAUSE'}
            </ThemedText>
          </View>

          {/* Contrôles */}
          {!session?.is_playing ? (
            <Pressable style={styles.bigBtn} onPress={session && session.base_seconds > 0 ? resume : start}>
              <Text style={styles.bigBtnTxt}>
                {session && session.base_seconds > 0 ? '▶️  Reprendre' : '▶️  Lancer (3・2・1)'}
              </Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.bigBtn, { backgroundColor: colors.prune }]} onPress={pause}>
              <Text style={[styles.bigBtnTxt, { color: colors.creme }]}>⏸  Pause</Text>
            </Pressable>
          )}

          <View style={styles.rowBtns}>
            <Pressable style={styles.smallBtn} onPress={() => nudge(-10)}><Text style={styles.smallTxt}>−10 s</Text></Pressable>
            <Pressable style={styles.smallBtn} onPress={reset}><Text style={styles.smallTxt}>⟲ Zéro</Text></Pressable>
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
                  <Text style={{ fontSize: 28 }}>{e}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* emojis flottants */}
        <View style={styles.floatLayer} pointerEvents="none">
          {floats.map((f) => (
            <Text key={f.id} style={styles.floatEmoji}>{f.emoji}</Text>
          ))}
        </View>
      </Screen>
    </LinearGradient>
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
  timerBox: {
    alignItems: 'center',
    backgroundColor: colors.encreDoux,
    borderRadius: radius.xl,
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  timer: { fontFamily: fonts.monoMedium, fontSize: 64, color: colors.creme },
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
  floatLayer: { position: 'absolute', bottom: 120, left: 0, right: 0, alignItems: 'center' },
  floatEmoji: { fontSize: 56, position: 'absolute', bottom: 0 },
});
