import React, { useMemo, useState } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, Card, ThemedText } from '../../src/components/ui';
import { TwinSky } from '../../src/components/TwinSky';
import { colors } from '../../src/theme/colors';
import { fonts, radius, spacing } from '../../src/theme/typography';
import { useAuth } from '../../src/store/auth';
import { distanceKm } from '../../src/lib/geo';

export default function Home() {
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const couple = useAuth((s) => s.couple);
  const updateCouple = useAuth((s) => s.updateCouple);
  const signOut = useAuth((s) => s.signOut);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(
    couple?.reunion_date ? new Date(couple.reunion_date) : defaultReunion(),
  );

  const distance = useMemo(() => {
    if (
      profile?.city_lat != null &&
      profile?.city_lng != null &&
      partner?.city_lat != null &&
      partner?.city_lng != null
    ) {
      return distanceKm(
        profile.city_lat,
        profile.city_lng,
        partner.city_lat,
        partner.city_lng,
      );
    }
    return null;
  }, [profile, partner]);

  const countdown = useCountdown(couple?.reunion_date ?? null);

  const saveDate = async () => {
    await updateCouple({ reunion_date: tempDate.toISOString() });
    setPickerOpen(false);
  };

  const shareCode = async () => {
    if (!couple) return;
    await Share.share({
      message: `Rejoins-moi sur Fil 💛 Mon code de couple est : ${couple.invite_code}`,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.creme }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
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
          {/* Bannière d'invitation tant que la moitié n'a pas rejoint */}
          {!partner && couple && (
            <Card color={colors.prune}>
              <ThemedText variant="title" color={colors.creme}>
                Invite ta moitié 💌
              </ThemedText>
              <ThemedText
                variant="body"
                color={colors.cremeDoux}
                style={{ marginTop: 4 }}
              >
                Partage ce code pour vous relier :
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

          {/* Distance */}
          <Card>
            <ThemedText variant="label" color={colors.texteGris}>
              DISTANCE ENTRE VOUS
            </ThemedText>
            {distance != null ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                <Text style={styles.bigNumber}>
                  {distance.toLocaleString('fr-FR')}
                </Text>
                <Text style={styles.unit}>km</Text>
              </View>
            ) : (
              <ThemedText variant="body" color={colors.texteGris} style={{ marginTop: 6 }}>
                Choisissez chacun votre ville dans l'onglet Carte 🗺️ pour voir
                la distance.
              </ThemedText>
            )}
          </Card>

          {/* Compte à rebours */}
          <Card>
            <ThemedText variant="label" color={colors.texteGris}>
              PROCHAINES RETROUVAILLES
            </ThemedText>
            {couple?.reunion_date && countdown ? (
              <View style={{ marginTop: 8 }}>
                <View style={styles.countRow}>
                  <CountUnit value={countdown.days} label="jours" />
                  <CountUnit value={countdown.hours} label="heures" />
                  <CountUnit value={countdown.minutes} label="min" />
                </View>
                <ThemedText
                  variant="body"
                  color={colors.texteGris}
                  style={{ marginTop: 8 }}
                >
                  {formatDateFr(new Date(couple.reunion_date))}
                </ThemedText>
              </View>
            ) : (
              <ThemedText variant="body" color={colors.texteGris} style={{ marginTop: 6 }}>
                Aucune date fixée pour l'instant.
              </ThemedText>
            )}
            <Pressable
              onPress={() => {
                setTempDate(
                  couple?.reunion_date
                    ? new Date(couple.reunion_date)
                    : defaultReunion(),
                );
                setPickerOpen(true);
              }}
              style={{ marginTop: spacing.md }}
            >
              <ThemedText variant="bodyMedium" color={colors.corail}>
                {couple?.reunion_date ? 'Modifier la date' : 'Choisir une date'}
              </ThemedText>
            </Pressable>
          </Card>

          <Pressable onPress={signOut} style={{ alignItems: 'center', marginTop: spacing.md }}>
            <ThemedText variant="body" color={colors.texteGris}>
              Se déconnecter
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      {/* Sélecteur de date */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)} />
        <View style={styles.sheet}>
          <ThemedText variant="title" center>
            Date des retrouvailles
          </ThemedText>
          <View style={{ alignItems: 'center' }}>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={new Date()}
              onChange={(_e, d) => {
                if (d) setTempDate(d);
              }}
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

/** Compte à rebours (jours/heures/minutes) recalculé chaque minute. */
function useCountdown(dateStr: string | null) {
  const [now, setNow] = useState(Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(t);
  }, []);
  if (!dateStr) return null;
  const target = new Date(dateStr).getTime();
  let diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  diff -= days * 86400000;
  const hours = Math.floor(diff / 3600000);
  diff -= hours * 3600000;
  const minutes = Math.floor(diff / 60000);
  return { days, hours, minutes };
}

function defaultReunion(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d;
}

function formatDateFr(d: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

const styles = StyleSheet.create({
  codeBox: {
    backgroundColor: colors.encreDoux,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  codeText: {
    fontFamily: fonts.monoMedium,
    fontSize: 34,
    letterSpacing: 6,
    color: colors.ambre,
  },
  bigNumber: {
    fontFamily: fonts.monoMedium,
    fontSize: 44,
    color: colors.encre,
  },
  unit: {
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
    color: colors.texteGris,
    marginBottom: 10,
  },
  countRow: { flexDirection: 'row', gap: spacing.md },
  countUnit: { alignItems: 'center' },
  countValue: {
    fontFamily: fonts.monoMedium,
    fontSize: 40,
    color: colors.prune,
  },
  countLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.texteGris,
  },
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
