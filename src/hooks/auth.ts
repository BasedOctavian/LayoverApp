import { useState, useEffect } from "react";
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
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, storage } from "../../config/firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

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

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      // Add a small delay to ensure Firebase auth state is cleared
      await new Promise(resolve => setTimeout(resolve, 500));
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
    } catch (error) {
      const authError = error as AuthError;
      // Handle specific Firebase auth errors
      if (authError.code === 'auth/too-many-requests') {
        setError('Too many login attempts. Please try again later.');
      } else if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else {
        setError(authError.message || 'Failed to log in');
      }
      throw authError;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, userData: any) => {
    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document
      const userDocRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userDocRef, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return userCredential;
    } catch (error: any) {
      let errorMessage = "Failed to create account";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Email is already in use";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak";
      }
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
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
      const authError = error as AuthError;
      setError(authError.message || 'Failed to log out');
      // Even if there's an error, we want to clear the user state
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // New function to update the user's password
  const changePassword = async (newPassword: string) => {
    if (!auth.currentUser) {
      const errMsg = "No user is currently logged in";
      setError(errMsg);
      throw new Error(errMsg);
    }
    try {
      await updatePassword(auth.currentUser, newPassword);
      console.log("Password updated successfully");
    } catch (error) {
      const authError = error as AuthError;
      setError(authError.message);
      // Note: If you get an error like "requires recent authentication",
      // you'll need to reauthenticate the user before calling updatePassword.
      throw authError;
    }
  };

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
