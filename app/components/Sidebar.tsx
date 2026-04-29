"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useSidebar } from "@/app/contexts/SidebarContext";
import { useAuth } from "@/app/contexts/AuthContext";
import { Permission } from "@/app/types/role";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  HardDrive,
  Wallet,
  Images,
  StickyNote,
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
  {
    label: "Salary & Payroll",
    href: "/admin/salary-payroll",
    icon: Wallet,
    permission: "salary_payroll",
  },
  { label: "Reports", href: "/admin/reports", icon: FileText, permission: "reports" },
  { label: "Drive", href: "/admin/drive", icon: HardDrive, permission: "photo_library" },
  { label: "Gallery", href: "/admin/gallery", icon: Images, permission: "photo_library" },
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

  const notesNav = hasPermission("notes") || isSuperAdmin()
    ? [{ label: "Notes", href: "/admin/notes", icon: StickyNote, key: "notes" as const }]
    : [];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card shadow-sm transition-all duration-300 ease-in-out",
        isExpanded ? "w-64" : "w-20"
      )}
    >
      <div className="flex h-full flex-col">
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-border bg-card",
            isExpanded ? "justify-between px-4" : "justify-center px-2"
          )}
        >
          {isExpanded && (
            <h1 className="whitespace-nowrap text-xl font-bold text-primary">Techna Admin</h1>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            className="shrink-0"
            aria-label="Toggle sidebar"
          >
            {isExpanded ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
          <ul className="space-y-1.5">
            {homeNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <motion.li
                  key={item.key}
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <Link
                    href={item.href}
                    title={!isExpanded ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg transition-colors",
                      isExpanded ? "px-4 py-3" : "justify-center px-3 py-3",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary-foreground")} />
                    {isExpanded && <span className="whitespace-nowrap font-medium">{item.label}</span>}
                  </Link>
                </motion.li>
              );
            })}
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));

              return (
                <motion.li
                  key={item.href}
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <Link
                    href={item.href}
                    title={!isExpanded ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg transition-colors",
                      isExpanded ? "px-4 py-3" : "justify-center px-3 py-3",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary-foreground")} />
                    {isExpanded && <span className="whitespace-nowrap font-medium">{item.label}</span>}
                  </Link>
                </motion.li>
              );
            })}

            {notesNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <motion.li
                  key={item.key}
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <Link
                    href={item.href}
                    title={!isExpanded ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg transition-colors",
                      isExpanded ? "px-4 py-3" : "justify-center px-3 py-3",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary-foreground")} />
                    {isExpanded && <span className="whitespace-nowrap font-medium">{item.label}</span>}
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
