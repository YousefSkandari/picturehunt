// Shapes returned by the Supabase RPCs in supabase/migrations.

export type GeoJsonPolygon = { type: 'Polygon'; coordinates: number[][][] };

export type NearbyActivity = {
  id: string;
  title: string;
  category: string;
  sponsor: string | null;
  starts_at: string;
  ends_at: string;
  draw_at: string;
  distance_m: number;
  center_lat: number;
  center_lng: number;
  geofence: GeoJsonPolygon;
  participant_count: number;
  max_participants: number | null;
};

export type Reward = { id: string; kind: 'cash' | 'discount_code' | 'other'; title: string; quantity: number; rank: number };

export type Participation = {
  id: string;
  contestant_number: number;
  status: 'joined' | 'verified' | 'flagged' | 'rejected';
};

export type Submission = {
  id: string;
  status: 'verified' | 'flagged' | 'rejected';
  reasons: string[];
};

export type Prize = {
  win_id: string;
  activity_id: string;
  activity_title: string;
  reward_title: string;
  kind: Reward['kind'];
  code: string | null;
  drawn_at: string;
  redeemed_at: string | null;
};

export type Profile = { id: string; stage_name: string | null; avatar: string; stars: number };

export type ActivityDetail = {
  id: string;
  title: string;
  description: string;
  category: string;
  proof_instructions: string;
  sponsor: string | null;
  starts_at: string;
  ends_at: string;
  draw_at: string;
  drawn_at: string | null;
  stars_reward: number;
  max_participants: number | null;
  geofence: GeoJsonPolygon;
  center_lat: number;
  center_lng: number;
  participant_count: number;
  rewards: Reward[];
  participation: Participation | null;
};
