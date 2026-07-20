import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewProps,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { fonts, radius, spacing } from '../theme/typography';

/** Conteneur d'écran avec zone sûre et fond. */
export function Screen({
  children,
  style,
  edges = ['top', 'left', 'right'],
  background = colors.fond,
}: {
  children: React.ReactNode;
  style?: ViewProps['style'];
  edges?: Edge[];
  background?: string;
}) {
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: background }, style]}>
      {children}
    </SafeAreaView>
  );
}

type ThemedTextProps = TextProps & {
  variant?:
    | 'display'
    | 'displaySmall'
    | 'title'
    | 'body'
    | 'bodyMedium'
    | 'label'
    | 'mono'
    | 'monoBig';
  color?: string;
  center?: boolean;
};

export function ThemedText({
  variant = 'body',
  color = colors.texteSombre,
  center,
  style,
  ...rest
}: ThemedTextProps) {
  return (
    <Text
      {...rest}
      style={[textVariants[variant], { color }, center && { textAlign: 'center' }, style]}
    />
  );
}

// Typo sans-serif nette (Plus Jakarta Sans) pour un rendu moderne / fintech.
const textVariants = StyleSheet.create({
  display: { fontFamily: fonts.bodyBold, fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  displaySmall: { fontFamily: fonts.bodyBold, fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 19, lineHeight: 25, letterSpacing: -0.2 },
  body: { fontFamily: fonts.bodyRegular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 12, letterSpacing: 0.3 },
  mono: { fontFamily: fonts.mono, fontSize: 15 },
  monoBig: { fontFamily: fonts.monoMedium, fontSize: 40, letterSpacing: 1 },
});

/** Bouton principal / secondaire. */
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
  icon,
}: {
  title: string;
  onPress?: PressableProps['onPress'];
  variant?: 'primary' | 'secondary' | 'ghost' | 'light';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewProps['style'];
  icon?: React.ReactNode;
}) {
  const bg =
    variant === 'primary'
      ? colors.bleu
      : variant === 'light'
        ? '#FFFFFF'
        : variant === 'secondary'
          ? colors.cremeDoux
          : 'transparent';
  const fg =
    variant === 'primary'
      ? '#FFFFFF'
      : variant === 'light'
        ? colors.bleu
        : variant === 'secondary'
          ? colors.encre
          : colors.bleu;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        variant === 'ghost' && styles.ghost,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.buttonInner}>
          {icon}
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: fg }}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Carte (surface arrondie douce). */
export function Card({
  children,
  style,
  color = colors.carte,
}: {
  children: React.ReactNode;
  style?: ViewProps['style'];
  color?: string;
}) {
  return <View style={[styles.card, { backgroundColor: color }, style]}>{children}</View>;
}

/** Champ de texte stylé (rempli, doux). */
export function Input({ style, ...rest }: TextInputProps) {
  return (
    <TextInput placeholderTextColor={colors.texteGris} style={[styles.input, style]} {...rest} />
  );
}

/** État vide (aucune donnée). */
export function EmptyState({
  emoji,
  title,
  subtitle,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyBadge}>
        <Text style={{ fontSize: 40 }}>{emoji}</Text>
      </View>
      <ThemedText variant="title" center color={colors.encre}>
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText variant="body" center color={colors.texteGris} style={{ marginTop: 6 }}>
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}

/** En-tête de section réutilisable en haut des écrans. */
export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <ThemedText variant="display" color={colors.encre}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText variant="body" color={colors.texteGris} style={{ marginTop: 2 }}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.pill,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ghost: { borderWidth: 1.5, borderColor: colors.bleu },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: '#0B1B3A',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  input: {
    backgroundColor: colors.carte,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 15,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.texteSombre,
    borderWidth: 1,
    borderColor: colors.bordure,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.cremeDoux,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
});
