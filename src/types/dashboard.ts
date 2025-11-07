/**
 * Dashboard Types
 * Type definitions for the dashboard screen and related components
 */

import { ReactNode } from 'react';
import { Animated } from 'react-native';

/**
 * User data structure from Firestore
 */
export interface UserData {
  id: string;
  name?: string;
  moodStatus?: string;
  airportCode?: string;
  lastLogin?: any;
  profilePicture?: string;
  age?: string;
  bio?: string;
  languages?: string[];
  interests?: string[];
  goals?: string[];
  pronouns?: string;
  availabilitySchedule?: AvailabilitySchedule;
  linkRatingScore?: {
    average: number;
    count: number;
  };
  currentCity?: string;
  lastKnownCoordinates?: {
    latitude: number;
    longitude: number;
  };
  blockedUsers?: string[];
  hasMeBlocked?: string[];
  expoPushToken?: string;
  notificationPreferences?: NotificationPreferences;
}

/**
 * Availability schedule structure
 */
export interface AvailabilitySchedule {
  [key: string]: {
    start: string;
    end: string;
  };
}

/**
 * Notification preferences structure
 */
export interface NotificationPreferences {
  announcements: boolean;
  chats: boolean;
  connections: boolean;
  activities: boolean;
  notificationsEnabled: boolean;
}

/**
 * Dashboard item types
 */
export type DashboardItemType = "section" | "feature" | "spacer" | "activity";

/**
 * Dashboard item structure
 */
export interface DashboardItem {
  type: DashboardItemType;
  id: string;
  data: any;
}

/**
 * Search item structure
 */
export interface SearchItem {
  id: string;
  name: string;
  description: string;
  isCreateEvent: boolean;
  type?: string;
  startTime?: string;
}

/**
 * Flat list item (union type)
 */
export type FlatListItem = DashboardItem | SearchItem;

/**
 * Feature button structure
 */
export interface FeatureButton {
  icon: ReactNode;
  title: string;
  screen: string;
  description: string;
}

/**
 * Popup data structure
 */
export interface PopupData {
  visible: boolean;
  title: string;
  message: string;
  type: "success" | "error";
}

/**
 * Loading states structure
 */
export interface LoadingStates {
  users: boolean;
  events: boolean;
  activities: boolean;
  initial: boolean;
}

/**
 * User location structure
 */
export interface UserLocation {
  lat: number;
  long: number;
}

/**
 * Dashboard props
 */
export interface DashboardProps {
  userId?: string;
  initialData?: any;
}

/**
 * Event data structure
 */
export interface EventData {
  id: string;
  name: string;
  description: string;
  category?: string;
  startTime?: string;
  eventImage?: string;
  organizer?: string;
  attendees?: string[];
  private?: boolean;
  airportCode?: string;
  type?: 'event' | 'sport';
}

/**
 * Nearby user structure (from UserAvailabilitySection)
 */
export interface NearbyUser {
  id: string;
  name: string;
  status: string;
  profilePicture?: string;
  age?: string;
  bio?: string;
  languages?: string[];
  interests?: string[];
  goals?: string[];
  pronouns?: string;
  lastLogin?: any;
  availabilitySchedule?: AvailabilitySchedule;
  linkRatingScore?: {
    average: number;
    count: number;
  };
  currentCity?: string;
  isViewMoreCard?: boolean;
  isInviteCard?: boolean;
}


