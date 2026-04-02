"use client";

import Sidebar from "@/app/components/Sidebar";
import Header from "@/app/components/Header";
import { AuthGuard } from "@/app/components/AuthGuard";
import { SidebarProvider, useSidebar } from "@/app/contexts/SidebarContext";
import { AuthProvider } from "@/app/contexts/AuthContext";
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
      <div className="flex min-h-screen bg-base-100">
        <Sidebar />
        <div
          className={`flex flex-1 flex-col transition-all duration-300 ease-in-out ${
            isExpanded ? "ml-64" : "ml-20"
          }`}
        >
          <Header />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
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
        <AdminContent>{children}</AdminContent>
      </SidebarProvider>
    </AuthProvider>
  );
}
