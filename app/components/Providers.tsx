"use client";

import { ThemeProvider } from "@/app/contexts/ThemeContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
