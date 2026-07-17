import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, Screen, ScreenHeader, ThemedText } from '../../src/components/ui';
import {
  AvatarPicker,
  InterestPicker,
  LearningLangPicker,
  NativeLangPicker,
} from '../../src/components/ProfileEditors';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/typography';
import { useAuth } from '../../src/store/auth';
import type { LearningLang } from '../../src/lib/languages';

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useAuth((s) => s.profile);
  const updateProfile = useAuth((s) => s.updateProfile);
  const signOut = useAuth((s) => s.signOut);
  const deleteAccount = useAuth((s) => s.deleteAccount);

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🙂');
  const [bio, setBio] = useState('');
  const [native, setNative] = useState<string[]>([]);
  const [learning, setLearning] = useState<LearningLang[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name);
    setEmoji(profile.avatar_emoji);
    setBio(profile.bio ?? '');
    setNative(profile.native_langs);
    setLearning(profile.learning_langs);
    setInterests(profile.interests);
  }, [profile?.id]);

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({
        display_name: name.trim() || 'Apprenant·e',
        avatar_emoji: emoji,
        bio: bio.trim() || null,
        native_langs: native,
        learning_langs: learning,
        interests,
      });
      Alert.alert('Enregistré', 'Ton profil a été mis à jour ✅');
    } catch (e: any) {
      Alert.alert('Oups', e?.message ?? 'Échec de l’enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Supprimer le compte',
      'Cette action est définitive : profil, messages et salons seront effacés. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
            } catch (e: any) {
              Alert.alert('Erreur', e?.message ?? 'Impossible de supprimer.');
            }
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Mon profil" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140, gap: spacing.md }}>
        <View style={styles.heroAvatar}>
          <ThemedText style={{ fontSize: 40 }}>{emoji}</ThemedText>
        </View>
        {profile?.city_name ? (
          <ThemedText variant="body" color={colors.texteGris} center>
            📍 {profile.city_name}
            {profile.country_code ? `, ${profile.country_code}` : ''}
          </ThemedText>
        ) : null}

        <ThemedText variant="label" color={colors.prune} style={styles.section}>PSEUDO</ThemedText>
        <Input value={name} onChangeText={setName} placeholder="Pseudo" />

        <ThemedText variant="label" color={colors.prune} style={styles.section}>AVATAR</ThemedText>
        <AvatarPicker value={emoji} onChange={setEmoji} />

        <ThemedText variant="label" color={colors.prune} style={styles.section}>JE PARLE</ThemedText>
        <NativeLangPicker value={native} onChange={setNative} />

        <ThemedText variant="label" color={colors.prune} style={styles.section}>J'APPRENDS</ThemedText>
        <LearningLangPicker value={learning} onChange={setLearning} />

        <ThemedText variant="label" color={colors.prune} style={styles.section}>INTÉRÊTS</ThemedText>
        <InterestPicker value={interests} onChange={setInterests} />

        <ThemedText variant="label" color={colors.prune} style={styles.section}>BIO</ThemedText>
        <Input
          value={bio}
          onChangeText={setBio}
          placeholder="Quelques mots sur toi…"
          multiline
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        <Button title="💾 Enregistrer" onPress={save} loading={saving} style={{ marginTop: spacing.lg }} />

        <View style={styles.account}>
          <Button title="Se déconnecter" variant="ghost" onPress={signOut} />
          <Button
            title="Politique de confidentialité"
            variant="ghost"
            onPress={() => router.push('/confidentialite')}
          />
          <Button title="Supprimer mon compte" variant="ghost" onPress={confirmDelete} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.cremeDoux,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  section: { marginTop: spacing.md },
  account: { marginTop: spacing.xl, gap: spacing.sm },
});
