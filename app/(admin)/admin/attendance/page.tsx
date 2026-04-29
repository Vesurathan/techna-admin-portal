"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ClipboardCheck,
  Scan,
  Camera,
  User,
  UserCog,
  Clock,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  LogOut,
  LogIn,
  RotateCcw,
  Trash2,
  Eye,
} from "lucide-react";
import { attendancesApi } from "@/app/lib/api";
import Pagination from "@/app/components/Pagination";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { RecordDetailModal, RecordDetailSectionTitle } from "@/app/components/RecordDetailModal";
import { IconTab, IconTabs } from "@/app/components/IconTabs";
import { useAppNotice } from "@/app/contexts/AppNoticeContext";
import { QrScannerDialog } from "@/app/components/QrScannerDialog";

type AttendanceType = "student" | "staff";
type AttendanceAction = "in" | "out";

interface Attendance {
  id: string;
  type: AttendanceType;
  student?: {
    id: string;
    admission_number: string;
    full_name: string;
    barcode: string;
  };
  staff?: {
    id: string;
    full_name: string;
    barcode: string;
  };
  date: string;
  time_in?: string | null;
  time_out?: string | null;
  status: "present" | "absent" | "late" | "early_leave";
  notes?: string | null;
  barcode: string;
  created_at: string;
  updated_at: string;
}

export default function AttendancePage() {
  const { showNotice } = useAppNotice();
  const [activeTab, setActiveTab] = useState<AttendanceType>("student");
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedPerson, setScannedPerson] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<{
    period_days: number;
    since: string;
    total_records: number;
    by_status: Record<string, number>;
  } | null>(null);
  const [paymentRecords, setPaymentRecords] = useState<any[]>([]);
  const [scanDetailTab, setScanDetailTab] = useState<"attendance" | "payments">("attendance");
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Attendance | null>(null);

  // Filters
  const [filterDate, setFilterDate] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
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

  const loadData = useCallback(async (page: number = currentPage) => {
    try {
      setLoading(true);
      const attendancesRes = await attendancesApi.getAll({
        page,
        type: activeTab,
        date: filterDate || undefined,
        date_from: filterDateFrom || undefined,
        date_to: filterDateTo || undefined,
        status: filterStatus as any || undefined,
        search: search || undefined,
      });

      if (attendancesRes.pagination) {
        setPagination(attendancesRes.pagination);
        setCurrentPage(attendancesRes.pagination.current_page);
      }

      const mappedAttendances: Attendance[] = (attendancesRes.attendances || []).map((a: any) => ({
        id: a.id.toString(),
        type: a.type,
        student: a.student,
        staff: a.staff,
        date: a.date,
        time_in: a.time_in,
        time_out: a.time_out,
        status: a.status,
        notes: a.notes,
        barcode: a.barcode,
        created_at: a.created_at,
        updated_at: a.updated_at,
      }));

      setAttendances(mappedAttendances);
    } catch (error) {
      console.error("Failed to load attendances:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, activeTab, filterDate, filterDateFrom, filterDateTo, filterStatus, search]);

  useEffect(() => {
    loadData(1);
  }, [activeTab, filterDate, filterDateFrom, filterDateTo, filterStatus, search]);

  const applyScanResponse = (res: any) => {
    if (activeTab === "student") {
      setScannedPerson(res.student);
      if (res.student?.barcode) {
        setBarcodeInput(String(res.student.barcode));
      }
      setTodayAttendance(res.today_attendance || null);
      setAttendanceHistory(res.attendance_history || []);
      setAttendanceStats(res.attendance_stats || null);
      setPaymentRecords(res.payment_records || []);
    } else {
      setScannedPerson(res.staff);
      if (res.staff?.barcode) {
        setBarcodeInput(String(res.staff.barcode));
      }
      setTodayAttendance(res.today_attendance || null);
      setAttendanceHistory(res.attendance_history || []);
      setAttendanceStats(res.attendance_stats || null);
      setPaymentRecords([]);
    }
    setScanDetailTab("attendance");
  };

  const handleScanBarcode = async (raw?: string) => {
    const value = (raw ?? barcodeInput).trim();
    if (!value) {
      showNotice({
        title: "QR / ID required",
        message: "Scan a QR code, use the camera, or paste the attendance ID.",
        variant: "info",
      });
      return;
    }

    try {
      const res = await attendancesApi.searchByBarcode({
        barcode: value,
        type: activeTab,
      });
      applyScanResponse(res);
    } catch (error: any) {
      showNotice({
        message: error.message || "Person not found",
        variant: "error",
      });
      setScannedPerson(null);
      setTodayAttendance(null);
      setAttendanceHistory([]);
      setAttendanceStats(null);
      setPaymentRecords([]);
    }
  };

  const handleMarkAttendance = async (action: AttendanceAction) => {
    if (!scannedPerson || !barcodeInput.trim()) {
      showNotice({
        title: "Scan required",
        message: "Scan a QR code or look up the person first.",
        variant: "info",
      });
      return;
    }

    try {
      const res = await attendancesApi.markAttendance({
        type: activeTab,
        barcode: barcodeInput.trim(),
        action,
      });

      await loadData();

      const searchRes = await attendancesApi.searchByBarcode({
        barcode: barcodeInput.trim(),
        type: activeTab,
      });
      applyScanResponse(searchRes);

      showNotice({
        message: res.message || "Attendance marked successfully",
        variant: "success",
      });
    } catch (error: any) {
      showNotice({
        message: error.message || "Failed to mark attendance",
        variant: "error",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await attendancesApi.delete(deleteTarget.id);
      await loadData();
      setDeleteTarget(null);
    } catch (error: any) {
      showNotice({
        message: error.message || "Failed to delete attendance",
        variant: "error",
      });
    }
  };

  const handleResetFilters = () => {
    setFilterDate("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterStatus("");
    setSearch("");
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      present: "badge-success",
      absent: "badge-error",
      late: "badge-warning",
      early_leave: "badge-warning",
    };
    return badges[status as keyof typeof badges] || "badge-outline";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="h-4 w-4" />;
      case "absent":
        return <XCircle className="h-4 w-4" />;
      case "late":
      case "early_leave":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Attendance</h1>
          <p className="text-muted-foreground mt-2">Mark and manage student and staff attendance</p>
        </div>
      </div>

      <IconTabs>
        <IconTab
          active={activeTab === "student"}
          icon={User}
          onClick={() => {
            setActiveTab("student");
            setBarcodeInput("");
            setScannedPerson(null);
            setTodayAttendance(null);
            setAttendanceHistory([]);
            setAttendanceStats(null);
            setPaymentRecords([]);
            setScanDetailTab("attendance");
            setCurrentPage(1);
          }}
        >
          Student attendance
        </IconTab>
        <IconTab
          active={activeTab === "staff"}
          icon={UserCog}
          onClick={() => {
            setActiveTab("staff");
            setBarcodeInput("");
            setScannedPerson(null);
            setTodayAttendance(null);
            setAttendanceHistory([]);
            setAttendanceStats(null);
            setPaymentRecords([]);
            setScanDetailTab("attendance");
            setCurrentPage(1);
          }}
        >
          Staff attendance
        </IconTab>
      </IconTabs>

      {/* QR / ID scan */}
      <div className="card border border-border bg-card shadow-sm">
        <div className="card-body p-4 sm:p-5">
          <h3 className="mb-1 text-lg font-semibold text-foreground">Scan QR code</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Use the device camera or a USB scanner. QR may contain the plain attendance ID or JSON like{" "}
            <code className="rounded bg-muted px-1 text-xs">{`{"barcode":"…"}`}</code>.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="form-control min-w-0 flex-1">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="QR payload or attendance ID…"
                  className="input input-bordered w-full border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void handleScanBarcode();
                    }
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-primary shrink-0"
                  title="Look up"
                  onClick={() => void handleScanBarcode()}
                >
                  <Scan className="h-5 w-5" />
                </button>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-outline gap-2 sm:shrink-0"
              onClick={() => setQrScannerOpen(true)}
            >
              <Camera className="h-5 w-5" />
              Use camera
            </button>
          </div>

          {scannedPerson ? (
            <div className="mt-4 space-y-4 rounded-xl border border-border bg-muted/50 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {scannedPerson.image_path ? (
                  <img
                    src={scannedPerson.image_path}
                    alt={scannedPerson.full_name}
                    className="h-24 w-24 shrink-0 rounded-xl border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-muted text-muted-foreground">
                    <User className="h-10 w-10" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-xl font-bold text-foreground">{scannedPerson.full_name}</h4>
                  {activeTab === "student" ? (
                    <p className="text-sm text-muted-foreground">
                      Admission: <span className="font-medium text-foreground">{scannedPerson.admission_number}</span>
                      {" · "}
                      Status: <span className="font-medium text-foreground">{scannedPerson.status}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Status: <span className="font-medium text-foreground">{scannedPerson.status}</span>
                    </p>
                  )}
                  <p className="font-mono text-xs text-muted-foreground">ID: {scannedPerson.barcode}</p>
                </div>
              </div>

              {activeTab === "student" ? (
                <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</p>
                    <p className="text-sm text-foreground">Personal: {scannedPerson.personal_phone || "—"}</p>
                    <p className="text-sm text-foreground">Parent: {scannedPerson.parent_phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profile</p>
                    <p className="text-sm text-foreground">DOB: {scannedPerson.date_of_birth || "—"}</p>
                    <p className="text-sm text-foreground">Gender: {scannedPerson.gender || "—"}</p>
                    <p className="text-sm text-foreground">NIC: {scannedPerson.nic_number || "—"}</p>
                    <p className="text-sm text-foreground">Blood: {scannedPerson.blood_group || "—"}</p>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Address</p>
                    <p className="text-sm leading-snug text-foreground">{scannedPerson.address || "—"}</p>
                    {scannedPerson.school_name ? (
                      <p className="mt-1 text-sm text-muted-foreground">School: {scannedPerson.school_name}</p>
                    ) : null}
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modules</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(scannedPerson.modules || []).length ? (
                        (scannedPerson.modules as { id: number; name: string }[]).map((m) => (
                          <span key={m.id} className="badge badge-outline">
                            {m.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fees</p>
                    <p className="text-sm text-foreground">
                      Module total: {Number(scannedPerson.module_total_amount ?? 0).toFixed(2)} · Paid:{" "}
                      {Number(scannedPerson.paid_amount ?? 0).toFixed(2)} · Type:{" "}
                      {scannedPerson.payment_type || "—"}
                    </p>
                  </div>
                  {scannedPerson.medical_notes ? (
                    <div className="sm:col-span-2 lg:col-span-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Medical</p>
                      <p className="text-sm text-foreground">{scannedPerson.medical_notes}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</p>
                    <p className="text-sm text-foreground">Secondary: {scannedPerson.secondary_phone || "—"}</p>
                    <p className="text-sm text-foreground">NIC: {scannedPerson.nic_number || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profile</p>
                    <p className="text-sm text-foreground">DOB: {scannedPerson.date_of_birth || "—"}</p>
                    <p className="text-sm text-foreground">Qualifications: {scannedPerson.qualifications || "—"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modules</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(scannedPerson.modules || []).length ? (
                        (scannedPerson.modules as { id: number; name: string }[]).map((m) => (
                          <span key={m.id} className="badge badge-outline">
                            {m.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today</p>
                {todayAttendance ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`badge ${getStatusBadge(todayAttendance.status)}`}>
                        {getStatusIcon(todayAttendance.status)}
                        <span className="ml-1 capitalize">{todayAttendance.status.replace("_", " ")}</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">In:</span>{" "}
                        <span className="font-semibold text-foreground">
                          {todayAttendance.time_in || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Out:</span>{" "}
                        <span className="font-semibold text-foreground">
                          {todayAttendance.time_out || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No attendance for today yet.</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {!todayAttendance || !todayAttendance.time_in ? (
                    <button
                      type="button"
                      className="btn btn-success btn-sm flex flex-1 items-center justify-center gap-2 sm:flex-none"
                      onClick={() => handleMarkAttendance("in")}
                    >
                      <LogIn className="h-4 w-4" />
                      Mark time in
                    </button>
                  ) : null}
                  {todayAttendance && todayAttendance.time_in && !todayAttendance.time_out ? (
                    <button
                      type="button"
                      className="btn btn-warning btn-sm flex flex-1 items-center justify-center gap-2 sm:flex-none"
                      onClick={() => handleMarkAttendance("out")}
                    >
                      <LogOut className="h-4 w-4" />
                      Mark time out
                    </button>
                  ) : null}
                </div>
              </div>

              {attendanceStats ? (
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-sm font-semibold text-foreground">
                    Attendance summary (last {attendanceStats.period_days} days)
                  </p>
                  <p className="text-xs text-muted-foreground">Since {attendanceStats.since}</p>
                  <p className="mt-2 text-sm text-foreground">
                    Total records: <strong>{attendanceStats.total_records}</strong>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(attendanceStats.by_status || {}).map(([st, n]) => (
                      <span key={st} className="badge badge-ghost capitalize">
                        {st.replace("_", " ")}: {n}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="border-t border-border pt-2">
                <div className="flex gap-2 border-b border-border pb-2">
                  <button
                    type="button"
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                      scanDetailTab === "attendance"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => setScanDetailTab("attendance")}
                  >
                    Attendance log
                  </button>
                  {activeTab === "student" ? (
                    <button
                      type="button"
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                        scanDetailTab === "payments"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                      onClick={() => setScanDetailTab("payments")}
                    >
                      Payments
                    </button>
                  ) : null}
                </div>
                {scanDetailTab === "attendance" ? (
                  <div className="max-h-64 overflow-auto pt-3">
                    {attendanceHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No rows in this period.</p>
                    ) : (
                      <table className="table table-zebra table-xs w-full">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>In</th>
                            <th>Out</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceHistory.map((row: Attendance) => (
                            <tr key={row.id}>
                              <td>{new Date(row.date).toLocaleDateString()}</td>
                              <td>{row.time_in || "—"}</td>
                              <td>{row.time_out || "—"}</td>
                              <td className="capitalize">{row.status.replace("_", " ")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ) : (
                  <div className="max-h-64 overflow-auto pt-3">
                    {paymentRecords.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No payment rows returned.</p>
                    ) : (
                      <table className="table table-zebra table-xs w-full">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Module</th>
                            <th>Paid</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentRecords.map((p: any) => (
                            <tr key={p.id}>
                              <td>{p.payment_date || "—"}</td>
                              <td className="max-w-[120px] truncate" title={p.module_name}>
                                {p.module_name || "—"}
                              </td>
                              <td>{Number(p.paid_amount ?? 0).toFixed(2)}</td>
                              <td className="capitalize">{p.status || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <QrScannerDialog
        open={qrScannerOpen}
        onOpenChange={setQrScannerOpen}
        onScan={(text) => void handleScanBarcode(text)}
      />

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
              <input
                type="date"
                className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                placeholder="Select Date"
              />
            </div>
            <div className="form-control flex-shrink-0 sm:w-48">
              <input
                type="date"
                className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                placeholder="Date From"
              />
            </div>
            <div className="form-control flex-shrink-0 sm:w-48">
              <input
                type="date"
                className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                placeholder="Date To"
              />
            </div>
            <div className="form-control flex-shrink-0 sm:w-48">
              <select
                className="select select-bordered w-full border-border focus:border-primary focus:outline-none"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="early_leave">Early Leave</option>
                <option value="absent">Absent</option>
              </select>
            </div>
            <div className="form-control flex-1 min-w-0">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Search by name or ID…"
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

      {/* Attendance List */}
      <div className="card bg-card border border-border shadow-md overflow-hidden">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : attendances.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardCheck className="h-16 w-16 mx-auto text-foreground/30 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No attendance records found</h3>
              <p className="text-muted-foreground">No attendance matches your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-foreground font-semibold">
                      {activeTab === "student" ? "Student" : "Staff"}
                    </th>
                    <th className="text-foreground font-semibold">Date</th>
                    <th className="text-foreground font-semibold">Time In</th>
                    <th className="text-foreground font-semibold">Time Out</th>
                    <th className="text-foreground font-semibold">Status</th>
                    <th className="text-foreground font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attendances.map((attendance) => (
                    <tr key={attendance.id} className="hover">
                      <td>
                        <div>
                          <div className="font-semibold text-foreground">
                            {attendance.student?.full_name || attendance.staff?.full_name}
                          </div>
                          {attendance.student && (
                            <div className="text-sm text-muted-foreground">
                              {attendance.student.admission_number}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="text-sm text-foreground">
                          {new Date(attendance.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {attendance.time_in ? (
                            <>
                              <Clock className="h-4 w-4 text-success" />
                              <span className="font-semibold text-foreground">{attendance.time_in}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not marked</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {attendance.time_out ? (
                            <>
                              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                              <span className="font-semibold text-foreground">{attendance.time_out}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not marked</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(attendance.status)}`}>
                          {getStatusIcon(attendance.status)}
                          <span className="ml-1 capitalize">{attendance.status.replace("_", " ")}</span>
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            className="btn btn-outline btn-sm gap-1.5 items-center px-3"
                            onClick={() => {
                              setSelectedAttendance(attendance);
                              setShowViewModal(true);
                            }}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline">View</span>
                          </button>
                          <button
                            className="btn btn-delete btn-sm gap-1.5 items-center px-3"
                            onClick={() => setDeleteTarget(attendance)}
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
        {!loading && attendances.length > 0 && (
          <Pagination
            currentPage={currentPage}
            lastPage={pagination.last_page}
            total={pagination.total}
            from={pagination.from}
            to={pagination.to}
            loading={loading}
            onPageChange={loadData}
            itemName="attendances"
          />
        )}
      </div>

      <RecordDetailModal
        open={showViewModal && !!selectedAttendance}
        title="Attendance"
        subtitle={
          selectedAttendance
            ? new Date(selectedAttendance.date).toLocaleDateString()
            : undefined
        }
        onClose={() => {
          setShowViewModal(false);
          setSelectedAttendance(null);
        }}
        size="sm"
      >
        {selectedAttendance && (
          <div className="space-y-4">
            <RecordDetailSectionTitle>
              {activeTab === "student" ? "Student" : "Staff"}
            </RecordDetailSectionTitle>
            <div>
              <p className="text-sm font-medium text-foreground">
                {selectedAttendance.student?.full_name || selectedAttendance.staff?.full_name}
              </p>
              {selectedAttendance.student ? (
                <p className="text-xs text-foreground/55">{selectedAttendance.student.admission_number}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Time in</p>
                <p className="text-sm font-medium text-foreground">
                  {selectedAttendance.time_in || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Time out</p>
                <p className="text-sm font-medium text-foreground">
                  {selectedAttendance.time_out || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <span className={`badge badge-sm ${getStatusBadge(selectedAttendance.status)}`}>
                  {getStatusIcon(selectedAttendance.status)}
                  <span className="ml-1 capitalize">{selectedAttendance.status.replace("_", " ")}</span>
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Scan ID</p>
                <p className="font-mono text-xs text-foreground">{selectedAttendance.barcode}</p>
              </div>
            </div>

            {selectedAttendance.notes ? (
              <div>
                <RecordDetailSectionTitle>Notes</RecordDetailSectionTitle>
                <p className="text-sm text-foreground leading-snug">{selectedAttendance.notes}</p>
              </div>
            ) : null}
          </div>
        )}
      </RecordDetailModal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete record?"
        description={
          <>
            <span className="font-medium text-foreground">
              {deleteTarget?.student?.full_name || deleteTarget?.staff?.full_name}
            </span>
            {" · "}
            <span className="font-medium text-foreground">
              {deleteTarget ? new Date(deleteTarget.date).toLocaleDateString() : ""}
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
