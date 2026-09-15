import { describe, expect, it } from 'vitest';
import { EducationLevel, SkillCategory, SkillLevel, SkillProficiency } from '../types/enums';
import { Resume } from '../types/resume';
import {
  buildSourceResume,
  buildTargetResume,
  cloneResume,
  expectedCanonicalDiff,
  fixedSections,
  makeResume,
} from './fixtures';
import { compareResumes, DiffKind, DiffModuleId, mergeChanges, normalizeLines, ResumeChange } from '../utils/resumeDiff';

// ---------------------------------------------------------------------------
// 辅助
// ---------------------------------------------------------------------------

interface FlatChange extends ResumeChange {
  group: DiffModuleId;
}

function flat(diff: ReturnType<typeof compareResumes>): FlatChange[] {
  return diff.groups.flatMap((group) => group.changes.map((change) => ({ ...change, group: group.module })));
}

function changesIn(diff: ReturnType<typeof compareResumes>, module: DiffModuleId, kind?: DiffKind): FlatChange[] {
  return flat(diff).filter((change) => change.group === module && (!kind || change.kind === kind));
}

function changeIds(diff: ReturnType<typeof compareResumes>): string[] {
  return flat(diff).map((change) => change.id);
}

function expectNoDiff(name: string, target: Resume, source: Resume): void {
  const diff = compareResumes(target, source);
  it(name, () => {
    expect(diff.totalChanges, formatDiffs(diff)).toBe(0);
  });
}

function formatDiffs(diff: ReturnType<typeof compareResumes>): string {
  const lines = diff.groups.flatMap((group) =>
    group.changes.map(
      (change) =>
        `  [${group.module}/${change.kind}] ${change.itemLabel}#${change.occurrence}: ` +
        change.fields.map((field) => `${field.field} "${field.currentValue}"->"${field.sourceValue}"`).join('; '),
    ),
  );
  return `期望 0 差异，实际 ${diff.totalChanges}：\n${lines.join('\n')}`;
}

// ===========================================================================
// 差异结果：完整版本基线
// ===========================================================================

describe('版本比较：两个完整版本的差异基线', () => {
  const target = buildTargetResume();
  const source = buildSourceResume();
  const diff = compareResumes(target, source);

  it('总差异数与各模块计数正确', () => {
    expect(diff.totalChanges).toBe(expectedCanonicalDiff.total);
    (Object.keys(expectedCanonicalDiff.byModule) as DiffModuleId[]).forEach((module) => {
      expect(changesIn(diff, module).length, `模块 ${module}`).toBe(expectedCanonicalDiff.byModule[module]);
    });
  });

  it('头像变化进入基本信息差异（image 标记）', () => {
    const avatar = changesIn(diff, 'basicInfo').find((change) => change.fields[0].field === 'avatarUrl');
    expect(avatar).toBeDefined();
    expect(avatar?.fields[0].image).toBe(true);
    expect(avatar?.fields[0].currentValue).toContain('avatar-old');
    expect(avatar?.fields[0].sourceValue).toContain('avatar-new');
  });

  it('邮箱为另一项基本信息修改', () => {
    const email = changesIn(diff, 'basicInfo').find((change) => change.fields[0].field === 'email');
    expect(email?.fields[0].currentValue).toBe('old@example.com');
    expect(email?.fields[0].sourceValue).toBe('new@example.com');
  });

  it('来源 location 为空不算差异，目标「上海」不参与变化', () => {
    expect(changesIn(diff, 'basicInfo').some((change) => change.fields[0].field === 'location')).toBe(false);
  });

  it('青松结束时间是修改；id 不同但公司+职位相同识别为同一条', () => {
    const end = changesIn(diff, 'work', 'modified').find((change) => change.fields[0].field === 'endDate');
    expect(end?.itemLabel).toContain('青松科技');
    expect(end?.fields[0].currentValue).toBe('至今');
    expect(end?.fields[0].sourceValue).toBe('2024.08');
  });

  it('字节跳动同公司同职位第 2 条被精确识别为移除，并标注重复身份与序号', () => {
    const removed = changesIn(diff, 'work', 'removed');
    expect(removed).toHaveLength(1);
    expect(removed[0].itemLabel).toContain('字节跳动');
    expect(removed[0].duplicate).toBe(true);
    expect(removed[0].occurrence).toBe(2);
  });

  it('技能「英语沟通」为唯一移除项', () => {
    const removed = changesIn(diff, 'skills', 'removed');
    expect(removed).toHaveLength(1);
    expect(removed[0].itemLabel).toBe('英语沟通');
  });

  it('教育实体换序不产生增删；两条 GPA 各自判为修改', () => {
    expect(changesIn(diff, 'education', 'added')).toHaveLength(0);
    expect(changesIn(diff, 'education', 'removed')).toHaveLength(0);
    const gpas = changesIn(diff, 'education', 'modified').filter((change) => change.fields[0].field === 'gpa');
    expect(gpas).toHaveLength(2);
    // 以「当前 GPA → 来源 GPA」建立映射，不依赖换序后的排列
    const byCurrent = Object.fromEntries(gpas.map((change) => [change.fields[0].currentValue, change.fields[0].sourceValue]));
    expect(byCurrent).toEqual({ '3.7 / 4.0': '3.9 / 4.0', '': '3.8 / 4.0' });
    // 荣誉仅换序（华理）不产生差异；目标为空来源也为空（复旦）不产生差异
    expect(flat(diff).some((change) => change.fields.some((field) => field.field === 'honors'))).toBe(false);
  });

  it('数组字段仅换序（技术栈/成果/荣誉）不产生差异', () => {
    const allFields = flat(diff).flatMap((change) => change.fields.map((field) => field.field));
    expect(allFields).not.toContain('techStack');
    expect(allFields).not.toContain('outcomes');
    expect(allFields).not.toContain('honors');
  });

  it('候选人平台描述修改（数组换序同时存在时仍能抓到标量修改）', () => {
    const desc = changesIn(diff, 'projects', 'modified').find((change) => change.fields[0].field === 'description');
    expect(desc?.fields[0].currentValue).toBe('旧描述');
    expect(desc?.fields[0].sourceValue).toContain('新描述');
  });
});

// ===========================================================================
// 边界一：头像变化 + 来源为空
// ===========================================================================

describe('边界：头像变化与来源为空', () => {
  const base = () =>
    makeResume({
      id: 't',
      title: 't',
      basicInfo: { fullName: '张三', headline: 'PM', phone: '1', email: 'a@x.com', location: '上海', website: 'w', avatarUrl: 'http://x/old.png' },
      summary: '摘要',
    });

  it('头像不同 → 恰好 1 项头像修改', () => {
    const target = base();
    const source = makeResume({ id: 's', title: 's', basicInfo: { ...cloneResume(base()).basicInfo, avatarUrl: 'http://x/new.png' } });
    const diff = compareResumes(target, source);
    expect(changesIn(diff, 'basicInfo')).toHaveLength(1);
    expect(changesIn(diff, 'basicInfo')[0].fields[0].field).toBe('avatarUrl');
  });

  it('来源头像为空 → 无差异；合并不清空目标头像', () => {
    const target = base();
    const source = makeResume({ id: 's', title: 's', basicInfo: { ...cloneResume(base()).basicInfo, avatarUrl: '   ' } });
    expect(compareResumes(target, source).totalChanges).toBe(0);
    const result = mergeChanges(target, source, changeIds(compareResumes(target, source)));
    expect(result.applied).toBe(0);
    expect(result.resume.basicInfo.avatarUrl).toBe('http://x/old.png');
    expect(result.resume).toBe(target); // 无变化返回原对象
  });

  it('来源其它字段为空/空白 → 不清空目标已有内容（基本信息与摘要）', () => {
    const target = base();
    const source = makeResume({
      id: 's',
      title: 's',
      basicInfo: { fullName: '张三', headline: '  ', phone: '', email: '', location: '', website: '', avatarUrl: '' },
      summary: '   ',
    });
    expect(compareResumes(target, source).totalChanges).toBe(0);
    const result = mergeChanges(target, source, changeIds(compareResumes(target, source)));
    expect(result.resume.basicInfo.headline).toBe('PM');
    expect(result.resume.basicInfo.location).toBe('上海');
    expect(result.resume.summary).toBe('摘要');
  });

  it('目标为空、来源有值 → 作为修改（旧值显示空），合并后取来源值', () => {
    const target = makeResume({ id: 't', title: 't', basicInfo: { fullName: '张三', headline: '', phone: '', email: '', location: '', website: '', avatarUrl: '' } });
    const source = makeResume({ id: 's', title: 's', basicInfo: { fullName: '张三', headline: 'AI PM', phone: '', email: '', location: '', website: '', avatarUrl: '' } });
    const diff = compareResumes(target, source);
    const headline = changesIn(diff, 'basicInfo')[0];
    expect(headline.fields[0].currentValue).toBe('');
    expect(headline.fields[0].sourceValue).toBe('AI PM');
    expect(mergeChanges(target, source, changeIds(diff)).resume.basicInfo.headline).toBe('AI PM');
  });

  it('来源数组字段为空（职责清空）→ 不算差异、不清空目标', () => {
    const target = makeResume({
      id: 't',
      title: 't',
      workExperiences: [
        { id: 'w', companyName: '字节', position: 'PM', startDate: '', endDate: '', responsibilities: ['a', 'b'], achievements: [] },
      ],
    });
    const source = makeResume({
      id: 's',
      title: 's',
      workExperiences: [
        { id: 'x', companyName: '字节', position: 'PM', startDate: '', endDate: '', responsibilities: [], achievements: [] },
      ],
    });
    expect(compareResumes(target, source).totalChanges).toBe(0);
    const result = mergeChanges(target, source, changeIds(compareResumes(target, source)));
    expect(normalizeLines(result.resume.workExperiences[0].responsibilities)).toEqual(['a', 'b']);
  });
});

// ===========================================================================
// 边界二：实体整体换序（工作/技能/教育/项目）
// ===========================================================================

describe('边界：实体整体换序不产生成批修改', () => {
  function versionsIn(orderA: [string, string], orderB: [string, string]): [Resume, Resume] {
    const attr: Record<string, { end: string; prof: SkillLevel; score: SkillProficiency; gpa: string; desc: string }> = {
      阿里: { end: '2020', prof: SkillLevel.Intermediate, score: 3, gpa: '3.0', desc: 'dA' },
      腾讯: { end: '2021', prof: SkillLevel.Advanced, score: 4, gpa: '4.0', desc: 'dT' },
    };
    const build = (id: string, order: [string, string]): Resume =>
      makeResume({
        id,
        title: id,
        workExperiences: order.map((company, i) => ({
          id: `${id}-w${i}`, companyName: company, position: 'PM', startDate: '', endDate: attr[company].end,
          responsibilities: [], achievements: [],
        })),
        skills: order.map((company, i) => ({
          id: `${id}-s${i}`, name: company, level: attr[company].prof, proficiency: attr[company].score, category: SkillCategory.Technology,
        })),
        educations: order.map((company, i) => ({
          id: `${id}-e${i}`, school: company, major: 'CS', level: EducationLevel.Bachelor, startDate: '', endDate: '',
          gpa: attr[company].gpa, honors: [],
        })),
        projects: order.map((company, i) => ({
          id: `${id}-p${i}`, name: company, role: '', startDate: '', endDate: '', techStack: [],
          description: attr[company].desc, outcomes: [],
        })),
      });
    return [build('t', orderA), build('s', orderB)];
  }

  it('两条整体对调 → 零差异', () => {
    const [target, source] = versionsIn(['阿里', '腾讯'], ['腾讯', '阿里']);
    expect(compareResumes(target, source).totalChanges, formatDiffs(compareResumes(target, source))).toBe(0);
  });

  it('合并换序差异（无差异）后目标顺序与内容保持不变', () => {
    const [target, source] = versionsIn(['阿里', '腾讯'], ['腾讯', '阿里']);
    const result = mergeChanges(target, source, changeIds(compareResumes(target, source)));
    expect(result.resume).toBe(target);
    expect(result.resume.workExperiences.map((work) => work.companyName)).toEqual(['阿里', '腾讯']);
  });

  it('三条同身份（公司+职位全相同）整体换序、仅 id 不同 → 零差异', () => {
    // 数组内容必须绑定到「身份实例」（这里用结束时间区分），而不是绑定位置，否则换序天然不同
    const byEnd: Record<string, { resp: string; ach: string }> = {
      '2020': { resp: 'r0', ach: 'a0' },
      '2021': { resp: 'r1', ach: 'a1' },
      '2022': { resp: 'r2', ach: 'a2' },
    };
    const items = (prefix: string, ends: string[]) =>
      ends.map((end, i) => ({
        id: `${prefix}${i}`, companyName: '字节', position: 'PM', startDate: '', endDate: end,
        responsibilities: [byEnd[end].resp], achievements: [byEnd[end].ach],
      }));
    const target = makeResume({ id: 't', title: 't', workExperiences: items('t', ['2020', '2021', '2022']) });
    const source = makeResume({ id: 's', title: 's', workExperiences: items('s', ['2022', '2020', '2021']) });
    expect(compareResumes(target, source).totalChanges, formatDiffs(compareResumes(target, source))).toBe(0);
  });
});

// ===========================================================================
// 边界三：同身份多条（按出现顺序配对，不交叉错配）
// ===========================================================================

describe('边界：同身份多条按出现顺序配对', () => {
  it('两条同公司同职位，各自成就不同且换序 → 修改精确对齐到序号，不交叉', () => {
    const target = makeResume({
      id: 't', title: 't',
      workExperiences: [
        { id: 't1', companyName: '字节', position: 'PM', startDate: '', endDate: '', responsibilities: [], achievements: ['A1'] },
        { id: 't2', companyName: '字节', position: 'PM', startDate: '', endDate: '', responsibilities: [], achievements: ['B1'] },
      ],
    });
    const source = makeResume({
      id: 's', title: 's',
      workExperiences: [
        { id: 's2', companyName: '字节', position: 'PM', startDate: '', endDate: '', responsibilities: [], achievements: ['B2'] },
        { id: 's1', companyName: '字节', position: 'PM', startDate: '', endDate: '', responsibilities: [], achievements: ['A2'] },
      ],
    });
    const diff = compareResumes(target, source);
    const mods = changesIn(diff, 'work', 'modified');
    expect(mods).toHaveLength(2);
    expect(mods.every((change) => change.duplicate && change.fields[0].field === 'achievements')).toBe(true);
    const result = mergeChanges(target, source, changeIds(diff));
    // 按身份+内容对齐：A1→A2、B1→B2，而不是按位置交叉
    expect(result.resume.workExperiences.map((work) => work.achievements[0]).sort()).toEqual(['A2', 'B2']);
  });

  it('同名技能两条：来源改第 2 条并新增第 3 条', () => {
    const target = makeResume({
      id: 't', title: 't',
      skills: [
        { id: 't1', name: '英语', level: SkillLevel.Intermediate, proficiency: 3, category: SkillCategory.Language },
        { id: 't2', name: '英语', level: SkillLevel.Advanced, proficiency: 5, category: SkillCategory.Language },
      ],
    });
    const source = makeResume({
      id: 's', title: 's',
      skills: [
        { id: 's1', name: '英语', level: SkillLevel.Intermediate, proficiency: 3, category: SkillCategory.Language },
        { id: 's2', name: '英语', level: SkillLevel.Advanced, proficiency: 4, category: SkillCategory.Language },
        { id: 's3', name: '日语', level: SkillLevel.Beginner, proficiency: 2, category: SkillCategory.Language },
      ],
    });
    const diff = compareResumes(target, source);
    expect(changesIn(diff, 'skills', 'modified')).toHaveLength(1);
    expect(changesIn(diff, 'skills', 'added')).toHaveLength(1);
    const result = mergeChanges(target, source, changeIds(diff));
    expect(result.resume.skills.map((skill) => `${skill.name}:${skill.proficiency}`)).toEqual(['英语:3', '英语:4', '日语:2']);
  });
});

// ===========================================================================
// 边界四：精确移除（不漏删、不误删同身份另一条）
// ===========================================================================

describe('边界：重复身份的精确移除', () => {
  const target = () =>
    makeResume({
      id: 't', title: 't',
      skills: [
        { id: 't1', name: '英语', level: SkillLevel.Intermediate, proficiency: 3, category: SkillCategory.Language },
        { id: 't2', name: '英语', level: SkillLevel.Advanced, proficiency: 5, category: SkillCategory.Language },
      ],
    });

  it('来源只剩第 1 条 → 识别为移除第 2 条（proficiency 5）', () => {
    const source = makeResume({
      id: 's', title: 's',
      skills: [{ id: 's1', name: '英语', level: SkillLevel.Intermediate, proficiency: 3, category: SkillCategory.Language }],
    });
    const removed = changesIn(compareResumes(target(), source), 'skills', 'removed');
    expect(removed).toHaveLength(1);
    expect(removed[0].occurrence).toBe(2);
    expect(removed[0].fields.some((field) => field.field === 'proficiency' && field.currentValue === '5')).toBe(true);
  });

  it('只合并该移除 → 仅删第 2 条，第 1 条保留', () => {
    const source = makeResume({
      id: 's', title: 's',
      skills: [{ id: 's1', name: '英语', level: SkillLevel.Intermediate, proficiency: 3, category: SkillCategory.Language }],
    });
    const removedId = changesIn(compareResumes(target(), source), 'skills', 'removed')[0].id;
    const result = mergeChanges(target(), source, [removedId]);
    expect(result.resume.skills).toHaveLength(1);
    expect(result.resume.skills[0].proficiency).toBe(3);
  });

  it('来源没有该身份 → 两条都在移除列表；只选第 1 条时第 2 条不误删', () => {
    const source = makeResume({ id: 's', title: 's', skills: [] });
    const removed = changesIn(compareResumes(target(), source), 'skills', 'removed');
    expect(removed).toHaveLength(2);
    const first = removed.find((change) => change.occurrence === 1)!;
    const result = mergeChanges(target(), source, [first.id]);
    expect(result.resume.skills).toHaveLength(1);
    expect(result.resume.skills[0].proficiency).toBe(5);
  });
});

// ===========================================================================
// 边界五：列表（数组）字段换序
// ===========================================================================

describe('边界：字符串数组字段换序', () => {
  const target = makeResume({
    id: 't', title: 't',
    workExperiences: [{ id: 'w', companyName: '字节', position: 'PM', startDate: '', endDate: '', responsibilities: ['x', 'y', 'z'], achievements: ['1', '2'] }],
  });

  expectNoDiff('职责纯换序无差异', target, makeResume({
    id: 's', title: 's',
    workExperiences: [{ id: 'q', companyName: '字节', position: 'PM', startDate: '', endDate: '', responsibilities: ['z', 'x', 'y'], achievements: ['2', '1'] }],
  }));

  it('来源数组为子集 → 1 项修改；合并后取来源集合', () => {
    const source = makeResume({
      id: 's', title: 's',
      workExperiences: [{ id: 'q', companyName: '字节', position: 'PM', startDate: '', endDate: '', responsibilities: ['x', 'y'], achievements: ['1', '2'] }],
    });
    const diff = compareResumes(target, source);
    expect(changesIn(diff, 'work', 'modified')).toHaveLength(1);
    const result = mergeChanges(target, source, changeIds(diff));
    expect(result.resume.workExperiences[0].responsibilities).toEqual(['x', 'y']);
  });
});

// ===========================================================================
// 完整合并：内容、模块顺序、启用状态、来源不被污染
// ===========================================================================

describe('完整合并：内容正确且不破坏结构', () => {
  it('全量合并后在比较维度上与来源完全一致；sections 原样保留', () => {
    const target = buildTargetResume();
    const source = buildSourceResume();
    const sectionsBefore = JSON.stringify(target.sections);

    const result = mergeChanges(target, source, changeIds(compareResumes(target, source)));
    const merged = result.resume;

    // 再次比较无差异
    expect(compareResumes(merged, source).totalChanges, formatDiffs(compareResumes(merged, source))).toBe(0);

    // 关键字段落点
    expect(merged.basicInfo.avatarUrl).toBe('http://example.com/avatar-new.png');
    expect(merged.basicInfo.email).toBe('new@example.com');
    expect(merged.basicInfo.location).toBe('上海'); // 来源为空，目标保留
    expect(merged.summary).toBe(source.summary);
    expect(merged.workExperiences.map((work) => work.companyName)).toEqual(['青松科技', '云岭数据', '字节跳动']);
    expect(merged.skills.map((skill) => skill.name)).toEqual(['SQL / 数据分析', '产品策略', 'Prompt Engineering']);
    expect(merged.educations.map((education) => education.school)).toEqual(['华东理工大学', '复旦大学']); // 顺序不被来源带乱
    expect(merged.educations.find((education) => education.school === '华东理工大学')?.gpa).toBe('3.9 / 4.0');
    expect(merged.educations.find((education) => education.school === '复旦大学')?.gpa).toBe('3.8 / 4.0');

    // 模块顺序与启用状态完全不变
    expect(JSON.stringify(merged.sections)).toBe(sectionsBefore);
    expect(merged.sections).toEqual(fixedSections);
  });

  it('部分合并：未选内容、条目顺序、模块状态全部不变', () => {
    const target = buildTargetResume();
    const source = buildSourceResume();
    const sectionsBefore = JSON.stringify(target.sections);
    const workOrderBefore = target.workExperiences.map((work) => `${work.companyName}/${work.position}`);

    const diff = compareResumes(target, source);
    const chosen = [
      ...changesIn(diff, 'summary').map((change) => change.id),
      ...changesIn(diff, 'basicInfo').filter((change) => change.fields[0].field === 'email').map((change) => change.id),
    ];
    const result = mergeChanges(target, source, chosen);

    expect(result.resume.summary).toBe(source.summary);
    expect(result.resume.basicInfo.email).toBe('new@example.com');
    // 未选项保持
    expect(result.resume.basicInfo.avatarUrl).toContain('avatar-old');
    expect(result.resume.workExperiences).toHaveLength(4); // 字节第 2 条未删
    expect(result.resume.skills).toHaveLength(4); // 英语沟通未删
    expect(result.resume.workExperiences.map((work) => `${work.companyName}/${work.position}`)).toEqual(workOrderBefore);
    expect(JSON.stringify(result.resume.sections)).toBe(sectionsBefore);
  });

  it('合并不修改来源版本', () => {
    const target = buildTargetResume();
    const source = buildSourceResume();
    const sourceSnapshot = cloneResume(source);
    mergeChanges(target, source, changeIds(compareResumes(target, source)));
    expect(source).toEqual(sourceSnapshot);
  });
});

// ===========================================================================
// 重复合并幂等
// ===========================================================================

describe('重复合并幂等', () => {
  it('同一批变化合并两次：第二次 applied=0、无重复条目、再比较零差异', () => {
    const target = buildTargetResume();
    const source = buildSourceResume();
    const ids = changeIds(compareResumes(target, source));

    const first = mergeChanges(target, source, ids);
    expect(first.applied).toBe(expectedCanonicalDiff.total);
    expect(first.skipped).toBe(0);

    const countsAfterFirst = {
      work: first.resume.workExperiences.length,
      skills: first.resume.skills.length,
      education: first.resume.educations.length,
      projects: first.resume.projects.length,
    };

    const second = mergeChanges(first.resume, source, ids);
    expect(second.applied).toBe(0);
    expect(second.skipped).toBe(ids.length);
    expect(second.resume).toBe(first.resume); // 无写入
    expect({
      work: second.resume.workExperiences.length,
      skills: second.resume.skills.length,
      education: second.resume.educations.length,
      projects: second.resume.projects.length,
    }).toEqual(countsAfterFirst);
    expect(compareResumes(second.resume, source).totalChanges).toBe(0);
  });

  it('重复合并同一「新增」变化不产生重复条目（新增类独立验证）', () => {
    const target = makeResume({ id: 't', title: 't', skills: [{ id: 't1', name: 'SQL', level: SkillLevel.Advanced, proficiency: 4, category: SkillCategory.Technology }] });
    const source = makeResume({
      id: 's', title: 's',
      skills: [
        { id: 's1', name: 'SQL', level: SkillLevel.Advanced, proficiency: 4, category: SkillCategory.Technology },
        { id: 's2', name: 'Python', level: SkillLevel.Intermediate, proficiency: 3, category: SkillCategory.Technology },
      ],
      workExperiences: [{ id: 'w', companyName: '字节', position: 'PM', startDate: '', endDate: '2024', responsibilities: [], achievements: [] }],
    });
    const ids = changeIds(compareResumes(target, source));
    const first = mergeChanges(target, source, ids);
    const second = mergeChanges(first.resume, source, ids);
    expect(second.applied).toBe(0);
    expect(first.resume.skills.filter((skill) => skill.name === 'Python')).toHaveLength(1);
    expect(second.resume.skills.filter((skill) => skill.name === 'Python')).toHaveLength(1);
    expect(second.resume.workExperiences.filter((work) => work.companyName === '字节')).toHaveLength(1);
  });
});
