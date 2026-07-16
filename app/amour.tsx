import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Button, Screen, ThemedText } from '../src/components/ui';
import { colors } from '../src/theme/colors';
import { fonts, radius, spacing } from '../src/theme/typography';
import { useCoupleTable } from '../src/hooks/useCoupleTable';
import { useAuth } from '../src/store/auth';
import { supabase } from '../src/lib/supabase';
import type { GameResponse } from '../src/types/db';
import {
  LANGS,
  LANG_ORDER,
  LOVE_QUESTIONS,
  Lang,
  scoreProfile,
  topLang,
} from '../src/lib/loveLanguages';

export default function Amour() {
  const router = useRouter();
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const { rows, loading } = useCoupleTable<GameResponse>('game_responses');
  const [idx, setIdx] = useState(0);
  const [retaking, setRetaking] = useState(false);

  const answersFor = (author?: string) => {
    const arr: (Lang | null)[] = Array(LOVE_QUESTIONS.length).fill(null);
    for (const r of rows) {
      if (r.game !== 'love' || r.author_id !== author) continue;
      const i = Number(r.item_key);
      if (i >= 0 && i < arr.length) arr[i] = r.value as Lang;
    }
    return arr;
  };

  const myAnswers = useMemo(() => answersFor(profile?.id), [rows, profile?.id]);
  const partnerAnswers = useMemo(() => answersFor(partner?.id), [rows, partner?.id]);

  const myDone = myAnswers.every((a) => a !== null);
  const partnerDone = partnerAnswers.every((a) => a !== null);
  const answeredCount = myAnswers.filter((a) => a !== null).length;

  const answer = async (lang: Lang) => {
    if (!couple || !profile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await supabase.from('game_responses').upsert(
      {
        couple_id: couple.id,
        game: 'love',
        item_key: String(idx),
        author_id: profile.id,
        value: lang,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'couple_id,game,item_key,author_id' },
    );
    if (idx < LOVE_QUESTIONS.length - 1) setIdx((i) => i + 1);
    else setRetaking(false);
  };

  const restart = () => {
    setIdx(0);
    setRetaking(true);
  };

  const header = (
    <View style={styles.head}>
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <ThemedText variant="bodyMedium" color={colors.corail}>‹ Retour</ThemedText>
      </Pressable>
      <ThemedText variant="title">Langages de l’amour</ThemedText>
      <View style={{ width: 50 }} />
    </View>
  );

  if (loading) {
    return (
      <Screen edges={['top']}>
        {header}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.prune} />
        </View>
      </Screen>
    );
  }

  // ---- Mode quiz ----
  if (!myDone || retaking) {
    const q = LOVE_QUESTIONS[idx];
    return (
      <Screen edges={['top']}>
        {header}
        <View style={styles.quizWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((idx + 1) / LOVE_QUESTIONS.length) * 100}%` }]} />
          </View>
          <ThemedText variant="label" color={colors.texteGris} center style={{ marginTop: spacing.sm }}>
            {idx + 1} / {LOVE_QUESTIONS.length}
          </ThemedText>

          <ThemedText variant="display" center color={colors.encre} style={{ marginTop: spacing.xl }}>
            Ce qui me touche le plus…
          </ThemedText>

          <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
            <Pressable style={styles.choice} onPress={() => answer(q.a.lang)}>
              <Text style={styles.choiceEmoji}>{LANGS[q.a.lang].emoji}</Text>
              <ThemedText variant="bodyMedium" style={{ flex: 1 }}>{q.a.text}</ThemedText>
            </Pressable>
            <Pressable style={styles.choice} onPress={() => answer(q.b.lang)}>
              <Text style={styles.choiceEmoji}>{LANGS[q.b.lang].emoji}</Text>
              <ThemedText variant="bodyMedium" style={{ flex: 1 }}>{q.b.text}</ThemedText>
            </Pressable>
          </View>

          {idx > 0 ? (
            <Pressable onPress={() => setIdx((i) => i - 1)} style={{ marginTop: spacing.xl, alignSelf: 'center' }}>
              <ThemedText variant="bodyMedium" color={colors.prune}>‹ Question précédente</ThemedText>
            </Pressable>
          ) : null}
        </View>
      </Screen>
    );
  }

  // ---- Résultats ----
  const myProfile = scoreProfile(myAnswers as Lang[]);
  const myTop = topLang(myProfile);
  const partnerProfile = partnerDone ? scoreProfile(partnerAnswers as Lang[]) : null;
  const partnerTop = partnerProfile ? topLang(partnerProfile) : null;

  const renderBars = (prof: Record<Lang, number>) => (
    <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
      {[...LANG_ORDER].sort((a, b) => prof[b] - prof[a]).map((l) => (
        <View key={l} style={styles.barRow}>
          <Text style={{ fontSize: 20, width: 28 }}>{LANGS[l].emoji}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${prof[l]}%`, backgroundColor: LANGS[l].color }]} />
          </View>
          <Text style={styles.barPct}>{prof[l]}%</Text>
        </View>
      ))}
    </View>
  );

  return (
    <Screen edges={['top']}>
      {header}
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        {/* Mon langage principal */}
        <View style={[styles.hero, { backgroundColor: LANGS[myTop].color }]}>
          <Text style={{ fontSize: 44 }}>{LANGS[myTop].emoji}</Text>
          <ThemedText variant="label" color={colors.encre} style={{ opacity: 0.7, marginTop: spacing.sm }}>
            TON LANGAGE PRINCIPAL
          </ThemedText>
          <ThemedText variant="title" color={colors.encre} center>{LANGS[myTop].label}</ThemedText>
          <ThemedText variant="body" color={colors.encre} center style={{ opacity: 0.85, marginTop: 4 }}>
            {LANGS[myTop].desc}
          </ThemedText>
        </View>

        <ThemedText variant="label" color={colors.texteGris} style={{ marginTop: spacing.lg }}>
          TON PROFIL
        </ThemedText>
        {renderBars(myProfile)}

        {/* Profil du partenaire */}
        {partnerProfile && partnerTop ? (
          <>
            <ThemedText variant="label" color={colors.texteGris} style={{ marginTop: spacing.xl }}>
              {(partner?.display_name ?? 'TA MOITIÉ').toUpperCase()}
            </ThemedText>
            {renderBars(partnerProfile)}

            <View style={styles.match}>
              <Text style={{ fontSize: 28 }}>{myTop === partnerTop ? '💞' : '🌗'}</Text>
              <ThemedText variant="bodyMedium" color={colors.encre} center style={{ marginTop: spacing.xs }}>
                {myTop === partnerTop
                  ? 'Vous parlez le même langage — profitez-en !'
                  : `Pour toucher ${partner?.display_name ?? 'l’autre'} : ${LANGS[partnerTop].tip}`}
              </ThemedText>
              {myTop !== partnerTop ? (
                <ThemedText variant="body" color={colors.texteGris} center style={{ marginTop: spacing.xs, fontSize: 14 }}>
                  Et toi tu aimes surtout : {LANGS[myTop].tip.toLowerCase()}
                </ThemedText>
              ) : null}
            </View>
          </>
        ) : (
          <View style={styles.waiting}>
            <ThemedText variant="body" color={colors.texteGris} center>
              {partner?.display_name ?? 'Ta moitié'} n’a pas encore fait le test.
              {'\n'}Dès que c’est fait, vous verrez vos profils côte à côte. 💛
            </ThemedText>
          </View>
        )}

        <Button title="Refaire le test" variant="ghost" onPress={restart} style={{ marginTop: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  quizWrap: { flex: 1, padding: spacing.lg },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.cremeDoux, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.ambre },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  choiceEmoji: { fontSize: 30 },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barTrack: { flex: 1, height: 14, borderRadius: 7, backgroundColor: colors.cremeDoux, overflow: 'hidden' },
  barFill: { height: 14, borderRadius: 7 },
  barPct: { fontFamily: fonts.monoMedium, fontSize: 13, color: colors.texteGris, width: 40, textAlign: 'right' },
  match: {
    backgroundColor: colors.cremeDoux,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  waiting: {
    backgroundColor: colors.cremeDoux,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
});
