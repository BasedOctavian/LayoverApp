// ThemeContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from "react";
import { Appearance, ColorSchemeName } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeContextType = {
  theme: ColorSchemeName;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
});

type Props = {
  children: ReactNode;
};

export const ThemeProvider = ({ children }: Props) => {
  // Get the initial system theme
  const systemTheme = Appearance.getColorScheme() || "light";
  
  // State for the current theme and its source
  const [theme, setTheme] = useState<ColorSchemeName>(systemTheme);
  const [themeSource, setThemeSource] = useState<"saved" | "system">("system");

  // Load saved theme from AsyncStorage on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("theme");
        if (savedTheme) {
          // If a saved theme exists, use it and mark as user-set
          setTheme(savedTheme as ColorSchemeName);
          setThemeSource("saved");
        } else {
          // No saved theme, use system theme and follow system
          setTheme(systemTheme);
          setThemeSource("system");
        }
      } catch (error) {
        console.error("Failed to load theme from AsyncStorage:", error);
        // Fallback to system theme on error
        setTheme(systemTheme);
        setThemeSource("system");
      }
    };

    loadTheme();
  }, [systemTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      // Only update theme if following the system
      if (themeSource === "system") {
        setTheme(colorScheme || "light");
      }
    });
    return () => listener.remove();
  }, [themeSource]);

  // Toggle theme and save to AsyncStorage
  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    try {
      await AsyncStorage.setItem("theme", newTheme);
      setTheme(newTheme);
      setThemeSource("saved"); // Mark as user-set
    } catch (error) {
      console.error("Failed to save theme to AsyncStorage:", error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};