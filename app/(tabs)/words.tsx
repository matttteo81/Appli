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
import { Input, EmptyState, ThemedText, ScreenHeader } from '../../src/components/ui';
import { Screen } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';
import { fonts, radius, spacing } from '../../src/theme/typography';
import { useCoupleTable } from '../../src/hooks/useCoupleTable';
import { useAuth } from '../../src/store/auth';
import { supabase } from '../../src/lib/supabase';
import type { Word } from '../../src/types/db';

const POSTIT_COLORS = ['#F2A65A', '#EF8C7C', '#A8C3A0', '#C9B3E8', '#8FC0D9'];

export default function Words() {
  const { rows, loading } = useCoupleTable<Word>('words');
  const profile = useAuth((s) => s.profile);
  const couple = useAuth((s) => s.couple);
  const partner = useAuth((s) => s.partner);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const body = text.trim();
    if (!body || !couple || !profile) return;
    setSending(true);
    const color = POSTIT_COLORS[Math.floor(Math.random() * POSTIT_COLORS.length)];
    setText('');
    await supabase.from('words').insert({
      couple_id: couple.id,
      author_id: profile.id,
      body,
      color,
    });
    setSending(false);
  };

  const authorName = (id: string) =>
    id === profile?.id ? 'Toi' : partner?.display_name ?? 'Ta moitié';

  return (
    <Screen>
      <ScreenHeader title="Mots" subtitle="Vos petits mots, en direct" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          data={rows}
          keyExtractor={(w) => w.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
          contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.md, paddingBottom: 160 }}
          ListEmptyComponent={
            loading ? null : (
              <EmptyState
                emoji="💬"
                title="Aucun mot pour l'instant"
                subtitle="Écris le premier petit mot ci-dessous."
              />
            )
          }
          renderItem={({ item }) => (
            <View style={[styles.postit, { backgroundColor: item.color }]}>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.meta}>
                {authorName(item.author_id)} · {timeAgo(item.created_at)}
              </Text>
            </View>
          )}
        />

        <View style={styles.inputBar}>
          <Input
            placeholder="Écris un petit mot…"
            value={text}
            onChangeText={setText}
            style={{ flex: 1 }}
            multiline
            onSubmitEditing={send}
          />
          <Pressable
            onPress={send}
            disabled={sending || text.trim().length === 0}
            style={[
              styles.sendBtn,
              text.trim().length === 0 && { opacity: 0.4 },
            ]}
          >
            <Text style={{ fontSize: 20 }}>🕊️</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  return `il y a ${j} j`;
}

const styles = StyleSheet.create({
  postit: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 110,
    justifyContent: 'space-between',
    transform: [{ rotate: '-1deg' }],
    shadowColor: colors.encre,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  body: {
    fontFamily: fonts.displayMedium,
    fontSize: 17,
    color: colors.encre,
  },
  meta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: 'rgba(27,27,58,0.6)',
    marginTop: spacing.sm,
  },
  inputBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.creme,
    borderTopWidth: 1,
    borderTopColor: colors.bordure,
  },
  sendBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.ambre,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
