# Layover App

A React Native application for managing layovers and travel itineraries.

## Project Structure

```
LayoverApp/
├── src/                    # Source code
│   ├── app/               # App screens and navigation
│   ├── components/        # Reusable UI components
│   ├── constants/         # App constants and configuration
│   ├── context/          # React Context providers
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API and external service integrations
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── config/               # Configuration files
│   ├── firebaseConfig.ts
│   ├── supabaseClient.ts
│   └── .env
├── assets/              # Static assets (images, fonts)
├── android/            # Android specific files
├── functions/         # Cloud functions
└── [config files]     # Various configuration files
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
- Copy `.env.example` to `.env`
- Fill in your environment variables

3. Start the development server:
```bash
npm start
```

## Technology Stack

- React Native
- Expo
- Firebase
- Supabase
- TypeScript
- NativeWind (Tailwind CSS for React Native) 