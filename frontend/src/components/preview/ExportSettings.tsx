import { Download } from 'lucide-react';
import { Button } from '../common/Button';

interface ExportSettingsProps {
  margin: number;
  fontSize: number;
  isExporting: boolean;
  onMarginChange: (value: number) => void;
  onFontSizeChange: (value: number) => void;
  onExport: () => void;
}

export function ExportSettings({
  margin,
  fontSize,
  isExporting,
  onMarginChange,
  onFontSizeChange,
  onExport,
}: ExportSettingsProps) {
  return (
    <aside className="border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="font-display text-xl font-semibold">导出设置</h2>
      <div className="mt-5 space-y-5">
        <label className="block space-y-2 text-sm font-medium">
          <span>页边距 {margin}mm</span>
          <input
            className="w-full accent-[var(--accent)]"
            type="range"
            min="8"
            max="24"
            value={margin}
            onChange={(event) => onMarginChange(Number(event.target.value))}
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          <span>字号 {fontSize}px</span>
          <input
            className="w-full accent-[var(--accent)]"
            type="range"
            min="11"
            max="16"
            value={fontSize}
            onChange={(event) => onFontSizeChange(Number(event.target.value))}
          />
        </label>
        <Button
          className="w-full"
          disabled={isExporting}
          icon={<Download size={16} aria-hidden />}
          onClick={onExport}
          variant="primary"
        >
          {isExporting ? '导出中' : '导出 PDF'}
        </Button>
      </div>
    </aside>
  );
}

