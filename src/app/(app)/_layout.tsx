/**
 * Disposition principale de l'app (une fois en couple).
 *
 * On a une barre d'onglets en bas (5 onglets), et par-dessus TOUS les écrans :
 *   - le bouton cœur flottant « Tu me manques » ;
 *   - le popup plein écran quand l'autre nous envoie un « Tu me manques ».
 */
import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { HeartButton } from '@/components/HeartButton';
import { MissYouOverlay } from '@/components/MissYouOverlay';
import { Colors, Fonts, Palette, Spacing } from '@/constants/theme';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>;
}

export default function AppLayout() {
  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.secondary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: { paddingTop: Spacing.xs },
          sceneStyle: { backgroundColor: Colors.background },
        }}>
        <Tabs.Screen
          name="accueil"
          options={{
            title: 'Accueil',
            tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="mots"
          options={{
            title: 'Mots',
            tabBarIcon: ({ focused }) => <TabIcon emoji="💌" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="adeux"
          options={{
            title: 'À deux',
            tabBarIcon: ({ focused }) => <TabIcon emoji="✨" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="album"
          options={{
            title: 'Album',
            tabBarIcon: ({ focused }) => <TabIcon emoji="🖼️" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="carte"
          options={{
            title: 'Carte',
            tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} />,
          }}
        />
      </Tabs>

      {/* Présents sur tous les onglets */}
      <HeartButton />
      <MissYouOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  tabBar: {
    backgroundColor: Palette.blanc,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 88,
    paddingBottom: 28,
    paddingTop: Spacing.xs,
  },
  tabLabel: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 11,
  },
});
