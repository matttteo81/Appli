import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Card, Screen, ScreenHeader, ThemedText } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';
import { fonts, radius, spacing } from '../../src/theme/typography';
import { useAuth } from '../../src/store/auth';
import { supabase } from '../../src/lib/supabase';
import type { Pet } from '../../src/types/db';
import { stageForCount } from '../../src/lib/pet';

export default function PetScreen() {
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const [pet, setPet] = useState<Pet | null>(null);
  const bounce = useRef(new Animated.Value(0)).current;

  // Chargement + temps réel de l'animal (une seule ligne par couple).
  useEffect(() => {
    if (!couple) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from('pets')
        .select('*')
        .eq('couple_id', couple.id)
        .maybeSingle();
      if (active) setPet((data as Pet) ?? { couple_id: couple.id, feed_count: 0 } as Pet);
    };
    load();
    const channel = supabase
      .channel(`pet-${couple.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pets',
          filter: `couple_id=eq.${couple.id}`,
        },
        (payload) => setPet(payload.new as Pet),
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [couple]);

  const info = stageForCount(pet?.feed_count ?? 0);

  const feed = async () => {
    if (!couple || !profile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(bounce, {
        toValue: 1,
        duration: 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(bounce, { toValue: 0, useNativeDriver: true }),
    ]).start();

    // Mise à jour optimiste immédiate.
    setPet((p) =>
      p ? { ...p, feed_count: p.feed_count + 1 } : p,
    );
    await supabase.rpc('feed_pet', {
      p_couple: couple.id,
      p_user: profile.id,
    });
  };

  const scale = bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });

  const lastFedBy =
    pet?.last_fed_by == null
      ? null
      : pet.last_fed_by === profile?.id
        ? 'toi'
        : partner?.display_name ?? 'ta moitié';

  return (
    <Screen background={colors.encre}>
      <ScreenHeader title="Votre oiseau" subtitle="Nourrissez-le à deux 🌱" />
      <View style={{ flex: 1, padding: spacing.lg, gap: spacing.lg }}>
        <View style={styles.stage}>
          <Animated.Text style={[styles.bird, { transform: [{ scale }] }]}>
            {info.emoji}
          </Animated.Text>
          <View style={styles.stageBadge}>
            <Text style={styles.stageBadgeText}>{info.label}</Text>
          </View>
        </View>

        <Card color={colors.encreDoux}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ThemedText variant="label" color={colors.cremeDoux}>
              NOURRI {pet?.feed_count ?? 0} FOIS
            </ThemedText>
            {info.next ? (
              <ThemedText variant="label" color={colors.sauge}>
                ENCORE {info.remaining} POUR « {info.next.label.toUpperCase()} »
              </ThemedText>
            ) : (
              <ThemedText variant="label" color={colors.sauge}>
                STADE MAXIMAL 🎉
              </ThemedText>
            )}
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(info.progress * 100)}%` },
              ]}
            />
          </View>
          {lastFedBy ? (
            <ThemedText
              variant="body"
              color={colors.cremeDoux}
              style={{ marginTop: spacing.sm }}
            >
              Dernière fois nourri par {lastFedBy}.
            </ThemedText>
          ) : null}
        </Card>

        <Pressable
          onPress={feed}
          style={({ pressed }) => [
            styles.feedBtn,
            pressed && { transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={styles.feedText}>🌾 Nourrir</Text>
        </Pressable>

        <ThemedText variant="body" color={colors.cremeDoux} center>
          Chaque fois que l'un de vous le nourrit, l'oiseau grandit pour vous
          deux, en temps réel.
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: {
    backgroundColor: colors.prune,
    borderRadius: radius.xl,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bird: { fontSize: 120 },
  stageBadge: {
    position: 'absolute',
    bottom: 16,
    backgroundColor: colors.ambre,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  stageBadgeText: {
    fontFamily: fonts.bodySemiBold,
    color: colors.encre,
    fontSize: 14,
  },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(251,246,239,0.2)',
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: colors.sauge,
  },
  feedBtn: {
    backgroundColor: colors.ambre,
    borderRadius: radius.pill,
    paddingVertical: 18,
    alignItems: 'center',
  },
  feedText: {
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    color: colors.encre,
  },
});
