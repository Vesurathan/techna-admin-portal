"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AppNoticeDialog,
  type AppNoticeVariant,
} from "@/app/components/AppNoticeDialog";
import { AppToastStack, type ToastItem } from "@/app/components/AppToastStack";

export type { AppNoticeVariant };

export type ShowNoticeOptions = {
  title?: string;
  message: string;
  variant?: AppNoticeVariant;
};

type AppNoticeContextValue = {
  /** Show an in-app notice dialog. Pass a string for a simple info message. */
  showNotice: (options: ShowNoticeOptions | string) => void;
};

const defaultTitles: Record<AppNoticeVariant, string> = {
  info: "Notice",
  success: "Success",
  error: "Something went wrong",
};

const AppNoticeContext = createContext<AppNoticeContextValue | null>(null);

const TOAST_DURATION_MS = 4200;

function newToastId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function AppNoticeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [variant, setVariant] = useState<AppNoticeVariant>("info");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const t = toastTimeoutsRef.current.get(id);
    if (t) {
      clearTimeout(t);
      toastTimeoutsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const showNotice = useCallback(
    (options: ShowNoticeOptions | string) => {
      const o = typeof options === "string" ? { message: options } : options;
      const v = o.variant ?? "info";

      if (v === "success") {
        const id = newToastId();
        const toast: ToastItem = {
          id,
          title: o.title ?? defaultTitles.success,
          message: o.message,
        };
        setToasts((prev) => [toast, ...prev]);
        const tid = setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
        toastTimeoutsRef.current.set(id, tid);
        return;
      }

      setVariant(v);
      setTitle(o.title ?? defaultTitles[v]);
      setMessage(o.message);
      setOpen(true);
    },
    [dismissToast]
  );

  const close = useCallback(() => setOpen(false), []);

  const value = useMemo(() => ({ showNotice }), [showNotice]);

  return (
    <AppNoticeContext.Provider value={value}>
      {children}
      <AppToastStack toasts={toasts} onDismiss={dismissToast} />
      <AppNoticeDialog
        open={open}
        onClose={close}
        title={title}
        message={message}
        variant={variant}
      />
    </AppNoticeContext.Provider>
  );
}

export function useAppNotice() {
  const ctx = useContext(AppNoticeContext);
  if (!ctx) {
    throw new Error("useAppNotice must be used within AppNoticeProvider");
  }
  return ctx;
}
