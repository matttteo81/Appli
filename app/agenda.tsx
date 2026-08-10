import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, Input, Screen, ThemedText } from '../src/components/ui';
import { colors } from '../src/theme/colors';
import { fonts, radius, spacing } from '../src/theme/typography';
import { useCoupleTable } from '../src/hooks/useCoupleTable';
import { useAuth } from '../src/store/auth';
import { supabase } from '../src/lib/supabase';
import { syncEventReminders } from '../src/lib/reminders';
import { markSeen } from '../src/lib/homeBadges';
import type { CoupleEvent } from '../src/types/db';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const TYPES = [
  { emoji: '📞', label: 'Appel' },
  { emoji: '🏡', label: 'Retrouvailles' },
  { emoji: '🎂', label: 'Anniversaire' },
  { emoji: '✈️', label: 'Voyage' },
  { emoji: '🍿', label: 'Ciné' },
  { emoji: '📅', label: 'Autre' },
];

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fromIso(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function todayIso() {
  return iso(new Date());
}

export default function Agenda() {
  const router = useRouter();
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const { rows, loading } = useCoupleTable<CoupleEvent>('events', 'event_date', true);
  useEffect(() => { markSeen('agenda'); }, []);

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(todayIso());

  const [open, setOpen] = useState(false);
  const [type, setType] = useState(TYPES[0]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [hasTime, setHasTime] = useState(false);
  const [time, setTime] = useState(new Date());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Reprogramme les rappels locaux à chaque changement de liste.
  useEffect(() => {
    if (!loading) syncEventReminders(rows);
  }, [rows, loading]);

  // Regroupe les événements par jour.
  const byDay = useMemo(() => {
    const m: Record<string, CoupleEvent[]> = {};
    for (const e of rows) (m[e.event_date] ||= []).push(e);
    return m;
  }, [rows]);

  const upcoming = useMemo(
    () => rows.filter((e) => e.event_date >= todayIso()).slice(0, 6),
    [rows],
  );

  // Grille du mois.
  const cells = useMemo(() => {
    const y = cursor.getFullYear();
    const mo = cursor.getMonth();
    const first = new Date(y, mo, 1);
    const lead = (first.getDay() + 6) % 7; // lundi = 0
    const daysIn = new Date(y, mo + 1, 0).getDate();
    const out: (string | null)[] = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= daysIn; d++) out.push(iso(new Date(y, mo, d)));
    return out;
  }, [cursor]);

  const shiftMonth = (n: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));

  const openAdd = () => {
    const base = fromIso(selected);
    setDate(base);
    setType(TYPES[0]);
    setTitle('');
    setNote('');
    setHasTime(false);
    setOpen(true);
  };

  const add = async () => {
    if (!couple || !profile) return;
    setSaving(true);
    await supabase.from('events').insert({
      couple_id: couple.id,
      author_id: profile.id,
      title: title.trim() || type.label,
      emoji: type.emoji,
      event_date: iso(date),
      event_time: hasTime
        ? `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`
        : null,
      note: note.trim() || null,
    });
    setSaving(false);
    setOpen(false);
    setSelected(iso(date));
  };

  const remove = async (e: CoupleEvent) => {
    await supabase.from('events').delete().eq('id', e.id);
  };

  const selectedEvents = byDay[selected] ?? [];

  return (
    <Screen edges={['top']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ThemedText variant="bodyMedium" color={colors.corail}>‹ Retour</ThemedText>
        </Pressable>
        <ThemedText variant="title">Notre agenda 📅</ThemedText>
        <Pressable onPress={openAdd} hitSlop={12}>
          <ThemedText variant="bodyMedium" color={colors.corail}>＋</ThemedText>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.prune} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
          {/* En-tête du mois */}
          <View style={styles.monthBar}>
            <Pressable onPress={() => shiftMonth(-1)} hitSlop={12} style={styles.navBtn}>
              <Text style={styles.nav}>‹</Text>
            </Pressable>
            <ThemedText variant="title">
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </ThemedText>
            <Pressable onPress={() => shiftMonth(1)} hitSlop={12} style={styles.navBtn}>
              <Text style={styles.nav}>›</Text>
            </Pressable>
          </View>

          {/* Jours de la semaine */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => (
              <Text key={i} style={styles.weekday}>{w}</Text>
            ))}
          </View>

          {/* Grille */}
          <View style={styles.grid}>
            {cells.map((c, i) => {
              if (!c) return <View key={`b${i}`} style={styles.cell} />;
              const isToday = c === todayIso();
              const isSel = c === selected;
              const has = !!byDay[c]?.length;
              return (
                <Pressable key={c} style={styles.cell} onPress={() => setSelected(c)}>
                  <View style={[styles.dayInner, isSel && styles.daySel, isToday && !isSel && styles.dayToday]}>
                    <Text style={[styles.dayNum, isSel && { color: colors.creme }]}>
                      {Number(c.slice(-2))}
                    </Text>
                    {has ? <View style={[styles.dot, isSel && { backgroundColor: colors.creme }]} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Événements du jour sélectionné */}
          <ThemedText variant="label" color={colors.texteGris} style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
            {fromIso(selected).getDate()} {MONTHS[fromIso(selected).getMonth()].toUpperCase()}
          </ThemedText>
          {selectedEvents.length === 0 ? (
            <Pressable onPress={openAdd} style={styles.addDay}>
              <ThemedText variant="body" color={colors.texteGris}>Rien de prévu — ＋ ajouter</ThemedText>
            </Pressable>
          ) : (
            selectedEvents.map((e) => (
              <Pressable key={e.id} onLongPress={() => remove(e)} style={styles.evt}>
                <Text style={{ fontSize: 24 }}>{e.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="bodyMedium">{e.title}</ThemedText>
                  {e.note ? (
                    <ThemedText variant="body" color={colors.texteGris} style={{ fontSize: 13 }}>{e.note}</ThemedText>
                  ) : null}
                </View>
                {e.event_time ? <Text style={styles.time}>{e.event_time}</Text> : null}
              </Pressable>
            ))
          )}

          {/* Prochainement */}
          {upcoming.length > 0 ? (
            <>
              <ThemedText variant="label" color={colors.texteGris} style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
                PROCHAINEMENT
              </ThemedText>
              {upcoming.map((e) => (
                <Pressable
                  key={e.id}
                  onPress={() => {
                    const d = fromIso(e.event_date);
                    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                    setSelected(e.event_date);
                  }}
                  style={styles.up}
                >
                  <Text style={{ fontSize: 20 }}>{e.emoji}</Text>
                  <ThemedText variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>{e.title}</ThemedText>
                  <ThemedText variant="body" color={colors.texteGris} style={{ fontSize: 13 }}>
                    {fromIso(e.event_date).getDate()} {MONTHS[fromIso(e.event_date).getMonth()].slice(0, 4)}.
                    {e.event_time ? ` · ${e.event_time}` : ''}
                  </ThemedText>
                </Pressable>
              ))}
            </>
          ) : null}
        </ScrollView>
      )}

      {/* Ajouter */}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheet}>
          <ThemedText variant="title" center>Nouvel événement</ThemedText>
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
          <View style={styles.switchRow}>
            <ThemedText variant="bodyMedium" style={{ flex: 1 }}>Ajouter une heure</ThemedText>
            <Switch value={hasTime} onValueChange={setHasTime} trackColor={{ true: colors.ambre }} />
          </View>
          {hasTime ? (
            <View style={{ alignItems: 'center' }}>
              <DateTimePicker value={time} mode="time" onChange={(_e, d) => d && setTime(d)} />
            </View>
          ) : null}
          <Input placeholder="Note (facultatif)" value={note} onChangeText={setNote} />
          <Button title="Ajouter" onPress={add} loading={saving} />
        </ScrollView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  navBtn: { width: 40, alignItems: 'center' },
  nav: { fontSize: 28, color: colors.prune, fontFamily: fonts.displayMedium },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.texteGris },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayInner: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  daySel: { backgroundColor: colors.prune },
  dayToday: { borderWidth: 1.5, borderColor: colors.ambre },
  dayNum: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.texteSombre },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.corail, marginTop: 1 },
  addDay: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.bordure,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  evt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  time: { fontFamily: fonts.monoMedium, fontSize: 15, color: colors.prune },
  up: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.bordure,
  },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheetScroll: { maxHeight: '85%', flexGrow: 0 },
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
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
