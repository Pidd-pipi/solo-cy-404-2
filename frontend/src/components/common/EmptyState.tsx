import { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent-strong)]">
        {icon}
      </div>
      <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{description}</p>
      {actionLabel && onAction ? (
        <Button className="mt-6" onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

