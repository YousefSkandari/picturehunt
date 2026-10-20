import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { LatLng } from '@/lib/geo';
import type { NearbyActivity } from '@/lib/types';
import { colors, fonts } from '@/theme';

type Props = {
  activities: NearbyActivity[];
  me: LatLng | null;
  onSelect: (id: string) => void;
};

/** react-native-maps has no web build, so the web preview shows the zones as a list. */
export function ActivityMap({ activities, onSelect }: Props) {
  return (
    <ScrollView style={StyleSheet.absoluteFill} contentContainerStyle={styles.list}>
      <Text style={styles.note}>The map runs on iOS and Android. Zones near you:</Text>
      {activities.map((a) => (
        <Pressable key={a.id} onPress={() => onSelect(a.id)} style={styles.row}>
          <View style={styles.dot} />
          <Text style={styles.title}>{a.title}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 150, paddingHorizontal: 20, gap: 10, backgroundColor: colors.map, minHeight: '100%' },
  note: { fontFamily: fonts.body, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.surface },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.gold },
  title: { fontFamily: fonts.bodyBold, color: colors.text },
});
