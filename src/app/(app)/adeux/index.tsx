/**
 * Hub « À deux » : accès aux rituels, à l'oiseau et à la playlist,
 * plus quelques réglages (code du couple, déconnexion).
 */
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/store/useSession';

type Tile = { href: '/(app)/adeux/rituels' | '/(app)/adeux/oiseau' | '/(app)/adeux/playlist'; emoji: string; title: string; subtitle: string };

const TILES: Tile[] = [
  { href: '/(app)/adeux/rituels', emoji: '🌿', title: 'Rituels', subtitle: 'Vos petites habitudes à cocher ensemble' },
  { href: '/(app)/adeux/oiseau', emoji: '🐣', title: 'Notre oiseau', subtitle: 'Nourrissez-le à deux pour le voir grandir' },
  { href: '/(app)/adeux/playlist', emoji: '🎵', title: 'Playlist', subtitle: 'La bande-son de votre histoire' },
];

export default function ADeuxHub() {
  const couple = useSession((s) => s.couple);
  const partner = useSession((s) => s.partner);

  return (
    <Screen>
      <AppText variant="display" style={styles.title}>
        À deux
      </AppText>
      <AppText variant="body" color={Colors.textSecondary} style={styles.subtitle}>
        Vos petits rendez-vous partagés.
      </AppText>

      <View style={styles.list}>
        {TILES.map((t) => (
          <Link key={t.href} href={t.href} asChild>
            <Card style={styles.tile}>
              <AppText style={styles.emoji}>{t.emoji}</AppText>
              <View style={styles.tileText}>
                <AppText variant="subtitle">{t.title}</AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  {t.subtitle}
                </AppText>
              </View>
              <AppText variant="subtitle" color={Colors.secondary}>
                ›
              </AppText>
            </Card>
          </Link>
        ))}
      </View>

      <Card style={styles.settings}>
        <AppText variant="subtitle">Réglages</AppText>
        {!partner && couple ? (
          <View style={styles.inviteBox}>
            <AppText variant="caption" color={Colors.textMuted}>
              Partage ce code pour relier ton amour :
            </AppText>
            <AppText variant="mono" color={Colors.text} style={styles.code}>
              {couple.invite_code}
            </AppText>
          </View>
        ) : null}
        <Button
          label="Se déconnecter"
          variant="ghost"
          onPress={() => supabase.auth.signOut()}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: Spacing.sm },
  subtitle: { marginTop: 2, marginBottom: Spacing.lg },
  list: { gap: Spacing.md },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  emoji: { fontSize: 30 },
  tileText: { flex: 1, gap: 2 },
  settings: { marginTop: Spacing.xl, gap: Spacing.md },
  inviteBox: {
    backgroundColor: Colors.surfaceSunk,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  code: { fontSize: 24, letterSpacing: 4 },
});
