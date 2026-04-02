/**
 * Stable payload encoded in student ID QR codes. Tied to the student's permanent `barcode`
 * (set once at creation). Attendance `parseScanCode` accepts JSON with `b` or `barcode`.
 */
export function encodeStudentQrPayload(barcode: string): string {
  return JSON.stringify({
    v: 1,
    t: "student",
    b: barcode,
  });
}
