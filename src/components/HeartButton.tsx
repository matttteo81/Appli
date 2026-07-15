/**
 * Bouton cœur flottant « Tu me manques », visible sur tous les écrans.
 * Quand on appuie :
 *   1) on enregistre un « Tu me manques » dans Supabase (le/la partenaire le
 *      reçoit en temps réel → popup) ;
 *   2) on envoie une vraie notification push sur son téléphone.
 */
import { useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Colors, Palette, Radius, softShadow, Spacing } from '@/constants/theme';
import { sendPushToPartner } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/store/useSession';

export function HeartButton() {
  const insets = useSafeAreaInsets();
  const session = useSession((s) => s.session);
  const couple = useSession((s) => s.couple);
  const partner = useSession((s) => s.partner);
  const profile = useSession((s) => s.profile);

  const scale = useRef(new Animated.Value(1)).current;
  const [sent, setSent] = useState(false);

  async function onPress() {
    if (!couple || !session) return;

    // Petite animation de pulsation.
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.25,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();

    const myName = profile?.display_name ?? 'Ton amour';

    // 1) Enregistre l'événement (déclenche le popup chez l'autre en temps réel).
    await supabase.from('miss_you').insert({
      couple_id: couple.id,
      sender_id: session.user.id,
      message: `${myName} pense à toi 💛`,
    });

    // 2) Notification push (si on connaît le jeton du/de la partenaire).
    if (partner?.expo_push_token) {
      await sendPushToPartner(
        partner.expo_push_token,
        'Fil 💛',
        `${myName} pense à toi`,
        { type: 'miss_you' },
      );
    }

    setSent(true);
    setTimeout(() => setSent(false), 1800);
  }

  // On ne montre le bouton que quand le couple est formé.
  if (!couple) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 78 }]}>
      {sent && (
        <View style={styles.toast}>
          <AppText variant="label" color={Palette.encre}>
            Envoyé 💛
          </AppText>
        </View>
      )}
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tu me manques"
          onPress={onPress}
          style={styles.button}>
          <AppText style={styles.heart}>♥</AppText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: Spacing.lg,
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
    shadowOpacity: 0.25,
  },
  heart: { color: Palette.blanc, fontSize: 30, lineHeight: 34 },
  toast: {
    backgroundColor: Palette.creme,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    ...softShadow,
  },
});
