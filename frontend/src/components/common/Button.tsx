import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--accent)] text-[var(--ink-invert)] hover:bg-[var(--accent-strong)]',
  secondary:
    'border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-alt)]',
  ghost: 'text-[var(--ink)] hover:bg-[var(--surface-alt)]',
  danger: 'bg-[var(--danger)] text-white hover:opacity-90',
};

export function Button({ children, className = '', variant = 'secondary', icon, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${variants[variant]} disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      type="button"
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

