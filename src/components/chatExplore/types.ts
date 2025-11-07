/**
 * Type definitions for ChatExplore components
 * 
 * This file contains all the shared interfaces and types used across
 * the ChatExplore feature components.
 */

export interface Chat {
  id: string;
  participants: string[];
  createdAt: Date;
  status: string;
  connectionType: string | null;
  connectionId: string | null;
  lastMessage: string | null;
}

export interface AppUser {
  id: string;
  name: string;
  age: number;
  airportCode: string;
  bio?: string;
  interests?: string[];
  moodStatus?: string;
  profilePicture?: string;
}

export interface UserCardProps {
  item: AppUser;
  onPress: () => void;
  index: number;
}

export interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  placeholder?: string;
}

export interface LoadingIndicatorProps {
  color: string;
  message?: string;
}

export interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  iconColor?: string;
}

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export type SortOption = 'name-asc' | 'name-desc' | 'age-asc' | 'age-desc' | 'newest';

export interface FilterOptions {
  ageRange?: {
    min: number;
    max: number;
  };
  interests?: string[];
  hasBio?: boolean;
  hasProfilePicture?: boolean;
}

export interface FilterSortBarProps {
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  onFilterPress: () => void;
  activeFiltersCount: number;
  resultCount: number;
}

export interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onApplyFilters: (filters: FilterOptions) => void;
  availableInterests: string[];
}

