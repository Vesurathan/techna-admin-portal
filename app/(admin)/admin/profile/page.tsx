"use client";

import { useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import { PersonAvatar } from "@/app/components/PersonAvatar";
import { authApi } from "@/app/lib/api";
import { useAppNotice } from "@/app/contexts/AppNoticeContext";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { showNotice } = useAppNotice();
  const [uploading, setUploading] = useState(false);

  if (!user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  const [firstName, ...rest] = (user.name || "").trim().split(/\s+/);
  const lastName = rest.join(" ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground mt-2">Your account details</p>
      </div>

      <div className="card bg-card border border-border shadow-sm">
        <div className="card-body p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <PersonAvatar
              imageUrl={user.profileImageUrl}
              firstName={firstName || user.name}
              lastName={lastName}
              alt={user.name}
              size="md"
              ring
            />
            <div className="min-w-0">
              <p className="text-lg font-semibold text-foreground">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-2 inline-flex items-center gap-2">
                <span className="badge badge-outline">{user.role?.name || "No role"}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</p>
              <p className="mt-1 text-sm font-medium text-foreground">{user.name}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</p>
              <p className="mt-1 text-sm font-medium text-foreground">{user.email}</p>
            </div>
            <div className="rounded-lg border border-border p-4 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</p>
              <p className="mt-1 text-sm font-medium text-foreground">{user.role?.name || "No role"}</p>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <p className="text-base font-semibold text-foreground">Profile image</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload a photo to show in the navbar.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <input
                type="file"
                accept="image/*"
                className="file-input file-input-bordered file-input-primary w-full sm:max-w-md border-border"
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    setUploading(true);
                    const res = await authApi.uploadProfileImage(file);
                    // update auth context
                    if (res.user) {
                      await refreshUser();
                    }
                    showNotice({ message: "Profile image updated", variant: "success" });
                  } catch (err: any) {
                    showNotice({
                      message: err?.message || "Failed to upload profile image",
                      variant: "error",
                    });
                  } finally {
                    setUploading(false);
                    e.currentTarget.value = "";
                  }
                }}
              />
              <div className="text-sm text-muted-foreground">
                {uploading ? "Uploading…" : "PNG/JPG/WebP up to 10MB"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

