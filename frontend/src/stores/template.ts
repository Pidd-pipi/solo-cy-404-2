import { create } from 'zustand';
import { readStorage, storageKeys, writeStorage } from '../utils/storage';

export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  accent: string;
  paper: string;
  ink: string;
  layout: 'classic' | 'sidebar' | 'editorial' | 'compact';
}

export const templates: ResumeTemplate[] = [
  {
    id: 'atelier',
    name: 'Atelier',
    description: '温润纸张质感，适合产品、运营和创意岗位。',
    accent: '#21765f',
    paper: '#fffaf0',
    ink: '#17221f',
    layout: 'classic',
  },
  {
    id: 'executive',
    name: 'Executive',
    description: '克制商务版式，突出履历层级和关键成果。',
    accent: '#264a7a',
    paper: '#f7f9fb',
    ink: '#1b2430',
    layout: 'sidebar',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: '杂志式标题层级，适合内容、品牌和研究类岗位。',
    accent: '#a6533f',
    paper: '#fbf4ea',
    ink: '#231c19',
    layout: 'editorial',
  },
  {
    id: 'terminal',
    name: 'Terminal',
    description: '技术向高密度结构，强调技能栈和项目产出。',
    accent: '#4c6f52',
    paper: '#f5f7f1',
    ink: '#172018',
    layout: 'compact',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: '留白充足，适合咨询、法务和管理岗位。',
    accent: '#6f5c42',
    paper: '#fffdf8',
    ink: '#20201d',
    layout: 'classic',
  },
  {
    id: 'studio',
    name: 'Studio',
    description: '左栏导航感模板，适合设计和跨职能岗位。',
    accent: '#7e4f76',
    paper: '#fbf8fc',
    ink: '#211a22',
    layout: 'sidebar',
  },
];

interface TemplateState {
  selectedTemplateId: string;
  setSelectedTemplate: (templateId: string) => void;
  getSelectedTemplate: () => ResumeTemplate;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  selectedTemplateId: readStorage<string>(storageKeys.template, templates[0].id),
  setSelectedTemplate: (templateId) => {
    set({ selectedTemplateId: templateId });
    writeStorage(storageKeys.template, templateId);
  },
  getSelectedTemplate: () =>
    templates.find((template) => template.id === get().selectedTemplateId) ?? templates[0],
}));

export function getTemplateById(templateId: string): ResumeTemplate {
  return templates.find((template) => template.id === templateId) ?? templates[0];
}

