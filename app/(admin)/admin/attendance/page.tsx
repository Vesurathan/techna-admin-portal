"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ClipboardCheck,
  Scan,
  User,
  UserCog,
  Clock,
  Calendar,
  Filter,
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
  const [activeTab, setActiveTab] = useState<AttendanceType>("student");
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedPerson, setScannedPerson] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
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

  const handleScanBarcode = async () => {
    if (!barcodeInput.trim()) {
      alert("Please enter or scan barcode");
      return;
    }

    try {
      const res = await attendancesApi.searchByBarcode({
        barcode: barcodeInput.trim(),
        type: activeTab,
      });

      if (activeTab === "student") {
        setScannedPerson(res.student);
        setTodayAttendance(res.today_attendance || null);
      } else {
        setScannedPerson(res.staff);
        setTodayAttendance(res.today_attendance || null);
      }
    } catch (error: any) {
      alert(error.message || "Person not found");
      setScannedPerson(null);
      setTodayAttendance(null);
    }
  };

  const handleMarkAttendance = async (action: AttendanceAction) => {
    if (!scannedPerson || !barcodeInput.trim()) {
      alert("Please scan barcode first");
      return;
    }

    try {
      const res = await attendancesApi.markAttendance({
        type: activeTab,
        barcode: barcodeInput.trim(),
        action,
      });

      // Refresh data
      await loadData();
      
      // Update scanned person's today attendance
      if (activeTab === "student") {
        const searchRes = await attendancesApi.searchByBarcode({
          barcode: barcodeInput.trim(),
          type: activeTab,
        });
        setTodayAttendance(searchRes.today_attendance || null);
      } else {
        const searchRes = await attendancesApi.searchByBarcode({
          barcode: barcodeInput.trim(),
          type: activeTab,
        });
        setTodayAttendance(searchRes.today_attendance || null);
      }

      alert(res.message || "Attendance marked successfully");
    } catch (error: any) {
      alert(error.message || "Failed to mark attendance");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await attendancesApi.delete(deleteTarget.id);
      await loadData();
      setDeleteTarget(null);
    } catch (error: any) {
      alert(error.message || "Failed to delete attendance");
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
          <h1 className="text-3xl font-bold text-base-content">Attendance</h1>
          <p className="text-base-content/70 mt-2">Mark and manage student and staff attendance</p>
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
            setCurrentPage(1);
          }}
        >
          Staff attendance
        </IconTab>
      </IconTabs>

      {/* Barcode Scanner Section */}
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body p-4 sm:p-5">
          <h3 className="text-lg font-semibold text-base-content mb-4">Scan Barcode</h3>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="form-control flex-1 min-w-0">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Scan barcode or enter barcode..."
                  className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleScanBarcode();
                    }
                  }}
                  autoFocus
                />
                <button
                  className="btn btn-primary flex-shrink-0"
                  onClick={handleScanBarcode}
                >
                  <Scan className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Scanned Person Info */}
          {scannedPerson && (
            <div className="mt-4 card bg-base-200 border border-base-300 p-4">
              <div className="flex items-start gap-4">
                {scannedPerson.image_path && (
                  <img
                    src={scannedPerson.image_path}
                    alt={scannedPerson.full_name}
                    className="w-16 h-16 rounded-lg object-cover border border-base-300"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-base-content text-lg">
                    {scannedPerson.full_name}
                  </h4>
                  {activeTab === "student" && (
                    <p className="text-sm text-base-content/70">
                      {scannedPerson.admission_number}
                    </p>
                  )}
                  <p className="text-sm text-base-content/70">Barcode: {scannedPerson.barcode}</p>
                </div>
              </div>

              {/* Today's Attendance Status */}
              {todayAttendance ? (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-base-content">Today's Attendance:</span>
                    <span className={`badge ${getStatusBadge(todayAttendance.status)}`}>
                      {getStatusIcon(todayAttendance.status)}
                      <span className="ml-1 capitalize">{todayAttendance.status.replace("_", " ")}</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-base-content/70">Time In:</span>
                      <span className="ml-2 font-semibold text-base-content">
                        {todayAttendance.time_in || "Not marked"}
                      </span>
                    </div>
                    <div>
                      <span className="text-base-content/70">Time Out:</span>
                      <span className="ml-2 font-semibold text-base-content">
                        {todayAttendance.time_out || "Not marked"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-sm text-base-content/70">No attendance marked for today</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 flex gap-2">
                {!todayAttendance || !todayAttendance.time_in ? (
                  <button
                    className="btn btn-success btn-sm gap-2 items-center flex-1"
                    onClick={() => handleMarkAttendance("in")}
                  >
                    <LogIn className="h-4 w-4" />
                    Mark Time In
                  </button>
                ) : null}
                {todayAttendance && todayAttendance.time_in && !todayAttendance.time_out ? (
                  <button
                    className="btn btn-warning btn-sm gap-2 items-center flex-1"
                    onClick={() => handleMarkAttendance("out")}
                  >
                    <LogOut className="h-4 w-4" />
                    Mark Time Out
                  </button>
                ) : null}
              </div>
            </div>
          )}
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
              <input
                type="date"
                className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                placeholder="Select Date"
              />
            </div>
            <div className="form-control flex-shrink-0 sm:w-48">
              <input
                type="date"
                className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                placeholder="Date From"
              />
            </div>
            <div className="form-control flex-shrink-0 sm:w-48">
              <input
                type="date"
                className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                placeholder="Date To"
              />
            </div>
            <div className="form-control flex-shrink-0 sm:w-48">
              <select
                className="select select-bordered w-full border-base-300 focus:border-primary focus:outline-none"
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
                  placeholder="Search by name or barcode..."
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

      {/* Attendance List */}
      <div className="card bg-base-100 border border-base-300 shadow-md">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : attendances.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardCheck className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
              <h3 className="text-xl font-semibold text-base-content mb-2">No attendance records found</h3>
              <p className="text-base-content/70">No attendance matches your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr className="bg-base-200">
                    <th className="text-base-content font-semibold">
                      {activeTab === "student" ? "Student" : "Staff"}
                    </th>
                    <th className="text-base-content font-semibold">Date</th>
                    <th className="text-base-content font-semibold">Time In</th>
                    <th className="text-base-content font-semibold">Time Out</th>
                    <th className="text-base-content font-semibold">Status</th>
                    <th className="text-base-content font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attendances.map((attendance) => (
                    <tr key={attendance.id} className="hover">
                      <td>
                        <div>
                          <div className="font-semibold text-base-content">
                            {attendance.student?.full_name || attendance.staff?.full_name}
                          </div>
                          {attendance.student && (
                            <div className="text-sm text-base-content/70">
                              {attendance.student.admission_number}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="text-sm text-base-content">
                          {new Date(attendance.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {attendance.time_in ? (
                            <>
                              <Clock className="h-4 w-4 text-success" />
                              <span className="font-semibold text-base-content">{attendance.time_in}</span>
                            </>
                          ) : (
                            <span className="text-base-content/50 text-sm">Not marked</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {attendance.time_out ? (
                            <>
                              <Clock className="h-4 w-4 text-warning" />
                              <span className="font-semibold text-base-content">{attendance.time_out}</span>
                            </>
                          ) : (
                            <span className="text-base-content/50 text-sm">Not marked</span>
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
              <p className="text-sm font-medium text-base-content">
                {selectedAttendance.student?.full_name || selectedAttendance.staff?.full_name}
              </p>
              {selectedAttendance.student ? (
                <p className="text-xs text-base-content/55">{selectedAttendance.student.admission_number}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3">
              <div>
                <p className="text-xs text-base-content/60">Time in</p>
                <p className="text-sm font-medium text-base-content">
                  {selectedAttendance.time_in || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-base-content/60">Time out</p>
                <p className="text-sm font-medium text-base-content">
                  {selectedAttendance.time_out || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-base-content/60">Status</p>
                <span className={`badge badge-sm ${getStatusBadge(selectedAttendance.status)}`}>
                  {getStatusIcon(selectedAttendance.status)}
                  <span className="ml-1 capitalize">{selectedAttendance.status.replace("_", " ")}</span>
                </span>
              </div>
              <div>
                <p className="text-xs text-base-content/60">Barcode</p>
                <p className="font-mono text-xs text-base-content">{selectedAttendance.barcode}</p>
              </div>
            </div>

            {selectedAttendance.notes ? (
              <div>
                <RecordDetailSectionTitle>Notes</RecordDetailSectionTitle>
                <p className="text-sm text-base-content leading-snug">{selectedAttendance.notes}</p>
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
            <span className="font-medium text-base-content">
              {deleteTarget?.student?.full_name || deleteTarget?.staff?.full_name}
            </span>
            {" · "}
            <span className="font-medium text-base-content">
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
