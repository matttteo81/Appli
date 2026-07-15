/**
 * Écran PLAYLIST : la liste des morceaux que chacun ajoute (titre + artiste),
 * partagée en temps réel.
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
import type { Song } from '@/types/db';

export default function Playlist() {
  const session = useSession((s) => s.session);
  const couple = useSession((s) => s.couple);
  const { rows } = useCoupleRows('songs');
  const songs = rows as Song[];
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');

  async function add() {
    const t = title.trim();
    if (!t || !couple || !session) return;
    const { error } = await supabase.from('songs').insert({
      couple_id: couple.id,
      author_id: session.user.id,
      title: t,
      artist: artist.trim() || null,
    });
    if (error) {
      Alert.alert('Oups', error.message);
      return;
    }
    setTitle('');
    setArtist('');
  }

  function remove(song: Song) {
    Alert.alert('Retirer ce morceau ?', song.title, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: () => supabase.from('songs').delete().eq('id', song.id),
      },
    ]);
  }

  return (
    <Screen>
      <View style={styles.composer}>
        <TextField label="Titre" value={title} onChangeText={setTitle} placeholder="Nom du morceau" />
        <TextField label="Artiste" value={artist} onChangeText={setArtist} placeholder="Optionnel" />
        <Button label="Ajouter à la playlist" onPress={add} />
      </View>

      <View style={styles.list}>
        {songs.map((s, i) => {
          const mine = s.author_id === session?.user.id;
          return (
            <Pressable key={s.id} onLongPress={() => remove(s)}>
              <Card style={styles.item}>
                <AppText variant="mono" color={Colors.textMuted} style={styles.index}>
                  {String(i + 1).padStart(2, '0')}
                </AppText>
                <View style={styles.itemText}>
                  <AppText variant="subtitle" numberOfLines={1}>
                    {s.title}
                  </AppText>
                  <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
                    {s.artist ? `${s.artist} · ` : ''}
                    ajouté par {mine ? 'toi' : 'ton amour'}
                  </AppText>
                </View>
                <AppText style={styles.note}>🎵</AppText>
              </Card>
            </Pressable>
          );
        })}
        {songs.length === 0 && (
          <AppText variant="body" color={Colors.textMuted} center style={styles.empty}>
            Ajoutez la première chanson de votre bande-son 🎶
          </AppText>
        )}
      </View>

      {songs.length > 0 && (
        <AppText variant="caption" color={Colors.textMuted} center style={styles.hint}>
          Appuie longuement sur un morceau pour le retirer.
        </AppText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  composer: { gap: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.xl },
  list: { gap: Spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  index: { fontSize: 16 },
  itemText: { flex: 1, gap: 2 },
  note: { fontSize: 18 },
  empty: { marginTop: Spacing.xl },
  hint: { marginTop: Spacing.lg },
});
