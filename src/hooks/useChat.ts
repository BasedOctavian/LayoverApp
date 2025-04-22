// hooks/useChat.ts
import { useEffect, useState } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: any; // Firestore timestamp
}

const useChat = (eventId: string | string[] | undefined) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch and listen to messages in real-time
  useEffect(() => {
    if (!eventId || typeof eventId !== 'string') {
      setError('Invalid event ID');
      setLoading(false);
      return;
    }

    const messagesRef = collection(db, 'events', eventId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedMessages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];
        setMessages(fetchedMessages);
        setLoading(false);
      },
      (err) => {
        setError('Failed to fetch messages');
        console.error(err);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount or eventId change
    return () => unsubscribe();
  }, [eventId]);

  // Send a new message
  const sendMessage = async (messageData: { text: string; userId: string; userName: string }) => {
    if (!eventId || typeof eventId !== 'string') return;

    setLoading(true);
    try {
      const messagesRef = collection(db, 'events', eventId, 'messages');
      await addDoc(messagesRef, {
        ...messageData,
        timestamp: new Date(), // Use client-side timestamp; serverTimestamp() could be used instead
      });
    } catch (err) {
      setError('Failed to send message');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return { messages, loading, error, sendMessage };
};

export default useChat;