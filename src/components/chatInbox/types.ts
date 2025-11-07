import { Timestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  unreadCount?: number;
  isPinned?: boolean;
  lastMessageStatus?: 'sent' | 'delivered' | 'read';
  status: 'active' | 'pending';
  connectionId?: string;
  initiator?: string; // User ID of the connection initiator (for pending connections)
  isEventChat?: boolean;
  eventId?: string;
  eventName?: string;
  eventAirportCode?: string;
  category?: string;
  airportCode?: string;
  eventImage?: string;
  description?: string;
  startTime?: string | Date | Timestamp;
  organizedAt?: string | Date | Timestamp;
  organizer?: string;
  partnerData?: Partner;
  // Group chat fields
  isGroupChat?: boolean;
  groupId?: string;
  groupName?: string;
  groupImage?: string;
  groupDescription?: string;
  memberCount?: number;
  type?: 'user' | 'group' | 'event';
}

export interface EventChat {
  id: string;
  name: string;
  description: string;
  category: string;
  eventImage?: string;
  createdAt: any;
  startTime: any;
  attendees?: string[];
  organizer: string | null;
  organizedAt?: any;
  airportCode?: string;
  lastMessage?: string;
  lastMessageTime?: Date | Timestamp;
  unreadCount?: number;
}

export interface Partner {
  id: string;
  name: string;
  profilePicture?: string;
  age: string;
  airportCode: string;
  interests?: string[];
  moodStatus?: string;
  isOnline?: boolean;
  lastSeen?: Date | Timestamp;
}

export interface ChatItemProps {
  chat: Chat;
  currentUser: User;
  getUser: (userId: string) => Promise<Partner>;
  onPress: () => void;
  onPinPress: () => void;
  onAccept: (updatedChat: Chat) => void;
  setPendingChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  setFilteredChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  preloadedData?: { partner: Partner, isInitiator: boolean };
  index: number;
}

export interface ConnectionData {
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  unreadCount?: number;
  isPinned?: boolean;
  lastMessageStatus?: 'sent' | 'delivered' | 'read';
  status?: 'active' | 'pending';
  initiator?: string; // User ID of the connection initiator
}

export interface EventData {
  attendees: string[];
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  unreadCount?: number;
  name: string;
  airportCode: string;
  category: string;
  eventImage?: string;
}

export interface Section {
  title: string;
  data: Chat[];
}

export type EventStatus = 'in_progress' | 'upcoming' | 'ended';

export interface SectionHeaderProps {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  theme: string | null | undefined;
  count?: number;
}

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  theme: string | null | undefined;
}
