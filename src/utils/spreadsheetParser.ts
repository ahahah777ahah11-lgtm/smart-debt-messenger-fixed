import * as XLSX from 'xlsx';
import { ColumnMapping, Customer } from '../types';
import { detectColumns } from './sqliteParser';

export interface SpreadsheetParsedResult {
  sheetNames: string[];
  currentSheet: string;
  headers: string[];
  rows: Record<string, any>[];
  recommendedMapping: Partial<ColumnMapping>;
}

export function parseSpreadsheetBuffer(buffer: ArrayBuffer, selectedSheetIndex = 0): SpreadsheetParsedResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetNames = workbook.SheetNames;
  
  if (sheetNames.length === 0) {
    throw new Error('الملف لا يحتوي على أي صفحات بيانات');
  }

  const sheetName = sheetNames[selectedSheetIndex] || sheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON array of objects
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  // Extract all distinct headers
  const headerSet = new Set<string>();
  rawRows.forEach((r) => {
    Object.keys(r).forEach((k) => headerSet.add(k));
  });
  const headers = Array.from(headerSet);

  const recommendedMapping = detectColumns(headers);

  return {
    sheetNames,
    currentSheet: sheetName,
    headers,
    rows: rawRows,
    recommendedMapping
  };
}

// Convert parsed rows into Customer objects using the specified column mapping
export function mapRowsToCustomers(
  rows: Record<string, any>[],
  mapping: ColumnMapping,
  defaultCategory = 'عام'
): Customer[] {
  const now = new Date().toISOString();
  const customers: Customer[] = [];

  rows.forEach((row, idx) => {
    const rawName = mapping.nameCol ? String(row[mapping.nameCol] || '').trim() : '';
    if (!rawName) return; // Skip empty rows

    // Clean phone number (keep digits and +)
    let rawPhone = mapping.phoneCol ? String(row[mapping.phoneCol] || '').trim() : '';
    rawPhone = rawPhone.replace(/[^\d+]/g, '');

    // Parse amounts
    const parseNum = (val: any): number => {
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      if (!val) return 0;
      const clean = String(val).replace(/,/g, '').replace(/[^\d.-]/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };

    let debit = mapping.debitCol ? parseNum(row[mapping.debitCol]) : 0;
    let credit = mapping.creditCol ? parseNum(row[mapping.creditCol]) : 0;
    let balance = mapping.balanceCol ? parseNum(row[mapping.balanceCol]) : 0;

    // If balance is provided but debit/credit are missing:
    if (balance !== 0 && debit === 0 && credit === 0) {
      if (balance > 0) {
        debit = balance;
      } else {
        credit = Math.abs(balance);
      }
    } else if (debit !== 0 || credit !== 0) {
      balance = debit - credit;
    }

    const notes = mapping.notesCol ? String(row[mapping.notesCol] || '').trim() : '';
    const accountNumber = mapping.accountNumberCol ? String(row[mapping.accountNumberCol] || '').trim() : `ACC-${idx + 101}`;

    customers.push({
      id: `cust_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      name: rawName,
      phone: rawPhone,
      debit,
      credit,
      balance,
      notes,
      category: defaultCategory,
      accountNumber,
      status: 'unnotified',
      lastSentAt: null,
      lastSentChannel: null,
      transactions: debit > 0 ? [
        {
          id: `tx_${Date.now()}_${idx}`,
          date: new Date().toISOString().split('T')[0],
          type: 'debit',
          amount: debit,
          note: 'رصيد افتتاحي مستورد'
        }
      ] : [],
      createdAt: now,
      updatedAt: now
    });
  });

  return customers;
}

// Generate ready-to-use Sample Excel workbook
export function generateSampleExcelWorkbook(): Uint8Array {
  const sampleData = [
    {
      'اسم العميل': 'عادل حزام اليافعي',
      'رقم الهاتف': '777123456',
      'المبلغ عليه (مدين)': 85000,
      'المبلغ له (دائن)': 15000,
      'الرصيد المستحق': 70000,
      'ملاحظات': 'حساب بقالة ومواد غذائية',
      'رقم الحساب': 'ACC-101'
    },
    {
      'اسم العميل': 'محمد عبدالله الصنعاني',
      'رقم الهاتف': '771987654',
      'المبلغ عليه (مدين)': 120000,
      'المبلغ له (دائن)': 40000,
      'الرصيد المستحق': 80000,
      'ملاحظات': 'فواتير مشتريات شهر مارس',
      'رقم الحساب': 'ACC-102'
    },
    {
      'اسم العميل': 'أحمد علي القدسي',
      'رقم الهاتف': '733456789',
      'المبلغ عليه (مدين)': 45000,
      'المبلغ له (دائن)': 45000,
      'الرصيد المستحق': 0,
      'ملاحظات': 'تم تسديد كامل المبلغ',
      'رقم الحساب': 'ACC-103'
    },
    {
      'اسم العميل': 'خالد عبده الحكيمي',
      'رقم الهاتف': '770112233',
      'المبلغ عليه (مدين)': 195000,
      'المبلغ له (دائن)': 25000,
      'الرصيد المستحق': 170000,
      'ملاحظات': 'متبقي حساب أجهزة إلكترونية',
      'رقم الحساب': 'ACC-104'
    },
    {
      'اسم العميل': 'طارق حسن العدني',
      'رقم الهاتف': '773665544',
      'المبلغ عليه (مدين)': 32000,
      'المبلغ له (دائن)': 0,
      'الرصيد المستحق': 32000,
      'ملاحظات': 'وعد بالسداد نهاية الأسبوع',
      'رقم الحساب': 'ACC-105'
    },
    {
      'اسم العميل': 'صالح ناصر المهري',
      'رقم الهاتف': '775889900',
      'المبلغ عليه (مدين)': 0,
      'المبلغ له (دائن)': 15000,
      'الرصيد المستحق': -15000,
      'ملاحظات': 'دائن - له رصيد متبقي لدينا',
      'رقم الحساب': 'ACC-106'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'كشف العملاء والديون');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(excelBuffer);
}

// Generate ready-to-use Sample CSV content
export function generateSampleCsvString(): string {
  const headers = ['اسم العميل,رقم الهاتف,المبلغ عليه (مدين),المبلغ له (دائن),الرصيد المستحق,ملاحظات,رقم الحساب'];
  const rows = [
    'عادل حزام اليافعي,777123456,85000,15000,70000,حساب بقالة ومواد غذائية,ACC-101',
    'محمد عبدالله الصنعاني,771987654,120000,40000,80000,فواتير مشتريات شهر مارس,ACC-102',
    'أحمد علي القدسي,733456789,45000,45000,0,تم تسديد كامل المبلغ,ACC-103',
    'خالد عبده الحكيمي,770112233,195000,25000,170000,متبقي حساب أجهزة إلكترونية,ACC-104',
    'طارق حسن العدني,773665544,32000,0,32000,وعد بالسداد نهاية الأسبوع,ACC-105'
  ];
  return '\uFEFF' + [headers, ...rows].join('\n'); // Add BOM for Excel UTF-8 Arabic compatibility
}

// Export customers list to Excel with summary totals row
export function exportCustomersToExcel(
  customers: Customer[],
  fileName = 'كشف_ديون_العملاء.xlsx',
  storeName?: string,
  currency?: string
): void {
  const totalDebit = customers.reduce((sum, c) => sum + (c.debit || 0), 0);
  const totalCredit = customers.reduce((sum, c) => sum + (c.credit || 0), 0);
  const totalBalance = customers.reduce((sum, c) => sum + (c.balance || 0), 0);

  const data: Record<string, any>[] = customers.map((c, i) => {
    const urgencyLabel = c.urgencyLevel === 'critical'
      ? 'حرج جداً (Critical)'
      : c.urgencyLevel === 'high'
      ? 'أولوية عالية (High)'
      : c.urgencyLevel === 'medium'
      ? 'أولوية متوسطة (Medium)'
      : c.urgencyLevel === 'low'
      ? 'أولوية منخفضة (Low)'
      : '-';

    return {
      'م': i + 1,
      'رقم الحساب': c.accountNumber || '',
      'اسم العميل': c.name,
      'رقم الهاتف': c.phone,
      'المبلغ عليه (مدين)': c.debit,
      'المبلغ له (دائن)': c.credit,
      'صافي الرصيد المستحق': c.balance,
      'درجة إلحاح التحصيل (AI)': urgencyLabel,
      'مؤشر الخطورة (1-100)': c.urgencyScore || '',
      'عمر الدين التقديري (أيام)': c.urgencyDebtDurationDays || (c.balance > 0 ? '' : '-'),
      'توصية وإجراء التحصيل': c.urgencySuggestedAction || '',
      'حالة الحساب': c.balance > 0 ? 'مدين (عليه دين)' : c.balance < 0 ? 'دائن (له رصيد)' : 'مسدد بالكامل',
      'حالة الإشعار': c.status === 'sent' ? 'تم الإرسال' : c.status === 'postponed' ? 'مؤجل' : c.status === 'exempt' ? 'مستثنى' : 'لم يُرسل',
      'تاريخ آخر إرسال': c.lastSentAt ? new Date(c.lastSentAt).toLocaleString('ar-EG') : 'لا يوجد',
      'ملاحظات': c.notes || ''
    };
  });

  // Add summary totals row
  data.push({
    'م': 'الإجمالي',
    'رقم الحساب': `عدد العملاء: ${customers.length}`,
    'اسم العميل': storeName ? `المتجر: ${storeName}` : 'الإجمالي العام لكافة الحسابات',
    'رقم الهاتف': currency ? `العملة: ${currency}` : '',
    'المبلغ عليه (مدين)': totalDebit,
    'المبلغ له (دائن)': totalCredit,
    'صافي الرصيد المستحق': totalBalance,
    'درجة إلحاح التحصيل (AI)': '',
    'مؤشر الخطورة (1-100)': '',
    'عمر الدين التقديري (أيام)': '',
    'توصية وإجراء التحصيل': '',
    'حالة الحساب': '',
    'حالة الإشعار': '',
    'تاريخ آخر إرسال': '',
    'ملاحظات': `تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}`
  });

  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 8 },  // م
    { wch: 14 }, // رقم الحساب
    { wch: 28 }, // اسم العميل
    { wch: 16 }, // رقم الهاتف
    { wch: 18 }, // المبلغ عليه
    { wch: 18 }, // المبلغ له
    { wch: 20 }, // صافي الرصيد
    { wch: 22 }, // درجة إلحاح التحصيل
    { wch: 18 }, // مؤشر الخطورة
    { wch: 22 }, // عمر الدين
    { wch: 35 }, // توصية التحصيل
    { wch: 16 }, // حالة الحساب
    { wch: 14 }, // حالة الإشعار
    { wch: 20 }, // تاريخ آخر إرسال
    { wch: 30 }  // ملاحظات
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'كشف ديون العملاء');
  XLSX.writeFile(wb, fileName);
}
