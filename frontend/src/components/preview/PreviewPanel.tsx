import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ResumeTemplate } from '../../stores/template';
import { Resume } from '../../types/resume';
import { Button } from '../common/Button';
import { ResumePreview } from './ResumePreview';

interface PreviewPanelProps {
  template: ResumeTemplate;
  resume?: Resume;
  onApply?: () => void;
}

export function PreviewPanel({ template, resume, onApply }: PreviewPanelProps) {
  return (
    <aside className="sticky top-6 border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">{template.name}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{template.description}</p>
        </div>
        {onApply ? (
          <Button onClick={onApply} variant="primary">
            应用
          </Button>
        ) : null}
      </div>
      <div className="mt-5 max-h-[720px] overflow-hidden border border-[var(--border)] bg-[var(--bg)] p-3">
        {resume ? <ResumePreview resume={resume} template={template} fontSize={9} /> : null}
      </div>
      {resume ? (
        <Link
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]"
          to={`/resumes/${resume.id}/edit`}
        >
          进入编辑器 <ArrowRight size={15} aria-hidden />
        </Link>
      ) : null}
    </aside>
  );
}

