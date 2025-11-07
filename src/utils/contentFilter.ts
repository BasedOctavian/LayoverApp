// Content filter for user input validation
// This file contains sensitive content that should be filtered from user input

const FILTERED_WORDS = {
  selfHarm: [
    'suicide', 'suicidal', 'kill myself', 'end it all', 'nobody loves me', 
    'can\'t go on', 'no reason to live', 'jump off', 
    'overdose', 'slit wrists', 'cut myself', 'self harm'
  ],
  drugs: [
    'marijuana', 'pot', 'weed', 'cocaine', 'coke', 'molly', 'mdma', 'lsd', 'acid', 
    'shrooms', 'heroin', 'meth', 'methamphetamine', 'crack', 'xanax', 'xan', 'perk', 'perc', 'oxy', 
    'fentanyl', 'lean', 'drank', 'purple drank', 'ketamine', 'ket', 'ecstasy',
    'buy drugs', 'sell drugs', 'drug dealer'
  ],
  profanity: [
    'fuck', 'fucking', 'fucked', 'fucker', 'shit', 'bitch', 'asshole', 'ass', 
    'damn', 'cunt', 'dick', 'cock', 'pussy', 'whore', 'slut', 'bastard',
    'motherfucker', 'nigger', 'nigga', 'fag', 'faggot', 'retard', 'retarded'
  ],
  explicit: [
    'sex', 'sexual', 'nude', 'nudes', 'naked', 'porn', 'pornography', 
    'xxx', 'hookup', 'hook up', 'one night stand', 'boobs', 'tits', 'penis',
    'vagina', 'blowjob', 'handjob', 'oral sex', 'anal', 'masturbate', 
    'horny', 'aroused', 'erection', 'orgasm', 'cum', 'semen', 'send nudes'
  ],
  harassment: [
    'kill you', 'hurt you', 'beat you', 'rape', 'assault', 'stalk', 'stalking',
    'threaten', 'i know where you live', 'find you', 'track you down'
  ],
  scams: [
    'send money', 'wire transfer', 'gift card', 'cash app', 'venmo me',
    'paypal me', 'bitcoin', 'crypto', 'investment opportunity', 'get rich quick'
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