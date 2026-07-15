import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Screen } from '../../src/components/ui';
import { PixelFarm } from '../../src/components/PixelFarm';
import { colors } from '../../src/theme/colors';
import { fonts, radius, spacing } from '../../src/theme/typography';
import { useAuth } from '../../src/store/auth';
import { supabase } from '../../src/lib/supabase';
import type { Farm, FarmResident } from '../../src/types/db';
import { ADULT_AT, HATCH_AT, stageForFeeds } from '../../src/lib/farmpixel';

function computeNight(d = new Date()) {
  const h = d.getHours();
  return h < 7 || h >= 20;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function FarmScreen() {
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);

  const [farm, setFarm] = useState<Farm | null>(null);
  const [residents, setResidents] = useState<FarmResident[]>([]);
  const [fedToday, setFedToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [autoNight, setAutoNight] = useState(computeNight());
  const [override, setOverride] = useState<boolean | null>(null);
  const night = override ?? autoNight;

  const reload = useCallback(async () => {
    if (!couple) return;
    const { data: f } = await supabase.from('farm').select('*').eq('couple_id', couple.id).maybeSingle();
    setFarm((f as Farm) ?? null);
    const { data: res } = await supabase.from('farm_residents').select('*').eq('couple_id', couple.id).order('born_at');
    setResidents((res as FarmResident[]) ?? []);
  }, [couple]);

  const loadFedToday = useCallback(async () => {
    if (!couple || !profile) return;
    const { data } = await supabase
      .from('farm_feeds')
      .select('feed_date')
      .eq('couple_id', couple.id)
      .eq('user_id', profile.id)
      .eq('feed_date', todayStr())
      .maybeSingle();
    setFedToday(!!data);
  }, [couple, profile]);

  useEffect(() => {
    if (!couple) return;
    (async () => {
      await supabase.rpc('pf_ensure', { p_couple: couple.id });
      await reload();
      await loadFedToday();
      setLoading(false);
    })();
    const channel = supabase
      .channel(`farm2-${couple.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'farm', filter: `couple_id=eq.${couple.id}` }, () => reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'farm_residents', filter: `couple_id=eq.${couple.id}` }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [couple, reload, loadFedToday]);

  // Jour/nuit auto (rafraîchi chaque minute).
  useEffect(() => {
    const t = setInterval(() => setAutoNight(computeNight()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const feeds = farm?.active_feeds ?? 0;
  const active = farm?.active_species
    ? { species: farm.active_species, feeds, name: farm.active_name }
    : null;
  const hatched = !!active && feeds >= HATCH_AT;
  const needsName = hatched && !farm?.active_name;
  const stage = active ? stageForFeeds(active.species, active.name, feeds) : null;

  const onFeed = async () => {
    if (!couple || busy) return;
    setBusy(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { error } = await supabase.rpc('pf_feed', { p_couple: couple.id });
      if (error) throw error;
      setFedToday(true);
      await reload();
    } catch (e: any) {
      Alert.alert('Oups', e?.message ?? "Impossible de nourrir.");
    } finally {
      setBusy(false);
    }
  };

  const onName = async () => {
    if (!couple || busy) return;
    const nm = nameDraft.trim();
    setBusy(true);
    try {
      const { error } = await supabase.rpc('pf_name', { p_couple: couple.id, p_name: nm });
      if (error) throw error;
      setNameDraft('');
      await reload();
    } catch (e: any) {
      Alert.alert('Oups', e?.message ?? 'Impossible.');
    } finally {
      setBusy(false);
    }
  };

  const onNewEgg = async () => {
    if (!couple || busy) return;
    setBusy(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { error } = await supabase.rpc('pf_new_egg', { p_couple: couple.id });
      if (error) throw error;
      await reload();
    } catch (e: any) {
      Alert.alert('Un peu de patience 🥚', e?.message ?? 'Réessaie plus tard.');
    } finally {
      setBusy(false);
    }
  };

  // Cooldown avant nouvel œuf
  const cooldownLeft = (() => {
    if (!farm?.last_grown_at) return 0;
    const ms = new Date(farm.last_grown_at).getTime() + 2 * 86400000 - Date.now();
    return Math.max(0, Math.ceil(ms / 86400000));
  })();

  if (loading) {
    return (
      <Screen background={colors.encre}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.ambre} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <PixelFarm residents={residents} active={active} night={night} />

      {/* HUD haut */}
      <View style={styles.top} pointerEvents="box-none">
        <View style={styles.chip}>
          <Text style={styles.chipStage}>{stage ? stage.label : `🏡 ${residents.length} animal${residents.length > 1 ? 'x' : ''}`}</Text>
          {stage ? (
            <>
              <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.round(stage.progress * 100)}%` }]} /></View>
              <Text style={styles.chipSub}>Jour {Math.min(stage.days, 15)}/15 · {residents.length} à la ferme</Text>
            </>
          ) : (
            <Text style={styles.chipSub}>Votre ferme s'agrandit 💛</Text>
          )}
        </View>
        <Pressable style={styles.moon} onPress={() => setOverride(override === null ? !autoNight : null)}>
          <Text style={{ fontSize: 16 }}>{night ? '🌙' : '☀️'}</Text>
        </Pressable>
      </View>

      {/* HUD bas */}
      <View style={styles.bottom} pointerEvents="box-none">
        {needsName ? (
          <View style={styles.card}>
            <Text style={styles.hint}>🐣 Il a éclos ! Comment allez-vous l'appeler ?</Text>
            <View style={styles.nameRow}>
              <TextInput
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder="Son prénom…"
                placeholderTextColor={colors.texteGris}
                maxLength={20}
                style={styles.nameInput}
              />
              <Pressable onPress={onName} style={styles.nameOk} disabled={busy}>
                <Text style={styles.nameOkTxt}>✔</Text>
              </Pressable>
            </View>
          </View>
        ) : active ? (
          <View style={styles.card}>
            <Text style={styles.hint}>
              {fedToday
                ? 'Déjà nourri aujourd\'hui 🌙 Revenez demain (ou l\'autre peut le nourrir).'
                : feeds < HATCH_AT
                  ? 'Nourrissez l\'œuf pour le faire éclore…'
                  : `Chaque jour, ${active.name || 'votre petit'} grandit un peu 🌱`}
            </Text>
            <Pressable onPress={onFeed} disabled={busy || fedToday} style={[styles.feed, (busy || fedToday) && { opacity: 0.5 }]}>
              {busy ? <ActivityIndicator color={colors.encre} /> : <Text style={styles.feedTxt}>🌾 Nourrir</Text>}
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.hint}>
              {cooldownLeft > 0
                ? `Un peu de repos… nouvel œuf dans ${cooldownLeft} jour${cooldownLeft > 1 ? 's' : ''} 🥚`
                : 'Envie d\'agrandir la famille ?'}
            </Text>
            <Pressable onPress={onNewEgg} disabled={busy || cooldownLeft > 0} style={[styles.egg, (busy || cooldownLeft > 0) && { opacity: 0.5 }]}>
              <Text style={styles.eggTxt}>🥚 Nouvel œuf</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 54, paddingHorizontal: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  chip: { backgroundColor: 'rgba(31,27,58,0.82)', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8, borderWidth: 1, borderColor: colors.pruneDoux },
  chipStage: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.creme },
  chipSub: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.cremeDoux, marginTop: 3 },
  bar: { width: 150, height: 7, borderRadius: 4, backgroundColor: colors.encre, overflow: 'hidden', marginTop: 6 },
  barFill: { height: '100%', backgroundColor: colors.ambre },
  moon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(31,27,58,0.82)', borderWidth: 1, borderColor: colors.pruneDoux, alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center', paddingHorizontal: spacing.lg },
  card: { alignItems: 'center', gap: 10, width: '100%' },
  hint: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.creme, textAlign: 'center', maxWidth: 320, backgroundColor: 'rgba(31,27,58,0.7)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.md, overflow: 'hidden' },
  feed: { backgroundColor: colors.ambre, borderRadius: radius.pill, paddingVertical: 16, paddingHorizontal: 40, alignItems: 'center', minWidth: 180 },
  feedTxt: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.encre },
  egg: { backgroundColor: colors.corail, borderRadius: radius.pill, paddingVertical: 15, paddingHorizontal: 30 },
  eggTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.creme },
  nameRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  nameInput: { backgroundColor: colors.creme, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.encre, width: 190, borderWidth: 2, borderColor: colors.ambre },
  nameOk: { backgroundColor: colors.ambre, borderRadius: radius.md, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  nameOkTxt: { fontSize: 20, color: colors.encre },
});
