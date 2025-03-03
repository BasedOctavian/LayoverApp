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
  sendEmailVerification,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, storage } from "../../firebaseConfig";
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
      // Create the user using Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // Send verification email
      try {
        await sendEmailVerification(user);
        console.log("Verification email sent");
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        // Continue signup even if email fails, as verification can be resent later
      }
  
      const userId = user.uid;
  
      // If a profile picture URI is provided, upload the image using the UID as the filename
      let profilePicUrl: string | null = null;
      if (userData.profilePicture) {
        const response = await fetch(userData.profilePicture);
        const blob = await response.blob();
        const storageRef = ref(storage, `profilePictures/${userId}`);
        await uploadBytes(storageRef, blob);
        profilePicUrl = await getDownloadURL(storageRef);
      }
  
      // Create a Firestore user document with the UID and profile picture URL
      const userDocRef = doc(db, "users", userId);
      await setDoc(userDocRef, {
        ...userData,
        profilePicture: profilePicUrl,
        userId,
        email: userCredential.user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
  
      setUser(userCredential.user);
      return userCredential;
    } catch (error) {
      const authError = error as AuthError;
      setError(authError.message);
      throw authError;
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
    userId: user?.uid || null,
    loading,
    error,
    login,
    signup,
    logout,
  };
};

export default useAuth;
