import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, ThemedText } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';
import { radius, spacing } from '../../src/theme/typography';
import { useAuth } from '../../src/store/auth';
import { supabase } from '../../src/lib/supabase';
import {
  interestLabel,
  languageFlag,
  languageName,
  levelDots,
  levelLabel,
} from '../../src/lib/languages';
import type { Profile } from '../../src/types/db';

export default function PartnerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useAuth((s) => s.profile);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      setPartner((data as Profile) ?? null);
      setLoading(false);
    })();
  }, [id]);

  const startChat = async () => {
    if (!partner || !me) return;
    setStarting(true);
    try {
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        p_other: partner.id,
      });
      if (error || !data) return;
      router.replace({
        pathname: '/chat/[id]',
        params: {
          id: data as string,
          name: partner.display_name,
          emoji: partner.avatar_emoji,
          otherId: partner.id,
        },
      });
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.prune} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!partner) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <ThemedText variant="title">Profil introuvable</ThemedText>
          <Button title="Retour" variant="ghost" onPress={() => router.back()} style={{ marginTop: spacing.md }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <ThemedText style={{ fontSize: 26 }}>‹</ThemedText>
      </Pressable>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <ThemedText style={{ fontSize: 48 }}>{partner.avatar_emoji}</ThemedText>
          </View>
          <ThemedText variant="display" color={colors.encre} center style={{ marginTop: spacing.sm }}>
            {partner.display_name}
          </ThemedText>
          {partner.city_name ? (
            <ThemedText variant="body" color={colors.texteGris} center>
              📍 {partner.city_name}
              {partner.country_code ? `, ${partner.country_code}` : ''}
            </ThemedText>
          ) : null}
        </View>

        {partner.bio ? (
          <Card style={{ marginTop: spacing.lg }}>
            <ThemedText variant="body" color={colors.texteSombre}>
              {partner.bio}
            </ThemedText>
          </Card>
        ) : null}

        <ThemedText variant="label" color={colors.prune} style={styles.section}>
          PARLE COURAMMENT
        </ThemedText>
        <View style={styles.chips}>
          {partner.native_langs.map((c) => (
            <View key={c} style={styles.langChip}>
              <ThemedText variant="bodyMedium" color={colors.encre}>
                {languageFlag(c)} {languageName(c)}
              </ThemedText>
            </View>
          ))}
        </View>

        <ThemedText variant="label" color={colors.prune} style={styles.section}>
          APPREND
        </ThemedText>
        <View style={{ gap: spacing.sm }}>
          {partner.learning_langs.map((l) => (
            <View key={l.code} style={styles.learnRow}>
              <ThemedText variant="bodyMedium" color={colors.texteSombre}>
                {languageFlag(l.code)} {languageName(l.code)}
              </ThemedText>
              <ThemedText variant="body" color={colors.texteGris}>
                {levelDots(l.level)} {levelLabel(l.level)}
              </ThemedText>
            </View>
          ))}
        </View>

        {partner.interests.length > 0 ? (
          <>
            <ThemedText variant="label" color={colors.prune} style={styles.section}>
              CENTRES D'INTÉRÊT
            </ThemedText>
            <View style={styles.chips}>
              {partner.interests.map((k) => (
                <View key={k} style={styles.interestChip}>
                  <ThemedText variant="body" color={colors.encre}>
                    {interestLabel(k)}
                  </ThemedText>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.cta}>
        <Button
          title={starting ? 'Ouverture…' : '💬 Envoyer un message'}
          onPress={startChat}
          loading={starting}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.creme },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  back: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  hero: { alignItems: 'center' },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.cremeDoux,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { marginTop: spacing.lg, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  langChip: {
    backgroundColor: colors.ambre,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  interestChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  learnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  cta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: colors.creme,
    borderTopWidth: 1,
    borderTopColor: colors.bordure,
  },
});
