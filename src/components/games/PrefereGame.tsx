import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ThemedText } from '../ui';
import { colors } from '../../theme/colors';
import { fonts, radius, spacing } from '../../theme/typography';
import { useCoupleTable } from '../../hooks/useCoupleTable';
import { useAuth } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import type { GameResponse } from '../../types/db';
import { TU_PREFERES } from '../../lib/gamesData';

export function PrefereGame() {
  const { rows } = useCoupleTable<GameResponse>('game_responses');
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const [idx, setIdx] = useState(0);

  const key = String(idx);
  const forThis = rows.filter((r) => r.game === 'prefere' && r.item_key === key);
  const mine = forThis.find((r) => r.author_id === profile?.id);
  const theirs = forThis.find((r) => r.author_id === partner?.id);
  const both = mine && theirs;
  const agree = both && mine!.value === theirs!.value;

  const q = TU_PREFERES[idx];

  const vote = async (choice: 'a' | 'b') => {
    if (!couple || !profile) return;
    await supabase.from('game_responses').upsert(
      {
        couple_id: couple.id,
        game: 'prefere',
        item_key: key,
        author_id: profile.id,
        value: choice,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'couple_id,game,item_key,author_id' },
    );
  };

  const Option = ({ side, label }: { side: 'a' | 'b'; label: string }) => {
    const picked = mine?.value === side;
    const partnerPicked = theirs?.value === side;
    return (
      <Pressable onPress={() => vote(side)} style={[styles.opt, picked && styles.optOn]}>
        <ThemedText variant="bodyMedium" center color={colors.texteSombre}>
          {label}
        </ThemedText>
        <View style={styles.badges}>
          {picked ? <Text style={styles.badgeMe}>toi 🟠</Text> : null}
          {partnerPicked ? (
            <Text style={styles.badgeYou}>{partner?.display_name ?? 'l’autre'} 🔴</Text>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View>
        <ThemedText variant="label" color={colors.texteGris} center>
          {idx + 1} / {TU_PREFERES.length}
        </ThemedText>
        <ThemedText variant="displaySmall" center style={{ marginVertical: spacing.md }}>
          Tu préfères… 🤔
        </ThemedText>

        <Option side="a" label={q.a} />
        <Text style={styles.or}>ou</Text>
        <Option side="b" label={q.b} />

        {both ? (
          <View style={[styles.reveal, { backgroundColor: agree ? '#EEF3EC' : '#FBEFEA' }]}>
            <ThemedText variant="bodyMedium" center color={agree ? '#5E7A54' : colors.corail}>
              {agree ? '🎉 Même choix !' : '😄 Vous n’êtes pas d’accord !'}
            </ThemedText>
          </View>
        ) : mine ? (
          <ThemedText variant="body" color={colors.texteGris} center style={{ marginTop: spacing.md }}>
            En attente de {partner?.display_name ?? 'ta moitié'}…
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.nav}>
        <Pressable onPress={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} style={[styles.navBtn, idx === 0 && { opacity: 0.4 }]}>
          <Text style={styles.navTxt}>‹ Précédent</Text>
        </Pressable>
        <Pressable
          onPress={() => setIdx((i) => Math.min(TU_PREFERES.length - 1, i + 1))}
          disabled={idx === TU_PREFERES.length - 1}
          style={[styles.navBtn, idx === TU_PREFERES.length - 1 && { opacity: 0.4 }]}
        >
          <Text style={styles.navTxt}>Suivant ›</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  opt: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.bordure,
    alignItems: 'center',
  },
  optOn: { borderColor: colors.ambre, backgroundColor: colors.cremeDoux },
  or: {
    textAlign: 'center',
    fontFamily: fonts.bodySemiBold,
    color: colors.texteGris,
    marginVertical: spacing.sm,
  },
  badges: { flexDirection: 'row', gap: spacing.md, marginTop: 6 },
  badgeMe: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.ambre },
  badgeYou: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.corail },
  reveal: { borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  nav: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.md },
  navBtn: { padding: spacing.sm },
  navTxt: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.prune },
});
