export interface StudySession {
  id: string;
  timestamp: string;
  subject: string;
  unit: string;
  difficulty: string;
  unclearPart: string;
  responseText: string;
  citations: Citation[];
  studentSummary?: string;
  summaryFeedback?: string;
  solvedQuizzes?: {
    [key: string]: {
      studentAnswer: string;
      isCorrect?: boolean;
    };
  };
}

export interface Citation {
  title: string;
  url: string;
}

export interface Presets {
  id: string;
  subject: string;
  unit: string;
  difficulty: string;
  unclearPart: string;
  icon: string;
}
