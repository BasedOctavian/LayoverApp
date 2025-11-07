/**
 * Group Types and Interfaces
 * Full-featured community groups with events, chat, and membership management
 */

export interface Group {
  id: string;
  name: string;
  description: string;
  category: string;
  groupImage?: string;
  coverImage?: string;
  
  // Membership
  creatorId: string;
  creatorName: string;
  organizers: string[]; // User IDs with admin privileges
  members: string[]; // All member user IDs (includes organizers)
  memberCount: number;
  pendingMembers?: string[]; // For groups that require approval
  
  // Settings
  isPrivate: boolean; // Private groups require invite/approval
  requiresApproval: boolean; // Members must be approved by organizers
  visibility: 'public' | 'private' | 'hidden'; // Who can see the group
  
  // Group details
  tags: string[]; // Interest tags
  location?: string; // Optional location/city
  coordinates?: { latitude: number; longitude: number }; // Organizer's location coordinates
  radius?: number; // Visibility radius in miles (default 30)
  rules?: string; // Group rules/guidelines
  
  // Social
  chatRoomId?: string; // Reference to group chat
  
  // Timestamps
  createdAt: any;
  updatedAt: any;
  
  // Stats
  eventCount?: number;
  activityScore?: number; // For sorting/recommendation
  postCount?: number;
}

export interface GroupPost {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  authorProfilePicture?: string;
  content: string;
  imageUrl?: string;
  likes: string[]; // Array of user IDs who liked
  likeCount: number;
  favorites?: string[]; // Array of user IDs who favorited
  commentCount: number;
  createdAt: any;
  updatedAt: any;
}

export interface PostComment {
  id: string;
  postId: string;
  groupId: string;
  authorId: string;
  authorName: string;
  authorProfilePicture?: string;
  content: string;
  createdAt: any;
}

export interface GroupMember {
  userId: string;
  groupId: string;
  role: 'creator' | 'organizer' | 'member';
  joinedAt: any;
  invitedBy?: string;
  notificationsEnabled: boolean;
}

export interface GroupEvent {
  eventId: string;
  groupId: string;
  createdAt: any;
}

export interface GroupInvite {
  id: string;
  groupId: string;
  groupName: string;
  invitedUserId: string;
  invitedByUserId: string;
  invitedByName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
  expiresAt?: any;
}

export interface GroupJoinRequest {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  userProfilePicture?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export interface GroupNotification {
  type: 'member_joined' | 'event_created' | 'role_changed' | 'group_updated' | 'invite_received' | 'request_approved';
  groupId: string;
  groupName: string;
  message: string;
  actorId?: string;
  actorName?: string;
  timestamp: any;
}

export interface GroupFormData {
  name: string;
  description: string;
  category: string;
  tags: string[];
  location?: string;
  coordinates?: { latitude: number; longitude: number };
  radius?: number;
  isPrivate: boolean;
  requiresApproval: boolean;
  visibility: 'public' | 'private' | 'hidden';
  rules?: string;
  groupImage?: string;
  coverImage?: string;
}

// Group Categories
export interface GroupCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export const GROUP_CATEGORIES: GroupCategory[] = [
  { id: 'social', label: 'Social', icon: 'people', color: '#FF6B6B' },
  { id: 'sports', label: 'Sports', icon: 'sports-soccer', color: '#4ECDC4' },
  { id: 'food', label: 'Food & Dining', icon: 'restaurant', color: '#FFE66D' },
  { id: 'travel', label: 'Travel', icon: 'flight', color: '#95E1D3' },
  { id: 'arts', label: 'Arts & Culture', icon: 'palette', color: '#F38181' },
  { id: 'music', label: 'Music', icon: 'music-note', color: '#AA96DA' },
  { id: 'tech', label: 'Technology', icon: 'computer', color: '#5DADE2' },
  { id: 'gaming', label: 'Gaming', icon: 'sports-esports', color: '#A569BD' },
  { id: 'fitness', label: 'Fitness', icon: 'fitness-center', color: '#48C9B0' },
  { id: 'books', label: 'Books & Reading', icon: 'book', color: '#E74C3C' },
  { id: 'movies', label: 'Movies & TV', icon: 'movie', color: '#3498DB' },
  { id: 'outdoors', label: 'Outdoors', icon: 'terrain', color: '#27AE60' },
  { id: 'business', label: 'Business', icon: 'business', color: '#34495E' },
  { id: 'education', label: 'Education', icon: 'school', color: '#E67E22' },
  { id: 'volunteering', label: 'Volunteering', icon: 'volunteer-activism', color: '#16A085' },
  { id: 'other', label: 'Other', icon: 'more-horiz', color: '#95A5A6' },
];

// Interest tags suggestions
export const SUGGESTED_TAGS = [
  'networking',
  'meetup',
  'friends',
  'adventure',
  'learning',
  'career',
  'wellness',
  'creative',
  'community',
  'support',
];

// Event Proposal Types
export interface GroupEventProposal {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  authorProfilePicture?: string;
  
  // Proposal details
  title: string; // e.g., "Bar tonight?"
  description?: string;
  proposedLocation?: string;
  proposedTime?: any; // Firestore timestamp
  proposedDate?: any;
  
  // Voting
  votes: {
    yes: string[]; // User IDs
    no: string[];
    maybe: string[];
  };
  yesCount: number;
  noCount: number;
  maybeCount: number;
  
  // Status
  status: 'active' | 'confirmed' | 'cancelled' | 'expired' | 'completed';
  
  // Event time (combined date and time)
  eventDateTime?: any; // Firestore timestamp - when the event occurs
  
  // Favorites
  favorites?: string[]; // Array of user IDs who favorited
  
  // Discussion
  commentCount: number;
  photoCount: number;
  
  // Metadata
  createdAt: any;
  updatedAt: any;
  expiresAt?: any; // Optional auto-expiration
}

export interface ProposalComment {
  id: string;
  proposalId: string;
  groupId: string;
  authorId: string;
  authorName: string;
  authorProfilePicture?: string;
  content: string;
  imageUrl?: string; // For photos
  videoUrl?: string; // For videos
  mediaType?: 'image' | 'video'; // Type of media
  createdAt: any;
}

export type VoteType = 'yes' | 'no';

