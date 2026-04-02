export interface TimetableSlot {
  id?: string;
  start_time: string;
  end_time: string;
  module_id: string;
  staff_id: string;
  classroom_id?: string | null;
  classroom: string;
  interval_time?: number | null;
  module?: {
    id: string;
    name: string;
    category: string;
  };
  staff?: {
    id: string;
    name: string;
  };
}

export interface Timetable {
  id: string;
  batch: string;
  date: string;
  weekday: string;
  slots: TimetableSlot[];
  created_at?: string;
  updated_at?: string;
}

export interface TimetableFormData {
  batch: string;
  date: string;
  slots: TimetableSlot[];
}
