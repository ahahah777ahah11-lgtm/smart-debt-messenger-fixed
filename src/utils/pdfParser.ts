import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for pdfjs
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export interface ExtractedPdfRecord {
  name: string;
  phone: string;
  debit: number;
  credit: number;
  balance: number;
  notes: string;
}

export async function parsePdfBuffer(buffer: ArrayBuffer): Promise<{
  rawText: string;
  extractedRecords: ExtractedPdfRecord[];
  pageCount: number;
}> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDocument = await loadingTask.promise;
  const pageCount = pdfDocument.numPages;

  let fullText = '';
  const lines: string[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Group text items by vertical position or consecutive items
    let pageLines: string[] = [];
    let currentLine = '';
    let lastY: number | null = null;

    for (const item of textContent.items as any[]) {
      if (!item.str) continue;
      const y = Math.round(item.transform[5]);
      
      if (lastY !== null && Math.abs(y - lastY) > 5) {
        if (currentLine.trim()) pageLines.push(currentLine.trim());
        currentLine = item.str;
      } else {
        currentLine += ' ' + item.str;
      }
      lastY = y;
    }
    if (currentLine.trim()) pageLines.push(currentLine.trim());

    fullText += pageLines.join('\n') + '\n--- صفحة ' + pageNum + ' ---\n';
    lines.push(...pageLines);
  }

  // Smart heuristic extractor for customer records in PDF statements
  const records: ExtractedPdfRecord[] = [];

  // Regex patterns
  const phonePattern = /(?:\+?967|0)?(?:7[01378][0-9]{7}|7[0-9]{8}|05[0-9]{8}|9665[0-9]{8})/g;
  const numberPattern = /\b\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?\b/g;

  lines.forEach((line) => {
    // Check if line contains phone number or financial figures
    const phoneMatches = line.match(phonePattern);
    const cleanedLine = line.replace(/[^\u0621-\u064A\sa-zA-Z0-9.,+-]/g, ' ');

    // Extract potential names (Arabic words of length >= 2)
    const arabicWords = cleanedLine.match(/[\u0621-\u064A]{2,}/g) || [];
    
    // Extract numbers
    const numbersFound: number[] = [];
    const numMatches = line.match(numberPattern);
    if (numMatches) {
      numMatches.forEach((m) => {
        const val = parseFloat(m.replace(/[,\s]/g, ''));
        // Ignore small single digits or years like 2024, 2025, 2026 unless they are the only number
        if (!isNaN(val) && val > 0 && val !== 2024 && val !== 2025 && val !== 2026) {
          numbersFound.push(val);
        }
      });
    }

    if (arabicWords.length >= 2 && (phoneMatches || numbersFound.length > 0)) {
      const name = arabicWords.slice(0, 4).join(' ');
      const phone = phoneMatches ? phoneMatches[0] : '';
      
      let debit = 0;
      let credit = 0;
      let balance = 0;

      if (numbersFound.length >= 3) {
        debit = numbersFound[0];
        credit = numbersFound[1];
        balance = numbersFound[2];
      } else if (numbersFound.length === 2) {
        debit = numbersFound[0];
        credit = numbersFound[1];
        balance = debit - credit;
      } else if (numbersFound.length === 1) {
        debit = numbersFound[0];
        balance = debit;
      }

      // Avoid header lines like "اسم العميل", "رقم الهاتف", "الرصيد", "كشف حساب"
      const isHeader = name.includes('اسم') && name.includes('العميل') || name.includes('كشف حساب') || name.includes('التاريخ');
      if (!isHeader && (debit > 0 || credit > 0 || phone)) {
        records.push({
          name,
          phone,
          debit,
          credit,
          balance: balance !== 0 ? balance : debit - credit,
          notes: 'مستورد من ملف PDF'
        });
      }
    }
  });

  return {
    rawText: fullText,
    extractedRecords: records,
    pageCount
  };
}
