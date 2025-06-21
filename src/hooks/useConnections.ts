import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../config/firebaseConfig";

interface Connection {
  id: string;
  participants: string[];
  status: 'active' | 'pending';
  initiator: string;
  createdAt: any;
  lastMessage?: string;
  chatId?: string;
}

const useConnections = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if there's an existing connection between two users
  const checkConnection = async (userId1: string, userId2: string): Promise<Connection | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const connectionsRef = collection(db, "connections");
      const q = query(
        connectionsRef,
        where("participants", "array-contains", userId1)
      );
      const querySnapshot = await getDocs(q);
      
      // Check each connection to see if it contains both users
      for (const doc of querySnapshot.docs) {
        const connectionData = doc.data();
        if (connectionData.participants.includes(userId2)) {
          return { id: doc.id, ...connectionData } as Connection;
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error checking connection:", error);
      setError("Failed to check connection status.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get all connections for a user
  const getUserConnections = async (userId: string): Promise<Connection[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const connectionsRef = collection(db, "connections");
      const q = query(
        connectionsRef,
        where("participants", "array-contains", userId)
      );
      const querySnapshot = await getDocs(q);
      
      const connections = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Connection[];
      
      return connections;
    } catch (error) {
      console.error("Error fetching user connections:", error);
      setError("Failed to fetch connections.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Get connected user IDs for a user
  const getConnectedUserIds = async (userId: string): Promise<string[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const connections = await getUserConnections(userId);
      const connectedUserIds = new Set<string>();
      
      connections.forEach(connection => {
        const otherUserId = connection.participants.find(id => id !== userId);
        if (otherUserId) {
          connectedUserIds.add(otherUserId);
        }
      });
      
      return Array.from(connectedUserIds);
    } catch (error) {
      console.error("Error fetching connected user IDs:", error);
      setError("Failed to fetch connected users.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Check if two users are connected (active connection)
  const areUsersConnected = async (userId1: string, userId2: string): Promise<boolean> => {
    const connection = await checkConnection(userId1, userId2);
    return connection?.status === 'active';
  };

  // Check if there's a pending connection between two users
  const hasPendingConnection = async (userId1: string, userId2: string): Promise<boolean> => {
    const connection = await checkConnection(userId1, userId2);
    return connection?.status === 'pending';
  };

  return {
    checkConnection,
    getUserConnections,
    getConnectedUserIds,
    areUsersConnected,
    hasPendingConnection,
    loading,
    error
  };
};

export default useConnections; 