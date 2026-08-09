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
import type { Wish } from '../src/types/db';

export default function Wishlist() {
  const router = useRouter();
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const { rows, loading, reload } = useCoupleTable<Wish>('wishes', 'created_at', true);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => { setRefreshing(true); await reload(); setRefreshing(false); };
  const [text, setText] = useState('');

  // À faire d'abord, puis les réalisés en bas.
  const sorted = [...rows].sort((a, b) => Number(a.done) - Number(b.done));
  const todo = rows.filter((w) => !w.done).length;

  const add = async () => {
    const t = text.trim();
    if (!t || !couple || !profile) return;
    setText('');
    await supabase.from('wishes').insert({ couple_id: couple.id, author_id: profile.id, text: t });
  };

  const toggle = async (w: Wish) => {
    if (!profile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await supabase
      .from('wishes')
      .update({
        done: !w.done,
        done_by: !w.done ? profile.id : null,
        done_at: !w.done ? new Date().toISOString() : null,
      })
      .eq('id', w.id);
  };

  const remove = async (w: Wish) => {
    await supabase.from('wishes').delete().eq('id', w.id);
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ThemedText variant="bodyMedium" color={colors.corail}>‹ Retour</ThemedText>
        </Pressable>
        <ThemedText variant="title">À faire ensemble ✨</ThemedText>
        <View style={{ width: 50 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.prune} />
          </View>
        ) : rows.length === 0 ? (
          <EmptyState emoji="🗒️" title="Votre liste de rêves" subtitle="Ajoutez tout ce que vous rêvez de faire ensemble : voyages, restos, petits projets…" />
        ) : (
          <FlatList
            data={sorted}
            keyExtractor={(w) => w.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.prune} />}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: 20 }}
            ListHeaderComponent={
              <ThemedText variant="label" color={colors.texteGris} style={{ marginBottom: spacing.sm }}>
                {todo} À FAIRE · {rows.length - todo} RÉALISÉ{rows.length - todo > 1 ? 'S' : ''}
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
          <Input placeholder="Un rêve, une envie…" value={text} onChangeText={setText} style={{ flex: 1 }} onSubmitEditing={add} />
          <Pressable onPress={add} disabled={!text.trim()} style={[styles.add, !text.trim() && { opacity: 0.4 }]}>
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
    borderColor: colors.sauge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.sauge },
  checkMark: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 15 },
  strike: { textDecorationLine: 'line-through' },
  by: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.sauge },
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
