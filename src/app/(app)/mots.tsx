/**
 * Écran MOTS PARTAGÉS : un fil de petits mots (post-it) entre vous deux,
 * mis à jour en temps réel.
 */
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { Colors, Palette, Radius, softShadow, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useCoupleRows } from '@/lib/useCoupleData';
import { useSession } from '@/store/useSession';
import type { Note } from '@/types/db';

const NOTE_COLORS = ['#FBE0B8', '#F7C9BF', '#D6E4CF', '#E0D7EC', '#FBF0D8'];

function randomColor() {
  return NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
}

export default function Mots() {
  const session = useSession((s) => s.session);
  const couple = useSession((s) => s.couple);
  const { rows, loading } = useCoupleRows('notes');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  async function addNote() {
    const content = text.trim();
    if (!content || !couple || !session) return;
    setSending(true);
    const { error } = await supabase.from('notes').insert({
      couple_id: couple.id,
      author_id: session.user.id,
      content,
      color: randomColor(),
    });
    setSending(false);
    if (error) {
      Alert.alert('Oups', error.message);
      return;
    }
    setText('');
  }

  async function removeNote(note: Note) {
    Alert.alert('Supprimer ce mot ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => supabase.from('notes').delete().eq('id', note.id),
      },
    ]);
  }

  return (
    <Screen>
      <AppText variant="display" style={styles.title}>
        Mots
      </AppText>
      <AppText variant="body" color={Colors.textSecondary} style={styles.subtitle}>
        Laisse une petite pensée. Elle apparaîtra tout de suite chez l'autre.
      </AppText>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.composer}>
          <TextField
            value={text}
            onChangeText={setText}
            placeholder="Un mot doux, une pensée…"
            multiline
            style={styles.input}
          />
          <Button label="Épingler" onPress={addNote} loading={sending} />
        </View>
      </KeyboardAvoidingView>

      {!loading && rows.length === 0 && (
        <AppText variant="body" color={Colors.textMuted} center style={styles.empty}>
          Aucun mot pour l'instant. À toi de commencer 💛
        </AppText>
      )}

      <View style={styles.grid}>
        {(rows as Note[]).map((note, i) => {
          const mine = note.author_id === session?.user.id;
          return (
            <Pressable
              key={note.id}
              onLongPress={() => removeNote(note)}
              style={[
                styles.note,
                { backgroundColor: note.color, transform: [{ rotate: i % 2 ? '1.5deg' : '-1.5deg' }] },
              ]}>
              <AppText variant="body" color={Palette.encre}>
                {note.content}
              </AppText>
              <AppText variant="caption" color="rgba(27,27,58,0.55)" style={styles.noteMeta}>
                {mine ? 'toi' : 'ton amour'} ·{' '}
                {new Date(note.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                })}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {rows.length > 0 && (
        <AppText variant="caption" color={Colors.textMuted} center style={styles.hint}>
          Astuce : appuie longuement sur un mot pour le retirer.
        </AppText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: Spacing.sm },
  subtitle: { marginTop: 2, marginBottom: Spacing.lg },
  composer: { gap: Spacing.md, marginBottom: Spacing.xl },
  input: { minHeight: 72, paddingTop: Spacing.md, textAlignVertical: 'top' },
  empty: { marginTop: Spacing.xxl },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  note: {
    width: '47%',
    minHeight: 110,
    borderRadius: Radius.md,
    padding: Spacing.md,
    justifyContent: 'space-between',
    gap: Spacing.sm,
    ...softShadow,
  },
  noteMeta: { marginTop: Spacing.sm },
  hint: { marginTop: Spacing.lg },
});
