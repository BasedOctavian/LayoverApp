import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Group } from '../../types/groupTypes';
import { scaleFontSize, scaleHeight, scaleWidth, moderateScale, spacing, borderRadius } from '../../utils/responsive';

interface GroupHeaderProps {
  group: Group;
  isMember: boolean;
  isOrganizer: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onEdit?: () => void;
  onShare: () => void;
  theme: 'light' | 'dark';
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GroupHeader: React.FC<GroupHeaderProps> = ({
  group,
  isMember,
  isOrganizer,
  onJoin,
  onLeave,
  onEdit,
  onShare,
  theme,
}) => {
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
    <View style={styles.container}>
      {/* Cover Image */}
      {group.coverImage ? (
        <Image
          source={{ uri: group.coverImage }}
          style={styles.coverImage}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={['#37a4c8', '#2d8aa8']}
          style={styles.coverGradient}
        />
      )}

      {/* Group Info Overlay */}
      <View style={styles.infoContainer}>
        {/* Group Avatar */}
        <View style={[styles.avatarContainer, {
          borderColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
        }]}>
          {group.groupImage ? (
            <Image
              source={{ uri: group.groupImage }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.avatarPlaceholder, {
              backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.15)',
            }]}>
              <MaterialIcons
                name={getCategoryIcon(group.category)}
                size={moderateScale(48)}
                color="#37a4c8"
              />
            </View>
          )}
        </View>

        {/* Group Name and Category */}
        <View style={styles.nameContainer}>
          <Text style={[styles.groupName, {
            color: theme === 'light' ? '#1e293b' : '#f1f5f9',
          }]}>
            {group.name}
          </Text>
          
          <View style={styles.metaRow}>
            <View style={[styles.categoryBadge, {
              backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.2)',
            }]}>
              <MaterialIcons
                name={getCategoryIcon(group.category)}
                size={14}
                color="#37a4c8"
              />
              <Text style={styles.categoryText}>
                {group.category}
              </Text>
            </View>

            {group.isPrivate && (
              <View style={[styles.privateBadge, {
                backgroundColor: theme === 'light' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.2)',
              }]}>
                <MaterialIcons name="lock" size={14} color="#ef4444" />
                <Text style={[styles.privateText, { color: '#ef4444' }]}>
                  Private
                </Text>
              </View>
            )}
          </View>

          {/* Member Count and Location */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <MaterialIcons
                name="people"
                size={16}
                color={theme === 'light' ? '#64748b' : '#94a3b8'}
              />
              <Text style={[styles.statText, {
                color: theme === 'light' ? '#64748b' : '#94a3b8',
              }]}>
                {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
              </Text>
            </View>

            {group.location && (
              <View style={styles.stat}>
                <MaterialIcons
                  name="location-on"
                  size={16}
                  color={theme === 'light' ? '#64748b' : '#94a3b8'}
                />
                <Text style={[styles.statText, {
                  color: theme === 'light' ? '#64748b' : '#94a3b8',
                }]}>
                  {group.location}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {isMember ? (
            <View style={styles.memberActions}>
              {isOrganizer && onEdit && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton, {
                    backgroundColor: theme === 'light' ? '#37a4c8' : '#1a3a42',
                    borderColor: '#37a4c8',
                  }]}
                  onPress={onEdit}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name="edit"
                    size={20}
                    color={theme === 'light' ? '#ffffff' : '#37a4c8'}
                  />
                  <Text style={[styles.actionButtonText, {
                    color: theme === 'light' ? '#ffffff' : '#37a4c8',
                  }]}>
                    Edit
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.actionButton, styles.leaveButton, {
                  backgroundColor: theme === 'light' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.2)',
                  borderColor: '#ef4444',
                }]}
                onPress={onLeave}
                activeOpacity={0.8}
              >
                <MaterialIcons name="exit-to-app" size={20} color="#ef4444" />
                <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>
                  Leave
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.joinButton, {
                backgroundColor: theme === 'light' ? '#37a4c8' : '#1a3a42',
                borderColor: '#37a4c8',
              }]}
              onPress={onJoin}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={group.requiresApproval ? 'person-add' : 'check-circle'}
                size={20}
                color={theme === 'light' ? '#ffffff' : '#37a4c8'}
              />
              <Text style={[styles.joinButtonText, {
                color: theme === 'light' ? '#ffffff' : '#37a4c8',
              }]}>
                {group.requiresApproval ? 'Request to Join' : 'Join Group'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.shareButton, {
              backgroundColor: theme === 'light' ? '#f8f9fa' : '#1a1a1a',
              borderColor: theme === 'light' ? '#e2e8f0' : '#334155',
            }]}
            onPress={onShare}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="share"
              size={20}
              color={theme === 'light' ? '#64748b' : '#94a3b8'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  coverImage: {
    width: '100%',
    height: scaleHeight(200),
  },
  coverGradient: {
    width: '100%',
    height: scaleHeight(200),
  },
  infoContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    marginTop: scaleHeight(-40),
  },
  avatarContainer: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    borderWidth: 4,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(50),
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(50),
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameContainer: {
    marginTop: spacing.md,
  },
  groupName: {
    fontSize: scaleFontSize(24),
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  categoryText: {
    fontSize: scaleFontSize(12),
    fontWeight: '600',
    color: '#37a4c8',
    textTransform: 'capitalize',
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  privateText: {
    fontSize: scaleFontSize(12),
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  memberActions: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
  },
  editButton: {},
  leaveButton: {},
  actionButtonText: {
    fontSize: scaleFontSize(14),
    fontWeight: '700',
  },
  joinButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
  },
  joinButtonText: {
    fontSize: scaleFontSize(14),
    fontWeight: '700',
  },
  shareButton: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GroupHeader;

