"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { useAuth } from "@/app/contexts/AuthContext";
import { Moon, Sun, User, LogOut, Settings } from "lucide-react";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/admin/login";
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-base-300 bg-base-100/90 px-4 sm:px-6 lg:px-8 backdrop-blur">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-base-content whitespace-nowrap">
          Techna Technical Institute
        </h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="btn btn-ghost btn-circle btn-sm sm:btn-md flex-shrink-0"
          aria-label="Toggle theme"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>

        {/* User Menu */}
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-ghost flex items-center gap-2 min-w-0 px-2 sm:px-3 flex-shrink-0"
          >
            <div className="avatar placeholder flex-shrink-0">
              <div className="bg-primary text-primary-content rounded-full w-8 sm:w-10 h-8 sm:h-10 flex items-center justify-center">
                <span className="text-xs sm:text-sm font-semibold">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
            </div>
            <div className="hidden sm:flex flex-col items-start text-sm min-w-0 max-w-[140px]">
              <span className="font-semibold text-base-content truncate w-full">
                {user?.name}
              </span>
              <span className="text-xs opacity-70 text-base-content/70 truncate w-full">
                {user?.role.name}
              </span>
            </div>
          </div>
          <ul
            tabIndex={0}
            className="menu dropdown-content z-[1] w-56 rounded-box bg-base-100 border border-base-300 p-2 shadow-xl mt-2"
          >
            <li className="menu-title">
              <span className="text-base-content/70">Account</span>
            </li>
            <li>
              <a className="flex items-center gap-3 text-base-content hover:bg-base-200">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </a>
            </li>
            <li>
              <a className="flex items-center gap-3 text-base-content hover:bg-base-200">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </a>
            </li>
            <li className="border-t border-base-300 mt-2 pt-2">
              <a
                onClick={handleLogout}
                className="flex items-center gap-3 text-error hover:bg-error/10 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
