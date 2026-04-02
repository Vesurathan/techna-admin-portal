"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (decodedText: string) => void;
};

/**
 * Fixed overlay (not Radix Dialog) so the reader element exists in the DOM before Html5Qrcode runs.
 */
export function QrScannerDialog({ open, onOpenChange, onScan }: Props) {
  const [error, setError] = useState<string | null>(null);
  const readerId = useMemo(() => {
    const suffix =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return `attendance-qr-${suffix}`;
  }, []);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    const startDelayMs = 200;

    const timer = window.setTimeout(() => {
      const el = document.getElementById(readerId);
      if (!el) {
        setError("Scanner area not ready. Try again.");
        return;
      }

      const html5 = new Html5Qrcode(readerId, { verbose: false });
      scannerRef.current = html5;

      html5
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 280, height: 280 } },
          (decodedText) => {
            const text = decodedText?.trim();
            if (!text) return;
            onScanRef.current(text);
            onOpenChange(false);
          },
          () => {}
        )
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : "Could not access camera");
        });
    }, startDelayMs);

    return () => {
      window.clearTimeout(timer);
      const inst = scannerRef.current;
      scannerRef.current = null;
      if (inst) {
        inst
          .stop()
          .then(() => {
            try {
              inst.clear();
            } catch {
              /* ignore */
            }
          })
          .catch(() => {});
      }
    };
  }, [open, onOpenChange, readerId]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Close scanner"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-[101] w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Scan QR code</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Point the camera at a student or staff ID QR. Works with the Techna JSON format or plain ID.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" className="shrink-0" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div
          id={readerId}
          className="mx-auto min-h-[280px] w-full max-w-[320px] overflow-hidden rounded-xl border border-border bg-black/5"
        />
        {error ? (
          <p className="mt-3 text-center text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
