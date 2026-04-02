"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/app/contexts/SidebarContext";
import { useAuth } from "@/app/contexts/AuthContext";
import { Permission } from "@/app/types/role";
import {
  LayoutDashboard,
  Home,
  BookOpen,
  Users,
  UserCog,
  Calendar,
  FileQuestion,
  CreditCard,
  FileText,
  Shield,
  Menu,
  X,
  ClipboardCheck,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: Permission;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, permission: "dashboard" },
  { label: "Attendance", href: "/admin/attendance", icon: ClipboardCheck, permission: "attendance" },
  { label: "Modules", href: "/admin/modules", icon: BookOpen, permission: "modules" },
  { label: "Students", href: "/admin/students", icon: Users, permission: "students" },
  { label: "Staffs", href: "/admin/staffs", icon: UserCog, permission: "staffs" },
  { label: "Time Tables", href: "/admin/timetables", icon: Calendar, permission: "timetables" },
  { label: "Question Bank", href: "/admin/questionbank", icon: FileQuestion, permission: "questionbank" },
  { label: "Payments", href: "/admin/payments", icon: CreditCard, permission: "payments" },
  { label: "Reports", href: "/admin/reports", icon: FileText, permission: "reports" },
  { label: "Role", href: "/admin/role", icon: Shield, permission: "role" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isExpanded, toggleSidebar } = useSidebar();
  const { hasPermission, isSuperAdmin } = useAuth();

  const filteredNavItems = navItems.filter((item) => {
    if (item.permission === "dashboard") {
      return isSuperAdmin();
    }
    return hasPermission(item.permission);
  });

  const homeNav = !isSuperAdmin()
    ? [{ label: "Home", href: "/admin/home", icon: Home, key: "home" as const }]
    : [];

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen bg-base-100 transition-all duration-300 ease-in-out ${
        isExpanded ? "w-64" : "w-20"
      } border-r border-base-300/70 shadow-sm`}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className={`flex h-16 items-center border-b border-base-300/70 bg-base-100 ${
          isExpanded ? "justify-between px-4" : "justify-center px-2"
        }`}>
          {isExpanded && (
            <h1 className="text-xl font-bold text-primary whitespace-nowrap">
              Techna Admin
            </h1>
          )}
          <button
            onClick={toggleSidebar}
            className="btn btn-ghost btn-sm btn-circle hover:bg-base-300 flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            {isExpanded ? (
              <X className="h-5 w-5 text-base-content" />
            ) : (
              <Menu className="h-5 w-5 text-base-content" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 sm:p-4">
          <ul className="space-y-2">
            {homeNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-primary-content shadow-md"
                        : "text-base-content hover:bg-base-300"
                    } ${isExpanded ? "px-4 py-3" : "px-3 py-3 justify-center"}`}
                    title={!isExpanded ? item.label : undefined}
                  >
                    <Icon
                      className={`h-5 w-5 flex-shrink-0 ${
                        isActive ? "text-primary-content" : "text-base-content/70"
                      }`}
                    />
                    {isExpanded && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-primary-content shadow-md"
                        : "text-base-content hover:bg-base-300"
                    } ${
                      isExpanded ? "px-4 py-3" : "px-3 py-3 justify-center"
                    }`}
                    title={!isExpanded ? item.label : undefined}
                  >
                    <Icon
                      className={`h-5 w-5 flex-shrink-0 ${
                        isActive ? "text-primary-content" : "text-base-content/70"
                      }`}
                    />
                    {isExpanded && (
                      <span className="font-medium whitespace-nowrap">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
