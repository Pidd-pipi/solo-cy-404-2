import { Education } from '../types/education';
import { Project } from '../types/project';
import { Skill } from '../types/skill';
import { WorkExperience } from '../types/work-experience';
import { Resume } from '../types/resume';

/**
 * 简历版本比较与逐项合并。
 *
 * 比较方向固定为「来源版本 source → 当前版本 target」。
 *
 * 差异规则：
 * - added：来源有、当前没有；removed：当前有、来源没有；modified：双方都有但来源字段有内容且与当前不同。
 * - 来源字段为空（空串 / 纯空白 / 空数组）时不算差异，也绝不因此清空当前已有内容。
 * - 字符串数组字段（职责、成就、技术栈、成果、荣誉）按多重集合比较，仅换序不算差异。
 * - 头像（avatarUrl）属于基本信息差异。
 *
 * 条目配对（不依赖易失 id）：
 * - 业务身份：工作=公司+职位，教育=学校+专业，项目=名称，技能=名称。
 * - 同一身份出现多条时，按「身份 + 该身份下的出现顺序（第 1 条、第 2 条…）」逐条配对：
 *   实体整体换序不会错配；身份相同内容也相同的重复条目不产生差异；移除精确定位到具体某一条。
 * - 业务身份为空（名称/公司都没填）时退化为按完整内容配对。
 *
 * 幂等：change.id = 模块标签 + 内容哈希，合并后基于最新当前版本重算，已生效的变化 id 直接消失，
 * 重复合并只会跳过，不会产生重复条目。
 */

export type DiffModuleId = 'basicInfo' | 'summary' | 'work' | 'projects' | 'skills' | 'education';
export type DiffKind = 'added' | 'removed' | 'modified';

export interface FieldDiff {
  field: string;
  label: string;
  /** 是否为图片类字段（头像），此时 currentValue/sourceValue 为图片地址 */
  image?: boolean;
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
  /** 该条目在同身份分组内的出现序号（从 1 开始） */
  occurrence: number;
  /** 同一身份在任一侧出现多于一条时为真，UI 据此标注「第 N 条」 */
  duplicate: boolean;
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

/** FNV-1a 32 位哈希，跨进程稳定，用于把长内容（如头像 dataURL）压成定长 id 片段 */
function hash32(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** 变化 id 带模块前缀，既能按模块路由，也杜绝跨模块哈希撞号 */
function makeId(tag: DiffModuleId, parts: unknown[]): string {
  const raw = parts
    .map((part) => (typeof part === 'string' ? part : JSON.stringify(part ?? '')))
    .join('~');
  return `${tag}_${hash32(raw)}`;
}

/** 标识用的稳定片段：去掉空白与分隔符，中文保留 */
function tokenKey(value: unknown): string {
  return normalizeText(value).replace(/[\s,，。;；|/\\:：-]+/g, '');
}

/**
 * 单向字段差异：来源有内容、且与当前不一致才算差异。
 * 多行字段按多重集合比较，纯换序不算差异。返回 null 表示无差异。
 */
function fieldDiff(
  current: unknown,
  source: unknown,
  spec: FieldSpec,
): { currentValue: string; sourceValue: string } | null {
  if (spec.multiline) {
    const sourceLines = normalizeLines(source);
    if (sourceLines.length === 0) {
      return null; // 来源为空不算变化，也不清空当前
    }
    const currentLines = normalizeLines(current);
    const sameMultiset =
      currentLines.length === sourceLines.length &&
      [...currentLines].sort().join('') === [...sourceLines].sort().join('');
    if (sameMultiset) {
      return null;
    }
    return { currentValue: currentLines.join('、'), sourceValue: sourceLines.join('、') };
  }

  const sourceValue = normalizeText(source);
  if (sourceValue === '') {
    return null; // 来源为空不算变化，也不清空当前
  }
  const currentValue = normalizeText(current);
  if (currentValue === sourceValue) {
    return null;
  }
  return { currentValue, sourceValue };
}

// ---------------------------------------------------------------------------
// 字段元数据
// ---------------------------------------------------------------------------

interface FieldSpec {
  field: string;
  label: string;
  multiline?: boolean;
  image?: boolean;
}

const basicFieldSpecs: FieldSpec[] = [
  { field: 'fullName', label: '姓名' },
  { field: 'headline', label: '职位头衔' },
  { field: 'phone', label: '电话' },
  { field: 'email', label: '邮箱' },
  { field: 'location', label: '所在地' },
  { field: 'website', label: '个人站点' },
  { field: 'avatarUrl', label: '头像', image: true },
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
// 实体与身份配对
// ---------------------------------------------------------------------------

type Entity = WorkExperience | Project | Skill | Education;
type EntityRecord = Record<string, unknown>;
type EntityModuleId = 'work' | 'projects' | 'skills' | 'education';

interface EntityModuleConfig {
  module: EntityModuleId;
  title: string;
  specs: FieldSpec[];
  identityValues: (item: Entity) => unknown[];
  businessKey: (item: Entity) => string;
  labelOf: (item: Entity) => string;
  getTarget: (resume: Resume) => Entity[];
  newId: (existing: Entity[]) => string;
}

function cloneEntity<T>(item: T): T {
  return JSON.parse(JSON.stringify(item)) as T;
}

function stripId(item: Entity): EntityRecord {
  const { id: _id, ...rest } = item as Entity & { id: string };
  return rest;
}

function contentKey(item: Entity): string {
  // 身份缺失时的退化配对依据：去掉易失 id 后的完整内容
  return `content:${hash32(JSON.stringify(stripId(item)))}`;
}

function keyOfItem(config: EntityModuleConfig, item: Entity): string {
  return config.businessKey(item) || contentKey(item);
}

interface Occurrence {
  key: string;
  ord: number; // 同身份分组内的出现序号（从 1 开始）
  index: number; // 原始下标
  item: Entity;
}

interface Pair {
  key: string;
  ordCurrent: number;
  ordSource: number;
  duplicate: boolean;
  current?: Occurrence;
  source?: Occurrence;
}

function scalarEqual(current: unknown, source: unknown): boolean {
  return normalizeText(current) === normalizeText(source);
}

function linesEqual(current: unknown, source: unknown): boolean {
  const a = normalizeLines(current).sort();
  const b = normalizeLines(source).sort();
  return a.length === b.length && a.join('') === b.join('');
}

function fieldEqual(current: unknown, source: unknown, spec: FieldSpec): boolean {
  return spec.multiline ? linesEqual(current, source) : scalarEqual(current, source);
}

/**
 * 业务身份组内的稳定配对：
 * 1. 先计算两侧每条的字段相似度得分，全等（仅 id 不同）得分最高；
 * 2. 按得分降序、再按出现序号接近度贪心一一配对——因此同身份条目整体换序仍能正确对上，不产生伪修改；
 * 3. 剩下配不上的条目即为 added / removed；内容完全相同的真·重复条目由序号距离稳定消歧。
 */
function pairGroup(current: Occurrence[], source: Occurrence[], config: EntityModuleConfig): Pair[] {
  const edges: Array<{ c: Occurrence; s: Occurrence; score: number; distance: number }> = [];
  current.forEach((c) => {
    source.forEach((s) => {
      let score = 0;
      config.specs.forEach((spec) => {
        if (fieldEqual((c.item as unknown as EntityRecord)[spec.field], (s.item as unknown as EntityRecord)[spec.field], spec)) {
          score += 1;
        }
      });
      edges.push({ c, s, score, distance: Math.abs(c.ord - s.ord) });
    });
  });
  edges.sort((a, b) => b.score - a.score || a.distance - b.distance);

  const usedC = new Set<Occurrence>();
  const usedS = new Set<Occurrence>();
  const chosen: Array<{ c: Occurrence; s: Occurrence }> = [];
  edges.forEach((edge) => {
    if (usedC.has(edge.c) || usedS.has(edge.s)) {
      return;
    }
    // 同业务身份即便字段全都不同也配对（体现为修改），因此不再设最低分门槛
    usedC.add(edge.c);
    usedS.add(edge.s);
    chosen.push({ c: edge.c, s: edge.s });
  });

  const duplicate = current.length > 1 || source.length > 1;
  const pairs: Pair[] = [];
  chosen.forEach(({ c, s }) => {
    pairs.push({ key: c.key, ordCurrent: c.ord, ordSource: s.ord, duplicate, current: c, source: s });
  });
  current.forEach((entry) => {
    if (!usedC.has(entry)) {
      pairs.push({ key: entry.key, ordCurrent: entry.ord, ordSource: 0, duplicate, current: entry });
    }
  });
  source.forEach((entry) => {
    if (!usedS.has(entry)) {
      pairs.push({ key: entry.key, ordCurrent: 0, ordSource: entry.ord, duplicate, source: entry });
    }
  });
  return pairs;
}

/**
 * 身份 + 组内稳定配对：
 * 先按业务身份分组，组内优先内容全等跨位置配对，重复条目按出现顺序消歧。
 * 输出顺序：先按当前版本顺序（配对 / 被移除），再按来源顺序追加新增。
 */
function pairByOccurrence(current: Entity[], source: Entity[], config: EntityModuleConfig): Pair[] {
  const buildOccurrences = (list: Entity[]): Occurrence[] => {
    const counters = new Map<string, number>();
    return list.map((item, index) => {
      const key = keyOfItem(config, item);
      const ord = (counters.get(key) ?? 0) + 1;
      counters.set(key, ord);
      return { key, ord, index, item };
    });
  };

  const currentOcc = buildOccurrences(current);
  const sourceOcc = buildOccurrences(source);

  const groupKeys = new Set<string>([
    ...currentOcc.map((entry) => entry.key),
    ...sourceOcc.map((entry) => entry.key),
  ]);

  const allPairs: Pair[] = [];
  groupKeys.forEach((key) => {
    const c = currentOcc.filter((entry) => entry.key === key);
    const s = sourceOcc.filter((entry) => entry.key === key);
    allPairs.push(...pairGroup(c, s, config));
  });

  const pairOfCurrent = new Map<number, Pair>();
  const adds: Pair[] = [];
  allPairs.forEach((pair) => {
    if (pair.current) {
      pairOfCurrent.set(pair.current.index, pair);
    } else {
      adds.push(pair);
    }
  });

  const ordered: Pair[] = [];
  currentOcc.forEach((entry) => {
    const pair = pairOfCurrent.get(entry.index);
    if (pair) {
      ordered.push(pair);
    }
  });
  // 新增按来源原始顺序
  adds.sort((a, b) => (a.source?.index ?? 0) - (b.source?.index ?? 0));
  ordered.push(...adds);
  return ordered;
}

function nonEmptyFields(item: EntityRecord, specs: FieldSpec[], side: 'current' | 'source'): FieldDiff[] {
  const fields: FieldDiff[] = [];
  specs.forEach((spec) => {
    const raw = item[spec.field];
    const empty = spec.multiline ? normalizeLines(raw).length === 0 : normalizeText(raw) === '';
    if (empty) {
      return;
    }
    const shown = spec.multiline ? normalizeLines(raw).join('、') : normalizeText(raw);
    fields.push({
      field: spec.field,
      label: spec.label,
      image: spec.image,
      currentValue: side === 'current' ? shown : '',
      sourceValue: side === 'source' ? shown : '',
    });
  });
  return fields;
}

// ---------------------------------------------------------------------------
// 模块配置
// ---------------------------------------------------------------------------

const entityModules: EntityModuleConfig[] = [
  {
    module: 'work',
    title: '工作经历',
    specs: workFieldSpecs,
    identityValues: (item) => [(item as WorkExperience).companyName, (item as WorkExperience).position],
    businessKey: (item) => {
      const company = tokenKey((item as WorkExperience).companyName);
      const position = tokenKey((item as WorkExperience).position);
      return company + (position ? `|${position}` : '');
    },
    labelOf: (item) => {
      const work = item as WorkExperience;
      return [work.companyName, work.position].filter((part) => normalizeText(part)).join(' · ') || '未命名经历';
    },
    getTarget: (resume) => resume.workExperiences as unknown as Entity[],
    newId: (existing) => generateId('work', existing),
  },
  {
    module: 'projects',
    title: '项目经历',
    specs: projectFieldSpecs,
    identityValues: (item) => [(item as Project).name],
    businessKey: (item) => tokenKey((item as Project).name),
    labelOf: (item) => normalizeText((item as Project).name) || '未命名项目',
    getTarget: (resume) => resume.projects as unknown as Entity[],
    newId: (existing) => generateId('project', existing),
  },
  {
    module: 'skills',
    title: '技能矩阵',
    specs: skillFieldSpecs,
    identityValues: (item) => [(item as Skill).name],
    businessKey: (item) => tokenKey((item as Skill).name),
    labelOf: (item) => normalizeText((item as Skill).name) || '未命名技能',
    getTarget: (resume) => resume.skills as unknown as Entity[],
    newId: (existing) => generateId('skill', existing),
  },
  {
    module: 'education',
    title: '教育经历',
    specs: educationFieldSpecs,
    identityValues: (item) => [(item as Education).school, (item as Education).major],
    businessKey: (item) => {
      const school = tokenKey((item as Education).school);
      const major = tokenKey((item as Education).major);
      return school + (major ? `|${major}` : '');
    },
    labelOf: (item) => {
      const education = item as Education;
      return [education.school, education.major].filter((part) => normalizeText(part)).join(' · ') || '未命名教育';
    },
    getTarget: (resume) => resume.educations as unknown as Entity[],
    newId: (existing) => generateId('edu', existing),
  },
];

function generateId(prefix: string, existing: Entity[]): string {
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

// ---------------------------------------------------------------------------
// 比较
// ---------------------------------------------------------------------------

interface PlannedChange {
  change: ResumeChange;
  /** 仅内部使用：当前版本中被修改/移除的精确条目引用 */
  targetItem?: Entity;
  sourceEntity?: Entity;
}

/** 计算一个实体模块的全部变化 */
function planEntityModule(current: Entity[], source: Entity[], config: EntityModuleConfig): PlannedChange[] {
  const pairs = pairByOccurrence(current, source, config);
  const planned: PlannedChange[] = [];

  pairs.forEach((pair) => {
    const currentItem = pair.current?.item;
    const sourceItem = pair.source?.item;
    const identitySource = sourceItem ?? currentItem;
    const identityValues = identitySource ? config.identityValues(identitySource) : [];
    const label = identitySource ? config.labelOf(identitySource) : '';
    // 修改/移除锚定当前侧序号，新增锚定来源侧序号
    const occurrence = currentItem ? pair.ordCurrent : pair.ordSource;
    const common = {
      module: config.module as DiffModuleId,
      itemLabel: label,
      occurrence,
      duplicate: pair.duplicate,
    };

    if (currentItem && sourceItem) {
      config.specs.forEach((spec) => {
        const delta = fieldDiff(
          (currentItem as unknown as EntityRecord)[spec.field],
          (sourceItem as unknown as EntityRecord)[spec.field],
          spec,
        );
        if (!delta) {
          return;
        }
        planned.push({
          targetItem: currentItem,
          sourceEntity: sourceItem,
          change: {
            ...common,
            id: makeId(config.module, ['m', ...identityValues, pair.ordCurrent, spec.field, delta.sourceValue, spec.image ? 'img' : '']),
            kind: 'modified',
            fields: [{ field: spec.field, label: spec.label, image: spec.image, ...delta }],
          },
        });
      });
    } else if (sourceItem) {
      planned.push({
        sourceEntity: sourceItem,
        change: {
          ...common,
          id: makeId(config.module, ['add', ...identityValues, pair.ordSource, JSON.stringify(stripId(sourceItem))]),
          kind: 'added',
          fields: nonEmptyFields(sourceItem as unknown as EntityRecord, config.specs, 'source'),
          sourceItem: cloneEntity(sourceItem),
        },
      });
    } else if (currentItem) {
      planned.push({
        targetItem: currentItem,
        change: {
          ...common,
          id: makeId(config.module, ['rm', ...identityValues, pair.ordCurrent, JSON.stringify(stripId(currentItem))]),
          kind: 'removed',
          fields: nonEmptyFields(currentItem as unknown as EntityRecord, config.specs, 'current'),
        },
      });
    }
  });

  return planned;
}

/** 比较两个简历版本，返回按模块分组的差异 */
export function compareResumes(target: Resume, source: Resume): ResumeDiff {
  const groups: DiffGroup[] = [];

  // 基本信息（逐字段；头像纳入；来源为空不算差异）
  {
    const changes: ResumeChange[] = [];
    basicFieldSpecs.forEach((spec) => {
      const delta = fieldDiff(
        (target.basicInfo as unknown as EntityRecord)[spec.field],
        (source.basicInfo as unknown as EntityRecord)[spec.field],
        spec,
      );
      if (!delta) {
        return;
      }
      changes.push({
        id: makeId('basicInfo', [spec.field, delta.sourceValue, spec.image ? 'img' : '']),
        module: 'basicInfo',
        kind: 'modified',
        itemLabel: '基本信息',
        occurrence: 1,
        duplicate: false,
        fields: [{ field: spec.field, label: spec.label, image: spec.image, ...delta }],
      });
    });
    if (changes.length > 0) {
      groups.push({ module: 'basicInfo', title: '基本信息', changes });
    }
  }

  // 摘要
  {
    const delta = fieldDiff(target.summary, source.summary, { field: 'summary', label: '职业摘要' });
    if (delta) {
      groups.push({
        module: 'summary',
        title: '摘要',
        changes: [
          {
            id: makeId('summary', [delta.sourceValue]),
            module: 'summary',
            kind: 'modified',
            itemLabel: '职业摘要',
            occurrence: 1,
            duplicate: false,
            fields: [{ field: 'summary', label: '职业摘要', ...delta }],
          },
        ],
      });
    }
  }

  // 实体列表模块（对外不暴露内部条目引用）
  entityModules.forEach((config) => {
    const planned = planEntityModule(config.getTarget(target), config.getTarget(source), config);
    if (planned.length > 0) {
      groups.push({ module: config.module, title: config.title, changes: planned.map((entry) => entry.change) });
    }
  });

  return { groups, totalChanges: groups.reduce((sum, group) => sum + group.changes.length, 0) };
}

// ---------------------------------------------------------------------------
// 合并
// ---------------------------------------------------------------------------

export interface MergeResult {
  resume: Resume;
  applied: number;
  skipped: number;
}

type EntityOperation =
  | { type: 'remove'; item: Entity }
  | { type: 'modify'; item: Entity; field: string; value: unknown }
  | { type: 'add'; sourceItem: Entity };

/**
 * 将选中的变化合并进当前版本。
 * 合并前基于「最新当前版本 vs 来源版本」重算计划：已生效的变化 id 消失会被跳过，天然幂等。
 * 移除按计划中的精确条目引用删除，重复身份不会漏删或误删。
 * 未选内容、模块顺序与启用状态完全不动。
 */
export function mergeChanges(target: Resume, source: Resume, selectedIds: string[]): MergeResult {
  const selected = new Set(selectedIds);
  let applied = 0;
  let skipped = 0;

  // ---- 基本信息：逐字段、单向，来源为空绝不覆盖 ----
  const basicInfo = { ...target.basicInfo };
  let basicChanged = false;
  const consumedBasicIds = new Set<string>();
  basicFieldSpecs.forEach((spec) => {
    const delta = fieldDiff(
      (target.basicInfo as unknown as EntityRecord)[spec.field],
      (source.basicInfo as unknown as EntityRecord)[spec.field],
      spec,
    );
    if (!delta) {
      return;
    }
    const id = makeId('basicInfo', [spec.field, delta.sourceValue, spec.image ? 'img' : '']);
    consumedBasicIds.add(id);
    if (selected.has(id)) {
      basicInfo[spec.field as keyof typeof basicInfo] = (source.basicInfo as unknown as EntityRecord)[
        spec.field
      ] as never;
      basicChanged = true;
      applied += 1;
    }
  });

  // ---- 摘要 ----
  let summary = target.summary;
  let summaryChanged = false;
  let summaryChangeId = '';
  {
    const delta = fieldDiff(target.summary, source.summary, { field: 'summary', label: '职业摘要' });
    if (delta) {
      summaryChangeId = makeId('summary', [delta.sourceValue]);
      if (selected.has(summaryChangeId)) {
        summary = source.summary;
        summaryChanged = true;
        applied += 1;
      }
    }
  }

  // ---- 实体模块：克隆工作列表 → 重算计划 → 收集操作 → 统一应用 ----
  const workingLists: Record<EntityModuleId, Entity[]> = {
    work: (target.workExperiences as unknown as Entity[]).map(cloneEntity),
    projects: (target.projects as unknown as Entity[]).map(cloneEntity),
    skills: (target.skills as unknown as Entity[]).map(cloneEntity),
    education: (target.educations as unknown as Entity[]).map(cloneEntity),
  };
  const operationsByModule: Record<EntityModuleId, EntityOperation[]> = {
    work: [],
    projects: [],
    skills: [],
    education: [],
  };

  entityModules.forEach((config) => {
    const working = workingLists[config.module];
    const planned = planEntityModule(working, config.getTarget(source), config);
    const actionable = new Map(planned.map((entry) => [entry.change.id, entry]));
    const prefix = `${config.module}_`;

    selected.forEach((id) => {
      if (!id.startsWith(prefix)) {
        return; // 属于其它模块
      }
      const entry = actionable.get(id);
      if (!entry) {
        skipped += 1; // 变化已生效 / 已失效（重复合并）
        return;
      }
      const { change, targetItem, sourceEntity } = entry;
      if (change.kind === 'removed' && targetItem) {
        operationsByModule[config.module].push({ type: 'remove', item: targetItem });
        applied += 1;
      } else if (change.kind === 'modified' && targetItem && sourceEntity) {
        operationsByModule[config.module].push({
          type: 'modify',
          item: targetItem,
          field: change.fields[0].field,
          value: (sourceEntity as unknown as EntityRecord)[change.fields[0].field],
        });
        applied += 1;
      } else if (change.kind === 'added' && sourceEntity) {
        operationsByModule[config.module].push({ type: 'add', sourceItem: sourceEntity });
        applied += 1;
      }
    });
  });

  // 陈旧的基本信息/摘要选中项（重复合并时）计为跳过；来源为空的字段根本不产生 id，无需处理
  selected.forEach((id) => {
    if (id.startsWith('basicInfo_') && !consumedBasicIds.has(id)) {
      skipped += 1;
    } else if (id.startsWith('summary_') && id !== summaryChangeId) {
      skipped += 1;
    }
  });

  // 未命中任何模块前缀的选中 id 也计为跳过
  const knownPrefixes = ['basicInfo_', 'summary_', ...entityModules.map((config) => `${config.module}_`)];
  selected.forEach((id) => {
    if (!knownPrefixes.some((prefix) => id.startsWith(prefix))) {
      skipped += 1;
    }
  });

  const finalLists: Record<EntityModuleId, Entity[]> = {} as Record<EntityModuleId, Entity[]>;
  let anyEntityChanged = false;

  entityModules.forEach((config) => {
    const operations = operationsByModule[config.module];
    let next = workingLists[config.module];
    if (operations.length === 0) {
      finalLists[config.module] = next;
      return;
    }

    const removeRefs = new Set<Entity>();
    const mods = new Map<Entity, EntityRecord>();
    const additions: Entity[] = [];
    operations.forEach((op) => {
      if (op.type === 'remove') {
        removeRefs.add(op.item);
      } else if (op.type === 'modify') {
        const patch = mods.get(op.item) ?? {};
        patch[op.field] = cloneValue(op.value);
        mods.set(op.item, patch);
      } else {
        additions.push(op.sourceItem);
      }
    });

    // 移除优先：落在被移除条目上的修改自然作废
    let changed = false;
    const beforeCount = next.length;
    next = next.filter((item) => !removeRefs.has(item));
    if (next.length !== beforeCount || mods.size > 0) {
      changed = true;
    }
    next = next.map((item) => {
      const patch = mods.get(item);
      return patch ? ({ ...item, ...patch } as Entity) : item;
    });

    // 新增按计划顺序追加；以身份出现总数兜底，杜绝重复合并产生重复条目
    const sourceList = config.getTarget(source);
    additions.forEach((sourceItem) => {
      const key = keyOfItem(config, sourceItem);
      const existingOfKey = next.filter((item) => keyOfItem(config, item) === key).length;
      const sourceOfKey = sourceList.filter((item) => keyOfItem(config, item) === key).length;
      if (existingOfKey >= sourceOfKey) {
        skipped += 1;
        applied -= 1;
        return;
      }
      next = [...next, { ...cloneEntity(sourceItem), id: config.newId(next) } as Entity];
      changed = true;
    });

    if (changed) {
      anyEntityChanged = true;
    }
    finalLists[config.module] = next;
  });

  if (!basicChanged && !summaryChanged && !anyEntityChanged) {
    return { resume: target, applied, skipped };
  }

  const resume: Resume = {
    ...target,
    basicInfo,
    summary,
    workExperiences: finalLists.work as unknown as WorkExperience[],
    projects: finalLists.projects as unknown as Project[],
    skills: finalLists.skills as unknown as Skill[],
    educations: finalLists.education as unknown as Education[],
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
