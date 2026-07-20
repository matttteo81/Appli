import React from 'react';
import { Tabs } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/typography';

type IconName = 'discover' | 'chats' | 'rooms' | 'profile';

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  const stroke = focused ? colors.bleu : colors.texteGris;
  const sw = focused ? 2.4 : 1.9;
  const common = {
    stroke,
    strokeWidth: sw,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      {name === 'discover' && (
        <>
          <Circle cx={12} cy={12} r={9} {...common} />
          <Path d="M15.5 8.5l-2 5-5 2 2-5z" {...common} />
        </>
      )}
      {name === 'chats' && (
        <Path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4 3v-3H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" {...common} />
      )}
      {name === 'rooms' && (
        <>
          <Path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" {...common} />
          <Path d="M5 11a7 7 0 0 0 14 0M12 18v3" {...common} />
        </>
      )}
      {name === 'profile' && (
        <>
          <Circle cx={12} cy={8} r={4} {...common} />
          <Path d="M4.5 20a7.5 7.5 0 0 1 15 0" {...common} />
        </>
      )}
    </Svg>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.bleu,
        tabBarInactiveTintColor: colors.texteGris,
        tabBarStyle: {
          backgroundColor: colors.carte,
          borderTopColor: colors.bordure,
          borderTopWidth: 1,
          height: 88,
          paddingTop: 8,
          paddingBottom: 12,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodySemiBold, fontSize: 11, marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Découvrir', tabBarIcon: ({ focused }) => <TabIcon name="discover" focused={focused} /> }}
      />
      <Tabs.Screen
        name="chats"
        options={{ title: 'Discussions', tabBarIcon: ({ focused }) => <TabIcon name="chats" focused={focused} /> }}
      />
      <Tabs.Screen
        name="rooms"
        options={{ title: 'Salons', tabBarIcon: ({ focused }) => <TabIcon name="rooms" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profil', tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} /> }}
      />
    </Tabs>
  );
}
