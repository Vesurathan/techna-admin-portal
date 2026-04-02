"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { useAuth } from "@/app/contexts/AuthContext";
import { Permission } from "@/app/types/role";
import {
  BookOpen,
  Users,
  UserCog,
  Calendar,
  FileQuestion,
  CreditCard,
  FileText,
  Shield,
  ClipboardCheck,
  ArrowUpRight,
  Building2,
} from "lucide-react";

type QuickLink = {
  label: string;
  href: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  permission: Permission;
};

const quickLinks: QuickLink[] = [
  {
    label: "Attendance",
    href: "/admin/attendance",
    description: "Mark and review attendance",
    icon: ClipboardCheck,
    permission: "attendance",
  },
  {
    label: "Modules",
    href: "/admin/modules",
    description: "Courses and assignments",
    icon: BookOpen,
    permission: "modules",
  },
  {
    label: "Students",
    href: "/admin/students",
    description: "Student records",
    icon: Users,
    permission: "students",
  },
  {
    label: "Staffs",
    href: "/admin/staffs",
    description: "Staff directory",
    icon: UserCog,
    permission: "staffs",
  },
  {
    label: "Timetables",
    href: "/admin/timetables",
    description: "Schedules and slots",
    icon: Calendar,
    permission: "timetables",
  },
  {
    label: "Question bank",
    href: "/admin/questionbank",
    description: "Questions and papers",
    icon: FileQuestion,
    permission: "questionbank",
  },
  {
    label: "Payments",
    href: "/admin/payments",
    description: "Fees and receipts",
    icon: CreditCard,
    permission: "payments",
  },
  {
    label: "Reports",
    href: "/admin/reports",
    description: "Exports and summaries",
    icon: FileText,
    permission: "reports",
  },
  {
    label: "Roles",
    href: "/admin/role",
    description: "Roles and permissions",
    icon: Shield,
    permission: "role",
  },
];

export default function StaffHomePage() {
  const { user, hasPermission, isSuperAdmin } = useAuth();

  const links = quickLinks.filter((l) => hasPermission(l.permission));

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-base-content sm:text-3xl">
              Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
            </h1>
            <p className="mt-2 text-base-content/70">
              You are signed in to the Techna admin portal. Open a section below or use the sidebar.
              This page does not show dashboard metrics or charts.
            </p>
            <p className="mt-3 text-sm text-base-content/60">
              Role: <span className="font-medium text-base-content">{user?.role?.name ?? "—"}</span>
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-base-content mb-3">Your areas</h2>
        {links.length === 0 ? (
          <div className="rounded-xl border border-base-300 bg-base-200/40 p-6 text-sm text-base-content/70">
            You do not have access to any modules yet. Contact a super administrator if this is wrong.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {links.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-start gap-3 rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-base-200 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-base-content">{item.label}</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-base-content/40 group-hover:text-primary" />
                    </div>
                    <p className="mt-1 text-xs text-base-content/60 leading-snug">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-base-300 bg-base-200/30 p-5 text-sm text-base-content/65">
        <p className="font-medium text-base-content/80">About this portal</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Techna Technical Institute — administration and academic operations</li>
          <li>Financial KPIs and analytics are available only to super administrators</li>
          {isSuperAdmin() ? (
            <li>
              As super admin, use <Link className="link link-primary" href="/admin">Dashboard</Link> for
              overview metrics
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
