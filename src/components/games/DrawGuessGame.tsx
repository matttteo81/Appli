import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Input, ThemedText } from '../ui';
import { SharedCanvas } from '../SharedCanvas';
import { colors } from '../../theme/colors';
import { fonts, radius, spacing } from '../../theme/typography';
import { useAuth } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import type { Pictionary } from '../../types/db';
import { PICTIONARY_WORDS } from '../../lib/gamesData';

const PALETTE = [colors.encre, colors.corail, colors.ambre, colors.sauge, colors.prune];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function randomWord(): string {
  return PICTIONARY_WORDS[Math.floor(Math.random() * PICTIONARY_WORDS.length)];
}

export function DrawGuessGame() {
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);

  const [round, setRound] = useState<Pictionary | null>(null);
  const [color, setColor] = useState<string>(colors.encre);
  const [guess, setGuess] = useState('');
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    if (!couple) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from('pictionary')
        .select('*')
        .eq('couple_id', couple.id)
        .maybeSingle();
      if (active) setRound((data as Pictionary) ?? null);
    };
    load();
    const channel = supabase
      .channel(`pict-${couple.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pictionary', filter: `couple_id=eq.${couple.id}` },
        (payload) => setRound(payload.new as Pictionary),
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [couple]);

  const startRound = async () => {
    if (!couple || !profile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await supabase.from('drawing_strokes').delete().eq('couple_id', couple.id).eq('board', 'game');
    await supabase.from('pictionary').upsert(
      {
        couple_id: couple.id,
        drawer_id: profile.id,
        word: randomWord(),
        solved: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'couple_id' },
    );
    setGuess('');
    setWrong(false);
  };

  const newWord = async () => {
    if (!couple) return;
    await supabase.from('drawing_strokes').delete().eq('couple_id', couple.id).eq('board', 'game');
    await supabase
      .from('pictionary')
      .update({ word: randomWord(), solved: false, updated_at: new Date().toISOString() })
      .eq('couple_id', couple.id);
  };

  const submitGuess = async () => {
    if (!couple || !round?.word) return;
    if (normalize(guess) === normalize(round.word)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await supabase
        .from('pictionary')
        .update({ solved: true, updated_at: new Date().toISOString() })
        .eq('couple_id', couple.id);
    } else {
      setWrong(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => setWrong(false), 1200);
    }
  };

  if (!couple || !profile) return null;

  const isDrawer = round?.drawer_id === profile.id;
  const active = round?.word && !round.solved;

  // Aucun round OU round résolu : écran de lancement.
  if (!active) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 54 }}>🎨</Text>
        <ThemedText variant="title" center style={{ marginTop: spacing.md }}>
          Dessine & devine
        </ThemedText>
        {round?.solved && round.word ? (
          <ThemedText variant="body" color={colors.sauge} center style={{ marginTop: 6 }}>
            🎉 Trouvé : « {round.word} » !
          </ThemedText>
        ) : (
          <ThemedText variant="body" color={colors.texteGris} center style={{ marginTop: 6, paddingHorizontal: spacing.lg }}>
            L'un dessine un mot secret, l'autre devine en temps réel.
          </ThemedText>
        )}
        <Pressable onPress={startRound} style={styles.primary}>
          <Text style={styles.primaryTxt}>✏️ À moi de dessiner</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, gap: spacing.sm }}>
      {isDrawer ? (
        <View style={styles.wordBox}>
          <ThemedText variant="label" color={colors.cremeDoux}>
            DESSINE (sans écrire !)
          </ThemedText>
          <ThemedText variant="displaySmall" color={colors.creme}>
            {round!.word}
          </ThemedText>
        </View>
      ) : (
        <View style={[styles.wordBox, { backgroundColor: colors.prune }]}>
          <ThemedText variant="label" color={colors.cremeDoux}>
            {partner?.display_name ?? 'Ta moitié'} DESSINE…
          </ThemedText>
          <ThemedText variant="body" color={colors.creme}>
            Devine le mot 👀
          </ThemedText>
        </View>
      )}

      <SharedCanvas
        coupleId={couple.id}
        authorId={profile.id}
        board="game"
        editable={!!isDrawer}
        color={color}
        style={{ minHeight: 260 }}
      />

      {isDrawer ? (
        <>
          <View style={styles.palette}>
            {PALETTE.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchOn]}
              />
            ))}
          </View>
          <Pressable onPress={newWord} style={styles.ghost}>
            <Text style={styles.ghostTxt}>↻ Autre mot</Text>
          </Pressable>
        </>
      ) : (
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <Input
            placeholder="Ta réponse…"
            value={guess}
            onChangeText={setGuess}
            onSubmitEditing={submitGuess}
            style={[{ flex: 1 }, wrong && { borderColor: colors.corail, borderWidth: 2 }]}
          />
          <Pressable onPress={submitGuess} style={styles.guessBtn}>
            <Text style={styles.guessTxt}>Deviner</Text>
          </Pressable>
        </View>
      )}
      {wrong ? (
        <ThemedText variant="body" color={colors.corail} center>
          Pas encore… continue ! 😄
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  primary: {
    backgroundColor: colors.ambre,
    borderRadius: radius.pill,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  primaryTxt: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.encre },
  wordBox: {
    backgroundColor: colors.encre,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  palette: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.bordure },
  swatchOn: { borderWidth: 3, borderColor: colors.encre },
  ghost: { alignItems: 'center', paddingVertical: spacing.sm },
  ghostTxt: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.prune },
  guessBtn: {
    backgroundColor: colors.ambre,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  guessTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.encre },
});
