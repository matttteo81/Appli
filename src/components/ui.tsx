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
  background = colors.creme,
}: {
  children: React.ReactNode;
  style?: ViewProps['style'];
  edges?: Edge[];
  background?: string;
}) {
  return (
    <SafeAreaView
      edges={edges}
      style={[{ flex: 1, backgroundColor: background }, style]}
    >
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
      style={[
        textVariants[variant],
        { color },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}

const textVariants = StyleSheet.create({
  display: { fontFamily: fonts.displaySemiBold, fontSize: 34, lineHeight: 40 },
  displaySmall: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 24,
    lineHeight: 30,
  },
  title: { fontFamily: fonts.displayMedium, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fonts.bodyRegular, fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 24 },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  mono: { fontFamily: fonts.mono, fontSize: 16 },
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
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewProps['style'];
  icon?: React.ReactNode;
}) {
  const bg =
    variant === 'primary'
      ? colors.ambre
      : variant === 'secondary'
        ? colors.prune
        : 'transparent';
  const fg =
    variant === 'primary'
      ? colors.encre
      : variant === 'ghost'
        ? colors.prune
        : colors.creme;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        variant === 'ghost' && styles.ghost,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.buttonInner}>
          {icon}
          <Text
            style={[
              { fontFamily: fonts.bodySemiBold, fontSize: 16, color: fg },
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** Carte (surface arrondie). */
export function Card({
  children,
  style,
  color = '#FFFFFF',
}: {
  children: React.ReactNode;
  style?: ViewProps['style'];
  color?: string;
}) {
  return (
    <View style={[styles.card, { backgroundColor: color }, style]}>
      {children}
    </View>
  );
}

/** Champ de texte stylé. */
export function Input({
  style,
  ...rest
}: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.texteGris}
      style={[styles.input, style]}
      {...rest}
    />
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
      <Text style={{ fontSize: 44, marginBottom: spacing.sm }}>{emoji}</Text>
      <ThemedText variant="title" center color={colors.prune}>
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText
          variant="body"
          center
          color={colors.texteGris}
          style={{ marginTop: 6 }}
        >
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
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  /** Si fourni, affiche une flèche de retour à gauche du titre. */
  onBack?: () => void;
}) {
  return (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 }}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              hitSlop={12}
              accessibilityLabel="Retour"
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: colors.cremeDoux,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 22, color: colors.encre, marginTop: -2 }}>‹</Text>
            </Pressable>
          ) : null}
          <ThemedText variant="display" color={colors.encre}>
            {title}
          </ThemedText>
        </View>
        {right ?? null}
      </View>
      {subtitle ? (
        <ThemedText
          variant="body"
          color={colors.texteGris}
          style={{ marginTop: 2 }}
        >
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.pill,
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ghost: {
    borderWidth: 1.5,
    borderColor: colors.prune,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: colors.encre,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontFamily: fonts.bodyRegular,
    fontSize: 16,
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
});
