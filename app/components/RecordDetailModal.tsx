"use client";

import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SIZE_WIDTH: Record<"sm" | "md" | "lg", string> = {
  sm: "max-w-[min(100vw-1.25rem,28rem)]",
  md: "max-w-[min(100vw-1.25rem,34rem)]",
  lg: "max-w-[min(100vw-1.25rem,40rem)]",
};

export type RecordDetailModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof SIZE_WIDTH;
};

export function RecordDetailModal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = "md",
}: RecordDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex max-h-[min(92vh,48rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg",
          SIZE_WIDTH[size]
        )}
      >
        <DialogHeader className="sticky top-0 z-[1] flex shrink-0 flex-row items-start justify-between gap-3 space-y-0 border-b bg-background px-4 py-3 text-left">
          <div className="min-w-0 pr-2">
            <DialogTitle className="text-sm font-semibold leading-tight">{title}</DialogTitle>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">{children}</div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-muted/30 px-4 py-3">
          {footer ?? (
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RecordDetailSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 border-b pb-2 text-sm font-semibold text-foreground">{children}</h3>
  );
}
