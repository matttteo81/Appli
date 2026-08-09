import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from './ui';
import { colors } from '../theme/colors';
import { fonts, radius, spacing } from '../theme/typography';

const KEY = 'fil_onboarding_seen_v1';
const { width } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '🧵',
    title: 'Bienvenue sur Fil',
    body: 'Une petite app rien qu’à vous deux, pour garder le fil malgré la distance. 💛',
  },
  {
    emoji: '🔗',
    title: 'Reliez-vous',
    body: 'Partagez votre code de couple : messages, photos et souvenirs se synchronisent entre vos deux téléphones.',
  },
  {
    emoji: '🔔',
    title: 'Restez proches',
    body: 'Autorisez les notifications pour ne rien manquer : petits mots, retrouvailles, jour de marché… On y va !',
  },
];

export function Onboarding() {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (!v) setVisible(true);
    });
  }, []);

  if (!visible) return null;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const finish = async () => {
    await AsyncStorage.setItem(KEY, '1');
    setVisible(false);
  };

  const next = () => {
    if (index >= SLIDES.length - 1) {
      finish();
    } else {
      scroller.current?.scrollTo({ x: (index + 1) * width, animated: true });
    }
  };

  return (
    <View style={styles.overlay}>
      <LinearGradient colors={['#4A3B6B', '#1B1B3A']} style={StyleSheet.absoluteFill} />
      <View style={styles.top}>
        <Pressable onPress={finish} hitSlop={12}>
          <Text style={styles.skip}>Passer</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
      >
        {SLIDES.map((s) => (
          <View key={s.title} style={[styles.slide, { width }]}>
            <Text style={styles.emoji}>{s.emoji}</Text>
            <ThemedText variant="display" center color={colors.creme} style={{ marginTop: spacing.lg }}>
              {s.title}
            </ThemedText>
            <ThemedText variant="body" center color={colors.cremeDoux} style={styles.body}>
              {s.body}
            </ThemedText>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>
        <Pressable style={styles.btn} onPress={next}>
          <Text style={styles.btnTxt}>{index >= SLIDES.length - 1 ? 'Commencer 💛' : 'Suivant'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  top: { position: 'absolute', top: 54, right: spacing.lg, zIndex: 2 },
  skip: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.cremeDoux },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  emoji: { fontSize: 84 },
  body: { marginTop: spacing.md, fontSize: 17, lineHeight: 25, paddingHorizontal: spacing.sm },
  bottom: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center', gap: spacing.lg },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.bordureClaire },
  dotOn: { backgroundColor: colors.ambre, width: 22 },
  btn: {
    backgroundColor: colors.ambre,
    borderRadius: radius.pill,
    paddingVertical: 16,
    paddingHorizontal: spacing.xxl,
  },
  btnTxt: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.encre },
});
