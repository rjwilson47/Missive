/**
 * @file src/components/ui/Button.tsx
 * Reusable button component with consistent styling and accessibility.
 *
 * Variants:
 *   - primary: filled, dark background (main CTAs)
 *   - secondary: bordered, transparent background (secondary actions)
 *   - danger: red fill (delete account, destructive actions)
 *   - ghost: no border or fill (inline text actions)
 */

"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-ink text-paper hover:bg-ink/80 border border-transparent",
  secondary: "bg-transparent text-ink border border-ink-muted hover:bg-paper-warm",
  danger: "bg-seal text-white hover:bg-seal-light border border-transparent",
  ghost: "bg-transparent text-ink-muted hover:text-ink border border-transparent",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3 text-base",
};

/**
 * Accessible, variant-aware button with loading state.
 *
 * @param variant   - Visual style (default: "primary")
 * @param size      - Size preset (default: "md")
 * @param isLoading - Shows loading spinner and disables interaction
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={isLoading}
        className={[
          "inline-flex items-center justify-center gap-2 rounded font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal focus-visible:ring-offset-1",
          variantClasses[variant],
          sizeClasses[size],
          isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          className,
        ].join(" ")}
        {...props}
      >
        {isLoading && (
          // Simple CSS spinner (no extra library needed)
          <span
            className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
