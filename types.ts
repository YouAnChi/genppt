export enum SlideLayout {
  GENERATIVE = 'generative' // The only layout we need now
}

export interface SlideStat {
  value: string;
  label: string;
}

export interface TimelineEvent {
  year: string;
  description: string;
}

export interface SlideData {
  id: string;
  layout: SlideLayout;
  title: string;
  subtitle?: string;
  content: string[];
  stats?: SlideStat[];
  timeline?: TimelineEvent[];
  
  // New Generative Fields
  designDirective: string; // The Art Director's vision
  htmlContent: string;     // The Designer's code
  
  imagePrompt: string;
  imageUrl?: string;
  notes?: string;
  accentColor?: string;
}

export interface Presentation {
  title: string;
  topic: string;
  slides: SlideData[];
}

// --- New Types for Two-Stage Process ---

export interface SlideOutline {
  title: string;
  purpose: string; 
  visualAdvice: string; // New: Art Director's specific visual instruction
}

export interface PresentationOutline {
  topic: string;
  title: string;
  subtitle: string;
  targetAudience: string;
  presentationGoal: string;
  tone: string;
  visualTheme: string; 
  accentColor: string;
  slides: SlideOutline[];
  researchContext: string; 
}

// ---------------------------------------

export enum AgentStatus {
  IDLE = 'idle',
  PLANNING = 'planning',
  RESEARCHING = 'researching',
  GENERATING_CONTENT = 'generating_content',
  GENERATING_IMAGES = 'generating_images',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isAgentStatus?: boolean; 
}

export interface AgentProgress {
  status: AgentStatus;
  steps: {
    label: string;
    completed: boolean;
    current: boolean;
  }[];
  logs: string[]; 
}