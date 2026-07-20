export interface KeyConcept {
  term: string;
  definition: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Milestone {
  title: string;
  summary: string;
  difficulty: "Easy" | "Medium" | "Hard";
  keyConcepts: KeyConcept[];
  quizQuestions: QuizQuestion[];
}

export interface BookCourse {
  id: string;
  title: string;
  description: string;
  milestones: Milestone[];
  isCustom?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface UserProgress {
  bookId: string;
  completedMilestones: number[]; // Array of indices (0 to 4) that are completed
  quizScores: Record<number, number>; // Maps milestone index to score percentage (0-100)
  chats: Record<number, ChatMessage[]>; // Maps milestone index to message history
}
