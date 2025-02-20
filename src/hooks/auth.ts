// hooks/auth.ts
import { useState, useEffect } from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  AuthError,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";

interface UserData {
  age: number;
  bio: string;
  createdAt: Date;
  email: string;
  goals: string[];
  interests: string[];
  isAnonymous: boolean;
  languages: string[];
  moodStatus: string;
  name: string;
  profilePicture: string;
  travelHistory: string[];
  updatedAt: Date;
  userId: string;
}

const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
    } catch (error) {
      const authError = error as AuthError;
      setError(authError.message);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    userData: Omit<UserData, "userId" | "createdAt" | "updatedAt">
  ) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
  
      const userDocRef = doc(db, "users", userId);
      await setDoc(userDocRef, {
        ...userData,
        userId,
        email: userCredential.user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
  
      setUser(userCredential.user);
      return userId; // Return user ID for profile picture upload
    } catch (error) {
      const authError = error as AuthError;
      setError(authError.message);
      throw authError; // Propagate error to component
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      const authError = error as AuthError;
      setError(authError.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    userId: user?.uid || null, // Added userId to return object
    loading,
    error,
    login,
    signup,
    logout,
  };
};

export default useAuth;