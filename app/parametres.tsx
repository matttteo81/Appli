import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { decode } from 'base64-arraybuffer';
import { Screen, ThemedText } from '../src/components/ui';
import { colors } from '../src/theme/colors';
import { radius, spacing } from '../src/theme/typography';
import { useAuth } from '../src/store/auth';
import { useLock } from '../src/store/lock';
import { supabase } from '../src/lib/supabase';
import { refreshMyLocation } from '../src/lib/autoLocation';

function Row({
  title,
  subtitle,
  onPress,
  right,
  danger,
  disabled,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={[styles.row, disabled && { opacity: 0.5 }]}
    >
      <View style={{ flex: 1 }}>
        <ThemedText variant="bodyMedium" color={danger ? colors.corail : colors.texteSombre}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText variant="body" color={colors.texteGris} style={{ fontSize: 13, marginTop: 1 }}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {right ?? (onPress ? <Text style={styles.chevron}>›</Text> : null)}
    </Pressable>
  );
}

export default function Parametres() {
  const router = useRouter();
  const couple = useAuth((s) => s.couple);
  const updateCouple = useAuth((s) => s.updateCouple);
  const profile = useAuth((s) => s.profile);
  const updateProfile = useAuth((s) => s.updateProfile);
  const signOut = useAuth((s) => s.signOut);
  const deleteAccount = useAuth((s) => s.deleteAccount);
  const lockEnabled = useLock((s) => s.enabled);
  const setLockEnabled = useLock((s) => s.setEnabled);

  const autoLocation = profile?.auto_location !== false;
  const toggleAutoLocation = async (value: boolean) => {
    if (value) {
      // Activer : on demande la permission de localisation.
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Localisation refusée',
          'Autorise la localisation dans les réglages du téléphone pour activer la position automatique.',
        );
        return;
      }
    }
    try {
      await updateProfile({ auto_location: value });
      if (value && profile) {
        // Mise à jour immédiate de la position.
        await refreshMyLocation({ ...profile, auto_location: true }, updateProfile);
      }
    } catch {
      Alert.alert('Oups', "Le réglage n'a pas pu être enregistré.");
    }
  };

  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingTogether, setUploadingTogether] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const pickAndUpload = async (
    prefix: string,
    setBusy: (b: boolean) => void,
    apply: (path: string) => Promise<void>,
  ) => {
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
    setBusy(true);
    try {
      const ext = (res.assets[0].uri.split('.').pop() || 'jpg').toLowerCase();
      const path = `${couple.id}/${prefix}-${Date.now()}.${ext === 'png' ? 'png' : 'jpg'}`;
      const { error } = await supabase.storage
        .from('photos')
        .upload(path, decode(res.assets[0].base64!), {
          contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
        });
      if (error) throw error;
      await apply(path);
    } catch (e: any) {
      Alert.alert('Oups', e?.message ?? 'Envoi impossible.');
    } finally {
      setBusy(false);
    }
  };

  const changeBackground = () =>
    pickAndUpload('home', setUploadingBg, (path) => updateCouple({ home_photo_path: path }));
  const changeTogetherPhoto = () =>
    pickAndUpload('together', setUploadingTogether, (path) => updateCouple({ together_photo_path: path }));

  const toggleLock = async (v: boolean) => {
    const ok = await setLockEnabled(v);
    if (!ok && v) {
      Alert.alert('Face ID indisponible', 'Active d’abord Face ID ou un code sur ton iPhone (Réglages).');
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Supprimer ton compte ?',
      'Cette action est définitive. Ton profil et tout ce que tu as ajouté seront effacés. Ta moitié garde son compte.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Vraiment sûr ?',
              'Il n’y a pas de retour en arrière possible.',
              [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Supprimer définitivement', style: 'destructive', onPress: runDelete },
              ],
            ),
        },
      ],
    );
  };

  const runDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      router.replace('/(auth)/sign-in');
    } catch (e: any) {
      Alert.alert('Oups', e?.message ?? 'Suppression impossible. Réessaie.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ThemedText variant="bodyMedium" color={colors.corail}>‹ Retour</ThemedText>
        </Pressable>
        <ThemedText variant="title">Paramètres</ThemedText>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 }}>
        {/* Photos */}
        <View>
          <ThemedText variant="label" color={colors.texteGris} style={styles.section}>PHOTOS</ThemedText>
          <View style={styles.group}>
            <Row
              title="Photo d’accueil"
              subtitle={uploadingBg ? 'Envoi…' : 'L’image de fond de l’accueil'}
              onPress={changeBackground}
              disabled={uploadingBg}
            />
            <View style={styles.sep} />
            <Row
              title="Photo « Ensemble depuis »"
              subtitle={uploadingTogether ? 'Envoi…' : 'La photo de votre compteur'}
              onPress={changeTogetherPhoto}
              disabled={uploadingTogether}
            />
            <View style={styles.sep} />
            <Row title="Photo du widget" subtitle="Bientôt (widget photo à venir)" disabled />
          </View>
        </View>

        {/* Sécurité */}
        <View>
          <ThemedText variant="label" color={colors.texteGris} style={styles.section}>SÉCURITÉ</ThemedText>
          <View style={styles.group}>
            <Row
              title="Verrouiller avec Face ID"
              subtitle="Demande Face ID à l’ouverture de Fil"
              right={<Switch value={lockEnabled} onValueChange={toggleLock} trackColor={{ true: colors.sauge }} />}
            />
          </View>
        </View>

        {/* Localisation */}
        <View>
          <ThemedText variant="label" color={colors.texteGris} style={styles.section}>LOCALISATION</ThemedText>
          <View style={styles.group}>
            <Row
              title="Position automatique"
              subtitle="Met à jour ta position exacte à l’ouverture — si tu changes de ville, ça suit tout seul"
              right={
                <Switch
                  value={autoLocation}
                  onValueChange={toggleAutoLocation}
                  trackColor={{ true: colors.sauge }}
                />
              }
            />
          </View>
        </View>

        {/* Confidentialité */}
        <View>
          <ThemedText variant="label" color={colors.texteGris} style={styles.section}>CONFIDENTIALITÉ</ThemedText>
          <View style={styles.group}>
            <Row
              title="Politique de confidentialité"
              subtitle="Quelles données Fil utilise"
              onPress={() => router.push('/confidentialite')}
            />
          </View>
        </View>

        {/* Compte */}
        <View>
          <ThemedText variant="label" color={colors.texteGris} style={styles.section}>COMPTE</ThemedText>
          <View style={styles.group}>
            <Row title="Se déconnecter" onPress={signOut} />
            <View style={styles.sep} />
            <Row
              title={deleting ? 'Suppression…' : 'Supprimer mon compte'}
              subtitle="Efface définitivement ton profil et tes données"
              onPress={confirmDelete}
              danger
              disabled={deleting}
            />
          </View>
        </View>
      </ScrollView>
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
  section: { marginBottom: spacing.sm, marginLeft: spacing.xs },
  group: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.bordure,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  sep: { height: 1, backgroundColor: colors.bordure, marginLeft: spacing.md },
  chevron: { fontSize: 22, color: colors.texteGris },
});
