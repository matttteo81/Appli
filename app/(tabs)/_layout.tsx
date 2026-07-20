import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/typography';

type IconName = 'discover' | 'chats' | 'rooms' | 'profile';

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  const stroke = focused ? colors.bleu : colors.texteGris;
  const sw = focused ? 2.5 : 1.9;
  const common = {
    stroke,
    strokeWidth: sw,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <Svg width={25} height={25} viewBox="0 0 24 24">
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
        // Barre flottante « bulle » translucide (verre dépoli).
        tabBarStyle: {
          position: 'absolute',
          left: 18,
          right: 18,
          bottom: 26,
          height: 66,
          borderRadius: 33,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
          shadowColor: '#0B1B3A',
          shadowOpacity: 0.14,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          paddingHorizontal: 6,
        },
        tabBarBackground: () => <BlurView intensity={40} tint="light" style={styles.blur} />,
        tabBarItemStyle: { height: 66, paddingTop: 12, paddingBottom: 8 },
        tabBarLabelStyle: { fontFamily: fonts.bodySemiBold, fontSize: 10.5 },
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

const styles = StyleSheet.create({
  blur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 33,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
});
