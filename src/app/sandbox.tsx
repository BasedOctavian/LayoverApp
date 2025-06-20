import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../context/ThemeContext';
import TopBar from '../components/TopBar';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

interface ColorSwatchProps {
  name: string;
  color: string;
  textColor: string;
}

const ColorSwatch: React.FC<ColorSwatchProps> = ({ name, color, textColor }) => (
  <View style={styles.swatchContainer}>
    <View style={[styles.swatch, { backgroundColor: color }]} />
    <View style={styles.swatchInfo}>
      <Text style={[styles.swatchName, { color: textColor }]}>{name}</Text>
      <Text style={[styles.swatchValue, { color: textColor }]}>{color}</Text>
    </View>
  </View>
);

interface ColorSectionProps {
  title: string;
  colors: Array<{ name: string; color: string }>;
  textColor: string;
}

const ColorSection: React.FC<ColorSectionProps> = ({ title, colors, textColor }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const [contentHeight, setContentHeight] = useState(0);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    Animated.spring(animation, {
      toValue: isExpanded ? 0 : 1,
      useNativeDriver: false,
      tension: 65,
      friction: 11,
    }).start();
  };

  const maxHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight],
  });

  const contentOpacity = animation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={styles.section}>
      <TouchableOpacity 
        style={styles.sectionHeader} 
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.sectionTitleContainer}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
          {!isExpanded && (
            <View style={styles.colorPreviewContainer}>
              {colors.slice(0, 3).map((color, index) => (
                <View 
                  key={index}
                  style={[
                    styles.colorPreview,
                    { backgroundColor: color.color },
                    index > 0 && { marginLeft: -8 }
                  ]}
                />
              ))}
            </View>
          )}
        </View>
        <MaterialIcons 
          name={isExpanded ? "remove" : "add"} 
          size={24} 
          color={textColor} 
        />
      </TouchableOpacity>
      <Animated.View 
        style={{ 
          maxHeight,
          overflow: 'hidden',
        }}
      >
        <View 
          style={[
            styles.sectionContent,
            {
              opacity: isExpanded ? 1 : 0,
            }
          ]}
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            setContentHeight(height);
          }}
        >
          <View style={styles.swatchesGrid}>
            {colors.map((color) => (
              <ColorSwatch
                key={color.name}
                name={color.name}
                color={color.color}
                textColor={textColor}
              />
            ))}
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

interface ColorPreset {
  name: string;
  color: string;
}

const colorPresets: ColorPreset[] = [
  { name: "Ocean Blue", color: "#37a4c8" },
  { name: "Forest Green", color: "#2ecc71" },
  { name: "Sunset Orange", color: "#e67e22" },
  { name: "Royal Purple", color: "#9b59b6" },
  { name: "Crimson Red", color: "#e74c3c" },
  { name: "Teal", color: "#1abc9c" },
  { name: "Amber", color: "#f1c40f" },
  { name: "Slate", color: "#34495e" },
  { name: "Rose Gold", color: "#bd8c7d" },
  { name: "Mint", color: "#48d1cc" },
  { name: "Lavender", color: "#9b7edb" },
  { name: "Coral", color: "#ff7f50" },
  { name: "Sage", color: "#9caf88" },
  { name: "Navy", color: "#2c3e50" },
  { name: "Marigold", color: "#f39c12" },
  { name: "Turquoise", color: "#1abc9c" },
];

interface ColorSettings {
  intensity: 'light' | 'medium' | 'high';
  contrast: 'light' | 'medium' | 'high';
  harmony: 'complementary' | 'analogous' | 'triadic' | 'split-complementary';
  saturation: 'light' | 'medium' | 'high';
  backgroundStyle: 'solid' | 'gradient';
}

function generateColorScheme(baseColor: string, settings: ColorSettings, theme: 'light' | 'dark') {
  // Convert hex to HSL for better color manipulation
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

  const baseHSL = hexToHSL(baseColor);
  
  // Convert settings to numeric values
  const getIntensityValue = (setting: 'light' | 'medium' | 'high') => {
    switch (setting) {
      case 'light': return 0.3;
      case 'medium': return 0.6;
      case 'high': return 0.9;
    }
  };

  const getSaturationValue = (setting: 'light' | 'medium' | 'high') => {
    switch (setting) {
      case 'light': return -40;
      case 'medium': return 0;
      case 'high': return 50;
    }
  };

  const getContrastValue = (setting: 'light' | 'medium' | 'high') => {
    switch (setting) {
      case 'light': return 0.3;
      case 'medium': return 0.6;
      case 'high': return 0.9;
    }
  };

  // Apply settings with enhanced saturation effect
  const adjustedHSL = {
    h: baseHSL.h,
    s: Math.min(100, Math.max(0, baseHSL.s + getSaturationValue(settings.saturation))),
    l: baseHSL.l
  };

  // Enhanced harmony color generation
  const getHarmonyColors = () => {
    const h = adjustedHSL.h;
    const s = adjustedHSL.s;
    const l = adjustedHSL.l;

    // Helper to create variations of a color
    const createVariation = (hue: number, sat: number, light: number) => {
      return HSLToHex(
        (hue + 360) % 360,
        Math.min(100, Math.max(0, sat)),
        Math.min(100, Math.max(0, light))
      );
    };

    switch (settings.harmony) {
      case 'complementary':
        return [
          createVariation(h + 180, s, l),
          createVariation(h + 180, s + 10, l - 10),
          createVariation(h + 180, s - 10, l + 10)
        ];
      case 'analogous':
        return [
          createVariation(h + 30, s, l),
          createVariation(h + 60, s + 5, l - 5),
          createVariation(h - 30, s - 5, l + 5)
        ];
      case 'triadic':
        return [
          createVariation(h + 120, s, l),
          createVariation(h + 120, s + 10, l - 5),
          createVariation(h + 240, s - 5, l + 5)
        ];
      case 'split-complementary':
        return [
          createVariation(h + 150, s, l),
          createVariation(h + 150, s + 10, l - 5),
          createVariation(h + 210, s - 5, l + 5)
        ];
    }
  };

  const harmonyColors = getHarmonyColors();
  const intensity = getIntensityValue(settings.intensity);
  const contrast = getContrastValue(settings.contrast);

  // Enhanced color variations
  const darken = (amount: number) => {
    const newL = Math.max(0, adjustedHSL.l - (amount * intensity));
    return HSLToHex(adjustedHSL.h, adjustedHSL.s, newL);
  };

  const lighten = (amount: number) => {
    const newL = Math.min(100, adjustedHSL.l + (amount * intensity));
    return HSLToHex(adjustedHSL.h, adjustedHSL.s, newL);
  };

  // Theme-specific colors
  const themeColors = {
    light: {
      text: {
        primary: "#0F172A",
        secondary: "#64748B",
        tertiary: "#94A3B8",
        inverted: "#FFFFFF"
      },
      background: {
        main: "#FFFFFF",
        secondary: lighten(45),
        tertiary: lighten(40)
      },
      shadow: "rgba(0, 0, 0, 0.15)"
    },
    dark: {
      text: {
        primary: "#FFFFFF",
        secondary: "#CBD5E1",
        tertiary: "#94A3B8",
        inverted: "#0F172A"
      },
      background: {
        main: "#000000",
        secondary: darken(20),
        tertiary: darken(30)
      },
      shadow: "rgba(0, 0, 0, 0.5)"
    }
  };

  const currentTheme = themeColors[theme];
  const primaryColor = HSLToHex(adjustedHSL.h, adjustedHSL.s, adjustedHSL.l);
  const primaryDark = darken(40);
  const primaryLight = lighten(40);

  // Create more distinct variations for each color category
  return {
    primary: [
      { name: "Primary", color: primaryColor },
      { name: "Primary Dark", color: primaryDark },
      { name: "Primary Light", color: primaryLight },
      { name: "Primary Shadow", color: darken(30) },
    ],
    text: [
      { name: "Primary Text", color: currentTheme.text.primary },
      { name: "Secondary Text", color: currentTheme.text.secondary },
      { name: "Tertiary Text", color: currentTheme.text.tertiary },
      { name: "Inverted Text", color: currentTheme.text.inverted },
    ],
    background: [
      { 
        name: "Main Background", 
        color: settings.backgroundStyle === 'solid' 
          ? currentTheme.background.main 
          : `linear-gradient(${currentTheme.background.main}, ${primaryColor}20)`
      },
      { 
        name: "Secondary Background", 
        color: settings.backgroundStyle === 'solid'
          ? currentTheme.background.secondary
          : `linear-gradient(${currentTheme.background.secondary}, ${primaryColor}10)`
      },
      { 
        name: "Tertiary Background", 
        color: settings.backgroundStyle === 'solid'
          ? currentTheme.background.tertiary
          : `linear-gradient(${currentTheme.background.tertiary}, ${primaryColor}05)`
      },
      { name: "Accent Background", color: primaryLight },
    ],
    status: [
      { name: "Success", color: "#34C759" },
      { name: "Error", color: "#FF3B30" },
      { name: "Warning", color: "#FF9500" },
      { name: "Info", color: primaryColor },
    ],
    gradients: [
      { name: "Primary Gradient", color: `linear-gradient(${primaryColor}, ${primaryDark})` },
      { name: "Light Gradient", color: `linear-gradient(${primaryLight}, ${lighten(30)})` },
      { name: "Dark Gradient", color: `linear-gradient(${primaryDark}, ${darken(55)})` },
      { name: "Harmony Gradient", color: `linear-gradient(${primaryColor}, ${harmonyColors[0]})` },
    ],
    shadows: [
      { name: "Primary Shadow", color: darken(30) },
      { name: "Secondary Shadow", color: currentTheme.shadow },
    ],
    borders: [
      { name: "Primary Border", color: primaryColor },
      { name: "Secondary Border", color: primaryLight },
    ],
  };
}

interface ColorPresetButtonProps {
  preset: ColorPreset;
  isSelected: boolean;
  onSelect: () => void;
  textColor: string;
}

const ColorPresetButton: React.FC<ColorPresetButtonProps> = ({ preset, isSelected, onSelect, textColor }) => (
  <TouchableOpacity
    style={[
      styles.presetButton,
      { borderColor: isSelected ? preset.color : textColor }
    ]}
    onPress={onSelect}
    activeOpacity={0.7}
  >
    <View style={[styles.presetColor, { backgroundColor: preset.color }]} />
    <Text style={[styles.presetName, { color: textColor }]}>{preset.name}</Text>
  </TouchableOpacity>
);

interface SettingButtonProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  textColor: string;
}

const SettingButton: React.FC<SettingButtonProps> = ({ label, isSelected, onPress, textColor }) => (
  <TouchableOpacity
    style={[
      styles.settingButton,
      { 
        borderColor: isSelected ? textColor : `${textColor}40`,
        backgroundColor: isSelected ? `${textColor}10` : 'transparent'
      }
    ]}
    onPress={onPress}
  >
    <Text style={[styles.settingButtonText, { color: textColor }]}>{label}</Text>
  </TouchableOpacity>
);

interface ColorSettingsProps {
  settings: ColorSettings;
  onSettingsChange: (settings: ColorSettings) => void;
  textColor: string;
}

const ColorSettings: React.FC<ColorSettingsProps> = ({ settings, onSettingsChange, textColor }) => (
  <View style={styles.settingsContainer}>
    <View style={styles.settingItem}>
      <Text style={[styles.settingLabel, { color: textColor }]}>Intensity</Text>
      <View style={styles.settingButtons}>
        {(['light', 'medium', 'high'] as const).map((value) => (
          <SettingButton
            key={value}
            label={value.charAt(0).toUpperCase() + value.slice(1)}
            isSelected={settings.intensity === value}
            onPress={() => onSettingsChange({ ...settings, intensity: value })}
            textColor={textColor}
          />
        ))}
      </View>
    </View>

    <View style={styles.settingItem}>
      <Text style={[styles.settingLabel, { color: textColor }]}>Contrast</Text>
      <View style={styles.settingButtons}>
        {(['light', 'medium', 'high'] as const).map((value) => (
          <SettingButton
            key={value}
            label={value.charAt(0).toUpperCase() + value.slice(1)}
            isSelected={settings.contrast === value}
            onPress={() => onSettingsChange({ ...settings, contrast: value })}
            textColor={textColor}
          />
        ))}
      </View>
    </View>

    <View style={styles.settingItem}>
      <Text style={[styles.settingLabel, { color: textColor }]}>Saturation</Text>
      <View style={styles.settingButtons}>
        {(['light', 'medium', 'high'] as const).map((value) => (
          <SettingButton
            key={value}
            label={value.charAt(0).toUpperCase() + value.slice(1)}
            isSelected={settings.saturation === value}
            onPress={() => onSettingsChange({ ...settings, saturation: value })}
            textColor={textColor}
          />
        ))}
      </View>
    </View>

    <View style={styles.settingItem}>
      <Text style={[styles.settingLabel, { color: textColor }]}>Color Harmony</Text>
      <View style={styles.harmonyButtons}>
        {(['complementary', 'analogous', 'triadic', 'split-complementary'] as const).map((harmony) => (
          <SettingButton
            key={harmony}
            label={harmony.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            isSelected={settings.harmony === harmony}
            onPress={() => onSettingsChange({ ...settings, harmony })}
            textColor={textColor}
          />
        ))}
      </View>
    </View>

    <View style={styles.settingItem}>
      <Text style={[styles.settingLabel, { color: textColor }]}>Background Style</Text>
      <View style={styles.settingButtons}>
        <SettingButton
          label="Solid"
          isSelected={settings.backgroundStyle === 'solid'}
          onPress={() => onSettingsChange({ ...settings, backgroundStyle: 'solid' })}
          textColor={textColor}
        />
        <SettingButton
          label="Gradient"
          isSelected={settings.backgroundStyle === 'gradient'}
          onPress={() => onSettingsChange({ ...settings, backgroundStyle: 'gradient' })}
          textColor={textColor}
        />
      </View>
    </View>
  </View>
);

export default function Sandbox() {
  const { theme } = React.useContext(ThemeContext);
  const currentTheme = (theme ?? 'light') as 'light' | 'dark';
  const textColor = currentTheme === "light" ? "#0F172A" : "#e4fbfe";
  const backgroundColor = currentTheme === "light" ? "#f8f9fa" : "#000000";
  const sectionBgColor = currentTheme === "light" ? "#FFFFFF" : "#000000";
  
  const [selectedPreset, setSelectedPreset] = useState<ColorPreset>(colorPresets[0]);
  const [settings, setSettings] = useState<ColorSettings>({
    intensity: 'medium',
    contrast: 'medium',
    harmony: 'complementary',
    saturation: 'medium',
    backgroundStyle: 'solid',
  });
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>('light');
  const [customColorScheme, setCustomColorScheme] = useState(
    generateColorScheme(colorPresets[0].color, settings, selectedTheme)
  );

  const handlePresetSelect = (preset: ColorPreset) => {
    setSelectedPreset(preset);
    setCustomColorScheme(generateColorScheme(preset.color, settings, selectedTheme));
  };

  const handleSettingsChange = (newSettings: ColorSettings) => {
    setSettings(newSettings);
    setCustomColorScheme(generateColorScheme(selectedPreset.color, newSettings, selectedTheme));
  };

  const handleThemeChange = (theme: 'light' | 'dark') => {
    setSelectedTheme(theme);
    setCustomColorScheme(generateColorScheme(selectedPreset.color, settings, theme));
  };

  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["bottom"]}>
      <TopBar />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <MaterialIcons name="palette" size={24} color={textColor} />
          <Text style={[styles.heading, { color: textColor }]}>Color Scheme</Text>
        </View>
        <Text style={[styles.description, { color: textColor }]}>
          Current theme: {currentTheme[0].toUpperCase() + currentTheme.slice(1)} Mode
        </Text>

        <View style={[styles.section, { backgroundColor: sectionBgColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Build Your Color Scheme</Text>
          <Text style={[styles.sectionDescription, { color: textColor }]}>
            Select a primary color and adjust settings to generate a complete color scheme
          </Text>

          {/* Theme Selector */}
          <View style={styles.themeSelector}>
            <Text style={[styles.settingLabel, { color: textColor }]}>Preview Theme</Text>
            <View style={styles.themeButtons}>
              <TouchableOpacity
                style={[
                  styles.themeButton,
                  { 
                    backgroundColor: selectedTheme === 'light' ? `${textColor}20` : 'transparent',
                    borderColor: selectedTheme === 'light' ? textColor : `${textColor}40`
                  }
                ]}
                onPress={() => handleThemeChange('light')}
              >
                <MaterialIcons name="light-mode" size={20} color={textColor} />
                <Text style={[styles.themeButtonText, { color: textColor }]}>Light</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.themeButton,
                  { 
                    backgroundColor: selectedTheme === 'dark' ? `${textColor}20` : 'transparent',
                    borderColor: selectedTheme === 'dark' ? textColor : `${textColor}40`
                  }
                ]}
                onPress={() => handleThemeChange('dark')}
              >
                <MaterialIcons name="dark-mode" size={20} color={textColor} />
                <Text style={[styles.themeButtonText, { color: textColor }]}>Dark</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.presetsGrid}>
            {colorPresets.map((preset) => (
              <ColorPresetButton
                key={preset.name}
                preset={preset}
                isSelected={selectedPreset.name === preset.name}
                onSelect={() => handlePresetSelect(preset)}
                textColor={textColor}
              />
            ))}
          </View>

          <ColorSettings
            settings={settings}
            onSettingsChange={handleSettingsChange}
            textColor={textColor}
          />
        </View>

        <ColorSection
          title="Primary Colors"
          colors={customColorScheme.primary}
          textColor={textColor}
        />

        <ColorSection
          title="Text Colors"
          colors={customColorScheme.text}
          textColor={textColor}
        />

        <ColorSection
          title="Background Colors"
          colors={customColorScheme.background}
          textColor={textColor}
        />

        <ColorSection
          title="Status Colors"
          colors={customColorScheme.status}
          textColor={textColor}
        />

        <ColorSection
          title="Border Colors"
          colors={customColorScheme.borders}
          textColor={textColor}
        />

        <ColorSection
          title="Shadow Colors"
          colors={customColorScheme.shadows}
          textColor={textColor}
        />

        <ColorSection
          title="Gradients"
          colors={customColorScheme.gradients}
          textColor={textColor}
        />
      </ScrollView>

      <TouchableOpacity
        style={[styles.testButton, { backgroundColor: sectionBgColor }]}
        onPress={() => router.push({
          pathname: 'settings/settingsTest',
          params: { colorScheme: JSON.stringify(customColorScheme) }
        })}
      >
        <Text style={[styles.testButtonText, { color: textColor }]}>Test Settings</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  heading: {
    fontSize: 28,
    fontWeight: "bold",
  },
  description: {
    fontSize: 16,
    marginBottom: 24,
    opacity: 0.8,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  colorPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorPreview: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  sectionContent: {
    paddingTop: 8,
  },
  swatchesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingBottom: 8,
  },
  swatchContainer: {
    width: '48%',
    marginBottom: 16,
  },
  swatch: {
    height: 80,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  swatchInfo: {
    gap: 4,
  },
  swatchName: {
    fontSize: 14,
    fontWeight: "500",
  },
  swatchValue: {
    fontSize: 12,
    opacity: 0.7,
  },
  gradientContainer: {
    gap: 16,
  },
  gradientItem: {
    marginBottom: 16,
  },
  gradientPreview: {
    height: 80,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  gradientInfo: {
    gap: 4,
  },
  gradientName: {
    fontSize: 14,
    fontWeight: "500",
  },
  gradientValue: {
    fontSize: 12,
    opacity: 0.7,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    opacity: 0.8,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  presetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    minWidth: '48%',
  },
  presetColor: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  presetName: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingsContainer: {
    marginTop: 24,
    gap: 20,
  },
  settingItem: {
    gap: 8,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  settingButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  settingButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  harmonyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  testButton: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  themeSelector: {
    marginBottom: 24,
    gap: 8,
  },
  themeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  themeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  themeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 