import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Animated, Linking, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import useGroups from "../../../hooks/useGroups";
import { Group } from "../../../types/groupTypes";

interface UserData {
  groupAffiliations?: string[];
  reputationTags?: string[];
  socialMedia?: {
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
}

interface SocialTabProps {
  userData: UserData;
  userId: string;
  theme: "light" | "dark";
  tabFadeAnim: Animated.Value;
  tabScaleAnim: Animated.Value;
  extractUsername: (url: string, platform: string) => string;
}

const SocialTab: React.FC<SocialTabProps> = ({
  userData,
  userId,
  theme,
  tabFadeAnim,
  tabScaleAnim,
  extractUsername,
}) => {
  const router = useRouter();
  const { getUserGroups } = useGroups();
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    const fetchUserGroups = async () => {
      if (userId) {
        setLoadingGroups(true);
        const groups = await getUserGroups(userId);
        setUserGroups(groups);
        setLoadingGroups(false);
      }
    };
    fetchUserGroups();
  }, [userId]);
  return (
    <Animated.View style={[styles.tabContent, { opacity: tabFadeAnim, transform: [{ scale: tabScaleAnim }] }]}>
      {/* Groups */}
      <View style={[styles.card, styles.groupsCard, { 
        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
        borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
        shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
        shadowOpacity: theme === "light" ? 0.2 : 0.1,
      }]}>
        <View style={styles.groupsHeader}>
          <MaterialIcons name="groups" size={24} color="#9C27B0" style={styles.headerIcon} />
          <Text style={[styles.cardTitle, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
            Groups {userGroups.length > 0 && `(${userGroups.length})`}
          </Text>
        </View>
        
        {loadingGroups ? (
          <View style={{alignItems: 'center', justifyContent: 'center', paddingVertical: 20}}>
            <Text style={[styles.noContentText, { color: theme === "light" ? "#94A3B8" : "#666666" }]}>
              Loading groups...
            </Text>
          </View>
        ) : userGroups.length > 0 ? (
          <View style={styles.groupsList}>
            {userGroups.map((group) => (
              <TouchableOpacity
                key={group.id}
                style={[styles.groupItem, { 
                  backgroundColor: theme === "light" ? "rgba(156, 39, 176, 0.05)" : "rgba(156, 39, 176, 0.15)",
                  borderColor: theme === "light" ? "rgba(156, 39, 176, 0.3)" : "#9C27B0",
                }]}
                onPress={() => router.push(`/group/${group.id}`)}
                activeOpacity={0.7}
              >
                {group.groupImage ? (
                  <Image source={{ uri: group.groupImage }} style={styles.groupImage} />
                ) : (
                  <View style={[styles.groupImagePlaceholder, {
                    backgroundColor: theme === "light" ? "rgba(156, 39, 176, 0.2)" : "rgba(156, 39, 176, 0.3)",
                  }]}>
                    <MaterialIcons name="groups" size={20} color="#9C27B0" />
                  </View>
                )}
                <View style={styles.groupInfo}>
                  <Text style={[styles.groupName, { color: theme === "light" ? "#0F172A" : "#ffffff" }]} numberOfLines={1}>
                    {group.name}
                  </Text>
                  <View style={styles.groupMeta}>
                    <MaterialIcons name="people" size={14} color={theme === "light" ? "#64748B" : "#94A3B8"} />
                    <Text style={[styles.groupMemberCount, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={theme === "light" ? "#cbd5e1" : "#475569"} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={{alignItems: 'center', justifyContent: 'center', paddingVertical: 32}}>
            <MaterialIcons name="groups" size={48} color={theme === "light" ? "#94A3B8" : "#666666"} style={{marginBottom: 12}} />
            <Text style={[styles.noContentText, { color: theme === "light" ? "#666666" : "#999999", fontSize: 16, fontWeight: '600' }]}>No groups yet</Text>
            <Text style={[styles.noContentText, { color: theme === "light" ? "#94A3B8" : "#666666", fontSize: 13, marginTop: 4 }]}>This user hasn't joined any groups yet.</Text>
          </View>
        )}
      </View>

      {/* Reputation Tags */}
      {userData.reputationTags && userData.reputationTags.length > 0 && (
        <View style={[styles.card, styles.reputationCard, { 
          backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
          borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
          shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
          shadowOpacity: theme === "light" ? 0.2 : 0.1,
        }]}>
          <View style={styles.reputationHeader}>
            <MaterialIcons name="emoji-events" size={24} color="#4CAF50" style={styles.headerIcon} />
            <Text style={[styles.cardTitle, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>Community Recognition</Text>
          </View>
          <View style={styles.tagsContainer}>
            {userData.reputationTags.map((tag, index) => (
              <View key={index} style={[styles.tag, styles.reputationTag, { 
                backgroundColor: theme === "light" ? "rgba(76, 175, 80, 0.1)" : "rgba(76, 175, 80, 0.2)",
                borderColor: theme === "light" ? "rgba(76, 175, 80, 0.4)" : "#4CAF50",
                shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "transparent",
                shadowOpacity: theme === "light" ? 0.15 : 0,
              }]}>
                <MaterialIcons name="star" size={16} color="#4CAF50" style={styles.tagIcon} />
                <Text style={[styles.tagText, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Social Media */}
      <View style={[styles.card, styles.socialMediaCard, { 
        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
        borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
        shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
        shadowOpacity: theme === "light" ? 0.2 : 0.1,
      }]}>
        <Text style={[styles.cardTitle, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>Social Media</Text>
        {userData.socialMedia && Object.keys(userData.socialMedia).length > 0 && (
          (userData.socialMedia.instagram || userData.socialMedia.linkedin || userData.socialMedia.twitter) ? (
            <View style={styles.socialMediaLinks}>
              {userData.socialMedia?.instagram && (
                <TouchableOpacity 
                  style={[styles.socialLink, { 
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(55, 164, 200, 0.1)",
                    borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
                    shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "transparent",
                    shadowOpacity: theme === "light" ? 0.1 : 0,
                  }]}
                  onPress={() => {
                    const username = extractUsername(userData.socialMedia?.instagram || '', 'instagram');
                    Linking.openURL(`https://instagram.com/${username}`);
                  }}
                >
                  <MaterialIcons name="photo-camera" size={24} color={theme === "light" ? "#0F172A" : "#ffffff"} />
                  <View style={styles.socialLinkContent}>
                    <Text style={[styles.socialLinkLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      Instagram
                    </Text>
                    <Text style={[styles.socialLinkText, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
                      @{extractUsername(userData.socialMedia?.instagram || '', 'instagram')}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              {userData.socialMedia?.linkedin && (
                <TouchableOpacity 
                  style={[styles.socialLink, { 
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.12)" : "rgba(55, 164, 200, 0.15)",
                    borderColor: theme === "light" ? "rgba(55, 164, 200, 0.4)" : "#37a4c8",
                    shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "transparent",
                    shadowOpacity: theme === "light" ? 0.15 : 0,
                  }]}
                  onPress={() => userData.socialMedia?.linkedin && Linking.openURL(userData.socialMedia.linkedin)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="work" size={24} color={theme === "light" ? "#0F172A" : "#ffffff"} />
                  <Text style={[styles.socialLinkText, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>LinkedIn Profile</Text>
                </TouchableOpacity>
              )}
              {userData.socialMedia?.twitter && (
                <TouchableOpacity 
                  style={[styles.socialLink, { 
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.12)" : "rgba(55, 164, 200, 0.15)",
                    borderColor: theme === "light" ? "rgba(55, 164, 200, 0.4)" : "#37a4c8",
                    shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "transparent",
                    shadowOpacity: theme === "light" ? 0.15 : 0,
                  }]}
                  onPress={() => {
                    const username = extractUsername(userData.socialMedia?.twitter || '', 'twitter');
                    Linking.openURL(`https://x.com/${username}`);
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="chat" size={24} color={theme === "light" ? "#0F172A" : "#ffffff"} />
                  <View style={styles.socialLinkContent}>
                    <Text style={[styles.socialLinkLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      X (Twitter)
                    </Text>
                    <Text style={[styles.socialLinkText, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
                      @{extractUsername(userData.socialMedia?.twitter || '', 'twitter')}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={{alignItems: 'center', justifyContent: 'center', paddingVertical: 32}}>
              <MaterialIcons name="link-off" size={48} color={theme === "light" ? "#94A3B8" : "#666666"} style={{marginBottom: 12}} />
              <Text style={[styles.noContentText, { color: theme === "light" ? "#666666" : "#999999", fontSize: 16, fontWeight: '600' }]}>No social media accounts linked</Text>
              <Text style={[styles.noContentText, { color: theme === "light" ? "#94A3B8" : "#666666", fontSize: 13, marginTop: 4 }]}>This user hasn't added any social media links yet.</Text>
            </View>
          )
        )}
      </View>
    </Animated.View>
  );
};

const styles = {
  tabContent: {
    marginTop: 16,
  },
  card: {
    borderRadius: 20,
    padding: 28,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOpacity: 0.12,
    overflow: 'hidden',
  },
  groupsCard: {
    marginBottom: 20,
  },
  reputationCard: {
    marginBottom: 20,
  },
  socialMediaCard: {
    marginBottom: 28,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 18,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  groupsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  reputationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  headerIcon: {
    alignSelf: 'flex-start',
    marginTop: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    transform: [{ scale: 1 }],
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOpacity: 0.1,
  },
  groupTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupsList: {
    gap: 12,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  groupImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  groupImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfo: {
    flex: 1,
    marginLeft: 12,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupMemberCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  reputationTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  tagIcon: {
    marginRight: 6,
  },
  socialMediaLinks: {
    gap: 16,
  },
  socialLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 26,
    borderWidth: 2.5,
    marginBottom: 18,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    transform: [{ scale: 1 }],
    shadowColor: 'rgba(0, 0, 0, 0.08)',
  },
  socialLinkContent: {
    flex: 1,
    marginLeft: 14,
  },
  socialLinkLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
    opacity: 0.8,
  },
  socialLinkText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  noContentText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
} as any;

export default SocialTab;

