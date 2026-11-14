import React, { useEffect, useState } from 'react';
import { Tabs, usePathname } from 'expo-router';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/typography';
import { TAB_BAR_HEIGHT, TAB_BAR_MARGIN, useTabBarBottom, useTabBarSpace } from '../../src/theme/tabBar';
import { MissYouButton } from '../../src/components/MissYouButton';
import { useAuth } from '../../src/store/auth';
import { supabase } from '../../src/lib/supabase';
import { loadTabBadges } from '../../src/lib/homeBadges';
import { useBadgeRefresh } from '../../src/store/badges';

/** Pastilles de non-lus des onglets (Messages, Album). */
function useTabBadges() {
  const couple = useAuth((s) => s.couple);
  const partner = useAuth((s) => s.partner);
  const tick = useBadgeRefresh((s) => s.tick);
  const refresh = useBadgeRefresh((s) => s.refresh);
  const [badges, setBadges] = useState({ messages: 0, album: 0 });

  useEffect(() => {
    let active = true;
    if (couple?.id) {
      loadTabBadges(couple.id, partner?.id).then((b) => { if (active) setBadges(b); });
    }
    return () => { active = false; };
  }, [couple?.id, partner?.id, tick]);

  // Nouveau message / photo de ta moitié → on recalcule.
  useEffect(() => {
    if (!couple?.id) return;
    const ch = supabase
      .channel(`tabbadges-${couple.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `couple_id=eq.${couple.id}` }, () => refresh())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'photos', filter: `couple_id=eq.${couple.id}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [couple?.id, refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    return () => sub.remove();
  }, [refresh]);

  return badges;
}

/**
 * Fond de la barre : verre dépoli (flou de ce qui défile dessous) + un voile
 * crème léger pour que les libellés restent lisibles sur n'importe quel fond.
 */
function TabBarGlass() {
  return (
    <View style={[StyleSheet.absoluteFill, glass.clip]}>
      <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, glass.veil]} />
    </View>
  );
}

const glass = StyleSheet.create({
  clip: {
    borderRadius: TAB_BAR_HEIGHT / 2,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  veil: { backgroundColor: 'rgba(251,246,239,0.62)' },
});

/** Icône d'onglet : un simple emoji, teinté quand actif. */
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 18, lineHeight: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

export default function TabsLayout() {
  const badges = useTabBadges();
  const pathname = usePathname();
  const onMessages = pathname === '/messages';
  const barBottom = useTabBarBottom();
  const barSpace = useTabBarSpace();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.prune,
          tabBarInactiveTintColor: colors.texteGris,
          // Pilule flottante : détachée des bords, arrondie, translucide.
          tabBarStyle: {
            position: 'absolute',
            left: 0,
            right: 0,
            marginHorizontal: TAB_BAR_MARGIN,
            bottom: barBottom,
            height: TAB_BAR_HEIGHT,
            paddingTop: 0,
            paddingBottom: 0,
            borderTopWidth: 0,
            borderRadius: TAB_BAR_HEIGHT / 2,
            backgroundColor: 'transparent',
            elevation: 0,
            shadowColor: '#1B1B3A',
            shadowOpacity: 0.16,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
          },
          tabBarBackground: () => <TabBarGlass />,
          // Onglet actif : une pastille douce, comme sur la barre d'iOS.
          tabBarActiveBackgroundColor: 'rgba(74,59,107,0.12)',
          tabBarItemStyle: {
            borderRadius: (TAB_BAR_HEIGHT - 8) / 2,
            marginVertical: 4,
            marginHorizontal: 3,
            overflow: 'hidden',
            // Pas de marge intérieure ici : le bouton d'onglet en a déjà une
            // (5 px haut/bas). 5 + 22 (icône) + 14 (libellé) + 5 = 46 ≤ 48.
            paddingTop: 0,
            paddingBottom: 0,
          },
          tabBarIconStyle: { height: 22, marginBottom: 0 },
          tabBarLabelStyle: {
            fontFamily: fonts.bodyMedium,
            fontSize: 10,
            lineHeight: 14,
            height: 14,
            marginTop: 0,
            marginBottom: 0,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Accueil',
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🏠" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarBadge: badges.messages > 0 ? (badges.messages > 9 ? '9+' : badges.messages) : undefined,
            tabBarBadgeStyle: { backgroundColor: '#E5484D', fontSize: 11 },
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="💬" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="activites"
          options={{
            title: 'Activités',
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🎮" focused={focused} />
            ),
          }}
        />
        {/* Regroupés dans « Activités » — masqués de la barre du bas */}
        <Tabs.Screen name="games" options={{ href: null }} />
        <Tabs.Screen name="playlist" options={{ href: null }} />
        <Tabs.Screen name="farm" options={{ href: null }} />
        <Tabs.Screen
          name="album"
          options={{
            title: 'Album',
            tabBarBadge: badges.album > 0 ? (badges.album > 9 ? '9+' : badges.album) : undefined,
            tabBarBadgeStyle: { backgroundColor: '#E5484D', fontSize: 11 },
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="📸" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: 'Carte',
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🗺️" focused={focused} />
            ),
          }}
        />
      </Tabs>

      {/* Cœur flottant « Tu me manques » — masqué sur Messages où il est déjà
          dans le header (pour éviter le doublon). */}
      {!onMessages ? <MissYouButton bottom={barSpace + 12} /> : null}
    </View>
  );
}
