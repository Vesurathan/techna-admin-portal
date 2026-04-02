"use client";

import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ToastItem = {
  id: string;
  title: string;
  message: string;
};

type AppToastStackProps = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
};

export function AppToastStack({ toasts, onDismiss }: AppToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[200] flex w-[min(100vw-2rem,20rem)] flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex gap-3 rounded-lg border border-emerald-500/35 bg-card py-3 pl-3 pr-2 shadow-lg ring-1 ring-border",
            "animate-in fade-in slide-in-from-right-2 duration-300"
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-semibold leading-tight text-foreground">{t.title}</p>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{t.message}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
