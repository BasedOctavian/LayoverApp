export interface UserData {
  availabilitySchedule?: {
    [key: string]: {
      start: string;
      end: string;
    };
  };
  availableNow?: boolean;
  connectionIntents?: string[];
  currentCity?: string | null;
  eventPreferences?: {
    likesBars?: boolean | null;
    prefersSmallGroups?: boolean | null;
  };
  groupAffiliations?: string[];
  lastKnownCoordinates?: {
    latitude: number;
    longitude: number;
  } | null;
  personalTags?: string[];
  preferredMeetupRadius?: number | null;
  [key: string]: any;
}

export const isProfileComplete = (userData: UserData | null): boolean => {
  console.log('🔍 Profile Completion Check - Starting...');
  if (!userData) {
    console.log('❌ Profile Completion Check - No user data provided');
    return false;
  }

  // Check if availabilitySchedule exists and has valid times (not all 00:00)
  const hasValidAvailabilitySchedule = (): boolean => {
    if (!userData.availabilitySchedule) {
      console.log('❌ Profile Completion Check - No availabilitySchedule');
      return false;
    }
    
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    let hasValidDay = false;
    
    for (const day of days) {
      const daySchedule = userData.availabilitySchedule[day];
      if (daySchedule && daySchedule.start && daySchedule.end) {
        // Check if start and end are different, and end is not 00:00
        if (daySchedule.start !== daySchedule.end && daySchedule.end !== '00:00' && daySchedule.end !== '0:00') {
          hasValidDay = true;
          break;
        }
      }
    }
    
    console.log(`📅 Profile Completion Check - Availability Schedule: ${hasValidDay ? '✅' : '❌'}`);
    return hasValidDay;
  };

  // Check if currentCity is set
  const hasCurrentCity = (): boolean => {
    const result = !!userData.currentCity && userData.currentCity.trim() !== '';
    console.log(`🏙️ Profile Completion Check - Current City: ${result ? '✅' : '❌'} (${userData.currentCity || 'null'})`);
    return result;
  };

  // Check if lastKnownCoordinates is set
  const hasLastKnownCoordinates = (): boolean => {
    const result = !!userData.lastKnownCoordinates && 
           typeof userData.lastKnownCoordinates.latitude === 'number' &&
           typeof userData.lastKnownCoordinates.longitude === 'number';
    console.log(`📍 Profile Completion Check - Last Known Coordinates: ${result ? '✅' : '❌'} (${JSON.stringify(userData.lastKnownCoordinates)})`);
    return result;
  };

  // Check if connectionIntents is set and not empty
  const hasConnectionIntents = (): boolean => {
    const result = Array.isArray(userData.connectionIntents) && userData.connectionIntents.length > 0;
    console.log(`🎯 Profile Completion Check - Connection Intents: ${result ? '✅' : '❌'} (${userData.connectionIntents?.length || 0} items)`);
    return result;
  };

  // Check if eventPreferences is set with valid values
  const hasEventPreferences = (): boolean => {
    if (!userData.eventPreferences) {
      console.log('❌ Profile Completion Check - No eventPreferences');
      return false;
    }
    const result = userData.eventPreferences.likesBars !== null || 
           userData.eventPreferences.prefersSmallGroups !== null;
    console.log(`🎪 Profile Completion Check - Event Preferences: ${result ? '✅' : '❌'} (${JSON.stringify(userData.eventPreferences)})`);
    return result;
  };

  // Check if personalTags is set and not empty
  const hasPersonalTags = (): boolean => {
    const result = Array.isArray(userData.personalTags) && userData.personalTags.length > 0;
    console.log(`🏷️ Profile Completion Check - Personal Tags: ${result ? '✅' : '❌'} (${userData.personalTags?.length || 0} items)`);
    return result;
  };

  // Check if preferredMeetupRadius is set
  const hasPreferredMeetupRadius = (): boolean => {
    const result = userData.preferredMeetupRadius !== null && 
           userData.preferredMeetupRadius !== undefined &&
           userData.preferredMeetupRadius > 0;
    console.log(`📏 Profile Completion Check - Preferred Meetup Radius: ${result ? '✅' : '❌'} (${userData.preferredMeetupRadius})`);
    return result;
  };

  // Check if groupAffiliations is set (can be empty array)
  const hasGroupAffiliations = (): boolean => {
    const result = Array.isArray(userData.groupAffiliations);
    console.log(`👥 Profile Completion Check - Group Affiliations: ${result ? '✅' : '❌'} (${JSON.stringify(userData.groupAffiliations)})`);
    return result;
  };

  // Check if availableNow is set
  const hasAvailableNow = (): boolean => {
    const result = typeof userData.availableNow === 'boolean';
    console.log(`⏰ Profile Completion Check - Available Now: ${result ? '✅' : '❌'} (${userData.availableNow})`);
    return result;
  };

  const finalResult = (
    hasValidAvailabilitySchedule() &&
    hasCurrentCity() &&
    hasLastKnownCoordinates() &&
    hasConnectionIntents() &&
    hasEventPreferences() &&
    hasPersonalTags() &&
    hasPreferredMeetupRadius() &&
    hasGroupAffiliations() &&
    hasAvailableNow()
  );
  
  console.log(`🎯 Profile Completion Check - FINAL RESULT: ${finalResult ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
  return finalResult;
};

export const getMissingFields = (userData: UserData | null): string[] => {
  if (!userData) return ['profile'];

  const missingFields: string[] = [];

  // Check availabilitySchedule
  if (!userData.availabilitySchedule) {
    missingFields.push('availabilitySchedule');
  } else {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    let hasValidDay = false;
    
    for (const day of days) {
      const daySchedule = userData.availabilitySchedule[day];
      if (daySchedule && daySchedule.start && daySchedule.end) {
        if (daySchedule.start !== daySchedule.end && daySchedule.end !== '00:00' && daySchedule.end !== '0:00') {
          hasValidDay = true;
          break;
        }
      }
    }
    
    if (!hasValidDay) {
      missingFields.push('availabilitySchedule');
    }
  }

  // Check currentCity
  if (!userData.currentCity || userData.currentCity.trim() === '') {
    missingFields.push('currentCity');
  }

  // Check lastKnownCoordinates
  if (!userData.lastKnownCoordinates || 
      typeof userData.lastKnownCoordinates.latitude !== 'number' ||
      typeof userData.lastKnownCoordinates.longitude !== 'number') {
    missingFields.push('lastKnownCoordinates');
  }

  // Check connectionIntents
  if (!Array.isArray(userData.connectionIntents) || userData.connectionIntents.length === 0) {
    missingFields.push('connectionIntents');
  }

  // Check eventPreferences
  if (!userData.eventPreferences || 
      (userData.eventPreferences.likesBars === null && 
       userData.eventPreferences.prefersSmallGroups === null)) {
    missingFields.push('eventPreferences');
  }

  // Check personalTags
  if (!Array.isArray(userData.personalTags) || userData.personalTags.length === 0) {
    missingFields.push('personalTags');
  }

  // Check preferredMeetupRadius
  if (userData.preferredMeetupRadius === null || 
      userData.preferredMeetupRadius === undefined ||
      userData.preferredMeetupRadius <= 0) {
    missingFields.push('preferredMeetupRadius');
  }

  // Check groupAffiliations
  if (!Array.isArray(userData.groupAffiliations)) {
    missingFields.push('groupAffiliations');
  }

  // Check availableNow
  if (typeof userData.availableNow !== 'boolean') {
    missingFields.push('availableNow');
  }

  return missingFields;
}; 