import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, Card, Input, ThemedText } from './ui';
import { colors } from '../theme/colors';
import { fonts, radius, spacing } from '../theme/typography';
import { useCoupleTable } from '../hooks/useCoupleTable';
import { useAuth } from '../store/auth';
import { supabase } from '../lib/supabase';
import type { Countdown } from '../types/db';

const TYPES = [
  { emoji: '🏡', label: 'Retrouvailles' },
  { emoji: '💞', label: 'Anniversaire de couple' },
  { emoji: '🎂', label: 'Anniversaire' },
  { emoji: '✈️', label: 'Voyage' },
  { emoji: '🎉', label: 'Événement' },
  { emoji: '📅', label: 'Autre' },
];

export function CountdownsCard() {
  const couple = useAuth((s) => s.couple);
  const { rows } = useCoupleTable<Countdown>('countdowns', 'date', true);

  const [open, setOpen] = useState(false);
  const [type, setType] = useState(TYPES[0]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date>(plusDays(30));
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!couple) return;
    setSaving(true);
    await supabase.from('countdowns').insert({
      couple_id: couple.id,
      title: title.trim() || type.label,
      emoji: type.emoji,
      date: toISODate(date),
    });
    setSaving(false);
    setOpen(false);
    setTitle('');
    setType(TYPES[0]);
    setDate(plusDays(30));
  };

  const remove = (c: Countdown) =>
    Alert.alert('Supprimer', `Retirer « ${c.title} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => supabase.from('countdowns').delete().eq('id', c.id),
      },
    ]);

  return (
    <Card>
      <View style={styles.head}>
        <ThemedText variant="label" color={colors.texteGris}>
          COMPTES À REBOURS
        </ThemedText>
        <Pressable onPress={() => setOpen(true)}>
          <ThemedText variant="bodyMedium" color={colors.corail}>
            ＋ Ajouter
          </ThemedText>
        </Pressable>
      </View>

      {rows.length === 0 ? (
        <ThemedText variant="body" color={colors.texteGris} style={{ marginTop: 6 }}>
          Ajoutez vos dates importantes 💫
        </ThemedText>
      ) : (
        <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
          {rows.map((c) => {
            const d = daysUntil(c.date);
            return (
              <Pressable key={c.id} onLongPress={() => remove(c)} style={styles.row}>
                <Text style={{ fontSize: 26 }}>{c.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="bodyMedium" numberOfLines={1}>
                    {c.title}
                  </ThemedText>
                  <ThemedText variant="body" color={colors.texteGris}>
                    {formatDateFr(c.date)}
                  </ThemedText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.days}>{d < 0 ? '✓' : d}</Text>
                  <Text style={styles.daysLabel}>
                    {d < 0 ? 'passé' : d === 0 ? "aujourd'hui" : d === 1 ? 'jour' : 'jours'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <ThemedText variant="title" center>
            Nouveau compte à rebours
          </ThemedText>
          <View style={styles.typeGrid}>
            {TYPES.map((t) => (
              <Pressable
                key={t.label}
                onPress={() => setType(t)}
                style={[styles.typeChip, type.label === t.label && styles.typeChipOn]}
              >
                <Text style={{ fontSize: 20 }}>{t.emoji}</Text>
                <ThemedText variant="label" center color={type.label === t.label ? colors.encre : colors.texteGris}>
                  {t.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          <Input placeholder={`Titre (ex : ${type.label})`} value={title} onChangeText={setTitle} />
          <View style={{ alignItems: 'center' }}>
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_e, d) => d && setDate(d)}
            />
          </View>
          <Button title="Ajouter" onPress={add} loading={saving} />
        </View>
      </Modal>
    </Card>
  );
}

function plusDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function daysUntil(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}
function formatDateFr(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso + 'T00:00:00'));
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  days: { fontFamily: fonts.monoMedium, fontSize: 26, color: colors.prune },
  daysLabel: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.texteGris },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.creme,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: spacing.md,
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeChip: {
    width: '31%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.bordure,
  },
  typeChipOn: { borderColor: colors.ambre, backgroundColor: colors.cremeDoux },
});
