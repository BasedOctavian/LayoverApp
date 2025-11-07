import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { scaleFontSize, scaleHeight, scaleWidth, moderateScale, spacing, borderRadius } from '../../utils/responsive';

interface Member {
  id: string;
  name: string;
  profilePicture?: string;
  groupRole: 'creator' | 'organizer' | 'member';
  joinedAt: any;
  moodStatus?: string;
}

interface GroupMembersListProps {
  members: Member[];
  currentUserId?: string;
  isOrganizer: boolean;
  onPromoteToOrganizer?: (userId: string) => void;
  onRemoveMember?: (userId: string) => void;
  theme: 'light' | 'dark';
}

const GroupMembersList: React.FC<GroupMembersListProps> = ({
  members,
  currentUserId,
  isOrganizer,
  onPromoteToOrganizer,
  onRemoveMember,
  theme,
}) => {
  const router = useRouter();

  const getRoleBadge = (role: string) => {
    const badges = {
      creator: { label: 'Creator', color: '#8b5cf6', icon: 'star' },
      organizer: { label: 'Organizer', color: '#3b82f6', icon: 'shield' },
      member: { label: 'Member', color: '#64748b', icon: 'person' },
    };
    return badges[role as keyof typeof badges] || badges.member;
  };

  const renderMember = ({ item }: { item: Member }) => {
    const roleBadge = getRoleBadge(item.groupRole);
    const isCurrentUser = item.id === currentUserId;

    return (
      <TouchableOpacity
        style={[styles.memberCard, {
          backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
          borderColor: theme === 'light' ? '#e2e8f0' : '#334155',
        }]}
        onPress={() => router.push(`/profile/${item.id}`)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <Image
          source={{
            uri: item.profilePicture || 'https://via.placeholder.com/150',
          }}
          style={styles.avatar}
        />

        {/* Member Info */}
        <View style={styles.memberInfo}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.memberName, {
                color: theme === 'light' ? '#0F172A' : '#ffffff',
              }]}
              numberOfLines={1}
            >
              {item.name}
              {isCurrentUser && (
                <Text style={styles.youLabel}> (You)</Text>
              )}
            </Text>
          </View>

          <View style={styles.metaRow}>
            {/* Role Badge */}
            <View style={[styles.roleBadge, { backgroundColor: `${roleBadge.color}20` }]}>
              <MaterialIcons
                name={roleBadge.icon as any}
                size={12}
                color={roleBadge.color}
              />
              <Text style={[styles.roleText, { color: roleBadge.color }]}>
                {roleBadge.label}
              </Text>
            </View>

            {/* Mood Status */}
            {item.moodStatus && (
              <View style={[styles.moodBadge, {
                backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.2)',
              }]}>
                <Text style={styles.moodText}>{item.moodStatus}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions (for organizers) */}
        {isOrganizer && !isCurrentUser && item.groupRole === 'member' && (
          <View style={styles.actions}>
            {onPromoteToOrganizer && (
              <TouchableOpacity
                style={[styles.actionButton, {
                  backgroundColor: theme === 'light' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.2)',
                }]}
                onPress={() => onPromoteToOrganizer(item.id)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="arrow-upward" size={16} color="#3b82f6" />
              </TouchableOpacity>
            )}
            
            {onRemoveMember && (
              <TouchableOpacity
                style={[styles.actionButton, {
                  backgroundColor: theme === 'light' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.2)',
                }]}
                onPress={() => onRemoveMember(item.id)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="person-remove" size={16} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Arrow */}
        <MaterialIcons
          name="chevron-right"
          size={24}
          color={theme === 'light' ? '#cbd5e1' : '#475569'}
          style={styles.arrow}
        />
      </TouchableOpacity>
    );
  };

  // Sort members: creator first, then organizers, then members
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { creator: 0, organizer: 1, member: 2 };
    return roleOrder[a.groupRole] - roleOrder[b.groupRole];
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedMembers}
        renderItem={renderMember}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: spacing.lg,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: moderateScale(25),
    backgroundColor: '#e2e8f0',
  },
  memberInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  memberName: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    flex: 1,
  },
  youLabel: {
    fontSize: scaleFontSize(14),
    fontWeight: '400',
    opacity: 0.6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.md,
  },
  roleText: {
    fontSize: scaleFontSize(11),
    fontWeight: '600',
  },
  moodBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.md,
  },
  moodText: {
    fontSize: scaleFontSize(11),
    fontWeight: '500',
    color: '#37a4c8',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  actionButton: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    marginLeft: spacing.sm,
  },
  separator: {
    height: spacing.md,
  },
});

export default GroupMembersList;

