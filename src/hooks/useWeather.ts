import { useState, useEffect } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  city: string;
  country: string;
  sunrise: string;
  sunset: string;
  pressure: number;
  visibility: number;
}

interface Location {
  lat: number;
  long: number;
}

// Mock weather data generator for demo purposes
const generateMockWeather = (location: Location): WeatherData => {
  return {
    temperature: 21, // 70°F in Celsius
    feelsLike: 23,
    humidity: 65,
    windSpeed: 8,
    description: 'clear sky',
    icon: '01d',
    city: 'Hamburg',
    country: 'US',
    sunrise: '5:30 AM',
    sunset: '9:45 PM',
    pressure: 1013,
    visibility: 10,
  };
};

export const useWeather = (location: Location | null, collapsed: boolean = false) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location || collapsed) {
      setWeatherData(null);
      return;
    }

    const fetchWeather = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Always use mock data for testing
        const mockWeather = generateMockWeather(location);
        setWeatherData(mockWeather);
        
        // API call code commented out for testing
        /*
        const API_KEY = 'b826b109df36520bca71661452bdc1e1';
        const response = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.long}&appid=${API_KEY}&units=metric`
        );

        const data = response.data;
        
        const weather: WeatherData = {
          temperature: Math.round(data.main.temp),
          feelsLike: Math.round(data.main.feels_like),
          humidity: data.main.humidity,
          windSpeed: Math.round(data.wind.speed * 2.237),
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          city: data.name,
          country: data.sys.country,
          sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }),
          sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }),
          pressure: data.main.pressure,
          visibility: Math.round(data.visibility / 1000),
        };

        setWeatherData(weather);
        */
        
      } catch (err: any) {
        console.error('Error fetching weather:', err);
        setError('Failed to load weather data');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [location, collapsed]);

  return { weatherData, loading, error };
};

// Hook to manage weather collapse state
export const useWeatherCollapse = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCollapseState();
  }, []);

  const loadCollapseState = async () => {
    try {
      const savedState = await AsyncStorage.getItem('weatherCollapsed');
      setIsCollapsed(savedState === 'true');
    } catch (error) {
      console.error('Error loading weather collapse state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCollapse = async () => {
    try {
      const newState = !isCollapsed;
      setIsCollapsed(newState);
      await AsyncStorage.setItem('weatherCollapsed', newState.toString());
    } catch (error) {
      console.error('Error saving weather collapse state:', error);
    }
  };

  return { isCollapsed, isLoading, toggleCollapse };
}; 