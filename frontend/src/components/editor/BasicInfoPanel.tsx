import { AvatarUploader } from '../common/AvatarUploader';
import { ResumeBasicInfo } from '../../types/resume';

interface BasicInfoPanelProps {
  value: ResumeBasicInfo;
  onChange: (patch: Partial<ResumeBasicInfo>) => void;
}

const inputClass =
  'w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]';

export function BasicInfoPanel({ value, onChange }: BasicInfoPanelProps) {
  return (
    <section className="border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">基本信息</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">此处内容只影响当前简历，可从个人资料同步填写。</p>
        </div>
        <AvatarUploader value={value.avatarUrl} name={value.fullName} onChange={(avatarUrl) => onChange({ avatarUrl })} />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">
          <span>姓名</span>
          <input className={inputClass} value={value.fullName} onChange={(event) => onChange({ fullName: event.target.value })} />
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>标题</span>
          <input className={inputClass} value={value.headline} onChange={(event) => onChange({ headline: event.target.value })} />
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>电话</span>
          <input className={inputClass} value={value.phone} onChange={(event) => onChange({ phone: event.target.value })} />
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>邮箱</span>
          <input className={inputClass} type="email" value={value.email} onChange={(event) => onChange({ email: event.target.value })} />
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>城市</span>
          <input className={inputClass} value={value.location} onChange={(event) => onChange({ location: event.target.value })} />
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>主页</span>
          <input className={inputClass} value={value.website} onChange={(event) => onChange({ website: event.target.value })} />
        </label>
      </div>
    </section>
  );
}

