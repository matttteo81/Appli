import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ThemedText } from './ui';
import { colors } from '../theme/colors';
import { fonts, radius, spacing } from '../theme/typography';

const KEY = 'fil_beta_notice_seen_v1';

/**
 * Petit mot de bienvenue « bêta », affiché UNE SEULE FOIS à la première
 * arrivée sur l'accueil (après la création du compte).
 */
export function BetaNotice() {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (!v) setVisible(true);
    });
  }, []);

  const close = async () => {
    try { await AsyncStorage.setItem(KEY, '1'); } catch {}
    setVisible(false);
  };

  const openFeedback = async () => {
    await close();
    router.push('/retour');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <LinearGradient
            colors={[colors.prune, colors.encre]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Text style={styles.emoji}>🧪</Text>
            <Text style={styles.title}>Fil est en bêta</Text>
          </LinearGradient>

          <View style={styles.body}>
            <ThemedText variant="body" center color={colors.texteGris}>
              Tu fais partie des tout premiers à tester Fil 💛
            </ThemedText>
            <ThemedText variant="body" center color={colors.texteGris} style={{ marginTop: spacing.sm }}>
              L'appli évolue encore : si tu croises un bug, une idée ou un petit
              détail à améliorer, dis-le-moi — <ThemedText variant="bodyMedium" color={colors.corail}>tous les retours sont les bienvenus</ThemedText> !
            </ThemedText>

            <Pressable style={styles.btn} onPress={close}>
              <Text style={styles.btnText}>C'est parti ✨</Text>
            </Pressable>
            <Pressable style={styles.linkBtn} onPress={openFeedback} hitSlop={8}>
              <Text style={styles.linkText}>Faire un retour 💬</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.creme,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: 6,
  },
  emoji: { fontSize: 44 },
  title: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 24,
    color: colors.creme,
  },
  body: { padding: spacing.lg },
  btn: {
    marginTop: spacing.lg,
    backgroundColor: colors.ambre,
    borderRadius: radius.pill,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.encre },
  linkBtn: { marginTop: spacing.sm, alignItems: 'center', paddingVertical: 6 },
  linkText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.prune },
});
