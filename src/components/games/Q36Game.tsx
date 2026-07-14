import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Input, ThemedText } from '../ui';
import { colors } from '../../theme/colors';
import { fonts, radius, spacing } from '../../theme/typography';
import { useCoupleTable } from '../../hooks/useCoupleTable';
import { useAuth } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import type { GameResponse } from '../../types/db';
import { Q36_QUESTIONS } from '../../lib/gamesData';

export function Q36Game() {
  const { rows } = useCoupleTable<GameResponse>('game_responses');
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const [idx, setIdx] = useState(0);
  const [draft, setDraft] = useState('');

  const key = String(idx);
  const forThis = rows.filter((r) => r.game === 'q36' && r.item_key === key);
  const mine = forThis.find((r) => r.author_id === profile?.id);
  const theirs = forThis.find((r) => r.author_id === partner?.id);

  useEffect(() => {
    setDraft(mine?.value ?? '');
  }, [idx, mine?.value]);

  const save = async () => {
    const v = draft.trim();
    if (!v || !couple || !profile) return;
    await supabase.from('game_responses').upsert(
      {
        couple_id: couple.id,
        game: 'q36',
        item_key: key,
        author_id: profile.id,
        value: v,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'couple_id,game,item_key,author_id' },
    );
  };

  const serie = idx < 12 ? 'Série 1' : idx < 24 ? 'Série 2' : 'Série 3';

  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View>
        <ThemedText variant="label" color={colors.texteGris} center>
          {serie} · {idx + 1} / {Q36_QUESTIONS.length}
        </ThemedText>
        <View style={styles.card}>
          <Text style={{ fontSize: 34 }}>💞</Text>
          <ThemedText variant="title" center color={colors.encre} style={{ marginTop: spacing.sm }}>
            {Q36_QUESTIONS[idx]}
          </ThemedText>
        </View>

        <Input
          placeholder="Ta réponse (optionnel)…"
          value={draft}
          onChangeText={setDraft}
          onBlur={save}
          multiline
          style={{ marginTop: spacing.md, minHeight: 60 }}
        />
        {theirs ? (
          <View style={styles.theirs}>
            <Text style={styles.theirsLabel}>{(partner?.display_name ?? 'Ta moitié').toUpperCase()}</Text>
            <ThemedText variant="body" color={colors.encre}>{theirs.value}</ThemedText>
          </View>
        ) : (
          <ThemedText variant="body" color={colors.texteGris} center style={{ marginTop: spacing.md }}>
            {partner?.display_name ?? 'Ta moitié'} n’a pas encore répondu.
          </ThemedText>
        )}
      </View>

      <View style={styles.nav}>
        <Pressable onPress={() => { save(); setIdx((i) => Math.max(0, i - 1)); }} disabled={idx === 0} style={[styles.navBtn, idx === 0 && { opacity: 0.4 }]}>
          <Text style={styles.navTxt}>‹ Précédent</Text>
        </Pressable>
        <Pressable onPress={() => { save(); setIdx((i) => Math.min(Q36_QUESTIONS.length - 1, i + 1)); }} disabled={idx === Q36_QUESTIONS.length - 1} style={[styles.navBtn, idx === Q36_QUESTIONS.length - 1 && { opacity: 0.4 }]}>
          <Text style={styles.navTxt}>Suivant ›</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', marginTop: spacing.sm },
  theirs: { backgroundColor: colors.cremeDoux, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  theirsLabel: { fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 1, color: colors.corail, marginBottom: 3 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.md },
  navBtn: { padding: spacing.sm },
  navTxt: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.prune },
});
