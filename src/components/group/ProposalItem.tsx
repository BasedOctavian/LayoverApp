import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import { GroupEventProposal, VoteType } from "../../types/groupTypes";
import CountdownTimer from "./CountdownTimer";
import useGroups from "../../hooks/useGroups";
import { BlurView } from "expo-blur";
import UserAvatar from "../UserAvatar";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

interface ProposalItemProps {
  proposal: GroupEventProposal;
  groupId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserProfilePicture?: string;
  isOrganizer: boolean;
  theme: string;
  onVote: (proposalId: string, voteType: VoteType) => Promise<void>;
  onDelete: (proposalId: string) => Promise<void>;
  onStatusChange: (
    proposalId: string,
    status: "confirmed" | "cancelled" | "completed",
  ) => Promise<void>;
}

export default function ProposalItem({
  proposal,
  groupId,
  currentUserId,
  currentUserName,
  currentUserProfilePicture,
  isOrganizer,
  theme,
  onVote,
  onDelete,
  onStatusChange,
}: ProposalItemProps) {
  const router = useRouter();
  const [voting, setVoting] = useState(false);
  const [isFavorited, setIsFavorited] = useState(
    proposal.favorites?.includes(currentUserId) || false,
  );
  const [showAttendees, setShowAttendees] = useState(false);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const { toggleProposalFavorite } = useGroups();

  const isAuthor = proposal.authorId === currentUserId;
  const userVote = proposal.votes.yes.includes(currentUserId)
    ? "yes"
    : proposal.votes.no.includes(currentUserId)
      ? "no"
      : null;

  // Get event date/time
  const eventDateTime = proposal.eventDateTime?.toDate
    ? proposal.eventDateTime.toDate()
    : proposal.eventDateTime
      ? new Date(proposal.eventDateTime)
      : null;

  // Handle countdown completion - automatically update status to "completed"
  const handleCountdownComplete = async () => {
    if (proposal.status === 'active' && eventDateTime) {
      const now = new Date();
      // Only update if event time has actually passed
      if (now >= eventDateTime) {
        try {
          await onStatusChange(proposal.id, 'completed');
        } catch (error) {
          console.error('Error updating proposal status to completed:', error);
        }
      }
    }
  };

  const handleProposalPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/group/proposal/${proposal.id}?groupId=${groupId}`);
  };

  const handleVote = async (voteType: VoteType) => {
    if (voting) return;
    setVoting(true);
    try {
      await onVote(proposal.id, voteType);
    } finally {
      setVoting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Proposal",
      "Are you sure you want to delete this proposal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(proposal.id),
        },
      ],
    );
  };

  const handleFavorite = async () => {
    const previousFavorited = isFavorited;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Optimistic update
    setIsFavorited(!isFavorited);

    const success = await toggleProposalFavorite(
      groupId,
      proposal.id,
      currentUserId,
    );

    if (!success) {
      // Revert on failure
      setIsFavorited(previousFavorited);
      Alert.alert("Error", "Failed to update favorite");
    }
  };

  const handleStatusChange = (
    newStatus: "confirmed" | "cancelled" | "completed",
  ) => {
    Alert.alert("Change Status", `Mark this proposal as ${newStatus}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: () => onStatusChange(proposal.id, newStatus),
      },
    ]);
  };

  const loadAttendees = async () => {
    setLoadingAttendees(true);
    try {
      const attendeeIds = proposal.votes.yes || [];
      const attendeePromises = attendeeIds.map(async (userId) => {
        try {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            return {
              id: userId,
              name: userData.name || "User",
              profilePicture: userData.profilePicture || null,
              age: userData.age,
              bio: userData.bio,
              airportCode: userData.airportCode,
            };
          }
          return null;
        } catch (error) {
          console.error("Error fetching user:", error);
          return null;
        }
      });
      const attendeeData = await Promise.all(attendeePromises);
      setAttendees(attendeeData.filter(Boolean));
    } catch (error) {
      console.error("Error loading attendees:", error);
    } finally {
      setLoadingAttendees(false);
    }
  };

  const handleShowAttendees = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    loadAttendees();
    setShowAttendees(true);
  };

  const statusColors: Record<string, string> = {
    active: "#37a4c8",
    confirmed: "#22c55e",
    cancelled: "#ef4444",
    expired: "#94a3b8",
    completed: "#8b5cf6",
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
          borderColor: theme === "light" ? "#e2e8f0" : "#334155",
        },
      ]}
      onPress={handleProposalPress}
      activeOpacity={0.95}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="poll" size={20} color="#37a4c8" />
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: `${statusColors[proposal.status]}15`,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: statusColors[proposal.status],
                },
              ]}
            >
              {proposal.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {(isAuthor || isOrganizer) && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Title & Description */}
      <Text
        style={[
          styles.title,
          {
            color: theme === "light" ? "#1e293b" : "#f1f5f9",
          },
        ]}
      >
        {proposal.title}
      </Text>

      {proposal.description && (
        <Text
          style={[
            styles.description,
            {
              color: theme === "light" ? "#64748b" : "#94a3b8",
            },
          ]}
        >
          {proposal.description}
        </Text>
      )}

      {/* Details */}
      {(proposal.proposedLocation || eventDateTime) && (
        <View style={styles.detailsContainer}>
          {proposal.proposedLocation && (
            <View style={styles.detailRow}>
              <MaterialIcons name="location-on" size={16} color="#37a4c8" />
              <Text
                style={[
                  styles.detailText,
                  {
                    color: theme === "light" ? "#64748b" : "#94a3b8",
                  },
                ]}
              >
                {proposal.proposedLocation}
              </Text>
            </View>
          )}

          {eventDateTime && (
            <View style={styles.detailRow}>
              <MaterialIcons name="event" size={16} color="#37a4c8" />
              <Text
                style={[
                  styles.detailText,
                  {
                    color: theme === "light" ? "#64748b" : "#94a3b8",
                  },
                ]}
              >
                {eventDateTime.toLocaleDateString()} at{" "}
                {eventDateTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Countdown Timer */}
      {eventDateTime && proposal.status !== "completed" && (
        <View style={styles.countdownContainer}>
          <CountdownTimer 
            targetDate={eventDateTime} 
            theme={theme} 
            onComplete={handleCountdownComplete}
          />
        </View>
      )}

      {/* Voting Section */}
      <View style={styles.votingSection}>
        <TouchableOpacity
          style={[
            styles.voteButton,
            {
              backgroundColor:
                userVote === "yes"
                  ? "#22c55e"
                  : theme === "light"
                    ? "#f8f9fa"
                    : "#1a1a1a",
              borderColor:
                userVote === "yes"
                  ? "#22c55e"
                  : theme === "light"
                    ? "#e2e8f0"
                    : "#334155",
            },
          ]}
          onPress={(e) => {
            e.stopPropagation();
            handleVote("yes");
          }}
          disabled={voting}
        >
          {voting && userVote === "yes" ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <MaterialIcons
                name="thumb-up"
                size={18}
                color={userVote === "yes" ? "#ffffff" : "#22c55e"}
              />
              <Text
                style={[
                  styles.voteCount,
                  {
                    color:
                      userVote === "yes"
                        ? "#ffffff"
                        : theme === "light"
                          ? "#1e293b"
                          : "#f1f5f9",
                  },
                ]}
              >
                {proposal.yesCount}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.voteButton,
            {
              backgroundColor:
                userVote === "no"
                  ? "#ef4444"
                  : theme === "light"
                    ? "#f8f9fa"
                    : "#1a1a1a",
              borderColor:
                userVote === "no"
                  ? "#ef4444"
                  : theme === "light"
                    ? "#e2e8f0"
                    : "#334155",
            },
          ]}
          onPress={(e) => {
            e.stopPropagation();
            handleVote("no");
          }}
          disabled={voting}
        >
          {voting && userVote === "no" ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <MaterialIcons
                name="thumb-down"
                size={18}
                color={userVote === "no" ? "#ffffff" : "#ef4444"}
              />
              <Text
                style={[
                  styles.voteCount,
                  {
                    color:
                      userVote === "no"
                        ? "#ffffff"
                        : theme === "light"
                          ? "#1e293b"
                          : "#f1f5f9",
                  },
                ]}
              >
                {proposal.noCount}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Action Row: Comments, Attendees & Favorite */}
      <View style={styles.actionRow}>
        <View style={styles.actionRowLeft}>
          <View style={styles.commentsInfo}>
            <MaterialIcons name="comment" size={18} color="#37a4c8" />
            <Text style={[styles.commentsText, { color: "#37a4c8" }]}>
              {proposal.commentCount}{" "}
              {proposal.commentCount === 1 ? "comment" : "comments"}
              {proposal.photoCount > 0 &&
                ` • ${proposal.photoCount} ${proposal.photoCount === 1 ? "photo" : "photos"}`}
            </Text>
          </View>

          {/* Attendees Button */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleShowAttendees();
            }}
            style={[
              styles.attendeesButton,
              {
                backgroundColor: theme === "light" ? "#22c55e10" : "#22c55e20",
                borderColor: theme === "light" ? "#22c55e30" : "#22c55e40",
              },
            ]}
            activeOpacity={0.7}
          >
            <MaterialIcons name="people" size={18} color="#22c55e" />
            <Text style={[styles.attendeesText, { color: "#22c55e" }]}>
              {proposal.yesCount}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            handleFavorite();
          }}
          style={styles.favoriteButton}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={isFavorited ? "bookmark" : "bookmark-border"}
            size={20}
            color={
              isFavorited
                ? "#37a4c8"
                : theme === "light"
                  ? "#64748b"
                  : "#94a3b8"
            }
          />
        </TouchableOpacity>
      </View>

      {/* Author info */}
      <View style={styles.footer}>
        <Text
          style={[
            styles.authorText,
            {
              color: theme === "light" ? "#94a3b8" : "#64748b",
            },
          ]}
        >
          Proposed by {proposal.authorName} •{" "}
          {proposal.createdAt?.toDate?.()
            ? proposal.createdAt.toDate().toLocaleDateString()
            : "Recently"}
        </Text>
      </View>

      {/* Attendees Modal */}
      <Modal
        visible={showAttendees}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAttendees(false)}
      >
        <SafeAreaView
          style={[
            styles.modalContainer,
            { backgroundColor: theme === "light" ? "#ffffff" : "#000000" },
          ]}
        >
          <LinearGradient
            colors={
              theme === "light"
                ? ["#f8f9fa", "#ffffff"]
                : ["#000000", "#1a1a1a"]
            }
            style={styles.modalGradient}
          >
            <View
              style={[
                styles.modalHeader,
                {
                  borderBottomColor:
                    theme === "light"
                      ? "rgba(55, 164, 200, 0.08)"
                      : "rgba(55, 164, 200, 0.15)",
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.modalCloseButton,
                  {
                    backgroundColor:
                      theme === "light"
                        ? "rgba(55, 164, 200, 0.06)"
                        : "rgba(55, 164, 200, 0.1)",
                  },
                ]}
                onPress={() => setShowAttendees(false)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color={theme === "light" ? "#1e293b" : "#f1f5f9"}
                />
              </TouchableOpacity>
              <Text
                style={[
                  styles.modalTitle,
                  { color: theme === "light" ? "#1e293b" : "#f1f5f9" },
                ]}
              >
                Attendees
              </Text>
              <View style={styles.modalSpacer} />
            </View>

            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {loadingAttendees ? (
                <View style={styles.modalLoadingContainer}>
                  <View
                    style={[
                      styles.modalLoadingIcon,
                      {
                        backgroundColor:
                          theme === "light"
                            ? "rgba(55, 164, 200, 0.1)"
                            : "rgba(55, 164, 200, 0.15)",
                      },
                    ]}
                  >
                    <MaterialIcons name="people" size={24} color="#37a4c8" />
                  </View>
                  <Text
                    style={[
                      styles.modalLoadingText,
                      { color: theme === "light" ? "#64748B" : "#94A3B8" },
                    ]}
                  >
                    Loading attendees...
                  </Text>
                </View>
              ) : attendees.length > 0 ? (
                <View style={styles.attendeesList}>
                  {attendees.map((attendee, index) => (
                    <TouchableOpacity
                      key={attendee.id}
                      style={[
                        styles.attendeeItem,
                        {
                          backgroundColor:
                            theme === "light" ? "#ffffff" : "#1a1a1a",
                          borderColor:
                            theme === "light"
                              ? "rgba(55, 164, 200, 0.1)"
                              : "rgba(55, 164, 200, 0.15)",
                        },
                      ]}
                      onPress={() => {
                        setShowAttendees(false);
                        router.push(`/profile/${attendee.id}`);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.attendeeHeader}>
                        <View
                          style={[
                            styles.attendeeAvatarContainer,
                            {
                              backgroundColor:
                                theme === "light"
                                  ? "rgba(55, 164, 200, 0.06)"
                                  : "rgba(55, 164, 200, 0.1)",
                            },
                          ]}
                        >
                          <UserAvatar
                            user={attendee}
                            size={44}
                            style={styles.attendeeAvatar}
                          />
                        </View>
                        <View style={styles.attendeeInfo}>
                          <View style={styles.attendeeNameRow}>
                            <Text
                              style={[
                                styles.attendeeName,
                                {
                                  color:
                                    theme === "light" ? "#1e293b" : "#f1f5f9",
                                },
                              ]}
                            >
                              {attendee.name}
                            </Text>
                            {proposal.authorId === attendee.id && (
                              <View
                                style={[
                                  styles.organizerBadge,
                                  {
                                    backgroundColor:
                                      theme === "light"
                                        ? "rgba(55, 164, 200, 0.1)"
                                        : "rgba(55, 164, 200, 0.15)",
                                    borderColor:
                                      theme === "light"
                                        ? "rgba(55, 164, 200, 0.2)"
                                        : "rgba(55, 164, 200, 0.25)",
                                  },
                                ]}
                              >
                                <MaterialIcons
                                  name="star"
                                  size={10}
                                  color="#37a4c8"
                                />
                                <Text style={styles.organizerBadgeText}>
                                  Creator
                                </Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.attendeeDetails}>
                            {attendee.age && (
                              <Text
                                style={[
                                  styles.attendeeDetail,
                                  { color: "#37a4c8" },
                                ]}
                              >
                                {attendee.age} years old
                              </Text>
                            )}
                            {attendee.age && attendee.airportCode && (
                              <View
                                style={[
                                  styles.attendeeDetailDot,
                                  {
                                    backgroundColor:
                                      theme === "light" ? "#64748B" : "#94A3B8",
                                  },
                                ]}
                              />
                            )}
                            {attendee.airportCode && (
                              <Text
                                style={[
                                  styles.attendeeDetail,
                                  { color: "#37a4c8" },
                                ]}
                              >
                                {attendee.airportCode}
                              </Text>
                            )}
                          </View>
                          {attendee.bio && (
                            <Text
                              style={[
                                styles.attendeeBio,
                                {
                                  color:
                                    theme === "light" ? "#64748B" : "#94A3B8",
                                },
                              ]}
                              numberOfLines={2}
                            >
                              {attendee.bio}
                            </Text>
                          )}
                        </View>
                        <View
                          style={[
                            styles.attendeeChevron,
                            {
                              backgroundColor:
                                theme === "light"
                                  ? "rgba(55, 164, 200, 0.06)"
                                  : "rgba(55, 164, 200, 0.1)",
                            },
                          ]}
                        >
                          <MaterialIcons
                            name="chevron-right"
                            size={16}
                            color={theme === "light" ? "#64748B" : "#94A3B8"}
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.modalEmptyContainer}>
                  <View
                    style={[
                      styles.modalEmptyIcon,
                      {
                        backgroundColor:
                          theme === "light"
                            ? "rgba(55, 164, 200, 0.1)"
                            : "rgba(55, 164, 200, 0.15)",
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="people-outline"
                      size={32}
                      color={theme === "light" ? "#64748B" : "#94A3B8"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.modalEmptyText,
                      { color: theme === "light" ? "#64748B" : "#94A3B8" },
                    ]}
                  >
                    No attendees yet
                  </Text>
                  <Text
                    style={[
                      styles.modalEmptySubtext,
                      { color: theme === "light" ? "#94A3B8" : "#64748B" },
                    ]}
                  >
                    Be the first to vote yes!
                  </Text>
                </View>
              )}
            </ScrollView>
          </LinearGradient>
        </SafeAreaView>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  detailsContainer: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontWeight: "500",
  },
  votingSection: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  voteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  voteCount: {
    fontSize: 16,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.05)",
  },
  actionRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  commentsInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentsText: {
    fontSize: 13,
    fontWeight: "600",
  },
  attendeesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  attendeesText: {
    fontSize: 13,
    fontWeight: "700",
  },
  favoriteButton: {
    padding: 4,
    marginRight: 4,
  },
  countdownContainer: {
    marginBottom: 12,
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    marginTop: 12,
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  statusActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  statusActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  statusActionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.05)",
  },
  authorText: {
    fontSize: 12,
    fontWeight: "500",
  },
  // Attendees Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalGradient: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  modalSpacer: {
    width: 36,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  modalLoadingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalLoadingText: {
    fontSize: 16,
    fontWeight: "500",
  },
  attendeesList: {
    paddingVertical: 20,
    gap: 12,
  },
  attendeeItem: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  attendeeHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  attendeeAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  attendeeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: "600",
  },
  attendeeDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  attendeeDetail: {
    fontSize: 12,
    fontWeight: "500",
  },
  attendeeDetailDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    marginHorizontal: 6,
  },
  attendeeBio: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },
  attendeeChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  organizerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  organizerBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#37a4c8",
  },
  modalEmptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  modalEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalEmptyText: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  modalEmptySubtext: {
    fontSize: 12,
    fontWeight: "400",
    opacity: 0.7,
  },
});
