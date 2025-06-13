import { useState, useEffect } from 'react';

const defaultMessages = [
  "Finding travelers near you...",
  "Discovering exciting connections...",
  "Matching you with fellow adventurers...",
  "Preparing your next journey...",
  "Exploring nearby airports...",
  "Loading exciting events...",
  "Almost there...",
];

export default function useLoadingMessages(customMessages?: string[]) {
  const [currentMessage, setCurrentMessage] = useState<string>(customMessages?.[0] || defaultMessages[0]);
  const messages = customMessages || defaultMessages;

  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % messages.length;
      setCurrentMessage(messages[currentIndex]);
    }, 3000); // Change message every 3 seconds

    return () => clearInterval(interval);
  }, [messages]);

  return currentMessage;
} 