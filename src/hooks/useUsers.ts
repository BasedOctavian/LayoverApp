import { useEffect, useState, useCallback, useRef } from "react";
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, query, where, limit, orderBy } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_USERS_FETCH = 200; // Limit to prevent massive queries

interface CachedData<T> {
  data: T;
  timestamp: number;
}

const useUsers = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cache for users data
  const usersCache = useRef<CachedData<any[]> | null>(null);

  // Get all users with caching and limit
  const getUsers = useCallback(async (forceRefresh = false) => {
    // Check cache first (unless force refresh)
    if (!forceRefresh && usersCache.current) {
      const cacheAge = Date.now() - usersCache.current.timestamp;
      if (cacheAge < CACHE_DURATION) {
        console.log('✅ [useUsers] Returning cached users data (age:', Math.round(cacheAge / 1000), 'seconds)');
        return usersCache.current.data;
      }
    }

    setLoading(true);
    try {
      console.log('🔄 [useUsers] Fetching users from Firestore (max:', MAX_USERS_FETCH, ')');
      const usersCollection = collection(db, "users");
      
      let snapshot;
      try {
        // Try to order by lastLogin to get most recent active users first
        const q = query(
          usersCollection, 
          orderBy("lastLogin", "desc"),
          limit(MAX_USERS_FETCH)
        );
        snapshot = await getDocs(q);
      } catch (orderByError) {
        // If orderBy fails (e.g., some users don't have lastLogin), fall back to getting all users
        console.warn('[useUsers] orderBy lastLogin failed, fetching all users:', orderByError);
        const q = query(usersCollection, limit(MAX_USERS_FETCH));
        snapshot = await getDocs(q);
      }
      
      const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      // Sort users in memory: those with lastLogin first, then by lastLogin date
      users.sort((a, b) => {
        const aLastLogin = a.lastLogin?.toDate?.() || new Date(0);
        const bLastLogin = b.lastLogin?.toDate?.() || new Date(0);
        return bLastLogin.getTime() - aLastLogin.getTime();
      });
      
      // Update cache
      usersCache.current = {
        data: users,
        timestamp: Date.now()
      };
      
      console.log('✅ [useUsers] Fetched', users.length, 'users');
      return users;
    } catch (error) {
      setError("Failed to fetch users.");
      console.error('[useUsers] Error fetching users:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get a specific user by UID
  const getUser = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const userDoc = doc(db, "users", uid);
      const snapshot = await getDoc(userDoc);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() };
      } else {
        setError("User not found.");
        return null;
      }
    } catch (error) {
      setError("Failed to fetch user.");
      console.error(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add a new user
  const addUser = useCallback(async (userData: any) => {
    setLoading(true);
    try {
      const usersCollection = collection(db, "users");
      const docRef = await addDoc(usersCollection, userData);
      return docRef.id;
    } catch (error) {
      setError("Failed to add user.");
      console.error(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update a user
  const updateUser = useCallback(async (userId: string, updatedData: any) => {
    setLoading(true);
    try {
      const userDoc = doc(db, "users", userId);
      await updateDoc(userDoc, updatedData);
    } catch (error) {
      setError("Failed to update user.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a user
  const deleteUser = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const userDoc = doc(db, "users", userId);
      await deleteDoc(userDoc);
    } catch (error) {
      setError("Failed to delete user.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update user's airport code and last login timestamp
  const updateUserLocationAndLogin = useCallback(async (userId: string, airportCode: string) => {
    setLoading(true);
    try {
      const userDoc = doc(db, "users", userId);
      await updateDoc(userDoc, {
        airportCode,
        lastLogin: serverTimestamp(),
      });
    } catch (error) {
      setError("Failed to update user location and login.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // New function to get nearby users
  const getNearbyUsers = useCallback(async (airportCode: string) => {
    setLoading(true);
    try {
      const usersCollection = collection(db, "users");
      const q = query(
        usersCollection,
        where("airportCode", "==", airportCode)
      );
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      return users;
    } catch (error) {
      setError("Failed to fetch nearby users.");
      console.error(error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear cache function
  const clearUsersCache = useCallback(() => {
    usersCache.current = null;
    console.log('🗑️ [useUsers] Cache cleared');
  }, []);

  return { 
    getUsers, 
    getUser, 
    addUser, 
    updateUser, 
    deleteUser, 
    updateUserLocationAndLogin,
    getNearbyUsers, // Add the new function to the returned object
    clearUsersCache,
    loading, 
    error 
  };
};

export default useUsers;