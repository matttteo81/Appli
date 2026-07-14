import React, { useEffect } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLock } from '../store/lock';
import { colors, skyGradients } from '../theme/colors';
import { fonts } from '../theme/typography';

/**
 * Superpose un écran de verrouillage quand l'app est verrouillée (Face ID).
 * À placer tout en haut de l'arbre, au-dessus de la navigation.
 */
export function LockGate() {
  const enabled = useLock((s) => s.enabled);
  const locked = useLock((s) => s.locked);
  const lockNow = useLock((s) => s.lockNow);
  const unlock = useLock((s) => s.unlock);

  // Re-verrouille quand l'app repasse en arrière-plan.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') lockNow();
    });
    return () => sub.remove();
  }, [lockNow]);

  // Demande Face ID dès que l'écran de verrouillage apparaît.
  useEffect(() => {
    if (enabled && locked) unlock();
  }, [enabled, locked, unlock]);

  if (!enabled || !locked) return null;

  return (
    <LinearGradient colors={skyGradients.nuit} style={styles.container}>
      <Text style={styles.emoji}>🔒</Text>
      <Text style={styles.title}>Fil est verrouillé</Text>
      <Pressable style={styles.button} onPress={unlock}>
        <Text style={styles.buttonText}>Déverrouiller</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emoji: { fontSize: 64 },
  title: { fontFamily: fonts.displaySemiBold, fontSize: 24, color: colors.creme },
  button: {
    marginTop: 12,
    backgroundColor: colors.ambre,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
  },
  buttonText: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.encre },
});
