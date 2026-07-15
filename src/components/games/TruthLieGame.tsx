import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Input, ThemedText } from '../ui';
import { colors } from '../../theme/colors';
import { fonts, radius, spacing } from '../../theme/typography';
import { useCoupleTable } from '../../hooks/useCoupleTable';
import { useAuth } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import type { GameResponse } from '../../types/db';

type TLSet = { s: [string, string, string]; lie: number };

function parseSet(value?: string): TLSet | null {
  if (!value) return null;
  try {
    const p = JSON.parse(value);
    if (Array.isArray(p.s) && p.s.length === 3 && typeof p.lie === 'number') return p;
  } catch {}
  return null;
}

export function TruthLieGame() {
  const { rows } = useCoupleTable<GameResponse>('game_responses');
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const [round, setRound] = useState(0);

  const key = String(round);
  const find = (game: string, author?: string) =>
    rows.find((r) => r.game === game && r.item_key === key && r.author_id === author);

  const mySetRow = find('tt_set', profile?.id);
  const partnerSetRow = find('tt_set', partner?.id);
  const myGuessRow = find('tt_guess', profile?.id); // ma supposition sur le set du partenaire
  const partnerGuessRow = find('tt_guess', partner?.id); // sa supposition sur mon set

  const mySet = parseSet(mySetRow?.value);
  const partnerSet = parseSet(partnerSetRow?.value);

  // Formulaire de création
  const [s0, setS0] = useState('');
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const [lie, setLie] = useState<number | null>(null);

  useEffect(() => {
    setS0('');
    setS1('');
    setS2('');
    setLie(null);
  }, [round]);

  const submitSet = async () => {
    const arr = [s0.trim(), s1.trim(), s2.trim()];
    if (arr.some((x) => !x) || lie === null || !couple || !profile) return;
    await supabase.from('game_responses').upsert(
      {
        couple_id: couple.id,
        game: 'tt_set',
        item_key: key,
        author_id: profile.id,
        value: JSON.stringify({ s: arr, lie }),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'couple_id,game,item_key,author_id' },
    );
  };

  const submitGuess = async (guessIdx: number) => {
    if (!couple || !profile) return;
    await supabase.from('game_responses').upsert(
      {
        couple_id: couple.id,
        game: 'tt_guess',
        item_key: key,
        author_id: profile.id,
        value: String(guessIdx),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'couple_id,game,item_key,author_id' },
    );
  };

  const myGuessIdx = myGuessRow ? Number(myGuessRow.value) : null;

  return (
    <View style={{ gap: spacing.lg }}>
      {/* Section 1 : mes affirmations */}
      <View style={styles.block}>
        <ThemedText variant="title">Tes affirmations</ThemedText>
        <ThemedText variant="body" color={colors.texteGris} style={{ marginBottom: spacing.sm }}>
          Écris 2 vérités et 1 mensonge, puis marque le mensonge.
        </ThemedText>

        {!mySet ? (
          <>
            {[
              { v: s0, set: setS0, i: 0 },
              { v: s1, set: setS1, i: 1 },
              { v: s2, set: setS2, i: 2 },
            ].map((row) => (
              <View key={row.i} style={styles.stmtRow}>
                <Input
                  placeholder={`Affirmation ${row.i + 1}`}
                  value={row.v}
                  onChangeText={row.set}
                  style={{ flex: 1 }}
                />
                <Pressable
                  onPress={() => setLie(row.i)}
                  style={[styles.lieTag, lie === row.i && styles.lieTagOn]}
                >
                  <Text style={[styles.lieTagTxt, lie === row.i && { color: colors.creme }]}>
                    mensonge
                  </Text>
                </Pressable>
              </View>
            ))}
            <Pressable onPress={submitSet} style={styles.primary}>
              <Text style={styles.primaryTxt}>Envoyer à {partner?.display_name ?? 'ta moitié'}</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.doneBox}>
            <ThemedText variant="bodyMedium" color={colors.encre}>✅ Envoyé !</ThemedText>
            {partnerGuessRow ? (
              <ThemedText variant="body" color={Number(partnerGuessRow.value) === mySet.lie ? '#5E7A54' : colors.corail} style={{ marginTop: 4 }}>
                {partner?.display_name ?? 'Ta moitié'}{' '}
                {Number(partnerGuessRow.value) === mySet.lie
                  ? 'a trouvé ton mensonge ! 🎯'
                  : 's’est trompé·e 😄'}
              </ThemedText>
            ) : (
              <ThemedText variant="body" color={colors.texteGris} style={{ marginTop: 4 }}>
                En attente que {partner?.display_name ?? 'ta moitié'} devine…
              </ThemedText>
            )}
          </View>
        )}
      </View>

      {/* Section 2 : deviner le partenaire */}
      <View style={styles.block}>
        <ThemedText variant="title">Devine {partner?.display_name ?? 'ta moitié'}</ThemedText>
        {!partnerSet ? (
          <ThemedText variant="body" color={colors.texteGris} style={{ marginTop: 4 }}>
            En attente de ses affirmations…
          </ThemedText>
        ) : (
          <>
            <ThemedText variant="body" color={colors.texteGris} style={{ marginBottom: spacing.sm }}>
              {myGuessIdx == null ? 'Lequel est le mensonge ?' : 'Résultat :'}
            </ThemedText>
            {partnerSet.s.map((stmt, i) => {
              const chosen = myGuessIdx === i;
              const revealed = myGuessIdx != null;
              const isLie = partnerSet.lie === i;
              return (
                <Pressable
                  key={i}
                  onPress={() => myGuessIdx == null && submitGuess(i)}
                  style={[
                    styles.stmt,
                    chosen && styles.stmtChosen,
                    revealed && isLie && styles.stmtLie,
                  ]}
                >
                  <ThemedText variant="bodyMedium" color={colors.texteSombre}>
                    {stmt}
                  </ThemedText>
                  {revealed && isLie ? <Text style={styles.lieMark}>🤥 le mensonge</Text> : null}
                </Pressable>
              );
            })}
            {myGuessIdx != null ? (
              <View style={[styles.reveal, { backgroundColor: myGuessIdx === partnerSet.lie ? '#EEF3EC' : '#FBEFEA' }]}>
                <ThemedText variant="bodyMedium" center color={myGuessIdx === partnerSet.lie ? '#5E7A54' : colors.corail}>
                  {myGuessIdx === partnerSet.lie ? '🎯 Bien vu, c’était le mensonge !' : '😄 Raté !'}
                </ThemedText>
              </View>
            ) : null}
          </>
        )}
      </View>

      <Pressable onPress={() => setRound((r) => r + 1)} style={styles.newRound}>
        <Text style={styles.newRoundTxt}>↻ Nouvelle manche</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: '#FFFFFF', borderRadius: radius.lg, padding: spacing.lg },
  stmtRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  lieTag: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.bordure,
  },
  lieTagOn: { backgroundColor: colors.corail, borderColor: colors.corail },
  lieTagTxt: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.texteGris },
  primary: {
    backgroundColor: colors.ambre,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.encre },
  doneBox: { backgroundColor: colors.cremeDoux, borderRadius: radius.md, padding: spacing.md },
  stmt: {
    backgroundColor: colors.creme,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.bordure,
    marginBottom: spacing.sm,
  },
  stmtChosen: { borderColor: colors.ambre, backgroundColor: colors.cremeDoux },
  stmtLie: { borderColor: '#5E7A54', backgroundColor: '#EEF3EC' },
  lieMark: { fontFamily: fonts.bodyMedium, fontSize: 12, color: '#5E7A54', marginTop: 4 },
  reveal: { borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  newRound: { alignItems: 'center', paddingVertical: spacing.md },
  newRoundTxt: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.prune },
});
