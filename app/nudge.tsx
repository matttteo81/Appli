import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, skyGradients } from '../src/theme/colors';
import { fonts } from '../src/theme/typography';

export default function Nudge() {
  const router = useRouter();
  const { message, from } = useLocalSearchParams<{
    message?: string;
    from?: string;
  }>();
  const text = message ?? 'Tu me manques';

  const scale = useRef(new Animated.Value(0.6)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Lecture à voix haute du message (français).
    Speech.speak(text, { language: 'fr-FR', pitch: 1.05, rate: 0.95 });

    // Petite animation d'apparition + battement de cœur.
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.12,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    return () => {
      Speech.stop();
    };
  }, [text, scale, pulse]);

  const close = () => {
    Speech.stop();
    router.back();
  };

  return (
    <LinearGradient colors={skyGradients.crepuscule} style={styles.container}>
      <Animated.View
        style={{ alignItems: 'center', transform: [{ scale }] }}
      >
        <Animated.Text style={[styles.heart, { transform: [{ scale: pulse }] }]}>
          💛
        </Animated.Text>
        {from ? (
          <Text style={styles.from}>{from} pense à toi</Text>
        ) : null}
        <Text style={styles.message}>{text}</Text>
      </Animated.View>

      <Pressable style={styles.replay} onPress={() => Speech.speak(text, { language: 'fr-FR' })}>
        <Text style={styles.replayText}>🔊 Réécouter</Text>
      </Pressable>

      <Pressable style={styles.close} onPress={close}>
        <Text style={styles.closeText}>Fermer</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  heart: { fontSize: 120, marginBottom: 24 },
  from: {
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
    color: colors.encre,
    marginBottom: 8,
    opacity: 0.8,
  },
  message: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 36,
    color: colors.encre,
    textAlign: 'center',
    lineHeight: 42,
  },
  replay: {
    position: 'absolute',
    bottom: 120,
    backgroundColor: 'rgba(27,27,58,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  replayText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.encre },
  close: {
    position: 'absolute',
    bottom: 56,
    backgroundColor: colors.encre,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 999,
  },
  closeText: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.creme },
});
