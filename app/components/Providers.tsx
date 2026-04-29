"use client";

import { ThemeProvider } from "@/app/contexts/ThemeContext";
import { FontScaleProvider } from "@/app/contexts/FontScaleContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <FontScaleProvider>{children}</FontScaleProvider>
    </ThemeProvider>
  );
}
