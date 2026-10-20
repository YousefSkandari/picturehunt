import { Tabs } from 'expo-router';

import { GiftIcon, MapIcon, TrophyIcon } from '@/components/icons';
import { colors, fonts } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.ground, borderTopColor: colors.surfaceRaised },
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 12 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Shows', tabBarIcon: ({ color }) => <MapIcon color={String(color)} /> }} />
      <Tabs.Screen name="trophies" options={{ title: 'Trophies', tabBarIcon: ({ color }) => <TrophyIcon color={String(color)} /> }} />
      <Tabs.Screen name="prizes" options={{ title: 'Prizes', tabBarIcon: ({ color }) => <GiftIcon color={String(color)} /> }} />
    </Tabs>
  );
}
