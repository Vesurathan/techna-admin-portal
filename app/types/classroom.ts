export interface Classroom {
  id: string;
  name: string;
  type: string;
  capacity?: number | null;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type ClassroomType = "classroom" | "hall" | "lab" | "auditorium" | "other";
