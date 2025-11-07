/**
 * ChatExplore Components Index
 * 
 * This file provides clean exports for all ChatExplore components,
 * making imports cleaner and more maintainable throughout the app.
 * 
 * Usage:
 * import { UserCard, SearchBar, LoadingIndicator } from '@/components/chatExplore';
 */

// Component exports
export { default as UserCard } from './UserCard';
export { default as SearchBar } from './SearchBar';
export { default as LoadingIndicator } from './LoadingIndicator';
export { default as SkeletonLoader } from './SkeletonLoader';
export { EmptyState, ErrorState } from './StateComponents';
export { default as FilterSortBar } from './FilterSortBar';
export { default as FilterModal } from './FilterModal';

// Type exports
export type {
  Chat,
  AppUser,
  UserCardProps,
  SearchBarProps,
  LoadingIndicatorProps,
  EmptyStateProps,
  ErrorStateProps,
  SortOption,
  FilterOptions,
  FilterSortBarProps,
  FilterModalProps,
} from './types';

// Default export for convenience
export default {
  UserCard: require('./UserCard').default,
  SearchBar: require('./SearchBar').default,
  LoadingIndicator: require('./LoadingIndicator').default,
  SkeletonLoader: require('./SkeletonLoader').default,
  EmptyState: require('./StateComponents').EmptyState,
  ErrorState: require('./StateComponents').ErrorState,
  FilterSortBar: require('./FilterSortBar').default,
  FilterModal: require('./FilterModal').default,
};
