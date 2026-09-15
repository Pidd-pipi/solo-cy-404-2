import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Resume } from '../types/resume';
import { storageKeys } from '../utils/storage';
import { resetStorage } from './setup';
import { buildSourceResume, buildTargetResume, cloneResume, fixedSections } from './fixtures';
import { compareResumes } from '../utils/resumeDiff';
import type { useResumeStore as UseResumeStore } from '../stores/resume';

type ResumeStoreApi = typeof UseResumeStore;

// 每个用例前清空内存存储并重置模块注册表，保证用例独立、可重复运行
beforeEach(() => {
  resetStorage();
  vi.resetModules();
});

async function loadStore(): Promise<ResumeStoreApi> {
  const mod = await import('../stores/resume');
  return mod.useResumeStore;
}

function allChangeIds(target: Resume, source: Resume): string[] {
  return compareResumes(target, source).groups.flatMap((group) => group.changes.map((change) => change.id));
}

describe('store：mergeResumeChanges 集成', () => {
  it('全量合并后持久化到 localStorage，且与来源零差异', async () => {
    const useStore = await loadStore();
    useStore.getState().replaceResumes([buildTargetResume(), buildSourceResume()], 'target-resume');

    const result = useStore.getState().mergeResumeChanges(
      'target-resume',
      'source-resume',
      allChangeIds(buildTargetResume(), buildSourceResume()),
    );
    expect(result?.applied).toBeGreaterThan(0);
    expect(result?.skipped).toBe(0);

    const after = useStore.getState().resumes.find((resume) => resume.id === 'target-resume')!;
    const source = useStore.getState().resumes.find((resume) => resume.id === 'source-resume')!;
    expect(compareResumes(after, source).totalChanges).toBe(0);
    expect(after.basicInfo.avatarUrl).toContain('avatar-new');
    expect(after.basicInfo.location).toBe('上海'); // 来源为空不清空

    // 已写入 localStorage
    const persisted = JSON.parse(window.localStorage.getItem(storageKeys.resumes) ?? '[]') as Resume[];
    expect(persisted.find((resume) => resume.id === 'target-resume')!.basicInfo.avatarUrl).toContain('avatar-new');
  });

  it('重复合并返回 applied=0，不产生重复条目', async () => {
    const useStore = await loadStore();
    useStore.getState().replaceResumes([buildTargetResume(), buildSourceResume()], 'target-resume');
    const ids = allChangeIds(buildTargetResume(), buildSourceResume());

    useStore.getState().mergeResumeChanges('target-resume', 'source-resume', ids);
    const again = useStore.getState().mergeResumeChanges('target-resume', 'source-resume', ids);
    expect(again?.applied).toBe(0);

    const target = useStore.getState().resumes.find((resume) => resume.id === 'target-resume')!;
    const source = useStore.getState().resumes.find((resume) => resume.id === 'source-resume')!;
    expect(compareResumes(target, source).totalChanges).toBe(0);
    expect(new Set(target.skills.map((skill) => skill.id)).size).toBe(target.skills.length);
    expect(new Set(target.workExperiences.map((work) => work.id)).size).toBe(target.workExperiences.length);
  });

  it('只合并部分变化时，未选内容、模块顺序与启用状态不变', async () => {
    const useStore = await loadStore();
    useStore.getState().replaceResumes([buildTargetResume(), buildSourceResume()], 'target-resume');

    const emailId = compareResumes(buildTargetResume(), buildSourceResume())
      .groups.flatMap((group) => group.changes)
      .find((change) => change.fields[0].field === 'email')!.id;
    useStore.getState().mergeResumeChanges('target-resume', 'source-resume', [emailId]);

    const after = useStore.getState().resumes.find((resume) => resume.id === 'target-resume')!;
    expect(after.basicInfo.email).toBe('new@example.com');
    expect(after.basicInfo.avatarUrl).toContain('avatar-old'); // 未选头像
    expect(after.workExperiences).toHaveLength(4); // 未选移除
    expect(after.sections).toEqual(fixedSections); // 顺序与启用状态不变
  });

  it('来源版本在合并过程中不被修改', async () => {
    const useStore = await loadStore();
    const source = buildSourceResume();
    useStore.getState().replaceResumes([buildTargetResume(), source], 'target-resume');
    const snapshot = cloneResume(source);
    useStore.getState().mergeResumeChanges(
      'target-resume',
      'source-resume',
      allChangeIds(buildTargetResume(), buildSourceResume()),
    );
    expect(useStore.getState().resumes.find((resume) => resume.id === 'source-resume')).toEqual(snapshot);
  });

  it('缺少版本或空选择时返回 null', async () => {
    const useStore = await loadStore();
    useStore.getState().replaceResumes([buildTargetResume(), buildSourceResume()]);
    const state = useStore.getState();
    expect(state.mergeResumeChanges('missing', 'source-resume', ['x'])).toBeNull();
    expect(state.mergeResumeChanges('target-resume', 'source-resume', [])).toBeNull();
  });
});

describe('本地存储：模拟刷新（重新加载模块从 localStorage 重建 store）', () => {
  it('合并 → 刷新后结果仍在，且与来源零差异', async () => {
    const originalIds = allChangeIds(buildTargetResume(), buildSourceResume());

    // 第一次加载：完成合并并持久化
    {
      const useStore = await loadStore();
      useStore.getState().replaceResumes([buildTargetResume(), buildSourceResume()], 'target-resume');
      useStore.getState().mergeResumeChanges('target-resume', 'source-resume', originalIds);
    }

    // 重置模块注册表（store 在导入时从 localStorage 读初始值），但保留 window.localStorage 数据
    vi.resetModules();

    // 第二次加载：等价于页面刷新后的全新模块作用域
    const useStore = await loadStore();
    const store = useStore.getState();

    expect(store.resumes).toHaveLength(2);
    const target = store.resumes.find((resume) => resume.id === 'target-resume')!;
    const source = store.resumes.find((resume) => resume.id === 'source-resume')!;

    expect(store.activeResumeId).toBe('target-resume');
    expect(compareResumes(target, source).totalChanges).toBe(0);
    expect(target.basicInfo.avatarUrl).toBe('http://example.com/avatar-new.png');
    expect(target.basicInfo.location).toBe('上海');
    expect(target.workExperiences.map((work) => work.companyName)).toEqual(['青松科技', '云岭数据', '字节跳动']);
    expect(target.skills.map((skill) => skill.name)).toEqual(['SQL / 数据分析', '产品策略', 'Prompt Engineering']);
    expect(target.educations.map((education) => education.school)).toEqual(['华东理工大学', '复旦大学']);
    expect(target.sections).toEqual(fixedSections);

    // 刷新后用「同一批陈旧变化 id」再合并一次：全部失效 → applied=0，结果保持零差异
    const again = store.mergeResumeChanges('target-resume', 'source-resume', originalIds);
    expect(again?.applied).toBe(0);
    expect(again?.skipped).toBe(originalIds.length);
    const refreshedTarget = useStore.getState().resumes.find((resume) => resume.id === 'target-resume')!;
    expect(compareResumes(refreshedTarget, source).totalChanges).toBe(0);
  });

  it('刷新后的空操作（重复合并）不改写已持久化内容', async () => {
    {
      const useStore = await loadStore();
      useStore.getState().replaceResumes([buildTargetResume(), buildSourceResume()], 'target-resume');
      useStore.getState().mergeResumeChanges(
        'target-resume',
        'source-resume',
        allChangeIds(buildTargetResume(), buildSourceResume()),
      );
    }
    const persistedOnce = window.localStorage.getItem(storageKeys.resumes);

    vi.resetModules();
    const useStore = await loadStore();
    const store = useStore.getState();
    const target = store.resumes.find((resume) => resume.id === 'target-resume')!;
    store.mergeResumeChanges('target-resume', 'source-resume', allChangeIds(target, buildSourceResume()));

    expect(window.localStorage.getItem(storageKeys.resumes)).toBe(persistedOnce);
  });
});
