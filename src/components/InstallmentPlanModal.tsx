import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Calendar,
  Clock,
  Send,
  MessageCircle,
  Copy,
  Check,
  Printer,
  Save,
  RefreshCw,
  Sliders,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
  Layers,
  ChevronRight,
  TrendingDown,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Customer, InstallmentPlan, InstallmentScheduleItem } from '../types';
import {
  buildCustomInstallmentPlan,
  fetchAiInstallmentPlans,
  formatCurrencyAmount,
  generateDefaultInstallmentPlans,
  generateInstallmentSmsText
} from '../utils/installmentHelper';
import { calculateSmsSegments, createSmsUri, createWhatsAppUri } from '../utils/smsHelper';
import { URGENCY_CONFIG } from '../utils/urgencyHelper';

interface InstallmentPlanModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InstallmentPlanModal: React.FC<InstallmentPlanModalProps> = ({
  customer: customerProp,
  isOpen,
  onClose
}) => {
  const {
    customers,
    settings,
    saveCustomerInstallmentPlan,
    updateCustomerStatus,
    recordSendLog
  } = useApp();

  const customer = customerProp ? (customers.find((c) => c.id === customerProp.id) || customerProp) : null;

  const [isLoading, setIsLoading] = useState(false);
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'suggested' | 'custom'>('suggested');
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Custom Plan Inputs
  const [customDownPayment, setCustomDownPayment] = useState<number>(0);
  const [customInstallments, setCustomInstallments] = useState<number>(3);
  const [customInterval, setCustomInterval] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [customPlanTitle, setCustomPlanTitle] = useState<string>('خطة أقساط مخصصة وميسرة');

  // Editable SMS message
  const [editedSmsText, setEditedSmsText] = useState<string>('');

  // Load plans whenever customer opens
  useEffect(() => {
    if (!isOpen || !customer) return;

    // Initialize custom defaults based on customer
    const defaultDown = Math.round(customer.balance * 0.2);
    setCustomDownPayment(defaultDown);
    setCustomInstallments(customer.balance >= 100000 ? 4 : 3);
    setCustomInterval('monthly');
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setCustomStartDate(d.toISOString().split('T')[0]);
    setSavedSuccess(false);

    // If customer already has an active installment plan, put it first!
    if (customer.activeInstallmentPlan) {
      setPlans([
        customer.activeInstallmentPlan,
        ...generateDefaultInstallmentPlans(customer, settings).filter(
          (p) => p.id !== customer.activeInstallmentPlan?.id
        )
      ]);
      setSelectedPlanIndex(0);
      setEditedSmsText(customer.activeInstallmentPlan.smsMessageText);
    } else {
      // Auto-fetch from Gemini AI endpoint or fallback
      loadAiPlans(customer);
    }
  }, [isOpen, customer?.id]);

  const loadAiPlans = async (targetCustomer: Customer) => {
    setIsLoading(true);
    setAiNote(null);
    try {
      const res = await fetchAiInstallmentPlans(targetCustomer, settings);
      setPlans(res.plans);
      setAiNote(res.aiNote || null);
      if (res.plans.length > 0) {
        // Recommend plan matching urgency:
        let initialIndex = 1; // Default to balanced
        if (targetCustomer.urgencyLevel === 'critical') {
          initialIndex = 0; // fast recovery
        } else if (targetCustomer.urgencyLevel === 'low') {
          initialIndex = 2; // relaxed
        }
        setSelectedPlanIndex(initialIndex);
        setEditedSmsText(res.plans[initialIndex].smsMessageText);
      }
    } catch (e) {
      console.error(e);
      const defaults = generateDefaultInstallmentPlans(targetCustomer, settings);
      setPlans(defaults);
      if (defaults.length > 0) {
        setSelectedPlanIndex(0);
        setEditedSmsText(defaults[0].smsMessageText);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !customer) return null;

  const currentPlan = plans[selectedPlanIndex] || plans[0];

  const handleSelectPlan = (idx: number) => {
    setSelectedPlanIndex(idx);
    setActiveTab('suggested');
    if (plans[idx]) {
      setEditedSmsText(plans[idx].smsMessageText);
    }
    setSavedSuccess(false);
  };

  // Recalculate custom plan on the fly
  const handleApplyCustomPlan = () => {
    const custom = buildCustomInstallmentPlan(customer, settings, {
      planTitle: customPlanTitle,
      downPayment: Number(customDownPayment) || 0,
      numberOfInstallments: Number(customInstallments) || 1,
      interval: customInterval,
      startDate: customStartDate
    });

    // Add or replace custom plan
    const updated = [...plans.filter((p) => !p.id.startsWith('plan_custom_')), custom];
    setPlans(updated);
    const newIdx = updated.length - 1;
    setSelectedPlanIndex(newIdx);
    setActiveTab('suggested');
    setEditedSmsText(custom.smsMessageText);
    setSavedSuccess(false);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(editedSmsText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleSavePlanToCustomer = () => {
    if (!currentPlan) return;
    const planToSave: InstallmentPlan = {
      ...currentPlan,
      smsMessageText: editedSmsText
    };
    saveCustomerInstallmentPlan(customer.id, planToSave);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSendSms = () => {
    if (!editedSmsText || !customer.phone) return;
    const uri = createSmsUri(customer.phone, editedSmsText, settings.countryCode);
    updateCustomerStatus(customer.id, 'sent', 'sms');
    recordSendLog({
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      amount: customer.balance,
      messageText: editedSmsText,
      channel: 'sms',
      status: 'sent'
    });
    // Auto-save plan if not already saved
    handleSavePlanToCustomer();
    window.location.href = uri;
  };

  const handleSendWhatsApp = () => {
    if (!editedSmsText || !customer.phone) return;
    const uri = createWhatsAppUri(customer.phone, editedSmsText, settings.countryCode);
    updateCustomerStatus(customer.id, 'sent', 'whatsapp');
    recordSendLog({
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      amount: customer.balance,
      messageText: editedSmsText,
      channel: 'whatsapp',
      status: 'sent'
    });
    // Open WhatsApp safely in iframe environments
    const link = document.createElement('a');
    link.href = uri;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintAgreement = () => {
    window.print();
  };

  const segments = calculateSmsSegments(editedSmsText);
  const urgency = customer.urgencyLevel || 'medium';
  const urgencyCfg = URGENCY_CONFIG[urgency];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header (No print) */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <CalendarClock className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-white">
                  اقتراح خطة تقسيط مجدولة للمدين
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>Gemini AI</span>
                </span>
              </div>
              <p className="text-xs text-slate-300">
                جدولة دين العميل على أقساط ميسرة حسب درجة الإلحاح وإرسال الخطة مباشرة عبر SMS أو واتساب
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintAgreement}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
              title="طباعة سند اتفاقية التقسيط"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">طباعة الاتفاقية</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Customer Header Badge & Urgency Context (No Print) */}
        <div className="p-4 sm:p-5 bg-indigo-50/50 border-b border-indigo-100/70 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white border border-indigo-200 flex items-center justify-center font-black text-indigo-800 text-sm shadow-2xs">
              {customer.name.substring(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-base">{customer.name}</span>
                {customer.accountNumber && (
                  <span className="text-xs font-mono-num px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                    {customer.accountNumber}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600 mt-0.5">
                <span dir="ltr" className="font-mono-num font-semibold text-slate-700">
                  {customer.phone || 'بدون رقم'}
                </span>
                <span>•</span>
                <span className="text-slate-500">
                  عمر الدين: <strong className="font-mono-num text-slate-800">{customer.urgencyDebtDurationDays || 30}</strong> يوماً
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Urgency Badge */}
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-2xs ${urgencyCfg.badgeBg}`}>
              <span className="text-sm">{urgencyCfg.icon}</span>
              <div>
                <div className="text-[10px] font-bold opacity-80">درجة إلحاح التحصيل</div>
                <div className="text-xs font-black">{urgencyCfg.label} ({customer.urgencyScore || 65}%)</div>
              </div>
            </div>

            {/* Total Balance Outstanding */}
            <div className="bg-white px-3.5 py-1.5 rounded-xl border border-rose-200 shadow-2xs text-left">
              <div className="text-[10px] font-bold text-slate-500">إجمالي الدين المستحق</div>
              <div className="text-base font-black text-rose-600 font-mono-num" dir="ltr">
                {customer.balance.toLocaleString('ar-EG')} {settings.currency}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Printable Agreement Container (Always in DOM, visible in Print) */}
          <div className="hidden print:block print:p-6 print:space-y-4">
            <div className="text-center pb-4 border-b-2 border-slate-900">
              <h2 className="text-xl font-bold text-slate-900">{settings.storeName}</h2>
              <p className="text-sm text-slate-600">سند واتفاقية جدولة مديونية بالتقسيط</p>
              <p className="text-xs text-slate-500 mt-1">تاريخ الاتفاق: {new Date().toLocaleDateString('ar-EG')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <strong>الطرف الأول (الدائن):</strong> {settings.storeName} (هاتف: {settings.storePhone})
              </div>
              <div>
                <strong>الطرف الثاني (المدين):</strong> {customer.name} (هاتف: {customer.phone})
              </div>
              <div>
                <strong>إجمالي المبلغ المستحق:</strong> {formatCurrencyAmount(customer.balance, settings.currency)}
              </div>
              <div>
                <strong>الدفعة المقدمة:</strong> {formatCurrencyAmount(currentPlan?.downPayment || 0, settings.currency)}
              </div>
            </div>
            {currentPlan && (
              <div className="mt-4">
                <h4 className="font-bold text-xs mb-2">جدول استحقاق الأقساط ({currentPlan.planTitle}):</h4>
                <table className="w-full text-xs border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300">#</th>
                      <th className="p-2 border-r border-slate-300">تاريخ الاستحقاق</th>
                      <th className="p-2 border-r border-slate-300">المبلغ المستحق</th>
                      <th className="p-2">توقيع الاستلام</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPlan.schedule.map((item) => (
                      <tr key={item.installmentNumber} className="border-b border-slate-200">
                        <td className="p-2 text-center border-r border-slate-300">{item.installmentNumber}</td>
                        <td className="p-2 text-center border-r border-slate-300 font-mono-num">{item.dueDate}</td>
                        <td className="p-2 text-center border-r border-slate-300 font-mono-num">{formatCurrencyAmount(item.amount, settings.currency)}</td>
                        <td className="p-2 text-center">____________</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="pt-8 flex justify-between text-xs">
              <div className="text-center">
                <p>توقيع الطرف الأول (المتجر)</p>
                <div className="mt-8">_____________________</div>
              </div>
              <div className="text-center">
                <p>توقيع الطرف الثاني (العميل المدين)</p>
                <div className="mt-8">_____________________</div>
              </div>
            </div>
          </div>

          {/* Interactive Screen Content (Hidden when printing) */}
          <div className="space-y-6 no-print">

            {/* AI Generation State or Regenerate Banner */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>خطط تقسيط مقترحة بالذكاء الاصطناعي</span>
                    {customer.activeInstallmentPlan && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                        خطة معتمدة حالياً
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-indigo-200">
                    تم حساب خيارات السداد وتوليد نصوص الرسائل تلقائياً لتناسب قدرة العميل وتحفظ حق المتجر.
                  </p>
                </div>
              </div>

              <button
                onClick={() => loadAiPlans(customer)}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'جاري التحليل...' : 'إعادة التوليد بـ Gemini'}</span>
              </button>
            </div>

            {/* Mode Tabs: 3 AI Plans or Custom Builder */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <div className="text-xs font-bold text-slate-500 ml-2">اختر استراتيجية السداد:</div>
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {plans.map((p, idx) => {
                  const isSelected = selectedPlanIndex === idx && activeTab === 'suggested';
                  const isFast = p.strategyType === 'fast_recovery';
                  const isRelaxed = p.strategyType === 'relaxed';

                  return (
                    <button
                      key={p.id || idx}
                      onClick={() => handleSelectPlan(idx)}
                      className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/25'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                      }`}
                    >
                      <span>{isFast ? '⚡' : isRelaxed ? '🌿' : '⚖️'}</span>
                      <span>{p.planTitle}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {p.numberOfInstallments} أقساط
                      </span>
                    </button>
                  );
                })}

                <button
                  onClick={() => setActiveTab('custom')}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                    activeTab === 'custom'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-500" />
                  <span>تخصيص يدوي</span>
                </button>
              </div>
            </div>

            {/* If Custom Tab is Active: Custom Plan Controls */}
            {activeTab === 'custom' && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-bold text-sm text-slate-900">محدد خطة التقسيط المخصصة</h4>
                  </div>
                  <span className="text-xs text-slate-500">عدّل المعايير حسب اتفاقك المباشر مع العميل</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Down Payment */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      الدفعة الأولى المقدمة ({settings.currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={customer.balance}
                      value={customDownPayment}
                      onChange={(e) => setCustomDownPayment(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono-num text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="text-[10px] text-slate-400 mt-1 font-mono-num">
                      تمثل {customer.balance > 0 ? Math.round((customDownPayment / customer.balance) * 100) : 0}% من إجمالي الدين
                    </div>
                  </div>

                  {/* Installments Count */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      عدد الأقساط المتبقية
                    </label>
                    <select
                      value={customInstallments}
                      onChange={(e) => setCustomInstallments(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="1">قسط واحد (سداد كامل بعد فترة)</option>
                      <option value="2">قسطان (2 دفعتين)</option>
                      <option value="3">3 أقساط</option>
                      <option value="4">4 أقساط</option>
                      <option value="5">5 أقساط</option>
                      <option value="6">6 أقساط</option>
                      <option value="8">8 أقساط</option>
                      <option value="10">10 أقساط</option>
                      <option value="12">12 قسطاً (سنة كاملة)</option>
                    </select>
                  </div>

                  {/* Interval */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      تكرار الأقساط
                    </label>
                    <select
                      value={customInterval}
                      onChange={(e) => setCustomInterval(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="weekly">أسبوعياً (كل 7 أيام)</option>
                      <option value="biweekly">كل أسبوعين (نصف شهري)</option>
                      <option value="monthly">شهرياً (كل 30 يوماً)</option>
                    </select>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      تاريخ بدء القسط الأول
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-mono-num font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-slate-600">
                    قيمة كل قسط مقدرة: <strong className="font-mono-num text-indigo-700 font-bold">
                      {formatCurrencyAmount(
                        customInstallments > 0 ? Math.floor(Math.max(0, customer.balance - customDownPayment) / customInstallments) : 0,
                        settings.currency
                      )}
                    </strong>
                  </div>
                  <button
                    onClick={handleApplyCustomPlan}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>تطبيق الخطة المخصصة وتوليد الرسالة</span>
                  </button>
                </div>
              </div>
            )}

            {/* Selected Plan Details Card */}
            {currentPlan && (
              <div className="space-y-4">
                
                {/* Plan Overview Metrics Bar */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-black text-slate-900 text-base flex items-center gap-2">
                        <span>{currentPlan.planTitle}</span>
                        {customer.activeInstallmentPlan?.id === currentPlan.id && (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                            ✓ معتمدة حالياً للعميل
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {currentPlan.reasoning}
                      </p>
                    </div>

                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block">فترة السداد</span>
                      <span className="text-xs font-bold font-mono-num text-slate-700">
                        من {currentPlan.startDate} إلى {currentPlan.endDate}
                      </span>
                    </div>
                  </div>

                  {/* Highlight Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] font-bold text-slate-500 block">إجمالي المديونية</span>
                      <span className="text-sm sm:text-base font-black text-slate-900 font-mono-num">
                        {formatCurrencyAmount(currentPlan.totalDebt, settings.currency)}
                      </span>
                    </div>

                    <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/60">
                      <span className="text-[10px] font-bold text-amber-800 block">الدفعة الأولى (المقدم)</span>
                      <span className="text-sm sm:text-base font-black text-amber-700 font-mono-num">
                        {formatCurrencyAmount(currentPlan.downPayment, settings.currency)}
                      </span>
                    </div>

                    <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200/60">
                      <span className="text-[10px] font-bold text-indigo-800 block">عدد الأقساط</span>
                      <span className="text-sm sm:text-base font-black text-indigo-700 font-mono-num">
                        {currentPlan.numberOfInstallments} أقساط ({
                          currentPlan.interval === 'weekly' ? 'أسبوعية' :
                          currentPlan.interval === 'biweekly' ? 'نصف شهرية' : 'شهرية'
                        })
                      </span>
                    </div>

                    <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/60">
                      <span className="text-[10px] font-bold text-emerald-800 block">قيمة القسط تقريباً</span>
                      <span className="text-sm sm:text-base font-black text-emerald-700 font-mono-num">
                        {formatCurrencyAmount(currentPlan.installmentAmount, settings.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Schedule Timeline Table */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                      <span>جدول مواعيد استحقاق الأقساط:</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        إجمالي الأقساط: {currentPlan.schedule.length}
                      </span>
                    </h5>

                    <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                      <table className="w-full text-xs text-right divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-slate-600 font-bold">
                          <tr>
                            <th className="p-2.5 text-center">القسط #</th>
                            <th className="p-2.5">تاريخ الاستحقاق</th>
                            <th className="p-2.5">المبلغ المطلوب</th>
                            <th className="p-2.5">البيان</th>
                            <th className="p-2.5 text-center">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white font-mono-num">
                          {currentPlan.schedule.map((item) => (
                            <tr key={item.installmentNumber} className="hover:bg-slate-50">
                              <td className="p-2.5 text-center font-bold text-slate-800">
                                {item.installmentNumber}
                              </td>
                              <td className="p-2.5 font-bold text-indigo-700">
                                {item.dueDate}
                              </td>
                              <td className="p-2.5 font-black text-slate-900">
                                {formatCurrencyAmount(item.amount, settings.currency)}
                              </td>
                              <td className="p-2.5 text-slate-500 font-sans">
                                {item.label || `القسط ${item.installmentNumber}`}
                              </td>
                              <td className="p-2.5 text-center font-sans">
                                {item.status === 'paid' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>مسدد</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                                    <Clock className="w-3 h-3" />
                                    <span>معلق</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* SMS & Messaging Customizer Section */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-bold text-sm text-slate-900">
                        نص رسالة SMS / واتساب المقترحة للإرسال للعميل
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 font-mono-num">
                        {segments.charCount} حرفاً ({segments.segments} رسائل SMS)
                      </span>
                      <button
                        onClick={handleCopyMessage}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition-all cursor-pointer font-semibold text-[11px]"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'تم النسخ!' : 'نسخ النص'}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500">
                    يمكنك تعديل نص الرسالة أدناه بحرية (إضافة رقم حساب الكريمي، رقم الحوالة، أو أي تفاصيل إضافية):
                  </p>

                  <textarea
                    rows={6}
                    value={editedSmsText}
                    onChange={(e) => setEditedSmsText(e.target.value)}
                    dir="rtl"
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-xs sm:text-sm text-slate-800 leading-relaxed font-sans focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
                  />

                  {/* Messaging Trigger Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSavePlanToCustomer}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all flex items-center gap-1.5 cursor-pointer ${
                          savedSuccess
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-2xs'
                        }`}
                      >
                        <Save className="w-4 h-4" />
                        <span>{savedSuccess ? 'تم حفظ الخطة بالملف!' : 'اعتماد وحفظ الخطة بحساب العميل'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSendWhatsApp}
                        disabled={!customer.phone}
                        className="px-4 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>إرسال عبر واتساب</span>
                      </button>

                      <button
                        onClick={handleSendSms}
                        disabled={!customer.phone}
                        className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-md shadow-indigo-600/25 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        <Send className="w-4 h-4" />
                        <span>إرسال عبر رسالة SMS</span>
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

        {/* Modal Bottom Footer (No Print) */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between no-print">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-slate-400" />
            <span>عند الإرسال يتم حفظ الخطة وتحديث حالة العميل وسجل الإرسال تلقائياً.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
