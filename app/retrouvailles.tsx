import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { EmptyState, Input, Screen, ThemedText } from '../src/components/ui';
import { colors } from '../src/theme/colors';
import { fonts, radius, spacing } from '../src/theme/typography';
import { useCoupleTable } from '../src/hooks/useCoupleTable';
import { useAuth } from '../src/store/auth';
import { supabase } from '../src/lib/supabase';
import { pushToPartner } from '../src/lib/push';
import type { ReunionTask } from '../src/types/db';

/** Quelques idées pour démarrer la liste (ajoutées d'un tap). */
const SUGGESTIONS = [
  '✈️ Réserver les billets',
  '📅 Poser les congés',
  '🏨 Réserver le logement',
  '🍽️ Choisir un resto',
  '🎁 Préparer une surprise',
  '💶 Prévoir le budget',
];

export default function Retrouvailles() {
  const router = useRouter();
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const { rows, loading, reload } = useCoupleTable<ReunionTask>('reunion_tasks', 'created_at', true);
  const [refreshing, setRefreshing] = useState(false);
  const [text, setText] = useState('');

  const onRefresh = async () => { setRefreshing(true); await reload(); setRefreshing(false); };

  const sorted = [...rows].sort((a, b) => Number(a.done) - Number(b.done));
  const todo = rows.filter((t) => !t.done).length;

  const add = async (value?: string) => {
    const t = (value ?? text).trim();
    if (!t || !couple || !profile) return;
    if (!value) setText('');
    await supabase.from('reunion_tasks').insert({ couple_id: couple.id, author_id: profile.id, text: t });
    pushToPartner(partner?.id, `🧳 ${profile.display_name}`, `a ajouté « ${t} » aux préparatifs`);
  };

  const toggle = async (task: ReunionTask) => {
    if (!profile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await supabase
      .from('reunion_tasks')
      .update({
        done: !task.done,
        done_by: !task.done ? profile.id : null,
        done_at: !task.done ? new Date().toISOString() : null,
      })
      .eq('id', task.id);
  };

  const remove = async (task: ReunionTask) => {
    await supabase.from('reunion_tasks').delete().eq('id', task.id);
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ThemedText variant="bodyMedium" color={colors.corail}>‹ Retour</ThemedText>
        </Pressable>
        <ThemedText variant="title">Retrouvailles 🧳</ThemedText>
        <View style={{ width: 50 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.prune} />
          </View>
        ) : rows.length === 0 ? (
          <FlatList
            data={SUGGESTIONS}
            keyExtractor={(s) => s}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
            ListHeaderComponent={
              <View style={{ marginBottom: spacing.md }}>
                <EmptyState
                  emoji="🧳"
                  title="Préparez votre prochaine visite"
                  subtitle="Une check-list à deux : billets, congés, logement, idées de sorties…"
                />
                <ThemedText variant="label" color={colors.texteGris} style={{ marginTop: spacing.lg }}>
                  IDÉES POUR DÉMARRER
                </ThemedText>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable onPress={() => add(item)} style={styles.suggestion}>
                <ThemedText variant="body">{item}</ThemedText>
                <Text style={{ fontSize: 20, color: colors.corail }}>＋</Text>
              </Pressable>
            )}
          />
        ) : (
          <FlatList
            data={sorted}
            keyExtractor={(t) => t.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.prune} />}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: 20 }}
            ListHeaderComponent={
              <ThemedText variant="label" color={colors.texteGris} style={{ marginBottom: spacing.sm }}>
                {todo} À FAIRE · {rows.length - todo} PRÊT{rows.length - todo > 1 ? 'S' : ''}
              </ThemedText>
            }
            renderItem={({ item }) => (
              <Pressable onPress={() => toggle(item)} onLongPress={() => remove(item)} style={[styles.row, item.done && styles.rowDone]}>
                <View style={[styles.check, item.done && styles.checkOn]}>
                  {item.done ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>
                <ThemedText
                  variant="body"
                  color={item.done ? colors.texteGris : colors.texteSombre}
                  style={[{ flex: 1 }, item.done && styles.strike]}
                >
                  {item.text}
                </ThemedText>
                {item.done && item.done_by ? (
                  <Text style={styles.by}>{item.done_by === profile?.id ? 'toi' : partner?.display_name ?? '❤'}</Text>
                ) : null}
              </Pressable>
            )}
          />
        )}

        <View style={styles.inputBar}>
          <Input placeholder="À préparer…" value={text} onChangeText={setText} style={{ flex: 1 }} onSubmitEditing={() => add()} />
          <Pressable onPress={() => add()} disabled={!text.trim()} style={[styles.add, !text.trim() && { opacity: 0.4 }]}>
            <Text style={{ fontSize: 24, color: colors.encre }}>＋</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  rowDone: { backgroundColor: colors.cremeDoux },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.ambre,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.ambre },
  checkMark: { color: colors.encre, fontFamily: fonts.bodyBold, fontSize: 15 },
  strike: { textDecorationLine: 'line-through' },
  by: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.ambre },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.creme,
    borderTopWidth: 1,
    borderTopColor: colors.bordure,
  },
  add: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.ambre,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
