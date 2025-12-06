export enum Stage {
  IDLE = 'IDLE',
  OPINIONS = 'OPINIONS', // Stage 1: Initial thoughts
  REVIEWS = 'REVIEWS',   // Stage 2: Cross-examination
  CHAIRMAN = 'CHAIRMAN', // Stage 3: Final verdict
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface Persona {
  id: string;
  name: string;
  role: string;
  model: string;
  systemPrompt: string;
  color: string;
  avatar: string;
}

export interface Opinion {
  personaId: string;
  content: string;
}

export interface Review {
  reviewerId: string;
  targetId: string; // The persona being reviewed
  content: string;
}

export interface CouncilState {
  stage: Stage;
  query: string;
  opinions: Record<string, string>; // personaId -> content
  reviews: Record<string, Review[]>; // targetId -> Array of reviews about this target
  finalVerdict: string | null;
  error: string | null;
}