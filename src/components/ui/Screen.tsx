/**
 * Cadre commun à tous les écrans : fond crème + marges sûres (encoche, barre
 * d'accueil). Par défaut le contenu défile (scroll).
 */
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  contentStyle?: ViewStyle;
  /** Espace en bas pour ne pas passer sous la barre d'onglets / le bouton cœur. */
  bottomInset?: number;
};

export function Screen({
  children,
  scroll = true,
  padded = true,
  contentStyle,
  bottomInset = 120,
}: Props) {
  const insets = useSafeAreaInsets();
  const base: ViewStyle = {
    paddingTop: insets.top + Spacing.sm,
    paddingHorizontal: padded ? Spacing.lg : 0,
    paddingBottom: bottomInset,
  };

  if (!scroll) {
    return <View style={[styles.container, base, contentStyle]}>{children}</View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[base, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
