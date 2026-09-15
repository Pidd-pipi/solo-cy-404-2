import { RefObject, useCallback, useState } from 'react';
import { exportElementToPdf } from '../utils/pdf';

export function useExportPdf(elementRef: RefObject<HTMLElement>) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportPdf = useCallback(
    async (filename: string, margin: number) => {
      if (!elementRef.current) {
        setError('没有找到可导出的预览区域');
        return;
      }

      setIsExporting(true);
      setError(null);
      try {
        await exportElementToPdf(elementRef.current, { filename, margin });
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : '导出失败');
      } finally {
        setIsExporting(false);
      }
    },
    [elementRef],
  );

  return { exportPdf, isExporting, error };
}

