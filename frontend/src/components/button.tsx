import { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary";

const BASE_BUTTON_CLASSES =
  "rounded-md px-6 py-2.5 font-medium transition-all duration-200 ease-out-snap active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:pointer-events-none";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "btn-sheen bg-accent text-accent-ink shadow-sm shadow-accent/20 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-md hover:shadow-accent/30",
  secondary:
    "border border-border text-ink-soft hover:text-ink hover:border-ink-faint hover:-translate-y-0.5 hover:shadow-sm",
};

export function buttonClassName(variant: ButtonVariant = "primary", className = "") {
  return `${BASE_BUTTON_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return <button className={buttonClassName(variant, className)} {...props} />;
}
