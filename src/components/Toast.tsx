import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { useToast } from '../store/toast';

/** Affiché une fois, en bas de l'écran ; disparaît tout seul après ~2 s. */
export function Toast() {
  const message = useToast((s) => s.message);
  const hide = useToast((s) => s.hide);
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(v, { toValue: 0, duration: 250, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => hide());
    }, 2000);
    return () => clearTimeout(t);
  }, [message, v, hide]);

  if (!message) return null;
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { opacity: v, transform: [{ translateY }] }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    maxWidth: '86%',
    backgroundColor: colors.encre,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: { color: colors.creme, fontFamily: fonts.bodySemiBold, fontSize: 14, textAlign: 'center' },
});
