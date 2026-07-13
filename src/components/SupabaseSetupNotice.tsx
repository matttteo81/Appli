import React from 'react';
import { ScrollView, View } from 'react-native';
import { Screen, ThemedText, Card } from './ui';
import { colors } from '../theme/colors';
import { fonts, spacing } from '../theme/typography';
import { Text } from 'react-native';

/**
 * S'affiche tant que le fichier .env n'est pas rempli.
 * Guide l'utilisateur pour brancher Supabase.
 */
export function SupabaseSetupNotice() {
  return (
    <Screen background={colors.encre}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <ThemedText variant="display" color={colors.ambre}>
          Presque prêt 🌙
        </ThemedText>
        <ThemedText variant="body" color={colors.creme}>
          Il reste à connecter l'appli à ta base de données Supabase. C'est
          rapide :
        </ThemedText>

        <Card color={colors.encreDoux}>
          <Step n={1} text="Va sur supabase.com et crée un projet (gratuit)." />
          <Step
            n={2}
            text="Dans le SQL Editor, colle le contenu de supabase/schema.sql et clique sur Run."
          />
          <Step
            n={3}
            text="Ouvre Project Settings > API et copie l'URL du projet et la clé « anon public »."
          />
          <Step
            n={4}
            text="À la racine du projet, crée un fichier .env (copie .env.example) et colle tes deux valeurs."
          />
          <Step n={5} text="Relance l'app (appuie sur r dans le terminal Expo)." />
        </Card>

        <Card color={colors.encreDoux}>
          <ThemedText variant="label" color={colors.sauge}>
            .env
          </ThemedText>
          <Text
            style={{
              fontFamily: fonts.mono,
              color: colors.creme,
              fontSize: 13,
              marginTop: 6,
            }}
          >
            EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co{'\n'}
            EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: colors.ambre,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontFamily: fonts.bodyBold, color: colors.encre }}>
          {n}
        </Text>
      </View>
      <ThemedText variant="body" color={colors.creme} style={{ flex: 1 }}>
        {text}
      </ThemedText>
    </View>
  );
}
