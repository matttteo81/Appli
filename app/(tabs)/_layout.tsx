import React from 'react';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/typography';
import { MissYouButton } from '../../src/components/MissYouButton';

/** Icône d'onglet : un simple emoji, teinté quand actif. */
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

export default function TabsLayout() {
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
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="💬" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="games"
          options={{
            title: 'Jeux',
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🎮" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="pet"
          options={{
            title: 'Oiseau',
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🐣" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="album"
          options={{
            title: 'Album',
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
        <Tabs.Screen
          name="playlist"
          options={{
            title: 'Playlist',
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🎵" focused={focused} />
            ),
          }}
        />
      </Tabs>

      {/* Bouton cœur flottant, visible au-dessus de tous les onglets. */}
      <MissYouButton bottom={100} />
    </View>
  );
}
