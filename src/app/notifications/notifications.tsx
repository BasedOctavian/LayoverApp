import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import TopBar from '../../components/TopBar';
import { router } from 'expo-router';
import { ThemeContext } from '../../context/ThemeContext';

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const { theme } = React.useContext(ThemeContext);

  const handleProfilePress = () => {
    router.push('/profile');
  };

  return (
    <>
      <TopBar onProfilePress={handleProfilePress} />
      <SafeAreaView style={[styles.container, { 
        paddingTop: insets.top,
        backgroundColor: theme === "light" ? "#ffffff" : "#000000"
      }]}>
        <LinearGradient
          colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <Ionicons name="notifications-off" size={64} color="#37a4c8" />
            <Text style={[styles.title, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>No new notifications!</Text>
            <Text style={[styles.subtitle, { color: "#37a4c8" }]}>We'll notify you when something important happens</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
}); 