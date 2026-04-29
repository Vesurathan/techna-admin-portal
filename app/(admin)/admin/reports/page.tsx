"use client";

import { useEffect, useLayoutEffect, useState, useCallback, useMemo } from "react";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  BookOpen,
  ClipboardCheck,
  Filter,
  RotateCcw,
  BarChart3,
} from "lucide-react";
import { reportsApi, modulesApi, paymentsApi, type ReportPagination } from "@/app/lib/api";
import { Module } from "@/app/types/module";
import { formatCurrency } from "@/app/utils/currency";
import { IconTab, IconTabs } from "@/app/components/IconTabs";
import Pagination from "@/app/components/Pagination";
import { useAppNotice } from "@/app/contexts/AppNoticeContext";

const REPORTS_PER_PAGE = 10;

type ReportType = "attendance" | "financial" | "enrollment" | "performance";

export default function ReportsPage() {
  const { showNotice } = useAppNotice();
  const [activeReport, setActiveReport] = useState<ReportType>("attendance");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);

  // Common filters
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  // Specific filters
  const [filterType, setFilterType] = useState<"student" | "staff" | "">("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBatch, setFilterBatch] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [modules, setModules] = useState<Module[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [reportPage, setReportPage] = useState(1);
  const [reportPagination, setReportPagination] = useState<ReportPagination | null>(null);
  const [exporting, setExporting] = useState(false);

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

  useEffect(() => {
    loadModules();
    loadBatches();
  }, []);

  const reportFilterKey = useMemo(
    () =>
      [
        activeReport,
        filterDateFrom,
        filterDateTo,
        filterMonth,
        filterYear,
        filterType,
        filterStatus,
        filterBatch,
        filterModule,
      ].join("|"),
    [
      activeReport,
      filterDateFrom,
      filterDateTo,
      filterMonth,
      filterYear,
      filterType,
      filterStatus,
      filterBatch,
      filterModule,
    ]
  );

  useLayoutEffect(() => {
    setReportPage(1);
  }, [reportFilterKey]);

  const loadModules = async () => {
    try {
      const res = await modulesApi.getAll(1);
      const mappedModules: Module[] = (res.modules || []).map((m: any) => ({
        id: m.id.toString(),
        name: m.name,
        category: m.category,
        subModulesCount: m.sub_modules_count ?? m.subModulesCount ?? 0,
        amount: Number(m.amount ?? 0),
        staffs: [],
      }));
      setModules(mappedModules);
    } catch (error) {
      console.error("Failed to load modules:", error);
    }
  };

  const loadBatches = async () => {
    try {
      const res = await paymentsApi.getBatches();
      setBatches(res.batches || []);
    } catch (error) {
      console.error("Failed to load batches:", error);
    }
  };

  const loadReport = useCallback(async () => {
    setLoading(true);
    setReportPagination(null);
    try {
      let data: any;

      const commonParams: Record<string, string | number> = {
        page: reportPage,
        per_page: REPORTS_PER_PAGE,
      };
      if (filterDateFrom) commonParams.date_from = filterDateFrom;
      if (filterDateTo) commonParams.date_to = filterDateTo;
      if (filterMonth) commonParams.month = filterMonth;
      if (filterYear) {
        const y = parseInt(filterYear, 10);
        if (!Number.isNaN(y)) commonParams.year = y;
      }

      switch (activeReport) {
        case "attendance": {
          const attendanceParams = { ...commonParams };
          if (filterType) attendanceParams.type = filterType;
          if (filterStatus) attendanceParams.status = filterStatus;
          data = await reportsApi.getAttendanceReport(attendanceParams);
          break;
        }

        case "financial": {
          const financialParams = { ...commonParams };
          if (filterBatch) financialParams.batch = filterBatch;
          if (filterModule) financialParams.module_id = filterModule;
          data = await reportsApi.getFinancialReport(financialParams);
          break;
        }

        case "enrollment": {
          const enrollmentParams = { ...commonParams };
          if (filterBatch) enrollmentParams.batch = filterBatch;
          if (filterStatus) enrollmentParams.status = filterStatus;
          data = await reportsApi.getEnrollmentReport(enrollmentParams);
          break;
        }

        case "performance": {
          const performanceParams = { ...commonParams };
          if (filterBatch) performanceParams.batch = filterBatch;
          if (filterModule) performanceParams.module_id = filterModule;
          data = await reportsApi.getPerformanceReport(performanceParams);
          break;
        }
      }

      setReportData(data);
      setSummary(data.summary || {});
      setReportPagination(data.pagination ?? null);
    } catch (error) {
      console.error("Failed to load report:", error);
      showNotice({
        message: "Failed to load report data",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [
    activeReport,
    filterDateFrom,
    filterDateTo,
    filterMonth,
    filterYear,
    filterType,
    filterStatus,
    filterBatch,
    filterModule,
    reportPage,
  ]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleReportPageChange = (page: number) => {
    setReportPage(page);
  };

  const buildExportCommonParams = () => {
    const common: Record<string, string | number> = {};
    if (filterDateFrom) common.date_from = filterDateFrom;
    if (filterDateTo) common.date_to = filterDateTo;
    if (filterMonth) common.month = filterMonth;
    if (filterYear) {
      const y = parseInt(filterYear, 10);
      if (!Number.isNaN(y)) common.year = y;
    }
    return common;
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const commonParams = buildExportCommonParams();

      switch (activeReport) {
        case "attendance": {
          const attendanceParams = { ...commonParams };
          if (filterType) attendanceParams.type = filterType;
          if (filterStatus) attendanceParams.status = filterStatus;
          await reportsApi.exportAttendanceReport(attendanceParams);
          break;
        }
        case "financial": {
          const financialParams = { ...commonParams };
          if (filterBatch) financialParams.batch = filterBatch;
          if (filterModule) financialParams.module_id = filterModule;
          await reportsApi.exportFinancialReport(financialParams);
          break;
        }
        case "enrollment": {
          const enrollmentParams = { ...commonParams };
          if (filterBatch) enrollmentParams.batch = filterBatch;
          if (filterStatus) enrollmentParams.status = filterStatus;
          await reportsApi.exportEnrollmentReport(enrollmentParams);
          break;
        }
        case "performance": {
          const performanceParams = { ...commonParams };
          if (filterBatch) performanceParams.batch = filterBatch;
          if (filterModule) performanceParams.module_id = filterModule;
          await reportsApi.exportPerformanceReport(performanceParams);
          break;
        }
      }
      showNotice({
        title: "Download complete",
        message: "Report downloaded successfully.",
        variant: "success",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to download report";
      showNotice({ message, variant: "error" });
    } finally {
      setExporting(false);
    }
  };

  const handleResetFilters = () => {
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterMonth("");
    setFilterYear("");
    setFilterType("");
    setFilterStatus("");
    setFilterBatch("");
    setFilterModule("");
  };

  const renderAttendanceReport = () => {
    const attendances = reportData?.attendances || [];

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card bg-card border border-border shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Records</p>
                  <p className="text-2xl font-bold text-foreground">{summary?.total_records || 0}</p>
                </div>
                <ClipboardCheck className="h-8 w-8 text-primary" />
              </div>
            </div>
          </div>
          <div className="card bg-card border border-border shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Present</p>
                  <p className="text-2xl font-bold text-success">{summary?.present || 0}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-success" />
              </div>
            </div>
          </div>
          <div className="card bg-card border border-border shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Late</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary?.late || 0}</p>
                </div>
                <Calendar className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>
          <div className="card bg-card border border-border shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Absent</p>
                  <p className="text-2xl font-bold text-destructive">{summary?.absent || 0}</p>
                </div>
                <Users className="h-8 w-8 text-destructive" />
              </div>
            </div>
          </div>
        </div>

        {/* Report Table */}
        <div className="card bg-card border border-border shadow-md overflow-hidden">
          <div className="card-body p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : attendances.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardCheck className="h-16 w-16 mx-auto text-foreground/30 mb-4" />
                <p className="text-muted-foreground">No attendance records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr className="bg-muted">
                      <th>Type</th>
                      <th>Name</th>
                      <th>Admission #</th>
                      <th>Date</th>
                      <th>Time In</th>
                      <th>Time Out</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendances.map((attendance: any) => (
                      <tr key={attendance.id} className="hover">
                        <td>
                          <span className="badge badge-outline badge-sm capitalize">
                            {attendance.type}
                          </span>
                        </td>
                        <td className="font-semibold text-foreground">{attendance.name}</td>
                        <td className="text-muted-foreground">
                          {attendance.admission_number || "N/A"}
                        </td>
                        <td>{new Date(attendance.date).toLocaleDateString()}</td>
                        <td>{attendance.time_in || "N/A"}</td>
                        <td>{attendance.time_out || "N/A"}</td>
                        <td>
                          <span
                            className={`badge badge-sm ${
                              attendance.status === "present"
                                ? "badge-success"
                                : attendance.status === "late"
                                ? "badge-warning"
                                : "badge-error"
                            }`}
                          >
                            {attendance.status.replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {!loading && attendances.length > 0 && reportPagination ? (
            <Pagination
              currentPage={reportPagination.current_page}
              lastPage={reportPagination.last_page}
              total={reportPagination.total}
              from={reportPagination.from}
              to={reportPagination.to}
              loading={loading}
              onPageChange={handleReportPageChange}
              itemName="records"
            />
          ) : null}
        </div>
      </div>
    );
  };

  const renderFinancialReport = () => {
    const payments = reportData?.payments || [];

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card bg-card border border-border shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Payments</p>
                  <p className="text-2xl font-bold text-foreground">{summary?.total_payments || 0}</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </div>
          </div>
          <div className="card bg-card border border-border shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(summary?.total_amount || 0)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-success" />
              </div>
            </div>
          </div>
          <div className="card bg-card border border-border shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(summary?.total_paid || 0)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </div>
          </div>
          <div className="card bg-card border border-border shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Discount</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(summary?.total_discount || 0)}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Report Table */}
        <div className="card bg-card border border-border shadow-md overflow-hidden">
          <div className="card-body p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-16 w-16 mx-auto text-foreground/30 mb-4" />
                <p className="text-muted-foreground">No payment records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr className="bg-muted">
                      <th>Receipt #</th>
                      <th>Student</th>
                      <th>Batch</th>
                      <th>Module</th>
                      <th>Amount</th>
                      <th>Discount</th>
                      <th>Paid</th>
                      <th>Method</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment: any) => (
                      <tr key={payment.id} className="hover">
                        <td className="font-mono text-sm">{payment.receipt_number || "N/A"}</td>
                        <td>
                          <div>
                            <div className="font-semibold text-foreground">{payment.student_name}</div>
                            <div className="text-sm text-muted-foreground">{payment.admission_number}</div>
                          </div>
                        </td>
                        <td>{payment.batch}</td>
                        <td>{payment.module}</td>
                        <td className="font-semibold">{formatCurrency(payment.amount)}</td>
                        <td className="text-destructive">
                          {payment.discount_amount > 0 ? formatCurrency(payment.discount_amount) : "-"}
                        </td>
                        <td className="font-semibold text-success">{formatCurrency(payment.paid_amount)}</td>
                        <td>
                          <span className="badge badge-outline badge-sm capitalize">
                            {payment.payment_method}
                          </span>
                        </td>
                        <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {!loading && payments.length > 0 && reportPagination ? (
            <Pagination
              currentPage={reportPagination.current_page}
              lastPage={reportPagination.last_page}
              total={reportPagination.total}
              from={reportPagination.from}
              to={reportPagination.to}
              loading={loading}
              onPageChange={handleReportPageChange}
              itemName="payments"
            />
          ) : null}
        </div>
      </div>
    );
  };

  const renderEnrollmentReport = () => {
    const students = reportData?.students || [];
    const moduleEnrollments = reportData?.module_enrollments || [];

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card bg-card border border-border shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold text-foreground">{summary?.total_students || 0}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </div>
          </div>
          <div className="card bg-card border border-border shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(summary?.total_revenue || 0)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-success" />
              </div>
            </div>
          </div>
          <div className="card bg-card border border-border shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Module Fees</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(summary?.total_module_fees || 0)}
                  </p>
                </div>
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
            </div>
          </div>
          <div className="card bg-card border border-border shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Students</p>
                  <p className="text-2xl font-bold text-success">
                    {summary?.by_status?.active || 0}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-success" />
              </div>
            </div>
          </div>
        </div>

        {/* Module Enrollments */}
        {moduleEnrollments.length > 0 && (
          <div className="card bg-card border border-border shadow-sm">
            <div className="card-body">
              <h3 className="text-lg font-semibold text-foreground mb-4">Module Enrollments</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {moduleEnrollments.map((mod: any, idx: number) => (
                  <div key={idx} className="card bg-muted border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{mod.module_name}</p>
                        <p className="text-sm text-muted-foreground">{mod.count} students</p>
                      </div>
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Report Table */}
        <div className="card bg-card border border-border shadow-md overflow-hidden">
          <div className="card-body p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto text-foreground/30 mb-4" />
                <p className="text-muted-foreground">No student records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr className="bg-muted">
                      <th>Admission #</th>
                      <th>Name</th>
                      <th>Batch</th>
                      <th>Status</th>
                      <th>Payment Type</th>
                      <th>Admission Fee</th>
                      <th>Module Fees</th>
                      <th>Paid Amount</th>
                      <th>Modules</th>
                      <th>Enrolled Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student: any) => (
                      <tr key={student.id} className="hover">
                        <td className="font-mono text-sm">{student.admission_number}</td>
                        <td className="font-semibold text-foreground">{student.full_name}</td>
                        <td>{student.batch}</td>
                        <td>
                          <span className="badge badge-outline badge-sm capitalize">
                            {student.status}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-outline badge-sm">
                            {student.payment_type.replace("_", " ")}
                          </span>
                        </td>
                        <td>{formatCurrency(student.admission_fee)}</td>
                        <td>{formatCurrency(student.module_total_amount)}</td>
                        <td className="font-semibold text-success">
                          {formatCurrency(student.paid_amount)}
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {student.modules.slice(0, 2).map((mod: string, idx: number) => (
                              <span key={idx} className="badge badge-primary badge-xs">
                                {mod}
                              </span>
                            ))}
                            {student.modules.length > 2 && (
                              <span className="badge badge-ghost badge-xs">
                                +{student.modules.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{new Date(student.enrolled_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {!loading && students.length > 0 && reportPagination ? (
            <Pagination
              currentPage={reportPagination.current_page}
              lastPage={reportPagination.last_page}
              total={reportPagination.total}
              from={reportPagination.from}
              to={reportPagination.to}
              loading={loading}
              onPageChange={handleReportPageChange}
              itemName="students"
            />
          ) : null}
        </div>
      </div>
    );
  };

  const renderPerformanceReport = () => {
    const questionnaires = reportData?.questionnaires || [];

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card bg-card border border-border shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Questionnaires</p>
                  <p className="text-2xl font-bold text-foreground">
                    {summary?.total_questionnaires || 0}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </div>
          </div>
          <div className="card bg-card border border-border shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Questions</p>
                  <p className="text-2xl font-bold text-success">
                    {summary?.total_questions || 0}
                  </p>
                </div>
                <BookOpen className="h-8 w-8 text-success" />
              </div>
            </div>
          </div>
          <div className="card bg-card border border-border shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Questions/Paper</p>
                  <p className="text-2xl font-bold text-primary">
                    {summary?.average_questions_per_paper || 0}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
            </div>
          </div>
          <div className="card bg-card border border-border shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Modules</p>
                  <p className="text-2xl font-bold text-foreground">
                    {Object.keys(summary?.by_module || {}).length}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-foreground" />
              </div>
            </div>
          </div>
        </div>

        {/* Report Table */}
        <div className="card bg-card border border-border shadow-md overflow-hidden">
          <div className="card-body p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : questionnaires.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 mx-auto text-foreground/30 mb-4" />
                <p className="text-muted-foreground">No questionnaire records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr className="bg-muted">
                      <th>Title</th>
                      <th>Module</th>
                      <th>Batch</th>
                      <th>Total Questions</th>
                      <th>Question Types</th>
                      <th>Categories</th>
                      <th>Created Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questionnaires.map((questionnaire: any) => (
                      <tr key={questionnaire.id} className="hover">
                        <td className="font-semibold text-foreground">{questionnaire.title}</td>
                        <td>
                          <span className="badge badge-primary badge-sm">{questionnaire.module}</span>
                        </td>
                        <td>{questionnaire.batch}</td>
                        <td className="font-semibold">{questionnaire.total_questions}</td>
                        <td>
                          <div className="flex flex-wrap gap-1 max-w-[300px]">
                            {Object.entries(questionnaire.question_counts || {})
                              .filter(([_, count]: [string, any]) => count > 0)
                              .map(([type, count]: [string, any], idx: number) => (
                                <span key={idx} className="badge badge-outline badge-xs">
                                  {type.replace("_", " ")}: {count}
                                </span>
                              ))}
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {questionnaire.categories.slice(0, 2).map((cat: string, idx: number) => (
                              <span key={idx} className="badge badge-ghost badge-xs">
                                {cat}
                              </span>
                            ))}
                            {questionnaire.categories.length > 2 && (
                              <span className="badge badge-ghost badge-xs">
                                +{questionnaire.categories.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{new Date(questionnaire.created_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {!loading && questionnaires.length > 0 && reportPagination && reportPagination.last_page > 1 ? (
            <Pagination
              currentPage={reportPagination.current_page}
              lastPage={reportPagination.last_page}
              total={reportPagination.total}
              from={reportPagination.from}
              to={reportPagination.to}
              loading={loading}
              onPageChange={handleReportPageChange}
              itemName="questionnaires"
            />
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-2">View and generate comprehensive reports</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center flex-shrink-0">
          <button
            type="button"
            className="btn btn-primary gap-2 items-center px-6"
            onClick={handleExport}
            disabled={loading || exporting}
            title="Download full report as Excel using the filters below (all matching rows)"
          >
            {exporting ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <Download className="h-5 w-5" />
            )}
            <span className="hidden sm:inline whitespace-nowrap">
              {exporting ? "Downloading…" : "Download Excel"}
            </span>
            <span className="sm:hidden">{exporting ? "…" : "Download"}</span>
          </button>
        </div>
      </div>

      <IconTabs>
        <IconTab
          active={activeReport === "attendance"}
          icon={ClipboardCheck}
          onClick={() => setActiveReport("attendance")}
        >
          Attendance report
        </IconTab>
        <IconTab
          active={activeReport === "financial"}
          icon={DollarSign}
          onClick={() => setActiveReport("financial")}
        >
          Financial report
        </IconTab>
        <IconTab
          active={activeReport === "enrollment"}
          icon={Users}
          onClick={() => setActiveReport("enrollment")}
        >
          Enrollment report
        </IconTab>
        <IconTab
          active={activeReport === "performance"}
          icon={BookOpen}
          onClick={() => setActiveReport("performance")}
        >
          Performance report
        </IconTab>
      </IconTabs>

      {/* Filters */}
      <div className="card bg-card border border-border shadow-sm">
        <div className="card-body p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Filters</h3>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Downloads use these filters and include every matching row (not only the current table page).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-primary btn-sm gap-2 items-center"
                onClick={handleExport}
                disabled={loading || exporting}
                title="Download Excel for the active report"
              >
                {exporting ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="whitespace-nowrap">{exporting ? "Downloading…" : "Download Excel"}</span>
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm gap-2 items-center"
                onClick={handleResetFilters}
                title="Reset all filters"
                disabled={exporting}
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Reset filters</span>
                <span className="sm:hidden">Reset</span>
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-wrap">
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
              <input
                type="month"
                className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                placeholder="Month"
              />
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

            {/* Attendance specific filters */}
            {activeReport === "attendance" && (
              <>
                <div className="form-control flex-shrink-0 sm:w-48">
                  <select
                    className="select select-bordered w-full border-border focus:border-primary focus:outline-none"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                  >
                    <option value="">All Types</option>
                    <option value="student">Student</option>
                    <option value="staff">Staff</option>
                  </select>
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
              </>
            )}

            {/* Financial specific filters */}
            {activeReport === "financial" && (
              <>
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
              </>
            )}

            {/* Enrollment specific filters */}
            {activeReport === "enrollment" && (
              <>
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
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="graduated">Graduated</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </>
            )}

            {/* Performance specific filters */}
            {activeReport === "performance" && (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Report Content */}
      {activeReport === "attendance" && renderAttendanceReport()}
      {activeReport === "financial" && renderFinancialReport()}
      {activeReport === "enrollment" && renderEnrollmentReport()}
      {activeReport === "performance" && renderPerformanceReport()}
    </div>
  );
}
