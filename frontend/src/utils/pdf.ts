import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PdfExportOptions {
  filename: string;
  margin: number;
}

export async function exportElementToPdf(element: HTMLElement, options: PdfExportOptions): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
  });
  const imageData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const width = 210 - options.margin * 2;
  const height = (canvas.height * width) / canvas.width;

  pdf.addImage(imageData, 'PNG', options.margin, options.margin, width, height);
  pdf.save(options.filename);
}

