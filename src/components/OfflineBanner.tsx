import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

/** Petit bandeau en haut quand il n'y a pas de connexion. */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      // Hors-ligne seulement si on est sûr qu'il n'y a pas de réseau.
      const off = state.isConnected === false;
      setOffline(off);
    });
    return () => sub();
  }, []);

  useEffect(() => {
    Animated.timing(v, { toValue: offline ? 1 : 0, duration: 250, useNativeDriver: true }).start();
  }, [offline, v]);

  if (!offline) return null;
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.bar, { paddingTop: insets.top + 4, opacity: v, transform: [{ translateY }] }]}
    >
      <Text style={styles.text}>📵 Pas de connexion — vos envois partiront au retour du réseau</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.prune,
    paddingBottom: 8,
    paddingHorizontal: 14,
    zIndex: 40,
  },
  text: { color: colors.creme, fontFamily: fonts.bodyMedium, fontSize: 12, textAlign: 'center' },
});
