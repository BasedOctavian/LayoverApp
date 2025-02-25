// hooks/useAirports.ts
import { useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

// Define the Airport type.
// You may extend this type with more fields as needed.
export type Airport = {
  id?: string;
  airportCode: string;
  name: string;
  lat: number;
  long: number;
  // Optionally, you could include a calculated field like distance.
  distance?: number;
  location?: string;
};

/**
 * Utility function to generate an airport code from the airport name.
 * It first checks for text inside parentheses.
 * If none is found, it will generate a code from the initials (first 3 letters).
 */
const generateAirportCode = (name: string): string => {
  const regex = /\(([^)]+)\)/;
  const match = name.match(regex);
  if (match && match[1]) {
    return match[1];
  }
  // Fallback: take the first three initials from the name.
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
};

const useAirports = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get all airports from the "airports" collection.
  const getAirports = async () => {
    setLoading(true);
    try {
      const airportsCollection = collection(db, "airports");
      const snapshot = await getDocs(airportsCollection);
      // Map through the documents to include the Firestore document id.
      const airports = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      return airports as Airport[];
    } catch (err) {
      setError("Failed to fetch airports.");
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get a specific airport by its document ID.
  const getAirport = async (airportId: string) => {
    setLoading(true);
    try {
      const airportDoc = doc(db, "airports", airportId);
      const snapshot = await getDoc(airportDoc);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Airport;
      } else {
        setError("Airport not found.");
        return null;
      }
    } catch (err) {
      setError("Failed to fetch airport.");
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add a new airport.
   *
   * The parameter accepts an object with the airport's details.
   * If `airportCode` is not provided, it is generated from the name.
   */
  const addAirport = async (
    airportData: Omit<Airport, "id" | "airportCode"> & { airportCode?: string }
  ) => {
    setLoading(true);
    try {
      const airportsCollection = collection(db, "airports");
      // Generate airportCode if not provided.
      const airportCode = airportData.airportCode || generateAirportCode(airportData.name);
      const dataToAdd = { ...airportData, airportCode };
      const docRef = await addDoc(airportsCollection, dataToAdd);
      return docRef.id; // Return the newly created document ID.
    } catch (err) {
      setError("Failed to add airport.");
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing airport.
  const updateAirport = async (airportId: string, updatedData: Partial<Airport>) => {
    setLoading(true);
    try {
      const airportDoc = doc(db, "airports", airportId);
      await updateDoc(airportDoc, updatedData);
    } catch (err) {
      setError("Failed to update airport.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Delete an airport.
  const deleteAirport = async (airportId: string) => {
    setLoading(true);
    try {
      const airportDoc = doc(db, "airports", airportId);
      await deleteDoc(airportDoc);
    } catch (err) {
      setError("Failed to delete airport.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return { getAirports, getAirport, addAirport, updateAirport, deleteAirport, loading, error };
};

export default useAirports;
