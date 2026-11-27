"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export type AvatarSize = "sm" | "md" | "lg";

export type AvatarBadgeStatusVariant =
  | "online"
  | "busy"
  | "away"
  | "offline"
  | "do-not-disturb"
  | "recording"
  | "typing"
  | "invisible";

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
};

const BADGE_SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-3.5 w-3.5",
};

const AvatarSizeContext = React.createContext<AvatarSize>("md");

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: AvatarSize;
}

export function Avatar({ size = "md", className, children, ...props }: AvatarProps) {
  return (
    <AvatarSizeContext.Provider value={size}>
      <div
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center rounded-full select-none",
          SIZE_CLASSES[size],
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AvatarSizeContext.Provider>
  );
}

export function AvatarImage({
  src,
  alt,
  className,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? "User avatar"}
      className={cn("h-full w-full rounded-full object-cover", className)}
      {...props}
    />
  );
}

export function AvatarFallback({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "bg-navy flex h-full w-full items-center justify-center rounded-full font-semibold text-white",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function AvatarBadge({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  const size = React.useContext(AvatarSizeContext);
  return (
    <span
      className={cn(
        "ring-background absolute right-0 bottom-0 flex items-center justify-center rounded-full ring-2",
        BADGE_SIZE_CLASSES[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

const STATUS_STYLE: Record<AvatarBadgeStatusVariant, string> = {
  online: "bg-emerald-500",
  busy: "bg-red-500",
  away: "bg-amber-400",
  offline: "bg-slate-400",
  "do-not-disturb": "bg-rose-600",
  recording: "bg-red-600 animate-pulse",
  typing: "bg-blue-500 animate-pulse",
  invisible: "bg-slate-300 border border-slate-500",
};

export function AvatarBadgeStatus({
  variant,
  className,
  title,
}: {
  variant: AvatarBadgeStatusVariant;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title ?? variant}
      aria-label={title ?? variant}
      className={cn(
        "relative flex h-full w-full items-center justify-center rounded-full",
        STATUS_STYLE[variant],
        className
      )}
    >
      {variant === "do-not-disturb" && (
        <span className="h-[2px] w-1.5 rounded-full bg-white" />
      )}
      {variant === "away" && <span className="h-1 w-1 rounded-full bg-amber-950/60" />}
    </span>
  );
}
