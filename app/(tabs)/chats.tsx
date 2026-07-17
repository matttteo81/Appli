import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen, ScreenHeader, ThemedText, EmptyState } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';
import { radius, spacing } from '../../src/theme/typography';
import { useAuth } from '../../src/store/auth';
import { supabase } from '../../src/lib/supabase';
import { languageFlag } from '../../src/lib/languages';
import type { Message, Profile } from '../../src/types/db';

type ChatRow = {
  conversationId: string;
  other: Profile | null;
  lastMessage: Message | null;
  lastAt: string;
};

export default function ChatsScreen() {
  const router = useRouter();
  const me = useAuth((s) => s.profile);
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    // 1) Mes conversations.
    const { data: mem } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', me.id);
    const convIds = (mem ?? []).map((m) => m.conversation_id);
    if (convIds.length === 0) {
      setRows([]);
      return;
    }

    // 2) Conversations (pour l'ordre) + autres membres + derniers messages.
    const [{ data: convs }, { data: others }, { data: msgs }] = await Promise.all([
      supabase
        .from('conversations')
        .select('*')
        .in('id', convIds)
        .order('last_message_at', { ascending: false }),
      supabase
        .from('conversation_members')
        .select('conversation_id, user_id, profiles(*)')
        .in('conversation_id', convIds)
        .neq('user_id', me.id),
      supabase
        .from('messages')
        .select('*')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false }),
    ]);

    const otherByConv = new Map<string, Profile>();
    (others ?? []).forEach((o: any) => {
      if (o.profiles) otherByConv.set(o.conversation_id, o.profiles as Profile);
    });
    const lastByConv = new Map<string, Message>();
    (msgs ?? []).forEach((m) => {
      if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
    });

    const next: ChatRow[] = (convs ?? []).map((c) => ({
      conversationId: c.id,
      other: otherByConv.get(c.id) ?? null,
      lastMessage: lastByConv.get(c.id) ?? null,
      lastAt: c.last_message_at,
    }));
    setRows(next);
  }, [me]);

  // Recharge à chaque affichage de l'onglet.
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load]),
  );

  // Rafraîchit en direct quand un message arrive n'importe où.
  useEffect(() => {
    if (!me) return;
    const channel = supabase
      .channel(`chats-${me.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <Screen>
      <ScreenHeader title="Discussions" subtitle="Tes échanges avec la communauté" />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.prune} size="large" />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          emoji="💬"
          title="Aucune discussion"
          subtitle="Va dans « Découvrir » pour trouver un partenaire et lancer la conversation."
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.conversationId}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: '/chat/[id]',
                  params: {
                    id: item.conversationId,
                    name: item.other?.display_name ?? 'Partenaire',
                    emoji: item.other?.avatar_emoji ?? '🙂',
                    otherId: item.other?.id ?? '',
                  },
                })
              }
            >
              <View style={styles.avatar}>
                <ThemedText style={{ fontSize: 26 }}>
                  {item.other?.avatar_emoji ?? '🙂'}
                </ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowBetween}>
                  <ThemedText variant="bodyMedium" color={colors.encre} numberOfLines={1}>
                    {item.other?.display_name ?? 'Partenaire'}{' '}
                    {(item.other?.native_langs ?? [])
                      .map((c) => languageFlag(c))
                      .join('')}
                  </ThemedText>
                  <ThemedText variant="label" color={colors.texteGris}>
                    {timeAgo(item.lastAt)}
                  </ThemedText>
                </View>
                <ThemedText
                  variant="body"
                  color={colors.texteGris}
                  numberOfLines={1}
                  style={{ marginTop: 2 }}
                >
                  {previewOf(item.lastMessage)}
                </ThemedText>
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

function previewOf(m: Message | null): string {
  if (!m) return 'Dis bonjour 👋';
  if (m.kind === 'voice') return '🎙️ Message vocal';
  if (m.kind === 'correction') return '✏️ Correction';
  return m.body ?? '';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'maintenant';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} j`;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.cremeDoux,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
