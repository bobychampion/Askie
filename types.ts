export enum ConversationStatus {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  PROCESSING = 'PROCESSING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR',
}

export interface Message {
  id: number;
  speaker: 'user' | 'ai';
  text: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
  feedback?: 'up' | 'down' | null;
}

export interface SessionRecord {
  id: number;
  mode: 'homework' | 'free-chat' | 'learning' | 'voice-to-story' | 'read-and-learn';
  timestamp: number;
  messages: Message[];
}

export interface Buddy {
  id: string;
  name: string;
  voice: string; // Corresponds to Gemini API voice names
  icon: string;
}