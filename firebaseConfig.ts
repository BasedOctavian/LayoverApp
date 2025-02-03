import { initializeApp } from "firebase/app";
import { getFirestore, serverTimestamp } from "firebase/firestore";
import {
  getAuth,
  initializeAuth,

  // @ts-ignore
  getReactNativePersistence,
} from "firebase/auth";
import  ReactNativeAsyncStorage  from "@react-native-async-storage/async-storage";

const firebaseConfig = {
    apiKey: "AIzaSyB3c86DHbDwFtOil190AlVLI2ja7I9-TtI",
    authDomain: "layoverapp-b79bf.firebaseapp.com",
    projectId: "layoverapp-b79bf",
    storageBucket: "layoverapp-b79bf.firebasestorage.app",
    messagingSenderId: "7121898127",
    appId: "1:7121898127:web:76aaaa54bf7e86ebde3efa",
    measurementId: "G-CX5B7FTN8C"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Firebase Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export { db, auth, serverTimestamp };
