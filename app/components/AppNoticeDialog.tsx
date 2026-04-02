"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AppNoticeVariant = "info" | "success" | "error";

export type AppNoticeDialogProps = {
  open: boolean;
  title: string;
  message: string;
  variant: AppNoticeVariant;
  onClose: () => void;
};

const variantStyles: Record<
  AppNoticeVariant,
  { icon: typeof Info; wrap: string }
> = {
  success: {
    icon: CheckCircle2,
    wrap: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  error: {
    icon: AlertCircle,
    wrap: "bg-destructive/10 text-destructive",
  },
  info: {
    icon: Info,
    wrap: "bg-primary/10 text-primary",
  },
};

export function AppNoticeDialog({
  open,
  title,
  message,
  variant,
  onClose,
}: AppNoticeDialogProps) {
  const { icon: Icon, wrap } = variantStyles[variant];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/45 backdrop-blur-md dark:bg-black/55"
        className="z-[100] max-w-[min(100vw-2rem,24rem)] gap-0 overflow-hidden p-0 sm:max-w-[min(100vw-2rem,24rem)]"
      >
        <DialogHeader className="relative space-y-0 px-4 pt-4 pb-3 text-left">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute right-1 top-1 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex gap-3 pr-8">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                wrap
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <DialogTitle className="text-sm font-semibold leading-tight">{title}</DialogTitle>
              <p className="mt-1.5 whitespace-pre-wrap text-xs leading-snug text-muted-foreground">
                {message}
              </p>
            </div>
          </div>
        </DialogHeader>
        <div className="flex justify-end border-t border-border bg-muted/40 px-4 py-3">
          <Button type="button" size="sm" onClick={onClose}>
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
