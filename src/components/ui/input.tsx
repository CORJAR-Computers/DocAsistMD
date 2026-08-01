import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text mb-1.5">{label}</label>
      )}
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-border bg-surface-dark px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 motion-reduce:transition-none",
          error && "border-danger focus:ring-danger",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";

export { Input };
