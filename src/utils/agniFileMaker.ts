import jsPDF from 'jspdf';
// pptxgenjs is loaded dynamically to reduce bundle size (it's ~1MB)

export async function makePDF(title: string, content: string): Promise<void> {
  const doc = new jsPDF();
  doc.setFont('helvetica');
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(255, 106, 0);
  doc.setFontSize(20);
  doc.text('AGNI AI', 10, 16);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(`Founders M. Sanjay & T. Hasini | Made in India | ${new Date().toLocaleDateString()}`, 10, 22);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.text(title, 10, 40);
  doc.setFontSize(12);
  const lines = doc.splitTextToSize(content || 'AGNI AI Executive Briefing', 190);
  doc.text(lines, 10, 50);
  doc.save(`${title.replace(/ /g, '_')}.pdf`);
}

export async function makePPT(
  title: string,
  slidesData: Array<{ title: string; content: string }>
): Promise<void> {
  // Dynamic import for bundle size optimization (pptxgenjs ~1MB)
  const { default: pptxgen } = await import('pptxgenjs');
  const pptx = new pptxgen();
  pptx.author = 'M. Sanjay & T. Hasini';

  // Title Slide
  const s0 = pptx.addSlide();
  s0.background = { fill: '000000' };
  s0.addText('AGNI', {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 1,
    fontSize: 44,
    color: 'FF6A00',
    fontFace: 'Inter',
    bold: true,
  });
  s0.addText(title, {
    x: 0.5,
    y: 2,
    w: 9,
    h: 1,
    fontSize: 32,
    color: 'FFFFFF',
    fontFace: 'Inter',
  });

  // Content Slides
  slidesData.forEach((s) => {
    const sl = pptx.addSlide();
    sl.background = { fill: '0A0A0A' };
    sl.addText(s.title, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.8,
      fontSize: 28,
      color: 'FF6A00',
      fontFace: 'Inter',
      bold: true,
    });
    sl.addText(s.content, {
      x: 0.5,
      y: 1.3,
      w: 9,
      h: 4.5,
      fontSize: 16,
      color: 'FFFFFF',
      fontFace: 'Inter',
    });
  });

  await pptx.writeFile({ fileName: `${title.replace(/ /g, '_')}.pptx` });
}


export function downloadPDF(text: string, title: string = 'AGNI-Document'): void {
  try {
    const doc = new jsPDF();
    doc.text(text || 'AGNI Document', 10, 10);
    doc.save(`${title}.pdf`);
  } catch (e) {
    console.warn('PDF download error:', e);
  }
}
