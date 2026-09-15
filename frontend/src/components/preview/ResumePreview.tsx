import { CSSProperties } from 'react';
import { useProfileStore } from '../../stores/profile';
import { getTemplateById, ResumeTemplate } from '../../stores/template';
import { educationLevelLabels, skillCategoryLabels, skillLevelLabels } from '../../types/enums';
import { Resume } from '../../types/resume';
import { formatDateRange } from '../../utils/format';

interface ResumePreviewProps {
  resume: Resume;
  template?: ResumeTemplate;
  fontSize?: number;
}

function SectionTitle({ children, accent }: { children: string; accent: string }) {
  return (
    <h2 className="mb-3 border-b pb-1 font-display text-[1.05em] font-semibold" style={{ borderColor: accent, color: accent }}>
      {children}
    </h2>
  );
}

export function ResumePreview({ resume, template = getTemplateById(resume.templateId), fontSize = 14 }: ResumePreviewProps) {
  const profile = useProfileStore((state) => state.profile);
  const info = {
    fullName: resume.basicInfo.fullName || profile.fullName,
    headline: resume.basicInfo.headline || profile.headline,
    phone: resume.basicInfo.phone || profile.phone,
    email: resume.basicInfo.email || profile.email,
    location: resume.basicInfo.location || profile.location,
    website: resume.basicInfo.website || profile.website,
    avatarUrl: resume.basicInfo.avatarUrl || profile.avatarUrl,
  };
  const enabledSections = resume.sections.filter((section) => section.enabled);
  const style = {
    '--template-accent': template.accent,
    '--template-paper': template.paper,
    '--template-ink': template.ink,
    backgroundColor: template.paper,
    color: template.ink,
    fontSize,
  } as CSSProperties;

  const content = (
    <div className="space-y-5">
      {enabledSections.map((section) => {
        if (section.id === 'summary') {
          return (
            <section key={section.id}>
              <SectionTitle accent={template.accent}>{section.title}</SectionTitle>
              <p className="leading-7">{resume.summary || profile.summary}</p>
            </section>
          );
        }

        if (section.id === 'work') {
          return (
            <section key={section.id}>
              <SectionTitle accent={template.accent}>{section.title}</SectionTitle>
              <div className="space-y-4">
                {resume.workExperiences.map((item) => (
                  <article key={item.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">{item.position}</h3>
                        <p style={{ color: template.accent }}>{item.companyName}</p>
                      </div>
                      <p className="shrink-0 text-[0.85em] opacity-75">{formatDateRange(item.startDate, item.endDate)}</p>
                    </div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 leading-6">
                      {[...item.responsibilities, ...item.achievements].map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          );
        }

        if (section.id === 'projects') {
          return (
            <section key={section.id}>
              <SectionTitle accent={template.accent}>{section.title}</SectionTitle>
              <div className="space-y-4">
                {resume.projects.map((project) => (
                  <article key={project.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">{project.name}</h3>
                        <p className="text-[0.9em] opacity-75">
                          {project.role} · {project.techStack.join(' / ')}
                        </p>
                      </div>
                      <p className="shrink-0 text-[0.85em] opacity-75">{formatDateRange(project.startDate, project.endDate)}</p>
                    </div>
                    <p className="mt-2 leading-6">{project.description}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 leading-6">
                      {project.outcomes.map((outcome) => (
                        <li key={outcome}>{outcome}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          );
        }

        if (section.id === 'skills') {
          return (
            <section key={section.id}>
              <SectionTitle accent={template.accent}>{section.title}</SectionTitle>
              <div className="grid gap-2">
                {resume.skills.map((skill) => (
                  <div className="grid grid-cols-[1fr_auto] items-center gap-3" key={skill.id}>
                    <div>
                      <p className="font-semibold">{skill.name}</p>
                      <p className="text-[0.82em] opacity-70">
                        {skillCategoryLabels[skill.category]} · {skillLevelLabels[skill.level]}
                      </p>
                    </div>
                    <div className="h-2 w-24 bg-black/10">
                      <div className="h-full" style={{ width: `${skill.proficiency * 20}%`, backgroundColor: template.accent }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        return (
          <section key={section.id}>
            <SectionTitle accent={template.accent}>{section.title}</SectionTitle>
            <div className="space-y-3">
              {resume.educations.map((education) => (
                <article className="flex items-start justify-between gap-4" key={education.id}>
                  <div>
                    <h3 className="font-semibold">{education.school}</h3>
                    <p className="opacity-80">
                      {education.major} · {educationLevelLabels[education.level]} · GPA {education.gpa}
                    </p>
                    {education.honors.length > 0 ? <p className="mt-1 text-[0.9em] opacity-75">{education.honors.join(' / ')}</p> : null}
                  </div>
                  <p className="shrink-0 text-[0.85em] opacity-75">{formatDateRange(education.startDate, education.endDate)}</p>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );

  if (template.layout === 'sidebar') {
    return (
      <article className="min-h-full p-8 shadow-sm" style={style}>
        <div className="grid grid-cols-[190px_1fr] gap-8">
          <aside className="border-r pr-5" style={{ borderColor: template.accent }}>
            {info.avatarUrl ? <img className="mb-4 h-24 w-24 object-cover" src={info.avatarUrl} alt={info.fullName} /> : null}
            <h1 className="font-display text-3xl font-semibold leading-tight">{info.fullName}</h1>
            <p className="mt-2 leading-6" style={{ color: template.accent }}>
              {info.headline}
            </p>
            <div className="mt-6 space-y-2 text-[0.9em] leading-5 opacity-80">
              <p>{info.phone}</p>
              <p>{info.email}</p>
              <p>{info.location}</p>
              <p>{info.website}</p>
            </div>
          </aside>
          <main>{content}</main>
        </div>
      </article>
    );
  }

  return (
    <article className="min-h-full p-8 shadow-sm" style={style}>
      <header className={template.layout === 'editorial' ? 'mb-8 border-b pb-5' : 'mb-7'} style={{ borderColor: template.accent }}>
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="font-display text-4xl font-semibold leading-tight">{info.fullName}</h1>
            <p className="mt-2 text-lg" style={{ color: template.accent }}>
              {info.headline}
            </p>
          </div>
          {info.avatarUrl ? <img className="h-20 w-20 object-cover" src={info.avatarUrl} alt={info.fullName} /> : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[0.9em] opacity-75">
          <span>{info.phone}</span>
          <span>{info.email}</span>
          <span>{info.location}</span>
          <span>{info.website}</span>
        </div>
      </header>
      {content}
    </article>
  );
}
