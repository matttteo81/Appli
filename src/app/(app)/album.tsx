/**
 * Écran ALBUM PHOTO PARTAGÉ : chacun ajoute des photos depuis la pellicule du
 * téléphone (avec une légende). Elles sont stockées dans Supabase Storage et
 * affichées en grille, en temps réel pour les deux.
 */
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, Dimensions, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { base64ToUint8Array } from '@/lib/base64';
import { supabase } from '@/lib/supabase';
import { useCoupleRows } from '@/lib/useCoupleData';
import { useSession } from '@/store/useSession';
import type { Photo } from '@/types/db';

type Pending = { uri: string; base64: string; mime: string };

const GAP = Spacing.md;
const COL_WIDTH = (Dimensions.get('window').width - Spacing.lg * 2 - GAP) / 2;

export default function Album() {
  const session = useSession((s) => s.session);
  const couple = useSession((s) => s.couple);
  const { rows } = useCoupleRows('photos');
  const photos = rows as Photo[];

  const [pending, setPending] = useState<Pending | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});

  // Génère des URLs signées (le bucket est privé) pour afficher les photos.
  useEffect(() => {
    let active = true;
    async function loadUrls() {
      const paths = photos.map((p) => p.storage_path);
      if (paths.length === 0) {
        setUrls({});
        return;
      }
      const { data } = await supabase.storage.from('photos').createSignedUrls(paths, 3600);
      if (!active || !data) return;
      const map: Record<string, string> = {};
      data.forEach((d) => {
        if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
      });
      setUrls(map);
    }
    loadUrls();
    return () => {
      active = false;
    };
  }, [photos]);

  async function pick() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Autorisation requise', 'Autorise l’accès aux photos pour en ajouter.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.7,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert('Oups', 'Impossible de lire cette image.');
      return;
    }
    setPending({ uri: asset.uri, base64: asset.base64, mime: asset.mimeType ?? 'image/jpeg' });
    setCaption('');
  }

  async function confirmUpload() {
    if (!pending || !couple || !session) return;
    setUploading(true);
    try {
      const ext = pending.mime.includes('png') ? 'png' : 'jpg';
      const path = `${couple.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const bytes = base64ToUint8Array(pending.base64);

      const { error: upErr } = await supabase.storage
        .from('photos')
        .upload(path, bytes, { contentType: pending.mime });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from('photos').insert({
        couple_id: couple.id,
        author_id: session.user.id,
        storage_path: path,
        caption: caption.trim() || null,
      });
      if (dbErr) throw dbErr;

      setPending(null);
      setCaption('');
    } catch (e) {
      Alert.alert('Envoi impossible', e instanceof Error ? e.message : 'Réessaie.');
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(photo: Photo) {
    Alert.alert('Supprimer cette photo ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await supabase.storage.from('photos').remove([photo.storage_path]);
          await supabase.from('photos').delete().eq('id', photo.id);
        },
      },
    ]);
  }

  return (
    <Screen>
      <AppText variant="display" style={styles.title}>
        Album
      </AppText>
      <AppText variant="body" color={Colors.textSecondary} style={styles.subtitle}>
        Vos souvenirs, réunis au même endroit.
      </AppText>

      {pending ? (
        <Card style={styles.pendingCard}>
          <Image source={{ uri: pending.uri }} style={styles.preview} contentFit="cover" />
          <TextField
            label="Légende"
            value={caption}
            onChangeText={setCaption}
            placeholder="Un mot sur ce souvenir…"
          />
          <View style={styles.pendingActions}>
            <Button label="Annuler" variant="ghost" onPress={() => setPending(null)} style={styles.flex} />
            <Button label="Ajouter" onPress={confirmUpload} loading={uploading} style={styles.flex} />
          </View>
        </Card>
      ) : (
        <Button label="＋ Ajouter une photo" onPress={pick} />
      )}

      <View style={styles.grid}>
        {photos.map((photo) => (
          <Pressable
            key={photo.id}
            onLongPress={() => removePhoto(photo)}
            style={styles.cell}>
            <Image
              source={urls[photo.storage_path] ? { uri: urls[photo.storage_path] } : undefined}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
            {photo.caption ? (
              <AppText variant="caption" color={Colors.textSecondary} numberOfLines={2} style={styles.caption}>
                {photo.caption}
              </AppText>
            ) : null}
          </Pressable>
        ))}
      </View>

      {photos.length === 0 && !pending && (
        <AppText variant="body" color={Colors.textMuted} center style={styles.empty}>
          Aucune photo pour l'instant. Ajoutez votre premier souvenir 📷
        </AppText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: Spacing.sm },
  subtitle: { marginTop: 2, marginBottom: Spacing.lg },
  pendingCard: { gap: Spacing.md },
  preview: { width: '100%', height: 220, borderRadius: Radius.md, backgroundColor: Colors.surfaceSunk },
  pendingActions: { flexDirection: 'row', gap: Spacing.md },
  flex: { flex: 1 },
  grid: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  cell: { width: COL_WIDTH, gap: Spacing.xs },
  image: {
    width: COL_WIDTH,
    height: COL_WIDTH,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSunk,
  },
  caption: { paddingHorizontal: 2 },
  empty: { marginTop: Spacing.xxl },
});
