"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  X,
  User,
  List,
} from "lucide-react";
import { staffPayrollApi, staffsApi } from "@/app/lib/api";
import { formatCurrency } from "@/app/utils/currency";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { RecordDetailModal, RecordDetailSectionTitle } from "@/app/components/RecordDetailModal";
import Pagination from "@/app/components/Pagination";
import { IconTab, IconTabs } from "@/app/components/IconTabs";
import { useAppNotice } from "@/app/contexts/AppNoticeContext";
import {
  PAY_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  type StaffPayrollPayType,
  type StaffPayrollPaymentMethod,
  type StaffPayrollPaymentDetail,
  type StaffPayrollPaymentListItem,
} from "@/app/types/staff-payroll";

type TabId = "all" | "bystaff";

interface StaffOption {
  id: string;
  full_name: string;
}

function mapListItem(p: Record<string, unknown>): StaffPayrollPaymentListItem {
  const staff = p.staff as Record<string, unknown> | null | undefined;
  return {
    id: String(p.id),
    staff_id: String(p.staff_id),
    staff: staff
      ? {
          id: String(staff.id),
          full_name: String(staff.full_name ?? ""),
          first_name: String(staff.first_name ?? ""),
          last_name: String(staff.last_name ?? ""),
        }
      : null,
    pay_year: Number(p.pay_year),
    pay_month: Number(p.pay_month),
    pay_period: String(p.pay_period ?? ""),
    pay_type: p.pay_type as StaffPayrollPayType,
    gross_amount: p.gross_amount != null ? Number(p.gross_amount) : null,
    deductions: Number(p.deductions ?? 0),
    net_amount: Number(p.net_amount),
    payment_date: String(p.payment_date),
    payment_method: p.payment_method as StaffPayrollPaymentMethod,
    created_at: String(p.created_at),
    updated_at: String(p.updated_at),
  };
}

function mapDetail(p: Record<string, unknown>): StaffPayrollPaymentDetail {
  const base = mapListItem(p);
  const cb = p.created_by as Record<string, unknown> | null | undefined;
  return {
    ...base,
    account_holder_name: p.account_holder_name != null ? String(p.account_holder_name) : null,
    bank_name: p.bank_name != null ? String(p.bank_name) : null,
    account_number: p.account_number != null ? String(p.account_number) : null,
    bank_branch: p.bank_branch != null ? String(p.bank_branch) : null,
    iban_swift: p.iban_swift != null ? String(p.iban_swift) : null,
    transfer_reference: p.transfer_reference != null ? String(p.transfer_reference) : null,
    transfer_memo: p.transfer_memo != null ? String(p.transfer_memo) : null,
    internal_notes: p.internal_notes != null ? String(p.internal_notes) : null,
    created_by: cb
      ? { id: String(cb.id), name: String(cb.name ?? "") }
      : null,
  };
}

function defaultForm() {
  return {
    staff_id: "",
    pay_period: new Date().toISOString().slice(0, 7),
    pay_type: "salary" as StaffPayrollPayType,
    gross_amount: "",
    deductions: "0",
    net_amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "bank_transfer" as StaffPayrollPaymentMethod,
    account_holder_name: "",
    bank_name: "",
    account_number: "",
    bank_branch: "",
    iban_swift: "",
    transfer_reference: "",
    transfer_memo: "",
    internal_notes: "",
  };
}

export default function SalaryPayrollPage() {
  const { showNotice } = useAppNotice();
  const [tab, setTab] = useState<TabId>("all");
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StaffPayrollPaymentListItem[]>([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total: 0,
    last_page: 1,
    from: 0,
    to: 0,
    has_more_pages: false,
  });
  const [currentPage, setCurrentPage] = useState(1);

  const [filterPayPeriod, setFilterPayPeriod] = useState("");
  const [filterStaffId, setFilterStaffId] = useState("");
  const [filterPayType, setFilterPayType] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [search, setSearch] = useState("");

  const [byStaffId, setByStaffId] = useState("");
  const [byStaffYear, setByStaffYear] = useState("");
  const [byStaffLoading, setByStaffLoading] = useState(false);
  const [byStaffName, setByStaffName] = useState("");
  const [byStaffRows, setByStaffRows] = useState<StaffPayrollPaymentListItem[]>([]);
  const [byStaffTotals, setByStaffTotals] = useState<Record<string, number>>({});

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewDetail, setViewDetail] = useState<StaffPayrollPaymentDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<StaffPayrollPaymentListItem | null>(null);

  const loadStaffs = useCallback(async () => {
    try {
      const res = await staffsApi.getAll(1, true);
      const list = (res.staffs || []).map((s: Record<string, unknown>) => ({
        id: String(s.id),
        full_name: String(
          s.fullName ?? `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim()
        ),
      }));
      setStaffOptions(list);
    } catch {
      showNotice({ title: "Could not load staff", message: "Try refreshing the page.", variant: "error" });
    }
  }, [showNotice]);

  const loadAll = useCallback(
    async (page: number) => {
      try {
        setLoading(true);
        const params: Parameters<typeof staffPayrollApi.getAll>[0] = { page };
        if (filterPayPeriod) params.pay_period = filterPayPeriod;
        if (filterStaffId) params.staff_id = filterStaffId;
        if (filterPayType) params.pay_type = filterPayType;
        if (filterMethod) params.payment_method = filterMethod;
        if (search.trim()) params.search = search.trim();

        const res = await staffPayrollApi.getAll(params);
        if (res.pagination) {
          setPagination(res.pagination);
          setCurrentPage(res.pagination.current_page);
        }
        setRows((res.payroll_payments || []).map((p: Record<string, unknown>) => mapListItem(p)));
      } catch (e) {
        console.error(e);
        showNotice({
          title: "Load failed",
          message: e instanceof Error ? e.message : "Could not load payroll records.",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [filterPayPeriod, filterStaffId, filterPayType, filterMethod, search, showNotice]
  );

  const loadByStaff = useCallback(async () => {
    if (!byStaffId) {
      setByStaffRows([]);
      setByStaffTotals({});
      setByStaffName("");
      return;
    }
    try {
      setByStaffLoading(true);
      const params =
        byStaffYear && /^\d{4}$/.test(byStaffYear) ? { pay_year: parseInt(byStaffYear, 10) } : undefined;
      const res = await staffPayrollApi.getByStaff(byStaffId, params);
      setByStaffName(res.staff?.full_name ?? "");
      setByStaffRows((res.payroll_payments || []).map((p: Record<string, unknown>) => mapListItem(p)));
      setByStaffTotals(res.totals_by_period || {});
    } catch (e) {
      console.error(e);
      showNotice({
        title: "Load failed",
        message: e instanceof Error ? e.message : "Could not load staff payroll.",
        variant: "error",
      });
    } finally {
      setByStaffLoading(false);
    }
  }, [byStaffId, byStaffYear, showNotice]);

  useEffect(() => {
    loadStaffs();
  }, [loadStaffs]);

  useEffect(() => {
    if (tab !== "all") return;
    loadAll(1);
  }, [tab, filterPayPeriod, filterStaffId, filterPayType, filterMethod, search, loadAll]);

  useEffect(() => {
    if (tab !== "bystaff") return;
    loadByStaff();
  }, [tab, byStaffId, byStaffYear, loadByStaff]);

  const openCreate = (prefillStaffId?: string) => {
    setEditingId(null);
    setFormData({
      ...defaultForm(),
      staff_id: prefillStaffId || "",
    });
    setFormOpen(true);
  };

  const openEdit = async (p: StaffPayrollPaymentListItem) => {
    try {
      setSaving(true);
      const res = await staffPayrollApi.getById(p.id);
      const d = mapDetail(res.payroll_payment as Record<string, unknown>);
      setEditingId(d.id);
      setFormData({
        staff_id: d.staff_id,
        pay_period: d.pay_period,
        pay_type: d.pay_type,
        gross_amount: d.gross_amount != null ? String(d.gross_amount) : "",
        deductions: String(d.deductions),
        net_amount: String(d.net_amount),
        payment_date: d.payment_date,
        payment_method: d.payment_method,
        account_holder_name: d.account_holder_name || "",
        bank_name: d.bank_name || "",
        account_number: d.account_number || "",
        bank_branch: d.bank_branch || "",
        iban_swift: d.iban_swift || "",
        transfer_reference: d.transfer_reference || "",
        transfer_memo: d.transfer_memo || "",
        internal_notes: d.internal_notes || "",
      });
      setFormOpen(true);
    } catch (e) {
      showNotice({
        title: "Could not open record",
        message: e instanceof Error ? e.message : "Try again.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const openView = async (p: StaffPayrollPaymentListItem) => {
    try {
      setViewLoading(true);
      setViewOpen(true);
      const res = await staffPayrollApi.getById(p.id);
      setViewDetail(mapDetail(res.payroll_payment as Record<string, unknown>));
    } catch (e) {
      setViewOpen(false);
      showNotice({
        title: "Could not load details",
        message: e instanceof Error ? e.message : "Try again.",
        variant: "error",
      });
    } finally {
      setViewLoading(false);
    }
  };

  const recalcNet = useCallback(() => {
    const g = parseFloat(formData.gross_amount);
    const d = parseFloat(formData.deductions || "0");
    if (!Number.isNaN(g) && formData.gross_amount.trim() !== "") {
      const n = Math.max(0, g - (Number.isNaN(d) ? 0 : d));
      setFormData((prev) => ({ ...prev, net_amount: n.toFixed(2) }));
    }
  }, [formData.gross_amount, formData.deductions]);

  const buildPayload = () => {
    const net = parseFloat(formData.net_amount);
    if (Number.isNaN(net) || net < 0.01) {
      throw new Error("Enter a valid net amount (minimum 0.01).");
    }
    const deductions = parseFloat(formData.deductions || "0");
    const gross =
      formData.gross_amount.trim() === "" ? null : parseFloat(formData.gross_amount);
    if (gross != null && Number.isNaN(gross)) {
      throw new Error("Gross amount must be a number.");
    }
    if (Number.isNaN(deductions) || deductions < 0) {
      throw new Error("Deductions must be zero or positive.");
    }
    return {
      staff_id: parseInt(formData.staff_id, 10),
      pay_period: formData.pay_period,
      pay_type: formData.pay_type,
      gross_amount: gross,
      deductions: Number.isNaN(deductions) ? 0 : deductions,
      net_amount: net,
      payment_date: formData.payment_date,
      payment_method: formData.payment_method,
      account_holder_name: formData.account_holder_name.trim() || null,
      bank_name: formData.bank_name.trim() || null,
      account_number: formData.account_number.trim() || null,
      bank_branch: formData.bank_branch.trim() || null,
      iban_swift: formData.iban_swift.trim() || null,
      transfer_reference: formData.transfer_reference.trim() || null,
      transfer_memo: formData.transfer_memo.trim() || null,
      internal_notes: formData.internal_notes.trim() || null,
    };
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.staff_id) {
      showNotice({ title: "Staff required", message: "Select a staff member.", variant: "info" });
      return;
    }
    try {
      const payload = buildPayload();
      setSaving(true);
      if (editingId) {
        await staffPayrollApi.update(editingId, payload);
        showNotice({ message: "Payroll record updated", variant: "success" });
      } else {
        await staffPayrollApi.create(payload);
        showNotice({ message: "Payroll record created", variant: "success" });
      }
      setFormOpen(false);
      if (tab === "all") await loadAll(currentPage);
      else await loadByStaff();
    } catch (err) {
      showNotice({
        title: editingId ? "Update failed" : "Create failed",
        message: err instanceof Error ? err.message : "Something went wrong.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await staffPayrollApi.delete(deleteTarget.id);
      showNotice({ message: "Payroll record deleted", variant: "success" });
      setDeleteTarget(null);
      if (tab === "all") await loadAll(currentPage);
      else await loadByStaff();
    } catch (e) {
      showNotice({
        title: "Delete failed",
        message: e instanceof Error ? e.message : "Could not delete.",
        variant: "error",
      });
    }
  };

  const payTypeKeys = useMemo(() => Object.keys(PAY_TYPE_LABELS) as StaffPayrollPayType[], []);
  const methodKeys = useMemo(
    () => Object.keys(PAYMENT_METHOD_LABELS) as StaffPayrollPaymentMethod[],
    []
  );

  const totalsList = useMemo(() => {
    return Object.entries(byStaffTotals)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([period, amount]) => ({ period, amount }));
  }, [byStaffTotals]);

  const displayRows = tab === "all" ? rows : byStaffRows;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Wallet className="h-8 w-8 text-primary" />
            Salary &amp; Payroll
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Record staff compensation by month, capture payout details and bank transfer notes (e.g. stipends
            for research support). View all payments or drill down by staff member.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary shrink-0 gap-2"
          onClick={() => openCreate(tab === "bystaff" && byStaffId ? byStaffId : undefined)}
        >
          <Plus className="h-4 w-4" />
          Record payment
        </button>
      </div>

      <IconTabs className="w-full sm:w-auto">
        <IconTab active={tab === "all"} onClick={() => setTab("all")} icon={List}>
          All records
        </IconTab>
        <IconTab active={tab === "bystaff"} onClick={() => setTab("bystaff")} icon={User}>
          By staff
        </IconTab>
      </IconTabs>

      {tab === "all" && (
        <div className="card border border-border bg-card p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-medium text-muted-foreground">Pay period</span>
              </label>
              <input
                type="month"
                className="input input-bordered input-sm w-full border-border"
                value={filterPayPeriod}
                onChange={(e) => setFilterPayPeriod(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-medium text-muted-foreground">Staff</span>
              </label>
              <select
                className="select select-bordered select-sm w-full border-border"
                value={filterStaffId}
                onChange={(e) => setFilterStaffId(e.target.value)}
              >
                <option value="">All staff</option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-medium text-muted-foreground">Pay type</span>
              </label>
              <select
                className="select select-bordered select-sm w-full border-border"
                value={filterPayType}
                onChange={(e) => setFilterPayType(e.target.value)}
              >
                <option value="">All types</option>
                {payTypeKeys.map((k) => (
                  <option key={k} value={k}>
                    {PAY_TYPE_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-medium text-muted-foreground">Method</span>
              </label>
              <select
                className="select select-bordered select-sm w-full border-border"
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
              >
                <option value="">All methods</option>
                {methodKeys.map((k) => (
                  <option key={k} value={k}>
                    {PAYMENT_METHOD_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control sm:col-span-2">
              <label className="label py-1">
                <span className="label-text text-xs font-medium text-muted-foreground">Search staff</span>
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Name or NIC…"
                  className="input input-bordered input-sm w-full border-border pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "bystaff" && (
        <div className="card border border-border bg-card p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-medium text-muted-foreground">Staff *</span>
              </label>
              <select
                className="select select-bordered w-full border-border"
                value={byStaffId}
                onChange={(e) => setByStaffId(e.target.value)}
              >
                <option value="">Select staff…</option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-medium text-muted-foreground">Filter by year</span>
              </label>
              <input
                type="number"
                min={2000}
                max={2100}
                placeholder="e.g. 2026 (optional)"
                className="input input-bordered w-full border-border"
                value={byStaffYear}
                onChange={(e) => setByStaffYear(e.target.value)}
              />
            </div>
          </div>
          {byStaffId && totalsList.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Net paid by month ({byStaffName})
              </p>
              <div className="flex flex-wrap gap-2">
                {totalsList.map(({ period, amount }) => (
                  <span key={period} className="badge badge-outline badge-sm gap-1 font-mono">
                    {period}: {formatCurrency(amount)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          {loading || (tab === "bystaff" && byStaffLoading) ? (
            <div className="flex justify-center py-16 text-muted-foreground">Loading…</div>
          ) : tab === "bystaff" && !byStaffId ? (
            <div className="py-16 text-center text-muted-foreground">
              Choose a staff member to see their payroll history.
            </div>
          ) : displayRows.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">No payroll records match your filters.</div>
          ) : (
            <table className="table table-zebra w-full min-w-[56rem]">
              <thead>
                <tr className="bg-muted">
                  <th className="font-semibold text-foreground">Staff</th>
                  <th className="font-semibold text-foreground">Period</th>
                  <th className="font-semibold text-foreground">Type</th>
                  <th className="font-semibold text-foreground">Net</th>
                  <th className="font-semibold text-foreground">Method</th>
                  <th className="font-semibold text-foreground">Paid on</th>
                  <th className="text-right font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((p) => (
                  <tr key={p.id} className="hover">
                    <td>
                      <div className="font-semibold text-foreground">{p.staff?.full_name ?? "—"}</div>
                    </td>
                    <td>
                      <span className="font-mono text-sm">{p.pay_period}</span>
                    </td>
                    <td>
                      <span className="badge badge-outline badge-sm">{PAY_TYPE_LABELS[p.pay_type]}</span>
                    </td>
                    <td className="font-semibold text-success">{formatCurrency(p.net_amount)}</td>
                    <td>
                      <span className="text-sm capitalize text-muted-foreground">
                        {PAYMENT_METHOD_LABELS[p.payment_method]}
                      </span>
                    </td>
                    <td className="text-sm text-foreground">
                      {new Date(p.payment_date).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          className="btn btn-outline btn-xs gap-1"
                          onClick={() => openView(p)}
                          title="View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs gap-1"
                          onClick={() => openEdit(p)}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-delete btn-xs gap-1"
                          onClick={() => setDeleteTarget(p)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {tab === "all" && !loading && displayRows.length > 0 && (
          <Pagination
            currentPage={currentPage}
            lastPage={pagination.last_page}
            total={pagination.total}
            from={pagination.from}
            to={pagination.to}
            loading={loading}
            onPageChange={(p) => {
              setCurrentPage(p);
              loadAll(p);
            }}
            itemName="records"
          />
        )}
      </div>

      {formOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-h-[min(92vh,52rem)] w-full max-w-2xl overflow-y-auto border border-border bg-card">
            <div className="mb-4 flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                {editingId ? "Edit payroll record" : "Record staff payment"}
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square"
                aria-label="Close"
                onClick={() => setFormOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitForm} className="space-y-6">
              <div className="admin-form-section space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Who &amp; when</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="form-control sm:col-span-2">
                    <label className="label">
                      <span className="label-text font-medium">Staff *</span>
                    </label>
                    <select
                      className="select select-bordered w-full border-border"
                      required
                      value={formData.staff_id}
                      onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                    >
                      <option value="">Select…</option>
                      {staffOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Pay period (month) *</span>
                    </label>
                    <input
                      type="month"
                      className="input input-bordered w-full border-border"
                      required
                      value={formData.pay_period}
                      onChange={(e) => setFormData({ ...formData, pay_period: e.target.value })}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Payment date *</span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered w-full border-border"
                      required
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    />
                  </div>
                  <div className="form-control sm:col-span-2">
                    <label className="label">
                      <span className="label-text font-medium">Pay type *</span>
                    </label>
                    <select
                      className="select select-bordered w-full border-border"
                      value={formData.pay_type}
                      onChange={(e) =>
                        setFormData({ ...formData, pay_type: e.target.value as StaffPayrollPayType })
                      }
                    >
                      {payTypeKeys.map((k) => (
                        <option key={k} value={k}>
                          {PAY_TYPE_LABELS[k]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="admin-form-section space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Amounts (LKR)</h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Gross (optional)</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="input input-bordered w-full border-border"
                      value={formData.gross_amount}
                      onChange={(e) => setFormData({ ...formData, gross_amount: e.target.value })}
                      onBlur={recalcNet}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Deductions</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="input input-bordered w-full border-border"
                      value={formData.deductions}
                      onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                      onBlur={recalcNet}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Net paid *</span>
                    </label>
                    <input
                      type="number"
                      min={0.01}
                      step="0.01"
                      required
                      className="input input-bordered w-full border-border"
                      value={formData.net_amount}
                      onChange={(e) => setFormData({ ...formData, net_amount: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="admin-form-section space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Payout method</h4>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Method *</span>
                  </label>
                  <select
                    className="select select-bordered w-full border-border"
                    value={formData.payment_method}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payment_method: e.target.value as StaffPayrollPaymentMethod,
                      })
                    }
                  >
                    {methodKeys.map((k) => (
                      <option key={k} value={k}>
                        {PAYMENT_METHOD_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
                {formData.payment_method === "bank_transfer" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="form-control sm:col-span-2">
                      <label className="label">
                        <span className="label-text font-medium">Account holder name *</span>
                      </label>
                      <input
                        className="input input-bordered w-full border-border"
                        required
                        value={formData.account_holder_name}
                        onChange={(e) =>
                          setFormData({ ...formData, account_holder_name: e.target.value })
                        }
                        placeholder="As on bank account"
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Bank name *</span>
                      </label>
                      <input
                        className="input input-bordered w-full border-border"
                        required
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Account number *</span>
                      </label>
                      <input
                        className="input input-bordered w-full border-border font-mono"
                        required
                        value={formData.account_number}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Branch</span>
                      </label>
                      <input
                        className="input input-bordered w-full border-border"
                        value={formData.bank_branch}
                        onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">IBAN / SWIFT</span>
                      </label>
                      <input
                        className="input input-bordered w-full border-border font-mono text-sm"
                        value={formData.iban_swift}
                        onChange={(e) => setFormData({ ...formData, iban_swift: e.target.value })}
                      />
                    </div>
                    <div className="form-control sm:col-span-2">
                      <label className="label">
                        <span className="label-text font-medium">Transfer reference</span>
                      </label>
                      <input
                        className="input input-bordered w-full border-border"
                        value={formData.transfer_reference}
                        onChange={(e) =>
                          setFormData({ ...formData, transfer_reference: e.target.value })
                        }
                        placeholder="Bank reference / transaction ID after payment"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="admin-form-section space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Notes</h4>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Transfer memo / purpose</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered min-h-[5rem] w-full border-border text-sm"
                    value={formData.transfer_memo}
                    onChange={(e) => setFormData({ ...formData, transfer_memo: e.target.value })}
                    placeholder="e.g. March 2026 research stipend — project reference, grant code, or text to include when sending the transfer."
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Internal notes</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered min-h-[4rem] w-full border-border text-sm"
                    value={formData.internal_notes}
                    onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                    placeholder="Not shown on transfer; for admin use only."
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary min-w-[8rem]" disabled={saving}>
                  {saving ? "Saving…" : editingId ? "Save changes" : "Create record"}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop bg-black/50">
            <button type="submit" aria-label="Close" onClick={() => setFormOpen(false)}>
              close
            </button>
          </form>
        </dialog>
      )}

      <RecordDetailModal
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setViewDetail(null);
        }}
        title="Payroll record"
        subtitle={viewDetail?.staff?.full_name}
        size="lg"
      >
        {viewLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : viewDetail ? (
          <div className="space-y-5 text-sm">
            <div>
              <RecordDetailSectionTitle>Period &amp; type</RecordDetailSectionTitle>
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Pay period</dt>
                  <dd className="font-mono font-medium">{viewDetail.pay_period}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Type</dt>
                  <dd>{PAY_TYPE_LABELS[viewDetail.pay_type]}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Payment date</dt>
                  <dd>{new Date(viewDetail.payment_date).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Method</dt>
                  <dd>{PAYMENT_METHOD_LABELS[viewDetail.payment_method]}</dd>
                </div>
              </dl>
            </div>
            <div>
              <RecordDetailSectionTitle>Amounts</RecordDetailSectionTitle>
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Gross</dt>
                  <dd>
                    {viewDetail.gross_amount != null ? formatCurrency(viewDetail.gross_amount) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Deductions</dt>
                  <dd>{formatCurrency(viewDetail.deductions)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Net paid</dt>
                  <dd className="text-lg font-semibold text-success">
                    {formatCurrency(viewDetail.net_amount)}
                  </dd>
                </div>
              </dl>
            </div>
            {viewDetail.payment_method === "bank_transfer" && (
              <div>
                <RecordDetailSectionTitle>Bank / transfer</RecordDetailSectionTitle>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Account holder</dt>
                    <dd>{viewDetail.account_holder_name || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Bank</dt>
                    <dd>{viewDetail.bank_name || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Account number</dt>
                    <dd className="font-mono">{viewDetail.account_number || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Branch</dt>
                    <dd>{viewDetail.bank_branch || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">IBAN / SWIFT</dt>
                    <dd className="font-mono text-xs">{viewDetail.iban_swift || "—"}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Reference</dt>
                    <dd>{viewDetail.transfer_reference || "—"}</dd>
                  </div>
                </dl>
              </div>
            )}
            <div>
              <RecordDetailSectionTitle>Notes</RecordDetailSectionTitle>
              <p className="whitespace-pre-wrap text-foreground">
                {viewDetail.transfer_memo?.trim() ? viewDetail.transfer_memo : "—"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Internal</p>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {viewDetail.internal_notes?.trim() ? viewDetail.internal_notes : "—"}
              </p>
            </div>
            {viewDetail.created_by && (
              <p className="text-xs text-muted-foreground">
                Recorded by {viewDetail.created_by.name}
              </p>
            )}
          </div>
        ) : null}
      </RecordDetailModal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete payroll record?"
        description={
          deleteTarget
            ? `Remove the ${deleteTarget.pay_period} payment for ${deleteTarget.staff?.full_name ?? "staff"}? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
