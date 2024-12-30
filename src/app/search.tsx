import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function Search() {
  const [text, setText] = useState('');

  // Function to dismiss the keyboard when tapping outside the TextInput
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // Adjust behavior for iOS and Android
    >
      {/* TouchableWithoutFeedback to dismiss the keyboard if tapped outside */}
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={styles.topContainer}>
          {/* Top Half: Categories */}
          <Text style={styles.header}>Select a Category</Text>

          <View style={styles.categoryContainer}>
            {/* Category 1: Relaxation and Wellness */}
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="meditation" size={40} color="white" />
              <Text style={styles.categoryText}>Wellness</Text>
            </View>

            {/* Category 2: Food & Beverage Experience */}
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="food" size={40} color="white" />
              <Text style={styles.categoryText}>Food & Drink</Text>
            </View>

            {/* Category 3: Entertainment & Fun */}
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="microphone-variant" size={40} color="white" />
              <Text style={styles.categoryText}>Entertainment</Text>
            </View>
          </View>

          <View style={styles.categoryContainer}>
            {/* Category 4: Travel Education */}
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="map" size={40} color="white" />
              <Text style={styles.categoryText}>Travel Tips</Text>
            </View>

            {/* Category 5: Fitness & Activity */}
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="account-group" size={40} color="white" />
              <Text style={styles.categoryText}>Activity</Text>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* Bottom Half: Keyboard */}
      <View style={styles.bottomContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search..."
          value={text}
          onChangeText={(newText) => setText(newText)}
          autoFocus={true}  // Automatically focuses the TextInput and shows the keyboard
          placeholderTextColor="#aaa"  // Light color for placeholder text
          keyboardAppearance="dark"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Dark background
  },
  topContainer: {
    flex: 1, // Take up the top half of the screen
    justifyContent: 'space-evenly', // Space the categories evenly
    padding: 20,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#fff', // White text
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly', // Space the icons evenly
    marginVertical: 10,
    flexWrap: 'wrap', // Allow items to wrap to the next line for smaller screens
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 15, // Add some space below each icon
  },
  categoryText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14,
  },
  bottomContainer: {
    padding: 20,
  },
  input: {
    borderColor: '#fff', // White border
    borderWidth: 1,
    padding: 10,
    borderRadius: 5,
    marginBottom: 80,
    color: '#fff', // White text in input
  },
});
