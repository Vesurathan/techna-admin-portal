"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
      className={cn(
        "inline-flex flex-wrap items-stretch gap-1 rounded-lg bg-muted p-[3px] ring-1 ring-border/60",
        className
      )}
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
      className={cn(
        "inline-flex min-h-[2.75rem] shrink-0 items-center justify-center gap-2 rounded-md border border-transparent px-3 py-2.5 text-sm font-medium transition-all sm:px-4",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        active
          ? "bg-background text-foreground shadow-sm dark:border-input dark:bg-input/30"
          : "text-muted-foreground hover:text-foreground"
      )}
      onClick={onClick}
    >
      <Icon className="pointer-events-none h-4 w-4 shrink-0" aria-hidden />
      <span className="whitespace-nowrap leading-tight">{children}</span>
    </button>
  );
}
