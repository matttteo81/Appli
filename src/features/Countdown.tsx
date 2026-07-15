/**
 * Compte à rebours vers la prochaine date de retrouvailles.
 * La date est partagée : si l'un·e la change, l'autre la voit (temps réel).
 */
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { breakdownDuration } from '@/lib/time';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/store/useSession';

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.unit}>
      <AppText variant="mono" color={Palette.encre} style={styles.unitValue}>
        {String(value).padStart(2, '0')}
      </AppText>
      <AppText variant="caption" color={Colors.textMuted}>
        {label}
      </AppText>
    </View>
  );
}

export function Countdown() {
  const couple = useSession((s) => s.couple);
  const patchCouple = useSession((s) => s.patchCouple);
  const [now, setNow] = useState(Date.now());
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = couple?.reunion_date ? new Date(couple.reunion_date).getTime() : null;
  const parts = target != null ? breakdownDuration(target - now) : null;

  async function saveDate(date: Date) {
    if (!couple) return;
    // On fixe l'heure à midi pour éviter les surprises de fuseau.
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    const iso = d.toISOString();
    patchCouple({ reunion_date: iso });
    await supabase.from('couples').update({ reunion_date: iso }).eq('id', couple.id);
  }

  function onPickerChange(event: DateTimePickerEvent, date?: Date) {
    // Sur Android, le calendrier est une boîte de dialogue qu'on referme ici.
    if (Platform.OS !== 'ios') setShowPicker(false);
    if (event.type === 'set' && date) saveDate(date);
  }

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <AppText variant="subtitle">Retrouvailles</AppText>
        <Pressable onPress={() => setShowPicker((v) => !v)} hitSlop={8}>
          <AppText variant="label" color={Colors.secondary}>
            {target ? 'Modifier' : 'Choisir la date'}
          </AppText>
        </Pressable>
      </View>

      {parts ? (
        parts.isPast ? (
          <AppText variant="title" color={Colors.success}>
            C'est le grand jour ! 🎉
          </AppText>
        ) : (
          <View style={styles.units}>
            <Unit value={parts.days} label="jours" />
            <Unit value={parts.hours} label="h" />
            <Unit value={parts.minutes} label="min" />
            <Unit value={parts.seconds} label="s" />
          </View>
        )
      ) : (
        <AppText variant="body" color={Colors.textSecondary}>
          Choisissez ensemble la date de vos prochaines retrouvailles 💫
        </AppText>
      )}

      {target ? (
        <AppText variant="caption" color={Colors.textMuted}>
          {new Date(target).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </AppText>
      ) : null}

      {showPicker && (
        <View style={styles.picker}>
          <DateTimePicker
            value={target ? new Date(target) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={new Date()}
            onChange={onPickerChange}
            locale="fr-FR"
          />
          {Platform.OS === 'ios' && (
            <Pressable
              style={styles.done}
              onPress={() => setShowPicker(false)}
              hitSlop={8}>
              <AppText variant="label" color={Palette.encre}>
                Terminé
              </AppText>
            </Pressable>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  units: { flexDirection: 'row', gap: Spacing.md },
  unit: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surfaceSunk,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    gap: 2,
  },
  unitValue: { fontSize: 26 },
  picker: { alignItems: 'center', gap: Spacing.sm },
  done: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
});
