import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ThemedText } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';
import { radius, spacing } from '../../src/theme/typography';
import { useAuth } from '../../src/store/auth';
import { supabase } from '../../src/lib/supabase';
import { languageFlag, languageName } from '../../src/lib/languages';
import type { Profile, RoomParticipant, RoomRole, VoiceRoom } from '../../src/types/db';

type Member = RoomParticipant & { profile: Profile | null };

export default function RoomScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useAuth((s) => s.profile);

  const [room, setRoom] = useState<VoiceRoom | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true); // état micro local (UI)

  const myRole: RoomRole | null =
    members.find((m) => m.user_id === me?.id)?.role ?? null;
  const isHost = room?.host_id === me?.id;

  const loadMembers = useCallback(async () => {
    const { data } = await supabase
      .from('room_participants')
      .select('*, profiles(*)')
      .eq('room_id', id)
      .order('joined_at', { ascending: true });
    setMembers(
      ((data ?? []) as any[]).map((r) => ({
        room_id: r.room_id,
        user_id: r.user_id,
        role: r.role,
        joined_at: r.joined_at,
        profile: (r.profiles as Profile) ?? null,
      })),
    );
  }, [id]);

  // Chargement initial + inscription comme participant.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: r } = await supabase
        .from('voice_rooms')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!alive) return;
      setRoom((r as VoiceRoom) ?? null);

      if (me && r) {
        const role: RoomRole = r.host_id === me.id ? 'host' : 'listener';
        await supabase
          .from('room_participants')
          .upsert(
            { room_id: id, user_id: me.id, role },
            { onConflict: 'room_id,user_id' },
          );
      }
      await loadMembers();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id, me, loadMembers]);

  // Présence temps réel.
  useEffect(() => {
    const channel = supabase
      .channel(`room-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${id}` },
        () => loadMembers(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'voice_rooms', filter: `id=eq.${id}` },
        (payload) => {
          const updated = payload.new as VoiceRoom;
          setRoom(updated);
          if (!updated.is_live) router.back();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadMembers, router]);

  const leave = useCallback(async () => {
    if (me) {
      await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', id)
        .eq('user_id', me.id);
    }
    router.back();
  }, [id, me, router]);

  const toggleSpeak = useCallback(async () => {
    if (!me || isHost) return;
    const next: RoomRole = myRole === 'speaker' ? 'listener' : 'speaker';
    await supabase
      .from('room_participants')
      .update({ role: next })
      .eq('room_id', id)
      .eq('user_id', me.id);
    if (next === 'listener') setMuted(true);
  }, [me, isHost, myRole, id]);

  const endRoom = useCallback(async () => {
    if (!isHost) return;
    await supabase.from('voice_rooms').update({ is_live: false }).eq('id', id);
    await supabase.from('room_participants').delete().eq('room_id', id);
    router.back();
  }, [isHost, id, router]);

  if (loading || !room) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.ambre} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const stage = members.filter((m) => m.role === 'host' || m.role === 'speaker');
  const audience = members.filter((m) => m.role === 'listener');
  const onStage = myRole === 'host' || myRole === 'speaker';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160 }}>
        <View style={styles.topRow}>
          <View style={styles.liveTag}>
            <ThemedText variant="label" color={colors.creme}>● EN DIRECT</ThemedText>
          </View>
          <Pressable onPress={leave} hitSlop={10}>
            <ThemedText style={{ fontSize: 24 }}>✕</ThemedText>
          </Pressable>
        </View>

        <ThemedText variant="display" color={colors.encre} style={{ marginTop: spacing.md }}>
          {room.title}
        </ThemedText>
        <ThemedText variant="body" color={colors.texteGris}>
          {languageFlag(room.language)} {languageName(room.language)} · pratique orale
        </ThemedText>

        {/* Bandeau : intégration audio à venir */}
        <View style={styles.audioNotice}>
          <ThemedText variant="label" color={colors.encre}>
            🔊 Audio en direct
          </ThemedText>
          <ThemedText variant="body" color={colors.texteSombre} style={{ marginTop: 4 }}>
            La présence est en temps réel. Le flux audio se branche via un SDK
            (LiveKit / Daily / Agora) — voir README.
          </ThemedText>
        </View>

        <ThemedText variant="label" color={colors.prune} style={styles.section}>
          SUR LA SCÈNE ({stage.length})
        </ThemedText>
        <View style={styles.grid}>
          {stage.map((m) => (
            <MemberBubble key={m.user_id} member={m} big />
          ))}
        </View>

        {audience.length > 0 ? (
          <>
            <ThemedText variant="label" color={colors.prune} style={styles.section}>
              AUDITEURS ({audience.length})
            </ThemedText>
            <View style={styles.grid}>
              {audience.map((m) => (
                <MemberBubble key={m.user_id} member={m} />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Barre de contrôle */}
      <View style={styles.controls}>
        {onStage ? (
          <Pressable
            style={[styles.micBtn, muted ? styles.micMuted : styles.micLive]}
            onPress={() => setMuted((m) => !m)}
          >
            <ThemedText style={{ fontSize: 22 }}>{muted ? '🔇' : '🎙️'}</ThemedText>
            <ThemedText variant="label" color={colors.creme}>
              {muted ? 'Micro coupé' : 'En parole'}
            </ThemedText>
          </Pressable>
        ) : (
          <Button title="✋ Demander la parole" variant="secondary" onPress={toggleSpeak} style={{ flex: 1 }} />
        )}

        {isHost ? (
          <Button title="Terminer" variant="ghost" onPress={endRoom} />
        ) : onStage ? (
          <Button title="Quitter la scène" variant="ghost" onPress={toggleSpeak} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function MemberBubble({ member, big }: { member: Member; big?: boolean }) {
  const size = big ? 76 : 56;
  return (
    <View style={{ alignItems: 'center', width: big ? 92 : 72 }}>
      <View
        style={[
          styles.bubble,
          { width: size, height: size, borderRadius: size / 2 },
          member.role !== 'listener' && styles.bubbleActive,
        ]}
      >
        <ThemedText style={{ fontSize: big ? 34 : 26 }}>
          {member.profile?.avatar_emoji ?? '🙂'}
        </ThemedText>
      </View>
      <ThemedText variant="label" color={colors.encre} numberOfLines={1} style={{ marginTop: 4 }}>
        {member.role === 'host' ? '👑 ' : ''}
        {member.profile?.display_name ?? '—'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.creme },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveTag: {
    backgroundColor: colors.corail,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  audioNotice: {
    backgroundColor: colors.cremeDoux,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  section: { marginTop: spacing.lg, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  bubble: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleActive: {
    borderWidth: 3,
    borderColor: colors.sauge,
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.creme,
    borderTopWidth: 1,
    borderTopColor: colors.bordure,
  },
  micBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: radius.pill,
  },
  micLive: { backgroundColor: colors.sauge },
  micMuted: { backgroundColor: colors.prune },
});
