import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  Button,
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
import {
  MUSIC_SERVICES,
  openInLinks,
  searchTracks,
  TrackResult,
} from '../../src/lib/music';

export default function Playlist() {
  const router = useRouter();
  const { rows } = useCoupleTable<Track>('playlist_tracks');
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TrackResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Recherche « à la volée » avec un petit délai (debounce).
  useEffect(() => {
    if (!searchOpen) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const r = await searchTracks(q);
      setResults(r);
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query, searchOpen]);

  const add = async (r: TrackResult) => {
    if (!couple || !profile) return;
    setSearchOpen(false);
    setQuery('');
    setResults([]);
    await supabase.from('playlist_tracks').insert({
      couple_id: couple.id,
      author_id: profile.id,
      title: r.title,
      artist: r.artist,
      artwork_url: r.artwork,
    });
  };

  const remove = async (id: string) => {
    await supabase.from('playlist_tracks').delete().eq('id', id);
  };

  const authorName = (id: string) =>
    id === profile?.id ? 'Toi' : partner?.display_name ?? 'Ta moitié';

  return (
    <Screen>
      <ScreenHeader
        title="Playlist"
        subtitle="Vos morceaux à deux"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/activites'))}
      />
      <FlatList
        data={rows}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.sm,
          paddingBottom: 160,
        }}
        ListEmptyComponent={
          <EmptyState
            emoji="🎵"
            title="Playlist vide"
            subtitle="Cherchez une chanson à ajouter ci-dessous."
          />
        }
        renderItem={({ item }) => (
          <TrackRow item={item} author={authorName(item.author_id)} onLongPress={() => remove(item.id)} />
        )}
      />

      <View style={styles.addBar}>
        <Button title="🔎 Chercher une chanson" onPress={() => setSearchOpen(true)} />
      </View>

      {/* Recherche */}
      <Modal visible={searchOpen} animationType="slide">
        <Screen>
          <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
            <View style={styles.searchHead}>
              <ThemedText variant="displaySmall">Chercher</ThemedText>
              <Pressable onPress={() => setSearchOpen(false)}>
                <ThemedText variant="bodyMedium" color={colors.corail}>
                  Fermer
                </ThemedText>
              </Pressable>
            </View>
            <Input
              placeholder="Titre ou artiste…"
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            <FlatList
              data={results}
              keyExtractor={(r, i) => `${r.title}-${r.artist}-${i}`}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable onPress={() => add(item)} style={styles.resultRow}>
                  {item.artwork ? (
                    <Image source={{ uri: item.artwork }} style={styles.resultArt} />
                  ) : (
                    <View style={[styles.resultArt, styles.artPlaceholder]}>
                      <Text style={{ fontSize: 20 }}>🎵</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="bodyMedium" numberOfLines={1}>
                      {item.title}
                    </ThemedText>
                    <ThemedText variant="body" color={colors.texteGris} numberOfLines={1}>
                      {item.artist}
                    </ThemedText>
                  </View>
                  <Text style={{ fontSize: 22, color: colors.sauge }}>＋</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <ThemedText
                  variant="body"
                  color={colors.texteGris}
                  center
                  style={{ marginTop: spacing.lg }}
                >
                  {searching
                    ? 'Recherche…'
                    : query.trim().length < 2
                      ? 'Tape le titre d’une chanson.'
                      : 'Aucun résultat.'}
                </ThemedText>
              }
            />
          </View>
        </Screen>
      </Modal>
    </Screen>
  );
}

function TrackRow({
  item,
  author,
  onLongPress,
}: {
  item: Track;
  author: string;
  onLongPress: () => void;
}) {
  const links = useMemo(() => openInLinks(item.title, item.artist), [item]);
  return (
    <Pressable onLongPress={onLongPress} style={styles.track}>
      <View style={styles.trackTop}>
        {item.artwork_url ? (
          <Image source={{ uri: item.artwork_url }} style={styles.art} />
        ) : (
          <View style={[styles.art, styles.artPlaceholder]}>
            <Text style={{ fontSize: 20 }}>🎵</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <ThemedText variant="bodyMedium" numberOfLines={1}>
            {item.title}
          </ThemedText>
          {item.artist ? (
            <ThemedText variant="body" color={colors.texteGris} numberOfLines={1}>
              {item.artist}
            </ThemedText>
          ) : null}
          <ThemedText variant="label" color={colors.texteGris} style={{ marginTop: 2 }}>
            AJOUTÉ PAR {author.toUpperCase()}
          </ThemedText>
        </View>
      </View>
      <View style={styles.services}>
        {MUSIC_SERVICES.map((s) => (
          <Pressable
            key={s.key}
            onPress={() => Linking.openURL(links[s.key])}
            style={[styles.serviceBtn, { borderColor: s.color }]}
          >
            <Text style={{ fontSize: 13 }}>{s.emoji}</Text>
            <Text style={[styles.serviceLabel, { color: s.color }]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  trackTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  art: { width: 52, height: 52, borderRadius: 8, backgroundColor: colors.cremeDoux },
  artPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  services: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  serviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  serviceLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12 },
  addBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.creme,
    borderTopWidth: 1,
    borderTopColor: colors.bordure,
  },
  searchHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.bordure,
  },
  resultArt: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.cremeDoux },
});
