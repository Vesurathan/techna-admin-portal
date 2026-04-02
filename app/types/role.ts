export type Permission = 
  | "dashboard"
  | "attendance"
  | "modules"
  | "students"
  | "staffs"
  | "timetables"
  | "questionbank"
  | "payments"
  | "reports"
  | "role";

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
  role: Role;
}
