import { Check } from 'lucide-react';
import { ResumeTemplate } from '../../stores/template';

interface TemplateCardProps {
  template: ResumeTemplate;
  selected: boolean;
  onSelect: (templateId: string) => void;
}

export function TemplateCard({ template, selected, onSelect }: TemplateCardProps) {
  return (
    <button
      className={`group border p-4 text-left transition hover:-translate-y-0.5 ${
        selected ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface)]'
      }`}
      type="button"
      onClick={() => onSelect(template.id)}
    >
      <div className="aspect-[4/5] border p-3" style={{ backgroundColor: template.paper, borderColor: template.accent }}>
        <div className="h-7 w-2/3" style={{ backgroundColor: template.ink }} />
        <div className="mt-3 h-2 w-full opacity-50" style={{ backgroundColor: template.accent }} />
        <div className="mt-2 h-2 w-4/5 opacity-40" style={{ backgroundColor: template.accent }} />
        <div className="mt-5 grid gap-2">
          <div className="h-2 w-full bg-black/15" />
          <div className="h-2 w-11/12 bg-black/15" />
          <div className="h-2 w-3/4 bg-black/15" />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="h-8 bg-black/10" />
          <div className="h-8 bg-black/10" />
          <div className="h-8 bg-black/10" />
        </div>
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold">{template.name}</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{template.description}</p>
        </div>
        {selected ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--accent)] text-[var(--ink-invert)]">
            <Check size={16} aria-hidden />
          </span>
        ) : null}
      </div>
    </button>
  );
}

