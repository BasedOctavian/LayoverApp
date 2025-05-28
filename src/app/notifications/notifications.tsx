import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import TopBar from '../../components/TopBar';
import { router } from 'expo-router';

export default function Notifications() {
  const insets = useSafeAreaInsets();

  const handleProfilePress = () => {
    router.push('/profile');
  };

  return (
    <>
      <TopBar onProfilePress={handleProfilePress} />
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['#000000', '#1a1a1a']}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <Ionicons name="notifications-off" size={64} color="#38a5c9" />
            <Text style={styles.title}>No new notifications!</Text>
            <Text style={styles.subtitle}>We'll notify you when something important happens</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
    color: '#e4fbfe',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#38a5c9',
    textAlign: 'center',
    opacity: 0.8,
  },
}); 