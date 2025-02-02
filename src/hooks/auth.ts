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
import { auth } from "../../firebaseConfig";


const useAuth = () => {
  const [user, setUser] = useState<User | null>(null); // Track the authenticated user
  const [loading, setLoading] = useState<boolean>(true); // Track loading state
  const [error, setError] = useState<string | null>(null); // Track errors

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user); // Set the user if authenticated
      } else {
        setUser(null); // Clear the user if not authenticated
      }
      setLoading(false); // Set loading to false once the check is complete
    });

    return () => unsubscribe(); // Cleanup the listener on unmount
  }, []);

  // Login with email and password
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user); // Set the user after successful login
    } catch (error) {
      const authError = error as AuthError;
      setError(authError.message); // Set the error message
    } finally {
      setLoading(false); // Set loading to false
    }
  };

  // Signup with email and password
  const signup = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user); // Set the user after successful signup
    } catch (error) {
      const authError = error as AuthError;
      setError(authError.message); // Set the error message
    } finally {
      setLoading(false); // Set loading to false
    }
  };

  // Logout the current user
  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      setUser(null); // Clear the user after logout
    } catch (error) {
      const authError = error as AuthError;
      setError(authError.message); // Set the error message
    } finally {
      setLoading(false); // Set loading to false
    }
  };

  // Return the auth state and methods
  return {
    user,
    loading,
    error,
    login,
    signup,
    logout,
  };
};

export default useAuth;