import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
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
import type { Farm, FarmInventory, FarmResident } from '../../src/types/db';
import { ADULT_AT, FOODS, HATCH_AT, seasonNow, SPECIES_NAMES, stageForFeeds } from '../../src/lib/farmpixel';
import { fetchWeather, WeatherKind } from '../../src/lib/weather';

function computeNight(d = new Date()) {
  const h = d.getHours();
  return h < 7 || h >= 20;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
const SP_EMOJI: Record<string, string> = { hen: '🐔', cat: '🐱', dog: '🐶', rabbit: '🐰', pig: '🐷' };
function frDate2(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
function frAge(iso: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
  if (days === 0) return 'né aujourd’hui';
  if (days === 1) return '1 jour';
  if (days < 7) return `${days} jours`;
  if (days < 30) { const w = Math.floor(days / 7); return `${w} semaine${w > 1 ? 's' : ''}`; }
  if (days < 365) { const m = Math.floor(days / 30); return `${m} mois`; }
  const y = Math.floor(days / 365); return `${y} an${y > 1 ? 's' : ''}`;
}

/** Cœurs qui s'envolent quand on offre un régal à un animal. */
function Celebration() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [v]);
  const emojis = ['❤️', '💗', '✨', '💛', '🥰', '💕'];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {emojis.map((e, i) => {
        const ty = v.interpolate({ inputRange: [0, 1], outputRange: [0, -150 - i * 12] });
        const op = v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1, 0] });
        return (
          <Animated.Text key={i} style={{ position: 'absolute', left: `${28 + i * 8}%`, top: '56%', fontSize: 30, opacity: op, transform: [{ translateY: ty }] }}>
            {e}
          </Animated.Text>
        );
      })}
    </View>
  );
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
  const [weather, setWeather] = useState<WeatherKind>('clear');
  const season = seasonNow();
  const [registryOpen, setRegistryOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [marketPopup, setMarketPopup] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopTab, setShopTab] = useState<'buy' | 'bag'>('buy');
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [celebrate, setCelebrate] = useState(0); // incrémenté pour relancer l'animation
  const coins = farm?.coins ?? 0;

  const loadInventory = useCallback(async () => {
    if (!couple) return;
    const { data } = await supabase.from('farm_inventory').select('*').eq('couple_id', couple.id);
    const inv: Record<string, number> = {};
    (data as FarmInventory[] | null)?.forEach((r) => { if (r.qty > 0) inv[r.food_id] = r.qty; });
    setInventory(inv);
  }, [couple]);

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
      await supabase.rpc('pf_daily_login', { p_couple: couple.id }); // +1 pièce/jour
      const { data: open } = await supabase.rpc('pf_market_open', { p_couple: couple.id });
      setMarketOpen(!!open);
      if (open) { setMarketPopup(true); setTimeout(() => setMarketPopup(false), 3000); }
      await reload();
      await loadFedToday();
      await loadInventory();
      setLoading(false);
    })();
    const channel = supabase
      .channel(`farm2-${couple.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'farm', filter: `couple_id=eq.${couple.id}` }, () => reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'farm_residents', filter: `couple_id=eq.${couple.id}` }, () => reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'farm_inventory', filter: `couple_id=eq.${couple.id}` }, () => loadInventory())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [couple, reload, loadFedToday, loadInventory]);

  // Jour/nuit auto (rafraîchi chaque minute).
  useEffect(() => {
    const t = setInterval(() => setAutoNight(computeNight()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // Météo réelle de ta ville → météo de la ferme (il neige chez toi = il neige ici).
  useEffect(() => {
    if (profile?.city_lat == null || profile?.city_lng == null) return;
    let active = true;
    const load = async () => {
      const wx = await fetchWeather(profile.city_lat!, profile.city_lng!);
      if (active && wx) setWeather(wx.kind);
    };
    load();
    const t = setInterval(load, 15 * 60 * 1000);
    return () => { active = false; clearInterval(t); };
  }, [profile?.city_lat, profile?.city_lng]);

  const feeds = farm?.active_feeds ?? 0;
  const active = farm?.active_species
    ? { species: farm.active_species, feeds, name: farm.active_name, color: farm.active_color ?? 0 }
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

  const onBuy = async (foodId: string) => {
    if (!couple || busy) return;
    setBusy(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { error } = await supabase.rpc('pf_buy_food', { p_couple: couple.id, p_food: foodId });
      if (error) throw error;
      await reload();
      await loadInventory();
    } catch (e: any) {
      Alert.alert('Oups', e?.message ?? 'Achat impossible.');
    } finally {
      setBusy(false);
    }
  };

  const onGive = async (foodId: string) => {
    if (!couple || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc('pf_give_food', { p_couple: couple.id, p_food: foodId });
      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShopOpen(false);
      setCelebrate((c) => c + 1); // déclenche l'animation de régal
      await reload();
      await loadInventory();
    } catch (e: any) {
      Alert.alert('Hmm', e?.message ?? "Impossible de donner cet aliment.");
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
      <PixelFarm residents={residents} active={active} night={night} weather={weather} season={season} />

      {/* HUD haut */}
      <View style={styles.top} pointerEvents="box-none">
        <View style={{ gap: 8, alignItems: 'flex-start' }}>
          <View style={styles.coinPill}><Text style={styles.coinTxt}>🪙 {coins}</Text></View>
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
        </View>
        <View style={{ gap: 8 }}>
          <Pressable style={styles.moon} onPress={() => setOverride(override === null ? !autoNight : null)}>
            <Text style={{ fontSize: 16 }}>{night ? '🌙' : '☀️'}</Text>
          </Pressable>
          <Pressable style={styles.moon} onPress={() => setRegistryOpen(true)}>
            <Text style={{ fontSize: 16 }}>📅</Text>
          </Pressable>
        </View>
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

      {/* Bouton « Jour de marché » (bas droite, jours de marché uniquement) */}
      {marketOpen ? (
        <Pressable style={styles.market} onPress={() => { setShopTab('buy'); setShopOpen(true); }}>
          <Text style={styles.marketLbl}>Jour de marché</Text>
          <View style={styles.marketBtn}><Text style={{ fontSize: 26 }}>🧺</Text></View>
        </Pressable>
      ) : null}

      {/* Gros pop-up « Jour de marché » (3 s à l'arrivée) */}
      {marketPopup ? (
        <View style={styles.popupWrap} pointerEvents="none">
          <View style={styles.popup}>
            <Text style={{ fontSize: 44 }}>🧺</Text>
            <Text style={styles.popupTxt}>Jour de marché !</Text>
            <Text style={styles.popupSub}>Le marchand est passé 💛</Text>
          </View>
        </View>
      ) : null}

      {/* Régal : cœurs qui s'envolent */}
      {celebrate > 0 ? <Celebration key={celebrate} /> : null}

      {/* Boutique / Sac */}
      <Modal visible={shopOpen} transparent animationType="slide" onRequestClose={() => setShopOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShopOpen(false)} />
        <View style={styles.shopSheet}>
          <View style={styles.shopHead}>
            <Text style={styles.utitle}>🧺 Le marchand</Text>
            <View style={styles.coinPill}><Text style={styles.coinTxt}>🪙 {coins}</Text></View>
          </View>
          <View style={styles.tabs}>
            <Pressable onPress={() => setShopTab('buy')} style={[styles.tab, shopTab === 'buy' && styles.tabOn]}>
              <Text style={[styles.tabTxt, shopTab === 'buy' && styles.tabTxtOn]}>Boutique</Text>
            </Pressable>
            <Pressable onPress={() => setShopTab('bag')} style={[styles.tab, shopTab === 'bag' && styles.tabOn]}>
              <Text style={[styles.tabTxt, shopTab === 'bag' && styles.tabTxtOn]}>Mon sac</Text>
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 340 }}>
            {shopTab === 'buy' ? (
              FOODS.map((f) => (
                <View key={f.id} style={styles.foodRow}>
                  <Text style={{ fontSize: 24, width: 32 }}>{f.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uname}>{f.label}</Text>
                    <Text style={styles.ucond}>Pour : {f.speciesLabel}</Text>
                  </View>
                  <Pressable onPress={() => onBuy(f.id)} disabled={busy || coins < f.price} style={[styles.buyBtn, (busy || coins < f.price) && { opacity: 0.4 }]}>
                    <Text style={styles.buyTxt}>{f.price} 🪙</Text>
                  </Pressable>
                </View>
              ))
            ) : Object.keys(inventory).length === 0 ? (
              <Text style={[styles.ucond, { textAlign: 'center', paddingVertical: spacing.lg }]}>
                Ton sac est vide — passe à la boutique 🛒
              </Text>
            ) : (
              FOODS.filter((f) => inventory[f.id]).map((f) => (
                <View key={f.id} style={styles.foodRow}>
                  <Text style={{ fontSize: 24, width: 32 }}>{f.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uname}>{f.label}</Text>
                    <Text style={styles.ucond}>Pour : {f.speciesLabel}</Text>
                  </View>
                  <Text style={styles.qty}>x{inventory[f.id]}</Text>
                  <Pressable onPress={() => onGive(f.id)} disabled={busy} style={[styles.giveBtn, busy && { opacity: 0.4 }]}>
                    <Text style={styles.buyTxt}>Donner</Text>
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
          <Text style={styles.uhint}>Donner son plat préféré à un animal le rend heureux 💗 (et fait grandir l'œuf en cours).</Text>
        </View>
      </Modal>

      {/* Carnet des animaux */}
      <Modal visible={registryOpen} transparent animationType="fade" onRequestClose={() => setRegistryOpen(false)}>
        <Pressable style={styles.ubackdrop} onPress={() => setRegistryOpen(false)}>
          <View style={styles.usheet}>
            <Text style={styles.utitle}>📅 Nos animaux · {residents.length}</Text>
            <Text style={styles.usub}>Chaque compagnon, son prénom, sa naissance et son âge</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {active ? (
                <View style={styles.urow}>
                  <Text style={{ fontSize: 26 }}>🥚</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uname}>{active.name || 'En cours…'}</Text>
                    <Text style={styles.ucond}>En train de grandir 🌱</Text>
                  </View>
                </View>
              ) : null}
              {residents.length === 0 && !active ? (
                <Text style={[styles.ucond, { textAlign: 'center', paddingVertical: spacing.lg }]}>
                  Pas encore d'animal — nourrissez votre premier œuf 🥚
                </Text>
              ) : (
                residents.map((r) => (
                  <View key={r.id} style={styles.urow}>
                    <Text style={{ fontSize: 26 }}>{SP_EMOJI[r.species] || '🐾'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.uname}>{r.name || SPECIES_NAMES[r.species] || 'Petit'}{r.rare ? ' ⭐' : ''}</Text>
                      <Text style={styles.ucond}>Né(e) le {frDate2(r.born_at)} · {frAge(r.born_at)}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
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
  ubackdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  usheet: { backgroundColor: colors.creme, borderRadius: radius.xl, padding: spacing.lg, width: '100%', maxWidth: 380 },
  utitle: { fontFamily: fonts.displaySemiBold, fontSize: 20, color: colors.encre, textAlign: 'center' },
  usub: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.texteGris, textAlign: 'center', marginTop: 4, marginBottom: spacing.md },
  urow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.bordure },
  uname: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.encre },
  ucond: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.texteGris, marginTop: 1 },
  uhint: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.prune, textAlign: 'center', marginTop: spacing.md },
  coinPill: { backgroundColor: 'rgba(31,27,58,0.82)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.ambre },
  coinTxt: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.creme },
  market: { position: 'absolute', right: 16, bottom: 150, alignItems: 'center', gap: 4 },
  marketLbl: { backgroundColor: colors.ambre, color: colors.encre, fontFamily: fonts.bodyBold, fontSize: 11, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  marketBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(31,27,58,0.9)', borderWidth: 2, borderColor: colors.ambre, alignItems: 'center', justifyContent: 'center' },
  popupWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  popup: { backgroundColor: 'rgba(31,27,58,0.92)', borderRadius: radius.xl, paddingVertical: spacing.xl, paddingHorizontal: spacing.xxl, alignItems: 'center', borderWidth: 2, borderColor: colors.ambre },
  popupTxt: { fontFamily: fonts.displaySemiBold, fontSize: 26, color: colors.creme, marginTop: 6 },
  popupSub: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.cremeDoux, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  shopSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.creme, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  shopHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: 'center', backgroundColor: colors.cremeDoux },
  tabOn: { backgroundColor: colors.prune },
  tabTxt: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.texteGris },
  tabTxtOn: { color: colors.creme },
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.bordure },
  buyBtn: { backgroundColor: colors.sauge, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  giveBtn: { backgroundColor: colors.corail, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  buyTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.encre },
  qty: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.prune, marginHorizontal: 6 },
});
