import { LayoutTemplate } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { PreviewPanel } from '../components/preview/PreviewPanel';
import { TemplateCard } from '../components/preview/TemplateCard';
import { useResumeStore } from '../stores/resume';
import { templates, useTemplateStore } from '../stores/template';

export function TemplateGallery() {
  const selectedTemplateId = useTemplateStore((state) => state.selectedTemplateId);
  const setSelectedTemplate = useTemplateStore((state) => state.setSelectedTemplate);
  const resumes = useResumeStore((state) => state.resumes);
  const activeResumeId = useResumeStore((state) => state.activeResumeId);
  const updateResume = useResumeStore((state) => state.updateResume);
  const activeResume = resumes.find((resume) => resume.id === activeResumeId) ?? resumes[0];
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0];

  if (templates.length === 0) {
    return <EmptyState title="没有模板" description="模板配置为空，请先补充模板数据。" icon={<LayoutTemplate size={24} aria-hidden />} />;
  }

  return (
    <div>
      <div className="border-b border-[var(--border)] pb-6">
        <p className="text-sm font-semibold uppercase text-[var(--accent-strong)]">Template system</p>
        <h1 className="mt-2 font-display text-4xl font-semibold">模板选择</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">预设 6 套版式，选择后可应用到当前简历，也会作为新建简历的默认模板。</p>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_420px]">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              selected={template.id === selectedTemplateId}
              template={template}
              onSelect={setSelectedTemplate}
            />
          ))}
        </div>
        <PreviewPanel
          resume={activeResume}
          template={selectedTemplate}
          onApply={activeResume ? () => updateResume(activeResume.id, { templateId: selectedTemplate.id }) : undefined}
        />
      </div>
    </div>
  );
}

