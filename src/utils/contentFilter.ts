// Content filter for user input validation
// This file contains sensitive content that should be filtered from user input

const FILTERED_WORDS = {
  selfHarm: [
    'suicide', 'depressed', 'kill myself', 'end it all', 'nobody loves me', 
    'can\'t go on', 'worthless', 'I want to die', 'no reason to live', 'jump off', 
    'overdose', 'slit wrists', 'cut myself', 'I hate myself'
  ],
  drugs: [
    'marijuana', 'pot', 'cocaine', 'coke', 'molly', 'mdma', 'lsd', 'acid', 
    'shrooms', 'heroin', 'meth', 'crack', 'xanax', 'xan', 'perk', 'perc', 'oxy', 
    'fentanyl', 'lean', 'drank', 'purple drank', 'ketamine', 'ket', 'high', 'stoned', 
    'baked', 'zooted', 'lit', 'buzzed', 'crossfaded', 'drunk', 'wasted'
  ]
};

// Function to check if text contains any filtered words
export const containsFilteredContent = (text: string): boolean => {
  if (!text) return false;
  
  const normalizedText = text.toLowerCase();
  
  // Check all categories
  for (const category of Object.values(FILTERED_WORDS)) {
    for (const word of category) {
      // Check for exact word matches and word boundaries
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      if (regex.test(normalizedText)) {
        return true;
      }
    }
  }
  
  return false;
};

// Function to get the category of filtered content
export const getFilteredContentCategory = (text: string): string | null => {
  if (!text) return null;
  
  const normalizedText = text.toLowerCase();
  
  for (const [category, words] of Object.entries(FILTERED_WORDS)) {
    for (const word of words) {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      if (regex.test(normalizedText)) {
        return category;
      }
    }
  }
  
  return null;
};

// Function to sanitize text by removing filtered words
export const sanitizeText = (text: string): string => {
  if (!text) return text;
  
  let sanitizedText = text;
  
  for (const category of Object.values(FILTERED_WORDS)) {
    for (const word of category) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      sanitizedText = sanitizedText.replace(regex, '*'.repeat(word.length));
    }
  }
  
  return sanitizedText;
}; 