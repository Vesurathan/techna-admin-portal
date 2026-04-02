"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmDialogTone = "danger" | "warning";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  tone?: ConfirmDialogTone;
  icon?: "trash" | "alert";
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onClose,
  onConfirm,
  tone = "danger",
  icon = "trash",
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) setPending(false);
  }, [open]);

  const handleConfirm = async () => {
    if (pending) return;
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  };

  const Icon = icon === "alert" ? AlertTriangle : Trash2;
  const iconWrap =
    tone === "warning"
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
      : "bg-destructive/10 text-destructive";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/45 backdrop-blur-md dark:bg-black/55"
        className="z-[100] max-w-[min(100vw-2rem,22rem)] gap-0 overflow-hidden p-0 sm:max-w-[min(100vw-2rem,22rem)]"
      >
        <DialogHeader className="relative space-y-0 px-4 pt-4 pb-3 text-left">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute right-1 top-1 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            disabled={pending}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex gap-3 pr-8">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                iconWrap
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <DialogTitle className="text-sm font-semibold leading-tight">{title}</DialogTitle>
              <div className="mt-1.5 text-xs leading-snug text-muted-foreground">{description}</div>
            </div>
          </div>
        </DialogHeader>
        <div className="flex justify-end gap-2 border-t border-border bg-muted/40 px-4 py-3">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={handleConfirm}
            className={
              tone === "warning"
                ? "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
                : "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
            }
          >
            {pending ? <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
            <span className="whitespace-nowrap">{confirmLabel}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
