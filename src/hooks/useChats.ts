import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

const useChats = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get all chats
  const getChats = async () => {
    setLoading(true);
    try {
      const chatsCollection = collection(db, "chats");
      const snapshot = await getDocs(chatsCollection);
      const chats = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      return chats;
    } catch (error) {
      setError("Failed to fetch chats.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Get a specific chat by ID
  const getChat = async (chatId: string) => {
    setLoading(true);
    try {
      const chatDoc = doc(db, "chats", chatId);
      const snapshot = await getDoc(chatDoc);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() };
      } else {
        setError("Chat not found.");
        return null;
      }
    } catch (error) {
      setError("Failed to fetch chat.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Get messages from a chat's "messages" subcollection
  const getMessages = async (chatId: string) => {
    setLoading(true);
    try {
      const messagesCollectionRef = collection(db, "chats", chatId, "messages");
      const snapshot = await getDocs(messagesCollectionRef);
      const messages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      return messages;
    } catch (error) {
      setError("Failed to fetch messages.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Get chats for a specific user (based on user ID)
  const getUserChats = async (userId: string) => {
    setLoading(true);
    try {
      const chatsCollection = collection(db, "chats");
      const q = query(chatsCollection, where("participants", "array-contains", userId));
      const snapshot = await getDocs(q);
      const chats = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      return chats;
    } catch (error) {
      setError("Failed to fetch user chats.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Add a new chat
  const addChat = async (chatData: any) => {
    setLoading(true);
    try {
      const chatsCollection = collection(db, "chats");
      const docRef = await addDoc(chatsCollection, chatData);
      return docRef.id;
    } catch (error) {
      setError("Failed to create chat.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Update a chat
  const updateChat = async (chatId: string, updatedData: any) => {
    setLoading(true);
    try {
      const chatDoc = doc(db, "chats", chatId);
      await updateDoc(chatDoc, updatedData);
    } catch (error) {
      setError("Failed to update chat.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Delete a chat
  const deleteChat = async (chatId: string) => {
    setLoading(true);
    try {
      const chatDoc = doc(db, "chats", chatId);
      await deleteDoc(chatDoc);
    } catch (error) {
      setError("Failed to delete chat.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // **Add a new message** to the "messages" subcollection of a chat
  const addMessage = async (chatId: string, messageData: any) => {
    setLoading(true);
    try {
      const messagesCollectionRef = collection(db, "chats", chatId, "messages");
      const docRef = await addDoc(messagesCollectionRef, messageData);
      return docRef.id; // Returns the id of the newly created message
    } catch (error) {
      setError("Failed to add message.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return { 
    getChats, 
    getChat, 
    getMessages, 
    getUserChats, 
    addChat, 
    updateChat, 
    deleteChat, 
    addMessage, 
    loading, 
    error 
  };
};

export default useChats;
