import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ThemedText } from '../ui';
import { colors } from '../../theme/colors';
import { fonts, radius, spacing } from '../../theme/typography';
import { useCoupleTable } from '../../hooks/useCoupleTable';
import { useAuth } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import type { GameResponse } from '../../types/db';
import { QUI_PROMPTS } from '../../lib/gamesData';

export function QuiGame() {
  const { rows } = useCoupleTable<GameResponse>('game_responses');
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const [idx, setIdx] = useState(0);

  const key = String(idx);
  const forThis = rows.filter((r) => r.game === 'qui' && r.item_key === key);
  const mine = forThis.find((r) => r.author_id === profile?.id);
  const theirs = forThis.find((r) => r.author_id === partner?.id);
  const both = mine && theirs;
  const agree = both && mine!.value === theirs!.value;

  const vote = async (chosenId: string) => {
    if (!couple || !profile) return;
    await supabase.from('game_responses').upsert(
      {
        couple_id: couple.id,
        game: 'qui',
        item_key: key,
        author_id: profile.id,
        value: chosenId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'couple_id,game,item_key,author_id' },
    );
  };

  const options = [
    { id: profile?.id ?? 'me', label: 'Toi' },
    { id: partner?.id ?? 'partner', label: partner?.display_name ?? 'Ta moitié' },
  ];

  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View>
        <ThemedText variant="label" color={colors.texteGris} center>
          {idx + 1} / {QUI_PROMPTS.length}
        </ThemedText>
        <View style={styles.card}>
          <Text style={{ fontSize: 40 }}>🤔</Text>
          <ThemedText variant="displaySmall" center color={colors.encre} style={{ marginTop: spacing.md }}>
            {QUI_PROMPTS[idx]}
          </ThemedText>
        </View>

        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {options.map((o) => {
            const picked = mine?.value === o.id;
            return (
              <Pressable
                key={o.id}
                onPress={() => vote(o.id)}
                style={[styles.opt, picked && styles.optOn]}
              >
                <ThemedText variant="bodyMedium" color={picked ? colors.encre : colors.texteSombre}>
                  {o.label}
                </ThemedText>
                {theirs?.value === o.id && (
                  <Text style={styles.tag}>vote de {partner?.display_name ?? 'l’autre'}</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {both ? (
          <View style={[styles.reveal, { backgroundColor: agree ? '#EEF3EC' : '#FBEFEA' }]}>
            <ThemedText variant="bodyMedium" center color={agree ? '#5E7A54' : colors.corail}>
              {agree ? '🎉 Vous êtes d’accord !' : '😄 Pas d’accord… il va falloir en débattre !'}
            </ThemedText>
          </View>
        ) : mine ? (
          <ThemedText variant="body" color={colors.texteGris} center style={{ marginTop: spacing.md }}>
            En attente du vote de {partner?.display_name ?? 'ta moitié'}…
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.nav}>
        <Pressable onPress={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} style={[styles.navBtn, idx === 0 && { opacity: 0.4 }]}>
          <Text style={styles.navTxt}>‹ Précédent</Text>
        </Pressable>
        <Pressable
          onPress={() => setIdx((i) => Math.min(QUI_PROMPTS.length - 1, i + 1))}
          disabled={idx === QUI_PROMPTS.length - 1}
          style={[styles.navBtn, idx === QUI_PROMPTS.length - 1 && { opacity: 0.4 }]}
        >
          <Text style={styles.navTxt}>Suivant ›</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  opt: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.bordure,
  },
  optOn: { borderColor: colors.ambre, backgroundColor: colors.cremeDoux },
  tag: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.corail, marginTop: 4 },
  reveal: { borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  nav: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.md },
  navBtn: { padding: spacing.sm },
  navTxt: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.prune },
});
