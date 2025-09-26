import React, { useRef, useCallback, useContext } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../../context/ThemeContext';

interface FloatingActionButtonProps {
  expanded: boolean;
  onToggle: () => void;
  onEventPress: () => void;
  onPingPress: () => void;
  sheetAnim: Animated.Value;
}

export default function FloatingActionButton({
  expanded,
  onToggle,
  onEventPress,
  onPingPress,
  sheetAnim,
}: FloatingActionButtonProps) {
  const { theme } = useContext(ThemeContext);
  const router = useRouter();

  // Animation refs
  const fabRotateAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const eventButtonAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const pingButtonAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const eventButtonOpacity = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const pingButtonOpacity = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  // Update animations when expanded state changes
  React.useEffect(() => {
    if (expanded) {
      // Expand FAB
      Animated.parallel([
        Animated.timing(fabRotateAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(eventButtonAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pingButtonAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(eventButtonOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pingButtonOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Collapse FAB
      Animated.parallel([
        Animated.timing(fabRotateAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(eventButtonAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pingButtonAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(eventButtonOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pingButtonOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [expanded, fabRotateAnim, eventButtonAnim, pingButtonAnim, eventButtonOpacity, pingButtonOpacity]);

  const handleEventPress = useCallback(() => {
    router.push('eventCreation');
    onEventPress();
  }, [router, onEventPress]);

  const handlePingPress = useCallback(() => {
    onPingPress();
  }, [onPingPress]);

  return (
    <View style={styles.fabContainer}>
      {/* Event Button */}
      <Animated.View
        style={[
          styles.fabOption,
          styles.eventFabOption,
          {
            opacity: eventButtonOpacity,
            transform: [
              {
                translateX: eventButtonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -100 * Math.cos(Math.PI / 8)],
                }),
              },
              {
                translateY: eventButtonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -100 * Math.sin(Math.PI / 8)],
                }),
              },
              {
                scale: eventButtonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.fabOptionButton, { 
            backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9",
            borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
          }]}
          activeOpacity={0.8}
          onPress={handleEventPress}
        >
          <MaterialIcons 
            name="event" 
            size={20} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Ping Button */}
      <Animated.View
        style={[
          styles.fabOption,
          styles.pingFabOption,
          {
            opacity: pingButtonOpacity,
            transform: [
              {
                translateX: pingButtonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -100 * Math.cos(Math.PI / 2.2)],
                }),
              },
              {
                translateY: pingButtonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -100 * Math.sin(Math.PI / 2.2)],
                }),
              },
              {
                scale: pingButtonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.fabOptionButton, { 
            backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9",
            borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
          }]}
          activeOpacity={0.8}
          onPress={handlePingPress}
        >
          <MaterialIcons 
            name="send" 
            size={20} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Main FAB */}
      <Animated.View
        style={[
          styles.fab,
          {
            opacity: sheetAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1],
            }),
            transform: [
              {
                scale: sheetAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1],
                }),
              },
              {
                rotate: fabRotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '45deg'],
                }),
              },
            ],
            backgroundColor: theme === "light" ? "#37a4c8" : "#000000",
            borderWidth: 0,
          },
        ]}
      >
        <TouchableOpacity 
          onPress={onToggle}
          activeOpacity={0.8}
        >
          <MaterialIcons 
            name="add" 
            size={28} 
            color={theme === "light" ? "#FFFFFF" : "#38a5c9"} 
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 0 : 0,
    right: 0,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabOption: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabOptionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  eventFabOption: {
    // Positioned above the main FAB
  },
  pingFabOption: {
    // Positioned above the event FAB
  },
  fab: {
    position: "absolute",
    bottom: Platform.OS === 'ios' ? 40 : 32,
    right: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#38a5c9",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
