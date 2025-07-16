# Weather API Setup

The weather feature in the dashboard currently uses mock data for demonstration purposes. To use real weather data, follow these steps:

## OpenWeatherMap API Setup

1. **Get an API Key:**
   - Go to [OpenWeatherMap](https://openweathermap.org/)
   - Sign up for a free account
   - Navigate to your API keys section
   - Copy your API key

2. **Activate Your API Key:**
   - **Important**: New API keys take 2-4 hours to activate
   - You'll get a 401 error until the key is activated
   - The app will automatically fall back to mock data during this time

3. **Update the Weather Hook:**
   - Open `src/hooks/useWeather.ts`
   - Replace the API key with your actual key
   - The app will automatically handle API errors and fall back to mock data

4. **Example Configuration:**
```typescript
const API_KEY = 'your_actual_api_key_here';
const response = await axios.get(
  `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.long}&appid=${API_KEY}&units=metric`
);
```

## Troubleshooting

### 401 Error (Unauthorized)
- **Cause**: API key is invalid or not yet activated
- **Solution**: Wait 2-4 hours for key activation, or check if the key is correct
- **Fallback**: App automatically uses mock data

### 429 Error (Too Many Requests)
- **Cause**: Exceeded free tier limits (1000 calls/day)
- **Solution**: Wait until next day or upgrade to paid plan

### Network Errors
- **Cause**: No internet connection or API service down
- **Fallback**: App shows error state

## Alternative Weather APIs

You can also use other weather APIs by modifying the `useWeather.ts` hook:

- **WeatherAPI.com** - Free tier available
- **AccuWeather API** - Requires registration
- **Dark Sky API** - Now part of Apple (iOS only)

## Features

The weather card displays:
- Current temperature and "feels like" temperature
- Weather description and icon
- Humidity, wind speed, and visibility
- Sunrise and sunset times
- Location information

The component automatically adapts to the app's light/dark theme and provides loading and error states. 