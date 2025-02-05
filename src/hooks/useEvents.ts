// hooks/useEvents.ts
import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

const useEvents = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get all events
  const getEvents = async () => {
    setLoading(true);
    try {
      const eventsCollection = collection(db, "events");
      const snapshot = await getDocs(eventsCollection);
      const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      return events;
    } catch (error) {
      setError("Failed to fetch events.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Add a new event
  const addEvent = async (eventData: any) => {
    setLoading(true);
    try {
      const eventsCollection = collection(db, "events");
      const docRef = await addDoc(eventsCollection, eventData);
      return docRef.id; // Return the ID of the newly created event
    } catch (error) {
      setError("Failed to add event.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Update an event
  const updateEvent = async (eventId: string, updatedData: any) => {
    setLoading(true);
    try {
      const eventDoc = doc(db, "events", eventId);
      await updateDoc(eventDoc, updatedData);
    } catch (error) {
      setError("Failed to update event.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Delete an event
  const deleteEvent = async (eventId: string) => {
    setLoading(true);
    try {
      const eventDoc = doc(db, "events", eventId);
      await deleteDoc(eventDoc);
    } catch (error) {
      setError("Failed to delete event.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return { getEvents, addEvent, updateEvent, deleteEvent, loading, error };
};

export default useEvents;