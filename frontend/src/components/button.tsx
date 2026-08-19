import { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary";

const BASE_BUTTON_CLASSES =
  "rounded-md px-6 py-2.5 font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink hover:opacity-90",
  secondary: "border border-border text-ink-soft hover:text-ink hover:border-ink-faint",
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
