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
} from '../../src/components/ui';
import { colors } from '../../src/theme/colors';
import { fonts, radius, spacing } from '../../src/theme/typography';
import { useCoupleTable } from '../../src/hooks/useCoupleTable';
import { useAuth } from '../../src/store/auth';
import { supabase } from '../../src/lib/supabase';
import type { Message } from '../../src/types/db';

export default function Messages() {
  // Ordre décroissant (plus récent d'abord) pour une FlatList inversée.
  const { rows, loading } = useCoupleTable<Message>('messages', 'created_at', false);
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const [text, setText] = useState('');

  const send = async () => {
    const body = text.trim();
    if (!body || !couple || !profile) return;
    setText('');
    await supabase.from('messages').insert({
      couple_id: couple.id,
      author_id: profile.id,
      body,
    });
  };

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Messages" subtitle="Votre fil de discussion" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {rows.length === 0 && !loading ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <EmptyState
              emoji="💬"
              title="Aucun message"
              subtitle="Écris le premier message ci-dessous."
            />
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(m) => m.id}
            inverted
            contentContainerStyle={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
              gap: 4,
            }}
            renderItem={({ item, index }) => {
              const mine = item.author_id === profile?.id;
              // rows est décroissant → l'élément "précédent à l'écran" est index+1
              const prev = rows[index + 1];
              const grouped = prev && prev.author_id === item.author_id;
              return (
                <View
                  style={[
                    styles.bubbleRow,
                    { justifyContent: mine ? 'flex-end' : 'flex-start' },
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      mine ? styles.mine : styles.theirs,
                      grouped && { marginTop: 0 },
                    ]}
                  >
                    <Text style={[styles.body, { color: mine ? colors.creme : colors.encre }]}>
                      {item.body}
                    </Text>
                    <Text style={[styles.time, { color: mine ? 'rgba(251,246,239,0.7)' : colors.texteGris }]}>
                      {formatTime(item.created_at)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        <View style={styles.inputBar}>
          <Input
            placeholder="Message…"
            value={text}
            onChangeText={setText}
            style={{ flex: 1 }}
            multiline
            onSubmitEditing={send}
          />
          <Pressable
            onPress={send}
            disabled={text.trim().length === 0}
            style={[styles.send, text.trim().length === 0 && { opacity: 0.4 }]}
          >
            <Text style={{ fontSize: 20 }}>➤</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

const styles = StyleSheet.create({
  bubbleRow: { flexDirection: 'row', marginTop: 6 },
  bubble: {
    maxWidth: '78%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  mine: {
    backgroundColor: colors.prune,
    borderBottomRightRadius: 6,
  },
  theirs: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  body: { fontFamily: fonts.bodyRegular, fontSize: 16, lineHeight: 22 },
  time: { fontFamily: fonts.bodyMedium, fontSize: 10, marginTop: 3, alignSelf: 'flex-end' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.creme,
    borderTopWidth: 1,
    borderTopColor: colors.bordure,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.ambre,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
