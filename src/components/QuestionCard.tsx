import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Input, ThemedText } from './ui';
import { colors } from '../theme/colors';
import { fonts, radius, spacing } from '../theme/typography';
import { useCoupleTable } from '../hooks/useCoupleTable';
import { useAuth } from '../store/auth';
import { supabase } from '../lib/supabase';
import { questionForToday } from '../lib/questions';
import type { DailyAnswer } from '../types/db';

/** Carte « Question du jour » : une question par jour, les deux répondent. */
export function QuestionCard() {
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const { rows } = useCoupleTable<DailyAnswer>('daily_answers');

  const { text, dateKey } = useMemo(() => questionForToday(), []);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const mine = rows.find(
    (r) => r.author_id === profile?.id && r.question_date === dateKey,
  );
  const theirs = rows.find(
    (r) => r.author_id === partner?.id && r.question_date === dateKey,
  );

  const submit = async () => {
    const a = draft.trim();
    if (!a || !couple || !profile) return;
    setSaving(true);
    await supabase.from('daily_answers').upsert(
      {
        couple_id: couple.id,
        author_id: profile.id,
        question_date: dateKey,
        question_text: text,
        answer: a,
      },
      { onConflict: 'couple_id,author_id,question_date' },
    );
    setDraft('');
    setSaving(false);
  };

  return (
    <Card color={colors.encre}>
      <ThemedText variant="label" color={colors.ambre}>
        QUESTION DU JOUR
      </ThemedText>
      <ThemedText variant="title" color={colors.creme} style={{ marginTop: 6 }}>
        {text}
      </ThemedText>

      {!mine ? (
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <Input
            placeholder="Ta réponse…"
            value={draft}
            onChangeText={setDraft}
            multiline
            style={{ minHeight: 44 }}
          />
          <Pressable
            onPress={submit}
            disabled={saving || draft.trim().length === 0}
            style={[styles.send, draft.trim().length === 0 && { opacity: 0.5 }]}
          >
            <Text style={styles.sendText}>Répondre</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <Bubble label="Toi" text={mine.answer} mine />
          {theirs ? (
            <Bubble
              label={partner?.display_name ?? 'Ta moitié'}
              text={theirs.answer}
            />
          ) : (
            <ThemedText variant="body" color={colors.cremeDoux}>
              En attente de la réponse de {partner?.display_name ?? 'ta moitié'}… 👀
            </ThemedText>
          )}
        </View>
      )}
    </Card>
  );
}

function Bubble({
  label,
  text,
  mine,
}: {
  label: string;
  text: string;
  mine?: boolean;
}) {
  return (
    <View style={[styles.bubble, { backgroundColor: mine ? colors.prune : colors.encreDoux }]}>
      <Text style={styles.bubbleLabel}>{label.toUpperCase()}</Text>
      <ThemedText variant="body" color={colors.creme}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  send: {
    backgroundColor: colors.ambre,
    borderRadius: radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sendText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.encre },
  bubble: { borderRadius: radius.md, padding: spacing.md },
  bubbleLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.ambre,
    marginBottom: 3,
  },
});
