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
import { PrefereGame } from '../../src/components/games/PrefereGame';
import { TruthLieGame } from '../../src/components/games/TruthLieGame';
import { DrawGuessGame } from '../../src/components/games/DrawGuessGame';

type GameId = 'draw' | 'prefere' | 'truthlie' | 'qui' | 'know' | 'q36';

type Game = { id: GameId; emoji: string; title: string; subtitle: string; color: string };

// Le jeu de dessin en direct, à part.
const CREATIVE_GAMES: Game[] = [
  { id: 'draw', emoji: '🎨', title: 'Dessine & devine', subtitle: 'L’un dessine, l’autre devine en direct', color: colors.ambre },
];

// Tous les jeux de questions / quiz, regroupés.
const QUIZ_GAMES: Game[] = [
  { id: 'prefere', emoji: '🤔', title: 'Tu préfères ?', subtitle: 'Des dilemmes, on compare vos choix', color: colors.corail },
  { id: 'truthlie', emoji: '🎭', title: '2 vérités, 1 mensonge', subtitle: 'Devine l’intrus de l’autre', color: colors.sauge },
  { id: 'qui', emoji: '🙋', title: 'Qui de nous deux ?', subtitle: 'Votez, découvrez si vous êtes d’accord', color: colors.ambre },
  { id: 'know', emoji: '🧠', title: 'Me connais-tu ?', subtitle: 'Devine les réponses de l’autre', color: colors.corail },
  { id: 'q36', emoji: '💞', title: '36 questions', subtitle: 'Les questions pour se rapprocher', color: colors.sauge },
];

const GAMES: Game[] = [...CREATIVE_GAMES, ...QUIZ_GAMES];

export default function Games() {
  const [active, setActive] = useState<GameId | null>(null);
  const current = GAMES.find((g) => g.id === active);

  return (
    <Screen>
      <ScreenHeader title="Jeux" subtitle="À faire à deux 💛" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}>
        <ThemedText variant="label" color={colors.texteGris} style={styles.section}>
          DESSIN À DEUX
        </ThemedText>
        {CREATIVE_GAMES.map((g) => (
          <GameCard key={g.id} game={g} onPress={() => setActive(g.id)} />
        ))}

        <ThemedText variant="label" color={colors.texteGris} style={[styles.section, { marginTop: spacing.lg }]}>
          QUIZ & QUESTIONS
        </ThemedText>
        {QUIZ_GAMES.map((g) => (
          <GameCard key={g.id} game={g} onPress={() => setActive(g.id)} />
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
            {active === 'draw' ? (
              // Le jeu de dessin gère sa propre toile plein écran (pas de scroll).
              <View style={{ flex: 1, padding: spacing.lg }}>
                <DrawGuessGame />
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={{ flexGrow: 1, padding: spacing.lg }}
                keyboardShouldPersistTaps="handled"
              >
                {active === 'prefere' && <PrefereGame />}
                {active === 'truthlie' && <TruthLieGame />}
                {active === 'qui' && <QuiGame />}
                {active === 'know' && <KnowGame />}
                {active === 'q36' && <Q36Game />}
              </ScrollView>
            )}
          </KeyboardAvoidingView>
        </Screen>
      </Modal>
    </Screen>
  );
}

/** Une carte de jeu (emoji + titre + sous-titre). */
function GameCard({ game, onPress }: { game: Game; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: game.color }]}>
      <Text style={{ fontSize: 40 }}>{game.emoji}</Text>
      <View style={{ flex: 1 }}>
        <ThemedText variant="title" color={colors.encre}>{game.title}</ThemedText>
        <ThemedText variant="body" color={colors.encre} style={{ opacity: 0.8 }}>{game.subtitle}</ThemedText>
      </View>
      <Text style={{ fontSize: 22, color: colors.encre }}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.xs, marginLeft: spacing.xs },
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
