"use client";

import { useEffect, useState, useCallback } from "react";
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
      alert("Please enter admission number or scan barcode");
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
      alert(error.message || "Student not found");
      setSelectedStudent(null);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentFormData.student_id) {
      alert("Please search and select a student first");
      return;
    }

    if (paymentFormData.amount <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    if (paymentFormData.discount_amount > paymentFormData.amount) {
      alert("Discount amount cannot exceed total amount");
      return;
    }

    const amountAfterDiscount = paymentFormData.amount - paymentFormData.discount_amount;

    if (paymentFormData.paid_amount > amountAfterDiscount) {
      alert("Paid amount cannot exceed amount after discount");
      return;
    }

    if (paymentFormData.paid_amount <= 0) {
      alert("Paid amount must be greater than 0");
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
      alert(error.message || "Failed to process payment");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await paymentsApi.delete(deleteTarget.id);
      await loadData();
      setDeleteTarget(null);
    } catch (error: any) {
      alert(error.message || "Failed to delete payment");
    }
  };

  const openView = async (payment: Payment) => {
    try {
      const res = await paymentsApi.getById(payment.id);
      setSelectedPayment(res.payment);
      setShowViewModal(true);
    } catch (error: any) {
      alert(error.message || "Failed to load payment details");
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

  // Generate month options (last 12 months)
  const monthOptions: string[] = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    monthOptions.push(date.toISOString().slice(0, 7));
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
          <h1 className="text-3xl font-bold text-base-content">Payments</h1>
          <p className="text-base-content/70 mt-2">Manage student payments and transactions</p>
        </div>
      </div>

      {/* Student Search */}
      <div className="card bg-base-100 border border-base-300 shadow-sm">
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
                  className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-base-content">Filters</h3>
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
                className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
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
                className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
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
                className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
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
                className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
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
                className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
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
                className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
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
                  className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
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
      <div className="card bg-base-100 border border-base-300 shadow-md">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
              <h3 className="text-xl font-semibold text-base-content mb-2">No payments found</h3>
              <p className="text-base-content/70">No payments match your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr className="bg-base-200">
                    <th className="text-base-content font-semibold">Receipt #</th>
                    <th className="text-base-content font-semibold">Student</th>
                    <th className="text-base-content font-semibold">Module</th>
                    <th className="text-base-content font-semibold">Amount</th>
                    <th className="text-base-content font-semibold">Discount</th>
                    <th className="text-base-content font-semibold">Paid</th>
                    <th className="text-base-content font-semibold">Method</th>
                    <th className="text-base-content font-semibold">Date</th>
                    <th className="text-base-content font-semibold">Status</th>
                    <th className="text-base-content font-semibold text-right">Actions</th>
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
                          <div className="font-semibold text-base-content">
                            {payment.student.full_name}
                          </div>
                          <div className="text-sm text-base-content/70">
                            {payment.student.admission_number} • {payment.student.admission_batch}
                          </div>
                        </div>
                      </td>
                      <td>
                        {payment.module ? (
                          <span className="badge badge-outline badge-sm">{payment.module.name}</span>
                        ) : (
                          <span className="text-base-content/50 text-sm">All Modules</span>
                        )}
                      </td>
                      <td>
                        <span className="font-semibold text-base-content">
                          {formatCurrency(payment.amount)}
                        </span>
                      </td>
                      <td>
                        {payment.discount_amount > 0 ? (
                          <span className="text-error font-semibold">
                            -{formatCurrency(payment.discount_amount)}
                          </span>
                        ) : (
                          <span className="text-base-content/50">-</span>
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
                        <div className="text-sm text-base-content">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-base-content/70">{payment.month}</div>
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
          <div className="modal-box bg-base-100 border border-base-300 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-base-content">Process Payment</h3>
            <div className="card bg-base-200 border border-base-300 p-4 mb-4">
              <div className="flex items-start gap-4">
                {selectedStudent.image_path && (
                  <img
                    src={selectedStudent.image_path}
                    alt={selectedStudent.full_name}
                    className="w-16 h-16 rounded-lg object-cover border border-base-300"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-base-content text-lg">
                    {selectedStudent.full_name}
                  </h4>
                  <p className="text-sm text-base-content/70">
                    {selectedStudent.admission_number} • Batch: {selectedStudent.admission_batch}
                  </p>
                  <p className="text-sm text-base-content/70 mt-1">
                    Phone: {selectedStudent.personal_phone}
                  </p>
                  <div className="mt-2">
                    <p className="text-sm font-semibold text-base-content">Enrolled Modules:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedStudent.modules.map((module) => (
                        <span key={module.id} className="badge badge-primary badge-sm">
                          {module.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-base-content/70">
                      Monthly Fee: <span className="font-semibold text-base-content">{formatCurrency(selectedStudent.monthly_fee)}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label pb-2">
                    <span className="label-text font-semibold text-base-content">Module (Optional)</span>
                  </label>
                  <select
                    className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
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
                  <label className="label pb-2">
                    <span className="label-text font-semibold text-base-content">Payment Date *</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                    value={paymentFormData.payment_date}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label pb-2">
                    <span className="label-text font-semibold text-base-content">Month *</span>
                  </label>
                  <input
                    type="month"
                    className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                    value={paymentFormData.month}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, month: e.target.value })}
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label pb-2">
                    <span className="label-text font-semibold text-base-content">Payment Method *</span>
                  </label>
                  <select
                    className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
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
                  <label className="label pb-2">
                    <span className="label-text font-semibold text-base-content">Amount (Rs.) *</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
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
                  <label className="label pb-2">
                    <span className="label-text font-semibold text-base-content">Discount (Rs.)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
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
                  <label className="label pb-2">
                    <span className="label-text font-semibold text-base-content">Paid Amount (Rs.) *</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={amountAfterDiscount}
                    className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
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
                    <span className="label-text-alt text-base-content/70">
                      After discount: {formatCurrency(amountAfterDiscount)}
                    </span>
                  </label>
                </div>
              </div>
              <div className="form-control">
                <label className="label pb-2">
                  <span className="label-text font-semibold text-base-content">Notes</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full border-base-300 focus:border-primary focus:outline-none min-h-[80px]"
                  placeholder="Optional notes..."
                  value={paymentFormData.notes}
                  onChange={(e) =>
                    setPaymentFormData({ ...paymentFormData, notes: e.target.value })
                  }
                />
              </div>

              <div className="modal-action flex justify-end gap-3 mt-6">
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
                <p className="text-xs text-base-content/60">Student</p>
                <p className="text-sm font-medium text-base-content">{selectedPayment.student.full_name}</p>
                <p className="text-xs text-base-content/55">
                  {selectedPayment.student.admission_number} · {selectedPayment.student.admission_batch}
                </p>
              </div>
              <div>
                <p className="text-xs text-base-content/60">Module</p>
                <p className="text-sm font-medium text-base-content">
                  {selectedPayment.module?.name || "All modules"}
                </p>
              </div>
            </div>

            <RecordDetailSectionTitle>Amounts</RecordDetailSectionTitle>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3">
              <div>
                <p className="text-xs text-base-content/60">Amount</p>
                <p className="text-sm font-medium text-base-content">{formatCurrency(selectedPayment.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/60">Discount</p>
                <p className="text-sm font-medium text-error">{formatCurrency(selectedPayment.discount_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/60">Paid</p>
                <p className="text-sm font-medium text-success">{formatCurrency(selectedPayment.paid_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/60">Period</p>
                <p className="text-sm font-medium text-base-content">{selectedPayment.month}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-base-content/60">Payment date</p>
                <p className="text-sm font-medium text-base-content">
                  {new Date(selectedPayment.payment_date).toLocaleDateString()}
                </p>
              </div>
            </div>

            {selectedPayment.notes ? (
              <div>
                <RecordDetailSectionTitle>Notes</RecordDetailSectionTitle>
                <p className="text-sm text-base-content leading-snug">{selectedPayment.notes}</p>
              </div>
            ) : null}

            {selectedPayment.created_by ? (
              <div>
                <p className="text-xs text-base-content/60">Processed by</p>
                <p className="text-sm font-medium text-base-content">{selectedPayment.created_by.name}</p>
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
            <span className="font-medium text-base-content">
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
