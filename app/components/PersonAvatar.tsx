"use client";

import { useCallback, useEffect, useState } from "react";

export type PersonAvatarSize = "sm" | "md" | "lg";

type PersonAvatarProps = {
  imageUrl: string | null | undefined;
  firstName: string;
  lastName: string;
  alt?: string;
  size?: PersonAvatarSize;
  className?: string;
  ring?: boolean;
};

const sizeClasses: Record<PersonAvatarSize, string> = {
  sm: "w-10 h-10 min-w-10 min-h-10 text-sm",
  md: "w-14 h-14 min-w-14 min-h-14 text-base",
  lg: "w-20 h-20 min-w-20 min-h-20 text-lg",
};

function initials(firstName: string, lastName: string): string {
  const a = (firstName?.trim()?.charAt(0) || "").toUpperCase();
  const b = (lastName?.trim()?.charAt(0) || "").toUpperCase();
  if (a && b) {
    return a + b;
  }
  if (a) {
    return a;
  }
  if (b) {
    return b;
  }
  return "?";
}

export function PersonAvatar({
  imageUrl,
  firstName,
  lastName,
  alt,
  size = "sm",
  className = "",
  ring = false,
}: PersonAvatarProps) {
  const [failed, setFailed] = useState(false);
  const url = typeof imageUrl === "string" && imageUrl.trim() !== "" ? imageUrl.trim() : "";
  const showImage = Boolean(url) && !failed;

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  const onError = useCallback(() => {
    setFailed(true);
  }, []);

  const dim = sizeClasses[size];
  const ringClass = ring ? " ring ring-border ring-offset-2 ring-offset-background" : "";

  if (showImage) {
    return (
      <div className={`inline-flex flex-shrink-0 ${className}`}>
        <div className={`${dim} rounded-full overflow-hidden${ringClass}`}>
          <img
            src={url}
            alt={alt || `${firstName} ${lastName}`.trim() || "Profile"}
            className="h-full w-full object-cover"
            onError={onError}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex flex-shrink-0 ${className}`}
      title={alt || `${firstName} ${lastName}`.trim()}
    >
      <div
        className={`${dim} rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center${ringClass}`}
        aria-hidden
      >
        {initials(firstName, lastName)}
      </div>
    </div>
  );
}
