import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState, Screen, ScreenHeader, ThemedText } from '../src/components/ui';
import { colors } from '../src/theme/colors';
import { fonts, radius, spacing } from '../src/theme/typography';
import { useCoupleTable } from '../src/hooks/useCoupleTable';
import { useAuth } from '../src/store/auth';
import type { DailyAnswer } from '../src/types/db';

type Day = {
  dateKey: string;
  question: string;
  mine?: string;
  theirs?: string;
};

/** Carnet des « questions du jour » : toutes vos réponses, jour après jour. */
export default function QuestionsHistory() {
  const router = useRouter();
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const { rows, loading } = useCoupleTable<DailyAnswer>('daily_answers');

  const days = useMemo(() => {
    const byDate = new Map<string, Day>();
    for (const r of rows) {
      const d = byDate.get(r.question_date) ?? {
        dateKey: r.question_date,
        question: r.question_text,
      };
      if (r.author_id === profile?.id) d.mine = r.answer;
      else d.theirs = r.answer;
      byDate.set(r.question_date, d);
    }
    return [...byDate.values()].sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
  }, [rows, profile?.id]);

  const partnerName = partner?.display_name ?? 'Ta moitié';

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title="Nos réponses"
        subtitle="Vos questions du jour, jour après jour"
        onBack={() => router.back()}
      />
      {!loading && days.length === 0 ? (
        <EmptyState
          emoji="💬"
          title="Votre carnet est encore vide"
          subtitle="Répondez à la question du jour sur l’accueil : vos réponses se retrouveront ici."
        />
      ) : (
        <FlatList
          data={days}
          keyExtractor={(d) => d.dateKey}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.date}>{formatDateFr(item.dateKey).toUpperCase()}</Text>
              <ThemedText variant="title" color={colors.creme} style={{ marginTop: 4 }}>
                {item.question}
              </ThemedText>
              <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                <Answer label="Toi" text={item.mine} mine />
                <Answer label={partnerName} text={item.theirs} />
              </View>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

function Answer({ label, text, mine }: { label: string; text?: string; mine?: boolean }) {
  return (
    <View style={[styles.bubble, { backgroundColor: mine ? colors.prune : colors.encreDoux }]}>
      <Text style={styles.bubbleLabel}>{label.toUpperCase()}</Text>
      <ThemedText variant="body" color={text ? colors.creme : colors.cremeDoux}>
        {text ?? 'Pas de réponse ce jour-là'}
      </ThemedText>
    </View>
  );
}

function formatDateFr(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso + 'T00:00:00'));
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.encre, borderRadius: radius.lg, padding: spacing.lg },
  date: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.ambre,
  },
  bubble: { borderRadius: radius.md, padding: spacing.md },
  bubbleLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.ambre,
    marginBottom: 3,
  },
});
