"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

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

  if (!open) return null;

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
      ? "bg-warning/12 text-warning"
      : "bg-error/10 text-error";

  const confirmClass =
    tone === "warning"
      ? "btn btn-warning btn-sm min-h-9 h-9 px-4 border-0 text-warning-content hover:brightness-95"
      : "btn btn-delete btn-sm min-h-9 h-9 px-4";

  return (
    <dialog className="modal modal-open z-[100]" aria-modal="true" role="alertdialog">
      <div className="modal-box w-full max-w-[min(100vw-2rem,22rem)] rounded-xl border border-base-300 bg-base-100 p-0 shadow-xl">
        <div className="relative px-4 pt-4 pb-3">
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-circle absolute right-2 top-2 text-base-content/50 hover:text-base-content"
            onClick={onClose}
            disabled={pending}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex gap-3 pr-8">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconWrap}`}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h3 className="text-sm font-semibold leading-tight text-base-content">{title}</h3>
              <div className="mt-1.5 text-xs leading-snug text-base-content/65">{description}</div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-base-200 px-4 py-3">
          <button
            type="button"
            className="btn btn-ghost btn-sm min-h-9 h-9 px-3"
            onClick={onClose}
            disabled={pending}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${confirmClass} gap-1.5`}
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? <span className="loading loading-spinner loading-xs" /> : null}
            <span className="whitespace-nowrap">{confirmLabel}</span>
          </button>
        </div>
      </div>
      <form
        method="dialog"
        className="modal-backdrop bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      >
        <button type="button" className="sr-only">
          Close
        </button>
      </form>
    </dialog>
  );
}
