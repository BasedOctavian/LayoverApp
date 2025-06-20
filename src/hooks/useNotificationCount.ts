import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

/**
 * Hook to get the count of unread notifications for a user
 * @param userId - The user ID to get notifications for
 * @returns The count of unread notifications
 */
export const useNotificationCount = (userId: string | null): number => {
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setNotificationCount(0);
      return;
    }

    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        const notifications = userData.notifications || [];
        const unreadCount = notifications.filter((n: any) => !n.read).length;
        setNotificationCount(unreadCount);
      } else {
        setNotificationCount(0);
      }
    }, (error) => {
      console.error('Error listening to notification count:', error);
      setNotificationCount(0);
    });

    return () => unsubscribe();
  }, [userId]);

  return notificationCount;
};

export default useNotificationCount; 