import React, { useState, useRef } from 'react';
import {
  X,
  Database,
  FileSpreadsheet,
  FileText,
  UserPlus,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Play,
  HelpCircle,
  ChevronRight,
  Eye,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ColumnMapping, Customer } from '../types';
import {
  parseSqliteBuffer,
  createSampleSqliteDatabase,
  ParsedDbResult
} from '../utils/sqliteParser';
import {
  parseSpreadsheetBuffer,
  mapRowsToCustomers,
  generateSampleExcelWorkbook,
  generateSampleCsvString,
  SpreadsheetParsedResult
} from '../utils/spreadsheetParser';
import { parsePdfBuffer, ExtractedPdfRecord } from '../utils/pdfParser';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'db' | 'excel' | 'csv' | 'pdf' | 'manual';
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'db'
}) => {
  const { importCustomers, addCustomer, settings } = useApp();

  const [activeTab, setActiveTab] = useState<'db' | 'excel' | 'csv' | 'pdf' | 'manual'>(initialTab);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // SQLite State
  const [sqliteResult, setSqliteResult] = useState<ParsedDbResult | null>(null);
  const [selectedDbTable, setSelectedDbTable] = useState<string>('');
  const [dbMapping, setDbMapping] = useState<ColumnMapping>({
    nameCol: '',
    phoneCol: '',
    debitCol: '',
    creditCol: '',
    balanceCol: '',
    notesCol: ''
  });
  const [dbTableRows, setDbTableRows] = useState<Record<string, any>[]>([]);

  // Excel / CSV State
  const [spreadsheetResult, setSpreadsheetResult] = useState<SpreadsheetParsedResult | null>(null);
  const [sheetMapping, setSheetMapping] = useState<ColumnMapping>({
    nameCol: '',
    phoneCol: '',
    debitCol: '',
    creditCol: '',
    balanceCol: '',
    notesCol: ''
  });

  // PDF State
  const [pdfRecords, setPdfRecords] = useState<ExtractedPdfRecord[]>([]);
  const [pdfRawText, setPdfRawText] = useState<string>('');
  const [selectedPdfIndexes, setSelectedPdfIndexes] = useState<number[]>([]);

  // Manual Customer State
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualDebit, setManualDebit] = useState<number | ''>('');
  const [manualCredit, setManualCredit] = useState<number | ''>('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualCategory, setManualCategory] = useState('عميل عام');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1. Handle SQLite File Upload
  const handleSqliteFile = async (file: File) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const buffer = await file.arrayBuffer();
      const result = await parseSqliteBuffer(buffer);
      setSqliteResult(result);

      if (result.tables.length === 0) {
        setErrorMsg('لم يتم العثور على أي جداول في قاعدة البيانات المرفقة.');
        return;
      }

      const tableToSelect = result.recommendedTable || result.tables[0].name;
      setSelectedDbTable(tableToSelect);

      // Load rows for this table
      loadTableRows(result, tableToSelect);

      if (result.recommendedMapping) {
        setDbMapping({
          nameCol: result.recommendedMapping.nameCol || '',
          phoneCol: result.recommendedMapping.phoneCol || '',
          debitCol: result.recommendedMapping.debitCol || '',
          creditCol: result.recommendedMapping.creditCol || '',
          balanceCol: result.recommendedMapping.balanceCol || '',
          notesCol: result.recommendedMapping.notesCol || ''
        });
      }
      setSuccessMsg(`تم فتح قاعدة البيانات بنجاح! تم العثور على ${result.tables.length} جدول.`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`خطأ أثناء قراءة قاعدة البيانات: ${err?.message || 'ملف غير صالح'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTableRows = (parsed: ParsedDbResult, tableName: string) => {
    try {
      const rowsRes = parsed.db.exec(`SELECT * FROM "${tableName}" LIMIT 50;`);
      if (rowsRes.length > 0) {
        const columns = rowsRes[0].columns;
        const mapped = rowsRes[0].values.map((val) => {
          const rowObj: Record<string, any> = {};
          columns.forEach((col, i) => {
            rowObj[col] = val[i];
          });
          return rowObj;
        });
        setDbTableRows(mapped);
      } else {
        setDbTableRows([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTableChange = (newTable: string) => {
    setSelectedDbTable(newTable);
    if (sqliteResult) {
      loadTableRows(sqliteResult, newTable);
      const tableInfo = sqliteResult.tables.find((t) => t.name === newTable);
      if (tableInfo) {
        const auto = {
          nameCol: tableInfo.columns.find((c) => /اسم|name/i.test(c)) || '',
          phoneCol: tableInfo.columns.find((c) => /هاتف|جوال|phone|mobile/i.test(c)) || '',
          debitCol: tableInfo.columns.find((c) => /عليه|مدين|debit/i.test(c)) || '',
          creditCol: tableInfo.columns.find((c) => /له|دائن|credit/i.test(c)) || '',
          balanceCol: tableInfo.columns.find((c) => /رصيد|balance/i.test(c)) || '',
          notesCol: tableInfo.columns.find((c) => /ملاحظ|note/i.test(c)) || ''
        };
        setDbMapping(auto);
      }
    }
  };

  // Test Sample SQLite Database
  const handleLoadDemoSqlite = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const sampleBuffer = await createSampleSqliteDatabase();
      const result = await parseSqliteBuffer(sampleBuffer.buffer as ArrayBuffer);
      setSqliteResult(result);
      const tableToSelect = result.recommendedTable || 'customers';
      setSelectedDbTable(tableToSelect);
      loadTableRows(result, tableToSelect);
      if (result.recommendedMapping) {
        setDbMapping({
          nameCol: result.recommendedMapping.nameCol || 'name',
          phoneCol: result.recommendedMapping.phoneCol || 'phone',
          debitCol: result.recommendedMapping.debitCol || 'debit',
          creditCol: result.recommendedMapping.creditCol || 'credit',
          balanceCol: result.recommendedMapping.balanceCol || 'balance',
          notesCol: result.recommendedMapping.notesCol || 'notes'
        });
      }
      setSuccessMsg('تم تحميل قاعدة البيانات التجريبية بنجاح! يمكنك الآن استيرادها.');
    } catch (e: any) {
      setErrorMsg(`تعذر تحميل النموذج التجريبي: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Download sample .db file for Adel
  const handleDownloadSampleDb = async () => {
    try {
      const buffer = await createSampleSqliteDatabase();
      const blob = new Blob([buffer as any], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'قاعدة_بيانات_حسابات_تجريبية.db';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  // 2. Handle Excel / CSV File Upload
  const handleSpreadsheetFile = async (file: File) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseSpreadsheetBuffer(buffer);
      setSpreadsheetResult(parsed);

      if (parsed.recommendedMapping) {
        setSheetMapping({
          nameCol: parsed.recommendedMapping.nameCol || '',
          phoneCol: parsed.recommendedMapping.phoneCol || '',
          debitCol: parsed.recommendedMapping.debitCol || '',
          creditCol: parsed.recommendedMapping.creditCol || '',
          balanceCol: parsed.recommendedMapping.balanceCol || '',
          notesCol: parsed.recommendedMapping.notesCol || ''
        });
      }
      setSuccessMsg(`تم تحميل الملف بنجاح! يحتوي على ${parsed.rows.length} صف.`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`خطأ أثناء قراءة الملف: ${err?.message || 'تأكد من صيغة الملف'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handle PDF File Upload
  const handlePdfFile = async (file: File) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = await parsePdfBuffer(buffer);
      setPdfRawText(parsed.rawText);
      setPdfRecords(parsed.extractedRecords);
      setSelectedPdfIndexes(parsed.extractedRecords.map((_, i) => i));

      if (parsed.extractedRecords.length > 0) {
        setSuccessMsg(`تم استخراج ${parsed.extractedRecords.length} حساب عميل من ملف PDF بنجاح!`);
      } else {
        setErrorMsg('تمت قراءة ملف PDF بنجاح، ولكن لم يتم التعرف تلقائياً على جداول ديون العملاء. يرجى مراجعة النص المستخرج أو تجربة ملف Excel/DB.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`خطأ أثناء قراءة ملف PDF: ${err?.message || 'ملف غير صالح'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Commit SQLite Import
  const handleCommitSqliteImport = () => {
    if (!sqliteResult || !selectedDbTable) return;
    if (!dbMapping.nameCol) {
      setErrorMsg('يرجى تحديد عمود [اسم العميل] على الأقل.');
      return;
    }

    try {
      const fullRes = sqliteResult.db.exec(`SELECT * FROM "${selectedDbTable}";`);
      if (fullRes.length === 0) {
        setErrorMsg('الجدول المختار فارغ.');
        return;
      }

      const columns = fullRes[0].columns;
      const allRows = fullRes[0].values.map((val) => {
        const rowObj: Record<string, any> = {};
        columns.forEach((col, i) => {
          rowObj[col] = val[i];
        });
        return rowObj;
      });

      const newCustomers = mapRowsToCustomers(allRows, dbMapping, 'مستورد من DB');
      if (newCustomers.length === 0) {
        setErrorMsg('لم يتم العثور على أي صفوف صالحة للاستيراد.');
        return;
      }

      importCustomers(newCustomers, importMode);
      onClose();
    } catch (err: any) {
      setErrorMsg(`خطأ أثناء الاستيراد: ${err.message}`);
    }
  };

  // Commit Excel / CSV Import
  const handleCommitSpreadsheetImport = () => {
    if (!spreadsheetResult) return;
    if (!sheetMapping.nameCol) {
      setErrorMsg('يرجى تحديد عمود [اسم العميل] على الأقل.');
      return;
    }

    try {
      const newCustomers = mapRowsToCustomers(spreadsheetResult.rows, sheetMapping, 'مستورد من Excel/CSV');
      if (newCustomers.length === 0) {
        setErrorMsg('لم يتم العثور على صفوف صالحة للاستيراد.');
        return;
      }

      importCustomers(newCustomers, importMode);
      onClose();
    } catch (err: any) {
      setErrorMsg(`خطأ أثناء الاستيراد: ${err.message}`);
    }
  };

  // Commit PDF Import
  const handleCommitPdfImport = () => {
    const selected = pdfRecords.filter((_, idx) => selectedPdfIndexes.includes(idx));
    if (selected.length === 0) {
      setErrorMsg('يرجى تحديد عميل واحد على الأقل للاستيراد.');
      return;
    }

    const now = new Date().toISOString();
    const newCustomers: Customer[] = selected.map((rec, i) => ({
      id: `cust_pdf_${Date.now()}_${i}`,
      name: rec.name,
      phone: rec.phone,
      debit: rec.debit,
      credit: rec.credit,
      balance: rec.balance,
      notes: rec.notes,
      category: 'مستورد من PDF',
      accountNumber: `PDF-${i + 101}`,
      status: 'unnotified',
      lastSentAt: null,
      lastSentChannel: null,
      transactions: rec.debit > 0 ? [
        {
          id: `tx_pdf_${Date.now()}_${i}`,
          date: now.split('T')[0],
          type: 'debit',
          amount: rec.debit,
          note: 'رصيد افتتاحي من كشف PDF'
        }
      ] : [],
      createdAt: now,
      updatedAt: now
    }));

    importCustomers(newCustomers, importMode);
    onClose();
  };

  // Commit Manual Customer
  const handleCommitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) {
      setErrorMsg('اسم العميل مطلوب.');
      return;
    }

    const debit = Number(manualDebit) || 0;
    const credit = Number(manualCredit) || 0;

    addCustomer({
      name: manualName.trim(),
      phone: manualPhone.trim(),
      debit,
      credit,
      balance: debit - credit,
      notes: manualNotes.trim(),
      category: manualCategory,
      accountNumber: `ACC-${Math.floor(100 + Math.random() * 900)}`,
      status: 'unnotified',
      lastSentAt: null,
      lastSentChannel: null
    });

    onClose();
  };

  // Helper Downloads
  const downloadSampleExcel = () => {
    const buffer = generateSampleExcelWorkbook();
    const blob = new Blob([buffer as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'نموذج_ديون_العملاء.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSampleCsv = () => {
    const csvContent = generateSampleCsvString();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'نموذج_ديون_العملاء.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">استيراد بيانات العملاء والديون</h2>
              <p className="text-xs text-slate-500">
                يدعم ملفات قواعد بيانات الهاتف (.db) وجداول Excel وCSV وكشوفات PDF
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-100/60 px-4 overflow-x-auto gap-2 py-2">
          <button
            onClick={() => { setActiveTab('db'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'db'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-600" />
            <span>قاعدة بيانات SQLite (.db)</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold">
              تطبيق الهاتف
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('excel'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'excel'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>Excel (XLSX / XLS)</span>
          </button>

          <button
            onClick={() => { setActiveTab('csv'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'csv'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-600" />
            <span>ملف CSV</span>
          </button>

          <button
            onClick={() => { setActiveTab('pdf'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'pdf'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>كشف حساب PDF</span>
          </button>

          <button
            onClick={() => { setActiveTab('manual'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'manual'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <UserPlus className="w-4 h-4 text-purple-600" />
            <span>إدخال يدوي</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <div>{successMsg}</div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 1: SQLite Database (.db) */}
          {/* ============================================================ */}
          {activeTab === 'db' && (
            <div className="space-y-5">
              {/* Instructions Banner for Adel */}
              <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200/80">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div className="text-xs space-y-1 text-slate-700 leading-relaxed">
                    <p className="font-bold text-emerald-900">
                      طريقة استيراد ملف قاعدة البيانات (.db) من هاتفك (مجلد حسابات 2):
                    </p>
                    <p>
                      1. اسحب ملف الـ <strong className="font-mono text-emerald-800">.db</strong> وأفلته في المربع أدناه، أو اضغط لتحديده.
                    </p>
                    <p>
                      2. سيقوم النظام فوراً بفحص جميع الجداول واستخراج أسماء العملاء، أرقام الهواتف، والمبالغ (عليه / له) تلقائياً!
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 sm:p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/20 transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".db,.sqlite,.sqlite3,.db3"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSqliteFile(file);
                  }}
                />
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Database className="w-7 h-7" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-1">
                  اضغط لاختيار ملف قاعدة البيانات (.db) أو اسحبه هنا
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  يدعم قواعد بيانات SQLite للهواتف وتطبيقات المحاسبة (مثل مجلد «حسابات 2»)
                </p>

                {/* Instant Actions */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-200/70">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadDemoSqlite();
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50 flex items-center gap-1.5 shadow-2xs"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تجربة قاعدة بيانات تجريبية فوراً</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadSampleDb();
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>تحميل نموذج .db للهاتف</span>
                  </button>
                </div>
              </div>

              {/* Table & Column Mapping Configuration (When loaded) */}
              {sqliteResult && sqliteResult.tables.length > 0 && (
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">اختر الجدول:</span>
                      <select
                        value={selectedDbTable}
                        onChange={(e) => handleTableChange(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {sqliteResult.tables.map((tbl) => (
                          <option key={tbl.name} value={tbl.name}>
                            {tbl.name} ({tbl.rowCount} سجل)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-600 font-medium">طريقة الاستيراد:</span>
                      <label className="inline-flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'merge'}
                          onChange={() => setImportMode('merge')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>دمج مع الحالي</span>
                      </label>
                      <label className="inline-flex items-center gap-1 cursor-pointer mr-2">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-rose-600">استبدال الكل</span>
                      </label>
                    </div>
                  </div>

                  {/* Column Matcher Grid */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2.5">
                      تطابق أعمدة الجدول مع بيانات العميل:
                    </h4>
                    {(() => {
                      const currentTbl = sqliteResult.tables.find((t) => t.name === selectedDbTable);
                      const cols = currentTbl?.columns || [];

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              اسم العميل <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={dbMapping.nameCol}
                              onChange={(e) => setDbMapping({ ...dbMapping, nameCol: e.target.value })}
                              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium"
                            >
                              <option value="">-- اختر العمود --</option>
                              {cols.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              رقم الهاتف / الجوال
                            </label>
                            <select
                              value={dbMapping.phoneCol}
                              onChange={(e) => setDbMapping({ ...dbMapping, phoneCol: e.target.value })}
                              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium"
                            >
                              <option value="">-- اختر العمود --</option>
                              {cols.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              المبلغ الذي عليه (مدين)
                            </label>
                            <select
                              value={dbMapping.debitCol}
                              onChange={(e) => setDbMapping({ ...dbMapping, debitCol: e.target.value })}
                              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium"
                            >
                              <option value="">-- اختر العمود --</option>
                              {cols.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              المبلغ الذي له (دائن)
                            </label>
                            <select
                              value={dbMapping.creditCol}
                              onChange={(e) => setDbMapping({ ...dbMapping, creditCol: e.target.value })}
                              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium"
                            >
                              <option value="">-- اختر العمود --</option>
                              {cols.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              الرصيد الإجمالي / المتبقي
                            </label>
                            <select
                              value={dbMapping.balanceCol}
                              onChange={(e) => setDbMapping({ ...dbMapping, balanceCol: e.target.value })}
                              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium"
                            >
                              <option value="">-- اختر العمود --</option>
                              {cols.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              ملاحظات أو بيان
                            </label>
                            <select
                              value={dbMapping.notesCol}
                              onChange={(e) => setDbMapping({ ...dbMapping, notesCol: e.target.value })}
                              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium"
                            >
                              <option value="">-- اختر العمود --</option>
                              {cols.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Data Preview Table */}
                  {dbTableRows.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          معاينة بيانات الجدول (أول 5 صفوف):
                        </span>
                        <span className="text-[11px] text-slate-500">
                          إجمالي صفوف الجدول: {dbTableRows.length}
                        </span>
                      </div>
                      <div className="overflow-x-auto max-h-48 border border-slate-200 rounded-xl bg-white">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                            <tr>
                              <th className="p-2 border-b">الاسم</th>
                              <th className="p-2 border-b">الهاتف</th>
                              <th className="p-2 border-b">عليه</th>
                              <th className="p-2 border-b">له</th>
                              <th className="p-2 border-b">الرصيد</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {dbTableRows.slice(0, 5).map((row, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="p-2 font-medium">{dbMapping.nameCol ? row[dbMapping.nameCol] : '-'}</td>
                                <td className="p-2 text-slate-600">{dbMapping.phoneCol ? row[dbMapping.phoneCol] : '-'}</td>
                                <td className="p-2 text-rose-600 font-bold">{dbMapping.debitCol ? row[dbMapping.debitCol] : '-'}</td>
                                <td className="p-2 text-emerald-600 font-bold">{dbMapping.creditCol ? row[dbMapping.creditCol] : '-'}</td>
                                <td className="p-2 font-bold font-mono-num">{dbMapping.balanceCol ? row[dbMapping.balanceCol] : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Final Import Button */}
                  <div className="pt-3 flex justify-end">
                    <button
                      onClick={handleCommitSqliteImport}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تأكيد استيراد عملاء قاعدة البيانات</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: Excel (XLSX / XLS) */}
          {/* ============================================================ */}
          {activeTab === 'excel' && (
            <div className="space-y-5">
              <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-200/80 flex items-start justify-between gap-3">
                <div className="text-xs space-y-1 text-slate-700">
                  <p className="font-bold text-blue-900">استيراد من جداول Excel (.xlsx, .xls):</p>
                  <p>يدعم جميع ملفات جداول البيانات العربية مع التعرف التلقائي على الأعمدة.</p>
                </div>
                <button
                  onClick={downloadSampleExcel}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-blue-700 border border-blue-300 hover:bg-blue-50 flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>تحميل نموذج Excel جاهز</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 sm:p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSpreadsheetFile(file);
                  }}
                />
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-100/70 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-1">
                  اضغط لاختيار ملف Excel (.xlsx أو .xls) أو اسحبه هنا
                </h3>
                <p className="text-xs text-slate-500">
                  يتم استخراج أرقام الهواتف والديون والرصيد تلقائياً
                </p>
              </div>

              {/* Excel Preview & Mapping */}
              {spreadsheetResult && (
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-700">
                      الصفحة: {spreadsheetResult.currentSheet} ({spreadsheetResult.rows.length} صف)
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <label className="inline-flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="excelMode"
                          checked={importMode === 'merge'}
                          onChange={() => setImportMode('merge')}
                          className="text-emerald-600"
                        />
                        <span>دمج</span>
                      </label>
                      <label className="inline-flex items-center gap-1 cursor-pointer mr-2">
                        <input
                          type="radio"
                          name="excelMode"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="text-emerald-600"
                        />
                        <span className="text-rose-600">استبدال</span>
                      </label>
                    </div>
                  </div>

                  {/* Mapping Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">اسم العميل *</label>
                      <select
                        value={sheetMapping.nameCol}
                        onChange={(e) => setSheetMapping({ ...sheetMapping, nameCol: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                      >
                        <option value="">-- اختر العمود --</option>
                        {spreadsheetResult.headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">رقم الهاتف</label>
                      <select
                        value={sheetMapping.phoneCol}
                        onChange={(e) => setSheetMapping({ ...sheetMapping, phoneCol: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                      >
                        <option value="">-- اختر العمود --</option>
                        {spreadsheetResult.headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">الرصيد / المبلغ المستحق</label>
                      <select
                        value={sheetMapping.balanceCol || sheetMapping.debitCol}
                        onChange={(e) => setSheetMapping({ ...sheetMapping, balanceCol: e.target.value, debitCol: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                      >
                        <option value="">-- اختر العمود --</option>
                        {spreadsheetResult.headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      onClick={handleCommitSpreadsheetImport}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تأكيد استيراد ملف Excel</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: CSV */}
          {/* ============================================================ */}
          {activeTab === 'csv' && (
            <div className="space-y-5">
              <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/80 flex items-start justify-between gap-3">
                <div className="text-xs space-y-1 text-slate-700">
                  <p className="font-bold text-amber-900">استيراد من ملف CSV:</p>
                  <p>يدعم ملفات القيم المفصولة بفواصل مع دعم كامل للغة العربية UTF-8.</p>
                </div>
                <button
                  onClick={downloadSampleCsv}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-amber-700 border border-amber-300 hover:bg-amber-50 flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-amber-600" />
                  <span>تحميل نموذج CSV جاهز</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-6 sm:p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-amber-50/20 transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSpreadsheetFile(file);
                  }}
                />
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-100/70 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-1">
                  اضغط لاختيار ملف CSV أو اسحبه هنا
                </h3>
                <p className="text-xs text-slate-500">
                  متوافق مع تصدير برامج المحاسبة المختلفة
                </p>
              </div>

              {/* CSV Preview & Mapping */}
              {spreadsheetResult && (
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">اسم العميل *</label>
                      <select
                        value={sheetMapping.nameCol}
                        onChange={(e) => setSheetMapping({ ...sheetMapping, nameCol: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                      >
                        <option value="">-- اختر العمود --</option>
                        {spreadsheetResult.headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">رقم الهاتف</label>
                      <select
                        value={sheetMapping.phoneCol}
                        onChange={(e) => setSheetMapping({ ...sheetMapping, phoneCol: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                      >
                        <option value="">-- اختر العمود --</option>
                        {spreadsheetResult.headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">الرصيد المستحق</label>
                      <select
                        value={sheetMapping.balanceCol || sheetMapping.debitCol}
                        onChange={(e) => setSheetMapping({ ...sheetMapping, balanceCol: e.target.value, debitCol: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                      >
                        <option value="">-- اختر العمود --</option>
                        {spreadsheetResult.headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      onClick={handleCommitSpreadsheetImport}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تأكيد استيراد ملف CSV</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: PDF */}
          {/* ============================================================ */}
          {activeTab === 'pdf' && (
            <div className="space-y-5">
              <div className="bg-rose-50/60 rounded-2xl p-4 border border-rose-200/80">
                <p className="text-xs text-rose-900 leading-relaxed font-medium">
                  <strong>ملاحظة هامة حول ملفات PDF:</strong> يستخرج النظام بيانات العملاء وأرقام الهواتف والمبالغ تلقائياً من كشوفات الحساب النصية. إذا كان ملف PDF عبارة عن صور ممسوحة ضوئياً، قد يتطلب الأمر تحويله إلى جدول أو تصديره إلى Excel للحصول على أعلى دقة.
                </p>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-rose-500 rounded-2xl p-6 sm:p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-rose-50/20 transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePdfFile(file);
                  }}
                />
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-rose-100/70 text-rose-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-1">
                  اضغط لاختيار كشف حساب PDF أو اسحبه هنا
                </h3>
                <p className="text-xs text-slate-500">
                  استخراج ذكي لأسماء العملاء والمبالغ من الكشوفات والتقارير
                </p>
              </div>

              {/* PDF Extracted Table */}
              {pdfRecords.length > 0 && (
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      تم استخراج {pdfRecords.length} سجل من ملف PDF:
                    </span>
                    <button
                      onClick={() => {
                        if (selectedPdfIndexes.length === pdfRecords.length) {
                          setSelectedPdfIndexes([]);
                        } else {
                          setSelectedPdfIndexes(pdfRecords.map((_, i) => i));
                        }
                      }}
                      className="text-xs font-bold text-rose-600 hover:underline"
                    >
                      {selectedPdfIndexes.length === pdfRecords.length ? 'إلغاء تحديد الكل' : 'تحديد جميع المستخرجين'}
                    </button>
                  </div>

                  <div className="overflow-x-auto max-h-56 border border-slate-200 rounded-xl bg-white">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                        <tr>
                          <th className="p-2 border-b w-8">#</th>
                          <th className="p-2 border-b">اسم العميل</th>
                          <th className="p-2 border-b">الهاتف</th>
                          <th className="p-2 border-b">عليه (مدين)</th>
                          <th className="p-2 border-b">له (دائن)</th>
                          <th className="p-2 border-b">الرصيد المستحق</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pdfRecords.map((rec, i) => (
                          <tr
                            key={i}
                            className={`cursor-pointer transition-colors ${
                              selectedPdfIndexes.includes(i) ? 'bg-rose-50/50' : 'hover:bg-slate-50'
                            }`}
                            onClick={() => {
                              setSelectedPdfIndexes((prev) =>
                                prev.includes(i) ? prev.filter((idx) => idx !== i) : [...prev, i]
                              );
                            }}
                          >
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={selectedPdfIndexes.includes(i)}
                                onChange={() => {}}
                                className="rounded text-rose-600"
                              />
                            </td>
                            <td className="p-2 font-medium">{rec.name}</td>
                            <td className="p-2 text-slate-600">{rec.phone || 'غير متوفر'}</td>
                            <td className="p-2 text-rose-600 font-bold">{rec.debit ? rec.debit.toLocaleString('ar-EG') : 0}</td>
                            <td className="p-2 text-emerald-600 font-bold">{rec.credit ? rec.credit.toLocaleString('ar-EG') : 0}</td>
                            <td className="p-2 font-black font-mono-num">{rec.balance.toLocaleString('ar-EG')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      onClick={handleCommitPdfImport}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تأكيد استيراد السجلات المحددة ({selectedPdfIndexes.length})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 5: Manual Customer */}
          {/* ============================================================ */}
          {activeTab === 'manual' && (
            <form onSubmit={handleCommitManual} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    اسم العميل الكامل <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="مثال: عادل حزام"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    رقم الهاتف / الجوال
                  </label>
                  <input
                    type="tel"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="مثال: 777123456"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-left font-mono-num"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    المبلغ الذي عليه (مدين) - {settings.currency}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={manualDebit}
                    onChange={(e) => setManualDebit(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-left font-mono-num font-bold text-rose-600"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    المبلغ الذي له (دائن / مدفوع مسبقاً) - {settings.currency}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={manualCredit}
                    onChange={(e) => setManualCredit(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-left font-mono-num font-bold text-emerald-600"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    تصنيف العميل
                  </label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="عميل عام">عميل عام</option>
                    <option value="عميل مميز">عميل مميز</option>
                    <option value="عميل جملة">عميل جملة</option>
                    <option value="عميل آجل">عميل آجل</option>
                    <option value="تاجر تجزئة">تاجر تجزئة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ملاحظات أو بيان
                  </label>
                  <input
                    type="text"
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    placeholder="مثال: فاتورة توريد رقم 5"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Net Balance Preview */}
              <div className="p-3.5 rounded-xl bg-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">صافي الرصيد المحسوب:</span>
                <span className="font-black text-sm font-mono-num">
                  {((Number(manualDebit) || 0) - (Number(manualCredit) || 0)).toLocaleString('ar-EG')}{' '}
                  {settings.currency}
                </span>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>حفظ وإضافة العميل</span>
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
