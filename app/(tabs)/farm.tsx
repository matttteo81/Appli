import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
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
import type { FarmAnimal } from '../../src/types/db';
import { animalStage } from '../../src/lib/farm';

export default function FarmScreen() {
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);

  const [active, setActive] = useState<FarmAnimal | null>(null);
  const [herd, setHerd] = useState<FarmAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [reborn, setReborn] = useState(false);
  const bounce = useRef(new Animated.Value(0)).current;

  const refresh = useCallback(async () => {
    if (!couple) return;
    // Garantit qu'un animal est en cours d'élevage (en crée un au besoin).
    await supabase.rpc('ensure_farm', { p_couple: couple.id });
    const { data } = await supabase
      .from('farm_animals')
      .select('*')
      .eq('couple_id', couple.id)
      .order('born_at', { ascending: false });
    const rows = (data as FarmAnimal[]) ?? [];
    setActive(rows.find((a) => a.is_active) ?? null);
    setHerd(rows.filter((a) => !a.is_active));
    setLoading(false);
  }, [couple]);

  useEffect(() => {
    if (!couple) return;
    refresh();
    const channel = supabase
      .channel(`farm-${couple.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'farm_animals',
          filter: `couple_id=eq.${couple.id}`,
        },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [couple, refresh]);

  const stage = active ? animalStage(active) : null;

  const feed = async () => {
    if (!active || !profile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(bounce, {
        toValue: 1,
        duration: 130,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(bounce, { toValue: 0, useNativeDriver: true }),
    ]).start();
    // Optimiste.
    setActive((a) =>
      a ? { ...a, feed_count: a.feed_count + 1, last_fed_by: profile.id } : a,
    );
    await supabase.rpc('feed_animal', { p_animal: active.id });
  };

  const rebirth = async () => {
    if (!active) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setReborn(true);
    setTimeout(() => setReborn(false), 2600);
    const { error } = await supabase.rpc('farm_rebirth', { p_animal: active.id });
    if (error) {
      Alert.alert('Oups', error.message);
    }
    // Le temps réel rafraîchira l'écran (nouvel œuf + troupeau agrandi).
  };

  const scale = bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });

  const lastFedBy =
    active?.last_fed_by == null
      ? null
      : active.last_fed_by === profile?.id
        ? 'toi'
        : partner?.display_name ?? 'ta moitié';

  return (
    <Screen background={colors.encre}>
      <ScreenHeader title="Votre ferme" subtitle="Élevez vos animaux à deux 🌱" />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.ambre} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 140 }}
        >
          {/* Scène de l'animal en cours d'élevage */}
          <View style={styles.stage}>
            {stage ? (
              <Animated.Text style={[{ fontSize: stage.size }, { transform: [{ scale }] }]}>
                {reborn ? '✨' : stage.emoji}
              </Animated.Text>
            ) : null}
            <View style={styles.stageBadge}>
              <Text style={styles.stageBadgeText}>
                {reborn ? 'Une nouvelle vie ✨' : `Gen. ${active?.generation ?? 1} · ${stage?.label}`}
              </Text>
            </View>
          </View>

          {/* Progression */}
          <Card color={colors.encreDoux}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText variant="label" color={colors.cremeDoux}>
                NOURRI {active?.feed_count ?? 0} FOIS
              </ThemedText>
              {stage?.nextLabel ? (
                <ThemedText variant="label" color={colors.sauge}>
                  ENCORE {stage.remaining} POUR « {stage.nextLabel.toUpperCase()} »
                </ThemedText>
              ) : (
                <ThemedText variant="label" color={colors.sauge}>
                  ADULTE 🎉
                </ThemedText>
              )}
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round((stage?.progress ?? 0) * 100)}%` },
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

          {/* Action : nourrir ou faire renaître */}
          {stage?.isAdult ? (
            <>
              <Pressable
                onPress={rebirth}
                style={({ pressed }) => [
                  styles.rebirthBtn,
                  pressed && { transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text style={styles.rebirthText}>✨ Renaissance</Text>
              </Pressable>
              <ThemedText variant="body" color={colors.cremeDoux} center>
                {active?.species} est adulte ! Il rejoindra votre troupeau pour
                toujours, et un nouvel œuf éclôra.
              </ThemedText>
            </>
          ) : (
            <>
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
                {stage?.isEgg
                  ? "Nourrissez l'œuf à deux pour le faire éclore…"
                  : 'Chaque bouchée le fait grandir, pour vous deux, en temps réel.'}
              </ThemedText>
            </>
          )}

          {/* Le troupeau (animaux devenus adultes, gardés à jamais) */}
          {herd.length > 0 ? (
            <View style={styles.herdCard}>
              <ThemedText variant="label" color={colors.cremeDoux} style={{ marginBottom: spacing.sm }}>
                VOTRE TROUPEAU · {herd.length}
              </ThemedText>
              <View style={styles.herdGrid}>
                {herd.map((a) => (
                  <View key={a.id} style={styles.herdItem}>
                    <Text style={styles.herdEmoji}>{a.species}</Text>
                    <Text style={styles.herdGen}>gen.{a.generation}</Text>
                  </View>
                ))}
              </View>
              <ThemedText variant="body" color={colors.cremeDoux} style={{ marginTop: spacing.sm, opacity: 0.8 }}>
                Ici vivent tous les animaux que vous avez élevés ensemble. 💛
              </ThemedText>
            </View>
          ) : null}
        </ScrollView>
      )}
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
  rebirthBtn: {
    backgroundColor: colors.corail,
    borderRadius: radius.pill,
    paddingVertical: 18,
    alignItems: 'center',
  },
  rebirthText: {
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    color: colors.creme,
  },
  herdCard: {
    backgroundColor: colors.encreDoux,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  herdGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  herdItem: {
    alignItems: 'center',
    width: 56,
  },
  herdEmoji: { fontSize: 34 },
  herdGen: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    color: colors.cremeDoux,
    marginTop: 2,
  },
});
