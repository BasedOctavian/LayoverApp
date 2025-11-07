/**
 * Validates email format with comprehensive checks
 */
export const validateEmail = (email: string): { isValid: boolean; message: string } => {
  if (!email || email.trim().length === 0) {
    return { isValid: false, message: 'Email address is required' };
  }

  const trimmedEmail = email.trim();

  // RFC 5322 compliant regex (simplified but comprehensive)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }

  // Additional checks
  if (trimmedEmail.length > 320) {
    return { isValid: false, message: 'Email address is too long' };
  }

  const [localPart, domain] = trimmedEmail.split('@');

  if (localPart.length > 64) {
    return { isValid: false, message: 'Email address is invalid' };
  }

  if (!domain || domain.length === 0) {
    return { isValid: false, message: 'Email address must include a domain (e.g., @gmail.com)' };
  }

  // Check for valid TLD
  const domainParts = domain.split('.');
  if (domainParts.length < 2 || domainParts[domainParts.length - 1].length < 2) {
    return { isValid: false, message: 'Email address must have a valid domain' };
  }

  return { isValid: true, message: 'Valid email address' };
};

/**
 * Normalizes email address (lowercase, trim)
 */
export const normalizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

/**
 * Checks for disposable/temporary email providers
 * (Add more as needed for your use case)
 */
export const isDisposableEmail = (email: string): boolean => {
  const disposableDomains = [
    'tempmail.com',
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
    'throwaway.email',
    'temp-mail.org',
    'yopmail.com',
    'sharklasers.com',
    'dispostable.com',
    'maildrop.cc',
    'fakeinbox.com',
    'tempinbox.com',
    'emailondeck.com',
    'tempmail.net',
    'trashmail.com',
    'trashmail.net',
    'wegwerfmail.de',
    'jetable.org',
    'spamgourmet.com',
    'mytemp.email',
    'getnada.com',
    'temp-mail.io',
    'tempmail.ninja',
    'emailfake.com',
    'tempmail.plus',
    'burnermail.io',
    'tempmailo.com',
    'emailtemp.org',
    'tempmailgen.com',
    'tempmail.dev'
  ];

  const domain = email.split('@')[1]?.toLowerCase();
  return disposableDomains.includes(domain);
};
