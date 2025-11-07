/**
 * Firebase App Check Configuration
 * Provides protection against abuse by ensuring requests come from your authentic app
 * 
 * Setup Instructions:
 * 1. Enable App Check in Firebase Console
 * 2. Register your app for App Check (use reCAPTCHA v3 for web, DeviceCheck for iOS, Play Integrity for Android)
 * 3. Get your App Check debug token for development
 * 4. Add the site key to environment variables
 */

import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { app } from '../../config/firebaseConfig';

// Only initialize App Check in production
export const initializeFirebaseAppCheck = () => {
  if (__DEV__) {
    // In development, App Check is disabled by default
    // You can use debug tokens for testing: https://firebase.google.com/docs/app-check/web/debug-provider
    console.warn('Firebase App Check is not initialized in development mode');
    return null;
  }

  try {
    // Initialize App Check with reCAPTCHA v3
    // TODO: Add your reCAPTCHA v3 site key to environment variables
    const siteKey = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY;
    
    if (!siteKey) {
      console.warn('Firebase App Check: reCAPTCHA site key not configured');
      return null;
    }

    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });

    return appCheck;
  } catch (error) {
    console.error('Failed to initialize Firebase App Check:', error);
    return null;
  }
};

// Export a function to check if App Check is active
export const isAppCheckActive = (): boolean => {
  return !__DEV__ && !!process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY;
};

