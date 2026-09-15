import { create } from 'zustand';
import { EducationLevel, SkillCategory, SkillLevel } from '../types/enums';
import { Resume, ResumeBasicInfo, ResumeSection, ResumeSectionType } from '../types/resume';
import { createId } from '../utils/format';
import { readStorage, storageKeys, writeStorage } from '../utils/storage';
import { useTemplateStore } from './template';

const defaultSections: ResumeSection[] = [
  { id: 'summary', title: '职业摘要', enabled: true },
  { id: 'work', title: '工作经历', enabled: true },
  { id: 'projects', title: '项目经历', enabled: true },
  { id: 'skills', title: '技能矩阵', enabled: true },
  { id: 'education', title: '教育经历', enabled: true },
];

const defaultBasicInfo: ResumeBasicInfo = {
  fullName: '林知远',
  headline: '增长产品经理 / AI 工具策划',
  phone: '+86 138 0000 2831',
  email: 'lin.resume@example.com',
  location: '上海',
  website: 'portfolio.example.com',
  avatarUrl: '',
};

function buildResume(templateId = 'atelier', title = '我的智能简历'): Resume {
  const now = new Date().toISOString();

  return {
    id: createId('resume'),
    title,
    templateId,
    createdAt: now,
    updatedAt: now,
    basicInfo: defaultBasicInfo,
    summary:
      '8 年产品与增长经验，曾从 0 到 1 搭建多端内容生产工具，擅长用数据识别业务瓶颈并组织跨团队交付。',
    sections: defaultSections,
    workExperiences: [
      {
        id: createId('work'),
        companyName: '青松科技',
        position: '高级产品经理',
        startDate: '2021.06',
        endDate: '至今',
        responsibilities: ['负责 AI 内容工作台的规划、验证与迭代节奏', '组织设计、算法、工程和增长团队共创核心工作流'],
        achievements: ['核心编辑链路转化率提升 32%', '将简历生成任务平均耗时从 42 分钟降至 11 分钟'],
      },
      {
        id: createId('work'),
        companyName: '云岭数据',
        position: '增长产品经理',
        startDate: '2018.03',
        endDate: '2021.05',
        responsibilities: ['搭建用户分层运营模型', '推进看板、实验平台和增长活动配置化'],
        achievements: ['季度留存提升 18%', '实验上线周期缩短 45%'],
      },
    ],
    educations: [
      {
        id: createId('edu'),
        school: '华东理工大学',
        major: '信息管理与信息系统',
        level: EducationLevel.Bachelor,
        startDate: '2013.09',
        endDate: '2017.06',
        gpa: '3.7 / 4.0',
        honors: ['优秀毕业生', '校级创新项目一等奖'],
      },
    ],
    skills: [
      { id: createId('skill'), name: '产品策略', level: SkillLevel.Expert, proficiency: 5, category: SkillCategory.Soft },
      { id: createId('skill'), name: 'A/B Testing', level: SkillLevel.Advanced, proficiency: 4, category: SkillCategory.Technology },
      { id: createId('skill'), name: 'SQL / 数据分析', level: SkillLevel.Advanced, proficiency: 4, category: SkillCategory.Technology },
      { id: createId('skill'), name: '英语沟通', level: SkillLevel.Intermediate, proficiency: 3, category: SkillCategory.Language },
    ],
    projects: [
      {
        id: createId('project'),
        name: 'AI 简历诊断引擎',
        role: '产品负责人',
        startDate: '2023.11',
        endDate: '2024.08',
        techStack: ['React', 'LLM Workflow', 'Embedding', 'Analytics'],
        description: '为求职者提供结构化简历评分、岗位匹配建议和改写建议。',
        outcomes: ['首月完成 4.6 万份简历诊断', '付费转化率较旧版提升 21%'],
      },
    ],
  };
}

const storedResumes = readStorage<Resume[]>(storageKeys.resumes, []);
const initialResumes = storedResumes.length > 0 ? storedResumes : [buildResume('atelier', '产品经理求职简历')];
const initialActiveResumeId = readStorage<string | null>(storageKeys.activeResumeId, initialResumes[0]?.id ?? null);

function persist(state: Pick<ResumeState, 'resumes' | 'activeResumeId'>): void {
  writeStorage(storageKeys.resumes, state.resumes);
  writeStorage(storageKeys.activeResumeId, state.activeResumeId);
}

interface ResumeState {
  resumes: Resume[];
  activeResumeId: string | null;
  createResume: () => string;
  duplicateResume: (resumeId: string) => string | null;
  deleteResume: (resumeId: string) => void;
  setActiveResume: (resumeId: string | null) => void;
  updateResume: (resumeId: string, patch: Partial<Resume>) => void;
  updateBasicInfo: (resumeId: string, patch: Partial<ResumeBasicInfo>) => void;
  reorderSections: (resumeId: string, sectionIds: ResumeSectionType[]) => void;
  toggleSection: (resumeId: string, sectionId: ResumeSectionType) => void;
  replaceResumes: (resumes: Resume[], activeResumeId?: string | null) => void;
}

export const useResumeStore = create<ResumeState>((set, get) => ({
  resumes: initialResumes,
  activeResumeId: initialActiveResumeId,
  createResume: () => {
    const selectedTemplateId = useTemplateStore.getState().selectedTemplateId;
    const resume = buildResume(selectedTemplateId, `新简历 ${get().resumes.length + 1}`);
    set((state) => ({
      resumes: [resume, ...state.resumes],
      activeResumeId: resume.id,
    }));
    persist(get());
    return resume.id;
  },
  duplicateResume: (resumeId) => {
    const source = get().resumes.find((resume) => resume.id === resumeId);
    if (!source) {
      return null;
    }

    const now = new Date().toISOString();
    const clone: Resume = {
      ...source,
      id: createId('resume'),
      title: `${source.title} 副本`,
      createdAt: now,
      updatedAt: now,
      workExperiences: source.workExperiences.map((item) => ({ ...item, id: createId('work') })),
      educations: source.educations.map((item) => ({ ...item, id: createId('edu') })),
      skills: source.skills.map((item) => ({ ...item, id: createId('skill') })),
      projects: source.projects.map((item) => ({ ...item, id: createId('project') })),
    };

    set((state) => ({
      resumes: [clone, ...state.resumes],
      activeResumeId: clone.id,
    }));
    persist(get());
    return clone.id;
  },
  deleteResume: (resumeId) => {
    set((state) => {
      const nextResumes = state.resumes.filter((resume) => resume.id !== resumeId);
      const activeResumeId =
        state.activeResumeId === resumeId ? nextResumes[0]?.id ?? null : state.activeResumeId;
      return { resumes: nextResumes, activeResumeId };
    });
    persist(get());
  },
  setActiveResume: (resumeId) => {
    set({ activeResumeId: resumeId });
    persist(get());
  },
  updateResume: (resumeId, patch) => {
    set((state) => ({
      resumes: state.resumes.map((resume) =>
        resume.id === resumeId
          ? {
              ...resume,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : resume,
      ),
    }));
    persist(get());
  },
  updateBasicInfo: (resumeId, patch) => {
    set((state) => ({
      resumes: state.resumes.map((resume) =>
        resume.id === resumeId
          ? {
              ...resume,
              basicInfo: { ...resume.basicInfo, ...patch },
              updatedAt: new Date().toISOString(),
            }
          : resume,
      ),
    }));
    persist(get());
  },
  reorderSections: (resumeId, sectionIds) => {
    set((state) => ({
      resumes: state.resumes.map((resume) => {
        if (resume.id !== resumeId) {
          return resume;
        }
        const sortedSections = sectionIds
          .map((sectionId) => resume.sections.find((section) => section.id === sectionId))
          .filter((section): section is ResumeSection => Boolean(section));
        return { ...resume, sections: sortedSections, updatedAt: new Date().toISOString() };
      }),
    }));
    persist(get());
  },
  toggleSection: (resumeId, sectionId) => {
    set((state) => ({
      resumes: state.resumes.map((resume) =>
        resume.id === resumeId
          ? {
              ...resume,
              sections: resume.sections.map((section) =>
                section.id === sectionId ? { ...section, enabled: !section.enabled } : section,
              ),
              updatedAt: new Date().toISOString(),
            }
          : resume,
      ),
    }));
    persist(get());
  },
  replaceResumes: (resumes, activeResumeId) => {
    set({ resumes, activeResumeId: activeResumeId ?? resumes[0]?.id ?? null });
    persist(get());
  },
}));

