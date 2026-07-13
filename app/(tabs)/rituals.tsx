import React, { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  EmptyState,
  Input,
  Screen,
  ScreenHeader,
  ThemedText,
} from '../../src/components/ui';
import { colors } from '../../src/theme/colors';
import { fonts, radius, spacing } from '../../src/theme/typography';
import { useCoupleTable } from '../../src/hooks/useCoupleTable';
import { useAuth } from '../../src/store/auth';
import { supabase } from '../../src/lib/supabase';
import type { Ritual } from '../../src/types/db';

const SUGGESTIONS = [
  { emoji: '🎬', title: 'Regarder un film en même temps' },
  { emoji: '📖', title: 'Lire le même livre' },
  { emoji: '🍜', title: 'Dîner ensemble en visio' },
  { emoji: '☕', title: 'Café du matin en appel' },
  { emoji: '🎧', title: 'Écouter une playlist ensemble' },
];

export default function Rituals() {
  const { rows, loading } = useCoupleTable<Ritual>('rituals', 'created_at', true);
  const profile = useAuth((s) => s.profile);
  const couple = useAuth((s) => s.couple);
  const [text, setText] = useState('');

  const add = async (title: string, emoji = '✨') => {
    const t = title.trim();
    if (!t || !couple) return;
    setText('');
    await supabase
      .from('rituals')
      .insert({ couple_id: couple.id, title: t, emoji });
  };

  const toggle = async (r: Ritual) => {
    await supabase
      .from('rituals')
      .update({
        done: !r.done,
        done_by: !r.done ? profile?.id ?? null : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', r.id);
  };

  const remove = async (r: Ritual) => {
    await supabase.from('rituals').delete().eq('id', r.id);
  };

  return (
    <Screen>
      <ScreenHeader title="Rituels" subtitle="Vos petites activités à deux" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{
            padding: spacing.lg,
            gap: spacing.sm,
            paddingBottom: 180,
          }}
          ListHeaderComponent={
            rows.length === 0 && !loading ? (
              <View style={{ marginBottom: spacing.md }}>
                <ThemedText variant="label" color={colors.texteGris}>
                  IDÉES POUR COMMENCER
                </ThemedText>
                <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                  {SUGGESTIONS.map((s) => (
                    <Pressable
                      key={s.title}
                      onPress={() => add(s.title, s.emoji)}
                      style={styles.suggestion}
                    >
                      <Text style={{ fontSize: 20 }}>{s.emoji}</Text>
                      <ThemedText variant="body" style={{ flex: 1 }}>
                        {s.title}
                      </ThemedText>
                      <Text style={{ fontSize: 18, color: colors.sauge }}>＋</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            loading ? null : (
              <EmptyState emoji="✨" title="Créez vos rituels" />
            )
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => toggle(item)}
              onLongPress={() => remove(item)}
              style={[styles.item, item.done && styles.itemDone]}
            >
              <View
                style={[styles.check, item.done && styles.checkDone]}
              >
                {item.done ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
              <ThemedText
                variant="bodyMedium"
                style={[
                  { flex: 1 },
                  item.done && {
                    textDecorationLine: 'line-through',
                    color: colors.texteGris,
                  },
                ]}
              >
                {item.title}
              </ThemedText>
            </Pressable>
          )}
        />

        <View style={styles.inputBar}>
          <Input
            placeholder="Ajouter un rituel…"
            value={text}
            onChangeText={setText}
            style={{ flex: 1 }}
            onSubmitEditing={() => add(text)}
          />
          <Pressable
            onPress={() => add(text)}
            disabled={text.trim().length === 0}
            style={[styles.addBtn, text.trim().length === 0 && { opacity: 0.4 }]}
          >
            <Text style={{ fontSize: 24, color: colors.encre }}>＋</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  itemDone: { backgroundColor: '#EEF3EC' },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.sauge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.sauge },
  checkMark: { color: '#FFFFFF', fontFamily: fonts.bodyBold, fontSize: 15 },
  inputBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.creme,
    borderTopWidth: 1,
    borderTopColor: colors.bordure,
  },
  addBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.ambre,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
