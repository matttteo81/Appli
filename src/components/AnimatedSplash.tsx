import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

const { width: W } = Dimensions.get('window');

/**
 * Écran de démarrage : l'avion en papier qui trace un cœur (animation Lottie,
 * adaptée à l'écran), puis « FIL » et « loin des yeux près du cœur » en dessous.
 */
export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const container = useRef(new Animated.Value(1)).current;
  const title = useRef(new Animated.Value(0)).current;
  const tagline = useRef(new Animated.Value(0)).current;
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    Animated.timing(container, { toValue: 0, duration: 450, useNativeDriver: true }).start(() => onDone());
  };

  useEffect(() => {
    // « FIL » arrive d'abord en fondu…
    const t1 = setTimeout(() => {
      Animated.timing(title, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    }, 1900);
    // …puis la phrase, 1 seconde après.
    const t2 = setTimeout(() => {
      Animated.timing(tagline, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    }, 2900);
    const safety = setTimeout(finish, 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(safety); };
  }, [title, tagline]);

  const titleY = title.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const taglineY = tagline.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  return (
    <Animated.View style={[styles.container, { opacity: container }]} pointerEvents="none">
      <View style={styles.stack}>
        <LottieView
          source={require('../../assets/plane_heart.json')}
          autoPlay
          loop={false}
          speed={1.3}
          resizeMode="contain"
          onAnimationFinish={finish}
          style={styles.lottie}
        />
        <Animated.Text style={[styles.title, { opacity: title, transform: [{ translateY: titleY }] }]}>
          FIL
        </Animated.Text>
        <Animated.Text style={[styles.tagline, { opacity: tagline, transform: [{ translateY: taglineY }] }]}>
          loin des yeux, près du cœur
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10000,
    backgroundColor: colors.encre,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: { alignItems: 'center', width: '100%' },
  lottie: { width: W, height: W * 0.52 },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 56,
    letterSpacing: 4,
    color: colors.creme,
    marginTop: 8,
  },
  tagline: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.ambre, marginTop: 6 },
});
