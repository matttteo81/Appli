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
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { gpsFromExif } from '../lib/exifgps';
import { pushToPartner } from '../lib/push';
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
  const profile = useAuth((s) => s.profile);
  const partner = useAuth((s) => s.partner);
  const { rows } = useCoupleTable<Countdown>('countdowns', 'date', true);

  // Suppression optimiste : on masque tout de suite la ligne, sans attendre
  // l'événement temps réel (les événements DELETE ne portent pas couple_id,
  // donc le rechargement automatique ne se déclenche pas pour une suppression).
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const visible = rows.filter((r) => !hidden.has(r.id));

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

  const doDelete = async (c: Countdown) => {
    // On masque immédiatement (ressenti instantané).
    setHidden((prev) => new Set(prev).add(c.id));
    const { data, error } = await supabase
      .from('countdowns')
      .delete()
      .eq('id', c.id)
      .select();
    // Si la base refuse (erreur ou 0 ligne effacée), on réaffiche et on prévient.
    if (error || !data || data.length === 0) {
      setHidden((prev) => {
        const next = new Set(prev);
        next.delete(c.id);
        return next;
      });
      Alert.alert(
        'Suppression impossible',
        error?.message ??
          "La base a refusé la suppression de ce compte à rebours. Réessaie dans un instant.",
      );
    }
  };

  // ── Compte à rebours terminé → souvenir dans le journal ──────────────────
  const [keeping, setKeeping] = useState<Countdown | null>(null);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [keepSaving, setKeepSaving] = useState(false);

  const openKeep = (c: Countdown) => {
    setNote('');
    setPhoto(null);
    setKeeping(c);
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Accès refusé', 'Autorise l’accès aux photos dans les réglages.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
      exif: true,
    });
    if (res.canceled || !res.assets[0]?.base64) return;
    const asset = res.assets[0];
    const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
    const loc = gpsFromExif(asset.exif);
    setPhoto({
      uri: asset.uri,
      base64: asset.base64!,
      ext: ext === 'png' ? 'png' : 'jpg',
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
    });
  };

  const keepAsMemory = async () => {
    const c = keeping;
    if (!c || !couple || !profile) return;
    setKeepSaving(true);
    try {
      let photo_path: string | null = null;
      if (photo) {
        photo_path = `${couple.id}/mem-${Date.now()}.${photo.ext}`;
        const { error } = await supabase.storage
          .from('photos')
          .upload(photo_path, decode(photo.base64), {
            contentType: photo.ext === 'png' ? 'image/png' : 'image/jpeg',
          });
        if (error) throw error;
      }
      const { error: insErr } = await supabase.from('memories').insert({
        couple_id: couple.id,
        author_id: profile.id,
        title: `${c.emoji} ${c.title}`,
        body: note.trim() || null,
        photo_path,
        memory_date: c.date,
        lat: photo?.lat ?? null,
        lng: photo?.lng ?? null,
      });
      if (insErr) throw insErr;
      // Le souvenir est enregistré : on peut retirer le compte à rebours.
      setHidden((prev) => new Set(prev).add(c.id));
      await supabase.from('countdowns').delete().eq('id', c.id);
      pushToPartner(
        partner?.id,
        `📔 ${profile.display_name}`,
        `a gardé « ${c.title} » en souvenir 💛`,
      );
      setKeeping(null);
    } catch (e: any) {
      Alert.alert(
        'Enregistrement impossible',
        e?.message ?? 'Le souvenir n’a pas pu être enregistré. Réessaie dans un instant.',
      );
    } finally {
      setKeepSaving(false);
    }
  };

  const remove = (c: Countdown) =>
    Alert.alert('Supprimer', `Retirer « ${c.title} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => doDelete(c) },
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

      {visible.length === 0 ? (
        <ThemedText variant="body" color={colors.texteGris} style={{ marginTop: 6 }}>
          Ajoutez vos dates importantes 💫
        </ThemedText>
      ) : (
        <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
          {visible.map((c) => {
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
                {d < 0 ? (
                  <Pressable
                    onPress={() => openKeep(c)}
                    hitSlop={6}
                    style={styles.keep}
                    accessibilityRole="button"
                    accessibilityLabel={`Garder « ${c.title} » en souvenir`}
                  >
                    <Text style={styles.keepText}>📔 Garder</Text>
                  </Pressable>
                ) : (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.days}>{d}</Text>
                    <Text style={styles.daysLabel}>
                      {d === 0 ? "aujourd'hui" : d === 1 ? 'jour' : 'jours'}
                    </Text>
                  </View>
                )}
                <Pressable onPress={() => remove(c)} hitSlop={10} style={styles.del}>
                  <Text style={styles.delText}>✕</Text>
                </Pressable>
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
              themeVariant="light"
              accentColor={colors.corail}
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_e, d) => d && setDate(d)}
            />
          </View>
          <Button title="Ajouter" onPress={add} loading={saving} />
        </View>
      </Modal>

      <Modal
        visible={!!keeping}
        transparent
        animationType="slide"
        onRequestClose={() => setKeeping(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setKeeping(null)} />
        <View style={styles.sheet}>
          <ThemedText variant="title" center>
            C’était comment ? {keeping?.emoji}
          </ThemedText>
          <ThemedText variant="body" color={colors.texteGris} center>
            « {keeping?.title} » — {keeping ? formatDateFr(keeping.date) : ''}.{'\n'}
            Gardez-en une trace dans votre journal.
          </ThemedText>
          <Input
            placeholder="Quelques mots sur ce moment…"
            value={note}
            onChangeText={setNote}
            multiline
          />
          {photo ? (
            <Pressable onPress={pickPhoto}>
              <Image source={{ uri: photo.uri }} style={styles.preview} contentFit="cover" />
            </Pressable>
          ) : (
            <Button title="＋ Ajouter une photo" variant="secondary" onPress={pickPhoto} />
          )}
          <Button title="Garder en souvenir" onPress={keepAsMemory} loading={keepSaving} />
        </View>
      </Modal>
    </Card>
  );
}

type PickedPhoto = {
  uri: string;
  base64: string;
  ext: 'jpg' | 'png';
  lat: number | null;
  lng: number | null;
};

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
  del: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.cremeDoux,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  keep: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.ambre,
  },
  keepText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.encre },
  preview: { width: '100%', height: 160, borderRadius: radius.md },
  delText: { fontSize: 13, color: colors.texteGris, fontWeight: '700' },
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
