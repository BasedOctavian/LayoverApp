export interface PasswordStrength {
  isValid: boolean;
  score: number; // 0-4
  feedback: string[];
  strength: 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong';
}

/**
 * Validates password strength with comprehensive checks
 */
export const validatePassword = (password: string): PasswordStrength => {
  const feedback: string[] = [];
  let score = 0;

  // Minimum length check
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
    return {
      isValid: false,
      score: 0,
      feedback,
      strength: 'very-weak'
    };
  }

  // Length scoring
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Character variety checks
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (hasLowerCase && hasUpperCase) score++;
  if (hasNumbers) score++;
  if (hasSpecialChars) score++;

  // Feedback for missing requirements
  if (!hasLowerCase) feedback.push('Add lowercase letters');
  if (!hasUpperCase) feedback.push('Add uppercase letters');
  if (!hasNumbers) feedback.push('Add numbers');
  if (!hasSpecialChars) feedback.push('Add special characters (!@#$%^&* etc.)');

  // Common password patterns (weak patterns)
  const commonPatterns = [
    /^(?:password|123456|qwerty|abc123|letmein|welcome|monkey|dragon)/i,
    /^(.)\1{3,}$/, // Repeated characters (aaaa, 1111)
    /^(012|123|234|345|456|567|678|789)+/, // Sequential numbers
    /^(abc|bcd|cde|def|efg|fgh)+/i // Sequential letters
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      feedback.push('Avoid common words and patterns');
      score = Math.max(0, score - 2);
      break;
    }
  }

  // Determine strength
  let strength: PasswordStrength['strength'];
  if (score <= 1) strength = 'very-weak';
  else if (score === 2) strength = 'weak';
  else if (score === 3) strength = 'fair';
  else if (score === 4) strength = 'strong';
  else strength = 'very-strong';

  // Minimum requirements for validity
  const isValid = score >= 3 && password.length >= 8;

  // Add positive feedback if strong
  if (isValid && feedback.length === 0) {
    feedback.push('Strong password!');
  }

  return {
    isValid,
    score,
    feedback,
    strength
  };
};

/**
 * Quick password validation (minimum requirements only)
 */
export const isPasswordValid = (password: string): { valid: boolean; message: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasLetter || !hasNumber) {
    return { valid: false, message: 'Password must contain both letters and numbers' };
  }

  if (!hasSpecialChar) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }

  return { valid: true, message: 'Password meets requirements' };
};

/**
 * Checks if passwords match
 */
export const doPasswordsMatch = (password: string, confirmPassword: string): boolean => {
  return password === confirmPassword && password.length > 0;
};
