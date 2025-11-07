import { useState, useEffect, useCallback } from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  User,
  AuthError,
  sendEmailVerification,
} from "firebase/auth";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, storage } from "../../config/firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuthErrorMessage } from "../utils/authErrorHandler";
import { validateEmail, normalizeEmail, isDisposableEmail } from "../utils/emailValidation";
import { validatePassword, isPasswordValid } from "../utils/passwordValidation";
import Logger from "../utils/logger";

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
  profilePicture: string; // This should be the local URI for the selected image
  travelHistory: string[];
  updatedAt: Date;
}

const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user || null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Client-side validation
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.message);
      }

      // Normalize email
      const normalizedEmail = normalizeEmail(email);

      // Add a small delay to ensure Firebase auth state is cleared
      await new Promise(resolve => setTimeout(resolve, 500));
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      setUser(userCredential.user);
      
      // Update lastLogin timestamp so user appears in swipe/explore/chatExplore
      try {
        const userDocRef = doc(db, "users", userCredential.user.uid);
        await updateDoc(userDocRef, {
          lastLogin: serverTimestamp(),
        });
      } catch (updateError) {
        // Log error but don't fail login if lastLogin update fails
        console.error("Failed to update lastLogin:", updateError);
      }
    } catch (error) {
      // Check if it's a Firebase auth error by checking for the 'code' property
      const isFirebaseError = error && typeof error === 'object' && 'code' in error;
      const errorMessage = isFirebaseError 
        ? getAuthErrorMessage(error as AuthError)
        : error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, userData: any) => {
    try {
      setLoading(true);
      setError(null);

      // Client-side validation
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.message);
      }

      // Check for disposable email
      if (isDisposableEmail(email)) {
        throw new Error('Temporary or disposable email addresses are not allowed');
      }

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.feedback.join('. '));
      }

      // Normalize email
      const normalizedEmail = normalizeEmail(email);

      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      
      // Create user document
      const userDocRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userDocRef, {
        ...userData,
        email: normalizedEmail, // Store normalized email
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Send email verification
      await sendEmailVerification(userCredential.user);

      return userCredential;
    } catch (error) {
      // Check if it's a Firebase auth error by checking for the 'code' property
      const isFirebaseError = error && typeof error === 'object' && 'code' in error;
      const errorMessage = isFirebaseError 
        ? getAuthErrorMessage(error as AuthError)
        : error instanceof Error ? error.message : 'Failed to create account';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Clear the user state first
      setUser(null);
      // Then sign out from Firebase
      await signOut(auth);
      // Add a small delay to ensure Firebase auth state is cleared
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      // Check if it's a Firebase auth error by checking for the 'code' property
      const isFirebaseError = error && typeof error === 'object' && 'code' in error;
      const errorMessage = isFirebaseError 
        ? getAuthErrorMessage(error as AuthError)
        : error instanceof Error ? error.message : 'Failed to log out';
      setError(errorMessage);
      // Even if there's an error, we want to clear the user state
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // New function to update the user's password
  const changePassword = useCallback(async (newPassword: string) => {
    if (!auth.currentUser) {
      const errMsg = "No user is currently logged in";
      setError(errMsg);
      throw new Error(errMsg);
    }

    try {
      // Validate new password strength
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.feedback.join('. '));
      }

      await updatePassword(auth.currentUser, newPassword);
      Logger.info("Password updated successfully");
    } catch (error) {
      // Check if it's a Firebase auth error by checking for the 'code' property
      const isFirebaseError = error && typeof error === 'object' && 'code' in error;
      const errorMessage = isFirebaseError 
        ? getAuthErrorMessage(error as AuthError)
        : error instanceof Error ? error.message : 'Failed to update password';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    user,
    userId: user?.uid || null,
    loading,
    error,
    login,
    signup,
    logout,
    changePassword, // Expose the password update function
  };
};

export default useAuth;
