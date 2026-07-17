import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from './ui';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/typography';
import {
  AVATAR_EMOJIS,
  INTERESTS,
  LANGUAGES,
  LEVELS,
  type LangLevel,
  type LearningLang,
} from '../lib/languages';

/** Sélecteur d'emoji-avatar. */
export function AvatarPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (emoji: string) => void;
}) {
  return (
    <View style={styles.wrap}>
      {AVATAR_EMOJIS.map((e) => (
        <Pressable
          key={e}
          onPress={() => onChange(e)}
          style={[styles.avatar, value === e && styles.avatarActive]}
        >
          <ThemedText style={{ fontSize: 26 }}>{e}</ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

/** Multi-sélection de langues natives. */
export function NativeLangPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (codes: string[]) => void;
}) {
  const toggle = (code: string) =>
    onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);
  return (
    <View style={styles.wrap}>
      {LANGUAGES.map((l) => {
        const active = value.includes(l.code);
        return (
          <Pressable
            key={l.code}
            onPress={() => toggle(l.code)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <ThemedText color={active ? colors.creme : colors.prune}>
              {l.flag} {l.name}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Multi-sélection de langues apprises + niveau par langue. */
export function LearningLangPicker({
  value,
  onChange,
}: {
  value: LearningLang[];
  onChange: (langs: LearningLang[]) => void;
}) {
  const codes = value.map((l) => l.code);
  const toggle = (code: string) => {
    if (codes.includes(code)) {
      onChange(value.filter((l) => l.code !== code));
    } else {
      onChange([...value, { code, level: 1 }]);
    }
  };
  const setLevel = (code: string, level: LangLevel) =>
    onChange(value.map((l) => (l.code === code ? { ...l, level } : l)));

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.wrap}>
        {LANGUAGES.map((l) => {
          const active = codes.includes(l.code);
          return (
            <Pressable
              key={l.code}
              onPress={() => toggle(l.code)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <ThemedText color={active ? colors.creme : colors.prune}>
                {l.flag} {l.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {value.map((l) => {
        const lang = LANGUAGES.find((x) => x.code === l.code);
        return (
          <View key={l.code} style={styles.levelCard}>
            <ThemedText variant="bodyMedium" color={colors.encre}>
              {lang?.flag} {lang?.name} — niveau
            </ThemedText>
            <View style={styles.levelRow}>
              {LEVELS.map((lv) => (
                <Pressable
                  key={lv.value}
                  onPress={() => setLevel(l.code, lv.value)}
                  style={[styles.level, l.level === lv.value && styles.levelActive]}
                >
                  <ThemedText
                    variant="label"
                    color={l.level === lv.value ? colors.creme : colors.prune}
                  >
                    {lv.value}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Multi-sélection de centres d'intérêt. */
export function InterestPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (keys: string[]) => void;
}) {
  const toggle = (key: string) =>
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  return (
    <View style={styles.wrap}>
      {INTERESTS.map((i) => {
        const active = value.includes(i.key);
        return (
          <Pressable
            key={i.key}
            onPress={() => toggle(i.key)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <ThemedText color={active ? colors.creme : colors.prune}>
              {i.emoji} {i.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.prune,
  },
  chipActive: { backgroundColor: colors.prune },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarActive: { borderColor: colors.ambre, backgroundColor: colors.cremeDoux },
  levelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  levelRow: { flexDirection: 'row', gap: spacing.sm },
  level: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.prune,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelActive: { backgroundColor: colors.prune },
});
