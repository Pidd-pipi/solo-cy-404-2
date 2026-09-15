import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, LayoutTemplate, UserRound } from 'lucide-react';
import { BasicInfoPanel } from '../components/editor/BasicInfoPanel';
import { ModuleSidebar } from '../components/editor/ModuleSidebar';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { SectionEditor } from '../components/common/SectionEditor';
import { ResumePreview } from '../components/preview/ResumePreview';
import { useProfileStore } from '../stores/profile';
import { useResumeStore } from '../stores/resume';
import { templates } from '../stores/template';
import { ResumeSection, ResumeSectionType } from '../types/resume';

export function ResumeEditor() {
  const { id } = useParams();
  const [activeSectionId, setActiveSectionId] = useState<ResumeSectionType>('summary');
  const resumes = useResumeStore((state) => state.resumes);
  const updateResume = useResumeStore((state) => state.updateResume);
  const updateBasicInfo = useResumeStore((state) => state.updateBasicInfo);
  const reorderSections = useResumeStore((state) => state.reorderSections);
  const toggleSection = useResumeStore((state) => state.toggleSection);
  const setActiveResume = useResumeStore((state) => state.setActiveResume);
  const profile = useProfileStore((state) => state.profile);
  const resume = useMemo(() => resumes.find((item) => item.id === id), [id, resumes]);

  if (!resume) {
    return (
      <EmptyState
        description="该简历可能已经被删除，返回列表后可以创建或导入新的版本。"
        title="没有找到这份简历"
        actionLabel="回到列表"
        onAction={() => window.history.back()}
      />
    );
  }

  useEffect(() => {
    if (resume) {
      setActiveResume(resume.id);
    }
  }, [resume, setActiveResume]);

  const handleSorted = (sections: ResumeSection[]) => {
    reorderSections(
      resume.id,
      sections.map((section) => section.id),
    );
  };

  const syncProfile = () => {
    updateBasicInfo(resume.id, {
      fullName: profile.fullName,
      headline: profile.headline,
      phone: profile.phone,
      email: profile.email,
      location: profile.location,
      website: profile.website,
      avatarUrl: profile.avatarUrl,
    });
    updateResume(resume.id, { summary: profile.summary });
  };

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase text-[var(--accent-strong)]">Live editor</p>
          <input
            className="mt-2 w-full bg-transparent font-display text-4xl font-semibold outline-none"
            value={resume.title}
            aria-label="简历标题"
            onChange={(event) => updateResume(resume.id, { title: event.target.value })}
          />
          <p className="mt-2 text-sm text-[var(--muted)]">左侧模块拖拽排序，中间编辑内容，右侧实时预览。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="min-h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold"
            value={resume.templateId}
            onChange={(event) => updateResume(resume.id, { templateId: event.target.value })}
            aria-label="当前模板"
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <Button icon={<UserRound size={16} aria-hidden />} onClick={syncProfile}>
            同步资料
          </Button>
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold hover:bg-[var(--surface-alt)]"
            to="/templates"
          >
            <LayoutTemplate size={16} aria-hidden /> 模板库
          </Link>
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink-invert)] hover:bg-[var(--accent-strong)]"
            to={`/resumes/${resume.id}/export`}
          >
            <Download size={16} aria-hidden /> 导出
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[280px_minmax(420px,1fr)_440px]">
        <ModuleSidebar
          activeSectionId={activeSectionId}
          onSelect={setActiveSectionId}
          onSorted={handleSorted}
          onToggle={(sectionId) => toggleSection(resume.id, sectionId)}
          sections={resume.sections}
        />
        <div className="space-y-5">
          <BasicInfoPanel value={resume.basicInfo} onChange={(patch) => updateBasicInfo(resume.id, patch)} />
          <SectionEditor resume={resume} sectionId={activeSectionId} onChange={(patch) => updateResume(resume.id, patch)} />
        </div>
        <aside className="max-h-[calc(100vh-140px)] overflow-auto border border-[var(--border)] bg-[var(--surface-alt)] p-4">
          <ResumePreview resume={resume} fontSize={10} />
        </aside>
      </div>
    </div>
  );
}
