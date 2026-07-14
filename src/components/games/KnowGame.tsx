import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Input, ThemedText } from '../ui';
import { colors } from '../../theme/colors';
import { fonts, radius, spacing } from '../../theme/typography';
import { useCoupleTable } from '../../hooks/useCoupleTable';
import { useAuth } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import type { GameResponse } from '../../types/db';
import { KNOW_QUESTIONS } from '../../lib/gamesData';

export function KnowGame() {
  const { rows } = useCoupleTable<GameResponse>('game_responses');
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const [idx, setIdx] = useState(0);
  const [truth, setTruth] = useState('');
  const [guess, setGuess] = useState('');

  const key = String(idx);
  const find = (game: string, author?: string) =>
    rows.find((r) => r.game === game && r.item_key === key && r.author_id === author);

  const myTruth = find('know_self', profile?.id);
  const myGuess = find('know_guess', profile?.id);
  const partnerTruth = find('know_self', partner?.id);
  const partnerGuess = find('know_guess', partner?.id);

  useEffect(() => {
    setTruth(myTruth?.value ?? '');
    setGuess(myGuess?.value ?? '');
  }, [idx, myTruth?.value, myGuess?.value]);

  const save = async (game: 'know_self' | 'know_guess', value: string) => {
    const v = value.trim();
    if (!v || !couple || !profile) return;
    await supabase.from('game_responses').upsert(
      {
        couple_id: couple.id,
        game,
        item_key: key,
        author_id: profile.id,
        value: v,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'couple_id,game,item_key,author_id' },
    );
  };

  const partnerName = partner?.display_name ?? 'Ta moitié';

  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View>
        <ThemedText variant="label" color={colors.texteGris} center>
          {idx + 1} / {KNOW_QUESTIONS.length}
        </ThemedText>
        <View style={styles.card}>
          <Text style={{ fontSize: 32 }}>🧠</Text>
          <ThemedText variant="title" center color={colors.encre} style={{ marginTop: spacing.sm }}>
            {KNOW_QUESTIONS[idx]}
          </ThemedText>
        </View>

        <ThemedText variant="label" color={colors.texteGris} style={{ marginTop: spacing.md }}>
          TA VRAIE RÉPONSE (SUR TOI)
        </ThemedText>
        <Input placeholder="…" value={truth} onChangeText={setTruth} onBlur={() => save('know_self', truth)} />

        <ThemedText variant="label" color={colors.texteGris} style={{ marginTop: spacing.md }}>
          CE QUE TU PENSES QUE {partnerName.toUpperCase()} RÉPONDRAIT
        </ThemedText>
        <Input placeholder="Ta supposition…" value={guess} onChangeText={setGuess} onBlur={() => save('know_guess', guess)} />

        {/* Révélations */}
        {partnerGuess && myTruth ? (
          <View style={styles.reveal}>
            <Text style={styles.revealLabel}>{partnerName.toUpperCase()} PENSAIT QUE TU DIRAIS</Text>
            <ThemedText variant="body" color={colors.encre}>« {partnerGuess.value} »</ThemedText>
            <ThemedText variant="body" color={colors.texteGris} style={{ marginTop: 2 }}>Ta vérité : {myTruth.value}</ThemedText>
          </View>
        ) : null}
        {partnerTruth && myGuess ? (
          <View style={[styles.reveal, { backgroundColor: '#FBEFEA' }]}>
            <Text style={[styles.revealLabel, { color: colors.corail }]}>EN VRAI, {partnerName.toUpperCase()} A RÉPONDU</Text>
            <ThemedText variant="body" color={colors.encre}>« {partnerTruth.value} »</ThemedText>
            <ThemedText variant="body" color={colors.texteGris} style={{ marginTop: 2 }}>Tu avais deviné : {myGuess.value}</ThemedText>
          </View>
        ) : null}
      </View>

      <View style={styles.nav}>
        <Pressable onPress={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} style={[styles.navBtn, idx === 0 && { opacity: 0.4 }]}>
          <Text style={styles.navTxt}>‹ Précédent</Text>
        </Pressable>
        <Pressable onPress={() => setIdx((i) => Math.min(KNOW_QUESTIONS.length - 1, i + 1))} disabled={idx === KNOW_QUESTIONS.length - 1} style={[styles.navBtn, idx === KNOW_QUESTIONS.length - 1 && { opacity: 0.4 }]}>
          <Text style={styles.navTxt}>Suivant ›</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', marginTop: spacing.sm },
  reveal: { backgroundColor: colors.cremeDoux, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  revealLabel: { fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 1, color: colors.prune, marginBottom: 4 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.md },
  navBtn: { padding: spacing.sm },
  navTxt: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.prune },
});
