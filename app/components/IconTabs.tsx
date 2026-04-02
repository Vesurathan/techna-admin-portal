"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function IconTabs({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={`tabs tabs-boxed flex flex-wrap items-stretch gap-1 bg-base-200 border border-base-300 p-1 ${className}`}
    >
      {children}
    </div>
  );
}

export function IconTab({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`tab inline-flex shrink-0 items-center justify-center gap-2 px-3 py-2.5 sm:px-4 min-h-[2.75rem] ${
        active ? "tab-active" : ""
      }`}
      onClick={onClick}
    >
      <Icon className="h-4 w-4 shrink-0 pointer-events-none" aria-hidden />
      <span className="text-sm font-medium leading-tight whitespace-nowrap">{children}</span>
    </button>
  );
}
