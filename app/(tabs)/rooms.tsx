import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button, EmptyState, Input, Screen, ScreenHeader, ThemedText } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';
import { radius, spacing } from '../../src/theme/typography';
import { useAuth } from '../../src/store/auth';
import { supabase } from '../../src/lib/supabase';
import { LANGUAGES, languageFlag, languageName } from '../../src/lib/languages';
import type { RoomLevel, VoiceRoom } from '../../src/types/db';

type RoomWithMeta = VoiceRoom & {
  host_name: string;
  host_emoji: string;
  count: number;
};

const LEVEL_LABEL: Record<RoomLevel, string> = {
  all: 'Tous niveaux',
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

export default function RoomsScreen() {
  const router = useRouter();
  const me = useAuth((s) => s.profile);
  const [rooms, setRooms] = useState<RoomWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('voice_rooms')
      .select('*, profiles!voice_rooms_host_id_fkey(display_name, avatar_emoji)')
      .eq('is_live', true)
      .order('created_at', { ascending: false });

    const list = (data ?? []) as any[];
    const ids = list.map((r) => r.id);
    const counts = new Map<string, number>();
    if (ids.length) {
      const { data: parts } = await supabase
        .from('room_participants')
        .select('room_id')
        .in('room_id', ids);
      (parts ?? []).forEach((p) => {
        counts.set(p.room_id, (counts.get(p.room_id) ?? 0) + 1);
      });
    }
    setRooms(
      list.map((r) => ({
        ...(r as VoiceRoom),
        host_name: r.profiles?.display_name ?? 'Hôte',
        host_emoji: r.profiles?.avatar_emoji ?? '🙂',
        count: counts.get(r.id) ?? 0,
      })),
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load]),
  );

  useEffect(() => {
    const channel = supabase
      .channel('rooms-lobby')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'voice_rooms' },
        () => load(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_participants' },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openRoom = (roomId: string) =>
    router.push({ pathname: '/room/[id]', params: { id: roomId } });

  return (
    <Screen>
      <View style={styles.headerRow}>
        <ScreenHeader title="Salons" subtitle="Pratique à l'oral, en direct" />
        <Pressable style={styles.newBtn} onPress={() => setCreating(true)}>
          <ThemedText style={{ fontSize: 22, color: colors.creme }}>＋</ThemedText>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.prune} size="large" />
        </View>
      ) : rooms.length === 0 ? (
        <EmptyState
          emoji="🎙️"
          title="Aucun salon en direct"
          subtitle="Sois la première personne à ouvrir un salon vocal !"
        />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => openRoom(item.id)}>
              <View style={styles.liveDot} />
              <View style={{ flex: 1 }}>
                <ThemedText variant="title" color={colors.encre} numberOfLines={2}>
                  {item.title}
                </ThemedText>
                <ThemedText variant="body" color={colors.texteGris} style={{ marginTop: 2 }}>
                  {languageFlag(item.language)} {languageName(item.language)} ·{' '}
                  {LEVEL_LABEL[item.level]}
                </ThemedText>
                <View style={styles.metaRow}>
                  <ThemedText variant="label" color={colors.prune}>
                    {item.host_emoji} {item.host_name}
                  </ThemedText>
                  <ThemedText variant="label" color={colors.texteGris}>
                    👥 {item.count}
                  </ThemedText>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}

      <CreateRoomModal
        visible={creating}
        onClose={() => setCreating(false)}
        onCreated={(roomId) => {
          setCreating(false);
          openRoom(roomId);
        }}
        hostId={me?.id}
        defaultLang={me?.learning_langs?.[0]?.code ?? 'en'}
      />
    </Screen>
  );
}

function CreateRoomModal({
  visible,
  onClose,
  onCreated,
  hostId,
  defaultLang,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (roomId: string) => void;
  hostId: string | undefined;
  defaultLang: string;
}) {
  const [title, setTitle] = useState('');
  const [lang, setLang] = useState(defaultLang);
  const [level, setLevel] = useState<RoomLevel>('all');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle('');
      setLang(defaultLang);
      setLevel('all');
    }
  }, [visible, defaultLang]);

  const create = async () => {
    if (!hostId || !title.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from('voice_rooms')
        .insert({ host_id: hostId, title: title.trim(), language: lang, level })
        .select('*')
        .single();
      if (error || !data) return;
      await supabase
        .from('room_participants')
        .insert({ room_id: data.id, user_id: hostId, role: 'host' });
      onCreated(data.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen>
        <View style={styles.modalHeader}>
          <ThemedText variant="displaySmall" color={colors.encre}>
            Nouveau salon
          </ThemedText>
          <Pressable onPress={onClose} hitSlop={10}>
            <ThemedText style={{ fontSize: 22 }}>✕</ThemedText>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <ThemedText variant="label" color={colors.prune}>SUJET</ThemedText>
          <Input
            value={title}
            onChangeText={setTitle}
            placeholder="Ex : Café-langues débutants ☕"
          />

          <ThemedText variant="label" color={colors.prune}>LANGUE PRATIQUÉE</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickRow}>
            {LANGUAGES.map((l) => (
              <Pressable
                key={l.code}
                onPress={() => setLang(l.code)}
                style={[styles.pick, lang === l.code && styles.pickActive]}
              >
                <ThemedText color={lang === l.code ? colors.creme : colors.prune}>
                  {l.flag} {l.name}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          <ThemedText variant="label" color={colors.prune}>NIVEAU</ThemedText>
          <View style={styles.pickRow}>
            {(Object.keys(LEVEL_LABEL) as RoomLevel[]).map((lv) => (
              <Pressable
                key={lv}
                onPress={() => setLevel(lv)}
                style={[styles.pick, level === lv && styles.pickActive]}
              >
                <ThemedText color={level === lv ? colors.creme : colors.prune}>
                  {LEVEL_LABEL[lv]}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <Button
            title="🎙️ Ouvrir le salon"
            onPress={create}
            loading={busy}
            disabled={!title.trim()}
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingRight: spacing.lg,
  },
  newBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.prune,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: colors.encre,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  liveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.corail,
    marginTop: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingBottom: 0,
  },
  pickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pick: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.prune,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  pickActive: { backgroundColor: colors.prune },
});
