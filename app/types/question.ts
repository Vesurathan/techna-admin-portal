export type QuestionType = 
  | "short_answer"
  | "long_answer"
  | "single_select"
  | "multi_select"
  | "true_false";

export type QuestionSource = "module" | "general";

export interface QuestionOption {
  id?: string;
  text: string;
  is_correct: boolean;
  image_url?: string | null;
  image_file?: File | null;
  order: number;
}

export interface Question {
  id: string;
  question_text: string;
  question_type: QuestionType;
  source: QuestionSource;
  module_id?: string | null;
  module?: {
    id: string;
    name: string;
  };
  category: string;
  options?: QuestionOption[];
  correct_answer?: string | null; // For short/long answer questions
  image_url?: string | null;
  difficulty?: "easy" | "medium" | "hard" | null;
  points?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface QuestionFormData {
  question_text: string;
  question_type: QuestionType;
  source: QuestionSource;
  module_id: string | null;
  category: string;
  options: QuestionOption[];
  correct_answer: string | null;
  image_file: File | null;
  image_url: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  points: number | null;
}

export interface QuestionCategory {
  id: string;
  name: string;
  module_id?: string | null;
  source: QuestionSource;
  question_count?: number;
}
