import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "secondary";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success-text",
    warning: "bg-warning/10 text-warning-text",
    danger: "bg-danger/10 text-danger-text",
    info: "bg-accent/10 text-info-text",
    secondary: "bg-surface-dark text-text-light",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors duration-200 motion-reduce:transition-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
