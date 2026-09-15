import { AvatarUploader } from '../components/common/AvatarUploader';
import { ContactForm } from '../components/common/ContactForm';
import { useProfileStore } from '../stores/profile';

export function Profile() {
  const profile = useProfileStore((state) => state.profile);
  const updateProfile = useProfileStore((state) => state.updateProfile);

  return (
    <div>
      <div className="border-b border-[var(--border)] pb-6">
        <p className="text-sm font-semibold uppercase text-[var(--accent-strong)]">Global profile</p>
        <h1 className="mt-2 font-display text-4xl font-semibold">个人信息编辑</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">全局资料会作为所有简历的默认引用，也可以在编辑器里同步到当前简历。</p>
      </div>
      <section className="mt-6 border border-[var(--border)] bg-[var(--surface)] p-5">
        <AvatarUploader value={profile.avatarUrl} name={profile.fullName} onChange={(avatarUrl) => updateProfile({ avatarUrl })} />
        <div className="mt-6">
          <ContactForm profile={profile} onChange={updateProfile} />
        </div>
      </section>
    </div>
  );
}

