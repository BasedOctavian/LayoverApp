export interface EventPreferences {
  likesBars: boolean;
  prefersSmallGroups: boolean;
  prefersWeekendEvents: boolean;
  prefersEveningEvents: boolean;
  prefersIndoorVenues: boolean;
  prefersStructuredActivities: boolean;
  prefersSpontaneousPlans: boolean;
  prefersLocalMeetups: boolean;
  prefersTravelEvents: boolean;
  prefersQuietEnvironments: boolean;
  prefersActiveLifestyles: boolean;
  prefersIntellectualDiscussions: boolean;
}

export interface WeightedPreference {
  key: keyof EventPreferences;
  weight: number; // 0 to 1
}

export interface PingTemplate {
  id: string;
  label: string;
  description: string;
  icon: string;
  preferenceWeights: WeightedPreference[];
  dominantAxis?: 'spontaneous' | 'structured' | 'chill' | 'active' | 'small-group' | 'social-scene';
}

export interface PingCategory {
  id: string;
  label: string;
  icon: string;
  connectionIntents: string[];
  templates: PingTemplate[];
}



export interface PingFormData {
  title: string;
  description: string;
  location: string;
  category: string;
  template: string;
  interests: string;
  duration: string;
  maxParticipants: string;
  pingType: string;
  visibilityRadius: string;
  connectionIntents: string[];
  eventPreferences: EventPreferences;
} 