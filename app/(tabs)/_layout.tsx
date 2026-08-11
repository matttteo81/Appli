import React, { useEffect, useState } from 'react';
import { Tabs, usePathname } from 'expo-router';
import { AppState, Text, View } from 'react-native';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/typography';
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

/** Icône d'onglet : un simple emoji, teinté quand actif. */
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

export default function TabsLayout() {
  const badges = useTabBadges();
  const pathname = usePathname();
  const onMessages = pathname === '/messages';

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.prune,
          tabBarInactiveTintColor: colors.texteGris,
          tabBarStyle: {
            backgroundColor: colors.creme,
            borderTopColor: colors.bordure,
            height: 84,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontFamily: fonts.bodyMedium,
            fontSize: 10,
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
      {!onMessages ? <MissYouButton bottom={100} /> : null}
    </View>
  );
}
