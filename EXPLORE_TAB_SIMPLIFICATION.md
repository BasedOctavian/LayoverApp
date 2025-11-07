# Explore Screen - Tab Simplification Update

## Overview
Simplified the navigation structure in the Explore screen from **5 tabs** to **3 tabs** for easier navigation and better user experience.

## Changes Made

### 1. **Reduced Tab Count: 5 → 3**

#### Before (5 Tabs):
- All
- Events
- Pings
- Users
- Groups

#### After (3 Tabs):
1. **Discover** (formerly "All")
   - Shows everything: activities, users, and groups mixed together
   - Perfect for browsing all available content
   
2. **Activities** (new consolidated tab)
   - Shows both events AND pings
   - Has sub-filters: "All Activities", "Events Only", "Pings Only"
   - Includes quick time filters (Now, Today, This Week)
   - Includes distance presets (Nearby 5mi, Local 20mi, Regional 50mi)
   
3. **Social** (new consolidated tab)
   - Shows both users AND groups
   - Has sub-filters: "Everyone", "Users Only", "Groups Only"

### 2. **Enhanced Quick Filters**

#### Activities Tab Features:
- **Time Filters** (horizontal pills):
  - All Time
  - Now (within 2 hours)
  - Today
  - This Week

- **Distance Presets** (horizontal pills):
  - Nearby (5 miles)
  - Local (20 miles)
  - Regional (50 miles)

- **Activity Type Sub-Filter** (3 buttons):
  - All Activities
  - Events Only
  - Pings Only

#### Social Tab Features:
- **Social Type Sub-Filter** (3 buttons):
  - Everyone (users + groups)
  - Users Only
  - Groups Only

### 3. **Advanced Filters System**

- **Collapsible Advanced Filters**
  - Toggle to show/hide category filters and availability options
  - Reduces clutter while keeping power features accessible

- **Active Filter Chips**
  - Visual chips showing all active filters
  - Each chip is dismissible with a tap
  - Color-coded by filter type:
    - Blue: Categories
    - Green: Availability
    - Yellow: Time
    - Purple: Activity Type
    - Pink: Social Type

- **Clear All Button**
  - Appears when any filters are active
  - One-tap to reset all filters to defaults

### 4. **Smooth Animations**

- Layout animations when toggling filters
- Smooth transitions between tabs
- Animated feedback on filter selection

### 5. **Smart Filter Logic**

- Category filters only apply to activities (not users/groups)
- Time filters only apply to activities tab
- Distance filters apply to all content types
- Availability filters work across all tabs
- Sub-filters automatically reset when switching tabs

## Benefits

### User Experience:
- **Simpler Navigation**: 3 clear choices instead of 5
- **Less Cognitive Load**: Easier to understand where to find content
- **Better Organization**: Related content grouped together
- **More Discoverable**: Sub-filters reveal options without cluttering main navigation
- **Visual Feedback**: Active filters are clearly visible and removable

### Technical:
- **Cleaner Code**: Consolidated filtering logic
- **Better Performance**: Fewer tab state changes
- **Maintainable**: Easier to add features to 3 tabs than 5
- **Type-Safe**: Updated TypeScript types throughout

## Migration Notes

### For Users:
- **Looking for Events?** → Activities tab → "Events Only" sub-filter
- **Looking for Pings?** → Activities tab → "Pings Only" sub-filter
- **Looking for Users?** → Social tab → "Users Only" sub-filter
- **Looking for Groups?** → Social tab → "Groups Only" sub-filter
- **Want to see everything?** → Discover tab

### For Developers:
- `TabType` updated from 5 values to 3: `'all' | 'activities' | 'social'`
- New state variables: `activityType` and `socialType` for sub-filters
- Filter logic consolidated and simplified
- All components updated to support new structure

## Files Modified

1. `src/app/explore.tsx` - Main explore screen logic
2. `src/components/explore/TabBar.tsx` - Tab bar component with new 3-tab layout

## Testing Recommendations

- [ ] Test all 3 main tabs display correct content
- [ ] Test activity sub-filters (All, Events, Pings)
- [ ] Test social sub-filters (Everyone, Users, Groups)
- [ ] Test time filters work correctly
- [ ] Test distance presets work correctly
- [ ] Test advanced filters toggle
- [ ] Test active filter chips are dismissible
- [ ] Test "Clear All" button resets everything
- [ ] Test search works across all tabs
- [ ] Test smooth animations on filter changes

## Future Enhancements

Possible additions without adding complexity:
- Save filter presets
- Filter history/recently used filters
- Smart filter suggestions based on user behavior
- Bookmarked searches

