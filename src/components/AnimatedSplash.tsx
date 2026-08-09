import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text } from 'react-native';
import LottieView from 'lottie-react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

const { width: W } = Dimensions.get('window');

/**
 * Écran de démarrage : l'avion en papier qui trace un cœur à travers le monde
 * (animation Lottie), adaptée à l'écran du téléphone, puis le titre « Fil ».
 */
export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const container = useRef(new Animated.Value(1)).current;
  const title = useRef(new Animated.Value(0)).current;
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    Animated.timing(container, { toValue: 0, duration: 450, useNativeDriver: true }).start(() => onDone());
  };

  useEffect(() => {
    // Le titre apparaît vers la fin de l'animation.
    const t = setTimeout(() => {
      Animated.timing(title, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    }, 3200);
    // Filet de sécurité si onAnimationFinish ne se déclenche pas.
    const safety = setTimeout(finish, 6000);
    return () => { clearTimeout(t); clearTimeout(safety); };
  }, [title]);

  return (
    <Animated.View style={[styles.container, { opacity: container }]} pointerEvents="none">
      <LottieView
        source={require('../../assets/plane_heart.json')}
        autoPlay
        loop={false}
        resizeMode="contain"
        onAnimationFinish={finish}
        style={styles.lottie}
      />
      <Animated.View style={[styles.titleWrap, { opacity: title }]}>
        <Text style={styles.title}>Fil</Text>
        <Text style={styles.tagline}>Reliés, où que vous soyez</Text>
      </Animated.View>
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
  lottie: { width: W, height: W },
  titleWrap: { position: 'absolute', bottom: '18%', alignItems: 'center' },
  title: { fontFamily: fonts.displayBold, fontSize: 54, color: colors.creme },
  tagline: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.ambre, marginTop: 4 },
});
