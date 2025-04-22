import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, query, where } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";

const useUsers = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get all users
  const getUsers = async () => {
    setLoading(true);
    try {
      const usersCollection = collection(db, "users");
      const snapshot = await getDocs(usersCollection);
      const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      return users;
    } catch (error) {
      setError("Failed to fetch users.");
      console.error(error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Get a specific user by UID
  const getUser = async (uid: string) => {
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
  };

  // Add a new user
  const addUser = async (userData: any) => {
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
  };

  // Update a user
  const updateUser = async (userId: string, updatedData: any) => {
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
  };

  // Delete a user
  const deleteUser = async (userId: string) => {
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
  };

  // Update user's airport code and last login timestamp
  const updateUserLocationAndLogin = async (userId: string, airportCode: string) => {
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
  };

  // New function to get nearby users
  const getNearbyUsers = async (airportCode: string, fortyMinutesAgo: Date) => {
    setLoading(true);
    try {
      const usersCollection = collection(db, "users");
      const q = query(
        usersCollection,
        where("airportCode", "==", airportCode),
        where("lastLogin", ">=", fortyMinutesAgo)
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
  };

  return { 
    getUsers, 
    getUser, 
    addUser, 
    updateUser, 
    deleteUser, 
    updateUserLocationAndLogin,
    getNearbyUsers, // Add the new function to the returned object
    loading, 
    error 
  };
};

export default useUsers;