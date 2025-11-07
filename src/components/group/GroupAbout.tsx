import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Group } from '../../types/groupTypes';
import { scaleFontSize, scaleHeight, spacing, borderRadius, moderateScale } from '../../utils/responsive';

interface GroupAboutProps {
  group: Group;
  theme: 'light' | 'dark';
}

const GroupAbout: React.FC<GroupAboutProps> = ({ group, theme }) => {
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Description */}
      <View style={[styles.section, {
        backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
        borderColor: theme === 'light' ? '#e2e8f0' : '#334155',
      }]}>
        <View style={styles.sectionHeader}>
          <MaterialIcons
            name="info"
            size={20}
            color="#37a4c8"
          />
          <Text style={[styles.sectionTitle, {
            color: theme === 'light' ? '#0F172A' : '#ffffff',
          }]}>
            About
          </Text>
        </View>
        <Text style={[styles.description, {
          color: theme === 'light' ? '#475569' : '#cbd5e1',
        }]}>
          {group.description || 'No description provided.'}
        </Text>
      </View>

      {/* Tags */}
      {group.tags && group.tags.length > 0 && (
        <View style={[styles.section, {
          backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
          borderColor: theme === 'light' ? '#e2e8f0' : '#334155',
        }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="label"
              size={20}
              color="#37a4c8"
            />
            <Text style={[styles.sectionTitle, {
              color: theme === 'light' ? '#0F172A' : '#ffffff',
            }]}>
              Interests
            </Text>
          </View>
          <View style={styles.tagsContainer}>
            {group.tags.map((tag, index) => (
              <View
                key={index}
                style={[styles.tag, {
                  backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.2)',
                }]}
              >
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Rules */}
      {group.rules && (
        <View style={[styles.section, {
          backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
          borderColor: theme === 'light' ? '#e2e8f0' : '#334155',
        }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="gavel"
              size={20}
              color="#37a4c8"
            />
            <Text style={[styles.sectionTitle, {
              color: theme === 'light' ? '#0F172A' : '#ffffff',
            }]}>
              Group Rules
            </Text>
          </View>
          <Text style={[styles.rules, {
            color: theme === 'light' ? '#475569' : '#cbd5e1',
          }]}>
            {group.rules}
          </Text>
        </View>
      )}

      {/* Group Info */}
      <View style={[styles.section, {
        backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
        borderColor: theme === 'light' ? '#e2e8f0' : '#334155',
      }]}>
        <View style={styles.sectionHeader}>
          <MaterialIcons
            name="info-outline"
            size={20}
            color="#37a4c8"
          />
          <Text style={[styles.sectionTitle, {
            color: theme === 'light' ? '#0F172A' : '#ffffff',
          }]}>
            Group Information
          </Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <MaterialIcons
              name="event"
              size={18}
              color={theme === 'light' ? '#64748b' : '#94a3b8'}
            />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, {
                color: theme === 'light' ? '#64748b' : '#94a3b8',
              }]}>
                Created
              </Text>
              <Text style={[styles.infoValue, {
                color: theme === 'light' ? '#0F172A' : '#ffffff',
              }]}>
                {formatDate(group.createdAt)}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <MaterialIcons
              name="person"
              size={18}
              color={theme === 'light' ? '#64748b' : '#94a3b8'}
            />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, {
                color: theme === 'light' ? '#64748b' : '#94a3b8',
              }]}>
                Created by
              </Text>
              <Text style={[styles.infoValue, {
                color: theme === 'light' ? '#0F172A' : '#ffffff',
              }]}>
                {group.creatorName}
              </Text>
            </View>
          </View>

          {group.location && (
            <View style={styles.infoItem}>
              <MaterialIcons
                name="location-on"
                size={18}
                color={theme === 'light' ? '#64748b' : '#94a3b8'}
              />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, {
                  color: theme === 'light' ? '#64748b' : '#94a3b8',
                }]}>
                  Location
                </Text>
                <Text style={[styles.infoValue, {
                  color: theme === 'light' ? '#0F172A' : '#ffffff',
                }]}>
                  {group.location}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.infoItem}>
            <MaterialIcons
              name={group.visibility === 'public' ? 'public' : group.visibility === 'private' ? 'lock' : 'visibility-off'}
              size={18}
              color={theme === 'light' ? '#64748b' : '#94a3b8'}
            />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, {
                color: theme === 'light' ? '#64748b' : '#94a3b8',
              }]}>
                Visibility
              </Text>
              <Text style={[styles.infoValue, {
                color: theme === 'light' ? '#0F172A' : '#ffffff',
              }]}>
                {group.visibility.charAt(0).toUpperCase() + group.visibility.slice(1)}
              </Text>
            </View>
          </View>

          {group.requiresApproval && (
            <View style={styles.infoItem}>
              <MaterialIcons
                name="verified-user"
                size={18}
                color={theme === 'light' ? '#64748b' : '#94a3b8'}
              />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, {
                  color: theme === 'light' ? '#64748b' : '#94a3b8',
                }]}>
                  Membership
                </Text>
                <Text style={[styles.infoValue, {
                  color: theme === 'light' ? '#0F172A' : '#ffffff',
                }]}>
                  Approval Required
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: scaleHeight(100),
  },
  section: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '700',
  },
  description: {
    fontSize: scaleFontSize(15),
    lineHeight: scaleFontSize(24),
    fontWeight: '400',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  tagText: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: '#37a4c8',
  },
  rules: {
    fontSize: scaleFontSize(15),
    lineHeight: scaleFontSize(24),
    fontWeight: '400',
  },
  infoGrid: {
    gap: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: scaleFontSize(13),
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: scaleFontSize(15),
    fontWeight: '600',
  },
});

export default GroupAbout;

