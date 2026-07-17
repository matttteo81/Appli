import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/typography';

/** Icône d'onglet : un emoji, teinté quand actif. */
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
  );
}

export default function TabsLayout() {
  return (
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
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Découvrir',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🧭" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Discussions',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: 'Salons',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎙️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
