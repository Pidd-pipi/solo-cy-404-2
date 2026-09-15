import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { ArrowRight, CheckSquare, GitCompare, Square, X } from 'lucide-react';
import { useResumeStore } from '../../stores/resume';
import { educationLevelLabels, skillCategoryLabels, skillLevelLabels } from '../../types/enums';
import { compareResumes, DiffKind, ResumeChange } from '../../utils/resumeDiff';
import { Button } from './Button';

interface CompareMergeModalProps {
  open: boolean;
  onClose: () => void;
  /** 当前版本（被合并方） */
  initialTargetId?: string | null;
}

const enumValueLabels: Record<string, string> = {
  ...skillLevelLabels,
  ...skillCategoryLabels,
  ...educationLevelLabels,
};

function renderValue(field: string, value: string): string {
  if (!value) {
    return '（空）';
  }
  if (field === 'level' || field === 'category') {
    return enumValueLabels[value] ?? value;
  }
  return value;
}

const kindMeta: Record<DiffKind, { label: string; badgeClass: string; accent: string }> = {
  added: {
    label: '新增',
    badgeClass: 'bg-[var(--accent-soft)] text-[var(--accent-strong)]',
    accent: 'text-[var(--accent-strong)]',
  },
  removed: {
    label: '移除',
    badgeClass: 'bg-[color:color-mix(in_srgb,var(--danger)_15%,transparent)] text-[var(--danger)]',
    accent: 'text-[var(--danger)]',
  },
  modified: {
    label: '修改',
    badgeClass: 'bg-[color:color-mix(in_srgb,var(--gold)_20%,transparent)] text-[var(--gold)]',
    accent: 'text-[var(--gold)]',
  },
};

export function CompareMergeModal({ open, onClose, initialTargetId }: CompareMergeModalProps) {
  const resumes = useResumeStore((state) => state.resumes);
  const activeResumeId = useResumeStore((state) => state.activeResumeId);
  const mergeResumeChanges = useResumeStore((state) => state.mergeResumeChanges);

  const [targetId, setTargetId] = useState<string>(initialTargetId ?? activeResumeId ?? '');
  const [sourceId, setSourceId] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string>('');
  const wasOpenRef = useRef(false);

  // 仅在弹窗「打开的瞬间」重置选择；合并导致 resumes 更新时不能重置，否则会清空来源选择
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setTargetId(initialTargetId ?? useResumeStore.getState().activeResumeId ?? useResumeStore.getState().resumes[0]?.id ?? '');
      setSourceId('');
      setSelected(new Set());
      setFeedback('');
    }
    wasOpenRef.current = open;
  }, [open, initialTargetId]);

  const target = resumes.find((resume) => resume.id === targetId);
  const source = resumes.find((resume) => resume.id === sourceId);

  const diff = useMemo(() => {
    if (!target || !source || target.id === source.id) {
      return null;
    }
    return compareResumes(target, source);
  }, [target, source]);

  const allChangeIds = useMemo(() => {
    const ids: string[] = [];
    diff?.groups.forEach((group) => group.changes.forEach((change) => ids.push(change.id)));
    return ids;
  }, [diff]);

  useEffect(() => {
    // 比较对象或数据变化后，清掉已经不存在的选择
    setSelected((prev) => {
      const valid = new Set(allChangeIds);
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [allChangeIds]);

  const otherResumes = resumes.filter((resume) => resume.id !== targetId);

  const toggleChange = (id: string) => {
    setFeedback('');
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleGroup = (ids: string[]) => {
    setFeedback('');
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const toggleAll = () => {
    setFeedback('');
    setSelected((prev) => (prev.size === allChangeIds.length ? new Set() : new Set(allChangeIds)));
  };

  const handleMerge = () => {
    if (!target || !source || selected.size === 0) {
      return;
    }
    const result = mergeResumeChanges(target.id, source.id, [...selected]);
    if (!result) {
      return;
    }
    // 基于合并后的最新数据重算差异，清空失效选择
    const freshTarget = useResumeStore.getState().resumes.find((resume) => resume.id === target.id);
    if (freshTarget) {
      const fresh = compareResumes(freshTarget, source);
      const validIds = new Set<string>();
      fresh.groups.forEach((group) => group.changes.forEach((change) => validIds.add(change.id)));
      setSelected((prev) => new Set([...prev].filter((id) => validIds.has(id))));
    }
    setFeedback(
      `已合并 ${result.applied} 项变化${result.skipped > 0 ? `，${result.skipped} 项此前已合并、自动跳过` : ''}。`,
    );
  };

  return (
    <Dialog className="relative z-50" open={open} onClose={onClose}>
      <div className="fixed inset-0 bg-black/40" aria-hidden />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="flex max-h-[88vh] w-full max-w-4xl flex-col border border-[var(--border)] bg-[var(--surface)] shadow-panel">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5">
            <div>
              <DialogTitle className="flex items-center gap-2 font-display text-2xl font-semibold">
                <GitCompare size={22} aria-hidden /> 版本比较与合并
              </DialogTitle>
              <p className="mt-1 text-sm text-[var(--muted)]">
                选定来源版本，与当前版本逐项比较；勾选需要的变化合并，模块顺序与启用状态保持不变。
              </p>
            </div>
            <button
              type="button"
              aria-label="关闭"
              className="rounded-md p-2 text-[var(--muted)] hover:bg-[var(--surface-alt)]"
              onClick={onClose}
            >
              <X size={18} aria-hidden />
            </button>
          </div>

          <div className="grid gap-3 border-b border-[var(--border)] bg-[var(--surface-alt)] p-5 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">
              <span className="text-[var(--muted)]">当前版本（合并到这里）</span>
              <select
                className="min-h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                value={targetId}
                onChange={(event) => {
                  setTargetId(event.target.value);
                  if (event.target.value === sourceId) {
                    setSourceId('');
                  }
                }}
              >
                {resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium">
              <span className="text-[var(--muted)]">来源版本（从这里取变化）</span>
              <select
                className="min-h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm disabled:opacity-50"
                value={sourceId}
                disabled={otherResumes.length === 0}
                onChange={(event) => {
                  setSourceId(event.target.value);
                  setSelected(new Set());
                  setFeedback('');
                }}
              >
                <option value="">请选择来源版本…</option>
                {otherResumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-5">
            {!source ? (
              <p className="py-12 text-center text-sm text-[var(--muted)]">
                {resumes.length < 2 ? '至少需要两个简历版本才能比较。' : '请先选择一个来源版本开始比较。'}
              </p>
            ) : diff && diff.totalChanges === 0 ? (
              <p className="py-12 text-center text-sm text-[var(--muted)]">
                两个版本的基本信息、摘要、工作经历、项目、技能和教育完全一致，没有可合并的差异。
              </p>
            ) : diff ? (
              <div className="space-y-5">
                {diff.groups.map((group) => {
                  const ids = group.changes.map((change) => change.id);
                  const selectedCount = ids.filter((id) => selected.has(id)).length;
                  return (
                    <section key={group.module} className="border border-[var(--border)]">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 bg-[var(--surface-alt)] px-4 py-3 text-left"
                        onClick={() => toggleGroup(ids)}
                      >
                        <span className="flex items-center gap-2 font-display text-lg font-semibold">
                          {selectedCount === ids.length ? (
                            <CheckSquare size={17} aria-hidden />
                          ) : (
                            <Square size={17} aria-hidden className="opacity-70" />
                          )}
                          {group.title}
                        </span>
                        <span className="text-xs text-[var(--muted)]">
                          {ids.length} 项变化{selectedCount > 0 ? `，已选 ${selectedCount}` : ''}
                        </span>
                      </button>
                      <ul className="divide-y divide-[var(--border)]">
                        {group.changes.map((change) => (
                          <ChangeRow
                            key={change.id}
                            change={change}
                            checked={selected.has(change.id)}
                            onToggle={() => toggleChange(change.id)}
                          />
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] p-4">
            <div className="text-sm text-[var(--muted)]">
              {diff && diff.totalChanges > 0 ? (
                <>
                  共 {diff.totalChanges} 项差异，已选 <span className="font-semibold text-[var(--ink)]">{selected.size}</span> 项
                  {feedback ? <span className="ml-3 text-[var(--accent-strong)]">{feedback}</span> : null}
                </>
              ) : (
                feedback || '合并不会改变未勾选项、模块顺序与启用状态。'
              )}
            </div>
            <div className="flex gap-2">
              {diff && diff.totalChanges > 0 ? (
                <Button variant="ghost" onClick={toggleAll}>
                  {selected.size === allChangeIds.length ? '全部取消' : '全选'}
                </Button>
              ) : null}
              <Button variant="secondary" onClick={onClose}>
                关闭
              </Button>
              <Button
                variant="primary"
                icon={<GitCompare size={16} aria-hidden />}
                disabled={!target || !source || selected.size === 0}
                onClick={handleMerge}
              >
                合并选中项到当前版本
              </Button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

function ChangeRow({
  change,
  checked,
  onToggle,
}: {
  change: ResumeChange;
  checked: boolean;
  onToggle: () => void;
}) {
  const meta = kindMeta[change.kind];
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <button
        type="button"
        aria-label={checked ? '取消选择该变化' : '选择该变化'}
        className="mt-0.5 text-[var(--ink)]"
        onClick={onToggle}
      >
        {checked ? <CheckSquare size={17} aria-hidden /> : <Square size={17} aria-hidden className="opacity-60" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${meta.badgeClass}`}>{meta.label}</span>
          <span className="text-sm font-semibold">{change.itemLabel}</span>
          {change.kind === 'modified' ? <span className="text-xs text-[var(--muted)]">· {change.fields[0].label}</span> : null}
        </div>
        <div className="mt-2 space-y-1 text-sm">
          {change.kind === 'modified' &&
            change.fields.map((field) => (
              <p key={field.field} className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[var(--muted)]">{field.label}</span>
                <span className="rounded-sm bg-[color:color-mix(in_srgb,var(--danger)_10%,transparent)] px-2 py-0.5 line-through decoration-[var(--danger)]/60">
                  {renderValue(field.field, field.currentValue)}
                </span>
                <ArrowRight size={13} aria-hidden className="text-[var(--muted)]" />
                <span className="rounded-sm bg-[var(--accent-soft)] px-2 py-0.5 text-[var(--accent-strong)]">
                  {renderValue(field.field, field.sourceValue)}
                </span>
              </p>
            ))}
          {change.kind === 'added' &&
            change.fields.map((field) => (
              <p key={field.field} className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[var(--muted)]">{field.label}</span>
                <span className={`rounded-sm bg-[var(--accent-soft)] px-2 py-0.5 ${meta.accent}`}>
                  {renderValue(field.field, field.sourceValue)}
                </span>
              </p>
            ))}
          {change.kind === 'removed' &&
            change.fields.map((field) => (
              <p key={field.field} className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[var(--muted)]">{field.label}</span>
                <span className="rounded-sm bg-[color:color-mix(in_srgb,var(--danger)_10%,transparent)] px-2 py-0.5">
                  {renderValue(field.field, field.currentValue)}
                </span>
              </p>
            ))}
        </div>
      </div>
    </li>
  );
}
