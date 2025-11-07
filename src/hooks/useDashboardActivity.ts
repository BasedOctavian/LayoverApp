import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

export interface DashboardActivity {
  pendingConnectionsCount: number;
  unreadMessagesCount: number;
  nearbyEventsCount: number;
  nearbyPingsCount: number;
  totalActivity: number;
}

/**
 * Hook to fetch dashboard activity counts
 * @param userId - The user ID to fetch activity for
 * @param userLocation - User's current location for nearby filtering
 * @returns Dashboard activity counts
 */
export const useDashboardActivity = (
  userId: string | null,
  userLocation: { lat: number; long: number } | null
): { activity: DashboardActivity; loading: boolean; error: string | null } => {
  const [activity, setActivity] = useState<DashboardActivity>({
    pendingConnectionsCount: 0,
    unreadMessagesCount: 0,
    nearbyEventsCount: 0,
    nearbyPingsCount: 0,
    totalActivity: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [groupUnreadCount, setGroupUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let unsubscribeChats: (() => void) | undefined;
    let unsubscribePings: (() => void) | undefined;
    let unsubscribeEvents: (() => void) | undefined;
    let unsubscribeGroups: (() => void) | undefined;

    const fetchActivity = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch pending connection requests
        const connectionsRef = collection(db, 'connections');
        const pendingConnectionsQuery = query(
          connectionsRef,
          where('participants', 'array-contains', userId),
          where('status', '==', 'pending')
        );
        const pendingConnectionsSnapshot = await getDocs(pendingConnectionsQuery);
        
        // Filter to only show connections where current user is NOT the initiator
        const pendingConnectionsCount = pendingConnectionsSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.initiator !== userId; // Only count requests received, not sent
        }).length;

        // Subscribe to unread messages from chats
        unsubscribeChats = onSnapshot(
          query(
            collection(db, 'chats'),
            where('participants', 'array-contains', userId)
          ),
          (snapshot) => {
            const count = snapshot.docs.reduce((total, doc) => {
              const data = doc.data();
              return total + (data.unreadCount || 0);
            }, 0);

            setChatUnreadCount(count);
          },
          (err) => {
            console.error('Error fetching chat unread counts:', err);
          }
        );

        // Subscribe to group chats unread messages
        unsubscribeGroups = onSnapshot(
          query(
            collection(db, 'groups'),
            where('members', 'array-contains', userId)
          ),
          (snapshot) => {
            let count = 0;
            snapshot.docs.forEach(doc => {
              const data = doc.data();
              // Groups store unreadCount as an object with user IDs as keys
              if (data.unreadCount && data.unreadCount[userId]) {
                count += data.unreadCount[userId];
              }
            });

            setGroupUnreadCount(count);
          },
          (err) => {
            console.error('Error fetching group unread counts:', err);
          }
        );

        // Set initial pending connections count
        setActivity(prev => ({
          ...prev,
          pendingConnectionsCount,
          totalActivity: pendingConnectionsCount + prev.unreadMessagesCount + prev.nearbyEventsCount + prev.nearbyPingsCount,
        }));

        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard activity:', err);
        setError('Failed to load activity data');
        setLoading(false);
      }
    };

    fetchActivity();

    // Cleanup subscriptions
    return () => {
      if (unsubscribeChats) unsubscribeChats();
      if (unsubscribePings) unsubscribePings();
      if (unsubscribeEvents) unsubscribeEvents();
      if (unsubscribeGroups) unsubscribeGroups();
    };
  }, [userId, userLocation]);

  // Update activity when unread counts change
  useEffect(() => {
    setActivity(prev => {
      const totalUnread = chatUnreadCount + groupUnreadCount;
      return {
        ...prev,
        unreadMessagesCount: totalUnread,
        totalActivity: prev.pendingConnectionsCount + totalUnread + prev.nearbyEventsCount + prev.nearbyPingsCount,
      };
    });
  }, [chatUnreadCount, groupUnreadCount]);

  return { activity, loading, error };
};

export default useDashboardActivity;

