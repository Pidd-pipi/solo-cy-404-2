import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Copy, Download, Edit3, MoreVertical, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTemplateById } from '../../stores/template';
import { Resume } from '../../types/resume';
import { formatDateTime } from '../../utils/format';

interface ResumeCardProps {
  resume: Resume;
  onDuplicate: (resumeId: string) => void;
  onDelete: (resumeId: string) => void;
}

export function ResumeCard({ resume, onDuplicate, onDelete }: ResumeCardProps) {
  const template = getTemplateById(resume.templateId);
  const enabledSections = resume.sections.filter((section) => section.enabled).length;

  return (
    <article className="group flex min-h-[260px] flex-col justify-between border border-[var(--border)] bg-[var(--surface)] p-5 shadow-panel transition hover:-translate-y-0.5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--accent-strong)]">{template.name}</p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-[var(--ink)]">{resume.title}</h3>
          </div>
          <Menu as="div" className="relative">
            <MenuButton className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-alt)]">
              <MoreVertical size={18} aria-hidden />
            </MenuButton>
            <MenuItems className="absolute right-0 z-20 mt-2 w-44 border border-[var(--border)] bg-[var(--surface)] p-1 shadow-panel">
              <MenuItem>
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm data-[focus]:bg-[var(--surface-alt)]"
                  type="button"
                  onClick={() => onDuplicate(resume.id)}
                >
                  <Copy size={15} aria-hidden /> 复制
                </button>
              </MenuItem>
              <MenuItem>
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-[var(--danger)] data-[focus]:bg-[var(--surface-alt)]"
                  type="button"
                  onClick={() => onDelete(resume.id)}
                >
                  <Trash2 size={15} aria-hidden /> 删除
                </button>
              </MenuItem>
            </MenuItems>
          </Menu>
        </div>
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{resume.summary}</p>
      </div>
      <div className="mt-6">
        <div className="mb-4 grid grid-cols-2 gap-3 text-xs text-[var(--muted)]">
          <span>{enabledSections} 个模块启用</span>
          <span className="text-right">更新 {formatDateTime(resume.updatedAt)}</span>
        </div>
        <div className="flex gap-2">
          <Link
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--ink-invert)] hover:bg-[var(--accent-strong)]"
            to={`/resumes/${resume.id}/edit`}
          >
            <Edit3 size={16} aria-hidden /> 编辑
          </Link>
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-alt)]"
            to={`/resumes/${resume.id}/export`}
            aria-label="导出预览"
          >
            <Download size={16} aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}

