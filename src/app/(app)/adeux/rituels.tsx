/**
 * Écran RITUELS : une liste de petites activités à cocher ensemble.
 * L'état (coché / décoché) est partagé en temps réel.
 */
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useCoupleRows } from '@/lib/useCoupleData';
import { useSession } from '@/store/useSession';
import type { Ritual } from '@/types/db';

const SUGGESTIONS: { emoji: string; title: string }[] = [
  { emoji: '🎬', title: 'Regarder un film en même temps' },
  { emoji: '📖', title: 'Lire le même livre' },
  { emoji: '🍳', title: 'Cuisiner la même recette' },
  { emoji: '🌇', title: 'Regarder le coucher de soleil' },
  { emoji: '📞', title: 'Appel visio du soir' },
];

export default function Rituels() {
  const session = useSession((s) => s.session);
  const couple = useSession((s) => s.couple);
  const { rows } = useCoupleRows('rituals', { ascending: true });
  const rituals = rows as Ritual[];
  const [title, setTitle] = useState('');

  async function addRitual(t: string, emoji?: string) {
    const clean = t.trim();
    if (!clean || !couple) return;
    const { error } = await supabase
      .from('rituals')
      .insert({ couple_id: couple.id, title: clean, emoji: emoji ?? null });
    if (error) Alert.alert('Oups', error.message);
    setTitle('');
  }

  async function toggle(r: Ritual) {
    const next = !r.done;
    await supabase
      .from('rituals')
      .update({
        done: next,
        done_by: next ? session?.user.id ?? null : null,
        done_at: next ? new Date().toISOString() : null,
      })
      .eq('id', r.id);
  }

  function remove(r: Ritual) {
    Alert.alert('Supprimer ce rituel ?', r.title, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => supabase.from('rituals').delete().eq('id', r.id),
      },
    ]);
  }

  const alreadyTitles = new Set(rituals.map((r) => r.title));
  const freshSuggestions = SUGGESTIONS.filter((s) => !alreadyTitles.has(s.title));

  return (
    <Screen>
      <View style={styles.composer}>
        <TextField
          value={title}
          onChangeText={setTitle}
          placeholder="Un nouveau rituel à deux…"
        />
        <Button label="Ajouter" onPress={() => addRitual(title)} />
      </View>

      {freshSuggestions.length > 0 && (
        <View style={styles.suggestions}>
          <AppText variant="label" color={Colors.textMuted}>
            Idées à ajouter
          </AppText>
          <View style={styles.chips}>
            {freshSuggestions.map((s) => (
              <Pressable
                key={s.title}
                style={styles.chip}
                onPress={() => addRitual(s.title, s.emoji)}>
                <AppText variant="caption" color={Palette.encre}>
                  {s.emoji} {s.title}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.list}>
        {rituals.map((r) => (
          <Pressable key={r.id} onPress={() => toggle(r)} onLongPress={() => remove(r)}>
            <Card style={StyleSheet.flatten([styles.item, r.done && styles.itemDone])}>
              <View style={[styles.check, r.done && styles.checkOn]}>
                {r.done ? <AppText style={styles.checkMark}>✓</AppText> : null}
              </View>
              <AppText
                variant="body"
                color={r.done ? Colors.textMuted : Colors.text}
                style={[styles.itemLabel, r.done && styles.struck]}>
                {r.emoji ? `${r.emoji} ` : ''}
                {r.title}
              </AppText>
            </Card>
          </Pressable>
        ))}
        {rituals.length === 0 && (
          <AppText variant="body" color={Colors.textMuted} center style={styles.empty}>
            Ajoutez votre premier rituel ci-dessus 🌿
          </AppText>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  composer: { gap: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.lg },
  suggestions: { gap: Spacing.sm, marginBottom: Spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    backgroundColor: Colors.surfaceSunk,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  list: { gap: Spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  itemDone: { backgroundColor: '#F1F5EE' },
  itemLabel: { flex: 1 },
  struck: { textDecorationLine: 'line-through' },
  check: {
    width: 26,
    height: 26,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: Colors.success, borderColor: Colors.success },
  checkMark: { color: Palette.blanc, fontSize: 15, fontWeight: '700' },
  empty: { marginTop: Spacing.xl },
});
