import { useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  arrayRemove,
  increment,
  writeBatch,
  limit as firestoreLimit,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { db, storage, functions } from "../../config/firebaseConfig";
import {
  Group,
  GroupFormData,
  GroupMember,
  GroupInvite,
  GroupJoinRequest,
} from "../types/groupTypes";
import { isAdmin } from "../utils/adminCheck";

const useGroups = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get all groups (with optional filtering)
   */
  const getGroups = async (options?: {
    category?: string;
    visibility?: "public" | "private";
    limit?: number;
  }): Promise<Group[]> => {
    setLoading(true);
    setError(null);

    try {
      const groupsCollection = collection(db, "groups");
      let q = query(groupsCollection, orderBy("createdAt", "desc"));

      // Apply filters
      if (options?.category) {
        q = query(q, where("category", "==", options.category));
      }

      // Only filter by visibility if explicitly specified
      // Otherwise, fetch all groups (the caller will filter by 'hidden' if needed)
      if (options?.visibility) {
        q = query(q, where("visibility", "==", options.visibility));
      }

      if (options?.limit) {
        q = query(q, firestoreLimit(options.limit));
      }

      const snapshot = await getDocs(q);
      const groups = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Group[];

      return groups;
    } catch (err) {
      console.error("Error fetching groups:", err);
      setError("Failed to fetch groups");
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get a single group by ID
   */
  const getGroup = async (groupId: string): Promise<Group | null> => {
    setLoading(true);
    setError(null);

    try {
      const groupDoc = await getDoc(doc(db, "groups", groupId));

      if (!groupDoc.exists()) {
        setError("Group not found");
        return null;
      }

      const groupData = { id: groupDoc.id, ...groupDoc.data() } as Group;

      // If group doesn't have a chatRoomId, create one
      if (!groupData.chatRoomId) {
        console.log("Group missing chatRoomId, creating chat room...");
        const chatId = await createGroupChat(
          groupId,
          groupData.name,
          groupData.groupImage,
          groupData.members,
        );
        if (chatId) {
          groupData.chatRoomId = chatId;
        }
      }

      return groupData;
    } catch (err) {
      console.error("Error fetching group:", err);
      setError("Failed to fetch group");
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get groups that a user is a member of
   */
  const getUserGroups = async (userId: string): Promise<Group[]> => {
    setLoading(true);
    setError(null);

    try {
      // Query groups where user is in members array
      const groupsQuery = query(
        collection(db, "groups"),
        where("members", "array-contains", userId),
        orderBy("createdAt", "desc"),
      );

      const snapshot = await getDocs(groupsQuery);
      const groups = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Group[];

      return groups;
    } catch (err) {
      console.error("Error fetching user groups:", err);
      setError("Failed to fetch user groups");
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a new group
   */
  const createGroup = async (
    formData: GroupFormData,
    creatorId: string,
    creatorName: string,
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      // Create group document reference
      const groupRef = doc(collection(db, "groups"));
      const groupId = groupRef.id;

      // Upload group image if provided
      let groupImageUrl: string | undefined;
      if (formData.groupImage) {
        const response = await fetch(formData.groupImage);
        const blob = await response.blob();
        const storageRef = ref(storage, `groupImages/${groupId}/profile`);
        await uploadBytes(storageRef, blob);
        groupImageUrl = await getDownloadURL(storageRef);
      }

      // Upload cover image if provided
      let coverImageUrl: string | undefined;
      if (formData.coverImage) {
        const response = await fetch(formData.coverImage);
        const blob = await response.blob();
        const storageRef = ref(storage, `groupImages/${groupId}/cover`);
        await uploadBytes(storageRef, blob);
        coverImageUrl = await getDownloadURL(storageRef);
      }

      // Create group data
      const groupData: Omit<Group, "id"> = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        groupImage: groupImageUrl,
        coverImage: coverImageUrl,
        creatorId,
        creatorName,
        organizers: [creatorId], // Creator is automatically an organizer
        members: [creatorId], // Creator is automatically a member
        memberCount: 1,
        pendingMembers: [],
        isPrivate: formData.isPrivate,
        requiresApproval: formData.requiresApproval,
        visibility: formData.visibility,
        tags: formData.tags,
        location: formData.location,
        coordinates: formData.coordinates, // Store organizer's location
        radius: formData.radius || 30, // Store visibility radius (default 30 miles)
        rules: formData.rules,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        eventCount: 0,
        activityScore: 0,
      };

      // Use batch write for atomic operation
      const batch = writeBatch(db);

      // Add group document
      batch.set(groupRef, groupData);

      // Add creator as member in groupMembers collection
      const memberDoc = doc(db, "groupMembers", `${creatorId}_${groupId}`);
      batch.set(memberDoc, {
        userId: creatorId,
        groupId,
        role: "creator",
        joinedAt: serverTimestamp(),
        notificationsEnabled: true,
      });

      await batch.commit();

      // Create group chat room
      const chatId = await createGroupChat(
        groupId,
        formData.name,
        groupImageUrl,
        [creatorId],
      );

      console.log("Group created successfully:", groupId);
      return groupId;
    } catch (err) {
      console.error("Error creating group:", err);
      setError("Failed to create group");
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update an existing group
   */
  const updateGroup = async (
    groupId: string,
    updates: Partial<GroupFormData>,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const groupRef = doc(db, "groups", groupId);

      // Handle image uploads if provided
      const updateData: any = { ...updates };

      if (updates.groupImage && updates.groupImage.startsWith("file://")) {
        const response = await fetch(updates.groupImage);
        const blob = await response.blob();
        const storageRef = ref(storage, `groupImages/${groupId}/profile`);
        await uploadBytes(storageRef, blob);
        updateData.groupImage = await getDownloadURL(storageRef);
      }

      if (updates.coverImage && updates.coverImage.startsWith("file://")) {
        const response = await fetch(updates.coverImage);
        const blob = await response.blob();
        const storageRef = ref(storage, `groupImages/${groupId}/cover`);
        await uploadBytes(storageRef, blob);
        updateData.coverImage = await getDownloadURL(storageRef);
      }

      updateData.updatedAt = serverTimestamp();

      // Filter out undefined values (Firestore doesn't accept undefined)
      const filteredData: any = {};
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          filteredData[key] = updateData[key];
        }
      });

      await updateDoc(groupRef, filteredData);

      console.log("Group updated successfully:", groupId);
      return true;
    } catch (err) {
      console.error("Error updating group:", err);
      setError("Failed to update group");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a group (only by creator/organizers)
   */
  const deleteGroup = async (groupId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const batch = writeBatch(db);

      // Delete group document
      batch.delete(doc(db, "groups", groupId));

      // Delete all group members
      const membersQuery = query(
        collection(db, "groupMembers"),
        where("groupId", "==", groupId),
      );
      const membersSnapshot = await getDocs(membersQuery);
      membersSnapshot.docs.forEach((memberDoc) => {
        batch.delete(memberDoc.ref);
      });

      // Delete all join requests
      const requestsQuery = query(
        collection(db, "groupJoinRequests"),
        where("groupId", "==", groupId),
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      requestsSnapshot.docs.forEach((requestDoc) => {
        batch.delete(requestDoc.ref);
      });

      // Delete all invites
      const invitesQuery = query(
        collection(db, "groupInvites"),
        where("groupId", "==", groupId),
      );
      const invitesSnapshot = await getDocs(invitesQuery);
      invitesSnapshot.docs.forEach((inviteDoc) => {
        batch.delete(inviteDoc.ref);
      });

      await batch.commit();

      console.log("Group deleted successfully:", groupId);
      return true;
    } catch (err) {
      console.error("Error deleting group:", err);
      setError("Failed to delete group");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Join a group (public groups) or request to join (private groups)
   */
  const joinGroup = async (
    groupId: string,
    userId: string,
    userName: string,
    userProfilePicture?: string,
    message?: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      if (!groupDoc.exists()) {
        setError("Group not found");
        return false;
      }

      const group = groupDoc.data() as Group;

      // Check if user is already a member
      if (group.members.includes(userId)) {
        setError("Already a member of this group");
        return false;
      }

      if (group.requiresApproval) {
        // Create join request
        await addDoc(collection(db, "groupJoinRequests"), {
          groupId,
          userId,
          userName,
          userProfilePicture: userProfilePicture || "",
          message: message || "",
          status: "pending",
          createdAt: serverTimestamp(),
        });

        // Notify organizers about join request
        await notifyOrganizers(groupId, group.organizers, {
          type: "join_request",
          message: `${userName.trim()} requested to join ${group.name}`,
          actorId: userId,
          actorName: userName.trim(),
          groupName: group.name,
        });

        return true;
      } else {
        // Join directly (public group)
        const batch = writeBatch(db);

        // Add user to group members
        batch.update(doc(db, "groups", groupId), {
          members: arrayUnion(userId),
          memberCount: increment(1),
          updatedAt: serverTimestamp(),
        });

        // Add member record
        const memberDoc = doc(db, "groupMembers", `${userId}_${groupId}`);
        batch.set(memberDoc, {
          userId,
          groupId,
          role: "member",
          joinedAt: serverTimestamp(),
          notificationsEnabled: true,
        });

        await batch.commit();

        // Notify ALL group members (including organizers, excluding the person who joined)
        console.log(
          "🔔 Notifying ALL group members about new member joining public group (excluding only the new member)",
        );
        await notifyGroupMembers(groupId, group.members, [userId], {
          type: "member_joined",
          message: `${userName.trim()} joined ${group.name}`,
          actorId: userId,
          actorName: userName.trim(),
          groupName: group.name,
        });

        return true;
      }
    } catch (err) {
      console.error("Error joining group:", err);
      setError("Failed to join group");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Leave a group
   */
  const leaveGroup = async (
    groupId: string,
    userId: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const batch = writeBatch(db);

      // Remove user from group
      batch.update(doc(db, "groups", groupId), {
        members: arrayRemove(userId),
        organizers: arrayRemove(userId), // Also remove from organizers if applicable
        memberCount: increment(-1),
        updatedAt: serverTimestamp(),
      });

      // Delete member record
      const memberDoc = doc(db, "groupMembers", `${userId}_${groupId}`);
      batch.delete(memberDoc);

      await batch.commit();

      console.log("Left group successfully:", groupId);
      return true;
    } catch (err) {
      console.error("Error leaving group:", err);
      setError("Failed to leave group");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Invite a user to a group
   */
  const inviteToGroup = async (
    groupId: string,
    groupName: string,
    invitedUserId: string,
    invitedByUserId: string,
    invitedByName: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Check if user is already a member
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      if (groupDoc.exists()) {
        const group = groupDoc.data() as Group;
        if (group.members.includes(invitedUserId)) {
          setError("User is already a member");
          return false;
        }
      }

      // Create invite
      await addDoc(collection(db, "groupInvites"), {
        groupId,
        groupName,
        invitedUserId,
        invitedByUserId,
        invitedByName,
        status: "pending",
        createdAt: serverTimestamp(),
        expiresAt: null, // Could add 7-day expiration
      });

      // Notify invited user
      const invitedUserDoc = await getDoc(doc(db, "users", invitedUserId));
      if (invitedUserDoc.exists()) {
        const invitedUserData = invitedUserDoc.data();

        const notification = {
          id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
          title: "Group Invitation",
          body: `${invitedByName} invited you to join ${groupName}`,
          data: {
            type: "group_invite",
            groupId,
            invitedBy: invitedByUserId,
          },
          timestamp: new Date(),
          read: false,
        };

        // Store notification in Firestore
        await updateDoc(doc(db, "users", invitedUserId), {
          notifications: arrayUnion(notification),
        });

        // Send push notification if user has token and notifications enabled
        if (
          invitedUserData.expoPushToken &&
          invitedUserData.notificationPreferences?.notificationsEnabled &&
          invitedUserData.notificationPreferences?.events
        ) {
          const pushPayload = {
            to: invitedUserData.expoPushToken,
            title: "Group Invitation",
            body: `${invitedByName} invited you to join ${groupName}`,
            sound: "default",
            priority: "high",
            data: {
              type: "group_invite",
              groupId,
              invitedBy: invitedByUserId,
            },
          };

          try {
            console.log(
              "📤 Sending group invite push notification to:",
              invitedUserData.expoPushToken?.substring(0, 20) + "...",
            );
            const response = await fetch(
              "https://exp.host/--/api/v2/push/send",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                  "Accept-encoding": "gzip, deflate",
                },
                body: JSON.stringify(pushPayload),
              },
            );

            if (!response.ok) {
              console.error(
                "❌ Push notification failed with status:",
                response.status,
              );
              const errorText = await response.text();
              console.error("Error details:", errorText);
            } else {
              console.log(
                "✅ Group invite push notification sent successfully",
              );
            }
          } catch (pushError) {
            console.error("❌ Failed to send push notification:", pushError);
          }
        } else {
          console.log("⚠️ Skipping push notification - missing requirements:", {
            hasToken: !!invitedUserData.expoPushToken,
            notificationsEnabled:
              invitedUserData.notificationPreferences?.notificationsEnabled,
            eventsEnabled: invitedUserData.notificationPreferences?.events,
          });
        }
      }

      return true;
    } catch (err) {
      console.error("Error inviting to group:", err);
      setError("Failed to invite user");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Accept a group invite
   */
  const acceptGroupInvite = async (
    inviteId: string,
    groupId: string,
    userId: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Get group data and user data first
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      if (!groupDoc.exists()) {
        setError("Group not found");
        return false;
      }

      const groupData = groupDoc.data();
      const groupName = groupData.name;
      const currentMembers = groupData.members || [];

      // Get the accepting user's data
      const userDoc = await getDoc(doc(db, "users", userId));
      const userName = userDoc.exists() ? userDoc.data().name : "Someone";

      const batch = writeBatch(db);

      // Update invite status
      batch.update(doc(db, "groupInvites", inviteId), {
        status: "accepted",
      });

      // Add user to group
      batch.update(doc(db, "groups", groupId), {
        members: arrayUnion(userId),
        memberCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      // Add member record
      const memberDoc = doc(db, "groupMembers", `${userId}_${groupId}`);
      batch.set(memberDoc, {
        userId,
        groupId,
        role: "member",
        joinedAt: serverTimestamp(),
        notificationsEnabled: true,
      });

      await batch.commit();

      // Notify all other group members that someone accepted an invite and joined
      await notifyGroupMembers(groupId, currentMembers, [userId], {
        type: "member_joined",
        message: `${userName.trim()} joined ${groupName}`,
        actorId: userId,
        actorName: userName.trim(),
        groupName: groupName,
      });

      return true;
    } catch (err) {
      console.error("Error accepting invite:", err);
      setError("Failed to accept invite");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Approve a join request
   */
  const approveJoinRequest = async (
    requestId: string,
    groupId: string,
    userId: string,
    approverId?: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Get group data first to get member list and group name
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      if (!groupDoc.exists()) {
        setError("Group not found");
        return false;
      }

      const groupData = groupDoc.data();
      const groupName = groupData.name;
      const currentMembers = groupData.members || [];

      // Get the approved user's data
      const userDoc = await getDoc(doc(db, "users", userId));
      const userName = userDoc.exists() ? userDoc.data().name : "Someone";

      const batch = writeBatch(db);

      // Update request status
      batch.update(doc(db, "groupJoinRequests", requestId), {
        status: "approved",
      });

      // Add user to group
      batch.update(doc(db, "groups", groupId), {
        members: arrayUnion(userId),
        memberCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      // Add member record
      const memberDoc = doc(db, "groupMembers", `${userId}_${groupId}`);
      batch.set(memberDoc, {
        userId,
        groupId,
        role: "member",
        joinedAt: serverTimestamp(),
        notificationsEnabled: true,
      });

      await batch.commit();

      // Notify the approved user
      if (userDoc.exists()) {
        const notification = {
          id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
          title: "Join Request Approved",
          body: `Your request to join ${groupName} has been approved!`,
          data: {
            type: "join_request_approved",
            groupId,
          },
          timestamp: new Date(),
          read: false,
        };

        // Store notification in Firestore
        await updateDoc(doc(db, "users", userId), {
          notifications: arrayUnion(notification),
        });

        // Send push notification if user has token and notifications enabled
        const userData = userDoc.data();
        if (
          userData.expoPushToken &&
          userData.notificationPreferences?.notificationsEnabled &&
          userData.notificationPreferences?.activities
        ) {
          const pushPayload = {
            to: userData.expoPushToken,
            title: "Join Request Approved",
            body: `Your request to join ${groupName} has been approved!`,
            sound: "default",
            priority: "high",
            data: {
              type: "join_request_approved",
              groupId,
            },
          };

          try {
            console.log("📤 Sending join request approved push notification");
            const response = await fetch(
              "https://exp.host/--/api/v2/push/send",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                  "Accept-encoding": "gzip, deflate",
                },
                body: JSON.stringify(pushPayload),
              },
            );

            if (!response.ok) {
              console.error(
                "❌ Push notification failed with status:",
                response.status,
              );
              const errorText = await response.text();
              console.error("Error details:", errorText);
            } else {
              console.log(
                "✅ Join request approved push notification sent successfully",
              );
            }
          } catch (pushError) {
            console.error("❌ Failed to send push notification:", pushError);
          }
        } else {
          console.log("⚠️ Skipping push notification - missing requirements");
        }
      }

      // Notify all other group members (excluding the approved user AND the approving organizer) that someone new joined
      // In a private group, the organizer who approved already knows about the join, so exclude them
      const excludeUsers = [userId];
      if (approverId) {
        excludeUsers.push(approverId);
        console.log(
          "🔔 Notifying group members about join approval (excluding new member AND approving organizer)",
        );
      }

      await notifyGroupMembers(groupId, currentMembers, excludeUsers, {
        type: "member_joined",
        message: `${userName.trim()} joined ${groupName}`,
        actorId: userId,
        actorName: userName.trim(),
        groupName: groupName,
      });

      return true;
    } catch (err) {
      console.error("Error approving request:", err);
      setError("Failed to approve request");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reject a join request
   */
  const rejectJoinRequest = async (
    requestId: string,
    groupId: string,
    userId: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Update request status
      await updateDoc(doc(db, "groupJoinRequests", requestId), {
        status: "rejected",
      });

      // Optionally notify user
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const groupDoc = await getDoc(doc(db, "groups", groupId));
        const groupName = groupDoc.exists()
          ? groupDoc.data().name
          : "the group";

        const notification = {
          id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
          title: "Join Request Declined",
          body: `Your request to join ${groupName} was declined.`,
          data: {
            type: "join_request_rejected",
            groupId,
          },
          timestamp: new Date(),
          read: false,
        };

        // Store notification in Firestore
        await updateDoc(doc(db, "users", userId), {
          notifications: arrayUnion(notification),
        });

        // Send push notification if user has token and notifications enabled
        const userData = userDoc.data();
        if (
          userData.expoPushToken &&
          userData.notificationPreferences?.notificationsEnabled &&
          userData.notificationPreferences?.activities
        ) {
          const pushPayload = {
            to: userData.expoPushToken,
            title: "Join Request Declined",
            body: `Your request to join ${groupName} was declined.`,
            sound: "default",
            priority: "high",
            data: {
              type: "join_request_rejected",
              groupId,
            },
          };

          try {
            console.log("📤 Sending join request rejected push notification");
            const response = await fetch(
              "https://exp.host/--/api/v2/push/send",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                  "Accept-encoding": "gzip, deflate",
                },
                body: JSON.stringify(pushPayload),
              },
            );

            if (!response.ok) {
              console.error(
                "❌ Push notification failed with status:",
                response.status,
              );
              const errorText = await response.text();
              console.error("Error details:", errorText);
            } else {
              console.log(
                "✅ Join request rejected push notification sent successfully",
              );
            }
          } catch (pushError) {
            console.error("❌ Failed to send push notification:", pushError);
          }
        } else {
          console.log("⚠️ Skipping push notification - missing requirements");
        }
      }

      return true;
    } catch (err) {
      console.error("Error rejecting request:", err);
      setError("Failed to reject request");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancel a join request (user cancels their own pending request)
   */
  const cancelJoinRequest = async (
    groupId: string,
    userId: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Find the user's pending join request
      const requestsQuery = query(
        collection(db, "groupJoinRequests"),
        where("groupId", "==", groupId),
        where("userId", "==", userId),
        where("status", "==", "pending"),
      );

      const snapshot = await getDocs(requestsQuery);

      if (snapshot.empty) {
        setError("No pending request found");
        return false;
      }

      // Delete the request
      const requestDoc = snapshot.docs[0];
      await deleteDoc(doc(db, "groupJoinRequests", requestDoc.id));

      return true;
    } catch (err) {
      console.error("Error canceling join request:", err);
      setError("Failed to cancel request");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove a member from a group (only by organizer/admin)
   */
  const removeMember = async (
    groupId: string,
    userId: string,
    removerId: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Get group data
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      if (!groupDoc.exists()) {
        setError("Group not found");
        return false;
      }

      const groupData = groupDoc.data();
      const groupName = groupData.name;
      const organizers = groupData.organizers || [];
      const creatorId = groupData.creatorId;

      // Check permissions: remover must be creator or organizer
      const isRemoverCreator = removerId === creatorId;
      const isRemoverOrganizer = organizers.includes(removerId);
      
      if (!isRemoverCreator && !isRemoverOrganizer) {
        setError("Unauthorized: Only group creators and organizers can remove members");
        return false;
      }

      // Cannot remove creator
      if (userId === creatorId) {
        setError("Cannot remove the group creator");
        return false;
      }

      // Get the removed user's data
      const removedUserDoc = await getDoc(doc(db, "users", userId));
      const removedUserName = removedUserDoc.exists() ? removedUserDoc.data().name : "Someone";

      const batch = writeBatch(db);

      // Remove user from group
      batch.update(doc(db, "groups", groupId), {
        members: arrayRemove(userId),
        organizers: arrayRemove(userId), // Also remove from organizers if applicable
        memberCount: increment(-1),
        updatedAt: serverTimestamp(),
      });

      // Delete member record
      const memberDoc = doc(db, "groupMembers", `${userId}_${groupId}`);
      batch.delete(memberDoc);

      await batch.commit();

      // Notify the removed user
      if (removedUserDoc.exists()) {
        const removedUserData = removedUserDoc.data();
        const notification = {
          id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
          title: "Removed from Group",
          body: `You have been removed from ${groupName}`,
          data: {
            type: "member_removed",
            groupId,
            groupName,
          },
          timestamp: new Date(),
          read: false,
        };

        // Store notification in Firestore
        await updateDoc(doc(db, "users", userId), {
          notifications: arrayUnion(notification),
        });

        // Send push notification if user has token and notifications enabled
        if (
          removedUserData.expoPushToken &&
          removedUserData.notificationPreferences?.notificationsEnabled &&
          removedUserData.notificationPreferences?.activities
        ) {
          const pushPayload = {
            to: removedUserData.expoPushToken,
            title: "Removed from Group",
            body: `You have been removed from ${groupName}`,
            sound: "default",
            priority: "high",
            data: {
              type: "member_removed",
              groupId,
              groupName,
            },
          };

          try {
            console.log("📤 Sending member removed push notification");
            const response = await fetch(
              "https://exp.host/--/api/v2/push/send",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                  "Accept-encoding": "gzip, deflate",
                },
                body: JSON.stringify(pushPayload),
              },
            );

            if (!response.ok) {
              console.error(
                "❌ Push notification failed with status:",
                response.status,
              );
            } else {
              console.log("✅ Member removed push notification sent successfully");
            }
          } catch (pushError) {
            console.error("❌ Failed to send push notification:", pushError);
          }
        }
      }

      console.log("Member removed successfully:", userId);
      return true;
    } catch (err) {
      console.error("Error removing member:", err);
      setError("Failed to remove member");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Transfer admin rights to another member (only by creator)
   */
  const transferAdmin = async (
    groupId: string,
    newAdminId: string,
    currentAdminId: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Get group data
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      if (!groupDoc.exists()) {
        setError("Group not found");
        return false;
      }

      const groupData = groupDoc.data();
      const groupName = groupData.name;
      const creatorId = groupData.creatorId;

      // Check permissions: only creator can transfer admin
      if (currentAdminId !== creatorId) {
        setError("Unauthorized: Only the group creator can transfer admin rights");
        return false;
      }

      // Cannot transfer to self
      if (newAdminId === currentAdminId) {
        setError("Cannot transfer admin rights to yourself");
        return false;
      }

      // Verify new admin is a member
      const members = groupData.members || [];
      if (!members.includes(newAdminId)) {
        setError("The selected user is not a member of this group");
        return false;
      }

      // Get user data for notifications
      const newAdminDoc = await getDoc(doc(db, "users", newAdminId));
      const newAdminName = newAdminDoc.exists() ? newAdminDoc.data().name : "Someone";
      const currentAdminDoc = await getDoc(doc(db, "users", currentAdminId));
      const currentAdminName = currentAdminDoc.exists() ? currentAdminDoc.data().name : "Someone";

      const batch = writeBatch(db);

      // Update group creatorId
      batch.update(doc(db, "groups", groupId), {
        creatorId: newAdminId,
        organizers: arrayUnion(newAdminId), // Ensure new admin is in organizers
        updatedAt: serverTimestamp(),
      });

      // Update member records
      const newAdminMemberDoc = doc(db, "groupMembers", `${newAdminId}_${groupId}`);
      const currentAdminMemberDoc = doc(db, "groupMembers", `${currentAdminId}_${groupId}`);
      
      // Get existing member docs to update
      const newAdminMemberDocSnap = await getDoc(newAdminMemberDoc);
      const currentAdminMemberDocSnap = await getDoc(currentAdminMemberDoc);

      if (newAdminMemberDocSnap.exists()) {
        batch.update(newAdminMemberDoc, {
          role: "creator",
        });
      } else {
        batch.set(newAdminMemberDoc, {
          userId: newAdminId,
          groupId,
          role: "creator",
          joinedAt: serverTimestamp(),
          notificationsEnabled: true,
        });
      }

      if (currentAdminMemberDocSnap.exists()) {
        batch.update(currentAdminMemberDoc, {
          role: "organizer", // Previous creator becomes organizer
        });
      }

      await batch.commit();

      // Notify the new admin
      if (newAdminDoc.exists()) {
        const newAdminData = newAdminDoc.data();
        const notification = {
          id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
          title: "Admin Rights Transferred",
          body: `You are now the admin of ${groupName}`,
          data: {
            type: "admin_transferred",
            groupId,
            groupName,
          },
          timestamp: new Date(),
          read: false,
        };

        await updateDoc(doc(db, "users", newAdminId), {
          notifications: arrayUnion(notification),
        });

        // Send push notification
        if (
          newAdminData.expoPushToken &&
          newAdminData.notificationPreferences?.notificationsEnabled &&
          newAdminData.notificationPreferences?.activities
        ) {
          const pushPayload = {
            to: newAdminData.expoPushToken,
            title: "Admin Rights Transferred",
            body: `You are now the admin of ${groupName}`,
            sound: "default",
            priority: "high",
            data: {
              type: "admin_transferred",
              groupId,
              groupName,
            },
          };

          try {
            await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "Accept-encoding": "gzip, deflate",
              },
              body: JSON.stringify(pushPayload),
            });
            console.log("✅ Admin transfer push notification sent successfully");
          } catch (pushError) {
            console.error("❌ Failed to send push notification:", pushError);
          }
        }
      }

      // Notify the previous admin
      if (currentAdminDoc.exists()) {
        const currentAdminData = currentAdminDoc.data();
        const notification = {
          id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
          title: "Admin Rights Transferred",
          body: `You transferred admin rights of ${groupName} to ${newAdminName}`,
          data: {
            type: "admin_transferred",
            groupId,
            groupName,
          },
          timestamp: new Date(),
          read: false,
        };

        await updateDoc(doc(db, "users", currentAdminId), {
          notifications: arrayUnion(notification),
        });

        // Send push notification
        if (
          currentAdminData.expoPushToken &&
          currentAdminData.notificationPreferences?.notificationsEnabled &&
          currentAdminData.notificationPreferences?.activities
        ) {
          const pushPayload = {
            to: currentAdminData.expoPushToken,
            title: "Admin Rights Transferred",
            body: `You transferred admin rights of ${groupName} to ${newAdminName}`,
            sound: "default",
            priority: "high",
            data: {
              type: "admin_transferred",
              groupId,
              groupName,
            },
          };

          try {
            await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "Accept-encoding": "gzip, deflate",
              },
              body: JSON.stringify(pushPayload),
            });
          } catch (pushError) {
            console.error("❌ Failed to send push notification:", pushError);
          }
        }
      }

      console.log("Admin transferred successfully");
      return true;
    } catch (err) {
      console.error("Error transferring admin:", err);
      setError("Failed to transfer admin rights");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Promote a member to organizer
   */
  const promoteToOrganizer = async (
    groupId: string,
    userId: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Get group data and user data
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      if (!groupDoc.exists()) {
        setError("Group not found");
        return false;
      }

      const groupData = groupDoc.data();
      const groupName = groupData.name;

      const batch = writeBatch(db);

      // Add user to organizers
      batch.update(doc(db, "groups", groupId), {
        organizers: arrayUnion(userId),
        updatedAt: serverTimestamp(),
      });

      // Update member record
      const memberDoc = doc(db, "groupMembers", `${userId}_${groupId}`);
      batch.update(memberDoc, {
        role: "organizer",
      });

      await batch.commit();

      // Notify the promoted user
      const promotedUserDoc = await getDoc(doc(db, "users", userId));
      if (promotedUserDoc.exists()) {
        const promotedUserData = promotedUserDoc.data();

        const notification = {
          id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
          title: "Promoted to Organizer",
          body: `You've been promoted to organizer in ${groupName}!`,
          data: {
            type: "promoted_to_organizer",
            groupId,
          },
          timestamp: new Date(),
          read: false,
        };

        // Store notification in Firestore
        await updateDoc(doc(db, "users", userId), {
          notifications: arrayUnion(notification),
        });

        // Send push notification if user has token and notifications enabled
        if (
          promotedUserData.expoPushToken &&
          promotedUserData.notificationPreferences?.notificationsEnabled &&
          promotedUserData.notificationPreferences?.events
        ) {
          const pushPayload = {
            to: promotedUserData.expoPushToken,
            title: "Promoted to Organizer",
            body: `You've been promoted to organizer in ${groupName}!`,
            sound: "default",
            priority: "high",
            data: {
              type: "promoted_to_organizer",
              groupId,
            },
          };

          try {
            console.log("📤 Sending promoted to organizer push notification");
            const response = await fetch(
              "https://exp.host/--/api/v2/push/send",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                  "Accept-encoding": "gzip, deflate",
                },
                body: JSON.stringify(pushPayload),
              },
            );

            if (!response.ok) {
              console.error(
                "❌ Push notification failed with status:",
                response.status,
              );
              const errorText = await response.text();
              console.error("Error details:", errorText);
            } else {
              console.log(
                "✅ Promoted to organizer push notification sent successfully",
              );
            }
          } catch (pushError) {
            console.error("❌ Failed to send push notification:", pushError);
          }
        } else {
          console.log("⚠️ Skipping push notification - missing requirements");
        }
      }

      return true;
    } catch (err) {
      console.error("Error promoting member:", err);
      setError("Failed to promote member");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get group members with their user data
   */
  const getGroupMembers = async (groupId: string): Promise<any[]> => {
    setLoading(true);
    setError(null);

    try {
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      if (!groupDoc.exists()) {
        return [];
      }

      const group = groupDoc.data() as Group;

      // Fetch all member user documents
      const memberPromises = group.members.map(async (memberId) => {
        const userDoc = await getDoc(doc(db, "users", memberId));
        if (userDoc.exists()) {
          const memberData = await getDoc(
            doc(db, "groupMembers", `${memberId}_${groupId}`),
          );
          return {
            id: memberId,
            ...userDoc.data(),
            groupRole: memberData.exists() ? memberData.data().role : "member",
            joinedAt: memberData.exists() ? memberData.data().joinedAt : null,
          };
        }
        return null;
      });

      const members = await Promise.all(memberPromises);
      return members.filter(Boolean);
    } catch (err) {
      console.error("Error fetching group members:", err);
      setError("Failed to fetch members");
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get pending join requests for a group
   */
  const getJoinRequests = async (
    groupId: string,
  ): Promise<GroupJoinRequest[]> => {
    setLoading(true);
    setError(null);

    try {
      const requestsQuery = query(
        collection(db, "groupJoinRequests"),
        where("groupId", "==", groupId),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc"),
      );

      const snapshot = await getDocs(requestsQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as GroupJoinRequest[];
    } catch (err) {
      console.error("Error fetching join requests:", err);
      setError("Failed to fetch requests");
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get user's group invites
   */
  const getUserInvites = async (userId: string): Promise<GroupInvite[]> => {
    setLoading(true);
    setError(null);

    try {
      const invitesQuery = query(
        collection(db, "groupInvites"),
        where("invitedUserId", "==", userId),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc"),
      );

      const snapshot = await getDocs(invitesQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as GroupInvite[];
    } catch (err) {
      console.error("Error fetching invites:", err);
      setError("Failed to fetch invites");
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Helper: Notify group organizers
   */
  const notifyOrganizers = async (
    groupId: string,
    organizerIds: string[],
    notificationData: {
      type: string;
      message: string;
      actorId?: string;
      actorName?: string;
      groupName?: string;
    },
  ) => {
    try {
      const notificationPromises = organizerIds.map(async (organizerId) => {
        try {
          // Get organizer's user document
          const organizerDoc = await getDoc(doc(db, "users", organizerId));
          if (!organizerDoc.exists()) return;

          const organizerData = organizerDoc.data();

          const notification = {
            id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
            title: notificationData.groupName || "Group Activity",
            body: notificationData.message,
            data: {
              type: notificationData.type,
              groupId,
              actorId: notificationData.actorId,
            },
            timestamp: new Date(),
            read: false,
          };

          // Store notification in Firestore
          await updateDoc(doc(db, "users", organizerId), {
            notifications: arrayUnion(notification),
          });

          // Send push notification if user has token and notifications enabled
          if (
            organizerData.expoPushToken &&
            organizerData.notificationPreferences?.notificationsEnabled &&
            organizerData.notificationPreferences?.events
          ) {
            const pushPayload = {
              to: organizerData.expoPushToken,
              title: notificationData.groupName || "Group Activity",
              body: notificationData.message,
              sound: "default",
              priority: "high",
              data: {
                type: notificationData.type,
                groupId,
                actorId: notificationData.actorId,
                actorName: notificationData.actorName,
              },
            };

            try {
              console.log(
                "📤 Sending organizer push notification to:",
                organizerData.expoPushToken?.substring(0, 20) + "...",
              );
              const response = await fetch(
                "https://exp.host/--/api/v2/push/send",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "Accept-encoding": "gzip, deflate",
                  },
                  body: JSON.stringify(pushPayload),
                },
              );

              if (!response.ok) {
                console.error(
                  "❌ Push notification failed with status:",
                  response.status,
                );
                const errorText = await response.text();
                console.error("Error details:", errorText);
              } else {
                console.log("✅ Organizer push notification sent successfully");
              }
            } catch (pushError) {
              console.error(
                "❌ Failed to send push notification to organizer:",
                pushError,
              );
            }
          } else {
            console.log(
              "⚠️ Skipping push notification for organizer - missing requirements:",
              {
                hasToken: !!organizerData.expoPushToken,
                notificationsEnabled:
                  organizerData.notificationPreferences?.notificationsEnabled,
                eventsEnabled: organizerData.notificationPreferences?.events,
              },
            );
          }
        } catch (error) {
          console.error("❌ Error notifying organizer:", organizerId, error);
        }
      });

      await Promise.all(notificationPromises);
      console.log(`✅ Finished notifying ${organizerIds.length} organizers`);
    } catch (err) {
      console.error("❌ Error notifying organizers:", err);
    }
  };

  /**
   * Helper: Notify all group members (excluding specified user IDs)
   */
  const notifyGroupMembers = async (
    groupId: string,
    memberIds: string[],
    excludeUserIds: string[],
    notificationData: {
      type: string;
      message: string;
      actorId?: string;
      actorName?: string;
      groupName?: string;
      postId?: string;
      commentId?: string;
    },
  ) => {
    try {
      // Filter out excluded users
      const targetMemberIds = memberIds.filter(
        (id) => !excludeUserIds.includes(id),
      );

      const notificationPromises = targetMemberIds.map(async (memberId) => {
        try {
          // Get member's user document
          const memberDoc = await getDoc(doc(db, "users", memberId));
          if (!memberDoc.exists()) return;

          const memberData = memberDoc.data();

          // Build notification data object, filtering out undefined values
          const notificationDataObj: any = {
            type: notificationData.type,
            groupId,
          };

          // Only add optional fields if they're defined
          if (notificationData.actorId !== undefined) {
            notificationDataObj.actorId = notificationData.actorId;
          }
          if (notificationData.postId !== undefined) {
            notificationDataObj.postId = notificationData.postId;
          }
          if (notificationData.commentId !== undefined) {
            notificationDataObj.commentId = notificationData.commentId;
          }

          const notification = {
            id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
            title: notificationData.groupName || "Group Activity",
            body: notificationData.message,
            data: notificationDataObj,
            timestamp: new Date(),
            read: false,
          };

          // Store notification in Firestore
          await updateDoc(doc(db, "users", memberId), {
            notifications: arrayUnion(notification),
          });

          // Send push notification if user has token and notifications enabled
          // Check for 'activities' (new) or 'events' (legacy) field for backwards compatibility
          if (
            memberData.expoPushToken &&
            memberData.notificationPreferences?.notificationsEnabled &&
            (memberData.notificationPreferences?.activities ||
              memberData.notificationPreferences?.events)
          ) {
            // Build push data object, filtering out undefined values
            const pushDataObj: any = {
              type: notificationData.type,
              groupId,
            };

            // Only add optional fields if they're defined
            if (notificationData.actorId !== undefined) {
              pushDataObj.actorId = notificationData.actorId;
            }
            if (notificationData.actorName !== undefined) {
              pushDataObj.actorName = notificationData.actorName;
            }
            if (notificationData.postId !== undefined) {
              pushDataObj.postId = notificationData.postId;
            }
            if (notificationData.commentId !== undefined) {
              pushDataObj.commentId = notificationData.commentId;
            }

            const pushPayload = {
              to: memberData.expoPushToken,
              title: notificationData.groupName || "Group Activity",
              body: notificationData.message,
              sound: "default",
              priority: "high",
              data: pushDataObj,
            };

            try {
              console.log(
                "📤 Sending group member push notification to:",
                memberData.expoPushToken?.substring(0, 20) + "...",
              );
              const response = await fetch(
                "https://exp.host/--/api/v2/push/send",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "Accept-encoding": "gzip, deflate",
                  },
                  body: JSON.stringify(pushPayload),
                },
              );

              if (!response.ok) {
                console.error(
                  "❌ Push notification failed with status:",
                  response.status,
                );
                const errorText = await response.text();
                console.error("Error details:", errorText);
              } else {
                console.log(
                  "✅ Group member push notification sent successfully",
                );
              }
            } catch (pushError) {
              console.error(
                "❌ Failed to send push notification to member:",
                pushError,
              );
            }
          } else {
            console.log(
              "⚠️ Skipping push notification for member - missing requirements:",
              {
                hasToken: !!memberData.expoPushToken,
                notificationsEnabled:
                  memberData.notificationPreferences?.notificationsEnabled,
                eventsEnabled: memberData.notificationPreferences?.events,
              },
            );
          }
        } catch (error) {
          console.error("❌ Error notifying member:", memberId, error);
        }
      });

      await Promise.all(notificationPromises);
      console.log(
        `✅ Finished notifying ${targetMemberIds.length} group members`,
      );
    } catch (err) {
      console.error("❌ Error notifying group members:", err);
    }
  };

  /**
   * Create a group chat room
   */
  const createGroupChat = async (
    groupId: string,
    groupName: string,
    groupImage: string | undefined,
    memberIds: string[],
  ): Promise<string | null> => {
    try {
      const chatRef = doc(collection(db, "chats"));
      const chatId = chatRef.id;

      const chatData = {
        id: chatId,
        type: "group",
        groupId,
        groupName,
        groupImage,
        participants: memberIds,
        lastMessage: "",
        lastMessageTime: serverTimestamp(),
        createdAt: serverTimestamp(),
        isGroupChat: true,
        status: "active",
      };

      // Create both the chat document and update the group in a batch
      const batch = writeBatch(db);
      batch.set(chatRef, chatData);
      batch.update(doc(db, "groups", groupId), {
        chatRoomId: chatId,
      });
      await batch.commit();

      console.log("Group chat created successfully:", chatId);
      return chatId;
    } catch (err) {
      console.error("Error creating group chat:", err);
      return null;
    }
  };

  /**
   * Create a new post in a group
   */
  const createPost = async (
    groupId: string,
    content: string,
    authorId: string,
    authorName: string,
    authorProfilePicture?: string,
    imageUrl?: string,
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      // Get group data
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      if (!groupDoc.exists()) {
        setError("Group not found");
        return null;
      }

      const groupData = groupDoc.data();
      const groupName = groupData.name;
      const members = groupData.members || [];

      const postData: any = {
        groupId,
        authorId,
        authorName,
        content,
        likes: [],
        likeCount: 0,
        commentCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Only include optional fields if they have values
      if (authorProfilePicture) {
        postData.authorProfilePicture = authorProfilePicture;
      }
      if (imageUrl) {
        postData.imageUrl = imageUrl;
      }

      const postRef = await addDoc(
        collection(db, "groups", groupId, "posts"),
        postData,
      );

      // Update group post count
      await updateDoc(doc(db, "groups", groupId), {
        postCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      // Notify all group members (except the author) about the new post
      const contentPreview =
        content.length > 50 ? content.substring(0, 50) + "..." : content;
      await notifyGroupMembers(groupId, members, [authorId], {
        type: "new_post",
        message: `${authorName.trim()} posted: ${contentPreview}`,
        actorId: authorId,
        actorName: authorName.trim(),
        groupName: groupName,
        postId: postRef.id,
      });

      console.log("Post created successfully:", postRef.id);
      return postRef.id;
    } catch (err) {
      console.error("Error creating post:", err);
      setError("Failed to create post");
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get all posts for a group
   */
  const getPosts = async (groupId: string): Promise<any[]> => {
    setLoading(true);
    setError(null);

    try {
      const postsQuery = query(
        collection(db, "groups", groupId, "posts"),
        orderBy("createdAt", "desc"),
      );

      const snapshot = await getDocs(postsQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError("Failed to fetch posts");
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a post (only by creator, organizer, or admin)
   */
  const deletePost = async (
    groupId: string,
    postId: string,
    userId: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Fetch post to get authorId
      const postDoc = await getDoc(doc(db, "groups", groupId, "posts", postId));
      if (!postDoc.exists()) {
        setError("Post not found");
        return false;
      }

      const postData = postDoc.data();
      const postAuthorId = postData.authorId;

      // Fetch group to check organizer status
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      if (!groupDoc.exists()) {
        setError("Group not found");
        return false;
      }

      const groupData = groupDoc.data();
      const organizers = groupData.organizers || [];

      // Check permissions: user must be the creator, an organizer, or an admin
      const isPostCreator = postAuthorId === userId;
      const isGroupOrganizer = organizers.includes(userId);
      const isUserAdmin = isAdmin(userId);

      if (!isPostCreator && !isGroupOrganizer && !isUserAdmin) {
        setError("Unauthorized: Only the post creator, group organizers, or admins can delete posts");
        return false;
      }

      const batch = writeBatch(db);

      // Delete post
      batch.delete(doc(db, "groups", groupId, "posts", postId));

      // Delete all comments
      const commentsQuery = query(
        collection(db, "groups", groupId, "posts", postId, "comments"),
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      commentsSnapshot.docs.forEach((commentDoc) => {
        batch.delete(commentDoc.ref);
      });

      // Update group post count
      batch.update(doc(db, "groups", groupId), {
        postCount: increment(-1),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      console.log("Post deleted successfully:", postId);
      return true;
    } catch (err) {
      console.error("Error deleting post:", err);
      setError("Failed to delete post");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle like on a post
   */
  const togglePostLike = async (
    groupId: string,
    postId: string,
    userId: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const postRef = doc(db, "groups", groupId, "posts", postId);
      const postDoc = await getDoc(postRef);

      if (!postDoc.exists()) {
        setError("Post not found");
        return false;
      }

      const post = postDoc.data();
      const likes = post.likes || [];
      const hasLiked = likes.includes(userId);

      if (hasLiked) {
        // Unlike
        await updateDoc(postRef, {
          likes: arrayRemove(userId),
          likeCount: increment(-1),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Like
        await updateDoc(postRef, {
          likes: arrayUnion(userId),
          likeCount: increment(1),
          updatedAt: serverTimestamp(),
        });

        // Send notification to post author only (only when liking, not unliking)
        if (post.authorId && post.authorId !== userId) {
          try {
            // Get liker's name
            const likerDoc = await getDoc(doc(db, "users", userId));
            const likerData = likerDoc.exists() ? likerDoc.data() : null;
            const likerName =
              likerData?.name || likerData?.displayName || "Someone";

            // Get group name
            const groupDoc = await getDoc(doc(db, "groups", groupId));
            const groupData = groupDoc.exists() ? groupDoc.data() : null;
            const groupName = groupData?.name || "Group";

            // Get post author's data
            const authorDoc = await getDoc(doc(db, "users", post.authorId));
            if (authorDoc.exists()) {
              const authorData = authorDoc.data();

              // Create notification object
              const notification = {
                id:
                  Date.now().toString() +
                  Math.random().toString(36).substring(7),
                title: `${likerName} liked your post`,
                body: `in ${groupName}`,
                data: {
                  type: "postLike",
                  groupId: groupId,
                  postId: postId,
                  likerId: userId,
                  likerName: likerName,
                },
                timestamp: new Date(),
                read: false,
              };

              // Add notification to author's notifications array
              await updateDoc(doc(db, "users", post.authorId), {
                notifications: arrayUnion(notification),
              });

              // Send push notification if author has it enabled
              if (
                authorData?.expoPushToken &&
                authorData?.notificationPreferences?.notificationsEnabled
              ) {
                try {
                  await fetch("https://exp.host/--/api/v2/push/send", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Accept: "application/json",
                      "Accept-encoding": "gzip, deflate",
                    },
                    body: JSON.stringify({
                      to: authorData.expoPushToken,
                      title: `${likerName} liked your post`,
                      body: `in ${groupName}`,
                      sound: "default",
                      priority: "default",
                      data: {
                        type: "postLike",
                        groupId: groupId,
                        postId: postId,
                        likerId: userId,
                        likerName: likerName,
                      },
                    }),
                  });
                  console.log(
                    "Post like push notification sent to post author:",
                    post.authorId,
                  );
                } catch (pushError) {
                  console.error(
                    "Error sending post like push notification:",
                    pushError,
                  );
                }
              }
            }
          } catch (notifError) {
            console.error("Error sending post like notification:", notifError);
            // Don't fail the like operation if notification fails
          }
        }
      }

      return true;
    } catch (err) {
      console.error("Error toggling like:", err);
      setError("Failed to update like");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle favorite on a post
   */
  const togglePostFavorite = async (
    groupId: string,
    postId: string,
    userId: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const postRef = doc(db, "groups", groupId, "posts", postId);
      const postDoc = await getDoc(postRef);

      if (!postDoc.exists()) {
        setError("Post not found");
        return false;
      }

      const post = postDoc.data();
      const favorites = post.favorites || [];
      const hasFavorited = favorites.includes(userId);

      if (hasFavorited) {
        // Unfavorite
        await updateDoc(postRef, {
          favorites: arrayRemove(userId),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Favorite
        await updateDoc(postRef, {
          favorites: arrayUnion(userId),
          updatedAt: serverTimestamp(),
        });
      }

      return true;
    } catch (err) {
      console.error("Error toggling favorite:", err);
      setError("Failed to update favorite");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add a comment to a post
   */
  const addComment = async (
    groupId: string,
    postId: string,
    content: string,
    authorId: string,
    authorName: string,
    authorProfilePicture?: string,
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const commentData = {
        postId,
        groupId,
        authorId,
        authorName,
        authorProfilePicture,
        content,
        createdAt: serverTimestamp(),
      };

      const commentRef = await addDoc(
        collection(db, "groups", groupId, "posts", postId, "comments"),
        commentData,
      );

      // Update post comment count
      await updateDoc(doc(db, "groups", groupId, "posts", postId), {
        commentCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      // Send notification to all group members (not just post author)
      try {
        const postRef = doc(db, "groups", groupId, "posts", postId);
        const postDoc = await getDoc(postRef);

        if (postDoc.exists()) {
          const post = postDoc.data();

          // Get group data
          const groupDoc = await getDoc(doc(db, "groups", groupId));
          if (groupDoc.exists()) {
            const groupData = groupDoc.data();
            const groupName = groupData?.name || "Group";
            const members = groupData?.members || [];

            // Notify all group members (excluding the commenter)
            const contentPreview =
              content.length > 50 ? content.substring(0, 50) + "..." : content;
            await notifyGroupMembers(groupId, members, [authorId], {
              type: "post_comment",
              message: `${authorName} commented: ${contentPreview}`,
              actorId: authorId,
              actorName: authorName,
              groupName: groupName,
              postId: postId,
              commentId: commentRef.id,
            });
          }
        }
      } catch (notifError) {
        console.error("Error sending comment notification:", notifError);
        // Don't fail the comment operation if notification fails
      }

      console.log("Comment added successfully:", commentRef.id);
      return commentRef.id;
    } catch (err) {
      console.error("Error adding comment:", err);
      setError("Failed to add comment");
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get all comments for a post
   */
  const getComments = async (
    groupId: string,
    postId: string,
  ): Promise<any[]> => {
    setLoading(true);
    setError(null);

    try {
      const commentsQuery = query(
        collection(db, "groups", groupId, "posts", postId, "comments"),
        orderBy("createdAt", "asc"),
      );

      const snapshot = await getDocs(commentsQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (err) {
      console.error("Error fetching comments:", err);
      setError("Failed to fetch comments");
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a comment
   */
  const deleteComment = async (
    groupId: string,
    postId: string,
    commentId: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const batch = writeBatch(db);

      // Delete comment
      batch.delete(
        doc(db, "groups", groupId, "posts", postId, "comments", commentId),
      );

      // Update post comment count
      batch.update(doc(db, "groups", groupId, "posts", postId), {
        commentCount: increment(-1),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      console.log("Comment deleted successfully:", commentId);
      return true;
    } catch (err) {
      console.error("Error deleting comment:", err);
      setError("Failed to delete comment");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create an event proposal
   */
  const createProposal = async (
    groupId: string,
    title: string,
    description: string | undefined,
    proposedLocation: string | undefined,
    proposedDate: Date | undefined,
    proposedTime: Date | undefined,
    authorId: string,
    authorName: string,
    authorProfilePicture?: string,
    expiresAt?: Date,
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      // Get group data
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      if (!groupDoc.exists()) {
        setError("Group not found");
        return null;
      }

      const groupData = groupDoc.data();
      const groupName = groupData.name;
      const members = groupData.members || [];

      // Combine date and time into eventDateTime
      let eventDateTime: Date | null = null;
      if (proposedDate && proposedTime) {
        const date = new Date(proposedDate);
        const time = new Date(proposedTime);
        eventDateTime = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          time.getHours(),
          time.getMinutes(),
          time.getSeconds(),
        );
      } else if (proposedDate) {
        eventDateTime = new Date(proposedDate);
      }

      const proposalData: any = {
        groupId,
        authorId,
        authorName,
        title,
        proposedDate: proposedDate ? serverTimestamp() : null,
        proposedTime: proposedTime ? serverTimestamp() : null,
        eventDateTime: eventDateTime ? Timestamp.fromDate(eventDateTime) : null,
        votes: {
          yes: [authorId], // Creator auto-votes yes
          no: [],
        },
        yesCount: 1,
        noCount: 0,
        status: "active",
        favorites: [],
        commentCount: 0,
        photoCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiresAt: expiresAt ? serverTimestamp() : null,
      };

      // Only include optional fields if they have values
      if (authorProfilePicture) {
        proposalData.authorProfilePicture = authorProfilePicture;
      }
      if (description) {
        proposalData.description = description;
      }
      if (proposedLocation) {
        proposalData.proposedLocation = proposedLocation;
      }

      const proposalRef = await addDoc(
        collection(db, "groups", groupId, "eventProposals"),
        proposalData,
      );

      // Notify all group members (except the author) about the new event proposal
      await notifyGroupMembers(groupId, members, [authorId], {
        type: "new_proposal",
        message: `${authorName.trim()} proposed a new event in ${groupName}: ${title}`,
        actorId: authorId,
        actorName: authorName.trim(),
        groupName: groupName,
      });

      console.log("Proposal created:", proposalRef.id);
      return proposalRef.id;
    } catch (err) {
      console.error("Error creating proposal:", err);
      setError("Failed to create proposal");
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Vote on a proposal
   */
  const voteOnProposal = async (
    groupId: string,
    proposalId: string,
    userId: string,
    voteType: "yes" | "no",
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const proposalRef = doc(
        db,
        "groups",
        groupId,
        "eventProposals",
        proposalId,
      );
      const proposalDoc = await getDoc(proposalRef);

      if (!proposalDoc.exists()) {
        setError("Proposal not found");
        return false;
      }

      const proposal = proposalDoc.data();
      const currentVotes = proposal.votes || { yes: [], no: [], maybe: [] };

      // Remove user from all vote arrays
      const updateData: any = {
        "votes.yes": arrayRemove(userId),
        "votes.no": arrayRemove(userId),
        updatedAt: serverTimestamp(),
      };

      // Decrement old counts
      if (currentVotes.yes?.includes(userId)) {
        updateData.yesCount = increment(-1);
      } else if (currentVotes.no?.includes(userId)) {
        updateData.noCount = increment(-1);
      }

      // Apply removals first
      await updateDoc(proposalRef, updateData);

      // Add to new vote type and increment count
      const addData: any = {
        [`votes.${voteType}`]: arrayUnion(userId),
        [`${voteType}Count`]: increment(1),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(proposalRef, addData);

      return true;
    } catch (err) {
      console.error("Error voting:", err);
      setError("Failed to record vote");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get all proposals for a group
   */
  const getProposals = async (groupId: string): Promise<any[]> => {
    setLoading(true);
    setError(null);

    try {
      const proposalsQuery = query(
        collection(db, "groups", groupId, "eventProposals"),
        orderBy("createdAt", "desc"),
      );

      const snapshot = await getDocs(proposalsQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (err) {
      console.error("Error fetching proposals:", err);
      setError("Failed to fetch proposals");
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add comment to proposal (can include photo)
   */
  const addProposalComment = async (
    groupId: string,
    proposalId: string,
    content: string,
    authorId: string,
    authorName: string,
    authorProfilePicture?: string,
    imageUrl?: string,
    videoUrl?: string,
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      // Get proposal data to notify attendees
      const proposalRef = doc(
        db,
        "groups",
        groupId,
        "eventProposals",
        proposalId,
      );
      const proposalDoc = await getDoc(proposalRef);

      if (!proposalDoc.exists()) {
        setError("Proposal not found");
        return null;
      }

      const proposalData = proposalDoc.data();
      const proposalTitle = proposalData.title;
      const attendees = proposalData.votes?.yes || [];
      const proposalOrganizerId = proposalData.authorId;

      const commentData: any = {
        proposalId,
        groupId,
        authorId,
        authorName,
        authorProfilePicture,
        content,
        createdAt: serverTimestamp(),
      };

      // Add media with type detection
      if (imageUrl) {
        commentData.imageUrl = imageUrl;
        commentData.mediaType = "image";
      }
      if (videoUrl) {
        commentData.videoUrl = videoUrl;
        commentData.mediaType = "video";
      }

      const commentRef = await addDoc(
        collection(
          db,
          "groups",
          groupId,
          "eventProposals",
          proposalId,
          "comments",
        ),
        commentData,
      );

      // Update proposal counts
      const updateData: any = {
        commentCount: increment(1),
        updatedAt: serverTimestamp(),
      };

      if (imageUrl || videoUrl) {
        updateData.photoCount = increment(1);
      }

      await updateDoc(proposalRef, updateData);

      // Build list of users to notify: organizer + attendees (excluding the commenter)
      const usersToNotify = new Set<string>();
      
      // Add the proposal organizer (if not the commenter)
      if (proposalOrganizerId && proposalOrganizerId !== authorId) {
        usersToNotify.add(proposalOrganizerId);
      }
      
      // Add all attendees (if not the commenter)
      attendees.forEach((attendeeId: string) => {
        if (attendeeId !== authorId) {
          usersToNotify.add(attendeeId);
        }
      });

      // Notify all users (organizer + attendees, excluding the commenter)
      const notificationPromises = Array.from(usersToNotify).map(async (userId: string) => {
          try {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (!userDoc.exists()) return;

            const userData = userDoc.data();

            // Create notification in the same format as notifyGroupMembers
            const notification = {
              id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
              title: proposalTitle,
              body: `${authorName} commented: ${content.substring(0, 100)}${content.length > 100 ? "..." : ""}`,
              data: {
                type: "proposal_comment",
                groupId: groupId,
                proposalId: proposalId,
                commentId: commentRef.id,
                authorId: authorId,
                authorName: authorName,
              },
              timestamp: new Date(),
              read: false,
            };

            // Add notification to user's notifications array
            await updateDoc(doc(db, "users", userId), {
              notifications: arrayUnion(notification),
            });

            // Send push notification if enabled
            // Check for 'activities' (new) or 'events' (legacy) field for backwards compatibility
            if (
              userData.expoPushToken &&
              userData.notificationPreferences?.notificationsEnabled &&
              (userData.notificationPreferences?.activities ||
                userData.notificationPreferences?.events)
            ) {
              const pushPayload = {
                to: userData.expoPushToken,
                title: proposalTitle,
                body: `${authorName} commented: ${content.substring(0, 100)}${content.length > 100 ? "..." : ""}`,
                sound: "default",
                priority: "high",
                data: {
                  type: "proposal_comment",
                  groupId: groupId,
                  proposalId: proposalId,
                  commentId: commentRef.id,
                  authorId: authorId,
                  authorName: authorName,
                },
              };

              try {
                console.log(
                  "📤 Sending proposal comment push notification to:",
                  userData.expoPushToken?.substring(0, 20) + "...",
                );
                const response = await fetch(
                  "https://exp.host/--/api/v2/push/send",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Accept: "application/json",
                      "Accept-encoding": "gzip, deflate",
                    },
                    body: JSON.stringify(pushPayload),
                  },
                );

                if (!response.ok) {
                  console.error(
                    "❌ Push notification failed with status:",
                    response.status,
                  );
                  const errorText = await response.text();
                  console.error("Error details:", errorText);
                } else {
                  console.log(
                    "✅ Push notification sent successfully for comment",
                  );
                }
              } catch (pushError) {
                console.error("Error sending push notification:", pushError);
              }
            }
          } catch (error) {
            console.error(`Error notifying user ${userId}:`, error);
          }
        });

      // Send all notifications in parallel (but don't wait for them to complete)
      Promise.all(notificationPromises).catch((err) =>
        console.error("Error sending notifications:", err),
      );

      return commentRef.id;
    } catch (err) {
      console.error("Error adding comment:", err);
      setError("Failed to add comment");
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get comments for a proposal
   */
  const getProposalComments = async (
    groupId: string,
    proposalId: string,
  ): Promise<any[]> => {
    setLoading(true);
    setError(null);

    try {
      const commentsQuery = query(
        collection(
          db,
          "groups",
          groupId,
          "eventProposals",
          proposalId,
          "comments",
        ),
        orderBy("createdAt", "asc"),
      );

      const snapshot = await getDocs(commentsQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (err) {
      console.error("Error fetching comments:", err);
      setError("Failed to fetch comments");
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update proposal status
   */
  const updateProposalStatus = async (
    groupId: string,
    proposalId: string,
    status: "active" | "confirmed" | "cancelled" | "expired" | "completed",
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Get proposal and group data if confirming
      if (status === "confirmed") {
        const proposalDoc = await getDoc(
          doc(db, "groups", groupId, "eventProposals", proposalId),
        );
        const groupDoc = await getDoc(doc(db, "groups", groupId));

        if (proposalDoc.exists() && groupDoc.exists()) {
          const proposalData = proposalDoc.data();
          const groupData = groupDoc.data();
          const groupName = groupData.name;
          const members = groupData.members || [];
          const proposalTitle = proposalData.title || "event";

          // Update status
          await updateDoc(
            doc(db, "groups", groupId, "eventProposals", proposalId),
            {
              status,
              updatedAt: serverTimestamp(),
            },
          );

          // Notify all group members about the confirmed event
          await notifyGroupMembers(groupId, members, [], {
            type: "proposal_confirmed",
            message: `Event confirmed in ${groupName}: ${proposalTitle}`,
            actorId: proposalData.authorId,
            actorName: proposalData.authorName,
            groupName: groupName,
          });
        } else {
          // Just update status if data not found
          await updateDoc(
            doc(db, "groups", groupId, "eventProposals", proposalId),
            {
              status,
              updatedAt: serverTimestamp(),
            },
          );
        }
      } else {
        // For other statuses, just update
        await updateDoc(
          doc(db, "groups", groupId, "eventProposals", proposalId),
          {
            status,
            updatedAt: serverTimestamp(),
          },
        );
      }

      return true;
    } catch (err) {
      console.error("Error updating status:", err);
      setError("Failed to update status");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle favorite on a proposal
   */
  const toggleProposalFavorite = async (
    groupId: string,
    proposalId: string,
    userId: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const proposalRef = doc(
        db,
        "groups",
        groupId,
        "eventProposals",
        proposalId,
      );
      const proposalDoc = await getDoc(proposalRef);

      if (!proposalDoc.exists()) {
        setError("Proposal not found");
        return false;
      }

      const proposal = proposalDoc.data();
      const favorites = proposal.favorites || [];
      const hasFavorited = favorites.includes(userId);

      if (hasFavorited) {
        // Unfavorite
        await updateDoc(proposalRef, {
          favorites: arrayRemove(userId),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Favorite
        await updateDoc(proposalRef, {
          favorites: arrayUnion(userId),
          updatedAt: serverTimestamp(),
        });
      }

      return true;
    } catch (err) {
      console.error("Error toggling proposal favorite:", err);
      setError("Failed to update favorite");
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a proposal (only by creator, organizer, or admin)
   */
  const deleteProposal = async (
    groupId: string,
    proposalId: string,
    userId: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Fetch proposal to get authorId
      const proposalDoc = await getDoc(
        doc(db, "groups", groupId, "eventProposals", proposalId),
      );
      if (!proposalDoc.exists()) {
        setError("Proposal not found");
        return false;
      }

      const proposalData = proposalDoc.data();
      const proposalAuthorId = proposalData.authorId;

      // Fetch group to check organizer status
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      if (!groupDoc.exists()) {
        setError("Group not found");
        return false;
      }

      const groupData = groupDoc.data();
      const organizers = groupData.organizers || [];

      // Check permissions: user must be the creator, an organizer, or an admin
      const isProposalCreator = proposalAuthorId === userId;
      const isGroupOrganizer = organizers.includes(userId);
      const isUserAdmin = isAdmin(userId);

      if (!isProposalCreator && !isGroupOrganizer && !isUserAdmin) {
        setError("Unauthorized: Only the proposal creator, group organizers, or admins can delete proposals");
        return false;
      }

      const batch = writeBatch(db);

      // Delete proposal
      batch.delete(doc(db, "groups", groupId, "eventProposals", proposalId));

      // Delete all comments
      const commentsQuery = query(
        collection(
          db,
          "groups",
          groupId,
          "eventProposals",
          proposalId,
          "comments",
        ),
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      commentsSnapshot.docs.forEach((commentDoc) => {
        batch.delete(commentDoc.ref);
      });

      await batch.commit();
      return true;
    } catch (err) {
      console.error("Error deleting proposal:", err);
      setError("Failed to delete proposal");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    getGroups,
    getGroup,
    getUserGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    joinGroup,
    leaveGroup,
    inviteToGroup,
    acceptGroupInvite,
    approveJoinRequest,
    rejectJoinRequest,
    cancelJoinRequest,
    promoteToOrganizer,
    removeMember,
    transferAdmin,
    getGroupMembers,
    getJoinRequests,
    getUserInvites,
    createGroupChat,
    createPost,
    getPosts,
    deletePost,
    togglePostLike,
    togglePostFavorite,
    addComment,
    getComments,
    deleteComment,
    createProposal,
    voteOnProposal,
    getProposals,
    addProposalComment,
    getProposalComments,
    updateProposalStatus,
    deleteProposal,
    toggleProposalFavorite,
  };
};

export default useGroups;
