import { useState } from "react";
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "../../config/firebaseConfig";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

const useSportEvents = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get all sport events
  const getSportEvents = async () => {
    setLoading(true);
    try {
      const sportEventsCollection = collection(db, "sportEvents");
      const snapshot = await getDocs(sportEventsCollection);
      const sportEvents = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      return sportEvents;
    } catch (error) {
      setError("Failed to fetch sport events.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Get a single sport event by eventUID
  const getSportEvent = async (eventUID: string) => {
    setLoading(true);
    try {
      const sportEventRef = doc(db, "sportEvents", eventUID);
      const docSnap = await getDoc(sportEventRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        setError("Sport event not found.");
        return null;
      }
    } catch (error) {
      setError("Failed to fetch sport event.");
      console.error(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Add a new sport event
  const addSportEvent = async (sportEventData: any) => {
    setLoading(true);
    try {
      // Create a new document reference with an auto-generated ID
      const docRef = doc(collection(db, "sportEvents"));
      const eventUID = docRef.id;

      // Handle eventImage upload if provided
      let eventImageUrl: string | null = null;
      if (sportEventData.eventImage) {
        const response = await fetch(sportEventData.eventImage);
        const blob = await response.blob();
        const storageRef = ref(storage, `sportEventImages/${eventUID}`);
        await uploadBytes(storageRef, blob);
        eventImageUrl = await getDownloadURL(storageRef);
      }

      // Create the sport event document with the image URL and timestamps
      await setDoc(docRef, {
        ...sportEventData,
        eventImage: eventImageUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return eventUID;
    } catch (error) {
      setError("Failed to add sport event.");
      console.error(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Update a sport event
  const updateSportEvent = async (eventUID: string, updatedData: any) => {
    setLoading(true);
    try {
      const sportEventDoc = doc(db, "sportEvents", eventUID);
      await updateDoc(sportEventDoc, updatedData);
    } catch (error) {
      setError("Failed to update sport event.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Delete a sport event
  const deleteSportEvent = async (eventUID: string) => {
    setLoading(true);
    try {
      const sportEventDoc = doc(db, "sportEvents", eventUID);
      await deleteDoc(sportEventDoc);
    } catch (error) {
      setError("Failed to delete sport event.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return { getSportEvents, getSportEvent, addSportEvent, updateSportEvent, deleteSportEvent, loading, error };
};

export default useSportEvents;