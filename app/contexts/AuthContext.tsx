"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Role, Permission } from "@/app/types/role";
import { authApi } from "@/app/lib/api";

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  hasPermission: (permission: Permission) => boolean;
  isSuperAdmin: () => boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ isSuperAdmin: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("auth_token");
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshUser = async () => {
    try {
      setLoading(true);
      const response = await authApi.me();
      if (response.user) {
        const formattedUser: User = {
          id: response.user.id.toString(),
          name: response.user.name,
          email: response.user.email,
          profileImageUrl: response.user.profileImageUrl ?? null,
          role: response.user.role
            ? {
                id: response.user.role.id.toString(),
                name: response.user.role.name,
                permissions: response.user.role.permissions || [],
                isSuperAdmin: response.user.role.isSuperAdmin || false,
              }
            : {
                id: "0",
                name: "No Role",
                permissions: [],
                isSuperAdmin: false,
              },
        };
        setUser(formattedUser);
      }
    } catch (error: any) {
      const message = error?.message || "";
      if (message.toLowerCase().includes("unauthenticated")) {
        localStorage.removeItem("auth_token");
        setUser(null);
      } else {
        console.error("Failed to fetch user:", error);
        localStorage.removeItem("auth_token");
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    const isSa = Boolean(response.user?.role?.isSuperAdmin);
    if (response.user) {
      const formattedUser: User = {
        id: response.user.id.toString(),
        name: response.user.name,
        email: response.user.email,
        profileImageUrl: response.user.profileImageUrl ?? null,
        role: response.user.role
          ? {
              id: response.user.role.id.toString(),
              name: response.user.role.name,
              permissions: response.user.role.permissions || [],
              isSuperAdmin: response.user.role.isSuperAdmin || false,
            }
          : {
              id: "0",
              name: "No Role",
              permissions: [],
              isSuperAdmin: false,
            },
      };
      setUser(formattedUser);
    }
    return { isSuperAdmin: isSa };
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      localStorage.removeItem("auth_token");
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    if (user.role.isSuperAdmin) return true;
    return user.role.permissions.includes(permission);
  };

  const isSuperAdmin = (): boolean => {
    return user?.role.isSuperAdmin ?? false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        hasPermission,
        isSuperAdmin,
        loading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
