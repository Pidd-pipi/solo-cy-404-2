import { EducationLevel, SkillCategory, SkillLevel } from '../types/enums';
import { Resume, ResumeSection } from '../types/resume';

/**
 * 回归测试固定夹具：两个内容完整、各自演化过的版本。
 * - target：当前版本（合并目标）；source：来源版本。
 * - 刻意让所有条目 id 互不相同（模拟「复制版本后各自编辑」），确保配对只依赖业务身份。
 *
 * 该对版本在一次全量合并后应当与来源在比较维度上完全一致（再比较差异为 0），
 * 因此它既是「差异结果」基线，也是「合并后内容 / 幂等」基线。
 */

export const fixedSections: ResumeSection[] = [
  { id: 'summary', title: '职业摘要', enabled: true },
  { id: 'work', title: '工作经历', enabled: true },
  { id: 'projects', title: '项目经历', enabled: true },
  { id: 'skills', title: '技能矩阵', enabled: true },
  { id: 'education', title: '教育经历', enabled: true },
];

const FIXED_TIME = '2026-09-01T08:00:00.000Z';

export interface MakeResumeOptions {
  id: string;
  title: string;
  sections?: ResumeSection[];
  basicInfo?: Resume['basicInfo'];
  summary?: string;
  workExperiences?: Resume['workExperiences'];
  projects?: Resume['projects'];
  skills?: Resume['skills'];
  educations?: Resume['educations'];
}

export function makeResume(options: MakeResumeOptions): Resume {
  return {
    id: options.id,
    title: options.title,
    templateId: 'atelier',
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME,
    sections: options.sections ?? fixedSections.map((section) => ({ ...section })),
    basicInfo: options.basicInfo
      ? { ...options.basicInfo }
      : { fullName: '', headline: '', phone: '', email: '', location: '', website: '', avatarUrl: '' },
    summary: options.summary ?? '',
    workExperiences: (options.workExperiences ?? []).map((item) => ({ ...item })),
    projects: (options.projects ?? []).map((item) => ({ ...item })),
    skills: (options.skills ?? []).map((item) => ({ ...item })),
    educations: (options.educations ?? []).map((item) => ({ ...item })),
  };
}

export function cloneResume(resume: Resume): Resume {
  return JSON.parse(JSON.stringify(resume)) as Resume;
}

// --- 当前版本 ----------------------------------------------------------------

export function buildTargetResume(): Resume {
  return makeResume({
    id: 'target-resume',
    title: '当前版本',
    basicInfo: {
      fullName: '林知远',
      headline: '增长产品经理',
      phone: '+86 138 0000 2831',
      email: 'old@example.com', // 来源改了邮箱
      location: '上海',
      website: '',
      avatarUrl: 'http://example.com/avatar-old.png', // 头像变化
    },
    summary: '旧摘要：8 年增长经验。',
    workExperiences: [
      {
        id: 't-w-1',
        companyName: '青松科技',
        position: '高级产品经理',
        startDate: '2021.06',
        endDate: '至今', // 来源改为 2024.08（修改）
        responsibilities: ['负责核心工作流'],
        achievements: ['转化率提升 32%'],
      },
      {
        id: 't-w-2',
        companyName: '云岭数据',
        position: '增长产品经理',
        startDate: '2018.03',
        endDate: '2021.05',
        responsibilities: ['用户分层'],
        achievements: ['留存 +18%'],
      },
      {
        id: 't-w-3',
        companyName: '字节跳动',
        position: '产品经理', // 同公司同职位多条：当前第 1 条
        startDate: '2016.07',
        endDate: '2017.08',
        responsibilities: ['早期工具搭建'],
        achievements: [],
      },
      {
        id: 't-w-4',
        companyName: '字节跳动',
        position: '产品经理', // 同公司同职位多条：当前第 2 条（来源没有 → 精确移除）
        startDate: '2017.09',
        endDate: '2018.02',
        responsibilities: ['短期项目'],
        achievements: ['专项交付'],
      },
    ],
    projects: [
      {
        id: 't-p-1',
        name: 'AI 简历诊断引擎',
        role: '产品负责人',
        startDate: '2023.11',
        endDate: '2024.08',
        techStack: ['React', 'LLM'],
        description: '简历评分。',
        outcomes: ['首月 4.6 万份诊断'],
      },
      {
        id: 't-p-2',
        name: '候选人评估平台',
        role: '产品经理',
        startDate: '2022.01',
        endDate: '2023.05',
        techStack: ['Vue', 'Python'], // 来源仅换序：[Python, Vue]
        description: '旧描述', // 来源改写（修改）
        outcomes: ['评估效率 +30%', '人工成本 -20%'], // 来源仅换序（不算差异）
      },
    ],
    skills: [
      { id: 't-s-1', name: 'SQL / 数据分析', level: SkillLevel.Advanced, proficiency: 4, category: SkillCategory.Technology },
      { id: 't-s-2', name: '产品策略', level: SkillLevel.Expert, proficiency: 5, category: SkillCategory.Soft },
      { id: 't-s-3', name: 'Prompt Engineering', level: SkillLevel.Advanced, proficiency: 4, category: SkillCategory.Technology },
      { id: 't-s-4', name: '英语沟通', level: SkillLevel.Intermediate, proficiency: 3, category: SkillCategory.Language }, // 来源没有 → 移除
    ],
    educations: [
      {
        id: 't-e-1',
        school: '华东理工大学',
        major: '信息管理与信息系统',
        level: EducationLevel.Bachelor,
        startDate: '2013.09',
        endDate: '2017.06',
        gpa: '3.7 / 4.0', // 来源改为 3.9（修改）
        honors: ['优秀毕业生', '校级创新项目一等奖'], // 来源仅换序（不算差异）
      },
      {
        id: 't-e-2',
        school: '复旦大学',
        major: '计算机应用',
        level: EducationLevel.Master,
        startDate: '2017.09',
        endDate: '2020.06',
        gpa: '',
        honors: [],
      },
    ],
  });
}

// --- 来源版本 ----------------------------------------------------------------

export function buildSourceResume(): Resume {
  return makeResume({
    id: 'source-resume',
    title: '来源版本（AI 方向）',
    basicInfo: {
      fullName: '林知远',
      headline: '增长产品经理',
      phone: '+86 138 0000 2831',
      email: 'new@example.com',
      location: '', // 来源为空：绝不能产生差异，也不能清空目标的「上海」
      website: '',
      avatarUrl: 'http://example.com/avatar-new.png',
    },
    summary: '新摘要：8 年产品经验，深耕 AI 工具。',
    workExperiences: [
      {
        id: 's-w-9',
        companyName: '青松科技',
        position: '高级产品经理',
        startDate: '2021.06',
        endDate: '2024.08',
        responsibilities: ['负责核心工作流'],
        achievements: ['转化率提升 32%'],
      },
      {
        id: 's-w-8',
        companyName: '云岭数据',
        position: '增长产品经理',
        startDate: '2018.03',
        endDate: '2021.05',
        responsibilities: ['用户分层'],
        achievements: ['留存 +18%'],
      },
      {
        id: 's-w-7',
        companyName: '字节跳动',
        position: '产品经理', // 只保留同身份第 1 条
        startDate: '2016.07',
        endDate: '2017.08',
        responsibilities: ['早期工具搭建'],
        achievements: [],
      },
    ],
    projects: [
      {
        id: 's-p-9',
        name: 'AI 简历诊断引擎',
        role: '产品负责人',
        startDate: '2023.11',
        endDate: '2024.08',
        techStack: ['LLM', 'React'], // 仅换序
        description: '简历评分。',
        outcomes: ['首月 4.6 万份诊断'],
      },
      {
        id: 's-p-8',
        name: '候选人评估平台',
        role: '产品经理',
        startDate: '2022.01',
        endDate: '2023.05',
        techStack: ['Python', 'Vue'], // 仅换序
        description: '新描述：支持多维评分。',
        outcomes: ['人工成本 -20%', '评估效率 +30%'], // 仅换序
      },
    ],
    skills: [
      { id: 's-s-9', name: 'SQL / 数据分析', level: SkillLevel.Advanced, proficiency: 4, category: SkillCategory.Technology },
      { id: 's-s-8', name: '产品策略', level: SkillLevel.Expert, proficiency: 5, category: SkillCategory.Soft },
      { id: 's-s-7', name: 'Prompt Engineering', level: SkillLevel.Advanced, proficiency: 4, category: SkillCategory.Technology },
    ],
    educations: [
      {
        id: 's-e-9',
        school: '复旦大学',
        major: '计算机应用',
        level: EducationLevel.Master,
        startDate: '2017.09',
        endDate: '2020.06',
        gpa: '3.8 / 4.0', // 来源改了 GPA（修改，且实体顺序对调）
        honors: [], // 目标也为空，不制造额外差异
      },
      {
        id: 's-e-8',
        school: '华东理工大学',
        major: '信息管理与信息系统',
        level: EducationLevel.Bachelor,
        startDate: '2013.09',
        endDate: '2017.06',
        gpa: '3.9 / 4.0',
        honors: ['校级创新项目一等奖', '优秀毕业生'], // 仅换序
      },
    ],
  });
}

/** 这对版本的预期差异计数（修改/新增/移除），集中维护避免断言散落魔法数字 */
export const expectedCanonicalDiff = {
  total: 9,
  byModule: {
    basicInfo: 2, // 头像 + 邮箱（location 来源为空不算）
    summary: 1,
    work: 2, // 青松结束时间修改 + 字节第 2 条移除
    projects: 1, // 候选人平台描述修改（技术栈、成果仅换序不算）
    skills: 1, // 英语沟通移除
    education: 2, // 华理 GPA 修改 + 复旦 GPA 修改（实体换序、华理荣誉换序均不算）
  },
} as const;