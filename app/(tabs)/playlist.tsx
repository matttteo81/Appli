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
import type { Track } from '../../src/types/db';

export default function Playlist() {
  const { rows, loading } = useCoupleTable<Track>('playlist_tracks');
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');

  const add = async () => {
    const t = title.trim();
    if (!t || !couple || !profile) return;
    setTitle('');
    setArtist('');
    await supabase.from('playlist_tracks').insert({
      couple_id: couple.id,
      author_id: profile.id,
      title: t,
      artist: artist.trim(),
    });
  };

  const remove = async (id: string) => {
    await supabase.from('playlist_tracks').delete().eq('id', id);
  };

  const authorName = (id: string) =>
    id === profile?.id ? 'Toi' : partner?.display_name ?? 'Ta moitié';

  return (
    <Screen>
      <ScreenHeader title="Playlist" subtitle="Vos morceaux à deux" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          data={rows}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{
            padding: spacing.lg,
            gap: spacing.sm,
            paddingBottom: 200,
          }}
          ListEmptyComponent={
            loading ? null : (
              <EmptyState
                emoji="🎵"
                title="Playlist vide"
                subtitle="Ajoutez la première chanson qui vous relie."
              />
            )
          }
          renderItem={({ item, index }) => (
            <Pressable
              onLongPress={() => remove(item.id)}
              style={styles.track}
            >
              <Text style={styles.index}>
                {String(index + 1).padStart(2, '0')}
              </Text>
              <View style={{ flex: 1 }}>
                <ThemedText variant="bodyMedium" numberOfLines={1}>
                  {item.title}
                </ThemedText>
                {item.artist ? (
                  <ThemedText
                    variant="body"
                    color={colors.texteGris}
                    numberOfLines={1}
                  >
                    {item.artist}
                  </ThemedText>
                ) : null}
              </View>
              <Text style={styles.by}>{authorName(item.author_id)}</Text>
            </Pressable>
          )}
        />

        <View style={styles.inputBar}>
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Input
              placeholder="Titre du morceau"
              value={title}
              onChangeText={setTitle}
            />
            <Input
              placeholder="Artiste (optionnel)"
              value={artist}
              onChangeText={setArtist}
            />
          </View>
          <Pressable
            onPress={add}
            disabled={title.trim().length === 0}
            style={[styles.addBtn, title.trim().length === 0 && { opacity: 0.4 }]}
          >
            <Text style={{ fontSize: 22 }}>🎶</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  index: {
    fontFamily: fonts.monoMedium,
    fontSize: 16,
    color: colors.ambre,
    width: 26,
  },
  by: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.texteGris,
  },
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.ambre,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
