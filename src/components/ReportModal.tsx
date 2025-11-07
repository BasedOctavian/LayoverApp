/**
 * Report Modal Component
 * Allows users to report inappropriate content
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useReporting, ReportType, ReportableEntityType } from '../hooks/useReporting';
import useAuth from '../hooks/auth';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  entityType: ReportableEntityType;
  entityId: string;
  entityOwnerId?: string;
}

const REPORT_TYPES: Array<{ value: ReportType; label: string; icon: string }> = [
  { value: 'inappropriate_content', label: 'Inappropriate Content', icon: 'warning' },
  { value: 'harassment', label: 'Harassment or Bullying', icon: 'alert-circle' },
  { value: 'spam', label: 'Spam', icon: 'mail' },
  { value: 'fake_profile', label: 'Fake Profile', icon: 'person' },
  { value: 'scam', label: 'Scam or Fraud', icon: 'cash' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  entityType,
  entityId,
  entityOwnerId,
}) => {
  const { user } = useAuth();
  const { submitReport, blockUser, isSubmitting } = useReporting();
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [description, setDescription] = useState('');
  const [shouldBlock, setShouldBlock] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Error', 'Please select a report type');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to submit a report');
      return;
    }

    const success = await submitReport({
      reportType: selectedType,
      entityType,
      entityId,
      reporterId: user.uid,
      description: description.trim(),
      additionalInfo: {
        entityOwnerId,
      },
    });

    if (success) {
      // Block user if requested and it's a user-related entity
      if (shouldBlock && entityOwnerId && entityOwnerId !== user.uid) {
        await blockUser(user.uid, entityOwnerId);
      }

      Alert.alert(
        'Report Submitted',
        'Thank you for helping keep our community safe. We will review your report shortly.',
        [{ text: 'OK', onPress: handleClose }]
      );
    } else {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    setDescription('');
    setShouldBlock(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Report {entityType}</Text>
            <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView}>
            <Text style={styles.subtitle}>Why are you reporting this?</Text>

            {REPORT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.reportOption,
                  selectedType === type.value && styles.reportOptionSelected,
                ]}
                onPress={() => setSelectedType(type.value)}
                disabled={isSubmitting}
              >
                <Ionicons
                  name={type.icon as any}
                  size={24}
                  color={selectedType === type.value ? '#37a4c8' : '#666'}
                />
                <Text
                  style={[
                    styles.reportOptionText,
                    selectedType === type.value && styles.reportOptionTextSelected,
                  ]}
                >
                  {type.label}
                </Text>
                {selectedType === type.value && (
                  <Ionicons name="checkmark-circle" size={24} color="#37a4c8" />
                )}
              </TouchableOpacity>
            ))}

            <Text style={styles.subtitle}>Additional Details (Optional)</Text>
            <TextInput
              style={styles.textInput}
              multiline
              numberOfLines={4}
              placeholder="Provide more information about your report..."
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              editable={!isSubmitting}
            />

            {entityOwnerId && entityOwnerId !== user?.uid && (
              <TouchableOpacity
                style={styles.blockOption}
                onPress={() => setShouldBlock(!shouldBlock)}
                disabled={isSubmitting}
              >
                <View style={styles.checkbox}>
                  {shouldBlock && <Ionicons name="checkmark" size={18} color="#fff" />}
                </View>
                <Text style={styles.blockOptionText}>
                  Also block this user
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting || !selectedType}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  reportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reportOptionSelected: {
    backgroundColor: '#e8f7fb',
    borderColor: '#37a4c8',
  },
  reportOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  reportOptionTextSelected: {
    color: '#37a4c8',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  blockOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#37a4c8',
    backgroundColor: '#37a4c8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockOptionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  submitButton: {
    backgroundColor: '#37a4c8',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ReportModal;

