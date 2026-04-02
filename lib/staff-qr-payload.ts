/**
 * Stable payload for staff attendance QR. Uses the permanent `barcode` on the staff record
 * (set when the staff member is created). Attendance `parseScanCode` accepts JSON with `b` or `barcode`.
 */
export function encodeStaffQrPayload(barcode: string): string {
  return JSON.stringify({
    v: 1,
    t: "staff",
    b: barcode,
  });
}
