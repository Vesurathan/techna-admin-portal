"use client";

import Sidebar from "@/app/components/Sidebar";
import Header from "@/app/components/Header";
import { PageTransition } from "@/app/components/PageTransition";
import { AuthGuard } from "@/app/components/AuthGuard";
import { SidebarProvider, useSidebar } from "@/app/contexts/SidebarContext";
import { AuthProvider } from "@/app/contexts/AuthContext";
import { AppNoticeProvider } from "@/app/contexts/AppNoticeContext";
import { usePathname } from "next/navigation";

function AdminContent({ children }: { children: React.ReactNode }) {
  const { isExpanded } = useSidebar();
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col transition-[padding] duration-300 ease-in-out ${
            isExpanded ? "pl-64" : "pl-20"
          }`}
        >
          <Header />
          <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="mx-auto w-full min-w-0 max-w-7xl">
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <SidebarProvider>
        <AppNoticeProvider>
          <AdminContent>{children}</AdminContent>
        </AppNoticeProvider>
      </SidebarProvider>
    </AuthProvider>
  );
}
