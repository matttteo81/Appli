import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Screen, ScreenHeader, ThemedText } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/typography';

/** Tout ce qu'on fait ensemble, regroupé au même endroit. */
const ACTIVITIES: {
  route: string;
  emoji: string;
  label: string;
  sub: string;
  color: string;
  dark?: boolean;
}[] = [
  { route: '/games', emoji: '🎮', label: 'Jeux à deux', sub: 'Quiz, préférences, tu préfères…', color: colors.prune },
  { route: '/ensemble', emoji: '🍿', label: 'Ciné à deux', sub: 'Un film synchronisé', color: colors.corail },
  { route: '/dessin', emoji: '✏️', label: 'Dessin partagé', sub: 'Une toile commune, en temps réel', color: colors.sauge, dark: true },
  { route: '/amour', emoji: '💞', label: 'Langages de l’amour', sub: 'Le test de couple', color: colors.ambre, dark: true },
  { route: '/playlist', emoji: '🎵', label: 'Playlist', sub: 'Vos chansons à vous', color: colors.prune },
];

export default function Activites() {
  const router = useRouter();
  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Activités" subtitle="À faire ensemble, même à distance 💛" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 120 }}>
        {ACTIVITIES.map((a) => (
          <Pressable key={a.route} onPress={() => router.push(a.route as never)}>
            <Card color={a.color}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Text style={{ fontSize: 34 }}>{a.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="title" color={a.dark ? colors.encre : colors.creme}>
                    {a.label}
                  </ThemedText>
                  <ThemedText variant="body" color={a.dark ? colors.encre : colors.creme} style={{ opacity: 0.85 }}>
                    {a.sub}
                  </ThemedText>
                </View>
                <Text style={{ fontSize: 22, color: a.dark ? colors.encre : colors.creme }}>›</Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}
