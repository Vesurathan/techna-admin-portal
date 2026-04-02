const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface ApiResponse<T> {
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const isFormData = options.body instanceof FormData;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    // Only set Content-Type for JSON, not for FormData (browser will set it with boundary)
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    // Merge existing headers if they're a plain object
    if (options.headers && !isFormData) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, options.headers);
      }
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: headers as HeadersInit,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'An error occurred',
      }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post<{ user: any; token: string }>(
      '/auth/login',
      { email, password }
    );
    if (typeof window !== 'undefined' && response.token) {
      localStorage.setItem('auth_token', response.token);
    }
    return response;
  },

  me: async () => {
    return apiClient.get<{ user: any }>('/auth/me');
  },

  logout: async () => {
    await apiClient.post('/auth/logout');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  },
};

// Roles API
export const rolesApi = {
  getAll: async () => {
    return apiClient.get<{ roles: any[] }>('/roles');
  },

  getById: async (id: string) => {
    return apiClient.get<{ role: any }>(`/roles/${id}`);
  },

  create: async (data: { name: string; description?: string; permissions: string[] }) => {
    return apiClient.post<{ role: any }>('/roles', data);
  },

  update: async (id: string, data: { name: string; description?: string; permissions: string[] }) => {
    return apiClient.put<{ role: any }>(`/roles/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete<{ message: string }>(`/roles/${id}`);
  },
};

// Staffs API
export const staffsApi = {
  getAll: async (page: number = 1, all: boolean = false) => {
    const params = new URLSearchParams();
    if (all) {
      params.append('all', 'true');
    } else {
      params.append('page', page.toString());
    }
    return apiClient.get<{ staffs: any[]; pagination?: any }>(`/staffs?${params.toString()}`);
  },

  getById: async (id: string) => {
    return apiClient.get<{ staff: any }>(`/staffs/${id}`);
  },

  create: async (data: {
    first_name: string;
    last_name: string;
    nic_number?: string;
    date_of_birth: string;
    address: string;
    gender: string;
    blood_group?: string;
    school_name?: string;
    qualifications?: string;
    module_ids: number[];
    secondary_phone: string;
    secondary_phone_has_whatsapp: boolean;
    medical_notes?: string;
    image_path?: string;
    status: string;
  }) => {
    return apiClient.post<{ staff: any }>('/staffs', data);
  },

  update: async (id: string, data: {
    first_name: string;
    last_name: string;
    nic_number?: string;
    date_of_birth: string;
    address: string;
    gender: string;
    blood_group?: string;
    school_name?: string;
    qualifications?: string;
    module_ids: number[];
    secondary_phone: string;
    secondary_phone_has_whatsapp: boolean;
    medical_notes?: string;
    image_path?: string;
    status: string;
  }) => {
    return apiClient.put<{ staff: any }>(`/staffs/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete<{ message: string }>(`/staffs/${id}`);
  },

  setAccess: async (
    staffId: string,
    data: { role_id: string; email: string; password?: string | null }
  ) => {
    return apiClient.post<{ staff: any }>(`/staffs/${staffId}/access`, {
      role_id: Number(data.role_id),
      email: data.email,
      password: data.password ?? undefined,
    });
  },
};

// Modules API
export const modulesApi = {
  getAll: async (page: number = 1) => {
    const params = new URLSearchParams({ page: page.toString() });
    return apiClient.get<{ modules: any[]; pagination?: any }>(`/modules?${params.toString()}`);
  },

  getById: async (id: string) => {
    return apiClient.get<{ module: any }>(`/modules/${id}`);
  },

  create: async (data: {
    name: string;
    category: string;
    sub_modules_count: number;
    amount: number;
    staff_ids: string[];
  }) => {
    return apiClient.post<{ module: any }>('/modules', data);
  },

  update: async (id: string, data: {
    name: string;
    category: string;
    sub_modules_count: number;
    amount: number;
    staff_ids: string[];
  }) => {
    return apiClient.put<{ module: any }>(`/modules/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete<{ message: string }>(`/modules/${id}`);
  },
};

// Students API
export const studentsApi = {
  getAll: async (page: number = 1) => {
    const params = new URLSearchParams({ page: page.toString() });
    return apiClient.get<{ students: any[]; pagination: any }>(`/students?${params.toString()}`);
  },

  getById: async (id: string) => {
    return apiClient.get<{ student: any }>(`/students/${id}`);
  },

  create: async (data: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    nic_number?: string;
    personal_phone: string;
    parent_phone: string;
    personal_phone_has_whatsapp: boolean;
    parent_phone_has_whatsapp: boolean;
    admission_batch: string;
    address: string;
    school_name?: string;
    blood_group?: string;
    medical_notes?: string;
    image_path?: string;
    module_ids: number[];
    payment_type: string;
    paid_amount?: number;
    status?: string;
  }) => {
    return apiClient.post<{ student: any }>('/students', data);
  },

  update: async (id: string, data: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    nic_number?: string;
    personal_phone: string;
    parent_phone: string;
    personal_phone_has_whatsapp: boolean;
    parent_phone_has_whatsapp: boolean;
    admission_batch: string;
    address: string;
    school_name?: string;
    blood_group?: string;
    medical_notes?: string;
    image_path?: string;
    module_ids: number[];
    payment_type: string;
    paid_amount?: number;
    status: string;
  }) => {
    return apiClient.put<{ student: any }>(`/students/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete<{ message: string }>(`/students/${id}`);
  },

  deactivate: async (id: string) => {
    return apiClient.post<{ message: string }>(`/students/${id}/deactivate`);
  },
};

// Timetables API
export const timetablesApi = {
  getAll: async (params?: { batch?: string; date?: string; start_date?: string; end_date?: string; page?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.batch) queryParams.append('batch', params.batch);
    if (params?.date) queryParams.append('date', params.date);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    queryParams.append('page', (params?.page || 1).toString());
    
    const queryString = queryParams.toString();
    return apiClient.get<{ timetables: any[]; pagination?: any }>(`/timetables?${queryString}`);
  },

  getById: async (id: string) => {
    return apiClient.get<{ timetable: any }>(`/timetables/${id}`);
  },

  create: async (data: {
    batch: string;
    date: string;
    slots: Array<{
      start_time: string;
      end_time: string;
      module_id: number;
      staff_id: number;
      classroom: string;
      interval_time?: number | null;
    }>;
  }) => {
    return apiClient.post<{ timetable: any }>('/timetables', data);
  },

  update: async (id: string, data: {
    batch: string;
    date: string;
    slots: Array<{
      start_time: string;
      end_time: string;
      module_id: number;
      staff_id: number;
      classroom: string;
      interval_time?: number | null;
    }>;
  }) => {
    return apiClient.put<{ timetable: any }>(`/timetables/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete<{ message: string }>(`/timetables/${id}`);
  },

  download: async (id: string) => {
    return apiClient.get<{ timetable: any }>(`/timetables/${id}/download`);
  },
};

// Classrooms API
export const classroomsApi = {
  getAll: async (params?: { active_only?: boolean; type?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.active_only) queryParams.append('active_only', 'true');
    if (params?.type) queryParams.append('type', params.type);
    
    const queryString = queryParams.toString();
    return apiClient.get<{ classrooms: any[] }>(`/classrooms${queryString ? `?${queryString}` : ''}`);
  },

  getById: async (id: string) => {
    return apiClient.get<{ classroom: any }>(`/classrooms/${id}`);
  },

  create: async (data: {
    name: string;
    type?: string;
    capacity?: number;
    description?: string;
    is_active?: boolean;
  }) => {
    return apiClient.post<{ classroom: any }>('/classrooms', data);
  },

  update: async (id: string, data: {
    name: string;
    type?: string;
    capacity?: number;
    description?: string;
    is_active?: boolean;
  }) => {
    return apiClient.put<{ classroom: any }>(`/classrooms/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete<{ message: string }>(`/classrooms/${id}`);
  },
};

// Questions API
export const questionsApi = {
  getAll: async (params?: {
    page?: number;
    source?: "module" | "general";
    module_id?: string;
    category?: string;
    question_type?: string;
    search?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.source) queryParams.append("source", params.source);
    if (params?.module_id) queryParams.append("module_id", params.module_id);
    if (params?.category) queryParams.append("category", params.category);
    if (params?.question_type) queryParams.append("question_type", params.question_type);
    if (params?.search) queryParams.append("search", params.search);

    const queryString = queryParams.toString();
    return apiClient.get<{ questions: any[]; pagination?: any }>(
      `/questions?${queryString}`
    );
  },

  getById: async (id: string) => {
    return apiClient.get<{ question: any }>(`/questions/${id}`);
  },

  create: async (data: FormData) => {
    return apiClient.post<{ question: any }>("/questions", data);
  },

  update: async (id: string, data: FormData) => {
    return apiClient.put<{ question: any }>(`/questions/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete<{ message: string }>(`/questions/${id}`);
  },

  getCategories: async (params?: {
    module_id?: string;
    source?: "module" | "general";
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.module_id) queryParams.append("module_id", params.module_id);
    if (params?.source) queryParams.append("source", params.source);

    const queryString = queryParams.toString();
    return apiClient.get<{ categories: any[] }>(
      `/questions/categories?${queryString}`
    );
  },
};

// Questionnaires API
export const questionnairesApi = {
  getAll: async (params?: {
    page?: number;
    source?: "module" | "general";
    module_id?: string;
    batch?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.source) queryParams.append("source", params.source);
    if (params?.module_id) queryParams.append("module_id", params.module_id);
    if (params?.batch) queryParams.append("batch", params.batch);

    const queryString = queryParams.toString();
    return apiClient.get<{ questionnaires: any[]; pagination?: any }>(
      `/questionnaires?${queryString}`
    );
  },

  getById: async (id: string) => {
    return apiClient.get<{ questionnaire: any }>(`/questionnaires/${id}`);
  },

  create: async (data: {
    title: string;
    source: "module" | "general";
    module_id?: string | null;
    batch: string;
    description?: string;
    selected_categories: string[];
    question_counts: {
      short_answer?: number;
      long_answer?: number;
      single_select?: number;
      multi_select?: number;
      true_false?: number;
    };
  }) => {
    return apiClient.post<{ questionnaire: any }>("/questionnaires", data);
  },

  delete: async (id: string) => {
    return apiClient.delete<{ message: string }>(`/questionnaires/${id}`);
  },
};

// Payments API
export const paymentsApi = {
  getAll: async (params?: {
    page?: number;
    batch?: string;
    module_id?: string;
    month?: string; // Format: YYYY-MM
    year?: number;
    status?: "pending" | "paid" | "partial";
    payment_method?: "cash" | "card";
    search?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.batch) queryParams.append("batch", params.batch);
    if (params?.module_id) queryParams.append("module_id", params.module_id);
    if (params?.month) queryParams.append("month", params.month);
    if (params?.year) queryParams.append("year", params.year.toString());
    if (params?.status) queryParams.append("status", params.status);
    if (params?.payment_method) queryParams.append("payment_method", params.payment_method);
    if (params?.search) queryParams.append("search", params.search);

    const queryString = queryParams.toString();
    return apiClient.get<{ payments: any[]; pagination?: any }>(
      `/payments?${queryString}`
    );
  },

  getById: async (id: string) => {
    return apiClient.get<{ payment: any }>(`/payments/${id}`);
  },

  searchStudent: async (params: { admission_number?: string; barcode?: string }) => {
    const queryParams = new URLSearchParams();
    if (params.admission_number) queryParams.append("admission_number", params.admission_number);
    if (params.barcode) queryParams.append("barcode", params.barcode);

    const queryString = queryParams.toString();
    return apiClient.get<{ student: any }>(`/payments/search-student?${queryString}`);
  },

  create: async (data: {
    student_id: string;
    module_id?: string | null;
    amount: number;
    discount_amount?: number;
    paid_amount: number;
    payment_method: "cash" | "card";
    payment_date: string;
    month: string; // Format: YYYY-MM
    status?: "pending" | "paid" | "partial";
    notes?: string;
  }) => {
    return apiClient.post<{ payment: any }>("/payments", data);
  },

  update: async (id: string, data: {
    amount?: number;
    discount_amount?: number;
    paid_amount?: number;
    payment_method?: "cash" | "card";
    payment_date?: string;
    status?: "pending" | "paid" | "partial";
    notes?: string;
  }) => {
    return apiClient.put<{ payment: any }>(`/payments/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete<{ message: string }>(`/payments/${id}`);
  },

  getBatches: async () => {
    return apiClient.get<{ batches: string[] }>("/payments/batches");
  },

  getMonthlySummary: async (params?: { month?: string; year?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.month) queryParams.append("month", params.month);
    if (params?.year) queryParams.append("year", params.year.toString());

    const queryString = queryParams.toString();
    return apiClient.get<{ summary: any }>(`/payments/monthly-summary?${queryString}`);
  },
};

// Attendance API
export const attendancesApi = {
  getAll: async (params?: {
    page?: number;
    type?: "student" | "staff";
    student_id?: string;
    staff_id?: string;
    date?: string;
    date_from?: string;
    date_to?: string;
    status?: "present" | "absent" | "late" | "early_leave";
    search?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.type) queryParams.append("type", params.type);
    if (params?.student_id) queryParams.append("student_id", params.student_id);
    if (params?.staff_id) queryParams.append("staff_id", params.staff_id);
    if (params?.date) queryParams.append("date", params.date);
    if (params?.date_from) queryParams.append("date_from", params.date_from);
    if (params?.date_to) queryParams.append("date_to", params.date_to);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.search) queryParams.append("search", params.search);

    const queryString = queryParams.toString();
    return apiClient.get<{ attendances: any[]; pagination?: any }>(
      `/attendances?${queryString}`
    );
  },

  markAttendance: async (data: {
    type: "student" | "staff";
    barcode: string;
    action: "in" | "out";
    date?: string;
    time?: string;
    notes?: string;
  }) => {
    return apiClient.post<{ attendance: any; message: string }>("/attendances/mark", data);
  },

  searchByBarcode: async (params: { barcode: string; type: "student" | "staff" }) => {
    const queryParams = new URLSearchParams();
    queryParams.append("barcode", params.barcode);
    queryParams.append("type", params.type);

    const queryString = queryParams.toString();
    return apiClient.get<{ student?: any; staff?: any; today_attendance?: any }>(
      `/attendances/search-barcode?${queryString}`
    );
  },

  update: async (id: string, data: {
    time_in?: string;
    time_out?: string;
    status?: "present" | "absent" | "late" | "early_leave";
    notes?: string;
  }) => {
    return apiClient.put<{ attendance: any }>(`/attendances/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete<{ message: string }>(`/attendances/${id}`);
  },
};

// Reports API
export const reportsApi = {
  getAttendanceReport: async (params?: {
    type?: "student" | "staff";
    date_from?: string;
    date_to?: string;
    month?: string;
    year?: number;
    status?: "present" | "absent" | "late" | "early_leave";
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append("type", params.type);
    if (params?.date_from) queryParams.append("date_from", params.date_from);
    if (params?.date_to) queryParams.append("date_to", params.date_to);
    if (params?.month) queryParams.append("month", params.month);
    if (params?.year) queryParams.append("year", params.year.toString());
    if (params?.status) queryParams.append("status", params.status);

    const queryString = queryParams.toString();
    return apiClient.get<{ attendances: any[]; summary: any }>(
      `/reports/attendance?${queryString}`
    );
  },

  getFinancialReport: async (params?: {
    date_from?: string;
    date_to?: string;
    month?: string;
    year?: number;
    batch?: string;
    module_id?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.date_from) queryParams.append("date_from", params.date_from);
    if (params?.date_to) queryParams.append("date_to", params.date_to);
    if (params?.month) queryParams.append("month", params.month);
    if (params?.year) queryParams.append("year", params.year.toString());
    if (params?.batch) queryParams.append("batch", params.batch);
    if (params?.module_id) queryParams.append("module_id", params.module_id);

    const queryString = queryParams.toString();
    return apiClient.get<{ payments: any[]; summary: any }>(
      `/reports/financial?${queryString}`
    );
  },

  getEnrollmentReport: async (params?: {
    batch?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    month?: string;
    year?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.batch) queryParams.append("batch", params.batch);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.date_from) queryParams.append("date_from", params.date_from);
    if (params?.date_to) queryParams.append("date_to", params.date_to);
    if (params?.month) queryParams.append("month", params.month);
    if (params?.year) queryParams.append("year", params.year.toString());

    const queryString = queryParams.toString();
    return apiClient.get<{ students: any[]; summary: any; module_enrollments: any[] }>(
      `/reports/enrollment?${queryString}`
    );
  },

  getPerformanceReport: async (params?: {
    module_id?: string;
    batch?: string;
    date_from?: string;
    date_to?: string;
    month?: string;
    year?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.module_id) queryParams.append("module_id", params.module_id);
    if (params?.batch) queryParams.append("batch", params.batch);
    if (params?.date_from) queryParams.append("date_from", params.date_from);
    if (params?.date_to) queryParams.append("date_to", params.date_to);
    if (params?.month) queryParams.append("month", params.month);
    if (params?.year) queryParams.append("year", params.year.toString());

    const queryString = queryParams.toString();
    return apiClient.get<{ questionnaires: any[]; summary: any }>(
      `/reports/performance?${queryString}`
    );
  },

  exportAttendanceReport: async (params?: {
    type?: "student" | "staff";
    date_from?: string;
    date_to?: string;
    month?: string;
    year?: number;
    status?: "present" | "absent" | "late" | "early_leave";
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append("type", params.type);
    if (params?.date_from) queryParams.append("date_from", params.date_from);
    if (params?.date_to) queryParams.append("date_to", params.date_to);
    if (params?.month) queryParams.append("month", params.month);
    if (params?.year) queryParams.append("year", params.year.toString());
    if (params?.status) queryParams.append("status", params.status);

    const queryString = queryParams.toString();
    const token = localStorage.getItem('auth_token');
    const response = await fetch(
      `${API_BASE_URL}/reports/attendance/export?${queryString}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to export report');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  exportFinancialReport: async (params?: {
    date_from?: string;
    date_to?: string;
    month?: string;
    year?: number;
    batch?: string;
    module_id?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.date_from) queryParams.append("date_from", params.date_from);
    if (params?.date_to) queryParams.append("date_to", params.date_to);
    if (params?.month) queryParams.append("month", params.month);
    if (params?.year) queryParams.append("year", params.year.toString());
    if (params?.batch) queryParams.append("batch", params.batch);
    if (params?.module_id) queryParams.append("module_id", params.module_id);

    const queryString = queryParams.toString();
    const token = localStorage.getItem('auth_token');
    const response = await fetch(
      `${API_BASE_URL}/reports/financial/export?${queryString}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to export report');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financial_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  exportEnrollmentReport: async (params?: {
    batch?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    month?: string;
    year?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.batch) queryParams.append("batch", params.batch);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.date_from) queryParams.append("date_from", params.date_from);
    if (params?.date_to) queryParams.append("date_to", params.date_to);
    if (params?.month) queryParams.append("month", params.month);
    if (params?.year) queryParams.append("year", params.year.toString());

    const queryString = queryParams.toString();
    const token = localStorage.getItem('auth_token');
    const response = await fetch(
      `${API_BASE_URL}/reports/enrollment/export?${queryString}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to export report');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `enrollment_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  exportPerformanceReport: async (params?: {
    module_id?: string;
    batch?: string;
    date_from?: string;
    date_to?: string;
    month?: string;
    year?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.module_id) queryParams.append("module_id", params.module_id);
    if (params?.batch) queryParams.append("batch", params.batch);
    if (params?.date_from) queryParams.append("date_from", params.date_from);
    if (params?.date_to) queryParams.append("date_to", params.date_to);
    if (params?.month) queryParams.append("month", params.month);
    if (params?.year) queryParams.append("year", params.year.toString());

    const queryString = queryParams.toString();
    const token = localStorage.getItem('auth_token');
    const response = await fetch(
      `${API_BASE_URL}/reports/performance/export?${queryString}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to export report');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `performance_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
