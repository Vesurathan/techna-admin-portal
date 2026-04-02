export type StaffPayrollPayType =
  | "salary"
  | "stipend"
  | "allowance"
  | "bonus"
  | "research_grant"
  | "other";

export type StaffPayrollPaymentMethod = "bank_transfer" | "cash" | "cheque";

export interface StaffPayrollPaymentListItem {
  id: string;
  staff_id: string;
  staff: {
    id: string;
    full_name: string;
    first_name: string;
    last_name: string;
  } | null;
  pay_year: number;
  pay_month: number;
  pay_period: string;
  pay_type: StaffPayrollPayType;
  gross_amount: number | null;
  deductions: number;
  net_amount: number;
  payment_date: string;
  payment_method: StaffPayrollPaymentMethod;
  created_at: string;
  updated_at: string;
}

export interface StaffPayrollPaymentDetail extends StaffPayrollPaymentListItem {
  account_holder_name: string | null;
  bank_name: string | null;
  account_number: string | null;
  bank_branch: string | null;
  iban_swift: string | null;
  transfer_reference: string | null;
  transfer_memo: string | null;
  internal_notes: string | null;
  created_by: { id: string; name: string } | null;
}

export const PAY_TYPE_LABELS: Record<StaffPayrollPayType, string> = {
  salary: "Salary",
  stipend: "Stipend / support",
  allowance: "Allowance",
  bonus: "Bonus",
  research_grant: "Research grant",
  other: "Other",
};

export const PAYMENT_METHOD_LABELS: Record<StaffPayrollPaymentMethod, string> = {
  bank_transfer: "Bank transfer",
  cash: "Cash",
  cheque: "Cheque",
};
