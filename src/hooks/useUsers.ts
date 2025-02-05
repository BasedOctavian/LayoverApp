// hooks/useUsers.ts
import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

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
        return { id: snapshot.id, ...snapshot.data() }; // Return the user document with the ID
      } else {
        setError("User not found.");
        return null;
      }
    } catch (error) {
      setError("Failed to fetch user.");
      console.error(error);
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
      return docRef.id; // Return the ID of the newly created user
    } catch (error) {
      setError("Failed to add user.");
      console.error(error);
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

  return { getUsers, getUser, addUser, updateUser, deleteUser, loading, error };
};

export default useUsers;