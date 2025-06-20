# SafeArea Migration Guide

This guide helps you migrate all screens from individual SafeAreaView usage to the new centralized SafeAreaWrapper component.

## What's Been Done

1. ✅ Added `SafeAreaProvider` to the root layout (`src/app/_layout.tsx`)
2. ✅ Created `SafeAreaWrapper` component (`src/components/SafeAreaWrapper.tsx`)
3. ✅ Updated `home.tsx` to use SafeAreaWrapper
4. ✅ Updated `explore.tsx` to use SafeAreaWrapper
5. ✅ Updated `swipe.tsx` to use SafeAreaWrapper
6. ✅ Updated `eventCreation.tsx` to use SafeAreaWrapper

## Remaining Screens to Update

The following screens still need to be migrated:

### Settings Screens
- [ ] `src/app/settings/updatePassword.tsx`
- [ ] `src/app/settings/tos.tsx`
- [ ] `src/app/settings/settingsTest.tsx`
- [ ] `src/app/settings/settings.tsx`
- [ ] `src/app/settings/notificationPreferences.tsx`
- [ ] `src/app/settings/feedback.tsx`
- [ ] `src/app/settings/blockedUsers.tsx`
- [ ] `src/app/settings/adminTools.tsx`
- [ ] `src/app/settings/about.tsx`

### Main Screens
- [ ] `src/app/sandbox.tsx`
- [ ] `src/app/notifications/notifications.tsx`
- [ ] `src/app/locked/lockedScreen.tsx`
- [ ] `src/app/home/dashboard.tsx`

### Event & Chat Screens
- [ ] `src/app/event/[id].tsx`
- [ ] `src/app/event/eventChat/[id].tsx`
- [ ] `src/app/chat/[id].tsx`
- [ ] `src/app/chat/chatInbox.tsx`
- [ ] `src/app/chat/chatExplore.tsx`

### Profile Screens
- [ ] `src/app/profile/[id].tsx`
- [ ] `src/app/profile/editProfile.tsx`

## Migration Pattern

For each screen, follow this pattern:

### 1. Update Imports
```tsx
// Remove these imports:
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// Add this import:
import SafeAreaWrapper from "../components/SafeAreaWrapper";
```

### 2. Remove useSafeAreaInsets Usage
```tsx
// Remove this line:
const insets = useSafeAreaInsets();
```

### 3. Replace SafeAreaView with SafeAreaWrapper
```tsx
// Before:
<SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
  {/* content */}
</SafeAreaView>

// After:
<SafeAreaWrapper edges={["bottom"]}>
  {/* content */}
</SafeAreaWrapper>
```

### 4. Handle Background Colors
```tsx
// If you had inline background colors, they're now handled automatically:
// Before:
<SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#ffffff" : "#000000" }]}>

// After:
<SafeAreaWrapper>
```

## SafeAreaWrapper Props

The SafeAreaWrapper component accepts these props:

- `children`: React nodes to render
- `style`: Additional styles
- `edges`: Array of edges to protect (default: `['top', 'bottom', 'left', 'right']`)
- `backgroundColor`: Custom background color (optional, uses theme by default)
- `excludeTop`: Exclude top safe area (boolean)
- `excludeBottom`: Exclude bottom safe area (boolean)

## Common Usage Patterns

### Full Safe Area Protection
```tsx
<SafeAreaWrapper>
  <YourContent />
</SafeAreaWrapper>
```

### Bottom Only Protection
```tsx
<SafeAreaWrapper edges={["bottom"]}>
  <YourContent />
</SafeAreaWrapper>
```

### Custom Background Color
```tsx
<SafeAreaWrapper backgroundColor="#f8f9fa">
  <YourContent />
</SafeAreaWrapper>
```

### Exclude Top Safe Area
```tsx
<SafeAreaWrapper excludeTop>
  <YourContent />
</SafeAreaWrapper>
```

## Benefits of This Migration

1. **Consistency**: All screens now use the same safe area handling logic
2. **Maintainability**: Changes to safe area behavior only need to be made in one place
3. **Theme Integration**: Automatic theme-aware background colors
4. **Flexibility**: Easy to customize per screen while maintaining consistency
5. **Performance**: Reduced bundle size by eliminating duplicate safe area logic

## Testing

After migration, test each screen on:
- iPhone with notch
- iPhone without notch
- Android devices
- Different orientations
- Both light and dark themes

## Quick Migration Script

You can use this pattern to quickly migrate the remaining screens:

1. Search for `SafeAreaView` in each file
2. Replace the import statement
3. Remove any `useSafeAreaInsets()` usage
4. Replace `<SafeAreaView` with `<SafeAreaWrapper`
5. Remove inline background colors from SafeAreaView styles
6. Test the screen

## Example Migration

Here's a complete example of what a migration looks like:

**Before:**
```tsx
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const MyScreen = () => {
  const insets = useSafeAreaInsets();
  
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#ffffff" : "#000000" }]} edges={["bottom"]}>
      <YourContent />
    </SafeAreaView>
  );
};
```

**After:**
```tsx
import SafeAreaWrapper from "../components/SafeAreaWrapper";

const MyScreen = () => {
  return (
    <SafeAreaWrapper edges={["bottom"]}>
      <YourContent />
    </SafeAreaWrapper>
  );
};
``` 