import { ChangeEvent, useRef } from 'react';
import { ImagePlus } from 'lucide-react';

interface AvatarUploaderProps {
  value?: string;
  name: string;
  onChange: (value: string) => void;
}

export function AvatarUploader({ value, name, onChange }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const initials = name.trim().slice(0, 2) || '简历';

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-4">
      <button
        className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-alt)] font-display text-lg font-semibold text-[var(--accent-strong)]"
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="上传头像"
      >
        {value ? <img className="h-full w-full object-cover" src={value} alt={name} /> : initials}
        <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] text-[var(--ink-invert)]">
          <ImagePlus size={15} aria-hidden />
        </span>
      </button>
      <div>
        <p className="text-sm font-semibold text-[var(--ink)]">头像</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">用于个人资料和简历页眉，本地存储为 base64。</p>
      </div>
      <input ref={inputRef} className="hidden" type="file" accept="image/*" onChange={handleChange} />
    </div>
  );
}

