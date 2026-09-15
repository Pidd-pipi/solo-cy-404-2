import { forwardRef } from 'react';
import { Resume } from '../../types/resume';
import { ResumePreview } from './ResumePreview';

interface A4PreviewProps {
  resume: Resume;
  margin: number;
  fontSize: number;
}

export const A4Preview = forwardRef<HTMLDivElement, A4PreviewProps>(({ resume, margin, fontSize }, ref) => (
  <div className="mx-auto w-full max-w-[794px]">
    <div
      ref={ref}
      className="aspect-[210/297] w-full overflow-hidden bg-white shadow-panel"
      style={{ padding: `${margin}mm` }}
    >
      <ResumePreview resume={resume} fontSize={fontSize} />
    </div>
  </div>
));

A4Preview.displayName = 'A4Preview';

