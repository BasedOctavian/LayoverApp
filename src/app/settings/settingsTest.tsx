import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";
import TopBar from "../../components/TopBar";

// Color manipulation functions
const hexToHSL = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

const HSLToHex = (h: number, s: number, l: number) => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${Math.round(255 * f(0)).toString(16).padStart(2, '0')}${Math.round(255 * f(8)).toString(16).padStart(2, '0')}${Math.round(255 * f(4)).toString(16).padStart(2, '0')}`;
};

const lighten = (amount: number) => (color: string) => {
  const hsl = hexToHSL(color);
  const newL = Math.min(100, hsl.l + amount);
  return HSLToHex(hsl.h, hsl.s, newL);
};

const darken = (amount: number) => (color: string) => {
  const hsl = hexToHSL(color);
  const newL = Math.max(0, hsl.l - amount);
  return HSLToHex(hsl.h, hsl.s, newL);
};

interface ColorScheme {
  primary: Array<{ name: string; color: string }>;
  text: Array<{ name: string; color: string }>;
  background: Array<{ name: string; color: string }>;
  status: Array<{ name: string; color: string }>;
  borders: Array<{ name: string; color: string }>;
  shadows: Array<{ name: string; color: string }>;
  gradients: Array<{ name: string; color: string }>;
}

export default function SettingsTest() {
  const { theme } = React.useContext(ThemeContext);
  const params = useLocalSearchParams();
  const colorScheme: ColorScheme = params.colorScheme ? JSON.parse(params.colorScheme as string) : null;

  // Get colors from the scheme with fallbacks
  const primaryColor = colorScheme?.primary[0]?.color || "#37a4c8";
  const primaryDark = colorScheme?.primary[1]?.color || "#2c8ba8";
  const primaryLight = colorScheme?.primary[2]?.color || "#4cb8d8";
  
  const textPrimary = colorScheme?.text[0]?.color || (theme === "light" ? "#0F172A" : "#e4fbfe");
  const textSecondary = colorScheme?.text[1]?.color || (theme === "light" ? "#64748B" : "#CBD5E1");
  const textTertiary = colorScheme?.text[2]?.color || (theme === "light" ? "#94A3B8" : "#94A3B8");
  
  const bgMain = colorScheme?.background[0]?.color || (theme === "light" ? "#FFFFFF" : "#000000");
  const bgSecondary = colorScheme?.background[1]?.color || (theme === "light" ? primaryLight : primaryDark);
  const bgTertiary = colorScheme?.background[2]?.color || (theme === "light" ? primaryLight : primaryDark);
  const bgAccent = colorScheme?.background[3]?.color || primaryLight;
  
  const borderPrimary = colorScheme?.borders[0]?.color || primaryColor;
  const borderSecondary = colorScheme?.borders[1]?.color || primaryLight;
  
  const shadowPrimary = colorScheme?.shadows[0]?.color || primaryDark;
  const shadowSecondary = colorScheme?.shadows[1]?.color || (theme === "light" ? "rgba(0, 0, 0, 0.15)" : "rgba(0, 0, 0, 0.5)");
  
  const statusError = colorScheme?.status[1]?.color || "#FF3B30";
  const statusSuccess = colorScheme?.status[0]?.color || "#34C759";
  const statusWarning = colorScheme?.status[2]?.color || "#FF9500";

  // Check if background is a gradient
  const isGradient = typeof bgMain === 'string' && bgMain.startsWith('linear-gradient');
  const gradientColors = isGradient 
    ? (bgMain.replace('linear-gradient(', '').replace(')', '').split(', ') as [string, string])
    : [bgMain, bgMain] as [string, string];

  // Create lighter versions of the main background color for buttons
  const buttonBg = theme === "light" ? lighten(5)(bgMain) : lighten(10)(bgMain);
  const buttonBgHover = theme === "light" ? lighten(10)(bgMain) : lighten(15)(bgMain);

  return (
    <View style={styles.container}>
      <TopBar 
        showBackButton={true}
        onBackPress={() => router.back()}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        {isGradient ? (
          <LinearGradient
            colors={gradientColors}
            style={styles.gradientBackground}
          >
            <ScrollView 
              contentContainerStyle={styles.settingsContainer}
            >
              {/* Test Indicator */}
              <View style={[styles.testIndicator, { 
                backgroundColor: bgMain,
                borderColor: primaryColor
              }]}>
                <Ionicons name="flask" size={24} color={primaryColor} />
                <Text style={[styles.testIndicatorText, { color: primaryColor }]}>
                  Test Environment
                </Text>
              </View>

              {/* Header with Settings Title */}
              <View style={styles.header}>
                <Text 
                  style={[styles.headerTitle, { color: textPrimary }]}
                  accessibilityRole="header"
                >
                  Settings (Test)
                </Text>
              </View>

              {/* User Information Section */}
              <View style={[styles.userHeader, { 
                backgroundColor: buttonBg,
                borderColor: borderPrimary,
                shadowColor: shadowPrimary
              }]}>
                <View style={styles.profilePictureContainer}>
                  <Image 
                    source={{ uri: 'https://i.pravatar.cc/300' }} 
                    style={styles.profilePicture}
                    accessibilityLabel="Example profile picture"
                  />
                </View>
                <View style={styles.userNameContainer}>
                  <Text style={[styles.userName, { color: textPrimary }]}>
                    John Doe
                  </Text>
                </View>
              </View>

              {/* Account Section */}
              <View style={styles.settingsSection}>
                <Text 
                  style={[styles.sectionTitle, { color: textPrimary }]}
                  accessibilityRole="header"
                >
                  Account
                </Text>
                <View style={[styles.settingsItem, { 
                  backgroundColor: buttonBg,
                  borderColor: borderPrimary,
                  shadowColor: shadowPrimary
                }]}>
                  <View style={[styles.settingsGradient, { backgroundColor: buttonBg }]}>
                    <Ionicons name="person" size={24} color={primaryColor} />
                    <Text style={[styles.settingsText, { color: textPrimary }]}>Edit Profile</Text>
                    <Feather name="chevron-right" size={24} color={primaryColor} style={styles.chevronIcon} />
                  </View>
                </View>
                <View style={[styles.settingsItem, { 
                  backgroundColor: buttonBg,
                  borderColor: borderPrimary,
                  shadowColor: shadowPrimary
                }]}>
                  <View style={[styles.settingsGradient, { backgroundColor: buttonBg }]}>
                    <Ionicons name="lock-closed" size={24} color={primaryColor} />
                    <Text style={[styles.settingsText, { color: textPrimary }]}>Change Password</Text>
                    <Feather name="chevron-right" size={24} color={primaryColor} style={styles.chevronIcon} />
                  </View>
                </View>
              </View>

              {/* App Settings Section */}
              <View style={styles.settingsSection}>
                <Text 
                  style={[styles.sectionTitle, { color: textPrimary }]}
                  accessibilityRole="header"
                >
                  App Settings
                </Text>
                <View style={[styles.settingsItem, { 
                  backgroundColor: buttonBg,
                  borderColor: borderPrimary,
                  shadowColor: shadowPrimary
                }]}>
                  <View style={[styles.settingsGradient, { backgroundColor: buttonBg }]}>
                    <Ionicons name="color-palette" size={24} color={primaryColor} />
                    <Text style={[styles.settingsText, { color: textPrimary }]}>Theme</Text>
                    <View style={[styles.toggleContainer, { 
                      backgroundColor: buttonBgHover,
                      borderColor: borderPrimary
                    }]}>
                      <View
                        style={[
                          styles.toggleCircle,
                          { 
                            transform: [{ translateX: theme === "light" ? 0 : 40 }],
                            backgroundColor: primaryColor
                          },
                        ]}
                      />
                      <Text style={[styles.toggleText, { color: textPrimary }]}>
                        {theme === "light" ? "Light" : "Dark"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Color Scheme Preview */}
              <View style={styles.settingsSection}>
                <Text 
                  style={[styles.sectionTitle, { color: textPrimary }]}
                  accessibilityRole="header"
                >
                  Color Scheme Preview
                </Text>
                <View style={[styles.colorPreview, { backgroundColor: buttonBg }]}>
                  <View style={styles.colorRow}>
                    <View style={[styles.colorSwatch, { backgroundColor: primaryColor }]} />
                    <Text style={[styles.colorLabel, { color: textPrimary }]}>Primary</Text>
                  </View>
                  <View style={styles.colorRow}>
                    <View style={[styles.colorSwatch, { backgroundColor: primaryDark }]} />
                    <Text style={[styles.colorLabel, { color: textPrimary }]}>Primary Dark</Text>
                  </View>
                  <View style={styles.colorRow}>
                    <View style={[styles.colorSwatch, { backgroundColor: primaryLight }]} />
                    <Text style={[styles.colorLabel, { color: textPrimary }]}>Primary Light</Text>
                  </View>
                </View>
              </View>

              {/* Logo and Copyright Section */}
              <View style={styles.footer}>
                <Image
                  source={require('../../../assets/adaptive-icon.png')}
                  style={[
                    styles.footerLogo,
                    { tintColor: textPrimary }
                  ]}
                  resizeMode="contain"
                />
                <Text style={[styles.copyrightText, { color: textSecondary }]}>
                  © 2025 Wingman. All rights reserved.
                </Text>
              </View>
            </ScrollView>
          </LinearGradient>
        ) : (
          <ScrollView 
            contentContainerStyle={[styles.settingsContainer, { backgroundColor: bgMain }]}
          >
            {/* Test Indicator */}
            <View style={[styles.testIndicator, { 
              backgroundColor: bgMain,
              borderColor: primaryColor
            }]}>
              <Ionicons name="flask" size={24} color={primaryColor} />
              <Text style={[styles.testIndicatorText, { color: primaryColor }]}>
                Test Environment
              </Text>
            </View>

            {/* Header with Settings Title */}
            <View style={styles.header}>
              <Text 
                style={[styles.headerTitle, { color: textPrimary }]}
                accessibilityRole="header"
              >
                Settings (Test)
              </Text>
            </View>

            {/* User Information Section */}
            <View style={[styles.userHeader, { 
              backgroundColor: buttonBg,
              borderColor: borderPrimary,
              shadowColor: shadowPrimary
            }]}>
              <View style={styles.profilePictureContainer}>
                <Image 
                  source={{ uri: 'https://i.pravatar.cc/300' }} 
                  style={styles.profilePicture}
                  accessibilityLabel="Example profile picture"
                />
              </View>
              <View style={styles.userNameContainer}>
                <Text style={[styles.userName, { color: textPrimary }]}>
                  John Doe
                </Text>
              </View>
            </View>

            {/* Account Section */}
            <View style={styles.settingsSection}>
              <Text 
                style={[styles.sectionTitle, { color: textPrimary }]}
                accessibilityRole="header"
              >
                Account
              </Text>
              <View style={[styles.settingsItem, { 
                backgroundColor: buttonBg,
                borderColor: borderPrimary,
                shadowColor: shadowPrimary
              }]}>
                <View style={[styles.settingsGradient, { backgroundColor: buttonBg }]}>
                  <Ionicons name="person" size={24} color={primaryColor} />
                  <Text style={[styles.settingsText, { color: textPrimary }]}>Edit Profile</Text>
                  <Feather name="chevron-right" size={24} color={primaryColor} style={styles.chevronIcon} />
                </View>
              </View>
              <View style={[styles.settingsItem, { 
                backgroundColor: buttonBg,
                borderColor: borderPrimary,
                shadowColor: shadowPrimary
              }]}>
                <View style={[styles.settingsGradient, { backgroundColor: buttonBg }]}>
                  <Ionicons name="lock-closed" size={24} color={primaryColor} />
                  <Text style={[styles.settingsText, { color: textPrimary }]}>Change Password</Text>
                  <Feather name="chevron-right" size={24} color={primaryColor} style={styles.chevronIcon} />
                </View>
              </View>
            </View>

            {/* App Settings Section */}
            <View style={styles.settingsSection}>
              <Text 
                style={[styles.sectionTitle, { color: textPrimary }]}
                accessibilityRole="header"
              >
                App Settings
              </Text>
              <View style={[styles.settingsItem, { 
                backgroundColor: buttonBg,
                borderColor: borderPrimary,
                shadowColor: shadowPrimary
              }]}>
                <View style={[styles.settingsGradient, { backgroundColor: buttonBg }]}>
                  <Ionicons name="color-palette" size={24} color={primaryColor} />
                  <Text style={[styles.settingsText, { color: textPrimary }]}>Theme</Text>
                  <View style={[styles.toggleContainer, { 
                    backgroundColor: buttonBgHover,
                    borderColor: borderPrimary
                  }]}>
                    <View
                      style={[
                        styles.toggleCircle,
                        { 
                          transform: [{ translateX: theme === "light" ? 0 : 40 }],
                          backgroundColor: primaryColor
                        },
                      ]}
                    />
                    <Text style={[styles.toggleText, { color: textPrimary }]}>
                      {theme === "light" ? "Light" : "Dark"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Color Scheme Preview */}
            <View style={styles.settingsSection}>
              <Text 
                style={[styles.sectionTitle, { color: textPrimary }]}
                accessibilityRole="header"
              >
                Color Scheme Preview
              </Text>
              <View style={[styles.colorPreview, { backgroundColor: buttonBg }]}>
                <View style={styles.colorRow}>
                  <View style={[styles.colorSwatch, { backgroundColor: primaryColor }]} />
                  <Text style={[styles.colorLabel, { color: textPrimary }]}>Primary</Text>
                </View>
                <View style={styles.colorRow}>
                  <View style={[styles.colorSwatch, { backgroundColor: primaryDark }]} />
                  <Text style={[styles.colorLabel, { color: textPrimary }]}>Primary Dark</Text>
                </View>
                <View style={styles.colorRow}>
                  <View style={[styles.colorSwatch, { backgroundColor: primaryLight }]} />
                  <Text style={[styles.colorLabel, { color: textPrimary }]}>Primary Light</Text>
                </View>
              </View>
            </View>

            {/* Logo and Copyright Section */}
            <View style={styles.footer}>
              <Image
                source={require('../../../assets/adaptive-icon.png')}
                style={[
                  styles.footerLogo,
                  { tintColor: textPrimary }
                ]}
                resizeMode="contain"
              />
              <Text style={[styles.copyrightText, { color: textSecondary }]}>
                © 2025 Wingman. All rights reserved.
              </Text>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  settingsContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    padding: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
  },
  testIndicator: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ff5252",
  },
  testIndicatorText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  profilePictureContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    overflow: 'hidden',
  },
  profilePicture: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  userNameContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  settingsItem: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  settingsGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  settingsText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  chevronIcon: {
    marginLeft: "auto",
  },
  toggleContainer: {
    width: 80,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    marginLeft: "auto",
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
  },
  toggleCircle: {
    width: 40,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#37a4c8",
    position: "absolute",
  },
  toggleText: {
    fontSize: 12,
    textAlign: "center",
    position: "absolute",
    width: "100%",
    lineHeight: 30,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  footerLogo: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  copyrightText: {
    fontSize: 14,
    opacity: 0.7,
  },
  colorPreview: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  colorLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 