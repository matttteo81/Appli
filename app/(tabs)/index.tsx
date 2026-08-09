import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, Card, ThemedText } from '../../src/components/ui';
import { TwinSky } from '../../src/components/TwinSky';
import { QuestionCard } from '../../src/components/QuestionCard';
import { CountdownsCard } from '../../src/components/CountdownsCard';
import { colors } from '../../src/theme/colors';
import { fonts, radius, spacing } from '../../src/theme/typography';
import { useAuth } from '../../src/store/auth';
import { distanceKm } from '../../src/lib/geo';
import { MOODS } from '../../src/lib/moods';
import { fetchWeather, Weather } from '../../src/lib/weather';
import { supabase } from '../../src/lib/supabase';
import { syncWidgets } from '../../src/lib/widgets';
import { greeting, wordOfTheDay } from '../../src/lib/sweetWords';
import { toast } from '../../src/store/toast';

/** Les espaces « à deux » présentés en grille compacte sur l'accueil. */
const NAV_TILES: {
  route: string;
  emoji: string;
  label: string;
  sub: string;
  color: string;
  dark?: boolean;
}[] = [
  { route: '/ensemble', emoji: '🍿', label: 'Ciné à deux', sub: 'Un film synchronisé', color: colors.prune },
  { route: '/wishlist', emoji: '✨', label: 'À faire ensemble', sub: 'Votre liste de rêves', color: colors.sauge, dark: true },
  { route: '/agenda', emoji: '📅', label: 'Notre agenda', sub: 'Dates & rappels', color: colors.ambre, dark: true },
  { route: '/notes', emoji: '💌', label: 'Petits mots', sub: 'Surprises scellées', color: colors.corail },
  { route: '/amour', emoji: '💞', label: 'Langages de l’amour', sub: 'Le test de couple', color: colors.prune },
  { route: '/journal', emoji: '📔', label: 'Notre journal', sub: 'Frise de souvenirs', color: colors.corail },
  { route: '/dessin', emoji: '✏️', label: 'Dessin partagé', sub: 'Toile en temps réel', color: colors.sauge, dark: true },
];

export default function Home() {
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const couple = useAuth((s) => s.couple);
  const updateCouple = useAuth((s) => s.updateCouple);
  const updateProfile = useAuth((s) => s.updateProfile);
  const router = useRouter();

  const [picker, setPicker] = useState<null | 'together'>(null);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [moodOpen, setMoodOpen] = useState(false);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [togetherUrl, setTogetherUrl] = useState<string | null>(null);
  const [myWeather, setMyWeather] = useState<Weather | null>(null);
  const [partnerWeather, setPartnerWeather] = useState<Weather | null>(null);
  const [streak, setStreak] = useState<number | null>(null);

  // Série (streak) : marque l'activité du jour et récupère le compteur.
  useEffect(() => {
    if (!couple?.id) return;
    (async () => {
      const { data } = await supabase.rpc('touch_streak', { p_couple: couple.id });
      if (data) setStreak((data as any).streak_count ?? null);
    })();
  }, [couple?.id]);

  // Alimente les widgets iOS (compte à rebours + jours ensemble + série).
  useEffect(() => {
    if (!couple) return;
    syncWidgets({
      reunionDate: couple.reunion_date,
      reunionLabel: 'Retrouvailles',
      togetherSince: couple.together_since,
      streak,
    });
  }, [couple?.reunion_date, couple?.together_since, streak]);

  // Météo de chacun (rafraîchie au montage et toutes les 15 min).
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (profile?.city_lat != null && profile?.city_lng != null) {
        const w = await fetchWeather(profile.city_lat, profile.city_lng);
        if (active) setMyWeather(w);
      }
      if (partner?.city_lat != null && partner?.city_lng != null) {
        const w = await fetchWeather(partner.city_lat, partner.city_lng);
        if (active) setPartnerWeather(w);
      }
    };
    load();
    const t = setInterval(load, 15 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [profile?.city_lat, profile?.city_lng, partner?.city_lat, partner?.city_lng]);

  // URL signée de la photo d'accueil.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!couple?.home_photo_path) {
        setBgUrl(null);
        return;
      }
      const { data } = await supabase.storage
        .from('photos')
        .createSignedUrl(couple.home_photo_path, 60 * 60);
      if (active) setBgUrl(data?.signedUrl ?? null);
    })();
    return () => {
      active = false;
    };
  }, [couple?.home_photo_path]);

  // URL signée de la photo « Ensemble depuis ».
  useEffect(() => {
    let active = true;
    (async () => {
      if (!couple?.together_photo_path) {
        setTogetherUrl(null);
        return;
      }
      const { data } = await supabase.storage
        .from('photos')
        .createSignedUrl(couple.together_photo_path, 60 * 60);
      if (active) setTogetherUrl(data?.signedUrl ?? null);
    })();
    return () => {
      active = false;
    };
  }, [couple?.together_photo_path]);

  const distance = useMemo(() => {
    if (
      profile?.city_lat != null &&
      profile?.city_lng != null &&
      partner?.city_lat != null &&
      partner?.city_lng != null
    ) {
      return distanceKm(profile.city_lat, profile.city_lng, partner.city_lat, partner.city_lng);
    }
    return null;
  }, [profile, partner]);

  const together = useElapsed(couple?.together_since ?? null);

  const openTogether = () => {
    setTempDate(couple?.together_since ? new Date(couple.together_since) : new Date());
    setPicker('together');
  };

  const saveDate = async () => {
    await updateCouple({ together_since: toISODate(tempDate) });
    setPicker(null);
  };

  const chooseMood = async (emoji: string, label: string) => {
    setMoodOpen(false);
    await updateProfile({
      mood_emoji: emoji,
      mood_label: label,
      mood_updated_at: new Date().toISOString(),
    });
  };

  const shareCode = async () => {
    if (!couple) return;
    await Share.share({
      message: `Rejoins-moi sur Fil 💛 Mon code de couple est : ${couple.invite_code}`,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.creme }}>
      {/* Fond photo plein écran */}
      {bgUrl ? (
        <>
          <Image source={{ uri: bgUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(27,27,58,0.35)' }]} />
        </>
      ) : null}

      <ScrollView contentContainerStyle={{ paddingBottom: 150 }}>
        <TwinSky
          me={{
            name: profile?.display_name ?? 'Moi',
            city: profile?.city_name ?? null,
            timezone: profile?.timezone ?? null,
            weather: myWeather,
          }}
          partner={{
            name: partner?.display_name ?? 'Ta moitié',
            city: partner?.city_name ?? null,
            timezone: partner?.timezone ?? null,
            weather: partnerWeather,
          }}
        />

        {streak && streak > 0 ? (
          <View style={styles.streak}>
            <Text style={{ fontSize: 18 }}>🔥</Text>
            <Text style={styles.streakText}>
              {streak} jour{streak > 1 ? 's' : ''} d'affilée sur Fil
            </Text>
          </View>
        ) : null}

        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          {/* Bonjour + mot du jour */}
          <View>
            <ThemedText variant="display" color={colors.encre}>
              {greeting()}{profile?.display_name ? `, ${profile.display_name}` : ''} 💛
            </ThemedText>
            <ThemedText variant="body" color={colors.texteGris} style={{ marginTop: 2 }}>
              {wordOfTheDay()}
            </ThemedText>
          </View>

          {/* Humeurs */}
          <Card>
            <ThemedText variant="label" color={colors.texteGris}>
              VOS HUMEURS
            </ThemedText>
            <View style={styles.moodRow}>
              <Pressable style={styles.moodChip} onPress={() => setMoodOpen(true)}>
                <Text style={styles.moodEmoji}>{profile?.mood_emoji ?? '＋'}</Text>
                <ThemedText variant="body" center>
                  {profile?.mood_label ?? 'Ton humeur'}
                </ThemedText>
                <ThemedText variant="label" color={colors.corail}>
                  TOI
                </ThemedText>
              </Pressable>
              <View style={styles.moodChip}>
                <Text style={styles.moodEmoji}>{partner?.mood_emoji ?? '🌙'}</Text>
                <ThemedText variant="body" center>
                  {partner?.mood_label ?? 'En attente…'}
                </ThemedText>
                <ThemedText variant="label" color={colors.texteGris}>
                  {(partner?.display_name ?? 'ELLE/LUI').toUpperCase()}
                </ThemedText>
              </View>
            </View>
          </Card>

          {/* Nos espaces à deux, en grille compacte */}
          <ThemedText variant="label" color={colors.texteGris} style={{ marginTop: spacing.xs }}>
            À DEUX
          </ThemedText>
          <View style={styles.tileGrid}>
            {NAV_TILES.map((t) => (
              <Pressable
                key={t.route}
                onPress={() => router.push(t.route as never)}
                style={[styles.tile, { backgroundColor: t.color }]}
              >
                <Text style={styles.tileEmoji}>{t.emoji}</Text>
                <View>
                  <ThemedText variant="bodyMedium" color={t.dark ? colors.encre : colors.creme}>
                    {t.label}
                  </ThemedText>
                  <ThemedText
                    variant="body"
                    color={t.dark ? colors.encre : colors.creme}
                    style={{ opacity: 0.8, fontSize: 13, lineHeight: 17, marginTop: 1 }}
                    numberOfLines={2}
                  >
                    {t.sub}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Question du jour */}
          <QuestionCard />

          {/* Invitation */}
          {!partner && couple && (
            <Card color={colors.prune}>
              <ThemedText variant="title" color={colors.creme}>
                Invite ta moitié 💌
              </ThemedText>
              <Pressable
                onPress={() => { Clipboard.setStringAsync(couple.invite_code); toast('Code copié 💛'); }}
                style={styles.codeBox}
              >
                <Text style={styles.codeText}>{couple.invite_code}</Text>
                <ThemedText variant="label" color={colors.texteGris}>
                  Touche pour copier
                </ThemedText>
              </Pressable>
              <Button title="Partager le code" onPress={shareCode} />
            </Card>
          )}

          {/* Ensemble depuis */}
          <View style={styles.togetherCard}>
            {togetherUrl ? (
              <>
                <Image source={{ uri: togetherUrl }} style={styles.togetherBg} contentFit="cover" transition={250} />
                <LinearGradient
                  colors={['rgba(27,27,58,0.15)', 'rgba(27,27,58,0.75)']}
                  style={StyleSheet.absoluteFill}
                />
              </>
            ) : null}
            <View style={styles.togetherContent}>
              <ThemedText variant="label" color={togetherUrl ? colors.cremeDoux : colors.texteGris}>
                ENSEMBLE DEPUIS
              </ThemedText>
              {couple?.together_since && together ? (
                <>
                  <View style={styles.countRow}>
                    <CountUnit value={together.years} label="ans" light={!!togetherUrl} />
                    <CountUnit value={together.months} label="mois" light={!!togetherUrl} />
                    <CountUnit value={together.days} label="jours" light={!!togetherUrl} />
                  </View>
                  <ThemedText
                    variant="body"
                    color={togetherUrl ? colors.cremeDoux : colors.texteGris}
                    style={{ marginTop: 6 }}
                  >
                    depuis le {formatDateFr(new Date(couple.together_since))}
                  </ThemedText>
                </>
              ) : (
                <ThemedText
                  variant="body"
                  color={togetherUrl ? colors.cremeDoux : colors.texteGris}
                  style={{ marginTop: 6 }}
                >
                  Réglez la date de votre mise en couple 💞
                </ThemedText>
              )}
              <Pressable onPress={openTogether} style={{ marginTop: spacing.sm }}>
                <ThemedText variant="bodyMedium" color={colors.corail}>
                  {couple?.together_since ? 'Modifier la date' : 'Choisir la date'}
                </ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Distance */}
          <Card>
            <ThemedText variant="label" color={colors.texteGris}>
              DISTANCE ENTRE VOUS
            </ThemedText>
            {distance != null ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                <Text style={styles.bigNumber}>{distance.toLocaleString('fr-FR')}</Text>
                <Text style={styles.unit}>km</Text>
              </View>
            ) : (
              <ThemedText variant="body" color={colors.texteGris} style={{ marginTop: 6 }}>
                Choisissez chacun votre ville (onglet Carte 🗺️).
              </ThemedText>
            )}
          </Card>

          {/* Comptes à rebours multiples */}
          <CountdownsCard />

          {/* Paramètres (page dédiée) */}
          <Pressable onPress={() => router.push('/parametres')}>
            <Card>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="bodyMedium">Paramètres</ThemedText>
                  <ThemedText variant="body" color={colors.texteGris}>
                    Photos, Face ID, confidentialité, compte…
                  </ThemedText>
                </View>
                <Text style={{ fontSize: 22, color: colors.texteGris }}>›</Text>
              </View>
            </Card>
          </Pressable>
        </View>
      </ScrollView>

      {/* Sélecteur d'humeur */}
      <Modal visible={moodOpen} transparent animationType="slide" onRequestClose={() => setMoodOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMoodOpen(false)} />
        <View style={styles.sheet}>
          <ThemedText variant="title" center>
            Ton humeur du moment
          </ThemedText>
          <View style={styles.moodGrid}>
            {MOODS.map((m) => (
              <Pressable key={m.label} style={styles.moodOption} onPress={() => chooseMood(m.emoji, m.label)}>
                <Text style={{ fontSize: 32 }}>{m.emoji}</Text>
                <ThemedText variant="label" center color={colors.texteGris}>
                  {m.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* Sélecteur de date */}
      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPicker(null)} />
        <View style={styles.sheet}>
          <ThemedText variant="title" center>
            Ensemble depuis le…
          </ThemedText>
          <View style={{ alignItems: 'center' }}>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              maximumDate={new Date()}
              onChange={(_e, d) => d && setTempDate(d)}
            />
          </View>
          <Button title="Enregistrer" onPress={saveDate} />
        </View>
      </Modal>
    </View>
  );
}

function CountUnit({
  value,
  label,
  light,
}: {
  value: number;
  label: string;
  light?: boolean;
}) {
  return (
    <View style={styles.countUnit}>
      <Text style={[styles.countValue, light && { color: colors.creme }]}>
        {String(value).padStart(2, '0')}
      </Text>
      <Text style={[styles.countLabel, light && { color: colors.cremeDoux }]}>
        {label}
      </Text>
    </View>
  );
}

/** Durée écoulée en années / mois / jours depuis une date. */
function useElapsed(dateStr: string | null) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);
  if (!dateStr) return null;
  const start = new Date(dateStr);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) };
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function formatDateFr(d: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

const styles = StyleSheet.create({
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.cremeDoux,
    borderRadius: radius.pill,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.ambre,
  },
  streakText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.encre },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  tile: {
    width: '48%',
    minHeight: 116,
    borderRadius: radius.lg,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  tileEmoji: { fontSize: 30 },
  togetherCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.creme,
    minHeight: 120,
  },
  togetherBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  togetherContent: { padding: spacing.lg },
  moodRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  moodChip: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.cremeDoux,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  moodEmoji: { fontSize: 34 },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  moodOption: { width: '22%', alignItems: 'center', gap: 4, paddingVertical: spacing.sm },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  codeBox: {
    backgroundColor: colors.encreDoux,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  codeText: { fontFamily: fonts.monoMedium, fontSize: 34, letterSpacing: 6, color: colors.ambre },
  bigNumber: { fontFamily: fonts.monoMedium, fontSize: 44, color: colors.encre },
  unit: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.texteGris, marginBottom: 10 },
  countRow: { flexDirection: 'row', gap: spacing.md, marginTop: 8 },
  countUnit: { alignItems: 'center' },
  countValue: { fontFamily: fonts.monoMedium, fontSize: 36, color: colors.prune },
  countLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.texteGris },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.creme,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: spacing.md,
  },
});
