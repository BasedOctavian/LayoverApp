/**
 * Admin Access Control Utility
 * Provides centralized admin role checking
 */

import { User } from 'firebase/auth';

// Admin user IDs - In production, use Firebase Custom Claims instead
// This is a temporary solution until custom claims are properly configured
const ADMIN_USER_IDS = [
  'hDn74gYZCdZu0efr3jMGTIWGrRQ2',
  'WhNhj8WPUpbomevJQ7j69rnLbDp2'
];

/**
 * Check if a user has admin privileges
 * @param user Firebase Auth user object or user ID string
 * @returns boolean indicating if user is an admin
 */
export const isAdmin = (user: User | string | null | undefined): boolean => {
  if (!user) return false;
  
  const userId = typeof user === 'string' ? user : user.uid;
  return ADMIN_USER_IDS.includes(userId);
};

/**
 * Check if a user has admin privileges using custom claims
 * This should be used once Firebase Custom Claims are properly configured
 * @param user Firebase Auth user object
 * @returns Promise<boolean> indicating if user is an admin
 */
export const isAdminWithCustomClaims = async (user: User | null | undefined): Promise<boolean> => {
  if (!user) return false;
  
  try {
    const tokenResult = await user.getIdTokenResult();
    return tokenResult.claims.admin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * Require admin access, throw error if not admin
 * @param user Firebase Auth user object or user ID string
 * @throws Error if user is not an admin
 */
export const requireAdmin = (user: User | string | null | undefined): void => {
  if (!isAdmin(user)) {
    throw new Error('Unauthorized: Admin access required');
  }
};

