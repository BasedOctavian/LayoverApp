import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";

interface User {
  id: string;
  airportCode?: string;
  lastLogin?: any; // Firestore Timestamp
  [key: string]: any; // Allow additional fields
}

const useNearbyUsers = (currentAirportCode: string) => {
  const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch nearby users
  const fetchNearbyUsers = async () => {
    if (!currentAirportCode) {
      setNearbyUsers([]);
      setError("No airport code provided.");
      return;
    }

    setLoading(true);
    try {
      // Define the time range: April 22, 2025, 3:21:26 PM UTC-4 to 4:21:26 PM UTC-4
      const endTime = new Date("2025-04-22T16:21:26-04:00"); // 4:21:26 PM UTC-4
      const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // 1 hour earlier (3:21:26 PM)

      const usersCollection = collection(db, "users");
      const q = query(
        usersCollection,
        where("airportCode", "==", currentAirportCode),
        where("lastLogin", ">=", startTime),
        where("lastLogin", "<=", endTime)
      );

      const snapshot = await getDocs(q);
      const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as User[];
      setNearbyUsers(users);
      setError(null);
    } catch (err) {
      setError("Failed to fetch nearby users.");
      console.error("Error fetching nearby users:", err);
      setNearbyUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Automatically fetch users when currentAirportCode changes
  useEffect(() => {
    fetchNearbyUsers();
  }, [currentAirportCode]);

  return { nearbyUsers, fetchNearbyUsers, loading, error };
};

export default useNearbyUsers;