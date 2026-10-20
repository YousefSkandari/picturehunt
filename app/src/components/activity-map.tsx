import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';

import { fenceToCoords, type LatLng } from '@/lib/geo';
import type { NearbyActivity } from '@/lib/types';
import { colors, fonts } from '@/theme';

type Props = {
  activities: NearbyActivity[];
  me: LatLng | null;
  onSelect: (id: string) => void;
};

/** Dark city map with each activity's zone glowing gold, and a prize pin at its centre. */
export function ActivityMap({ activities, me, onSelect }: Props) {
  const centre = me ?? (activities[0] ? { latitude: activities[0].center_lat, longitude: activities[0].center_lng } : null);

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      userInterfaceStyle="dark"
      customMapStyle={darkStyle}
      showsUserLocation
      showsPointsOfInterests={false}
      initialRegion={
        centre ? { ...centre, latitudeDelta: 0.03, longitudeDelta: 0.03 } : { latitude: 51.5072, longitude: -0.1276, latitudeDelta: 0.2, longitudeDelta: 0.2 }
      }>
      {activities.map((a) => (
        <Polygon
          key={`zone-${a.id}`}
          coordinates={fenceToCoords(a.geofence)}
          strokeColor={colors.gold}
          strokeWidth={2}
          fillColor="rgba(255,200,61,0.14)"
          tappable
          onPress={() => onSelect(a.id)}
        />
      ))}
      {activities.map((a) => (
        <Marker
          key={`pin-${a.id}`}
          coordinate={{ latitude: a.center_lat, longitude: a.center_lng }}
          onPress={() => onSelect(a.id)}
          accessibilityLabel={a.title}>
          <View style={styles.pin}>
            <Text style={styles.pinLabel} numberOfLines={1}>
              {a.title}
            </Text>
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  pin: { maxWidth: 160, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.text },
  pinLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.ink },
});

// Google Maps style for Android; iOS uses userInterfaceStyle above.
const darkStyle = [
  { elementType: 'geometry', stylers: [{ color: '#120D27' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8E86B0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0E0A1F' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#22193F' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1A2350' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'park', elementType: 'geometry', stylers: [{ color: '#142B2A' }] },
];
