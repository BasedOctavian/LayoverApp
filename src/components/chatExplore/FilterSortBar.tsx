import React, { useContext } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemeContext } from '../../context/ThemeContext';
import { FilterSortBarProps, SortOption } from './types';
import { scaleWidth, scaleHeight, moderateScale, scaleFontSize } from '../../utils/responsive';

/**
 * FilterSortBar Component
 * 
 * A sophisticated filter and sort bar with quick access chips.
 * Features:
 * - Horizontal scrolling sort options
 * - Active state indicators
 * - Filter button with badge count
 * - Result count display
 * - Haptic feedback
 * - Theme-aware styling
 */
const FilterSortBar: React.FC<FilterSortBarProps> = ({
  sortOption,
  onSortChange,
  onFilterPress,
  activeFiltersCount,
  resultCount,
}) => {
  const { theme } = useContext(ThemeContext);

  const sortOptions: { label: string; value: SortOption; icon: string }[] = [
    { label: 'A-Z', value: 'name-asc', icon: 'arrow-up' },
    { label: 'Z-A', value: 'name-desc', icon: 'arrow-down' },
    { label: 'Youngest', value: 'age-asc', icon: 'trending-down' },
    { label: 'Oldest', value: 'age-desc', icon: 'trending-up' },
    { label: 'Newest', value: 'newest', icon: 'time' },
  ];

  const handleSortPress = (value: SortOption) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSortChange(value);
  };

  const handleFilterPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onFilterPress();
  };

  return (
    <View style={styles.container}>
      {/* Result Count and Filter Button Row */}
      <View style={styles.headerRow}>
        <Text style={[styles.resultCount, { color: theme === 'light' ? '#64748B' : '#94A3B8' }]}>
          {resultCount} {resultCount === 1 ? 'person' : 'people'} found
        </Text>
        
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: activeFiltersCount > 0 
                ? '#37a4c8' 
                : theme === 'light' ? '#FFFFFF' : '#1a1a1a',
              borderColor: theme === 'light' ? 'rgba(55, 164, 200, 0.3)' : 'rgba(55, 164, 200, 0.4)',
            }
          ]}
          onPress={handleFilterPress}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="options" 
            size={moderateScale(18)} 
            color={activeFiltersCount > 0 ? '#FFFFFF' : '#37a4c8'} 
          />
          <Text 
            style={[
              styles.filterButtonText,
              { color: activeFiltersCount > 0 ? '#FFFFFF' : '#37a4c8' }
            ]}
          >
            Filters
          </Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Sort Options - Horizontal Scroll */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortScrollContent}
      >
        {sortOptions.map((option) => {
          const isActive = sortOption === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortChip,
                {
                  backgroundColor: isActive 
                    ? '#37a4c8' 
                    : theme === 'light' ? '#FFFFFF' : '#1a1a1a',
                  borderColor: isActive 
                    ? '#37a4c8' 
                    : theme === 'light' ? 'rgba(55, 164, 200, 0.3)' : 'rgba(55, 164, 200, 0.4)',
                }
              ]}
              onPress={() => handleSortPress(option.value)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={option.icon as any} 
                size={moderateScale(14)} 
                color={isActive ? '#FFFFFF' : '#37a4c8'} 
                style={styles.sortIcon}
              />
              <Text 
                style={[
                  styles.sortChipText,
                  { color: isActive ? '#FFFFFF' : theme === 'light' ? '#0F172A' : '#e4fbfe' }
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: scaleHeight(16),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleHeight(12),
  },
  resultCount: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(10),
    borderRadius: moderateScale(12),
    borderWidth: moderateScale(1.5),
    elevation: 2,
    shadowColor: '#38a5c9',
    shadowOffset: { width: 0, height: scaleHeight(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
  },
  filterButtonText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    marginLeft: scaleWidth(6),
    letterSpacing: 0.3,
  },
  filterBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(10),
    width: moderateScale(20),
    height: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: scaleWidth(6),
  },
  filterBadgeText: {
    color: '#37a4c8',
    fontSize: scaleFontSize(11),
    fontWeight: '700',
  },
  sortScrollContent: {
    paddingVertical: scaleHeight(4),
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(10),
    borderRadius: moderateScale(20),
    marginRight: scaleWidth(10),
    borderWidth: moderateScale(1.5),
    elevation: 2,
    shadowColor: '#38a5c9',
    shadowOffset: { width: 0, height: scaleHeight(2) },
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(4),
  },
  sortIcon: {
    marginRight: scaleWidth(6),
  },
  sortChipText: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default FilterSortBar;

