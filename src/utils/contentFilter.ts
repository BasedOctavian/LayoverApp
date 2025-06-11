// Content filter for user input validation
// This file contains sensitive content that should be filtered from user input

const FILTERED_WORDS = {
  hateSpeech: [
    'nazi', 'hitler', 'swastika', 'heil', 'white power', 'white pride', 'skinhead', 
    '1488', '14 words', 'gas the jews', 'racial slurs', 'blackface', 'monkey', 'ape', 
    'jew', 'sandnigger', 'fag', 'tranny', 'gay'
  ],
  selfHarm: [
    'suicide', 'depressed', 'kill myself', 'end it all', 'nobody loves me', 
    'can\'t go on', 'worthless', 'I want to die', 'no reason to live', 'jump off', 
    'overdose', 'slit wrists', 'cut myself', 'I hate myself'
  ],
  violence: [
    'kill', 'murder', 'shoot', 'stab', 'bomb', 'explode', 'blow up', 'terrorist', 
    'terrorism', 'jihad', 'massacre', 'rape', 'r*pe', 'blood', 'death', 'die', 
    'decapitate', 'slaughter', 'mutilate', 'beat', 'abuse', 'torture', 'execute', 
    'suicide', 'self harm', 'harm', 'hanging', 'cut myself'
  ],
  drugs: [
    'weed', 'marijuana', 'pot', 'cocaine', 'coke', 'molly', 'mdma', 'lsd', 'acid', 
    'shrooms', 'heroin', 'meth', 'crack', 'xanax', 'xan', 'perk', 'perc', 'oxy', 
    'fentanyl', 'lean', 'drank', 'purple drank', 'ketamine', 'ket', 'high', 'stoned', 
    'baked', 'zooted', 'lit', 'buzzed', 'crossfaded', 'drunk', 'wasted'
  ],
  profanity: [
    'fuck', 'shit', 'bitch', 'asshole', 'damn', 'bastard', 'cunt', 'whore', 'slut', 
    'prick', 'dickhead', 'cocksucker', 'motherfucker', 'sonofabitch', 'douche', 
    'f*ggot', 'retard', 'nigger', 'nigga', 'chink', 'spic', 'kike', 'cracker', 
    'twat', 'tits', 'goddamn', 'hell', 'kill yourself', 'kys', 'die', 'go to hell'
  ],
  sexual: [
    'sex', 'sexual', 'sexy', 'nude', 'nudes', 'tits', 'boobs', 'breasts', 'pussy', 
    'dick', 'cock', 'cum', 'orgasm', 'bj', 'blowjob', 'handjob', 'anal', 'ass', 
    'booty', 'fuck', 'fucking', 'f*ck', 'fuk', 'fck', 'suck', 'deepthroat', 
    'gangbang', 'dildo', 'vibrator', 'fetish', 'threesome', 'porn', 'pornstar', 
    'erotic', 'horny', 'wet', 'hardon', 'erection', 'naked', 'nudez'
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