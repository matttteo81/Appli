import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from './ui';
import { colors } from '../theme/colors';
import { fonts, radius, spacing } from '../theme/typography';
import { pushToPartner } from '../lib/push';
import { toast } from '../store/toast';
import type { Profile } from '../types/db';

const ASKED_KEY = 'fil_mood_asked_v1';
const DAY_MS = 24 * 60 * 60 * 1000;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * L'humeur de ta moitié sur l'accueil.
 *
 * Quand elle n'a pas (ou plus depuis 24 h) donné son humeur, un bouton permet
 * de la lui demander : elle reçoit une notification. Une seule demande par
 * jour, pour que ça reste une attention et pas une relance.
 */
export function PartnerMoodChip({
  me,
  partner,
}: {
  me: Profile | null;
  partner: Profile | null;
}) {
  const [asked, setAsked] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ASKED_KEY)
      .then((v) => setAsked(v === todayKey()))
      .catch(() => {});
  }, []);

  const updatedAt = partner?.mood_updated_at
    ? new Date(partner.mood_updated_at).getTime()
    : 0;
  const missing = !partner?.mood_emoji;
  const stale = missing || Date.now() - updatedAt > DAY_MS;

  const ask = async () => {
    if (!partner || !me || asked) return;
    setAsked(true);
    AsyncStorage.setItem(ASKED_KEY, todayKey()).catch(() => {});
    await pushToPartner(
      partner.id,
      `💭 ${me.display_name}`,
      'aimerait savoir comment tu te sens aujourd’hui',
      'mood',
    );
    toast(`Demandé à ${partner.display_name} 💛`);
  };

  return (
    <View style={styles.chip}>
      <Text style={styles.emoji}>{partner?.mood_emoji ?? '🌙'}</Text>
      <ThemedText variant="body" center>
        {partner?.mood_label ?? 'En attente…'}
      </ThemedText>
      <ThemedText variant="label" color={colors.texteGris}>
        {(partner?.display_name ?? 'ELLE/LUI').toUpperCase()}
      </ThemedText>
      {partner && stale ? (
        <Pressable
          onPress={ask}
          disabled={asked}
          hitSlop={8}
          style={[styles.ask, asked && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={`Demander son humeur à ${partner.display_name}`}
        >
          <Text style={styles.askText}>
            {asked ? 'Demandé ✓' : missing ? 'Lui demander' : 'Et aujourd’hui ?'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.cremeDoux,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  emoji: { fontSize: 34 },
  ask: {
    marginTop: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.ambre,
  },
  askText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.encre },
});
