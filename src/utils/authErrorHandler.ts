import { AuthError } from 'firebase/auth';

/**
 * Maps Firebase auth error codes to user-friendly messages
 * Covers all modern Firebase Authentication error codes
 */
export const getAuthErrorMessage = (error: AuthError): string => {
  switch (error.code) {
    // Login/Signin Errors
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password. Please try again.';
    
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support for assistance.';
    
    case 'auth/too-many-requests':
      return 'Too many unsuccessful login attempts. Please try again later or reset your password.';
    
    // Signup/Registration Errors
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in or use a different email.';
    
    case 'auth/weak-password':
      return 'Your password is too weak. Please use at least 8 characters with a mix of letters, numbers, and symbols.';
    
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Please contact support.';
    
    // Network & Connection Errors
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection and try again.';
    
    case 'auth/timeout':
      return 'The request timed out. Please check your connection and try again.';
    
    // Password Reset Errors
    case 'auth/expired-action-code':
      return 'This password reset link has expired. Please request a new one.';
    
    case 'auth/invalid-action-code':
      return 'This password reset link is invalid. Please request a new one.';
    
    // Re-authentication Errors
    case 'auth/requires-recent-login':
      return 'For security reasons, please sign in again to complete this action.';
    
    case 'auth/credential-already-in-use':
      return 'This credential is already associated with another account.';
    
    // Token & Session Errors
    case 'auth/invalid-user-token':
    case 'auth/user-token-expired':
      return 'Your session has expired. Please sign in again.';
    
    case 'auth/null-user':
      return 'No user is currently signed in. Please sign in to continue.';
    
    // Provider Errors (if using OAuth)
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with the same email but different sign-in credentials.';
    
    case 'auth/auth-domain-config-required':
    case 'auth/cancelled-popup-request':
    case 'auth/popup-blocked':
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled. Please try again.';
    
    // Quota & Limit Errors
    case 'auth/quota-exceeded':
      return 'Too many requests. Please try again later.';
    
    // Verification Errors
    case 'auth/invalid-verification-code':
      return 'The verification code is invalid. Please try again.';
    
    case 'auth/invalid-verification-id':
      return 'The verification ID is invalid. Please request a new code.';
    
    case 'auth/missing-verification-code':
      return 'Please enter the verification code.';
    
    case 'auth/missing-verification-id':
      return 'Verification ID is missing. Please request a new code.';
    
    // Permission & Configuration Errors
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for OAuth operations.';
    
    case 'auth/invalid-api-key':
    case 'auth/app-deleted':
      return 'Application configuration error. Please contact support.';
    
    case 'auth/web-storage-unsupported':
      return 'Your browser does not support local storage. Please enable it or use a different browser.';
    
    // Email Errors
    case 'auth/invalid-email-verified':
      return 'Please verify your email address before continuing.';
    
    case 'auth/email-change-needs-verification':
      return 'Please verify your new email address.';
    
    // Multi-factor Authentication Errors
    case 'auth/maximum-second-factor-count-exceeded':
      return 'Maximum number of second factors exceeded.';
    
    case 'auth/second-factor-already-in-use':
      return 'This second factor is already associated with another account.';
    
    case 'auth/unsupported-first-factor':
    case 'auth/unsupported-second-factor':
      return 'This authentication method is not supported.';
    
    // Admin & Custom Errors
    case 'auth/admin-restricted-operation':
      return 'This operation is restricted to administrators only.';
    
    case 'auth/invalid-custom-token':
    case 'auth/custom-token-mismatch':
      return 'Authentication token is invalid. Please sign in again.';
    
    // Missing Information Errors
    case 'auth/missing-email':
      return 'Please provide an email address.';
    
    case 'auth/missing-password':
      return 'Please provide a password.';
    
    case 'auth/missing-phone-number':
      return 'Please provide a phone number.';
    
    case 'auth/invalid-phone-number':
      return 'The phone number is invalid. Please check and try again.';
    
    // Default
    default:
      console.error('Unhandled auth error:', error.code, error.message);
      return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  }
};

/**
 * Extracts error category for logging/analytics
 */
export const getAuthErrorCategory = (error: AuthError): string => {
  const code = error.code;
  
  if (code.includes('network') || code.includes('timeout')) return 'network';
  if (code.includes('password')) return 'password';
  if (code.includes('email')) return 'email';
  if (code.includes('token') || code.includes('session')) return 'session';
  if (code.includes('quota') || code.includes('too-many')) return 'rate-limit';
  if (code.includes('verification')) return 'verification';
  if (code.includes('credential')) return 'credential';
  
  return 'unknown';
};
