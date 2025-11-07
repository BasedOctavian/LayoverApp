import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Group } from '../../types/groupTypes';
import { scaleFontSize, scaleHeight, scaleWidth, moderateScale, spacing, borderRadius } from '../../utils/responsive';
import { ThemeContext } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface EnrichedGroup extends Group {
  distance?: number;
  interestMatch?: number;
}

interface GroupCardProps {
  group: EnrichedGroup;
  currentUserId?: string;
}

const GroupCard: React.FC<GroupCardProps> = ({ group, currentUserId }) => {
  const router = useRouter();
  const { theme } = React.useContext(ThemeContext);

  // Check if user is member or organizer
  const isMember = currentUserId ? group.members?.includes(currentUserId) : false;
  const isOrganizer = currentUserId ? group.organizers?.includes(currentUserId) : false;

  const getCategoryIcon = (category: string): any => {
    const iconMap: Record<string, any> = {
      social: 'people',
      sports: 'fitness',
      food: 'restaurant',
      travel: 'airplane',
      arts: 'color-palette',
      music: 'musical-notes',
      tech: 'laptop',
      business: 'briefcase',
      gaming: 'game-controller',
      education: 'school',
      wellness: 'fitness',
      outdoor: 'leaf',
      photography: 'camera',
      language: 'language',
      professional: 'briefcase',
      other: 'star',
    };
    return iconMap[category] || 'star';
  };

  return (
    <TouchableOpacity
      style={[styles.card, {
        backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
        borderColor: theme === 'light' ? '#e2e8f0' : '#334155',
      }]}
      onPress={() => router.push(`/group/${group.id}`)}
      activeOpacity={0.7}
    >
      {/* Group Image */}
      <View style={styles.imageContainer}>
        {group.groupImage ? (
          <Image source={{ uri: group.groupImage }} style={styles.groupImage} />
        ) : (
          <View style={[styles.imagePlaceholder, {
            backgroundColor: theme === 'light' ? '#e0f2f7' : '#1a3a42',
          }]}>
            <MaterialIcons
              name={getCategoryIcon(group.category)}
              size={32}
              color="#37a4c8"
            />
          </View>
        )}
        
        {/* Private Badge */}
        {group.isPrivate && (
          <View style={styles.privateBadge}>
            <MaterialIcons name="lock" size={12} color="#ffffff" />
          </View>
        )}

        {/* Membership Badge */}
        {isOrganizer && (
          <View style={styles.organizerBadge}>
            <MaterialIcons name="verified" size={12} color="#ffffff" />
          </View>
        )}
        {!isOrganizer && isMember && (
          <View style={styles.memberBadge}>
            <MaterialIcons name="check-circle" size={12} color="#ffffff" />
          </View>
        )}
      </View>

      {/* Group Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.groupName, {
              color: theme === 'light' ? '#0F172A' : '#ffffff',
            }]}
            numberOfLines={1}
          >
            {group.name}
          </Text>
          {group.interestMatch !== undefined && group.interestMatch >= 50 && (
            <View style={[styles.matchBadge, {
              backgroundColor: theme === 'light' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.2)',
            }]}>
              <Ionicons name="heart" size={10} color="#22c55e" />
              <Text style={styles.matchText}>{Math.round(group.interestMatch)}%</Text>
            </View>
          )}
        </View>

        <Text
          style={[styles.description, {
            color: theme === 'light' ? '#64748b' : '#94a3b8',
          }]}
          numberOfLines={2}
        >
          {group.description}
        </Text>

        {/* Meta Info */}
        <View style={styles.metaRow}>
          <View style={[styles.categoryBadge, {
            backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.2)',
          }]}>
            <MaterialIcons
              name={getCategoryIcon(group.category)}
              size={12}
              color="#37a4c8"
            />
            <Text style={styles.categoryText}>
              {group.category}
            </Text>
          </View>

          <View style={styles.memberCount}>
            <MaterialIcons
              name="people"
              size={14}
              color={theme === 'light' ? '#64748b' : '#94a3b8'}
            />
            <Text style={[styles.memberCountText, {
              color: theme === 'light' ? '#64748b' : '#94a3b8',
            }]}>
              {group.memberCount}
            </Text>
          </View>

          {group.distance !== undefined && (
            <View style={styles.distance}>
              <MaterialIcons
                name="location-on"
                size={14}
                color="#37a4c8"
              />
              <Text style={[styles.distanceText, { color: '#37a4c8' }]}>
                {group.distance < 1 ? '< 1 mi' : `${Math.round(group.distance)} mi`}
              </Text>
            </View>
          )}

          {group.location && !group.distance && (
            <View style={styles.location}>
              <MaterialIcons
                name="location-on"
                size={14}
                color={theme === 'light' ? '#64748b' : '#94a3b8'}
              />
              <Text
                style={[styles.locationText, {
                  color: theme === 'light' ? '#64748b' : '#94a3b8',
                }]}
                numberOfLines={1}
              >
                {group.location}
              </Text>
            </View>
          )}
        </View>

        {/* Tags */}
        {group.tags && group.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {group.tags.slice(0, 3).map((tag, index) => (
              <View
                key={index}
                style={[styles.tag, {
                  backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.08)' : 'rgba(55, 164, 200, 0.15)',
                }]}
              >
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {group.tags.length > 3 && (
              <Text style={[styles.moreText, {
                color: theme === 'light' ? '#64748b' : '#94a3b8',
              }]}>
                +{group.tags.length - 3}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Arrow */}
      <View style={styles.arrowContainer}>
        <MaterialIcons
          name="chevron-right"
          size={24}
          color={theme === 'light' ? '#cbd5e1' : '#475569'}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
  },
  groupImage: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: borderRadius.lg,
  },
  imagePlaceholder: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privateBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: borderRadius.sm,
    padding: 2,
  },
  organizerBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(55, 164, 200, 0.95)',
    borderRadius: borderRadius.sm,
    padding: 2,
  },
  memberBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.95)',
    borderRadius: borderRadius.sm,
    padding: 2,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'space-between',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  groupName: {
    fontSize: scaleFontSize(16),
    fontWeight: '700',
    flex: 1,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  matchText: {
    fontSize: scaleFontSize(10),
    fontWeight: '700',
    color: '#22c55e',
  },
  description: {
    fontSize: scaleFontSize(13),
    fontWeight: '400',
    lineHeight: scaleFontSize(18),
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    fontSize: scaleFontSize(11),
    fontWeight: '600',
    color: '#37a4c8',
    textTransform: 'capitalize',
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberCountText: {
    fontSize: scaleFontSize(12),
    fontWeight: '600',
  },
  distance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  distanceText: {
    fontSize: scaleFontSize(12),
    fontWeight: '600',
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    maxWidth: scaleWidth(100),
  },
  locationText: {
    fontSize: scaleFontSize(12),
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  tagText: {
    fontSize: scaleFontSize(10),
    fontWeight: '600',
    color: '#37a4c8',
  },
  moreText: {
    fontSize: scaleFontSize(11),
    fontWeight: '600',
  },
  arrowContainer: {
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
});

export default GroupCard;

