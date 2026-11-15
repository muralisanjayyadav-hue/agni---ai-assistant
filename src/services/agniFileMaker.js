import jsPDF from 'jspdf';
import pptxgen from 'pptxgenjs';

export function downloadPDF(text, title = 'AGNI-Document') {
  try {
    const doc = new jsPDF();
    doc.text(text || 'AGNI Document', 10, 10);
    doc.save(`${title}.pdf`);
  } catch (e) {
    console.warn('PDF download error:', e);
  }
}

export async function makePDF(title, content) {
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

export async function makePPT(title, slidesData) {
  const pptx = new pptxgen();
  pptx.author = 'M. Sanjay & T. Hasini';
  const s0 = pptx.addSlide();
  s0.background = { fill: '000000' };
  s0.addText('AGNI', {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 1,
    fontSize: 44,
    color: 'FF6A00',
    bold: true,
  });
  s0.addText(title, {
    x: 0.5,
    y: 1.8,
    w: 9,
    h: 1,
    fontSize: 24,
    color: 'FFFFFF',
  });
  s0.addText('Conceived & Founded by M. Sanjay & T. Hasini | muralisanjayyadav@gmail.com', {
    x: 0.5,
    y: 3.0,
    w: 9,
    h: 0.6,
    fontSize: 14,
    color: '888888',
  });

  for (const slide of slidesData) {
    const s = pptx.addSlide();
    s.background = { fill: '111111' };
    s.addText(slide.title, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.8,
      fontSize: 22,
      color: 'FF6A00',
      bold: true,
    });
    s.addText(slide.content, {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 3.5,
      fontSize: 14,
      color: 'DDDDDD',
      bullet: true,
    });
  }

  await pptx.writeFile({ fileName: `${title.replace(/ /g, '_')}.pptx` });
}
