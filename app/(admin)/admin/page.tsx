"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import {
  Users,
  UserCog,
  BookOpen,
  DollarSign,
  TrendingUp,
  Calendar,
  FileText,
  Award,
  ArrowUpRight,
  Receipt,
  CreditCard,
  BadgeCheck,
  AlertTriangle,
  RefreshCw,
  Filter,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { modulesApi, reportsApi, staffsApi, studentsApi } from "@/app/lib/api";
import { formatCurrency } from "@/app/utils/currency";

type DashboardKpis = {
  studentsTotal: number;
  staffsTotal: number;
  modulesTotal: number;
  rangeRevenue: number;
  rangePaidCount: number;
  rangePendingCount: number;
  rangePartialCount: number;
};

type ChartPoint = { period: string; revenue: number; paid: number; pending: number; partial: number };

type DatePreset = "today" | "last7" | "last30" | "this_month" | "last_month" | "last6m" | "custom";

type FinancialPaymentRow = {
  payment_date: string;
  paid_amount: number;
  status: string;
};

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: "compact" }).format(value);
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysInclusive(from: string, to: string): number {
  const a = parseYmd(from).getTime();
  const b = parseYmd(to).getTime();
  return Math.floor((b - a) / 86400000) + 1;
}

function eachDayInRange(fromStr: string, toStr: string): string[] {
  const out: string[] = [];
  const cur = parseYmd(fromStr);
  const end = parseYmd(toStr);
  for (; cur <= end; cur.setDate(cur.getDate() + 1)) {
    out.push(toYmd(new Date(cur)));
  }
  return out;
}

function startOfMonth(d = new Date()): string {
  return toYmd(new Date(d.getFullYear(), d.getMonth(), 1));
}

function endOfMonth(d = new Date()): string {
  return toYmd(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function presetToRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const today = toYmd(now);
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "last7": {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      return { from: toYmd(s), to: today };
    }
    case "last30": {
      const s = new Date(now);
      s.setDate(s.getDate() - 29);
      return { from: toYmd(s), to: today };
    }
    case "this_month":
      return { from: startOfMonth(now), to: today };
    case "last_month": {
      const firstThis = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastPrev = new Date(firstThis);
      lastPrev.setDate(0);
      const firstPrev = new Date(lastPrev.getFullYear(), lastPrev.getMonth(), 1);
      return { from: toYmd(firstPrev), to: toYmd(lastPrev) };
    }
    case "last6m": {
      const s = new Date(now);
      s.setMonth(s.getMonth() - 6);
      s.setDate(s.getDate() + 1);
      return { from: toYmd(s), to: today };
    }
    default:
      return { from: startOfMonth(now), to: today };
  }
}

function buildChartSeries(
  payments: FinancialPaymentRow[],
  dateFrom: string,
  dateTo: string
): ChartPoint[] {
  const n = daysInclusive(dateFrom, dateTo);
  const bucket: "day" | "week" | "month" =
    n <= 31 ? "day" : n <= 120 ? "week" : "month";

  const emptyKey = (date: string) => {
    if (bucket === "day") return date;
    if (bucket === "week") {
      const d = parseYmd(date);
      const day = d.getDay();
      const diff = (day + 6) % 7;
      const mon = new Date(d);
      mon.setDate(d.getDate() - diff);
      return toYmd(mon);
    }
    return date.slice(0, 7);
  };

  const labelForKey = (key: string) => {
    if (bucket === "day") {
      return parseYmd(key).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }
    if (bucket === "week") {
      return `Week of ${parseYmd(key).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    }
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  };

  const map = new Map<
    string,
    { revenue: number; paid: number; pending: number; partial: number }
  >();

  for (const p of payments) {
    if (!p.payment_date) continue;
    if (p.payment_date < dateFrom || p.payment_date > dateTo) continue;
    const key = emptyKey(p.payment_date);
    const cur = map.get(key) || { revenue: 0, paid: 0, pending: 0, partial: 0 };
    cur.revenue += Number(p.paid_amount || 0);
    if (p.status === "paid") cur.paid += 1;
    else if (p.status === "pending") cur.pending += 1;
    else if (p.status === "partial") cur.partial += 1;
    map.set(key, cur);
  }

  let keys: string[] = [];
  if (bucket === "day") {
    keys = eachDayInRange(dateFrom, dateTo);
  } else if (bucket === "week") {
    const days = eachDayInRange(dateFrom, dateTo);
    const seen = new Set<string>();
    for (const d of days) {
      const k = emptyKey(d);
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
  } else {
    const start = parseYmd(dateFrom);
    const end = parseYmd(dateTo);
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const endM = new Date(end.getFullYear(), end.getMonth(), 1);
    for (; cur <= endM; cur.setMonth(cur.getMonth() + 1)) {
      keys.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`);
    }
  }

  return keys.map((k) => {
    const row = map.get(k) || { revenue: 0, paid: 0, pending: 0, partial: 0 };
    return {
      period: labelForKey(k),
      revenue: row.revenue,
      paid: row.paid,
      pending: row.pending,
      partial: row.partial,
    };
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const { isSuperAdmin, loading: authLoading, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>("this_month");
  const [dateFrom, setDateFrom] = useState(() => presetToRange("this_month").from);
  const [dateTo, setDateTo] = useState(() => presetToRange("this_month").to);
  const [kpis, setKpis] = useState<DashboardKpis>({
    studentsTotal: 0,
    staffsTotal: 0,
    modulesTotal: 0,
    rangeRevenue: 0,
    rangePaidCount: 0,
    rangePendingCount: 0,
    rangePartialCount: 0,
  });
  const [series, setSeries] = useState<ChartPoint[]>([]);

  const loadDashboard = async (range?: { from: string; to: string }) => {
    setErrorMessage(null);
    setLoading(true);
    try {
      const from = range?.from ?? dateFrom;
      const to = range?.to ?? dateTo;

      const [studentsRes, staffsRes, modulesRes, financialRes] = await Promise.all([
        studentsApi.getAll(1),
        staffsApi.getAll(1),
        modulesApi.getAll(1),
        reportsApi.getFinancialReport({ date_from: from, date_to: to }),
      ]);

      const summary = financialRes?.summary || {};
      const payments: FinancialPaymentRow[] = (financialRes?.payments || []).map((p: any) => ({
        payment_date: p.payment_date,
        paid_amount: Number(p.paid_amount ?? 0),
        status: p.status,
      }));
      const nextSeries = buildChartSeries(payments, from, to);

      setKpis({
        studentsTotal: Number(studentsRes.pagination?.total ?? studentsRes.students?.length ?? 0) || 0,
        staffsTotal: Number(staffsRes.pagination?.total ?? staffsRes.staffs?.length ?? 0) || 0,
        modulesTotal: Number(modulesRes.pagination?.total ?? modulesRes.modules?.length ?? 0) || 0,
        rangeRevenue: Number(summary.total_paid ?? 0) || 0,
        rangePaidCount: Number(summary.by_status?.paid ?? 0) || 0,
        rangePendingCount: Number(summary.by_status?.pending ?? 0) || 0,
        rangePartialCount: Number(summary.by_status?.partial ?? 0) || 0,
      });
      setSeries(nextSeries);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!isSuperAdmin()) {
      router.replace("/admin/home");
      return;
    }
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, isSuperAdmin, router]);

  const kpiCards = useMemo(() => {
    return [
      {
        title: "Students",
        value: formatCompactNumber(kpis.studentsTotal),
        icon: Users,
        tone: "bg-primary/10 text-primary",
        href: "/admin/students",
      },
      {
        title: "Staff",
        value: formatCompactNumber(kpis.staffsTotal),
        icon: UserCog,
        tone: "bg-success/10 text-success",
        href: "/admin/staffs",
      },
      {
        title: "Modules",
        value: formatCompactNumber(kpis.modulesTotal),
        icon: BookOpen,
        tone: "bg-info/10 text-info",
        href: "/admin/modules",
      },
      {
        title: "Revenue (selected range)",
        value: formatCurrency(kpis.rangeRevenue),
        icon: DollarSign,
        tone: "bg-warning/10 text-amber-600 dark:text-amber-400",
        href: "/admin/payments",
      },
    ] as const;
  }, [kpis]);

  const paymentStatusData = useMemo(() => {
    const paid = kpis.rangePaidCount;
    const pending = kpis.rangePendingCount;
    const partial = kpis.rangePartialCount;
    const total = paid + pending + partial;
    return [
      { name: "Paid", value: paid },
      { name: "Pending", value: pending },
      { name: "Partial", value: partial },
    ].filter((x) => x.value > 0);
  }, [kpis.rangePaidCount, kpis.rangePendingCount, kpis.rangePartialCount]);

  const pieColors = ["#10b981", "#f59e0b", "#ef4444"];

  if (authLoading || !user || !isSuperAdmin()) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Operational overview across students, staff, modules, payments, and attendance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/reports" className="btn btn-primary btn-sm gap-2 items-center px-6">
            <TrendingUp className="h-4 w-4" />
            <span className="whitespace-nowrap">View Reports</span>
          </Link>
          <button
            className="btn btn-ghost btn-sm gap-2 items-center"
            onClick={() => loadDashboard()}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Payment date range */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Payment date range</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            KPIs and charts update based on the selected payment date range.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="form-control sm:w-56">
            <label className="label pb-1">
              <span className="label-text text-xs font-semibold text-muted-foreground">Preset</span>
            </label>
            <select
              className="select select-bordered border-border"
              value={datePreset}
              onChange={(e) => {
                const preset = e.target.value as DatePreset;
                setDatePreset(preset);
                if (preset !== "custom") {
                  const r = presetToRange(preset);
                  setDateFrom(r.from);
                  setDateTo(r.to);
                  loadDashboard(r);
                }
              }}
            >
              <option value="today">Today</option>
              <option value="last7">Last 7 days</option>
              <option value="last30">Last 30 days</option>
              <option value="this_month">This month</option>
              <option value="last_month">Last month</option>
              <option value="last6m">Last 6 months</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="form-control sm:w-44">
            <label className="label pb-1">
              <span className="label-text text-xs font-semibold text-muted-foreground">From</span>
            </label>
            <input
              type="date"
              className="input input-bordered border-border"
              value={dateFrom}
              onChange={(e) => {
                setDatePreset("custom");
                setDateFrom(e.target.value);
              }}
              max={dateTo}
            />
          </div>

          <div className="form-control sm:w-44">
            <label className="label pb-1">
              <span className="label-text text-xs font-semibold text-muted-foreground">To</span>
            </label>
            <input
              type="date"
              className="input input-bordered border-border"
              value={dateTo}
              onChange={(e) => {
                setDatePreset("custom");
                setDateTo(e.target.value);
              }}
              min={dateFrom}
            />
          </div>

          <button
            className="btn btn-primary gap-2 items-center"
            onClick={() => loadDashboard({ from: dateFrom, to: dateTo })}
            disabled={loading || !dateFrom || !dateTo || dateFrom > dateTo}
          >
            <Calendar className="h-4 w-4" />
            <span className="whitespace-nowrap">Apply</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="alert alert-warning border border-border">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm">{errorMessage}</span>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className="card bg-card border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="card-body p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                    <p className="mt-1 text-3xl font-bold text-foreground">
                      {loading ? "—" : card.value}
                    </p>
                  </div>
                  <div className={`rounded-xl p-3 ${card.tone}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Open</span>
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 card bg-card border border-border shadow-sm">
          <div className="card-body p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-foreground">Revenue trend</h2>
                <p className="text-sm text-muted-foreground">
                  {dateFrom} → {dateTo}
                </p>
              </div>
              <div className="badge badge-outline gap-2">
                <Receipt className="h-3.5 w-3.5" />
                <span className="text-xs">Payments</span>
              </div>
            </div>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#432AD5" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#432AD5" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} hide />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCompactNumber(Number(v))}
                  />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#432AD5"
                    strokeWidth={2}
                    fill="url(#revFill)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card bg-card border border-border shadow-sm">
          <div className="card-body p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">Payment status mix</h2>
                <p className="text-sm text-muted-foreground">
                  {dateFrom} → {dateTo}
                </p>
              </div>
              <div className="badge badge-outline gap-2">
                <BadgeCheck className="h-3.5 w-3.5" />
                <span className="text-xs">Summary</span>
              </div>
            </div>

            <div className="mt-4 h-56">
              {paymentStatusData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No payment status data yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentStatusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={3}
                    >
                      {paymentStatusData.map((_, idx) => (
                        <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatCompactNumber(Number(v))} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-2 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4 text-success" />
                  Paid
                </div>
                <div className="mt-1 text-xl font-bold text-foreground">
                  {loading ? "—" : formatCompactNumber(kpis.rangePaidCount)}
                </div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Receipt className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Pending
                </div>
                <div className="mt-1 text-xl font-bold text-foreground">
                  {loading ? "—" : formatCompactNumber(kpis.rangePendingCount)}
                </div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Receipt className="h-4 w-4 text-destructive" />
                  Partial
                </div>
                <div className="mt-1 text-xl font-bold text-foreground">
                  {loading ? "—" : formatCompactNumber(kpis.rangePartialCount)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operational widgets */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card bg-card border border-border shadow-sm lg:col-span-2">
          <div className="card-body p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Payments volume</h2>
              <Link href="/admin/payments" className="btn btn-ghost btn-sm">
                View
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">Paid vs pending vs partial counts by period</p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} hide />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="paid" stackId="a" fill="#10b981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="pending" stackId="a" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="partial" stackId="a" fill="#ef4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card bg-card border border-border shadow-sm">
          <div className="card-body p-5">
            <h2 className="text-lg font-bold text-foreground">Quick actions</h2>
            <p className="text-sm text-muted-foreground">Common admin tasks</p>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <Link href="/admin/students" className="btn btn-outline justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Manage students
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link href="/admin/payments" className="btn btn-outline justify-between">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Process payments
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link href="/admin/attendance" className="btn btn-outline justify-between">
                <span className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Mark attendance
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link href="/admin/timetables" className="btn btn-outline justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Manage timetables
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
