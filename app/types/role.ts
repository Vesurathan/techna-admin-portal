export type Permission = 
  | "dashboard"
  | "attendance"
  | "modules"
  | "students"
  | "staffs"
  | "timetables"
  | "questionbank"
  | "payments"
  | "salary_payroll"
  | "reports"
  | "role"
  | "photo_library"
  | "notes";

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  isSuperAdmin?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  profileImageUrl?: string | null;
  role: Role;
}
