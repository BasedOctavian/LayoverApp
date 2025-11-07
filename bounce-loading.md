# Bounce Loading Animation Pattern

A smooth, elegant loading animation pattern that creates a bounce-in effect when content loads. This pattern provides a polished user experience by animating content appearance with a combination of opacity fade, scale, and vertical translation.

## Overview

The bounce loading pattern uses three synchronized animations:
- **Opacity fade**: Content fades in from transparent to opaque
- **Scale**: Content scales from 98% to 100% (subtle zoom-in effect)
- **Vertical translation**: Content slides up 30px while fading in (bounce effect)

## Implementation

### 1. Required Imports

```typescript
import React, { useEffect, useState, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
```

### 2. State and Animation Setup

```typescript
// Loading states
const [isLoading, setIsLoading] = useState(true);
const [initialLoadComplete, setInitialLoadComplete] = useState(false);
const [data, setData] = useState<any>(null); // Your data state

// Animation refs - initialize with starting values
const contentBounceAnim = useRef(new Animated.Value(0)).current;  // Starts at 0 (hidden)
const contentScaleAnim = useRef(new Animated.Value(0.98)).current; // Starts at 98% scale
const contentFadeAnim = useRef(new Animated.Value(0)).current; // Optional: separate fade
```

**Key Initial Values:**
- `contentBounceAnim`: Starts at `0` (will animate to `1`)
- `contentScaleAnim`: Starts at `0.98` (will animate to `1`)
- `contentFadeAnim`: Optional, starts at `0` (will animate to `1`)

### 3. Loading State Management

```typescript
// Set initialLoadComplete when data is ready
useEffect(() => {
  if (!isLoading && data) {
    setInitialLoadComplete(true);
  }
}, [isLoading, data]);
```

### 4. Animation Trigger

```typescript
// Trigger bounce animation when loading completes
useEffect(() => {
  if (!isLoading && initialLoadComplete) {
    Animated.parallel([
      Animated.timing(contentBounceAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(contentScaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      })
    ]).start();
  }
}, [isLoading, initialLoadComplete]);
```

**Animation Configuration:**
- **Duration**: 300ms (smooth but quick)
- **Easing**: `Easing.out(Easing.cubic)` (starts fast, ends smoothly)
- **useNativeDriver**: `true` (better performance)

### 5. Loading Screen

```typescript
// Show loading screen during initial load
if (isLoading || !initialLoadComplete) {
  return (
    <LinearGradient 
      colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} 
      style={{ flex: 1 }} 
    />
  );
}
```

**Alternative Simple Loading:**
```typescript
if (isLoading || !initialLoadComplete) {
  return (
    <View style={{ flex: 1, backgroundColor: theme === "light" ? "#f8f9fa" : "#000000" }} />
  );
}
```

### 6. Animated Content Wrapper

```typescript
return (
  <LinearGradient colors={...} style={{ flex: 1 }}>
    {/* Your TopBar, StatusBar, etc. */}
    
    <Animated.View 
      style={{ 
        flex: 1,
        opacity: contentBounceAnim,
        transform: [
          { scale: contentScaleAnim },
          {
            translateY: contentBounceAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0]  // Slides up 30px while fading in
            })
          }
        ]
      }}
    >
      {/* Your actual content here */}
      <ScrollView>
        {/* Content */}
      </ScrollView>
    </Animated.View>
  </LinearGradient>
);
```

## Animation Breakdown

### Opacity Animation
- **From**: `0` (transparent)
- **To**: `1` (opaque)
- **Effect**: Content fades in smoothly

### Scale Animation
- **From**: `0.98` (slightly smaller)
- **To**: `1` (full size)
- **Effect**: Subtle zoom-in effect

### Translation Animation
- **From**: `30px` down
- **To**: `0px` (original position)
- **Effect**: Content slides up while appearing (bounce effect)

## Customization Options

### Adjust Animation Speed
```typescript
duration: 300,  // Faster: 200, Slower: 500
```

### Adjust Bounce Distance
```typescript
outputRange: [30, 0]  // More bounce: [50, 0], Less bounce: [15, 0]
```

### Adjust Scale Effect
```typescript
const contentScaleAnim = useRef(new Animated.Value(0.95)).current; // More pronounced
// or
const contentScaleAnim = useRef(new Animated.Value(0.99)).current; // Subtle
```

### Different Easing Functions
```typescript
easing: Easing.out(Easing.cubic),     // Smooth deceleration
easing: Easing.out(Easing.ease),      // Gentle ease
easing: Easing.elastic(1),             // Bouncy effect
easing: Easing.bounce,                 // Bounce effect
```

## Complete Example Template

```typescript
import React, { useEffect, useState, useRef } from "react";
import { View, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function YourScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [data, setData] = useState<any>(null);
  
  // Animation refs
  const contentBounceAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(0.98)).current;
  
  // Fetch your data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Your data fetching logic
        const result = await fetchYourData();
        setData(result);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);
  
  // Set initial load complete
  useEffect(() => {
    if (!isLoading && data) {
      setInitialLoadComplete(true);
    }
  }, [isLoading, data]);
  
  // Trigger animation
  useEffect(() => {
    if (!isLoading && initialLoadComplete) {
      Animated.parallel([
        Animated.timing(contentBounceAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(contentScaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        })
      ]).start();
    }
  }, [isLoading, initialLoadComplete]);
  
  // Loading screen
  if (isLoading || !initialLoadComplete) {
    return (
      <LinearGradient 
        colors={["#f8f9fa", "#ffffff"]} 
        style={{ flex: 1 }} 
      />
    );
  }
  
  // Main content
  return (
    <LinearGradient colors={["#f8f9fa", "#ffffff"]} style={{ flex: 1 }}>
      <Animated.View 
        style={{ 
          flex: 1,
          opacity: contentBounceAnim,
          transform: [
            { scale: contentScaleAnim },
            {
              translateY: contentBounceAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0]
              })
            }
          ]
        }}
      >
        {/* Your content here */}
      </Animated.View>
    </LinearGradient>
  );
}
```

## Best Practices

1. **Always use `useNativeDriver: true`** for better performance
2. **Keep duration between 200-400ms** for smooth, responsive feel
3. **Use `Easing.out(Easing.cubic)`** for professional, polished animations
4. **Keep bounce distance between 20-40px** for subtle, elegant effect
5. **Show loading screen immediately** to prevent layout shift
6. **Only trigger animation once** when `initialLoadComplete` becomes true

## Performance Notes

- Using `useNativeDriver: true` runs animations on the native thread, improving performance
- The `parallel` animation ensures all animations start and end simultaneously
- The loading screen prevents content flash and layout shifts
- Animation refs are created once and reused, preventing memory leaks

## Reference Implementation

See `src/app/settings/settings.tsx` for the complete working example.




