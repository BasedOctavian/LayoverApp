/**
 * Content Reporting Hook
 * Allows users to report inappropriate content or behavior
 */

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import Logger from '../utils/logger';

export type ReportType = 
  | 'inappropriate_content'
  | 'harassment'
  | 'spam'
  | 'fake_profile'
  | 'scam'
  | 'other';

export type ReportableEntityType = 
  | 'user'
  | 'ping'
  | 'event'
  | 'message'
  | 'profile';

interface ReportData {
  reportType: ReportType;
  entityType: ReportableEntityType;
  entityId: string;
  reporterId: string;
  description?: string;
  additionalInfo?: Record<string, any>;
}

export const useReporting = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Submit a report
   * @param reportData Report information
   * @returns Promise that resolves when report is submitted
   */
  const submitReport = async (reportData: ReportData): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!reportData.reportType || !reportData.entityType || !reportData.entityId || !reportData.reporterId) {
        throw new Error('Missing required report information');
      }

      // Create report document
      const reportsRef = collection(db, 'reports');
      await addDoc(reportsRef, {
        ...reportData,
        status: 'pending',
        createdAt: serverTimestamp(),
        reviewedAt: null,
        reviewedBy: null,
        resolution: null,
      });

      Logger.info('Report submitted successfully', {
        reportType: reportData.reportType,
        entityType: reportData.entityType,
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit report';
      setError(errorMessage);
      Logger.error('Error submitting report', err);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Block a user
   * @param userId Current user's ID
   * @param blockedUserId ID of user to block
   * @returns Promise that resolves when user is blocked
   */
  const blockUser = async (userId: string, blockedUserId: string): Promise<boolean> => {
    try {
      if (!userId || !blockedUserId) {
        throw new Error('Invalid user IDs');
      }

      if (userId === blockedUserId) {
        throw new Error('Cannot block yourself');
      }

      const blocksRef = collection(db, 'blocks');
      await addDoc(blocksRef, {
        blockerId: userId,
        blockedUserId: blockedUserId,
        createdAt: serverTimestamp(),
      });

      Logger.info('User blocked successfully', { blockedUserId });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to block user';
      setError(errorMessage);
      Logger.error('Error blocking user', err);
      return false;
    }
  };

  return {
    submitReport,
    blockUser,
    isSubmitting,
    error,
  };
};

export default useReporting;

