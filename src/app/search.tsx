import React, { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function Search() {
  const [text, setText] = useState('');

  // Function to dismiss the keyboard when tapping outside the TextInput
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-black" // Use NativeWind class for container
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // Adjust behavior for iOS and Android
    >
      {/* TouchableWithoutFeedback to dismiss the keyboard if tapped outside */}
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View className="flex-1 p-5 justify-evenly">
          {/* Top Half: Categories */}
          <Text className="text-white text-2xl font-bold text-center">Select a Category</Text>

          <View className="flex-row justify-evenly flex-wrap my-4">
            {/* Category 1: Relaxation and Wellness */}
            <View className="items-center mb-4">
              <MaterialCommunityIcons name="meditation" size={40} color="white" />
              <Text className="text-white mt-2 text-sm">Wellness</Text>
            </View>

            {/* Category 2: Food & Beverage Experience */}
            <View className="items-center mb-4">
              <MaterialCommunityIcons name="food" size={40} color="white" />
              <Text className="text-white mt-2 text-sm">Food & Drink</Text>
            </View>

            {/* Category 3: Entertainment & Fun */}
            <View className="items-center mb-4">
              <MaterialCommunityIcons name="microphone-variant" size={40} color="white" />
              <Text className="text-white mt-2 text-sm">Entertainment</Text>
            </View>
          </View>

          <View className="flex-row justify-evenly flex-wrap">
            {/* Category 4: Travel Education */}
            <View className="items-center mb-4">
              <MaterialCommunityIcons name="map" size={40} color="white" />
              <Text className="text-white mt-2 text-sm">Travel Tips</Text>
            </View>

            {/* Category 5: Fitness & Activity */}
            <View className="items-center mb-4">
              <MaterialCommunityIcons name="account-group" size={40} color="white" />
              <Text className="text-white mt-2 text-sm">Activity</Text>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* Bottom Half: Keyboard */}
      <View className="p-8">
        <TextInput
          className="border-white border p-3 rounded-lg text-white mb-20"
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
