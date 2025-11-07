import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Easing,
  Keyboard,
  Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { doc, getDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../../config/firebaseConfig";
import { ThemeContext } from "../../../context/ThemeContext";
import useAuth from "../../../hooks/auth";
import useGroups from "../../../hooks/useGroups";
import useNotificationCount from "../../../hooks/useNotificationCount";
import TopBar from "../../../components/TopBar";
import {
  GroupEventProposal,
  ProposalComment,
  VoteType,
} from "../../../types/groupTypes";
import ProposalCommentItem from "../../../components/group/ProposalCommentItem";
import CountdownTimer from "../../../components/group/CountdownTimer";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../../../config/firebaseConfig";

export default function ProposalDetailScreen() {
  const params = useLocalSearchParams();
  const proposalId = Array.isArray(params.id) ? params.id[0] : params.id;
  const groupIdParam = Array.isArray(params.groupId)
    ? params.groupId[0]
    : params.groupId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = React.useContext(ThemeContext);
  const { user, userId } = useAuth();
  const notificationCount = useNotificationCount(userId);
  const {
    getProposals,
    toggleProposalFavorite,
    voteOnProposal,
    updateProposalStatus,
    deleteProposal,
    getProposalComments,
    addProposalComment,
  } = useGroups();

  const [proposal, setProposal] = useState<GroupEventProposal | null>(null);
  const [groupId, setGroupId] = useState<string>("");
  const [comments, setComments] = useState<ProposalComment[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [userVote, setUserVote] = useState<"yes" | "no" | "maybe" | null>(null);
  const [voting, setVoting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const commentInputRef = useRef<TextInput>(null);
  const contentBounceAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(0.98)).current;

  const triggerHaptic = useCallback(
    (style: "light" | "medium" | "heavy" = "light") => {
      if (Platform.OS !== "web") {
        switch (style) {
          case "light":
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case "medium":
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case "heavy":
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
        }
      }
    },
    [],
  );

  const loadProposalData = useCallback(async () => {
    if (!proposalId) return;

    try {
      const gId = groupIdParam;

      if (!gId) {
        Alert.alert("Error", "Group ID not found");
        router.back();
        return;
      }

      setGroupId(gId);

      // Get all proposals and find the one we want
      const proposals = await getProposals(gId);
      const proposalData = proposals.find((p) => p.id === proposalId);

      if (!proposalData) {
        Alert.alert("Error", "Proposal not found");
        router.back();
        return;
      }

      setProposal(proposalData);
      setIsFavorited(proposalData.favorites?.includes(userId || "") || false);

      // Get user vote
      const vote = proposalData.votes?.yes?.includes(userId || "")
        ? "yes"
        : proposalData.votes?.no?.includes(userId || "")
          ? "no"
          : proposalData.votes?.maybe?.includes(userId || "")
            ? "maybe"
            : null;
      setUserVote(vote);

      // Check if user is organizer or author
      const groupDoc = await getDoc(doc(db, "groups", gId));
      if (groupDoc.exists()) {
        const groupData = groupDoc.data();
        setIsOrganizer(groupData.organizers?.includes(userId || "") || false);
      }

      setIsAuthor(proposalData.authorId === userId);

      // Load comments
      const fetchedComments = await getProposalComments(gId, proposalId);
      setComments(fetchedComments);

      // Bounce in animation
      Animated.parallel([
        Animated.timing(contentBounceAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(contentScaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        })
      ]).start();
    } catch (error) {
      console.error("Error loading proposal:", error);
      Alert.alert("Error", "Failed to load proposal");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    proposalId,
    groupIdParam,
    userId,
    getProposals,
    getProposalComments,
    contentBounceAnim,
    contentScaleAnim,
    router,
  ]);

  useEffect(() => {
    loadProposalData();
  }, [loadProposalData]);

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardVisible(true);
        // Scroll to bottom when keyboard opens
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      },
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerHaptic("light");
    await loadProposalData();
    triggerHaptic("light");
  }, [loadProposalData, triggerHaptic]);

  const handleVote = async (voteType: VoteType) => {
    if (voting || !groupId || !proposal) return;

    setVoting(true);
    triggerHaptic("medium");

    try {
      await voteOnProposal(groupId, proposal.id, userId || "", voteType);
      await loadProposalData();
      triggerHaptic("heavy");
    } catch (error) {
      console.error("Error voting:", error);
      Alert.alert("Error", "Failed to vote");
    } finally {
      setVoting(false);
    }
  };

  const handleFavorite = async () => {
    if (!groupId || !proposal) return;

    triggerHaptic("light");

    const previousFavorited = isFavorited;

    // Optimistic update
    setIsFavorited(!isFavorited);

    const success = await toggleProposalFavorite(
      groupId,
      proposal.id,
      userId || "",
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
        onPress: async () => {
          if (!groupId || !proposal) return;
          triggerHaptic("medium");
          const success = await updateProposalStatus(
            groupId,
            proposal.id,
            newStatus,
          );
          if (success) {
            triggerHaptic("heavy");
            await loadProposalData();
          } else {
            Alert.alert("Error", "Failed to update status");
          }
        },
      },
    ]);
  };

  const handleDelete = async () => {
    if (!groupId || !proposal) return;

    Alert.alert(
      "Delete Proposal",
      "Are you sure you want to delete this proposal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!user?.uid) {
              Alert.alert("Error", "User not authenticated");
              return;
            }
            try {
              triggerHaptic("heavy");
              await deleteProposal(groupId, proposal.id, user.uid);
              Alert.alert("Success", "Proposal deleted");
              router.back();
            } catch (error) {
              console.error("Error deleting proposal:", error);
              Alert.alert("Error", "Failed to delete proposal");
            }
          },
        },
      ],
    );
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please grant camera roll permissions to add images",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `proposal-comments/${groupId}/${proposal?.id}/${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const handleSubmitComment = async () => {
    if (
      (!commentText.trim() && !selectedImage) ||
      !groupId ||
      !proposal ||
      !user
    )
      return;

    triggerHaptic("light");
    Keyboard.dismiss();
    setSubmittingComment(true);

    try {
      // Fetch user data
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      let imageUrl: string | undefined;

      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

      await addProposalComment(
        groupId,
        proposal.id,
        commentText.trim() || "📷",
        user.uid,
        userData.name || user.displayName || "Anonymous",
        userData.profilePicture || user.photoURL || undefined,
        imageUrl,
        undefined, // No video
      );

      setCommentText("");
      setSelectedImage(null);
      triggerHaptic("heavy");
      await loadProposalData();
      // Scroll to bottom to show new comment
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Error submitting comment:", error);
      Alert.alert("Error", "Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!groupId || !proposal) return;

    try {
      triggerHaptic("light");
      // Delete the comment directly from Firestore
      const commentRef = doc(
        db,
        "groups",
        groupId,
        "eventProposals",
        proposal.id,
        "comments",
        commentId,
      );
      await deleteDoc(commentRef);

      // Update comment count
      const proposalRef = doc(
        db,
        "groups",
        groupId,
        "eventProposals",
        proposal.id,
      );
      await updateDoc(proposalRef, {
        commentCount: proposal.commentCount > 0 ? proposal.commentCount - 1 : 0,
      });

      triggerHaptic("medium");
      await loadProposalData();
    } catch (error) {
      console.error("Error deleting comment:", error);
      Alert.alert("Error", "Failed to delete comment");
    }
  };

  const statusColors: Record<string, string> = {
    active: "#37a4c8",
    confirmed: "#22c55e",
    cancelled: "#ef4444",
    expired: "#94a3b8",
    completed: "#8b5cf6",
  };

  // Get event date/time
  const eventDateTime = proposal?.eventDateTime?.toDate
    ? proposal.eventDateTime.toDate()
    : proposal?.eventDateTime
      ? new Date(proposal.eventDateTime)
      : null;

  if (loading || !proposal) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: theme === "light" ? "#f8f9fa" : "#0a0a0a",
          },
        ]}
        edges={[]}
      >
        <TopBar
          showBackButton={true}
          title=""
          onBackPress={() => router.back()}
          onProfilePress={() => router.push(`/profile/${user?.uid}`)}
          notificationCount={notificationCount}
          showLogo={true}
          centerLogo={true}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: theme === "light" ? "#f8f9fa" : "#0a0a0a",
        },
      ]}
      edges={[]}
    >
      <TopBar
        showBackButton={true}
        title=""
        onBackPress={() => router.back()}
        onProfilePress={() => router.push(`/profile/${user?.uid}`)}
        notificationCount={notificationCount}
        showLogo={true}
        centerLogo={true}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <Animated.View style={[styles.content, {
          opacity: contentBounceAnim,
          transform: [
            { scale: contentScaleAnim },
            {
              translateY: contentBounceAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0]
              })
            }
          ]
        }]}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#37a4c8"
                colors={["#37a4c8"]}
              />
            }
          >
            {/* Proposal Content */}
            <View
              style={[
                styles.proposalCard,
                {
                  backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                  borderColor: theme === "light" ? "#e2e8f0" : "#334155",
                },
              ]}
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
                    onPress={handleDelete}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={20}
                      color="#ef4444"
                    />
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
                      <MaterialIcons
                        name="location-on"
                        size={16}
                        color="#37a4c8"
                      />
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
                  <CountdownTimer targetDate={eventDateTime} theme={theme} />
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
                            : "#0f0f0f",
                      borderColor:
                        userVote === "yes"
                          ? "#22c55e"
                          : theme === "light"
                            ? "#e2e8f0"
                            : "#334155",
                    },
                  ]}
                  onPress={() => handleVote("yes")}
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
                        userVote === "maybe"
                          ? "#f59e0b"
                          : theme === "light"
                            ? "#f8f9fa"
                            : "#0f0f0f",
                      borderColor:
                        userVote === "maybe"
                          ? "#f59e0b"
                          : theme === "light"
                            ? "#e2e8f0"
                            : "#334155",
                    },
                  ]}
                  onPress={() => handleVote("maybe")}
                  disabled={voting}
                >
                  {voting && userVote === "maybe" ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <MaterialIcons
                        name="help-outline"
                        size={18}
                        color={userVote === "maybe" ? "#ffffff" : "#f59e0b"}
                      />
                      <Text
                        style={[
                          styles.voteCount,
                          {
                            color:
                              userVote === "maybe"
                                ? "#ffffff"
                                : theme === "light"
                                  ? "#1e293b"
                                  : "#f1f5f9",
                          },
                        ]}
                      >
                        {proposal.maybeCount}
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
                            : "#0f0f0f",
                      borderColor:
                        userVote === "no"
                          ? "#ef4444"
                          : theme === "light"
                            ? "#e2e8f0"
                            : "#334155",
                    },
                  ]}
                  onPress={() => handleVote("no")}
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

              {/* Action Row: Comments & Favorite */}
              <View style={styles.actionRow}>
                <View style={styles.commentsInfo}>
                  <MaterialIcons name="comment" size={18} color="#37a4c8" />
                  <Text style={[styles.commentsText, { color: "#37a4c8" }]}>
                    {proposal.commentCount}{" "}
                    {proposal.commentCount === 1 ? "comment" : "comments"}
                    {proposal.photoCount > 0 &&
                      ` • ${proposal.photoCount} ${proposal.photoCount === 1 ? "photo" : "photos"}`}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleFavorite}
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

              {/* Complete Event Button (for confirmed events) */}
              {(isAuthor || isOrganizer) && proposal.status === "confirmed" && (
                <TouchableOpacity
                  style={[
                    styles.completeButton,
                    {
                      backgroundColor:
                        theme === "light" ? "#f3e8ff" : "#581c87",
                      borderColor: theme === "light" ? "#e9d5ff" : "#7c3aed",
                    },
                  ]}
                  onPress={() => handleStatusChange("completed")}
                >
                  <MaterialIcons name="done-all" size={18} color="#8b5cf6" />
                  <Text
                    style={[styles.completeButtonText, { color: "#8b5cf6" }]}
                  >
                    Mark as Completed
                  </Text>
                </TouchableOpacity>
              )}

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
            </View>

            {/* Comments Section */}
            <View style={styles.commentsSection}>
              <Text
                style={[
                  styles.commentsTitle,
                  {
                    color: theme === "light" ? "#1e293b" : "#f8fafc",
                  },
                ]}
              >
                Comments {comments.length > 0 && `(${comments.length})`}
              </Text>

              {comments.length > 0 ? (
                comments.map((comment) => (
                  <ProposalCommentItem
                    key={comment.id}
                    comment={comment}
                    currentUserId={userId || ""}
                    isOrganizer={isOrganizer}
                    onDelete={handleDeleteComment}
                    theme={theme}
                  />
                ))
              ) : (
                <View style={styles.emptyComments}>
                  <MaterialIcons
                    name="mode-comment"
                    size={40}
                    color={theme === "light" ? "#cbd5e1" : "#475569"}
                  />
                  <Text
                    style={[
                      styles.emptyCommentsText,
                      {
                        color: theme === "light" ? "#94a3b8" : "#71717a",
                      },
                    ]}
                  >
                    No comments yet
                  </Text>
                  <Text
                    style={[
                      styles.emptyCommentsSubtext,
                      {
                        color: theme === "light" ? "#cbd5e1" : "#52525b",
                      },
                    ]}
                  >
                    Be the first to share your thoughts
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Add Comment Input */}
          <View
            style={[
              styles.commentInputContainer,
              {
                backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                borderTopColor: theme === "light" ? "#e2e8f0" : "#334155",
                paddingBottom: keyboardVisible ? 6 : Math.max(12, insets.bottom), // Padding when keyboard is hidden, account for safe area
              },
            ]}
          >
            {/* Image Preview */}
            {selectedImage && (
              <View
                style={[
                  styles.imagePreview,
                  {
                    backgroundColor: theme === "light" ? "#f8f9fa" : "#0f0f0f",
                    borderColor: theme === "light" ? "#e2e8f0" : "#334155",
                  },
                ]}
              >
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => {
                    setSelectedImage(null);
                    triggerHaptic("light");
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="close" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputRow}>
              <TouchableOpacity
                style={[
                  styles.mediaButton,
                  {
                    backgroundColor:
                      theme === "light"
                        ? "rgba(55, 164, 200, 0.08)"
                        : "rgba(55, 164, 200, 0.12)",
                    borderColor:
                      theme === "light"
                        ? "rgba(55, 164, 200, 0.2)"
                        : "rgba(55, 164, 200, 0.3)",
                  },
                ]}
                onPress={() => {
                  pickImage();
                  triggerHaptic("light");
                }}
                disabled={submittingComment}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="add-photo-alternate"
                  size={24}
                  color="#37a4c8"
                />
              </TouchableOpacity>

              <View style={styles.textInputContainer}>
                <TextInput
                  ref={commentInputRef}
                  style={[
                    styles.commentInput,
                    {
                      color: theme === "light" ? "#1e293b" : "#f1f5f9",
                      backgroundColor:
                        theme === "light" ? "#f8f9fa" : "#18181b",
                      borderColor: commentText
                        ? "#37a4c8"
                        : theme === "light"
                          ? "#e2e8f0"
                          : "#334155",
                      borderWidth: commentText ? 1.5 : 1,
                    },
                  ]}
                  placeholder="Add a comment..."
                  placeholderTextColor={
                    theme === "light" ? "#94a3b8" : "#64748b"
                  }
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                  returnKeyType="default"
                  blurOnSubmit={false}
                />
              </View>

              <TouchableOpacity
                onPress={handleSubmitComment}
                disabled={
                  (!commentText.trim() && !selectedImage) || submittingComment
                }
                style={[
                  styles.submitButton,
                  {
                    backgroundColor:
                      (commentText.trim() || selectedImage) &&
                      !submittingComment
                        ? "#37a4c8"
                        : theme === "light"
                          ? "#e2e8f0"
                          : "#3f3f46",
                    opacity:
                      (commentText.trim() || selectedImage) &&
                      !submittingComment
                        ? 1
                        : 0.5,
                    shadowColor:
                      (commentText.trim() || selectedImage) &&
                      !submittingComment
                        ? "#37a4c8"
                        : "transparent",
                  },
                ]}
                activeOpacity={0.8}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <MaterialIcons name="send" size={22} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  commentsSection: {
    paddingTop: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  commentsTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 16,
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  emptyComments: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 6,
  },
  emptyCommentsText: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 4,
  },
  emptyCommentsSubtext: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  commentInputContainer: {
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 6,
    marginTop: -24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  textInputContainer: {
    flex: 1,
    justifyContent: "center",
  },
  mediaButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imagePreview: {
    position: "relative",
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
  },
  removeImageButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  commentInput: {
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  submitButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  proposalCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    margin: 16,
    marginBottom: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
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
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    lineHeight: 32,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  detailsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailText: {
    fontSize: 15,
    fontWeight: "500",
  },
  countdownContainer: {
    marginBottom: 20,
  },
  votingSection: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  voteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
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
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.05)",
  },
  commentsInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  commentsText: {
    fontSize: 14,
    fontWeight: "600",
  },
  favoriteButton: {
    padding: 4,
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.05)",
  },
  authorText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
