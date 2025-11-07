# App Store Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Create production `.env` file with actual credentials
- [ ] Verify all environment variables are set correctly
- [ ] Remove any test/development credentials
- [ ] Update API endpoints if different for production

### 2. Code Review
- [ ] Remove all TODO/FIXME comments or track them separately
- [ ] Ensure no sensitive data in code (passwords, keys, etc.)
- [ ] Verify all console.log statements are using Logger utility
- [ ] Check for any remaining `@ts-ignore` comments

### 3. Firebase Configuration
```bash
# Deploy Firebase Functions
cd functions
npm run deploy

# Update Firestore Security Rules
firebase deploy --only firestore:rules

# Update Firebase Storage Rules  
firebase deploy --only storage
```

### 4. Security Configuration

#### Firebase App Check
1. Enable in Firebase Console
2. Register app for each platform:
   - **iOS**: DeviceCheck/App Attest
   - **Android**: Play Integrity
   - **Web**: reCAPTCHA v3

#### Firestore Security Rules Example
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             request.auth.token.admin == true;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && isOwner(userId);
      allow update: if isOwner(userId);
      allow delete: if isOwner(userId) || isAdmin();
    }
    
    // Pings collection
    match /pings/{pingId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && 
                      request.resource.data.creatorId == request.auth.uid;
      allow update, delete: if isAuthenticated() && 
                              resource.data.creatorId == request.auth.uid;
    }
    
    // Events collection
    match /events/{eventId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && 
                      request.resource.data.creatorId == request.auth.uid;
      allow update, delete: if isAuthenticated() && 
                              resource.data.creatorId == request.auth.uid;
    }
    
    // Messages collection
    match /chats/{chatId}/messages/{messageId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && 
                              resource.data.senderId == request.auth.uid;
    }
    
    // Reports collection (admin only)
    match /reports/{reportId} {
      allow create: if isAuthenticated();
      allow read, update: if isAdmin();
    }
    
    // Blocks collection
    match /blocks/{blockId} {
      allow read, create: if isAuthenticated() && 
                            request.resource.data.blockerId == request.auth.uid;
      allow delete: if isAuthenticated() && 
                      resource.data.blockerId == request.auth.uid;
    }
  }
}
```

### 5. Build Configuration

#### iOS Build
```bash
# Update version in app.json
# Current: "version": "2.0.0"
# Current build: "buildNumber": "23"

# Build for iOS
eas build --platform ios --profile production

# Or use local build
npx expo run:ios --configuration Release
```

#### Android Build
```bash
# Update version in app.json
# Current: "versionCode": 23

# Build for Android
eas build --platform android --profile production

# Or use local build
npx expo run:android --variant release
```

### 6. Testing
- [ ] Test on physical iOS device
- [ ] Test on physical Android device
- [ ] Test all authentication flows
- [ ] Test admin features (if applicable)
- [ ] Test notifications
- [ ] Test offline functionality
- [ ] Perform security testing
- [ ] Test payment flows (if applicable)

### 7. App Store Requirements

#### iOS App Store
- [ ] App Store screenshots (all required sizes)
- [ ] App icon (1024x1024)
- [ ] Privacy policy URL
- [ ] Terms of service URL
- [ ] Support URL/email
- [ ] App description
- [ ] Keywords
- [ ] Age rating
- [ ] Review notes for Apple

#### Google Play Store
- [ ] Play Store screenshots (all required sizes)
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Privacy policy URL
- [ ] Terms of service URL
- [ ] Support email
- [ ] App description
- [ ] Content rating
- [ ] Target audience

### 8. Privacy & Compliance
- [ ] Privacy policy updated and published
- [ ] Terms of service updated and published
- [ ] Data collection disclosed in app stores
- [ ] GDPR compliance (if applicable)
- [ ] COPPA compliance (if targeting children)
- [ ] Accessibility features documented

### 9. Monitoring & Analytics
- [ ] Firebase Analytics configured
- [ ] Error tracking setup (Crashlytics/Sentry)
- [ ] Performance monitoring enabled
- [ ] Custom events defined
- [ ] Conversion tracking setup

### 10. Post-Launch
- [ ] Monitor crash reports
- [ ] Monitor user reviews
- [ ] Track key metrics
- [ ] Prepare for user support
- [ ] Plan first update/hotfix process

## Environment Variables Template

Create a production `.env` file:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_production_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_production_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_production_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_production_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_production_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_production_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_production_measurement_id

# App Check
EXPO_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key

# Weather API (Optional)
EXPO_PUBLIC_WEATHER_API_KEY=your_weather_api_key
```

## Common Issues & Solutions

### Issue: Environment variables not loading
**Solution**: Ensure you're using `process.env.EXPO_PUBLIC_*` format and restart Expo

### Issue: Firebase App Check failing
**Solution**: Verify App Check is properly configured in Firebase Console and debug token is set for testing

### Issue: Build fails with TypeScript errors
**Solution**: Run `npx tsc --noEmit` to check for TypeScript errors locally

### Issue: App rejected for privacy violations
**Solution**: Ensure all data collection is disclosed in privacy policy and app store listings

## Useful Commands

```bash
# Check for TypeScript errors
npx tsc --noEmit

# Run linter
npm run lint

# Clear Metro bundler cache
npx expo start -c

# Update dependencies
npm update

# Check for security vulnerabilities
npm audit

# Deploy Firebase Functions
cd functions && npm run deploy

# View Firebase logs
firebase functions:log
```

## Support Contacts

- Firebase Support: https://firebase.google.com/support
- Expo Support: https://expo.dev/support
- Apple Developer: https://developer.apple.com/support/
- Google Play: https://support.google.com/googleplay/android-developer

---

**Version**: 2.0.0  
**Build**: 23  
**Last Updated**: October 23, 2025

