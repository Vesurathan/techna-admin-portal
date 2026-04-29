"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type FontScaleContextType = {
  scalePercent: number;
  setScalePercent: (value: number) => void;
  reset: () => void;
};

const STORAGE_KEY = "fontScalePercent";
const DEFAULT_SCALE_PERCENT = 95; // slightly smaller default across the portal
const MIN_SCALE_PERCENT = 85;
const MAX_SCALE_PERCENT = 115;

const FontScaleContext = createContext<FontScaleContextType | undefined>(undefined);

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function FontScaleProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [scalePercent, setScalePercentState] = useState<number>(DEFAULT_SCALE_PERCENT);

  useEffect(() => {
    setMounted(true);
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    const initial = Number.isFinite(parsed)
      ? clamp(parsed, MIN_SCALE_PERCENT, MAX_SCALE_PERCENT)
      : DEFAULT_SCALE_PERCENT;
    setScalePercentState(initial);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const next = clamp(scalePercent, MIN_SCALE_PERCENT, MAX_SCALE_PERCENT);
    const px = (16 * next) / 100;
    document.documentElement.style.fontSize = `${px}px`;
    localStorage.setItem(STORAGE_KEY, String(next));
  }, [scalePercent, mounted]);

  const api = useMemo<FontScaleContextType>(() => {
    return {
      scalePercent,
      setScalePercent: (value) => setScalePercentState(clamp(value, MIN_SCALE_PERCENT, MAX_SCALE_PERCENT)),
      reset: () => setScalePercentState(DEFAULT_SCALE_PERCENT),
    };
  }, [scalePercent]);

  // Avoid blocking render; CSS provides a sensible default.
  return <FontScaleContext.Provider value={api}>{children}</FontScaleContext.Provider>;
}

export function useFontScale() {
  const ctx = useContext(FontScaleContext);
  if (!ctx) throw new Error("useFontScale must be used within a FontScaleProvider");
  return ctx;
}

export const FONT_SCALE_DEFAULT_PERCENT = DEFAULT_SCALE_PERCENT;
export const FONT_SCALE_MIN_PERCENT = MIN_SCALE_PERCENT;
export const FONT_SCALE_MAX_PERCENT = MAX_SCALE_PERCENT;

