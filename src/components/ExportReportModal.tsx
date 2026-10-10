import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  FileText,
  Download,
  Store,
  Calendar,
  CheckCircle2,
  Users,
  ShieldCheck,
  Phone,
  Filter
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Customer } from '../types';
import { exportCustomersToExcel } from '../utils/spreadsheetParser';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultScope?: 'debtors' | 'all' | 'selected';
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  defaultScope = 'debtors'
}) => {
  const { customers, selectedCustomerIds, settings } = useApp();

  const [scope, setScope] = useState<'debtors' | 'all' | 'selected'>(() => {
    if (defaultScope === 'selected' && selectedCustomerIds.length > 0) return 'selected';
    return defaultScope;
  });

  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeAccountNumber, setIncludeAccountNumber] = useState(true);

  // Compute filtered list based on scope
  const targetCustomers = useMemo(() => {
    switch (scope) {
      case 'debtors':
        return customers.filter((c) => c.balance > 0);
      case 'selected':
        return customers.filter((c) => selectedCustomerIds.includes(c.id));
      case 'all':
      default:
        return customers;
    }
  }, [customers, scope, selectedCustomerIds]);

  // Totals
  const totalDebit = useMemo(() => targetCustomers.reduce((sum, c) => sum + (c.debit || 0), 0), [targetCustomers]);
  const totalCredit = useMemo(() => targetCustomers.reduce((sum, c) => sum + (c.credit || 0), 0), [targetCustomers]);
  const totalNetBalance = useMemo(() => targetCustomers.reduce((sum, c) => sum + (c.balance || 0), 0), [targetCustomers]);

  if (!isOpen) return null;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    const scopeLabel = scope === 'debtors' ? 'المدينين' : scope === 'selected' ? 'المحددين' : 'الشامل';
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `كشف_ديون_العملاء_${scopeLabel}_${dateStr}.xlsx`;
    exportCustomersToExcel(targetCustomers, fileName, settings.storeName, settings.currency);
  };

  // CSV Export Handler
  const handleExportCsv = () => {
    const scopeLabel = scope === 'debtors' ? 'المدينين' : scope === 'selected' ? 'المحددين' : 'الشامل';
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `كشف_ديون_العملاء_${scopeLabel}_${dateStr}.csv`;

    const headers = [
      'م',
      'رقم الحساب',
      'اسم العميل',
      'رقم الهاتف',
      'المبلغ عليه (مدين)',
      'المبلغ له (دائن)',
      'الرصيد المستحق',
      'أولوية التحصيل (AI)',
      'عمر الدين (أيام)',
      'حالة الإشعار',
      'ملاحظات'
    ];

    const rows = targetCustomers.map((c, i) => {
      const urgencyLabel = c.urgencyLevel === 'critical'
        ? 'حرج جداً'
        : c.urgencyLevel === 'high'
        ? 'أولوية عالية'
        : c.urgencyLevel === 'medium'
        ? 'أولوية متوسطة'
        : c.urgencyLevel === 'low'
        ? 'أولوية منخفضة'
        : '-';

      return [
        i + 1,
        `"${c.accountNumber || ''}"`,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.phone || ''}"`,
        c.debit,
        c.credit,
        c.balance,
        `"${urgencyLabel}"`,
        c.urgencyDebtDurationDays || (c.balance > 0 ? '' : '-'),
        `"${c.status === 'sent' ? 'تم الإرسال' : 'لم يُرسل'}"`,
        `"${(c.notes || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    // Totals line
    rows.push([
      'الإجمالي العام',
      `"عدد العملاء: ${targetCustomers.length}"`,
      `"${settings.storeName}"`,
      '',
      totalDebit,
      totalCredit,
      totalNetBalance,
      '',
      `"تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}"`
    ].join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Modal Top Header (Hidden on print) */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Printer className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                تصدير وطباعة كشف ديون العملاء للأرشفة الورقية
              </h2>
              <p className="text-xs text-slate-500">
                جاهز للطباعة على ورق A4 أو الحفظ بصيغة PDF وجداول Excel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action & Scope Bar (Hidden on print) */}
        <div className="p-4 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 no-print text-xs">
          
          {/* Scope Selector */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              نطاق التقرير:
            </span>
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-300">
              <button
                type="button"
                onClick={() => setScope('debtors')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  scope === 'debtors'
                    ? 'bg-rose-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                المدينون فقط ({customers.filter((c) => c.balance > 0).length})
              </button>

              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  scope === 'all'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                جميع العملاء ({customers.length})
              </button>

              {selectedCustomerIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setScope('selected')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    scope === 'selected'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  المحددون فقط ({selectedCustomerIds.length})
                </button>
              )}
            </div>
          </div>

          {/* Options checkboxes */}
          <div className="flex items-center gap-4 text-slate-700 font-medium">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>تضمين قسم التوقيعات والختم للأرشفة</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeNotes}
                onChange={(e) => setIncludeNotes(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>إظهار الملاحظات</span>
            </label>
          </div>

          {/* Export & Print Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Primary Print / Save to PDF Button */}
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة فورية / حفظ كـ PDF 🖨️</span>
            </button>

            {/* Excel Export Button */}
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl font-bold bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-300 shadow-2xs flex items-center gap-1.5 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>تصدير Excel (.xlsx)</span>
            </button>

            {/* CSV Export Button */}
            <button
              onClick={handleExportCsv}
              className="p-2 sm:px-3 sm:py-2 rounded-xl font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs flex items-center gap-1.5 transition-all"
              title="تصدير ملف CSV"
            >
              <FileText className="w-4 h-4 text-slate-600" />
              <span className="hidden md:inline">CSV</span>
            </button>
          </div>

        </div>

        {/* Printable Document Preview Area */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white printable-area">
          
          {/* Printable Report Header */}
          <div className="border-b-2 border-slate-900 pb-5 mb-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold mb-1">
                  <Store className="w-4 h-4 text-emerald-600" />
                  <span>{settings.storeName || 'مركز الحسابات والخدمات'}</span>
                  {settings.storePhone && (
                    <span>• هاتف: <span dir="ltr" className="font-mono-num">{settings.storePhone}</span></span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  كشف مديونية العملاء والحسابات المالية
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  تقرير رسمي مستخرج من نظام متابعة ديون العملاء وإرسال الرسائل SMS
                </p>
              </div>

              {/* Date & Meta Stamp */}
              <div className="text-left text-xs text-slate-600 space-y-1">
                <div>
                  <strong>تاريخ الطباعة:</strong>{' '}
                  <span className="font-mono-num">{new Date().toLocaleDateString('ar-EG')}</span>
                </div>
                <div>
                  <strong>وقت الاستخراج:</strong>{' '}
                  <span className="font-mono-num">{new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div>
                  <strong>العملة الأساسية:</strong> {settings.currency}
                </div>
                <div>
                  <strong>حالة الكشف:</strong>{' '}
                  <span className="font-bold text-slate-900">
                    {scope === 'debtors' ? 'العملاء المدينون فقط' : scope === 'selected' ? 'العملاء المحددون' : 'كافة الحسابات'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Header Row */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-200 text-center">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                <span className="text-[10px] text-slate-500 block">إجمالي العملاء المدرجين</span>
                <span className="text-base font-black text-slate-900 font-mono-num">{targetCustomers.length} عميل</span>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-2">
                <span className="text-[10px] text-rose-700 block">إجمالي ما عليهم (مدين)</span>
                <span className="text-base font-black text-rose-600 font-mono-num">{totalDebit.toLocaleString('ar-EG')}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2">
                <span className="text-[10px] text-emerald-700 block">إجمالي ما لهم (دائن/سداد)</span>
                <span className="text-base font-black text-emerald-600 font-mono-num">{totalCredit.toLocaleString('ar-EG')}</span>
              </div>
              <div className="bg-slate-900 text-white rounded-xl p-2">
                <span className="text-[10px] text-slate-300 block">صافي الديون المستحقة</span>
                <span className="text-base font-black text-amber-400 font-mono-num">{totalNetBalance.toLocaleString('ar-EG')} {settings.currency}</span>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                <tr>
                  <th className="p-2.5 border-l border-slate-200 w-8 text-center">م</th>
                  {includeAccountNumber && (
                    <th className="p-2.5 border-l border-slate-200 w-24">رقم الحساب</th>
                  )}
                  <th className="p-2.5 border-l border-slate-200">اسم العميل</th>
                  <th className="p-2.5 border-l border-slate-200">رقم الهاتف</th>
                  <th className="p-2.5 border-l border-slate-200 text-rose-700 text-center">المبلغ عليه (مدين)</th>
                  <th className="p-2.5 border-l border-slate-200 text-emerald-700 text-center">المبلغ له (دائن)</th>
                  <th className="p-2.5 border-l border-slate-200 text-center">صافي الرصيد المستحق</th>
                  <th className="p-2.5 border-l border-slate-200 text-center">أولوية التحصيل (AI)</th>
                  <th className="p-2.5 border-l border-slate-200 text-center">حالة الإشعار</th>
                  {includeNotes && <th className="p-2.5">ملاحظات / بيان</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {targetCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                      لا يوجد عملاء في النطاق المحدد حالياً.
                    </td>
                  </tr>
                ) : (
                  targetCustomers.map((cust, idx) => {
                    const isDebtor = cust.balance > 0;
                    const isCreditor = cust.balance < 0;

                    return (
                      <tr key={cust.id} className="hover:bg-slate-50">
                        <td className="p-2 border-l border-slate-200 text-center font-mono-num text-slate-500">
                          {idx + 1}
                        </td>
                        {includeAccountNumber && (
                          <td className="p-2 border-l border-slate-200 font-mono-num text-slate-600">
                            {cust.accountNumber || '-'}
                          </td>
                        )}
                        <td className="p-2 border-l border-slate-200 font-bold text-slate-900">
                          {cust.name}
                        </td>
                        <td className="p-2 border-l border-slate-200 font-mono-num text-slate-700" dir="ltr">
                          {cust.phone || '-'}
                        </td>
                        <td className="p-2 border-l border-slate-200 text-center font-bold text-rose-600 font-mono-num">
                          {cust.debit.toLocaleString('ar-EG')}
                        </td>
                        <td className="p-2 border-l border-slate-200 text-center font-bold text-emerald-600 font-mono-num">
                          {cust.credit.toLocaleString('ar-EG')}
                        </td>
                        <td className="p-2 border-l border-slate-200 text-center font-black font-mono-num">
                          {isDebtor ? (
                            <span className="text-rose-700">{cust.balance.toLocaleString('ar-EG')}</span>
                          ) : isCreditor ? (
                            <span className="text-emerald-700">له {Math.abs(cust.balance).toLocaleString('ar-EG')}</span>
                          ) : (
                            <span className="text-slate-500">0 (مسدد)</span>
                          )}
                        </td>
                        <td className="p-2 border-l border-slate-200 text-center text-[11px] font-bold">
                          {cust.urgencyLevel ? (
                            <span className={
                              cust.urgencyLevel === 'critical' ? 'text-rose-700' :
                              cust.urgencyLevel === 'high' ? 'text-amber-700' :
                              cust.urgencyLevel === 'medium' ? 'text-yellow-700' : 'text-emerald-700'
                            }>
                              {cust.urgencyLevel === 'critical' ? '🚨 حرج' :
                               cust.urgencyLevel === 'high' ? '⚠️ عالي' :
                               cust.urgencyLevel === 'medium' ? '🟡 متوسط' : '🟢 منخفض'}
                              {cust.urgencyDebtDurationDays ? ` (${cust.urgencyDebtDurationDays} يوم)` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>
                        <td className="p-2 border-l border-slate-200 text-center text-[11px]">
                          {cust.status === 'sent' ? (
                            <span className="text-emerald-700 font-semibold">تم الإرسال</span>
                          ) : cust.status === 'postponed' ? (
                            <span className="text-amber-700">مؤجل</span>
                          ) : (
                            <span className="text-slate-500">لم يُرسل</span>
                          )}
                        </td>
                        {includeNotes && (
                          <td className="p-2 text-slate-600 max-w-xs truncate">
                            {cust.notes || '-'}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* Grand Totals Footer Row */}
              <tfoot className="bg-slate-100 text-slate-900 font-black border-t-2 border-slate-400">
                <tr>
                  <td colSpan={includeAccountNumber ? 4 : 3} className="p-2.5 border-l border-slate-300 text-right">
                    الإجمالي العام ({targetCustomers.length} عميل)
                  </td>
                  <td className="p-2.5 border-l border-slate-300 text-center text-rose-700 font-mono-num text-sm">
                    {totalDebit.toLocaleString('ar-EG')}
                  </td>
                  <td className="p-2.5 border-l border-slate-300 text-center text-emerald-700 font-mono-num text-sm">
                    {totalCredit.toLocaleString('ar-EG')}
                  </td>
                  <td className="p-2.5 border-l border-slate-300 text-center font-black font-mono-num text-sm text-slate-950">
                    {totalNetBalance.toLocaleString('ar-EG')} {settings.currency}
                  </td>
                  <td colSpan={includeNotes ? 3 : 2} className="p-2.5 text-center text-[11px] text-slate-500 font-medium">
                    مجموع صافي المديونية
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Official Signatures & Seal Section for Paper Archiving */}
          {includeSignatures && (
            <div className="pt-6 border-t-2 border-dashed border-slate-300 mt-6">
              <div className="text-xs font-bold text-slate-700 mb-6">
                اعتماد وتوثيق الحسابات للأرشفة الورقية والمتابعة القانونية:
              </div>
              <div className="grid grid-cols-3 gap-6 text-center text-xs text-slate-700">
                <div className="border border-slate-300 rounded-xl p-4">
                  <span className="font-bold text-slate-900 block mb-12">المحاسب المسؤول:</span>
                  <div className="border-t border-slate-400 pt-1 text-slate-500 font-mono-num">
                    التوقيع والتاريخ: ........................
                  </div>
                </div>

                <div className="border border-slate-300 rounded-xl p-4">
                  <span className="font-bold text-slate-900 block mb-12">المدير العام / المفوض:</span>
                  <div className="border-t border-slate-400 pt-1 text-slate-500 font-mono-num">
                    التوقيع والاعتماد: ........................
                  </div>
                </div>

                <div className="border border-slate-300 rounded-xl p-4 flex flex-col justify-between">
                  <span className="font-bold text-slate-900 block">ختم المحل / المنشأة:</span>
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-400 mx-auto my-2 flex items-center justify-center text-[10px] text-slate-400">
                    مكان الختم
                  </div>
                  <div className="border-t border-slate-400 pt-1 text-slate-500 text-[10px]">
                    سري ومعتمد
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer (Hidden on print) */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between no-print">
          <span className="text-xs text-slate-500">
            ملاحظة: عند الضغط على زر <strong>طباعة فورية</strong>، يمكنك اختيار طابعتك الورقية أو اختيار <strong>«حفظ بتنسيق PDF»</strong>.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 transition-all"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
