export type ModuleCategory = "main" | "compulsory" | "basket";

export interface Staff {
  id: string;
  name: string;
  email: string;
  department?: string | null;
  phone?: string | null;
}

export interface Module {
  id: string;
  name: string;
  category: ModuleCategory;
  subModulesCount: number;
  subModules?: Array<{
    id: string;
    name: string;
    sortOrder: number;
  }>;
  amount: number;
  staffs: Staff[];
}
