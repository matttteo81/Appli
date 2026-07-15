import { Stack } from 'expo-router';

import { Colors, Fonts } from '@/constants/theme';

export default function ADeuxLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerShadowVisible: false,
        headerTintColor: Colors.secondary,
        headerTitleStyle: { fontFamily: Fonts.serif, color: Colors.text },
        contentStyle: { backgroundColor: Colors.background },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="rituels" options={{ title: 'Rituels' }} />
      <Stack.Screen name="oiseau" options={{ title: 'Notre oiseau' }} />
      <Stack.Screen name="playlist" options={{ title: 'Playlist' }} />
    </Stack>
  );
}
