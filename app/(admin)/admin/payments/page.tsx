"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  CreditCard,
  Search,
  User,
  DollarSign,
  Calendar,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  X,
  Check,
  Scan,
  FileText,
  RotateCcw,
} from "lucide-react";
import { paymentsApi, modulesApi } from "@/app/lib/api";
import { Module } from "@/app/types/module";
import Pagination from "@/app/components/Pagination";
import { formatCurrency } from "@/app/utils/currency";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { RecordDetailModal, RecordDetailSectionTitle } from "@/app/components/RecordDetailModal";
import { IconTab, IconTabs } from "@/app/components/IconTabs";
import { useAppNotice } from "@/app/contexts/AppNoticeContext";

interface Student {
  id: string;
  admission_number: string;
  barcode: string;
  first_name: string;
  last_name: string;
  full_name: string;
  admission_batch: string;
  personal_phone: string;
  parent_phone: string;
  image_path?: string | null;
  modules: Array<{ id: string; name: string; category: string }>;
  monthly_fee: number;
  recent_payments: Payment[];
}

interface Payment {
  id: string;
  student_id: string;
  student: {
    id: string;
    admission_number: string;
    full_name: string;
    admission_batch: string;
  };
  module_id?: string | null;
  module?: { id: string; name: string } | null;
  amount: number;
  discount_amount: number;
  paid_amount: number;
  payment_method: "cash" | "card";
  payment_date: string;
  month: string;
  year: number;
  status: "pending" | "paid" | "partial";
  notes?: string | null;
  receipt_number?: string | null;
  created_by?: { id: string; name: string } | null;
  created_at: string;
  updated_at: string;
}

export default function PaymentsPage() {
  const { showNotice } = useAppNotice();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState<"admission" | "barcode">("admission");
  const [searchValue, setSearchValue] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrScannerError, setQrScannerError] = useState<string | null>(null);
  const qrVideoRef = useRef<HTMLVideoElement | null>(null);
  const qrStreamRef = useRef<MediaStream | null>(null);

  // Filters
  const [filterBatch, setFilterBatch] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState("");
  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total: 0,
    last_page: 1,
    from: 0,
    to: 0,
    has_more_pages: false,
  });

  const [paymentFormData, setPaymentFormData] = useState({
    student_id: "",
    module_id: "",
    amount: 0,
    discount_amount: 0,
    paid_amount: 0,
    payment_method: "cash" as "cash" | "card",
    payment_date: new Date().toISOString().split("T")[0],
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    notes: "",
  });

  const loadData = useCallback(async (page: number = currentPage) => {
    try {
      setLoading(true);
      const [paymentsRes, modulesRes, batchesRes] = await Promise.all([
        paymentsApi.getAll({
          page,
          batch: filterBatch || undefined,
          module_id: filterModule || undefined,
          month: filterMonth || undefined,
          year: filterYear ? parseInt(filterYear) : undefined,
          status: filterStatus as any || undefined,
          payment_method: filterPaymentMethod as any || undefined,
          search: search || undefined,
        }),
        modulesApi.getAll(1),
        paymentsApi.getBatches(),
      ]);

      if (paymentsRes.pagination) {
        setPagination(paymentsRes.pagination);
        setCurrentPage(paymentsRes.pagination.current_page);
      }

      const mappedPayments: Payment[] = (paymentsRes.payments || []).map((p: any) => ({
        id: p.id.toString(),
        student_id: p.student_id.toString(),
        student: p.student,
        module_id: p.module_id?.toString() || null,
        module: p.module,
        amount: parseFloat(p.amount),
        discount_amount: parseFloat(p.discount_amount),
        paid_amount: parseFloat(p.paid_amount),
        payment_method: p.payment_method,
        payment_date: p.payment_date,
        month: p.month,
        year: p.year,
        status: p.status,
        notes: p.notes,
        receipt_number: p.receipt_number,
        created_by: p.created_by,
        created_at: p.created_at,
        updated_at: p.updated_at,
      }));

      setPayments(mappedPayments);

      const mappedModules: Module[] = (modulesRes.modules || []).map((m: any) => ({
        id: m.id.toString(),
        name: m.name,
        category: m.category,
        subModulesCount: m.sub_modules_count ?? m.subModulesCount ?? 0,
        amount: Number(m.amount ?? 0),
        staffs: [],
      }));

      setModules(mappedModules);
      setBatches(batchesRes.batches || []);
    } catch (error) {
      console.error("Failed to load payments:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterBatch, filterModule, filterMonth, filterYear, filterStatus, filterPaymentMethod, search]);

  useEffect(() => {
    loadData(1);
  }, [filterBatch, filterModule, filterMonth, filterYear, filterStatus, filterPaymentMethod, search]);

  const handleSearchStudent = async () => {
    if (!searchValue.trim()) {
      showNotice({
        title: "Student required",
        message: "Please enter admission number or scan barcode",
        variant: "info",
      });
      return;
    }

    try {
      const params =
        searchMode === "admission"
          ? { admission_number: searchValue.trim() }
          : { barcode: searchValue.trim() };

      const res = await paymentsApi.searchStudent(params);
      setSelectedStudent(res.student);
      setShowPaymentModal(true);

      // Set payment form data
      setPaymentFormData({
        student_id: res.student.id,
        module_id: "",
        amount: res.student.monthly_fee,
        discount_amount: 0,
        paid_amount: res.student.monthly_fee,
        payment_method: "cash",
        payment_date: new Date().toISOString().split("T")[0],
        month: new Date().toISOString().slice(0, 7),
        notes: "",
      });
    } catch (error: any) {
      showNotice({
        message: error.message || "Student not found",
        variant: "error",
      });
      setSelectedStudent(null);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentFormData.student_id) {
      showNotice({
        title: "Student required",
        message: "Please search and select a student first",
        variant: "info",
      });
      return;
    }

    if (paymentFormData.amount <= 0) {
      showNotice({
        title: "Invalid amount",
        message: "Amount must be greater than 0",
        variant: "info",
      });
      return;
    }

    if (paymentFormData.discount_amount > paymentFormData.amount) {
      showNotice({
        title: "Invalid discount",
        message: "Discount amount cannot exceed total amount",
        variant: "info",
      });
      return;
    }

    const amountAfterDiscount = paymentFormData.amount - paymentFormData.discount_amount;

    if (paymentFormData.paid_amount > amountAfterDiscount) {
      showNotice({
        title: "Invalid payment",
        message: "Paid amount cannot exceed amount after discount",
        variant: "info",
      });
      return;
    }

    if (paymentFormData.paid_amount <= 0) {
      showNotice({
        title: "Invalid payment",
        message: "Paid amount must be greater than 0",
        variant: "info",
      });
      return;
    }

    try {
      await paymentsApi.create({
        student_id: paymentFormData.student_id,
        module_id: paymentFormData.module_id || null,
        amount: paymentFormData.amount,
        discount_amount: paymentFormData.discount_amount,
        paid_amount: paymentFormData.paid_amount,
        payment_method: paymentFormData.payment_method,
        payment_date: paymentFormData.payment_date,
        month: paymentFormData.month,
        notes: paymentFormData.notes || undefined,
      });

      await loadData();
      setShowPaymentModal(false);
      setSelectedStudent(null);
      setSearchValue("");
    } catch (error: any) {
      showNotice({
        message: error.message || "Failed to process payment",
        variant: "error",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await paymentsApi.delete(deleteTarget.id);
      await loadData();
      setDeleteTarget(null);
    } catch (error: any) {
      showNotice({
        message: error.message || "Failed to delete payment",
        variant: "error",
      });
    }
  };

  const openView = async (payment: Payment) => {
    try {
      const res = await paymentsApi.getById(payment.id);
      setSelectedPayment(res.payment);
      setShowViewModal(true);
    } catch (error: any) {
      showNotice({
        message: error.message || "Failed to load payment details",
        variant: "error",
      });
    }
  };

  const handleResetFilters = () => {
    setFilterBatch("");
    setFilterModule("");
    setFilterMonth("");
    setFilterYear("");
    setFilterStatus("");
    setFilterPaymentMethod("");
    setSearch("");
    setCurrentPage(1);
  };

  const amountAfterDiscount = paymentFormData.amount - paymentFormData.discount_amount;

  const stopQrScanner = useCallback(() => {
    if (qrStreamRef.current) {
      for (const t of qrStreamRef.current.getTracks()) {
        t.stop();
      }
      qrStreamRef.current = null;
    }
    if (qrVideoRef.current) {
      qrVideoRef.current.srcObject = null;
    }
  }, []);

  const parseBarcodeFromQr = useCallback((raw: string): string | null => {
    const v = raw.trim();
    if (!v) return null;

    // Our QR payloads are JSON (see student-qr-payload.ts / staff-qr-payload.ts) like {"b":"..."} or {"barcode":"..."}
    if (v.startsWith("{") && v.endsWith("}")) {
      try {
        const obj = JSON.parse(v) as any;
        const code = (obj?.barcode ?? obj?.b ?? obj?.id ?? "").toString().trim();
        return code || null;
      } catch {
        // fall through to treat raw as barcode
      }
    }

    return v;
  }, []);

  useEffect(() => {
    if (!showQrScanner) {
      stopQrScanner();
      return;
    }

    let cancelled = false;
    let raf = 0;
    let detector: BarcodeDetector | null = null;

    const start = async () => {
      setQrScannerError(null);

      if (typeof window === "undefined") return;

      if (!("mediaDevices" in navigator) || !navigator.mediaDevices?.getUserMedia) {
        setQrScannerError("Camera access is not available in this browser.");
        return;
      }

      // BarcodeDetector is supported in modern Chrome/Edge. If not available, user can still paste/enter barcode.
      if (typeof BarcodeDetector === "undefined") {
        setQrScannerError("QR scanning is not supported in this browser. Please type the barcode manually.");
        return;
      }

      try {
        qrStreamRef.current = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (!qrVideoRef.current) return;
        qrVideoRef.current.srcObject = qrStreamRef.current;
        await qrVideoRef.current.play();

        detector = new BarcodeDetector({ formats: ["qr_code"] });

        const scan = async () => {
          if (cancelled) return;
          try {
            if (qrVideoRef.current && detector) {
              const codes = await detector.detect(qrVideoRef.current);
              const first = codes?.[0];
              const raw = first?.rawValue;
              if (typeof raw === "string" && raw.trim() !== "") {
                const barcode = parseBarcodeFromQr(raw);
                if (barcode) {
                  setSearchMode("barcode");
                  setSearchValue(barcode);
                  setShowQrScanner(false);
                  // Defer search until state updates settle
                  setTimeout(() => {
                    handleSearchStudent();
                  }, 0);
                  return;
                }
              }
            }
          } catch {
            // ignore per-frame errors
          }
          raf = requestAnimationFrame(scan);
        };

        raf = requestAnimationFrame(scan);
      } catch (e) {
        setQrScannerError(
          e instanceof Error ? e.message : "Unable to start camera. Please check browser permissions."
        );
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      stopQrScanner();
    };
  }, [showQrScanner, stopQrScanner, parseBarcodeFromQr]);

  // Generate month options (last 12 months)
  const monthOptions: string[] = [];
  {
    // Use day=1 to avoid month rollover issues (e.g. Mar 31 -> Feb becomes Mar 03)
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let i = 0; i < 12; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      monthOptions.push(`${yyyy}-${mm}`);
    }
  }

  // Generate year options (last 5 years)
  const yearOptions: number[] = [];
  const currentYear = new Date().getFullYear();
  for (let i = 0; i < 5; i++) {
    yearOptions.push(currentYear - i);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground mt-2">Manage student payments and transactions</p>
        </div>
      </div>

      {/* Student Search */}
      <div className="card bg-card border border-border shadow-sm">
        <div className="card-body p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <IconTabs className="w-full sm:w-fit">
              <IconTab
                active={searchMode === "admission"}
                icon={User}
                onClick={() => setSearchMode("admission")}
              >
                Admission number
              </IconTab>
              <IconTab
                active={searchMode === "barcode"}
                icon={Scan}
                onClick={() => setSearchMode("barcode")}
              >
                Barcode scan
              </IconTab>
            </IconTabs>
            <div className="form-control flex-1 min-w-0">
              <div className="input-group">
                <input
                  type="text"
                  placeholder={
                    searchMode === "admission"
                      ? "Enter admission number..."
                      : "Scan barcode or enter barcode..."
                  }
                  className="input input-bordered w-full border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleSearchStudent();
                    }
                  }}
                />
                <button
                  className="btn btn-primary flex-shrink-0"
                  onClick={handleSearchStudent}
                >
                  <Search className="h-5 w-5" />
                </button>
                {searchMode === "barcode" ? (
                  <button
                    type="button"
                    className="btn btn-outline flex-shrink-0"
                    onClick={() => setShowQrScanner(true)}
                    title="Scan student QR code"
                  >
                    <Scan className="h-5 w-5" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR scanner dialog (payments search) */}
      {showQrScanner ? (
        <div className="modal modal-open">
          <div className="modal-box bg-card border border-border max-w-lg w-full mx-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-foreground">Scan student QR</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowQrScanner(false)}
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              Point the camera at the student QR code. We’ll auto-fill the barcode and load the student.
            </p>

            {qrScannerError ? (
              <div className="alert alert-warning mt-4">
                <span className="text-sm">{qrScannerError}</span>
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-lg border border-border bg-black">
                <video ref={qrVideoRef} className="h-72 w-full object-cover" playsInline muted />
              </div>
            )}

            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={() => setShowQrScanner(false)}>
                Cancel
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowQrScanner(false)} />
        </div>
      ) : null}

      {/* Filters */}
      <div className="card bg-card border border-border shadow-sm">
        <div className="card-body p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Filters</h3>
            <button
              className="btn btn-outline btn-sm gap-2 items-center"
              onClick={handleResetFilters}
              title="Reset all filters"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset Filters</span>
              <span className="sm:hidden">Reset</span>
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-wrap">
            <div className="form-control flex-shrink-0 sm:w-48">
              <select
                className="select select-bordered w-full border-border focus:border-primary focus:outline-none"
                value={filterBatch}
                onChange={(e) => setFilterBatch(e.target.value)}
              >
                <option value="">All Batches</option>
                {batches.map((batch) => (
                  <option key={batch} value={batch}>
                    {batch}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control flex-shrink-0 sm:w-48">
              <select
                className="select select-bordered w-full border-border focus:border-primary focus:outline-none"
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
              >
                <option value="">All Modules</option>
                {modules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control flex-shrink-0 sm:w-48">
              <select
                className="select select-bordered w-full border-border focus:border-primary focus:outline-none"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              >
                <option value="">All Months</option>
                {monthOptions.map((month) => {
                  const date = new Date(month + "-01");
                  return (
                    <option key={month} value={month}>
                      {date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="form-control flex-shrink-0 sm:w-48">
              <select
                className="select select-bordered w-full border-border focus:border-primary focus:outline-none"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="">All Years</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control flex-shrink-0 sm:w-48">
              <select
                className="select select-bordered w-full border-border focus:border-primary focus:outline-none"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="form-control flex-shrink-0 sm:w-48">
              <select
                className="select select-bordered w-full border-border focus:border-primary focus:outline-none"
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
              >
                <option value="">All Methods</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </select>
            </div>
            <div className="form-control flex-1 min-w-0">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Search by student name or admission number..."
                  className="input input-bordered w-full border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button className="btn btn-square btn-primary flex-shrink-0">
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="card bg-card border border-border shadow-md overflow-hidden">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-16 w-16 mx-auto text-foreground/30 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No payments found</h3>
              <p className="text-muted-foreground">No payments match your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-foreground font-semibold">Receipt #</th>
                    <th className="text-foreground font-semibold">Student</th>
                    <th className="text-foreground font-semibold">Module</th>
                    <th className="text-foreground font-semibold">Amount</th>
                    <th className="text-foreground font-semibold">Discount</th>
                    <th className="text-foreground font-semibold">Paid</th>
                    <th className="text-foreground font-semibold">Method</th>
                    <th className="text-foreground font-semibold">Date</th>
                    <th className="text-foreground font-semibold">Status</th>
                    <th className="text-foreground font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover">
                      <td>
                        <span className="font-mono text-sm">{payment.receipt_number || "N/A"}</span>
                      </td>
                      <td>
                        <div>
                          <div className="font-semibold text-foreground">
                            {payment.student.full_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {payment.student.admission_number} • {payment.student.admission_batch}
                          </div>
                        </div>
                      </td>
                      <td>
                        {payment.module ? (
                          <span className="badge badge-outline badge-sm">{payment.module.name}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">All Modules</span>
                        )}
                      </td>
                      <td>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(payment.amount)}
                        </span>
                      </td>
                      <td>
                        {payment.discount_amount > 0 ? (
                          <span className="text-destructive font-semibold">
                            -{formatCurrency(payment.discount_amount)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td>
                        <span className="font-semibold text-success">
                          {formatCurrency(payment.paid_amount)}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-outline badge-sm capitalize">
                          {payment.payment_method}
                        </span>
                      </td>
                      <td>
                        <div className="text-sm text-foreground">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">{payment.month}</div>
                      </td>
                      <td>
                        <span
                          className={`badge badge-sm ${
                            payment.status === "paid"
                              ? "badge-success"
                              : payment.status === "partial"
                              ? "badge-warning"
                              : "badge-error"
                          }`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            className="btn btn-outline btn-sm gap-1.5 items-center px-3"
                            onClick={() => openView(payment)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline">View</span>
                          </button>
                          <button
                            className="btn btn-delete btn-sm gap-1.5 items-center px-3"
                            onClick={() => setDeleteTarget(payment)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* Pagination */}
        {!loading && payments.length > 0 && (
          <Pagination
            currentPage={currentPage}
            lastPage={pagination.last_page}
            total={pagination.total}
            from={pagination.from}
            to={pagination.to}
            loading={loading}
            onPageChange={loadData}
            itemName="payments"
          />
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedStudent && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-card border border-border max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3>Process Payment</h3>
            <div className="card bg-muted border border-border p-5 sm:p-6 mb-6">
              <div className="flex items-start gap-4">
                {selectedStudent.image_path && (
                  <img
                    src={selectedStudent.image_path}
                    alt={selectedStudent.full_name}
                    className="w-16 h-16 rounded-lg object-cover border border-border"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground text-lg">
                    {selectedStudent.full_name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedStudent.admission_number} • Batch: {selectedStudent.admission_batch}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Phone: {selectedStudent.personal_phone}
                  </p>
                  <div className="mt-2">
                    <p className="text-sm font-semibold text-foreground">Enrolled Modules:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedStudent.modules.map((module) => (
                        <span key={module.id} className="badge badge-primary badge-sm">
                          {module.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">
                      Monthly Fee: <span className="font-semibold text-foreground">{formatCurrency(selectedStudent.monthly_fee)}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-foreground">Module (Optional)</span>
                  </label>
                  <select
                    className="select select-bordered w-full border-border focus:border-primary focus:outline-none"
                    value={paymentFormData.module_id}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, module_id: e.target.value })}
                  >
                    <option value="">All Modules</option>
                    {selectedStudent.modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-foreground">Payment Date *</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
                    value={paymentFormData.payment_date}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-foreground">Month *</span>
                  </label>
                  <input
                    type="month"
                    className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
                    value={paymentFormData.month}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, month: e.target.value })}
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-foreground">Payment Method *</span>
                  </label>
                  <select
                    className="select select-bordered w-full border-border focus:border-primary focus:outline-none"
                    value={paymentFormData.payment_method}
                    onChange={(e) =>
                      setPaymentFormData({
                        ...paymentFormData,
                        payment_method: e.target.value as "cash" | "card",
                      })
                    }
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-foreground">Amount (Rs.) *</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
                    value={paymentFormData.amount}
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      setPaymentFormData({
                        ...paymentFormData,
                        amount,
                        paid_amount: amount - paymentFormData.discount_amount,
                      });
                    }}
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-foreground">Discount (Rs.)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
                    value={paymentFormData.discount_amount}
                    onChange={(e) => {
                      const discount = parseFloat(e.target.value) || 0;
                      const maxDiscount = paymentFormData.amount;
                      const finalDiscount = Math.min(discount, maxDiscount);
                      setPaymentFormData({
                        ...paymentFormData,
                        discount_amount: finalDiscount,
                        paid_amount: paymentFormData.amount - finalDiscount,
                      });
                    }}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-foreground">Paid Amount (Rs.) *</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={amountAfterDiscount}
                    className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
                    value={paymentFormData.paid_amount}
                    onChange={(e) => {
                      const paid = parseFloat(e.target.value) || 0;
                      const maxPaid = amountAfterDiscount;
                      setPaymentFormData({
                        ...paymentFormData,
                        paid_amount: Math.min(paid, maxPaid),
                      });
                    }}
                    required
                  />
                  <label className="label pt-1">
                    <span className="label-text-alt text-muted-foreground">
                      After discount: {formatCurrency(amountAfterDiscount)}
                    </span>
                  </label>
                </div>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold text-foreground">Notes</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full border-border focus:border-primary focus:outline-none min-h-[80px]"
                  placeholder="Optional notes..."
                  value={paymentFormData.notes}
                  onChange={(e) =>
                    setPaymentFormData({ ...paymentFormData, notes: e.target.value })
                  }
                />
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost gap-2 px-6"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedStudent(null);
                    setSearchValue("");
                  }}
                >
                  <span className="whitespace-nowrap">Cancel</span>
                </button>
                <button type="submit" className="btn btn-primary gap-2 px-6 items-center">
                  <DollarSign className="h-4 w-4" />
                  <span className="whitespace-nowrap">Process Payment</span>
                </button>
              </div>
            </form>
          </div>
          <form
            method="dialog"
            className="modal-backdrop"
            onClick={() => {
              setShowPaymentModal(false);
              setSelectedStudent(null);
              setSearchValue("");
            }}
          >
            <button>close</button>
          </form>
        </dialog>
      )}

      <RecordDetailModal
        open={showViewModal && !!selectedPayment}
        title="Payment"
        subtitle={
          selectedPayment
            ? selectedPayment.receipt_number || `ID ${selectedPayment.id}`
            : undefined
        }
        onClose={() => {
          setShowViewModal(false);
          setSelectedPayment(null);
        }}
        size="md"
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`badge badge-sm ${
                  selectedPayment.status === "paid"
                    ? "badge-success"
                    : selectedPayment.status === "partial"
                      ? "badge-warning"
                      : "badge-error"
                }`}
              >
                {selectedPayment.status}
              </span>
              <span className="badge badge-outline badge-sm capitalize">
                {selectedPayment.payment_method}
              </span>
            </div>

            <RecordDetailSectionTitle>Student & module</RecordDetailSectionTitle>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4">
              <div>
                <p className="text-xs text-muted-foreground">Student</p>
                <p className="text-sm font-medium text-foreground">{selectedPayment.student.full_name}</p>
                <p className="text-xs text-foreground/55">
                  {selectedPayment.student.admission_number} · {selectedPayment.student.admission_batch}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Module</p>
                <p className="text-sm font-medium text-foreground">
                  {selectedPayment.module?.name || "All modules"}
                </p>
              </div>
            </div>

            <RecordDetailSectionTitle>Amounts</RecordDetailSectionTitle>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-sm font-medium text-foreground">{formatCurrency(selectedPayment.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Discount</p>
                <p className="text-sm font-medium text-destructive">{formatCurrency(selectedPayment.discount_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="text-sm font-medium text-success">{formatCurrency(selectedPayment.paid_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Period</p>
                <p className="text-sm font-medium text-foreground">{selectedPayment.month}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Payment date</p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(selectedPayment.payment_date).toLocaleDateString()}
                </p>
              </div>
            </div>

            {selectedPayment.notes ? (
              <div>
                <RecordDetailSectionTitle>Notes</RecordDetailSectionTitle>
                <p className="text-sm text-foreground leading-snug">{selectedPayment.notes}</p>
              </div>
            ) : null}

            {selectedPayment.created_by ? (
              <div>
                <p className="text-xs text-muted-foreground">Processed by</p>
                <p className="text-sm font-medium text-foreground">{selectedPayment.created_by.name}</p>
              </div>
            ) : null}
          </div>
        )}
      </RecordDetailModal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete payment?"
        description={
          <>
            Receipt{" "}
            <span className="font-medium text-foreground">
              {deleteTarget?.receipt_number || (deleteTarget ? `#${deleteTarget.id}` : "")}
            </span>
            . This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
