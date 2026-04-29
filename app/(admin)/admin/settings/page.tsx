"use client";

import { useState } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";
import {
  FONT_SCALE_DEFAULT_PERCENT,
  FONT_SCALE_MAX_PERCENT,
  FONT_SCALE_MIN_PERCENT,
  useFontScale,
} from "@/app/contexts/FontScaleContext";
import { authApi } from "@/app/lib/api";
import { useAppNotice } from "@/app/contexts/AppNoticeContext";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { scalePercent, setScalePercent, reset } = useFontScale();
  const { showNotice } = useAppNotice();
  const [savingPassword, setSavingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">Personal preferences</p>
      </div>

      <div className="card bg-card border border-border shadow-sm">
        <div className="card-body p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-foreground">Theme</p>
              <p className="text-sm text-muted-foreground mt-1">
                Switch between light and dark mode.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </Button>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tip
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              If you don’t see changes immediately, refresh the page.
            </p>
          </div>
        </div>
      </div>

      <div className="card bg-card border border-border shadow-sm">
        <div className="card-body p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-foreground">Font size</p>
              <p className="text-sm text-muted-foreground mt-1">
                Make text smaller or larger across the admin portal.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-outline badge-sm">{scalePercent}%</span>
              <Button
                type="button"
                variant="outline"
                className="h-9 px-3"
                onClick={reset}
                title="Reset to default"
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:max-w-xl">
            <input
              type="range"
              min={FONT_SCALE_MIN_PERCENT}
              max={FONT_SCALE_MAX_PERCENT}
              step={1}
              value={scalePercent}
              onChange={(e) => setScalePercent(Number(e.target.value))}
              className="range range-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{FONT_SCALE_MIN_PERCENT}%</span>
              <span>Default {FONT_SCALE_DEFAULT_PERCENT}%</span>
              <span>{FONT_SCALE_MAX_PERCENT}%</span>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Preview
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                This is a sample line so you can judge readability before leaving this page.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-card border border-border shadow-sm">
        <div className="card-body p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-foreground">Change password</p>
              <p className="text-sm text-muted-foreground mt-1">
                Update your login password. Minimum 8 characters.
              </p>
            </div>
          </div>

          <form
            className="mt-4 grid grid-cols-1 gap-3 sm:max-w-xl"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!currentPassword || !newPassword || !newPasswordConfirm) {
                showNotice({ message: "Please fill all password fields", variant: "info" });
                return;
              }
              if (newPassword !== newPasswordConfirm) {
                showNotice({ message: "New password confirmation does not match", variant: "error" });
                return;
              }
              try {
                setSavingPassword(true);
                await authApi.changePassword({
                  current_password: currentPassword,
                  new_password: newPassword,
                  new_password_confirmation: newPasswordConfirm,
                });
                setCurrentPassword("");
                setNewPassword("");
                setNewPasswordConfirm("");
                showNotice({ message: "Password updated", variant: "success" });
              } catch (err: any) {
                showNotice({ message: err?.message || "Failed to change password", variant: "error" });
              } finally {
                setSavingPassword(false);
              }
            }}
          >
            <input
              type="password"
              className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={savingPassword}
              autoComplete="current-password"
            />
            <input
              type="password"
              className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={savingPassword}
              autoComplete="new-password"
            />
            <input
              type="password"
              className="input input-bordered w-full border-border focus:border-primary focus:outline-none"
              placeholder="Confirm new password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              disabled={savingPassword}
              autoComplete="new-password"
            />
            <div className="pt-2">
              <button className="btn btn-primary" type="submit" disabled={savingPassword}>
                {savingPassword ? "Saving…" : "Update password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

