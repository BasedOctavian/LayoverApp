import React, { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Search() {
  const [text, setText] = useState('');

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View style={styles.content}>
            <Text style={styles.headerText}>Select a Category</Text>

            <View style={styles.categoryContainer}>
              {/* Wellness */}
              <TouchableWithoutFeedback>
                <View style={styles.categoryCard}>
                  <MaterialCommunityIcons name="meditation" size={40} color="white" />
                  <Text style={styles.categoryText}>Wellness</Text>
                </View>
              </TouchableWithoutFeedback>

              {/* Food & Drink */}
              <TouchableWithoutFeedback>
                <View style={styles.categoryCard}>
                  <MaterialCommunityIcons name="food" size={40} color="white" />
                  <Text style={styles.categoryText}>Food & Drink</Text>
                </View>
              </TouchableWithoutFeedback>

              {/* Entertainment */}
              <TouchableWithoutFeedback>
                <View style={styles.categoryCard}>
                  <MaterialCommunityIcons name="microphone-variant" size={40} color="white" />
                  <Text style={styles.categoryText}>Entertainment</Text>
                </View>
              </TouchableWithoutFeedback>

              {/* Travel Tips */}
              <TouchableWithoutFeedback>
                <View style={styles.categoryCard}>
                  <MaterialCommunityIcons name="map" size={40} color="white" />
                  <Text style={styles.categoryText}>Travel Tips</Text>
                </View>
              </TouchableWithoutFeedback>

              {/* Activity */}
              <TouchableWithoutFeedback>
                <View style={styles.categoryCard}>
                  <MaterialCommunityIcons name="account-group" size={40} color="white" />
                  <Text style={styles.categoryText}>Activity</Text>
                </View>
              </TouchableWithoutFeedback>
           

            {/* Miscellaneous */}
            <TouchableWithoutFeedback>
                <View style={styles.categoryCard}>
                  <MaterialCommunityIcons name="shape" size={40} color="white" />
                  <Text style={styles.categoryText}>Miscellaneous</Text>
                </View>
              </TouchableWithoutFeedback>
            </View>

            <View style={styles.searchContainer}>
              <MaterialCommunityIcons name="magnify" size={24} color="rgba(255,255,255,0.5)" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                value={text}
                onChangeText={setText}
                autoFocus={true}
                placeholderTextColor="rgba(255,255,255,0.5)"
                keyboardAppearance="dark"
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 40,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  searchContainer: {
    position: 'relative',
    marginTop: 40,
  },
  searchIcon: {
    position: 'absolute',
    left: 15,
    top: 18,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    paddingVertical: 14,
    paddingLeft: 50,
    color: 'white',
    fontSize: 16,
    marginBottom: 24,
  },
});