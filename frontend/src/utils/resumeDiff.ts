import { Education } from '../types/education';
import { Project } from '../types/project';
import { Skill } from '../types/skill';
import { WorkExperience } from '../types/work-experience';
import { Resume } from '../types/resume';

/**
 * 简历版本比较与逐项合并。
 *
 * 设计约定：
 * - 比较方向固定为「来源版本 source → 当前版本 target」。
 * - 差异分三类：added（来源有、当前没有）、removed（当前有、来源没有）、modified（双方都有但字段不同）。
 * - 空值（空字符串 / 空数组 / null / undefined，trim 后为空）与相同内容都不算差异。
 * - 列表条目不依赖易失 id，而按业务身份（公司+职位 / 学校+专业 / 技能名 / 项目名+角色）匹配。
 * - change.id 由「模块 + 身份 + 字段 + 来源内容」决定，合并后再次比较不会得到同一变化，保证可重复执行而不产生重复条目。
 */

export type DiffModuleId = 'basicInfo' | 'summary' | 'work' | 'projects' | 'skills' | 'education';
export type DiffKind = 'added' | 'removed' | 'modified';

export interface FieldDiff {
  field: string;
  label: string;
  /** 当前版本的值（removed 时即被移除条目的值） */
  currentValue: string;
  /** 来源版本的值 */
  sourceValue: string;
}

export interface ResumeChange {
  /** 稳定标识：合并后重新计算会消失，天然幂等 */
  id: string;
  module: DiffModuleId;
  kind: DiffKind;
  /** 模块内的人类可读身份，例如公司+职位、学校+专业、技能名 */
  itemLabel: string;
  /** added/removed 时为整条摘要；modified 时逐字段列出，字段即合并粒度 */
  fields: FieldDiff[];
  /** added 时携带的来源条目（深拷贝，脱离原对象） */
  sourceItem?: unknown;
}

export interface DiffGroup {
  module: DiffModuleId;
  title: string;
  changes: ResumeChange[];
}

export interface ResumeDiff {
  groups: DiffGroup[];
  totalChanges: number;
}

// ---------------------------------------------------------------------------
// 基础工具
// ---------------------------------------------------------------------------

export function normalizeText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

export function normalizeLines(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
}

function isEmptyValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return normalizeLines(value).length === 0;
  }
  return normalizeText(value) === '';
}

function valuesEqual(current: unknown, source: unknown, multiline: boolean): boolean {
  if (multiline) {
    const a = normalizeLines(current);
    const b = normalizeLines(source);
    if (a.length === 0 && b.length === 0) {
      return true;
    }
    return a.length === b.length && a.every((line, index) => line === b[index]);
  }
  const a = normalizeText(current);
  const b = normalizeText(source);
  if (a === '' && b === '') {
    return true; // 空值不算差异
  }
  return a === b;
}

function displayValue(value: unknown, multiline: boolean): string {
  if (multiline) {
    return normalizeLines(value).join('、');
  }
  return normalizeText(value);
}

/** 生成文件名/标识用的稳定片段，去掉空白与分隔符，中文保留 */
function tokenKey(value: unknown): string {
  return normalizeText(value).replace(/[\s,，。;；|/\\:：-]+/g, '').slice(0, 32);
}

// ---------------------------------------------------------------------------
// 字段元数据
// ---------------------------------------------------------------------------

interface FieldSpec {
  field: string;
  label: string;
  multiline?: boolean;
}

const basicFieldSpecs: FieldSpec[] = [
  { field: 'fullName', label: '姓名' },
  { field: 'headline', label: '职位头衔' },
  { field: 'phone', label: '电话' },
  { field: 'email', label: '邮箱' },
  { field: 'location', label: '所在地' },
  { field: 'website', label: '个人站点' },
];

const workFieldSpecs: FieldSpec[] = [
  { field: 'companyName', label: '公司名称' },
  { field: 'position', label: '职位' },
  { field: 'startDate', label: '开始时间' },
  { field: 'endDate', label: '结束时间' },
  { field: 'responsibilities', label: '职责描述', multiline: true },
  { field: 'achievements', label: '成就列表', multiline: true },
];

const projectFieldSpecs: FieldSpec[] = [
  { field: 'name', label: '项目名称' },
  { field: 'role', label: '角色' },
  { field: 'startDate', label: '开始时间' },
  { field: 'endDate', label: '结束时间' },
  { field: 'techStack', label: '技术栈', multiline: true },
  { field: 'description', label: '项目描述' },
  { field: 'outcomes', label: '项目成果', multiline: true },
];

const skillFieldSpecs: FieldSpec[] = [
  { field: 'name', label: '技能名称' },
  { field: 'category', label: '分类' },
  { field: 'level', label: '熟练度标签' },
  { field: 'proficiency', label: '熟练度分数' },
];

const educationFieldSpecs: FieldSpec[] = [
  { field: 'school', label: '学校' },
  { field: 'major', label: '专业' },
  { field: 'level', label: '学历' },
  { field: 'startDate', label: '开始时间' },
  { field: 'endDate', label: '结束时间' },
  { field: 'gpa', label: 'GPA' },
  { field: 'honors', label: '荣誉', multiline: true },
];

// ---------------------------------------------------------------------------
// 条目身份匹配（不依赖易失 id）
// ---------------------------------------------------------------------------

type Entity = WorkExperience | Project | Skill | Education;

interface IdentitySpec {
  primary: (item: Entity) => unknown;
  secondary?: (item: Entity) => unknown;
}

function identityScore(a: Entity, b: Entity, spec: IdentitySpec): number {
  const pa = tokenKey(spec.primary(a));
  const pb = tokenKey(spec.primary(b));
  if (!pa || !pb || pa !== pb) {
    return 0;
  }
  let score = 2;
  if (spec.secondary) {
    const sa = tokenKey(spec.secondary(a));
    const sb = tokenKey(spec.secondary(b));
    if (sa && sb && sa === sb) {
      score += 2;
    } else if (!sa || !sb) {
      score += 0.5;
    }
  }
  return score;
}

/** 贪心最佳匹配：先按身份分数配出相同条目，剩下的即各自独有 */
function matchEntities(current: Entity[], source: Entity[], spec: IdentitySpec): Array<[Entity | undefined, Entity | undefined]> {
  const candidates: Array<{ ci: number; si: number; score: number }> = [];
  current.forEach((cItem, ci) => {
    source.forEach((sItem, si) => {
      const score = identityScore(cItem, sItem, spec);
      if (score > 0) {
        candidates.push({ ci, si, score });
      }
    });
  });
  candidates.sort((a, b) => b.score - a.score);

  const matchedCurrent = new Set<number>();
  const matchedSource = new Set<number>();
  const pairs: Array<[Entity, Entity]> = [];
  for (const candidate of candidates) {
    if (matchedCurrent.has(candidate.ci) || matchedSource.has(candidate.si)) {
      continue;
    }
    matchedCurrent.add(candidate.ci);
    matchedSource.add(candidate.si);
    pairs.push([current[candidate.ci], source[candidate.si]]);
  }

  // 输出顺序：按当前版本顺序（匹配 + 当前独有），再追加来源独有
  const result: Array<[Entity | undefined, Entity | undefined]> = [];
  current.forEach((item, ci) => {
    const pair = pairs.find(([cItem]) => cItem === item);
    result.push(pair ? [pair[0], pair[1]] : [item, undefined]);
  });
  source.forEach((item, si) => {
    if (!matchedSource.has(si)) {
      result.push([undefined, item]);
    }
  });
  return result;
}

// ---------------------------------------------------------------------------
// 差异构造
// ---------------------------------------------------------------------------

function fieldDiffs(currentItem: Record<string, unknown>, sourceItem: Record<string, unknown>, specs: FieldSpec[]): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  for (const spec of specs) {
    const current = currentItem[spec.field];
    const source = sourceItem[spec.field];
    if (!valuesEqual(current, source, Boolean(spec.multiline))) {
      diffs.push({
        field: spec.field,
        label: spec.label,
        currentValue: displayValue(current, Boolean(spec.multiline)),
        sourceValue: displayValue(source, Boolean(spec.multiline)),
      });
    }
  }
  return diffs;
}

function wholeItemFields(item: Record<string, unknown>, specs: FieldSpec[], from: 'current' | 'source'): FieldDiff[] {
  return specs
    .map((spec) => {
      const value = item[spec.field];
      if (isEmptyValue(value)) {
        return null;
      }
      const shown = displayValue(value, Boolean(spec.multiline));
      if (!shown) {
        return null;
      }
      return {
        field: spec.field,
        label: spec.label,
        currentValue: from === 'current' ? shown : '',
        sourceValue: from === 'source' ? shown : '',
      };
    })
    .filter((diff): diff is FieldDiff => diff !== null);
}

interface EntityModuleConfig {
  module: DiffModuleId;
  title: string;
  specs: FieldSpec[];
  identity: IdentitySpec;
  identityFields: string[];
  labelOf: (item: Entity) => string;
  getCurrent: (resume: Resume) => Entity[];
}

const entityModules: EntityModuleConfig[] = [
  {
    module: 'work',
    title: '工作经历',
    specs: workFieldSpecs,
    identityFields: ['companyName', 'position'],
    identity: { primary: (item) => (item as WorkExperience).companyName, secondary: (item) => (item as WorkExperience).position },
    labelOf: (item) => {
      const work = item as WorkExperience;
      return [work.companyName, work.position].filter((part) => normalizeText(part)).join(' · ') || '未命名经历';
    },
    getCurrent: (resume) => resume.workExperiences as unknown as Entity[],
  },
  {
    module: 'projects',
    title: '项目经历',
    specs: projectFieldSpecs,
    identityFields: ['name', 'role'],
    identity: { primary: (item) => (item as Project).name, secondary: (item) => (item as Project).role },
    labelOf: (item) => {
      const project = item as Project;
      return [project.name, project.role].filter((part) => normalizeText(part)).join(' · ') || '未命名项目';
    },
    getCurrent: (resume) => resume.projects as unknown as Entity[],
  },
  {
    module: 'skills',
    title: '技能矩阵',
    specs: skillFieldSpecs,
    identityFields: ['name'],
    identity: { primary: (item) => (item as Skill).name },
    labelOf: (item) => normalizeText((item as Skill).name) || '未命名技能',
    getCurrent: (resume) => resume.skills as unknown as Entity[],
  },
  {
    module: 'education',
    title: '教育经历',
    specs: educationFieldSpecs,
    identityFields: ['school', 'major'],
    identity: { primary: (item) => (item as Education).school, secondary: (item) => (item as Education).major },
    labelOf: (item) => {
      const education = item as Education;
      return [education.school, education.major].filter((part) => normalizeText(part)).join(' · ') || '未命名教育';
    },
    getCurrent: (resume) => resume.educations as unknown as Entity[],
  },
];

function changeId(parts: Array<unknown>): string {
  return parts.map((part) => tokenKey(part) || '_').join('~');
}

/** 比较两个简历版本，返回按模块分组的差异 */
export function compareResumes(target: Resume, source: Resume): ResumeDiff {
  const groups: DiffGroup[] = [];

  // 基本信息（逐字段一个变化，勾选粒度与列表模块一致）
  {
    const fields = fieldDiffs(
      target.basicInfo as unknown as Record<string, unknown>,
      source.basicInfo as unknown as Record<string, unknown>,
      basicFieldSpecs,
    );
    if (fields.length > 0) {
      groups.push({
        module: 'basicInfo',
        title: '基本信息',
        changes: fields.map((field) => ({
          id: changeId(['basicInfo', field.field, field.sourceValue]),
          module: 'basicInfo' as DiffModuleId,
          kind: 'modified' as DiffKind,
          itemLabel: '基本信息',
          fields: [field],
        })),
      });
    }
  }

  // 摘要
  {
    const fields = fieldDiffs({ summary: target.summary }, { summary: source.summary }, [
      { field: 'summary', label: '职业摘要' },
    ]);
    if (fields.length > 0) {
      groups.push({
        module: 'summary',
        title: '摘要',
        changes: [
          {
            id: changeId(['summary', fields[0].sourceValue]),
            module: 'summary',
            kind: 'modified',
            itemLabel: '职业摘要',
            fields,
          },
        ],
      });
    }
  }

  // 列表模块
  for (const config of entityModules) {
    const pairs = matchEntities(config.getCurrent(target), config.getCurrent(source), config.identity);
    const changes: ResumeChange[] = [];

    pairs.forEach(([currentItem, sourceItem]) => {
      const labelSource = (sourceItem ?? currentItem) as Entity;
      const label = config.labelOf(labelSource);

      if (currentItem && sourceItem) {
        const fields = fieldDiffs(
          currentItem as unknown as Record<string, unknown>,
          sourceItem as unknown as Record<string, unknown>,
          config.specs,
        );
        fields.forEach((field) => {
          changes.push({
            id: changeId([
              config.module,
              'm',
              ...config.identityFields.map((name) => (sourceItem as unknown as Record<string, unknown>)[name]),
              field.field,
              field.sourceValue,
            ]),
            module: config.module,
            kind: 'modified',
            itemLabel: label,
            fields: [field],
          });
        });
      } else if (sourceItem) {
        changes.push({
          id: changeId([
            config.module,
            'add',
            ...config.identityFields.map((name) => (sourceItem as unknown as Record<string, unknown>)[name]),
            JSON.stringify(stripId(sourceItem)),
          ]),
          module: config.module,
          kind: 'added',
          itemLabel: label,
          fields: wholeItemFields(sourceItem as unknown as Record<string, unknown>, config.specs, 'source'),
          sourceItem: JSON.parse(JSON.stringify(sourceItem)) as Entity,
        });
      } else if (currentItem) {
        changes.push({
          id: changeId([
            config.module,
            'rm',
            ...config.identityFields.map((name) => (currentItem as unknown as Record<string, unknown>)[name]),
            JSON.stringify(stripId(currentItem)),
          ]),
          module: config.module,
          kind: 'removed',
          itemLabel: label,
          fields: wholeItemFields(currentItem as unknown as Record<string, unknown>, config.specs, 'current'),
        });
      }
    });

    if (changes.length > 0) {
      groups.push({ module: config.module, title: config.title, changes });
    }
  }

  return { groups, totalChanges: groups.reduce((sum, group) => sum + group.changes.length, 0) };
}

function stripId(item: Entity): Entity {
  const { id: _id, ...rest } = item as Entity & { id: string };
  return rest as Entity;
}

// ---------------------------------------------------------------------------
// 合并
// ---------------------------------------------------------------------------

export interface MergeResult {
  resume: Resume;
  applied: number;
  skipped: number;
}

/** 合并前在「最新的当前版本 vs 来源版本」上重算一次差异，丢弃已不存在的变化，保证重复合并幂等 */
export function mergeChanges(target: Resume, source: Resume, selectedIds: string[]): MergeResult {
  const latest = compareResumes(target, source);
  const selected = new Set(selectedIds);
  const actionable = new Map<string, ResumeChange>();
  latest.groups.forEach((group) => {
    group.changes.forEach((change) => actionable.set(change.id, change));
  });

  let applied = 0;
  let skipped = 0;

  let basicInfo = { ...target.basicInfo };
  let summary = target.summary;
  let workExperiences = target.workExperiences.map((item) => ({ ...item }));
  let projects = target.projects.map((item) => ({ ...item }));
  let skills = target.skills.map((item) => ({ ...item }));
  let educations = target.educations.map((item) => ({ ...item }));

  const findPair = (
    currentList: Entity[],
    sourceList: Entity[],
    label: string,
    config: EntityModuleConfig,
  ): { currentItem?: Entity; sourceItem?: Entity } => {
    // 先按身份分数配对，label 仅作回退，避免同身份字段被改动后找不到条目
    let currentItem = currentList.find((item) => config.labelOf(item) === label);
    let sourceItem: Entity | undefined;
    if (currentItem) {
      sourceItem = sourceList.find((item) => identityScore(currentItem as Entity, item, config.identity) >= 2);
    }
    if (!sourceItem) {
      sourceItem = sourceList.find((item) => config.labelOf(item) === label);
    }
    if (!currentItem && sourceItem) {
      currentItem = currentList.find((item) => identityScore(item, sourceItem as Entity, config.identity) >= 2);
    }
    return { currentItem, sourceItem };
  };

  for (const id of selectedIds) {
    const change = actionable.get(id);
    if (!change) {
      // 该变化已合入或已失效（例如重复合并），直接跳过，不产生重复条目
      skipped += 1;
      continue;
    }

    if (change.module === 'basicInfo' && change.kind === 'modified') {
      const field = change.fields[0];
      const sourceValue = (source.basicInfo as unknown as Record<string, unknown>)[field.field];
      basicInfo = { ...basicInfo, [field.field]: sourceValue };
      applied += 1;
      continue;
    }

    if (change.module === 'summary' && change.kind === 'modified') {
      summary = source.summary;
      applied += 1;
      continue;
    }

    const config = entityModules.find((item) => item.module === change.module);
    if (!config) {
      skipped += 1;
      continue;
    }

    const listByModule: Record<'work' | 'projects' | 'skills' | 'education', Entity[]> = {
      work: workExperiences as unknown as Entity[],
      projects: projects as unknown as Entity[],
      skills: skills as unknown as Entity[],
      education: educations as unknown as Entity[],
    };
    const listRef = listByModule[config.module as 'work' | 'projects' | 'skills' | 'education'];
    const setList = (next: Entity[]): void => {
      if (config.module === 'work') {
        workExperiences = next as unknown as WorkExperience[];
      } else if (config.module === 'projects') {
        projects = next as unknown as Project[];
      } else if (config.module === 'skills') {
        skills = next as unknown as Skill[];
      } else {
        educations = next as unknown as Education[];
      }
    };

    if (change.kind === 'added') {
      const sourceItem = change.sourceItem as Entity;
      // 再保险一次：身份已存在则绝不重复添加
      const duplicated = listRef.some((item) => identityScore(item, sourceItem, config.identity) >= 2);
      if (duplicated) {
        skipped += 1;
        continue;
      }
      const newItem: Entity = {
        ...(JSON.parse(JSON.stringify(sourceItem)) as Entity),
        id: createStableId(config.module, listRef),
      };
      setList([...listRef, newItem]);
      applied += 1;
      continue;
    }

    if (change.kind === 'removed') {
      const { sourceItem } = findPair(listRef, config.getCurrent(source), change.itemLabel, config);
      // 来源中仍存在同身份条目时不删除，避免误删
      const next = listRef.filter((item) => {
        if (sourceItem && identityScore(item, sourceItem, config.identity) >= 2) {
          return true;
        }
        return config.labelOf(item) !== change.itemLabel;
      });
      if (next.length === listRef.length) {
        skipped += 1;
        continue;
      }
      setList(next);
      applied += 1;
      continue;
    }

    // modified：字段级合并
    const field = change.fields[0];
    const { currentItem: matchedTarget, sourceItem: matchedSource } = findPair(
      listRef,
      config.getCurrent(source),
      change.itemLabel,
      config,
    );
    if (!matchedTarget || !matchedSource) {
      skipped += 1;
      continue;
    }
    const sourceValue = (matchedSource as unknown as Record<string, unknown>)[field.field];
    setList(
      listRef.map((item) =>
        item === matchedTarget ? ({ ...item, [field.field]: cloneValue(sourceValue) } as Entity) : item,
      ),
    );
    applied += 1;
  }

  if (applied === 0) {
    return { resume: target, applied, skipped };
  }

  const resume: Resume = {
    ...target,
    basicInfo,
    summary,
    workExperiences,
    projects,
    skills,
    educations,
    updatedAt: new Date().toISOString(),
  };
  return { resume, applied, skipped };
}

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value) || (value && typeof value === 'object')) {
    return JSON.parse(JSON.stringify(value)) as unknown;
  }
  return value;
}

function createStableId(module: DiffModuleId, existing: Entity[]): string {
  const entityPrefixes: Record<string, string> = {
    work: 'work',
    projects: 'project',
    skills: 'skill',
    education: 'edu',
  };
  const prefix = entityPrefixes[module] ?? 'item';
  const seed =
    typeof globalThis.crypto?.getRandomValues === 'function'
      ? globalThis.crypto.getRandomValues(new Uint32Array(2)).join('')
      : `${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
  let id = `${prefix}_${seed}`;
  while (existing.some((item) => (item as Entity & { id: string }).id === id)) {
    id = `${prefix}_${seed}${Math.random().toString(36).slice(2, 6)}`;
  }
  return id;
}
