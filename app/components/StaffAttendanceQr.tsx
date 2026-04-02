"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";
import { encodeStaffQrPayload } from "@/lib/staff-qr-payload";
import { Button } from "@/components/ui/button";

type Props = {
  barcode: string;
  fullName?: string;
  subtitle?: string;
  description?: string;
  showDescription?: boolean;
  compact?: boolean;
};

export function StaffAttendanceQr({
  barcode,
  fullName,
  subtitle,
  description = "Attendance ID — scan at the gate. This code stays the same for this staff member.",
  showDescription = true,
  compact,
}: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const payload = encodeStaffQrPayload(barcode);

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    setGenError(null);
    QRCode.toDataURL(payload, {
      width: compact ? 200 : 320,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#102833", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setGenError("Could not generate QR image.");
      });
    return () => {
      cancelled = true;
    };
  }, [payload, compact]);

  const safeFileName = (subtitle || barcode || "staff")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .slice(0, 80);

  const downloadPng = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `techna-staff-qr-${safeFileName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={`rounded-xl border border-border bg-muted/30 ${compact ? "p-3" : "p-4"}`}>
      {showDescription && description ? (
        <p className="mb-3 text-xs text-muted-foreground leading-relaxed">{description}</p>
      ) : null}
      {fullName ? <p className="mb-1 text-sm font-semibold text-foreground">{fullName}</p> : null}
      {subtitle ? <p className="mb-3 font-mono text-xs text-muted-foreground">{subtitle}</p> : null}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:justify-center">
        <div className="rounded-lg border border-border bg-white p-2 shadow-sm">
          {genError ? (
            <p className="text-sm text-destructive">{genError}</p>
          ) : dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="Staff attendance QR" width={compact ? 200 : 320} height={compact ? 200 : 320} />
          ) : (
            <div
              className={`flex items-center justify-center bg-muted text-muted-foreground ${
                compact ? "h-[200px] w-[200px]" : "h-[320px] w-[320px]"
              } text-sm`}
            >
              Generating…
            </div>
          )}
        </div>
        <div className="flex w-full max-w-xs flex-col gap-2 sm:w-auto">
          <Button type="button" className="gap-2" disabled={!dataUrl} onClick={downloadPng}>
            <Download className="h-4 w-4" />
            Download PNG
          </Button>
          <p className="text-[0.65rem] leading-snug text-muted-foreground">
            Fixed to this staff member&apos;s ID. Re-print anytime; the encoded value does not change unless the record
            is regenerated in the system.
          </p>
        </div>
      </div>
    </div>
  );
}
