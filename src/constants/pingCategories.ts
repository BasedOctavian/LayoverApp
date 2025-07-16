import { PingCategory, WeightedPreference } from '../types/pingTypes';

export const CONNECTION_INTENTS = [
  "Bar Hopping & Nightlife",
  "Sports & Athletics", 
  "Outdoor Adventures",
  "Networking & Business",
  "Creative Projects",
  "Deep Discussions",
  "Food & Dining",
  "Music & Concerts",
  "Travel & Exploration",
  "Gaming & Entertainment",
  "Fitness & Wellness",
  "Art & Culture",
  "Technology & Innovation",
  "Volunteering & Community",
  "Learning & Education",
  "Photography & Media",
  "Dancing & Social Events",
  "Board Games & Strategy",
  "Coffee & Casual Meetups",
  "Festivals & Events"
].sort();

export const PING_CATEGORIES: PingCategory[] = [
  {
    id: 'sports',
    label: 'Sports & Games',
    icon: 'sports-basketball',
    connectionIntents: ['Sports & Athletics', 'Fitness & Wellness'],
    templates: [
      {
        id: 'basketball',
        label: 'Basketball Game',
        description: 'Need players for a pickup game',
        icon: 'sports-basketball',
        dominantAxis: 'active',
        preferenceWeights: [
          { key: 'prefersActiveLifestyles', weight: 0.9 },
          { key: 'prefersWeekendEvents', weight: 0.7 },
          { key: 'prefersStructuredActivities', weight: 0.6 },
          { key: 'prefersSmallGroups', weight: 0.5 },
          { key: 'prefersSpontaneousPlans', weight: 0.4 }
        ]
      },
      {
        id: 'soccer',
        label: 'Soccer Match',
        description: 'Looking for soccer players',
        icon: 'sports-soccer',
        dominantAxis: 'active',
        preferenceWeights: [
          { key: 'prefersActiveLifestyles', weight: 0.9 },
          { key: 'prefersWeekendEvents', weight: 0.7 },
          { key: 'prefersStructuredActivities', weight: 0.6 },
          { key: 'prefersSmallGroups', weight: 0.4 }
        ]
      },
      {
        id: 'tennis',
        label: 'Tennis Partner',
        description: 'Need a tennis partner',
        icon: 'sports-tennis',
        dominantAxis: 'active',
        preferenceWeights: [
          { key: 'prefersActiveLifestyles', weight: 0.8 },
          { key: 'prefersSmallGroups', weight: 0.9 },
          { key: 'prefersStructuredActivities', weight: 0.7 },
          { key: 'prefersWeekendEvents', weight: 0.6 }
        ]
      },
      {
        id: 'gym',
        label: 'Gym Buddy',
        description: 'Looking for a workout partner',
        icon: 'fitness-center',
        dominantAxis: 'active',
        preferenceWeights: [
          { key: 'prefersActiveLifestyles', weight: 0.9 },
          { key: 'prefersSmallGroups', weight: 0.8 },
          { key: 'prefersStructuredActivities', weight: 0.7 },
          { key: 'prefersIndoorVenues', weight: 0.6 }
        ]
      },
      {
        id: 'running',
        label: 'Running Partner',
        description: 'Need someone to run with',
        icon: 'directions-run',
        dominantAxis: 'active',
        preferenceWeights: [
          { key: 'prefersActiveLifestyles', weight: 0.9 },
          { key: 'prefersSmallGroups', weight: 0.8 },
          { key: 'prefersSpontaneousPlans', weight: 0.6 },
          { key: 'prefersLocalMeetups', weight: 0.5 }
        ]
      },
      {
        id: 'volleyball',
        label: 'Volleyball Game',
        description: 'Need volleyball players',
        icon: 'sports-volleyball',
        dominantAxis: 'active',
        preferenceWeights: [
          { key: 'prefersActiveLifestyles', weight: 0.8 },
          { key: 'prefersWeekendEvents', weight: 0.7 },
          { key: 'prefersStructuredActivities', weight: 0.6 },
          { key: 'prefersSmallGroups', weight: 0.5 }
        ]
      }
    ]
  },
  {
    id: 'food',
    label: 'Food & Drink',
    icon: 'restaurant',
    connectionIntents: ['Food & Dining', 'Coffee & Casual Meetups'],
    templates: [
      {
        id: 'dinner',
        label: 'Dinner Plans',
        description: 'Looking for dinner company',
        icon: 'restaurant',
        dominantAxis: 'social-scene',
        preferenceWeights: [
          { key: 'likesBars', weight: 0.7 },
          { key: 'prefersEveningEvents', weight: 0.8 },
          { key: 'prefersSmallGroups', weight: 0.6 },
          { key: 'prefersLocalMeetups', weight: 0.5 }
        ]
      },
      {
        id: 'lunch',
        label: 'Lunch Meetup',
        description: 'Need lunch companions',
        icon: 'lunch-dining',
        dominantAxis: 'small-group',
        preferenceWeights: [
          { key: 'prefersSmallGroups', weight: 0.8 },
          { key: 'prefersLocalMeetups', weight: 0.7 },
          { key: 'prefersStructuredActivities', weight: 0.5 }
        ]
      },
      {
        id: 'coffee',
        label: 'Coffee Chat',
        description: 'Want to grab coffee',
        icon: 'coffee',
        dominantAxis: 'chill',
        preferenceWeights: [
          { key: 'prefersQuietEnvironments', weight: 0.8 },
          { key: 'prefersSmallGroups', weight: 0.7 },
          { key: 'prefersLocalMeetups', weight: 0.6 },
          { key: 'prefersIntellectualDiscussions', weight: 0.5 }
        ]
      },
      {
        id: 'brunch',
        label: 'Brunch Plans',
        description: 'Looking for brunch buddies',
        icon: 'brunch-dining',
        dominantAxis: 'social-scene',
        preferenceWeights: [
          { key: 'prefersWeekendEvents', weight: 0.8 },
          { key: 'prefersSmallGroups', weight: 0.6 },
          { key: 'prefersLocalMeetups', weight: 0.5 }
        ]
      },
      {
        id: 'food-tour',
        label: 'Food Tour',
        description: 'Exploring local cuisine',
        icon: 'explore',
        dominantAxis: 'social-scene',
        preferenceWeights: [
          { key: 'prefersTravelEvents', weight: 0.7 },
          { key: 'prefersSpontaneousPlans', weight: 0.6 },
          { key: 'prefersActiveLifestyles', weight: 0.5 },
          { key: 'prefersSmallGroups', weight: 0.4 }
        ]
      },
      {
        id: 'cooking',
        label: 'Cooking Together',
        description: 'Want to cook a meal',
        icon: 'kitchen',
        dominantAxis: 'small-group',
        preferenceWeights: [
          { key: 'prefersSmallGroups', weight: 0.9 },
          { key: 'prefersIndoorVenues', weight: 0.7 },
          { key: 'prefersStructuredActivities', weight: 0.6 },
          { key: 'prefersLocalMeetups', weight: 0.5 }
        ]
      }
    ]
  },
  {
    id: 'social',
    label: 'Social',
    icon: 'people',
    connectionIntents: ['Coffee & Casual Meetups', 'Deep Discussions'],
    templates: [
      {
        id: 'hangout',
        label: 'Casual Hangout',
        description: 'Just want to hang out',
        icon: 'people',
        dominantAxis: 'chill',
        preferenceWeights: [
          { key: 'prefersSpontaneousPlans', weight: 0.8 },
          { key: 'prefersSmallGroups', weight: 0.6 },
          { key: 'prefersLocalMeetups', weight: 0.5 }
        ]
      },
      {
        id: 'conversation',
        label: 'Deep Conversation',
        description: 'Looking for meaningful chat',
        icon: 'chat',
        dominantAxis: 'chill',
        preferenceWeights: [
          { key: 'prefersIntellectualDiscussions', weight: 0.9 },
          { key: 'prefersQuietEnvironments', weight: 0.8 },
          { key: 'prefersSmallGroups', weight: 0.7 }
        ]
      },
      {
        id: 'board-games',
        label: 'Board Games',
        description: 'Want to play board games',
        icon: 'casino',
        dominantAxis: 'small-group',
        preferenceWeights: [
          { key: 'prefersIndoorVenues', weight: 0.8 },
          { key: 'prefersSmallGroups', weight: 0.8 },
          { key: 'prefersStructuredActivities', weight: 0.6 }
        ]
      },
      {
        id: 'walk',
        label: 'Walk & Talk',
        description: 'Going for a walk',
        icon: 'directions-walk',
        dominantAxis: 'chill',
        preferenceWeights: [
          { key: 'prefersQuietEnvironments', weight: 0.7 },
          { key: 'prefersSmallGroups', weight: 0.7 },
          { key: 'prefersLocalMeetups', weight: 0.6 },
          { key: 'prefersActiveLifestyles', weight: 0.4 }
        ]
      },
      {
        id: 'park',
        label: 'Park Meetup',
        description: 'Meeting at the park',
        icon: 'park',
        dominantAxis: 'chill',
        preferenceWeights: [
          { key: 'prefersQuietEnvironments', weight: 0.7 },
          { key: 'prefersLocalMeetups', weight: 0.6 },
          { key: 'prefersSmallGroups', weight: 0.5 }
        ]
      },
      {
        id: 'picnic',
        label: 'Picnic',
        description: 'Having a picnic',
        icon: 'outdoor-grill',
        dominantAxis: 'chill',
        preferenceWeights: [
          { key: 'prefersQuietEnvironments', weight: 0.8 },
          { key: 'prefersSmallGroups', weight: 0.7 },
          { key: 'prefersWeekendEvents', weight: 0.6 },
          { key: 'prefersLocalMeetups', weight: 0.5 }
        ]
      }
    ]
  },
  {
    id: 'business',
    label: 'Business',
    icon: 'business',
    connectionIntents: ['Networking & Business', 'Technology & Innovation'],
    templates: [
      {
        id: 'networking',
        label: 'Networking',
        description: 'Professional networking',
        icon: 'business',
        dominantAxis: 'structured',
        preferenceWeights: [
          { key: 'prefersStructuredActivities', weight: 0.8 },
          { key: 'prefersIntellectualDiscussions', weight: 0.7 },
          { key: 'prefersLocalMeetups', weight: 0.6 },
          { key: 'prefersSmallGroups', weight: 0.5 }
        ]
      },
      {
        id: 'coworking',
        label: 'Co-working',
        description: 'Looking for co-working space',
        icon: 'work',
        dominantAxis: 'structured',
        preferenceWeights: [
          { key: 'prefersStructuredActivities', weight: 0.9 },
          { key: 'prefersIndoorVenues', weight: 0.7 },
          { key: 'prefersQuietEnvironments', weight: 0.6 },
          { key: 'prefersSmallGroups', weight: 0.4 }
        ]
      },
      {
        id: 'meeting',
        label: 'Business Meeting',
        description: 'Professional meeting',
        icon: 'meeting-room',
        dominantAxis: 'structured',
        preferenceWeights: [
          { key: 'prefersStructuredActivities', weight: 0.9 },
          { key: 'prefersIndoorVenues', weight: 0.8 },
          { key: 'prefersSmallGroups', weight: 0.6 }
        ]
      },
      {
        id: 'mentorship',
        label: 'Mentorship',
        description: 'Seeking or offering mentorship',
        icon: 'school',
        dominantAxis: 'structured',
        preferenceWeights: [
          { key: 'prefersIntellectualDiscussions', weight: 0.9 },
          { key: 'prefersStructuredActivities', weight: 0.8 },
          { key: 'prefersSmallGroups', weight: 0.8 },
          { key: 'prefersQuietEnvironments', weight: 0.6 }
        ]
      },
      {
        id: 'collaboration',
        label: 'Collaboration',
        description: 'Looking for collaborators',
        icon: 'group-work',
        dominantAxis: 'structured',
        preferenceWeights: [
          { key: 'prefersStructuredActivities', weight: 0.8 },
          { key: 'prefersIntellectualDiscussions', weight: 0.7 },
          { key: 'prefersSmallGroups', weight: 0.6 }
        ]
      },
      {
        id: 'conference',
        label: 'Conference',
        description: 'Attending a conference',
        icon: 'event',
        dominantAxis: 'social-scene',
        preferenceWeights: [
          { key: 'prefersStructuredActivities', weight: 0.8 },
          { key: 'prefersIntellectualDiscussions', weight: 0.7 },
          { key: 'prefersTravelEvents', weight: 0.6 }
        ]
      }
    ]
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    icon: 'theater-comedy',
    connectionIntents: ['Music & Concerts', 'Gaming & Entertainment', 'Dancing & Social Events'],
    templates: [
      {
        id: 'movie',
        label: 'Movie Night',
        description: 'Going to see a movie',
        icon: 'movie',
        dominantAxis: 'social-scene',
        preferenceWeights: [
          { key: 'prefersEveningEvents', weight: 0.8 },
          { key: 'prefersIndoorVenues', weight: 0.7 },
          { key: 'prefersSmallGroups', weight: 0.6 },
          { key: 'prefersQuietEnvironments', weight: 0.5 }
        ]
      },
      {
        id: 'concert',
        label: 'Concert',
        description: 'Going to a concert',
        icon: 'music-note',
        dominantAxis: 'social-scene',
        preferenceWeights: [
          { key: 'prefersEveningEvents', weight: 0.8 },
          { key: 'prefersActiveLifestyles', weight: 0.6 },
          { key: 'prefersTravelEvents', weight: 0.5 }
        ]
      },
      {
        id: 'karaoke',
        label: 'Karaoke Night',
        description: 'Singing karaoke',
        icon: 'mic',
        dominantAxis: 'social-scene',
        preferenceWeights: [
          { key: 'likesBars', weight: 0.8 },
          { key: 'prefersEveningEvents', weight: 0.8 },
          { key: 'prefersActiveLifestyles', weight: 0.6 }
        ]
      },
      {
        id: 'gaming',
        label: 'Gaming Session',
        description: 'Playing video games',
        icon: 'sports-esports',
        dominantAxis: 'small-group',
        preferenceWeights: [
          { key: 'prefersIndoorVenues', weight: 0.8 },
          { key: 'prefersSmallGroups', weight: 0.7 },
          { key: 'prefersStructuredActivities', weight: 0.5 }
        ]
      },
      {
        id: 'dancing',
        label: 'Dancing',
        description: 'Going dancing',
        icon: 'music-note',
        dominantAxis: 'social-scene',
        preferenceWeights: [
          { key: 'likesBars', weight: 0.8 },
          { key: 'prefersEveningEvents', weight: 0.8 },
          { key: 'prefersActiveLifestyles', weight: 0.7 }
        ]
      },
      {
        id: 'comedy',
        label: 'Comedy Show',
        description: 'Going to a comedy show',
        icon: 'theater-comedy',
        dominantAxis: 'social-scene',
        preferenceWeights: [
          { key: 'prefersEveningEvents', weight: 0.8 },
          { key: 'prefersIndoorVenues', weight: 0.7 },
          { key: 'prefersSmallGroups', weight: 0.5 }
        ]
      }
    ]
  },
  {
    id: 'wellness',
    label: 'Wellness',
    icon: 'self-improvement',
    connectionIntents: ['Fitness & Wellness', 'Outdoor Adventures'],
    templates: [
      {
        id: 'yoga',
        label: 'Yoga Session',
        description: 'Looking for yoga partners',
        icon: 'self-improvement',
        dominantAxis: 'chill',
        preferenceWeights: [
          { key: 'prefersActiveLifestyles', weight: 0.8 },
          { key: 'prefersQuietEnvironments', weight: 0.8 },
          { key: 'prefersSmallGroups', weight: 0.6 },
          { key: 'prefersStructuredActivities', weight: 0.6 }
        ]
      },
      {
        id: 'meditation',
        label: 'Meditation',
        description: 'Group meditation session',
        icon: 'spa',
        dominantAxis: 'chill',
        preferenceWeights: [
          { key: 'prefersQuietEnvironments', weight: 0.9 },
          { key: 'prefersSmallGroups', weight: 0.7 },
          { key: 'prefersStructuredActivities', weight: 0.6 }
        ]
      },
      {
        id: 'hiking',
        label: 'Hiking Trip',
        description: 'Going hiking',
        icon: 'terrain',
        dominantAxis: 'active',
        preferenceWeights: [
          { key: 'prefersActiveLifestyles', weight: 0.9 },
          { key: 'prefersTravelEvents', weight: 0.7 },
          { key: 'prefersSpontaneousPlans', weight: 0.6 },
          { key: 'prefersWeekendEvents', weight: 0.5 }
        ]
      },
      {
        id: 'swimming',
        label: 'Swimming',
        description: 'Going swimming',
        icon: 'pool',
        dominantAxis: 'active',
        preferenceWeights: [
          { key: 'prefersActiveLifestyles', weight: 0.8 },
          { key: 'prefersIndoorVenues', weight: 0.6 },
          { key: 'prefersSmallGroups', weight: 0.5 }
        ]
      },
      {
        id: 'cycling',
        label: 'Cycling',
        description: 'Going for a bike ride',
        icon: 'directions-bike',
        dominantAxis: 'active',
        preferenceWeights: [
          { key: 'prefersActiveLifestyles', weight: 0.9 },
          { key: 'prefersSpontaneousPlans', weight: 0.6 },
          { key: 'prefersSmallGroups', weight: 0.5 },
          { key: 'prefersLocalMeetups', weight: 0.4 }
        ]
      },
      {
        id: 'pilates',
        label: 'Pilates Class',
        description: 'Looking for pilates partners',
        icon: 'fitness-center',
        dominantAxis: 'active',
        preferenceWeights: [
          { key: 'prefersActiveLifestyles', weight: 0.8 },
          { key: 'prefersStructuredActivities', weight: 0.7 },
          { key: 'prefersSmallGroups', weight: 0.6 },
          { key: 'prefersIndoorVenues', weight: 0.6 }
        ]
      }
    ]
  },
  {
    id: 'learning',
    label: 'Learning',
    icon: 'school',
    connectionIntents: ['Learning & Education', 'Technology & Innovation', 'Art & Culture'],
    templates: [
      {
        id: 'study',
        label: 'Study Group',
        description: 'Forming a study group',
        icon: 'school',
        dominantAxis: 'structured',
        preferenceWeights: [
          { key: 'prefersStructuredActivities', weight: 0.9 },
          { key: 'prefersIntellectualDiscussions', weight: 0.8 },
          { key: 'prefersSmallGroups', weight: 0.7 },
          { key: 'prefersQuietEnvironments', weight: 0.6 }
        ]
      },
      {
        id: 'language',
        label: 'Language Exchange',
        description: 'Language practice',
        icon: 'translate',
        dominantAxis: 'structured',
        preferenceWeights: [
          { key: 'prefersIntellectualDiscussions', weight: 0.8 },
          { key: 'prefersStructuredActivities', weight: 0.7 },
          { key: 'prefersSmallGroups', weight: 0.6 }
        ]
      },
      {
        id: 'workshop',
        label: 'Workshop',
        description: 'Attending a workshop',
        icon: 'build',
        dominantAxis: 'structured',
        preferenceWeights: [
          { key: 'prefersStructuredActivities', weight: 0.9 },
          { key: 'prefersIntellectualDiscussions', weight: 0.8 },
          { key: 'prefersIndoorVenues', weight: 0.6 }
        ]
      },
      {
        id: 'book-club',
        label: 'Book Club',
        description: 'Book discussion',
        icon: 'book',
        dominantAxis: 'chill',
        preferenceWeights: [
          { key: 'prefersIntellectualDiscussions', weight: 0.9 },
          { key: 'prefersQuietEnvironments', weight: 0.7 },
          { key: 'prefersSmallGroups', weight: 0.6 }
        ]
      },
      {
        id: 'skill-share',
        label: 'Skill Sharing',
        description: 'Sharing skills',
        icon: 'psychology',
        dominantAxis: 'structured',
        preferenceWeights: [
          { key: 'prefersIntellectualDiscussions', weight: 0.8 },
          { key: 'prefersStructuredActivities', weight: 0.7 },
          { key: 'prefersSmallGroups', weight: 0.6 }
        ]
      },
      {
        id: 'lecture',
        label: 'Lecture',
        description: 'Attending a lecture',
        icon: 'record-voice-over',
        dominantAxis: 'structured',
        preferenceWeights: [
          { key: 'prefersIntellectualDiscussions', weight: 0.9 },
          { key: 'prefersStructuredActivities', weight: 0.8 },
          { key: 'prefersIndoorVenues', weight: 0.7 },
          { key: 'prefersQuietEnvironments', weight: 0.6 }
        ]
      }
    ]
  },
  {
    id: 'other',
    label: 'Other',
    icon: 'category',
    connectionIntents: ['Creative Projects', 'Volunteering & Community'],
    templates: [
      {
        id: 'volunteer',
        label: 'Volunteering',
        description: 'Looking for volunteers',
        icon: 'volunteer-activism',
        dominantAxis: 'structured',
        preferenceWeights: [
          { key: 'prefersStructuredActivities', weight: 0.8 },
          { key: 'prefersLocalMeetups', weight: 0.7 },
          { key: 'prefersSmallGroups', weight: 0.5 }
        ]
      },
      {
        id: 'creative',
        label: 'Creative Project',
        description: 'Working on creative project',
        icon: 'brush',
        dominantAxis: 'small-group',
        preferenceWeights: [
          { key: 'prefersSmallGroups', weight: 0.8 },
          { key: 'prefersStructuredActivities', weight: 0.6 },
          { key: 'prefersIndoorVenues', weight: 0.5 }
        ]
      },
      {
        id: 'photography',
        label: 'Photography',
        description: 'Photography session',
        icon: 'camera-alt',
        dominantAxis: 'spontaneous',
        preferenceWeights: [
          { key: 'prefersSpontaneousPlans', weight: 0.8 },
          { key: 'prefersSmallGroups', weight: 0.6 },
          { key: 'prefersTravelEvents', weight: 0.5 }
        ]
      },
      {
        id: 'travel',
        label: 'Travel Buddy',
        description: 'Looking for travel companions',
        icon: 'flight',
        dominantAxis: 'spontaneous',
        preferenceWeights: [
          { key: 'prefersTravelEvents', weight: 0.9 },
          { key: 'prefersSpontaneousPlans', weight: 0.7 },
          { key: 'prefersSmallGroups', weight: 0.5 }
        ]
      },
      {
        id: 'custom',
        label: 'Custom Event',
        description: 'Something else',
        icon: 'add-circle',
        dominantAxis: 'spontaneous',
        preferenceWeights: [
          { key: 'prefersSpontaneousPlans', weight: 0.6 },
          { key: 'prefersSmallGroups', weight: 0.5 }
        ]
      },
      {
        id: 'festival',
        label: 'Festival',
        description: 'Going to a festival',
        icon: 'festival',
        dominantAxis: 'social-scene',
        preferenceWeights: [
          { key: 'prefersActiveLifestyles', weight: 0.8 },
          { key: 'prefersSpontaneousPlans', weight: 0.7 },
          { key: 'prefersTravelEvents', weight: 0.6 }
        ]
      }
    ]
  }
];

export const getCategoryById = (id: string): PingCategory | undefined => {
  return PING_CATEGORIES.find(category => category.id === id);
};

export const getTemplateById = (categoryId: string, templateId: string) => {
  const category = getCategoryById(categoryId);
  return category?.templates.find(template => template.id === templateId);
}; 