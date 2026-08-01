import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "secondary";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/10 text-emerald-700",
    warning: "bg-warning/10 text-amber-700",
    danger: "bg-danger/10 text-red-700",
    info: "bg-accent/10 text-blue-700",
    secondary: "bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
