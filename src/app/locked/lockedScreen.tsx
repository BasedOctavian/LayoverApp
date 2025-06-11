import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { ThemeContext } from "../../context/ThemeContext";
import TopBar from "../../components/TopBar";
import { SafeAreaView } from "react-native-safe-area-context";

const LockedScreen = () => {
  const { theme } = React.useContext(ThemeContext);
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
      <TopBar />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <View style={[styles.lockedContainer, { 
            backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
            borderColor: "#37a4c8"
          }]}>
            <Feather name="lock" size={48} color="#37a4c8" />
            <Text style={[styles.title, { 
              color: theme === "light" ? "#000000" : "#ffffff",
              fontFamily: "Inter-Bold"
            }]}>
              Feature Locked
            </Text>
            <Text style={[styles.subtitle, { 
              color: theme === "light" ? "#64748B" : "#a0aec0",
              fontFamily: "Inter-Regular"
            }]}>
              This feature is currently under development and will be available soon.
            </Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  lockedContainer: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: "100%",
    borderWidth: 1,
  },
  title: {
    fontSize: 28,
    textAlign: "center",
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 24,
  },
});

export default LockedScreen;