"use client";

import { X } from "lucide-react";

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
  /** If omitted, a single Close button is shown. */
  footer?: React.ReactNode;
  size?: keyof typeof SIZE_WIDTH;
};

/**
 * Unified “view record” shell: compact width, sticky header with dismiss,
 * scrollable body, consistent footer bar.
 */
export function RecordDetailModal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = "md",
}: RecordDetailModalProps) {
  if (!open) return null;

  return (
    <dialog className="modal modal-open z-[90]" aria-modal="true">
      <div
        className={`modal-box ${SIZE_WIDTH[size]} w-full rounded-xl border border-base-300 bg-base-100 p-0 shadow-xl`}
      >
        <div className="sticky top-0 z-[1] flex items-start justify-between gap-3 border-b border-base-200 bg-base-100 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight text-base-content">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs text-base-content/60">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-circle shrink-0 text-base-content/50 hover:text-base-content"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[min(82vh,44rem)] overflow-y-auto overscroll-contain px-4 py-3">
          {children}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-base-200 px-4 py-3">
          {footer ?? (
            <button type="button" className="btn btn-ghost btn-sm min-h-9 h-9 px-4" onClick={onClose}>
              Close
            </button>
          )}
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

/** Shared section title for detail bodies inside RecordDetailModal */
export function RecordDetailSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-base-content border-b border-base-200 pb-2 mb-3">
      {children}
    </h3>
  );
}
