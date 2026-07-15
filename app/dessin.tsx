import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Screen, ThemedText } from '../src/components/ui';
import { SharedCanvas } from '../src/components/SharedCanvas';
import { colors } from '../src/theme/colors';
import { fonts, spacing } from '../src/theme/typography';
import { useAuth } from '../src/store/auth';
import { supabase } from '../src/lib/supabase';

const PALETTE = [
  colors.encre,
  colors.corail,
  colors.ambre,
  colors.sauge,
  colors.prune,
  '#FFFFFF',
];

export default function Dessin() {
  const router = useRouter();
  const couple = useAuth((s) => s.couple);
  const profile = useAuth((s) => s.profile);
  const [color, setColor] = useState<string>(colors.encre);

  const clearAll = () => {
    if (!couple) return;
    Alert.alert('Effacer la toile ?', 'Le dessin sera effacé pour vous deux.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Effacer',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await supabase
            .from('drawing_strokes')
            .delete()
            .eq('couple_id', couple.id)
            .eq('board', 'free');
        },
      },
    ]);
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ThemedText variant="bodyMedium" color={colors.corail}>
            ‹ Retour
          </ThemedText>
        </Pressable>
        <ThemedText variant="title">Dessin partagé ✏️</ThemedText>
        <Pressable onPress={clearAll} hitSlop={12}>
          <ThemedText variant="bodyMedium" color={colors.texteGris}>
            Effacer
          </ThemedText>
        </Pressable>
      </View>

      {couple && profile ? (
        <SharedCanvas
          coupleId={couple.id}
          authorId={profile.id}
          board="free"
          editable
          color={color}
          style={{ marginHorizontal: spacing.md }}
        />
      ) : (
        <View style={{ flex: 1 }} />
      )}

      <ThemedText variant="body" color={colors.texteGris} center style={{ marginTop: spacing.sm }}>
        Dessine avec ton doigt — ta moitié voit tes traits en direct.
      </ThemedText>

      <View style={styles.palette}>
        {PALETTE.map((c) => (
          <Pressable
            key={c}
            onPress={() => {
              setColor(c);
              Haptics.selectionAsync();
            }}
            style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  palette: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: colors.encre,
    transform: [{ scale: 1.15 }],
  },
});
