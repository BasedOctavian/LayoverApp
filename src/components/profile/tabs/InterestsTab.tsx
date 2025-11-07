import React from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface UserData {
  connectionIntents?: string[];
  personalTags?: string[];
  eventPreferences?: {
    likesBars: boolean;
    prefersSmallGroups: boolean;
    prefersWeekendEvents: boolean;
    prefersEveningEvents: boolean;
    prefersIndoorVenues: boolean;
    prefersStructuredActivities: boolean;
    prefersSpontaneousPlans: boolean;
    prefersLocalMeetups: boolean;
    prefersTravelEvents: boolean;
    prefersQuietEnvironments: boolean;
    prefersActiveLifestyles: boolean;
    prefersIntellectualDiscussions: boolean;
  };
}

interface InterestsTabProps {
  userData: UserData;
  theme: "light" | "dark";
  tabFadeAnim: Animated.Value;
  tabScaleAnim: Animated.Value;
  isOwnProfile: boolean;
  expandedSections: Set<string>;
  getSharedConnectionIntents: () => string[];
  getSharedPersonalTags: () => string[];
  getSharedEventPreferences: () => string[];
  isSharedItem: (item: string, type: 'connectionIntents' | 'personalTags' | 'eventPreferences') => boolean;
  shouldShowExpandButton: (items: any[], maxItems?: number) => boolean;
  getVisibleItems: (items: any[], maxItems?: number) => any[];
  getHiddenItems: (items: any[], maxItems?: number) => any[];
  isSectionExpanded: (sectionId: string) => boolean;
  toggleSection: (sectionId: string) => void;
}

const InterestsTab: React.FC<InterestsTabProps> = ({
  userData,
  theme,
  tabFadeAnim,
  tabScaleAnim,
  isOwnProfile,
  expandedSections,
  getSharedConnectionIntents,
  getSharedPersonalTags,
  getSharedEventPreferences,
  isSharedItem,
  shouldShowExpandButton,
  getVisibleItems,
  getHiddenItems,
  isSectionExpanded,
  toggleSection,
}) => {
  const renderConnectionIntents = () => {
    if (!userData.connectionIntents || userData.connectionIntents.length === 0) return null;

    return (
      <View style={[styles.card, styles.connectionIntentsCard, { 
        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
        borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
        shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
        shadowOpacity: theme === "light" ? 0.2 : 0.1,
      }]}>
        <View style={styles.intentHeader}>
          <MaterialIcons name="people" size={24} color="#37a4c8" style={styles.headerIcon} />
          <Text style={[styles.cardTitle, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>Looking to Connect</Text>
          <Text style={[styles.itemCount, { color: theme === "light" ? "#666666" : "#999999" }]}>
            {userData.connectionIntents.length}
          </Text>
        </View>
        <Text style={[styles.cardSubtitle, { color: theme === "light" ? "#666666" : "#999999" }]}>
          Interested in networking around these topics
        </Text>
        
        {/* Show shared connection intents count if any */}
        {!isOwnProfile && getSharedConnectionIntents().length > 0 && (
          <View style={[styles.sharedItemsIndicator, { 
            backgroundColor: theme === "light" ? "rgba(76, 175, 80, 0.1)" : "rgba(76, 175, 80, 0.2)",
            borderColor: "#4CAF50",
          }]}>
            <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
            <Text style={[styles.sharedItemsText, { color: "#4CAF50" }]}>
              {getSharedConnectionIntents().length} shared interest{getSharedConnectionIntents().length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
        
        <View style={styles.tagsContainer}>
          {getVisibleItems(userData.connectionIntents, 6).map((intent, index) => {
            const isShared = isSharedItem(intent, 'connectionIntents');
            return (
              <View key={index} style={[styles.tag, styles.intentTag, { 
                backgroundColor: isShared 
                  ? (theme === "light" ? "rgba(76, 175, 80, 0.15)" : "rgba(76, 175, 80, 0.25)")
                  : (theme === "light" ? "rgba(55, 164, 200, 0.12)" : "rgba(55, 164, 200, 0.2)"),
                borderColor: isShared 
                  ? "#4CAF50" 
                  : (theme === "light" ? "rgba(55, 164, 200, 0.4)" : "#37a4c8"),
                shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "transparent",
                shadowOpacity: theme === "light" ? 0.15 : 0,
              }]}>
                <MaterialIcons 
                  name={isShared ? "check-circle" : "handshake"} 
                  size={16} 
                  color={isShared ? "#4CAF50" : "#37a4c8"} 
                  style={styles.tagIcon} 
                />
                <Text style={[styles.tagText, { 
                  color: theme === "light" ? "#0F172A" : "#ffffff",
                  fontWeight: isShared ? '700' : '600'
                }]}>{intent}</Text>
                {isShared && (
                  <MaterialIcons name="star" size={12} color="#4CAF50" style={styles.sharedStar} />
                )}
              </View>
            );
          })}
          
          {/* Hidden items when expanded */}
          {isSectionExpanded('connectionIntents') && getHiddenItems(userData.connectionIntents, 6).map((intent, index) => {
            const isShared = isSharedItem(intent, 'connectionIntents');
            return (
              <View key={`hidden-${index}`} style={[styles.tag, styles.intentTag, { 
                backgroundColor: isShared 
                  ? (theme === "light" ? "rgba(76, 175, 80, 0.15)" : "rgba(76, 175, 80, 0.25)")
                  : (theme === "light" ? "rgba(55, 164, 200, 0.12)" : "rgba(55, 164, 200, 0.2)"),
                borderColor: isShared 
                  ? "#4CAF50" 
                  : (theme === "light" ? "rgba(55, 164, 200, 0.4)" : "#37a4c8"),
                shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "transparent",
                shadowOpacity: theme === "light" ? 0.15 : 0,
              }]}>
                <MaterialIcons 
                  name={isShared ? "check-circle" : "handshake"} 
                  size={16} 
                  color={isShared ? "#4CAF50" : "#37a4c8"} 
                  style={styles.tagIcon} 
                />
                <Text style={[styles.tagText, { 
                  color: theme === "light" ? "#0F172A" : "#ffffff",
                  fontWeight: isShared ? '700' : '600'
                }]}>{intent}</Text>
                {isShared && (
                  <MaterialIcons name="star" size={12} color="#4CAF50" style={styles.sharedStar} />
                )}
              </View>
            );
          })}
        </View>
        
        {/* Expand/Collapse Button */}
        {shouldShowExpandButton(userData.connectionIntents, 6) && (
          <TouchableOpacity
            style={[styles.expandButton, { 
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(55, 164, 200, 0.15)",
              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
            }]}
            onPress={() => toggleSection('connectionIntents')}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name={isSectionExpanded('connectionIntents') ? "expand-less" : "expand-more"} 
              size={20} 
              color="#37a4c8" 
            />
            <Text style={[styles.expandButtonText, { color: "#37a4c8" }]}>
              {isSectionExpanded('connectionIntents') 
                ? `Show Less` 
                : `Show ${getHiddenItems(userData.connectionIntents, 6).length} More`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderPersonalTags = () => {
    if (!userData.personalTags || userData.personalTags.length === 0) return null;

    return (
      <View style={[styles.card, styles.personalTagsCard, { 
        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
        borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
        shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
        shadowOpacity: theme === "light" ? 0.2 : 0.1,
      }]}>
        <View style={styles.traitHeader}>
          <MaterialIcons name="person" size={24} color="#FFC107" style={styles.headerIcon} />
          <Text style={[styles.cardTitle, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>Personal Traits</Text>
          <Text style={[styles.itemCount, { color: theme === "light" ? "#666666" : "#999999" }]}>
            {userData.personalTags.length}
          </Text>
        </View>
        
        {/* Show shared personal tags count if any */}
        {!isOwnProfile && getSharedPersonalTags().length > 0 && (
          <View style={[styles.sharedItemsIndicator, { 
            backgroundColor: theme === "light" ? "rgba(76, 175, 80, 0.1)" : "rgba(76, 175, 80, 0.2)",
            borderColor: "#4CAF50",
          }]}>
            <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
            <Text style={[styles.sharedItemsText, { color: "#4CAF50" }]}>
              {getSharedPersonalTags().length} shared trait{getSharedPersonalTags().length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
        
        <View style={styles.verticalTagsContainer}>
          {getVisibleItems(userData.personalTags, 6).map((tag, index) => {
            const isShared = isSharedItem(tag, 'personalTags');
            return (
              <View key={index} style={[styles.verticalTag, styles.traitTag, { 
                backgroundColor: isShared 
                  ? (theme === "light" ? "rgba(76, 175, 80, 0.15)" : "rgba(76, 175, 80, 0.25)")
                  : (theme === "light" ? "rgba(255, 193, 7, 0.1)" : "rgba(255, 193, 7, 0.2)"),
                borderColor: isShared 
                  ? "#4CAF50" 
                  : (theme === "light" ? "rgba(255, 193, 7, 0.4)" : "#FFC107"),
                shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "transparent",
                shadowOpacity: theme === "light" ? 0.15 : 0,
              }]}>
                <MaterialIcons 
                  name={isShared ? "check-circle" : "star"} 
                  size={16} 
                  color={isShared ? "#4CAF50" : "#FFC107"} 
                  style={styles.tagIcon} 
                />
                <Text style={[styles.verticalTagText, { 
                  color: theme === "light" ? "#0F172A" : "#ffffff",
                  fontWeight: isShared ? '700' : '600'
                }]}>{tag}</Text>
                {isShared && (
                  <MaterialIcons name="star" size={12} color="#4CAF50" style={styles.sharedStar} />
                )}
              </View>
            );
          })}
          
          {/* Hidden items when expanded */}
          {isSectionExpanded('personalTags') && getHiddenItems(userData.personalTags, 6).map((tag, index) => {
            const isShared = isSharedItem(tag, 'personalTags');
            return (
              <View key={`hidden-${index}`} style={[styles.verticalTag, styles.traitTag, { 
                backgroundColor: isShared 
                  ? (theme === "light" ? "rgba(76, 175, 80, 0.15)" : "rgba(76, 175, 80, 0.25)")
                  : (theme === "light" ? "rgba(255, 193, 7, 0.1)" : "rgba(255, 193, 7, 0.2)"),
                borderColor: isShared 
                  ? "#4CAF50" 
                  : (theme === "light" ? "rgba(255, 193, 7, 0.4)" : "#FFC107"),
                shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "transparent",
                shadowOpacity: theme === "light" ? 0.15 : 0,
              }]}>
                <MaterialIcons 
                  name={isShared ? "check-circle" : "star"} 
                  size={16} 
                  color={isShared ? "#4CAF50" : "#FFC107"} 
                  style={styles.tagIcon} 
                />
                <Text style={[styles.verticalTagText, { 
                  color: theme === "light" ? "#0F172A" : "#ffffff",
                  fontWeight: isShared ? '700' : '600'
                }]}>{tag}</Text>
                {isShared && (
                  <MaterialIcons name="star" size={12} color="#4CAF50" style={styles.sharedStar} />
                )}
              </View>
            );
          })}
        </View>
        
        {/* Expand/Collapse Button */}
        {shouldShowExpandButton(userData.personalTags, 6) && (
          <TouchableOpacity
            style={[styles.expandButton, { 
              backgroundColor: theme === "light" ? "rgba(255, 193, 7, 0.08)" : "rgba(255, 193, 7, 0.15)",
              borderColor: theme === "light" ? "rgba(255, 193, 7, 0.3)" : "#FFC107",
            }]}
            onPress={() => toggleSection('personalTags')}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name={isSectionExpanded('personalTags') ? "expand-less" : "expand-more"} 
              size={20} 
              color="#FFC107" 
            />
            <Text style={[styles.expandButtonText, { color: "#FFC107" }]}>
              {isSectionExpanded('personalTags') 
                ? `Show Less` 
                : `Show ${getHiddenItems(userData.personalTags, 6).length} More`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Animated.View style={[styles.tabContent, { opacity: tabFadeAnim, transform: [{ scale: tabScaleAnim }] }]}>
      {renderConnectionIntents()}
      {renderPersonalTags()}
      
      {/* Event Preferences - simplified for brevity */}
      {userData.eventPreferences && (
        <View style={[styles.card, styles.eventPreferencesCard, { 
          backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
          borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
          shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
          shadowOpacity: theme === "light" ? 0.2 : 0.1,
        }]}>
          <View style={styles.preferencesHeader}>
            <MaterialIcons name="event" size={24} color="#37a4c8" style={styles.headerIcon} />
            <Text style={[styles.cardTitle, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>Event Preferences</Text>
          </View>
          
          {/* Show shared event preferences count if any */}
          {!isOwnProfile && getSharedEventPreferences().length > 0 && (
            <View style={[styles.sharedItemsIndicator, { 
              backgroundColor: theme === "light" ? "rgba(76, 175, 80, 0.1)" : "rgba(76, 175, 80, 0.2)",
              borderColor: "#4CAF50",
            }]}>
              <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
              <Text style={[styles.sharedItemsText, { color: "#4CAF50" }]}>
                {getSharedEventPreferences().length} shared preference{getSharedEventPreferences().length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
          
          <View style={styles.preferencesContainer}>
            {userData.eventPreferences.likesBars && (
              <View style={[styles.preferenceItem, { 
                backgroundColor: isSharedItem('Enjoys bar meetups', 'eventPreferences')
                  ? (theme === "light" ? "rgba(76, 175, 80, 0.15)" : "rgba(76, 175, 80, 0.25)")
                  : (theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(55, 164, 200, 0.1)"),
                borderColor: isSharedItem('Enjoys bar meetups', 'eventPreferences')
                  ? "#4CAF50"
                  : (theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8"),
              }]}>
                <MaterialIcons 
                  name={isSharedItem('Enjoys bar meetups', 'eventPreferences') ? "check-circle" : "local-bar"} 
                  size={20} 
                  color={isSharedItem('Enjoys bar meetups', 'eventPreferences') ? "#4CAF50" : "#37a4c8"} 
                />
                <Text style={[styles.preferenceText, { 
                  color: theme === "light" ? "#0F172A" : "#ffffff",
                  fontWeight: isSharedItem('Enjoys bar meetups', 'eventPreferences') ? '700' : '600'
                }]}>
                  Enjoys bar meetups
                </Text>
                {isSharedItem('Enjoys bar meetups', 'eventPreferences') && (
                  <MaterialIcons name="star" size={12} color="#4CAF50" style={styles.sharedStar} />
                )}
              </View>
            )}
            {/* Add other preferences as needed */}
          </View>
        </View>
      )}
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
  connectionIntentsCard: {
    marginBottom: 20,
  },
  personalTagsCard: {
    marginBottom: 20,
  },
  eventPreferencesCard: {
    marginTop: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 18,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  intentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  traitHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  preferencesHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  headerIcon: {
    alignSelf: 'flex-start',
    marginTop: 1,
  },
  itemCount: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 'auto',
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 164, 200, 0.3)',
  },
  sharedItemsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  sharedItemsText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  verticalTagsContainer: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 12,
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
  verticalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1 }],
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOpacity: 0.15,
  },
  intentTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  traitTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  verticalTagText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    flex: 1,
  },
  tagIcon: {
    marginRight: 6,
  },
  sharedStar: {
    marginLeft: 4,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 2,
    gap: 8,
    marginTop: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  expandButtonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  preferencesContainer: {
    gap: 12,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 18,
    borderWidth: 2,
    gap: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  preferenceText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
} as any;

export default InterestsTab;

