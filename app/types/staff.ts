export type StaffStatus = "active" | "inactive" | "on_leave" | "terminated";
export type Gender = "male" | "female" | "other";

export const bloodGroups = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

export type BloodGroup = typeof bloodGroups[number];

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  nicNumber?: string | null;
  dateOfBirth: string;
  address: string;
  gender: Gender;
  bloodGroup?: BloodGroup | null;
  schoolName?: string | null;
  qualifications?: string | null;
  secondaryPhone: string;
  secondaryPhoneHasWhatsapp: boolean;
  medicalNotes?: string | null;
  imagePath?: string | null;
  status: StaffStatus;
  modules: Array<{
    id: string;
    name: string;
    category: string;
    amount: number;
  }>;
  createdAt?: string;
  updatedAt?: string;
  account?: {
    userId: number;
    email: string;
    role: {
      id: number;
      name: string;
      slug: string;
      permissions: string[];
    };
  } | null;
}

export interface StaffFormData {
  firstName: string;
  lastName: string;
  nicNumber: string;
  dateOfBirth: string;
  address: string;
  gender: Gender;
  bloodGroup: string;
  schoolName: string;
  qualifications: string;
  moduleIds: string[];
  secondaryPhone: string;
  secondaryPhoneHasWhatsapp: boolean;
  medicalNotes: string;
  status: StaffStatus;
  imageFile: File | null;
}
