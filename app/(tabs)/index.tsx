import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { decode } from 'base64-arraybuffer';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, Card, ThemedText } from '../../src/components/ui';
import { TwinSky } from '../../src/components/TwinSky';
import { colors } from '../../src/theme/colors';
import { fonts, radius, spacing } from '../../src/theme/typography';
import { useAuth } from '../../src/store/auth';
import { distanceKm } from '../../src/lib/geo';
import { MOODS } from '../../src/lib/moods';
import { supabase } from '../../src/lib/supabase';

export default function Home() {
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const couple = useAuth((s) => s.couple);
  const updateCouple = useAuth((s) => s.updateCouple);
  const updateProfile = useAuth((s) => s.updateProfile);
  const signOut = useAuth((s) => s.signOut);

  const [picker, setPicker] = useState<null | 'reunion' | 'together'>(null);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [moodOpen, setMoodOpen] = useState(false);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [uploadingBg, setUploadingBg] = useState(false);

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

  const reunionCd = useCountdown(couple?.reunion_date ?? null);
  const together = useElapsed(couple?.together_since ?? null);

  const openDate = (which: 'reunion' | 'together') => {
    const current =
      which === 'reunion'
        ? couple?.reunion_date
          ? new Date(couple.reunion_date)
          : plusDays(30)
        : couple?.together_since
          ? new Date(couple.together_since)
          : new Date();
    setTempDate(current);
    setPicker(which);
  };

  const saveDate = async () => {
    if (picker === 'reunion') {
      await updateCouple({ reunion_date: tempDate.toISOString() });
    } else if (picker === 'together') {
      await updateCouple({ together_since: toISODate(tempDate) });
    }
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

  const changeBackground = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Accès aux photos refusé', 'Autorise l’accès dans les réglages.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });
    if (res.canceled || !res.assets[0]?.base64 || !couple) return;
    setUploadingBg(true);
    try {
      const ext = (res.assets[0].uri.split('.').pop() || 'jpg').toLowerCase();
      const path = `${couple.id}/home-${Date.now()}.${ext === 'png' ? 'png' : 'jpg'}`;
      const { error } = await supabase.storage
        .from('photos')
        .upload(path, decode(res.assets[0].base64!), {
          contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
        });
      if (error) throw error;
      await updateCouple({ home_photo_path: path });
    } catch (e: any) {
      Alert.alert('Oups', e?.message ?? 'Envoi impossible.');
    } finally {
      setUploadingBg(false);
    }
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
          }}
          partner={{
            name: partner?.display_name ?? 'Ta moitié',
            city: partner?.city_name ?? null,
            timezone: partner?.timezone ?? null,
          }}
        />

        <View style={{ padding: spacing.lg, gap: spacing.md }}>
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

          {/* Invitation */}
          {!partner && couple && (
            <Card color={colors.prune}>
              <ThemedText variant="title" color={colors.creme}>
                Invite ta moitié 💌
              </ThemedText>
              <Pressable
                onPress={() => Clipboard.setStringAsync(couple.invite_code)}
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
          <Card>
            <ThemedText variant="label" color={colors.texteGris}>
              ENSEMBLE DEPUIS
            </ThemedText>
            {couple?.together_since && together ? (
              <>
                <View style={styles.countRow}>
                  <CountUnit value={together.years} label="ans" />
                  <CountUnit value={together.months} label="mois" />
                  <CountUnit value={together.days} label="jours" />
                </View>
                <ThemedText variant="body" color={colors.texteGris} style={{ marginTop: 6 }}>
                  depuis le {formatDateFr(new Date(couple.together_since))}
                </ThemedText>
              </>
            ) : (
              <ThemedText variant="body" color={colors.texteGris} style={{ marginTop: 6 }}>
                Réglez la date de votre mise en couple 💞
              </ThemedText>
            )}
            <Pressable onPress={() => openDate('together')} style={{ marginTop: spacing.sm }}>
              <ThemedText variant="bodyMedium" color={colors.corail}>
                {couple?.together_since ? 'Modifier la date' : 'Choisir la date'}
              </ThemedText>
            </Pressable>
          </Card>

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

          {/* Retrouvailles */}
          <Card>
            <ThemedText variant="label" color={colors.texteGris}>
              PROCHAINES RETROUVAILLES
            </ThemedText>
            {couple?.reunion_date && reunionCd ? (
              <>
                <View style={styles.countRow}>
                  <CountUnit value={reunionCd.days} label="jours" />
                  <CountUnit value={reunionCd.hours} label="heures" />
                  <CountUnit value={reunionCd.minutes} label="min" />
                </View>
                <ThemedText variant="body" color={colors.texteGris} style={{ marginTop: 8 }}>
                  {formatDateFr(new Date(couple.reunion_date))}
                </ThemedText>
              </>
            ) : (
              <ThemedText variant="body" color={colors.texteGris} style={{ marginTop: 6 }}>
                Aucune date fixée.
              </ThemedText>
            )}
            <Pressable onPress={() => openDate('reunion')} style={{ marginTop: spacing.md }}>
              <ThemedText variant="bodyMedium" color={colors.corail}>
                {couple?.reunion_date ? 'Modifier la date' : 'Choisir une date'}
              </ThemedText>
            </Pressable>
          </Card>

          <Button
            title={uploadingBg ? 'Envoi…' : '🖼️ Changer la photo d’accueil'}
            variant="secondary"
            onPress={changeBackground}
            loading={uploadingBg}
          />

          <Pressable onPress={signOut} style={{ alignItems: 'center', marginTop: spacing.sm }}>
            <ThemedText variant="body" color={bgUrl ? colors.creme : colors.texteGris}>
              Se déconnecter
            </ThemedText>
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
            {picker === 'reunion' ? 'Date des retrouvailles' : 'Ensemble depuis le…'}
          </ThemedText>
          <View style={{ alignItems: 'center' }}>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              maximumDate={picker === 'together' ? new Date() : undefined}
              minimumDate={picker === 'reunion' ? new Date() : undefined}
              onChange={(_e, d) => d && setTempDate(d)}
            />
          </View>
          <Button title="Enregistrer" onPress={saveDate} />
        </View>
      </Modal>
    </View>
  );
}

function CountUnit({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.countUnit}>
      <Text style={styles.countValue}>{String(value).padStart(2, '0')}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

function useCountdown(dateStr: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  if (!dateStr) return null;
  let diff = Math.max(0, new Date(dateStr).getTime() - now);
  const days = Math.floor(diff / 86400000);
  diff -= days * 86400000;
  const hours = Math.floor(diff / 3600000);
  diff -= hours * 3600000;
  const minutes = Math.floor(diff / 60000);
  return { days, hours, minutes };
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

function plusDays(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
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
