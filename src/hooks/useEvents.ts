// hooks/useEvents.ts
import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "../../config/firebaseConfig";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

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
      // Step 1: Create a new document reference with an auto-generated ID
      const docRef = doc(collection(db, "events"));
      const eventId = docRef.id;
  
      // Step 2: Handle eventImage upload if provided
      let eventImageUrl: string | null = null;
      if (eventData.eventImage) {
        // Assuming eventData.eventImage is a URI
        const response = await fetch(eventData.eventImage);
        const blob = await response.blob();
        const storageRef = ref(storage, `eventImages/${eventId}`);
        await uploadBytes(storageRef, blob);
        eventImageUrl = await getDownloadURL(storageRef);
      }
  
      // Step 3: Create the event document with the image URL and timestamps
      await setDoc(docRef, {
        ...eventData,
        eventImage: eventImageUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        eventUID: eventId
      });
  
      return eventId;
    } catch (error) {
      setError("Failed to add event.");
      console.error(error);
      throw error; // Throw error for caller to handle, consistent with signup
    } finally {
      setLoading(false);
    }
  };

  // Fetch a single event by ID
  const getEvent = async (id: string) => {
    setLoading(true);
    try {
      const eventRef = doc(db, "events", id);
      const docSnap = await getDoc(eventRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        setError("Event not found.");
        return null;
      }
    } catch (error) {
      setError("Failed to fetch event.");
      console.error(error);
      return null;
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

  return { getEvents, getEvent, addEvent, updateEvent, deleteEvent, loading, error };
};

export default useEvents;