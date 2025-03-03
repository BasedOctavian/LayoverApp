import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

const LockedScreen = () => {
  return (
    <LinearGradient colors={["#F8FAFF", "#EFF2FF"]} style={styles.gradient}>
      <View style={styles.outerContainer}>
        <View style={styles.lockedContainer}>
          <Feather name="lock" size={48} color="#64748B" />
          <Text style={styles.title}>Feature Locked</Text>
          <Text style={styles.subtitle}>
            This feature is currently under development and will be available soon.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  outerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  lockedContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: "100%",
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter-Bold",
    color: "#1E293B",
    textAlign: "center",
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter-Regular",
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
  },
});

export default LockedScreen;