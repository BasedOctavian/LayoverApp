import React from "react";
import { View, Text, TouchableOpacity, Animated, Linking } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

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
  theme: "light" | "dark";
  tabFadeAnim: Animated.Value;
  tabScaleAnim: Animated.Value;
  extractUsername: (url: string, platform: string) => string;
}

const SocialTab: React.FC<SocialTabProps> = ({
  userData,
  theme,
  tabFadeAnim,
  tabScaleAnim,
  extractUsername,
}) => {
  return (
    <Animated.View style={[styles.tabContent, { opacity: tabFadeAnim, transform: [{ scale: tabScaleAnim }] }]}>
      {/* Group Affiliations */}
      {userData.groupAffiliations && userData.groupAffiliations.length > 0 && (
        <View style={[styles.card, styles.groupsCard, { 
          backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
          borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
          shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
          shadowOpacity: theme === "light" ? 0.2 : 0.1,
        }]}>
          <View style={styles.groupsHeader}>
            <MaterialIcons name="groups" size={24} color="#9C27B0" style={styles.headerIcon} />
            <Text style={[styles.cardTitle, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>Groups & Affiliations</Text>
          </View>
          <View style={styles.tagsContainer}>
            {userData.groupAffiliations.map((group, index) => (
              <View key={index} style={[styles.tag, styles.groupTag, { 
                backgroundColor: theme === "light" ? "rgba(156, 39, 176, 0.1)" : "rgba(156, 39, 176, 0.2)",
                borderColor: theme === "light" ? "rgba(156, 39, 176, 0.4)" : "#9C27B0",
                shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "transparent",
                shadowOpacity: theme === "light" ? 0.15 : 0,
              }]}>
                <MaterialIcons name="verified" size={16} color="#9C27B0" style={styles.tagIcon} />
                <Text style={[styles.tagText, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>{group}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

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
                  <Text style={[styles.socialLinkText, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
                    @{extractUsername(userData.socialMedia?.instagram || '', 'instagram')}
                  </Text>
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
                  <Text style={[styles.socialLinkText, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
                    @{extractUsername(userData.socialMedia?.twitter || '', 'twitter')}
                  </Text>
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
    borderRadius: 16,
    padding: 24,
    borderWidth: 0.5,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOpacity: 0.08,
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
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    letterSpacing: -0.2,
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
    gap: 8,
    marginTop: 16,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 0.5,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
    transform: [{ scale: 1 }],
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOpacity: 0.06,
  },
  groupTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reputationTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 2,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1 }],
    shadowColor: 'rgba(0, 0, 0, 0.08)',
  },
  socialLinkText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    letterSpacing: 0.3,
  },
  noContentText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
} as any;

export default SocialTab;

