import React, { useState } from 'react';
import {
  X,
  Printer,
  Send,
  MessageCircle,
  PlusCircle,
  Phone,
  Calendar,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Store,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Clock,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  CalendarClock,
  CheckSquare,
  Square
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Customer } from '../types';
import { createSmsUri, createWhatsAppUri, renderTemplate } from '../utils/smsHelper';
import { calculateDebtDuration, URGENCY_CONFIG } from '../utils/urgencyHelper';

interface CustomerDetailsModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenAddTransaction: (customer: Customer) => void;
  onOpenInstallmentPlan?: (customer: Customer) => void;
}

export const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  customer: customerProp,
  isOpen,
  onClose,
  onOpenAddTransaction,
  onOpenInstallmentPlan
}) => {
  const {
    customers,
    settings,
    templates,
    updateCustomerStatus,
    recordSendLog,
    runSingleCustomerAiAnalysis,
    isAnalyzingAi,
    toggleInstallmentItemPaid
  } = useApp();
  const [analyzingThisCustomer, setAnalyzingThisCustomer] = React.useState(false);

  if (!isOpen || !customerProp) return null;

  const customer = customers.find((c) => c.id === customerProp.id) || customerProp;

  const defaultTemplate = templates.find((t) => t.isDefault) || templates[0];

  const handleReanalyzeWithAi = async () => {
    setAnalyzingThisCustomer(true);
    try {
      await runSingleCustomerAiAnalysis(customer.id);
    } finally {
      setAnalyzingThisCustomer(false);
    }
  };

  const isDebtor = customer.balance > 0;
  const durationInfo = calculateDebtDuration(customer);
  const urgencyConfig = customer.urgencyLevel ? URGENCY_CONFIG[customer.urgencyLevel] : null;

  const handleSendSms = () => {
    if (!defaultTemplate) return;
    const msg = renderTemplate(defaultTemplate.content, customer, settings);
    const uri = createSmsUri(customer.phone, msg, settings.countryCode);
    updateCustomerStatus(customer.id, 'sent', 'sms');
    recordSendLog({
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      amount: customer.balance,
      messageText: msg,
      channel: 'sms',
      status: 'sent'
    });
    window.location.href = uri;
  };

  const handleSendWhatsApp = () => {
    if (!defaultTemplate) return;
    const msg = renderTemplate(defaultTemplate.content, customer, settings);
    const uri = createWhatsAppUri(customer.phone, msg, settings.countryCode);
    updateCustomerStatus(customer.id, 'sent', 'whatsapp');
    recordSendLog({
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      amount: customer.balance,
      messageText: msg,
      channel: 'whatsapp',
      status: 'sent'
    });
    const link = document.createElement('a');
    link.href = uri;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Controls (Hidden in print) */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">كشف حساب عميل</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              {customer.accountNumber || 'ACC'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>طباعة الكشف</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Statement Content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
          
          {/* Statement Header / Invoice Banner */}
          <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <Store className="w-4 h-4 text-emerald-600" />
                <span>{settings.storeName}</span>
                {settings.storePhone && (
                  <span>• هاتف: <span dir="ltr" className="font-mono-num">{settings.storePhone}</span></span>
                )}
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-1">{customer.name}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                {customer.phone && (
                  <span className="font-mono-num" dir="ltr">هاتف: {customer.phone}</span>
                )}
                {customer.category && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                    {customer.category}
                  </span>
                )}
                <span>تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}</span>
              </div>
            </div>

            {/* Quick Actions (no-print) */}
            <div className="flex items-center gap-2 no-print">
              <button
                onClick={handleSendSms}
                disabled={!customer.phone}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال SMS</span>
              </button>

              <button
                onClick={handleSendWhatsApp}
                disabled={!customer.phone}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-40"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>واتساب</span>
              </button>

              {isDebtor && onOpenInstallmentPlan && (
                <button
                  onClick={() => onOpenInstallmentPlan(customer)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  title="اقتراح خطة تقسيط مجدولة بالذكاء الاصطناعي"
                >
                  <CalendarClock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>خطط التقسيط</span>
                </button>
              )}

              <button
                onClick={() => {
                  onClose();
                  onOpenAddTransaction(customer);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5 text-slate-600" />
                <span>إضافة حركة</span>
              </button>
            </div>
          </div>

          {/* Balance Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 text-center">
              <span className="text-[11px] font-semibold text-rose-700 block mb-1">
                إجمالي ما عليه (مدين)
              </span>
              <span className="text-lg sm:text-xl font-black text-rose-600 font-mono-num">
                {customer.debit.toLocaleString('ar-EG')}
              </span>
              <span className="text-[10px] text-rose-500 block">{settings.currency}</span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-center">
              <span className="text-[11px] font-semibold text-emerald-700 block mb-1">
                إجمالي ما له (سداد/دائن)
              </span>
              <span className="text-lg sm:text-xl font-black text-emerald-600 font-mono-num">
                {customer.credit.toLocaleString('ar-EG')}
              </span>
              <span className="text-[10px] text-emerald-500 block">{settings.currency}</span>
            </div>

            <div className="bg-slate-900 text-white rounded-2xl p-4 text-center shadow-md">
              <span className="text-[11px] font-semibold text-slate-300 block mb-1">
                صافي الرصيد المستحق
              </span>
              <span className={`text-lg sm:text-xl font-black font-mono-num ${customer.balance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {customer.balance.toLocaleString('ar-EG')}
              </span>
              <span className="text-[10px] text-slate-400 block">{settings.currency}</span>
            </div>
          </div>

          {/* AI Urgency Prioritization Card (Shown for Debtors) */}
          {isDebtor && (
            <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>تحليل أولوية التحصيل بالذكاء الاصطناعي (Gemini AI)</span>
                      {urgencyConfig && (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${urgencyConfig.badgeBg}`}>
                          {urgencyConfig.icon} {urgencyConfig.label} ({customer.urgencyScore || 50}/100)
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      تقييم تلقائي بناءً على عمر الدين وحجم المبلغ وسجل الدفعات
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleReanalyzeWithAi}
                  disabled={analyzingThisCustomer || isAnalyzingAi}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-300 shadow-2xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${analyzingThisCustomer ? 'animate-spin' : ''}`} />
                  <span>{analyzingThisCustomer ? 'جاري التحليل...' : 'إعادة التحليل بـ Gemini'}</span>
                </button>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-white/80 p-3 rounded-xl border border-slate-200/70">
                  <span className="text-slate-500 block text-[10px] mb-0.5">عمر الدين التقديري</span>
                  <span className="font-black text-slate-900 font-mono-num text-sm">
                    {customer.urgencyDebtDurationDays || durationInfo.durationDays} يوماً
                  </span>
                </div>

                <div className="bg-white/80 p-3 rounded-xl border border-slate-200/70">
                  <span className="text-slate-500 block text-[10px] mb-0.5">مؤشر خطورة الدين</span>
                  <span className={`font-black font-mono-num text-sm ${
                    (customer.urgencyScore || 0) >= 75 ? 'text-rose-600' : (customer.urgencyScore || 0) >= 50 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {customer.urgencyScore || 50} من 100
                  </span>
                </div>

                <div className="bg-white/80 p-3 rounded-xl border border-slate-200/70">
                  <span className="text-slate-500 block text-[10px] mb-0.5">النبرة المقترحة للرسالة</span>
                  <span className="font-bold text-slate-800">
                    {customer.urgencyTone === 'urgent' ? 'عاجلة وحازمة جداً' :
                     customer.urgencyTone === 'firm' ? 'رسمية وحازمة' :
                     customer.urgencyTone === 'formal' ? 'رسمية قانونية' : 'ودية ولطيفة'}
                  </span>
                </div>

                <div className="bg-white/80 p-3 rounded-xl border border-slate-200/70">
                  <span className="text-slate-500 block text-[10px] mb-0.5">تاريخ أقدم فاتورة مفتوحة</span>
                  <span className="font-mono-num font-semibold text-slate-700">
                    {durationInfo.earliestDebitDate}
                  </span>
                </div>
              </div>

              {/* AI Rationale & Actionable Advice */}
              {customer.urgencyReasoning && (
                <div className="bg-white/90 p-3.5 rounded-xl border border-indigo-100 text-xs space-y-2">
                  <div className="text-slate-800 leading-relaxed">
                    <strong className="text-indigo-950 font-bold block mb-1">
                      💡 تقرير الذكاء الاصطناعي لتبرير درجة الإلحاح:
                    </strong>
                    <p className="text-slate-700">{customer.urgencyReasoning}</p>
                  </div>

                  {customer.urgencySuggestedAction && (
                    <div className="pt-2 border-t border-slate-100 text-slate-800">
                      <strong className="text-emerald-800 font-bold block mb-0.5">
                        🎯 الإجراء الموصى به للتحصيل:
                      </strong>
                      <p className="text-slate-700">{customer.urgencySuggestedAction}</p>
                    </div>
                  )}

                  {customer.urgencyRiskFactors && customer.urgencyRiskFactors.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-500">عوامل الخطر المحددة:</span>
                      {customer.urgencyRiskFactors.map((factor, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Active Installment Plan Card OR Recommendation Banner */}
          {isDebtor && (
            customer.activeInstallmentPlan ? (
              <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <CalendarClock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900">
                          {customer.activeInstallmentPlan.planTitle}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          خطة معتمدة ونشطة
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        فترة الجدولة: من {customer.activeInstallmentPlan.startDate} إلى {customer.activeInstallmentPlan.endDate}
                      </p>
                    </div>
                  </div>

                  {onOpenInstallmentPlan && (
                    <button
                      onClick={() => onOpenInstallmentPlan(customer)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-emerald-800 border border-emerald-300 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>تعديل الخطة أو إرسال SMS</span>
                    </button>
                  )}
                </div>

                {/* Plan Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 block">إجمالي الخطة</span>
                    <span className="font-black text-slate-900 font-mono-num text-sm">
                      {customer.activeInstallmentPlan.totalDebt.toLocaleString('ar-EG')} {settings.currency}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 block">الدفعة المقدمة</span>
                    <span className="font-black text-amber-700 font-mono-num text-sm">
                      {customer.activeInstallmentPlan.downPayment.toLocaleString('ar-EG')} {settings.currency}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 block">عدد الأقساط</span>
                    <span className="font-black text-indigo-700 font-mono-num text-sm">
                      {customer.activeInstallmentPlan.numberOfInstallments} أقساط ({
                        customer.activeInstallmentPlan.interval === 'weekly' ? 'أسبوعية' :
                        customer.activeInstallmentPlan.interval === 'biweekly' ? 'نصف شهرية' : 'شهرية'
                      })
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 block">نسبة الإنجاز</span>
                    <span className="font-black text-emerald-700 font-mono-num text-sm">
                      {customer.activeInstallmentPlan.schedule.filter((s) => s.status === 'paid').length} من {customer.activeInstallmentPlan.schedule.length} مسدد
                    </span>
                  </div>
                </div>

                {/* Interactive Installment Checklist */}
                <div className="bg-white p-3.5 rounded-xl border border-emerald-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>جدول الأقساط (انقر لتحديد حالة السداد):</span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      يمكنك تأكيد سداد كل قسط بنقرة واحدة
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {customer.activeInstallmentPlan.schedule.map((item) => {
                      const isPaid = item.status === 'paid';
                      return (
                        <div
                          key={item.installmentNumber}
                          onClick={() => toggleInstallmentItemPaid(customer.id, item.installmentNumber)}
                          className={`p-2 rounded-lg border flex items-center justify-between gap-3 text-xs cursor-pointer transition-all ${
                            isPaid
                              ? 'bg-emerald-50/70 border-emerald-200 text-slate-700 line-through opacity-85'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isPaid ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <span className="font-bold">
                              {item.label || `القسط ${item.installmentNumber}`}
                            </span>
                            <span className="text-slate-400 font-mono-num" dir="ltr">
                              ({item.dueDate})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-black font-mono-num text-slate-900">
                              {item.amount.toLocaleString('ar-EG')} {settings.currency}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isPaid ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {isPaid ? 'تم السداد' : 'معلق'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              onOpenInstallmentPlan && (
                <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <CalendarClock className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs sm:text-sm text-indigo-950">
                        هل يتعثر العميل في سداد كامل المبلغ دفعة واحدة؟
                      </h5>
                      <p className="text-[11px] text-indigo-700">
                        اقترح خطة أقساط ذكية ومجدولة بالذكاء الاصطناعي وأرسلها له عبر رسالة SMS مخصصة الآن.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenInstallmentPlan(customer)}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>اقتراح خطة تقسيط ذكية</span>
                  </button>
                </div>
              )
            )
          )}

          {/* Transactions Ledger Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-800">سجل حركات الحساب والمديونية</h4>
              <span className="text-xs text-slate-500">
                إجمالي الحركات: {customer.transactions.length}
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3 border-b">التاريخ</th>
                    <th className="p-3 border-b">النوع</th>
                    <th className="p-3 border-b">رقم السند</th>
                    <th className="p-3 border-b">البيان / ملاحظات</th>
                    <th className="p-3 border-b text-rose-600">عليه (مدين)</th>
                    <th className="p-3 border-b text-emerald-600">له (دائن)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customer.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                        لا توجد حركات مسجلة حتى الآن.
                      </td>
                    </tr>
                  ) : (
                    customer.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70">
                        <td className="p-3 font-mono-num text-slate-600">{tx.date}</td>
                        <td className="p-3">
                          {tx.type === 'debit' ? (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                              <ArrowUpRight className="w-3 h-3" />
                              <span>مديونية</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                              <ArrowDownLeft className="w-3 h-3" />
                              <span>سداد دفعة</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono-num text-slate-600">{tx.receiptNumber || '-'}</td>
                        <td className="p-3 text-slate-800 font-medium">{tx.note}</td>
                        <td className="p-3 text-rose-600 font-bold font-mono-num">
                          {tx.type === 'debit' ? tx.amount.toLocaleString('ar-EG') : '-'}
                        </td>
                        <td className="p-3 text-emerald-600 font-bold font-mono-num">
                          {tx.type === 'credit' ? tx.amount.toLocaleString('ar-EG') : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statement Footer / Notes */}
          {customer.notes && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600">
              <strong className="block text-slate-800 mb-1">ملاحظات عامة حول حساب العميل:</strong>
              <p>{customer.notes}</p>
            </div>
          )}

          {/* Print Signature Footer (visible only in print) */}
          <div className="hidden print-only pt-8 border-t border-slate-300 mt-8">
            <div className="grid grid-cols-2 text-center text-xs text-slate-600">
              <div>
                <p className="font-bold mb-10">توقيع المستلم / العميل:</p>
                <p>.......................................</p>
              </div>
              <div>
                <p className="font-bold mb-10">ختم وتوقيع المحل:</p>
                <p>.......................................</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
