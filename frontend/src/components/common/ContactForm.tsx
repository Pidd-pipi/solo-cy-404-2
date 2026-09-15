import { Profile } from '../../types/profile';

interface ContactFormProps {
  profile: Profile;
  onChange: (patch: Partial<Profile>) => void;
}

const inputClass =
  'w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]';

export function ContactForm({ profile, onChange }: ContactFormProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-1 text-sm font-medium">
        <span>姓名</span>
        <input className={inputClass} value={profile.fullName} onChange={(event) => onChange({ fullName: event.target.value })} />
      </label>
      <label className="space-y-1 text-sm font-medium">
        <span>求职意向</span>
        <input className={inputClass} value={profile.targetRole} onChange={(event) => onChange({ targetRole: event.target.value })} />
      </label>
      <label className="space-y-1 text-sm font-medium">
        <span>电话</span>
        <input className={inputClass} value={profile.phone} onChange={(event) => onChange({ phone: event.target.value })} />
      </label>
      <label className="space-y-1 text-sm font-medium">
        <span>邮箱</span>
        <input className={inputClass} type="email" value={profile.email} onChange={(event) => onChange({ email: event.target.value })} />
      </label>
      <label className="space-y-1 text-sm font-medium">
        <span>城市</span>
        <input className={inputClass} value={profile.location} onChange={(event) => onChange({ location: event.target.value })} />
      </label>
      <label className="space-y-1 text-sm font-medium">
        <span>主页</span>
        <input className={inputClass} value={profile.website} onChange={(event) => onChange({ website: event.target.value })} />
      </label>
      <label className="space-y-1 text-sm font-medium md:col-span-2">
        <span>一句话定位</span>
        <input className={inputClass} value={profile.headline} onChange={(event) => onChange({ headline: event.target.value })} />
      </label>
      <label className="space-y-1 text-sm font-medium md:col-span-2">
        <span>个人摘要</span>
        <textarea
          className={`${inputClass} min-h-28 resize-y`}
          value={profile.summary}
          onChange={(event) => onChange({ summary: event.target.value })}
        />
      </label>
    </div>
  );
}

