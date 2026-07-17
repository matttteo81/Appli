import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Input, Screen, ThemedText } from '../src/components/ui';
import {
  AvatarPicker,
  InterestPicker,
  LearningLangPicker,
  NativeLangPicker,
} from '../src/components/ProfileEditors';
import { colors } from '../src/theme/colors';
import { spacing } from '../src/theme/typography';
import { useAuth } from '../src/store/auth';
import type { LearningLang } from '../src/lib/languages';

export default function Onboarding() {
  const profile = useAuth((s) => s.profile);
  const updateProfile = useAuth((s) => s.updateProfile);

  const [name, setName] = useState(profile?.display_name ?? '');
  const [emoji, setEmoji] = useState(profile?.avatar_emoji ?? '🙂');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [native, setNative] = useState<string[]>(profile?.native_langs ?? []);
  const [learning, setLearning] = useState<LearningLang[]>(
    profile?.learning_langs ?? [],
  );
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [saving, setSaving] = useState(false);

  const canFinish =
    name.trim().length > 0 && native.length > 0 && learning.length > 0;

  const finish = async () => {
    if (!canFinish) {
      Alert.alert(
        'Encore un effort',
        'Choisis un pseudo, au moins une langue que tu parles et une que tu apprends.',
      );
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        display_name: name.trim(),
        avatar_emoji: emoji,
        bio: bio.trim() || null,
        native_langs: native,
        learning_langs: learning,
        interests,
        onboarded: true,
      });
      // La redirection vers les onglets est gérée par AuthGate.
    } catch (e: any) {
      Alert.alert('Oups', e?.message ?? 'Impossible d’enregistrer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, gap: spacing.md }}>
        <ThemedText variant="display" color={colors.encre}>
          Bienvenue ! 👋
        </ThemedText>
        <ThemedText variant="body" color={colors.texteGris}>
          Dis-nous quelles langues tu parles et lesquelles tu veux apprendre.
        </ThemedText>

        <ThemedText variant="label" color={colors.prune} style={styles.section}>PSEUDO</ThemedText>
        <Input value={name} onChangeText={setName} placeholder="Ton prénom ou pseudo" />

        <ThemedText variant="label" color={colors.prune} style={styles.section}>AVATAR</ThemedText>
        <AvatarPicker value={emoji} onChange={setEmoji} />

        <ThemedText variant="label" color={colors.prune} style={styles.section}>
          JE PARLE COURAMMENT
        </ThemedText>
        <NativeLangPicker value={native} onChange={setNative} />

        <ThemedText variant="label" color={colors.prune} style={styles.section}>
          J'APPRENDS
        </ThemedText>
        <LearningLangPicker value={learning} onChange={setLearning} />

        <ThemedText variant="label" color={colors.prune} style={styles.section}>
          CENTRES D'INTÉRÊT (optionnel)
        </ThemedText>
        <InterestPicker value={interests} onChange={setInterests} />

        <ThemedText variant="label" color={colors.prune} style={styles.section}>
          BIO (optionnel)
        </ThemedText>
        <Input
          value={bio}
          onChangeText={setBio}
          placeholder="Quelques mots sur toi…"
          multiline
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        <Button
          title="C'est parti 🚀"
          onPress={finish}
          loading={saving}
          disabled={!canFinish}
          style={{ marginTop: spacing.lg }}
        />
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.md },
});
