import { Module } from "./module";

export type PaymentType = "full" | "admission_only";
export type StudentStatus = "active" | "inactive" | "graduated" | "suspended";

export type Gender = "male" | "female" | "other";

export interface Student {
  id: string;
  admissionNumber: string;
  barcode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  gender: Gender;
  nicNumber?: string | null;
  personalPhone: string;
  parentPhone: string;
  personalPhoneHasWhatsapp: boolean;
  parentPhoneHasWhatsapp: boolean;
  admissionBatch: string;
  address: string;
  schoolName?: string | null;
  bloodGroup?: string | null;
  medicalNotes?: string | null;
  imagePath?: string | null;
  admissionFee: number;
  moduleTotalAmount: number;
  paidAmount: number;
  paymentType: PaymentType;
  status: StudentStatus;
  modules: Module[];
  createdAt: string;
  updatedAt: string;
}

export interface StudentFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  nicNumber: string;
  personalPhone: string;
  parentPhone: string;
  personalPhoneHasWhatsapp: boolean;
  parentPhoneHasWhatsapp: boolean;
  admissionBatch: string;
  address: string;
  schoolName: string;
  bloodGroup: string;
  medicalNotes: string;
  moduleIds: string[];
  paymentType: PaymentType;
  paidAmount: number;
  status: StudentStatus;
  imageFile?: File | null;
}

export const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;