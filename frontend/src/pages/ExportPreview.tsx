import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { A4Preview } from '../components/preview/A4Preview';
import { ExportSettings } from '../components/preview/ExportSettings';
import { useExportPdf } from '../hooks/useExportPdf';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useResumeStore } from '../stores/resume';

export function ExportPreview() {
  const { id } = useParams();
  const previewRef = useRef<HTMLDivElement | null>(null);
  const resume = useResumeStore((state) => state.resumes.find((item) => item.id === id));
  const [margin, setMargin] = useLocalStorage('smart-resume:export-margin', 14);
  const [fontSize, setFontSize] = useLocalStorage('smart-resume:export-font-size', 12);
  const { exportPdf, isExporting, error } = useExportPdf(previewRef);

  if (!resume) {
    return <EmptyState title="无法导出" description="没有找到这份简历，可能已被删除。" />;
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 md:flex-row md:items-end">
        <div>
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]" to={`/resumes/${resume.id}/edit`}>
            <ArrowLeft size={15} aria-hidden /> 返回编辑
          </Link>
          <h1 className="mt-3 font-display text-4xl font-semibold">PDF 导出预览</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">按 A4 比例渲染，导出前可调整页边距和字号。</p>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <ExportSettings
          fontSize={fontSize}
          isExporting={isExporting}
          margin={margin}
          onExport={() => exportPdf(`${resume.title || 'resume'}.pdf`, margin)}
          onFontSizeChange={setFontSize}
          onMarginChange={setMargin}
        />
        <div className="overflow-auto bg-[var(--surface-alt)] p-6">
          <A4Preview ref={previewRef} resume={resume} margin={margin} fontSize={fontSize} />
          {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

