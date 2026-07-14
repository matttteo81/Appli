import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Screen, ScreenHeader, ThemedText } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';
import { radius, spacing } from '../../src/theme/typography';
import { QuiGame } from '../../src/components/games/QuiGame';
import { KnowGame } from '../../src/components/games/KnowGame';
import { Q36Game } from '../../src/components/games/Q36Game';

type GameId = 'qui' | 'know' | 'q36';

const GAMES: { id: GameId; emoji: string; title: string; subtitle: string; color: string }[] = [
  { id: 'qui', emoji: '🤔', title: 'Qui de nous deux ?', subtitle: 'Votez, découvrez si vous êtes d’accord', color: colors.ambre },
  { id: 'know', emoji: '🧠', title: 'Me connais-tu ?', subtitle: 'Devine les réponses de l’autre', color: colors.corail },
  { id: 'q36', emoji: '💞', title: '36 questions', subtitle: 'Les questions pour se rapprocher', color: colors.sauge },
];

export default function Games() {
  const [active, setActive] = useState<GameId | null>(null);
  const current = GAMES.find((g) => g.id === active);

  return (
    <Screen>
      <ScreenHeader title="Jeux" subtitle="À faire à deux 💛" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        {GAMES.map((g) => (
          <Pressable key={g.id} onPress={() => setActive(g.id)} style={[styles.card, { backgroundColor: g.color }]}>
            <Text style={{ fontSize: 40 }}>{g.emoji}</Text>
            <View style={{ flex: 1 }}>
              <ThemedText variant="title" color={colors.encre}>{g.title}</ThemedText>
              <ThemedText variant="body" color={colors.encre} style={{ opacity: 0.8 }}>{g.subtitle}</ThemedText>
            </View>
            <Text style={{ fontSize: 22, color: colors.encre }}>›</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={active !== null} animationType="slide" onRequestClose={() => setActive(null)}>
        <Screen>
          <View style={styles.modalHead}>
            <ThemedText variant="displaySmall">{current?.title}</ThemedText>
            <Pressable onPress={() => setActive(null)}>
              <ThemedText variant="bodyMedium" color={colors.corail}>Fermer</ThemedText>
            </Pressable>
          </View>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={20}
          >
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, padding: spacing.lg }}
              keyboardShouldPersistTaps="handled"
            >
              {active === 'qui' && <QuiGame />}
              {active === 'know' && <KnowGame />}
              {active === 'q36' && <Q36Game />}
            </ScrollView>
          </KeyboardAvoidingView>
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
