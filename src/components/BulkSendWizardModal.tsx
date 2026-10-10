import React, { useState, useMemo } from 'react';
import {
  X,
  Send,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  Clock,
  Sparkles,
  RefreshCw,
  Phone,
  Copy,
  Check,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  createSmsUri,
  createWhatsAppUri,
  renderTemplate,
  calculateSmsSegments
} from '../utils/smsHelper';
import { URGENCY_CONFIG, calculateDebtDuration } from '../utils/urgencyHelper';

interface BulkSendWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BulkSendWizardModal: React.FC<BulkSendWizardModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    customers,
    selectedCustomerIds,
    templates,
    settings,
    updateCustomerStatus,
    recordSendLog,
    deselectAll
  } = useApp();

  // Wizard state: 1: Confirm & Review, 2: Interactive Sender, 3: Completed
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    return templates.find((t) => t.isDefault)?.id || templates[0]?.id || '';
  });
  const [channel, setChannel] = useState<'sms' | 'whatsapp'>('sms');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [copied, setCopied] = useState(false);

  // Filter customers that are in selectedCustomerIds
  const targetCustomers = useMemo(() => {
    return customers.filter((c) => selectedCustomerIds.includes(c.id));
  }, [customers, selectedCustomerIds]);

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const totalTargetDebt = useMemo(() => {
    return targetCustomers.reduce((sum, c) => sum + Math.max(0, c.balance), 0);
  }, [targetCustomers]);

  if (!isOpen) return null;

  if (targetCustomers.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 max-w-md w-full text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">لم يتم تحديد أي عميل للإرسال</h3>
          <p className="text-xs text-slate-500">
            يرجى تحديد العملاء من القائمة أولاً أو الضغط على "تحديد جميع المدينين".
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
          >
            حسناً، فهمت
          </button>
        </div>
      </div>
    );
  }

  const currentCustomer = targetCustomers[currentIndex];
  const currentRenderedMessage = currentCustomer && activeTemplate
    ? renderTemplate(activeTemplate.content, currentCustomer, settings)
    : '';

  const segmentInfo = calculateSmsSegments(currentRenderedMessage);

  // Send action for current customer
  const handleSendCurrent = () => {
    if (!currentCustomer || !currentRenderedMessage) return;

    if (channel === 'sms') {
      const uri = createSmsUri(currentCustomer.phone, currentRenderedMessage, settings.countryCode);
      window.location.href = uri;
    } else {
      const uri = createWhatsAppUri(currentCustomer.phone, currentRenderedMessage, settings.countryCode);
      window.open(uri, '_blank');
    }

    // Mark as sent
    updateCustomerStatus(currentCustomer.id, 'sent', channel);
    recordSendLog({
      customerId: currentCustomer.id,
      customerName: currentCustomer.name,
      phone: currentCustomer.phone,
      amount: currentCustomer.balance,
      messageText: currentRenderedMessage,
      channel,
      status: 'sent'
    });

    setSentCount((prev) => prev + 1);

    // Auto advance
    if (currentIndex < targetCustomers.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setStep(3);
    }
  };

  const handleSkipCurrent = () => {
    setSkippedCount((prev) => prev + 1);
    if (currentIndex < targetCustomers.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setStep(3);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(currentRenderedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinish = () => {
    deselectAll();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                معالج إرسال رسائل المديونية الجماعية
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>الخطوة {step} من 3:</span>
                <span className="font-semibold text-slate-700">
                  {step === 1 && 'تأكيد الإرسال وتخصيص القالب'}
                  {step === 2 && 'إرسال الرسائل الفردية المؤكدة'}
                  {step === 3 && 'اكتملت عملية الإرسال بنجاح'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* ========================================================== */}
          {/* STEP 1: Confirmation & Options */}
          {/* ========================================================== */}
          {step === 1 && (
            <div className="space-y-5">
              
              {/* Summary Banner */}
              <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-200" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-100">
                      ملخص الإرسال بعد التأكيد
                    </span>
                  </div>
                  <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-bold">
                    جاهز للإرسال
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-amber-100 block mb-0.5">عدد العملاء المحددين</span>
                    <span className="text-2xl sm:text-3xl font-black font-mono-num">
                      {targetCustomers.length} عميل
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-amber-100 block mb-0.5">إجمالي الديون المستحقة</span>
                    <span className="text-2xl sm:text-3xl font-black font-mono-num">
                      {totalTargetDebt.toLocaleString('ar-EG')}{' '}
                      <span className="text-sm font-normal text-amber-100">{settings.currency}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  طريقة الإرسال:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setChannel('sms')}
                    className={`p-3.5 rounded-2xl border text-right transition-all flex items-center gap-3 ${
                      channel === 'sms'
                        ? 'border-emerald-500 bg-emerald-50/40 text-emerald-900 shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">رسائل نصية SMS قصيرة</div>
                      <div className="text-[11px] text-slate-500">تطبيق الرسائل الافتراضي بالهاتف</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannel('whatsapp')}
                    className={`p-3.5 rounded-2xl border text-right transition-all flex items-center gap-3 ${
                      channel === 'whatsapp'
                        ? 'border-green-500 bg-green-50/40 text-green-900 shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-green-600 text-white flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">تطبيق واتساب (WhatsApp)</div>
                      <div className="text-[11px] text-slate-500">فتح المحادثات بنص جاهز</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Template Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  اختر قالب الرسالة:
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} {tpl.isDefault ? '(الافتراضي)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Preview of first customer's message */}
              {targetCustomers[0] && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-bold flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-slate-500" />
                      معاينة الرسالة للعميل الأول ({targetCustomers[0].name}):
                    </span>
                  </div>
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed shadow-2xs">
                    {renderTemplate(activeTemplate.content, targetCustomers[0], settings)}
                  </div>
                </div>
              )}

              {/* Review Table snippet */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-100/80 px-4 py-2.5 text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>قائمة العملاء المستهدفين بالإرسال ({targetCustomers.length}):</span>
                </div>
                <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {targetCustomers.map((c, i) => (
                    <div key={c.id} className="p-2.5 px-4 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-mono-num text-[11px]">{i + 1}.</span>
                        <span className="font-semibold text-slate-800">{c.name}</span>
                        {c.urgencyLevel && URGENCY_CONFIG[c.urgencyLevel] && (
                          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${URGENCY_CONFIG[c.urgencyLevel].badgeBg}`}>
                            {URGENCY_CONFIG[c.urgencyLevel].icon} {URGENCY_CONFIG[c.urgencyLevel].label}
                          </span>
                        )}
                        <span className="text-slate-400 font-mono-num text-[11px]" dir="ltr">({c.phone || 'بدون رقم'})</span>
                      </div>
                      <span className="font-bold text-rose-600 font-mono-num">
                        {c.balance.toLocaleString('ar-EG')} {settings.currency}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================== */}
          {/* STEP 2: Interactive Sender Loop */}
          {/* ========================================================== */}
          {step === 2 && currentCustomer && (
            <div className="space-y-5 animate-in fade-in">
              
              {/* Progress Header */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>
                    العميل {currentIndex + 1} من {targetCustomers.length}
                  </span>
                  <span className="text-emerald-700">
                    تم إرسال {sentCount} رسالة
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round(((currentIndex + 1) / targetCustomers.length) * 100)}%`
                    }}
                  />
                </div>
              </div>

              {/* Active Customer Card */}
              <div className="bg-white border-2 border-amber-300 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
                
                {/* Customer Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900">{currentCustomer.name}</h3>
                      {currentCustomer.urgencyLevel && URGENCY_CONFIG[currentCustomer.urgencyLevel] && (
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${URGENCY_CONFIG[currentCustomer.urgencyLevel].badgeBg}`}>
                          {URGENCY_CONFIG[currentCustomer.urgencyLevel].icon} {URGENCY_CONFIG[currentCustomer.urgencyLevel].label} ({currentCustomer.urgencyScore || 50}%)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono-num mt-0.5">
                      <span dir="ltr">{currentCustomer.phone}</span>
                      <span>•</span>
                      <span>{currentCustomer.accountNumber || 'حساب بدون كود'}</span>
                      {currentCustomer.urgencyDebtDurationDays && (
                        <>
                          <span>•</span>
                          <span>عمر الدين: {currentCustomer.urgencyDebtDurationDays} يوماً</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="text-[11px] text-slate-500 block">المبلغ المستحق:</span>
                    <span className="text-xl font-black text-rose-600 font-mono-num">
                      {currentCustomer.balance.toLocaleString('ar-EG')}{' '}
                      <span className="text-xs font-medium">{settings.currency}</span>
                    </span>
                  </div>
                </div>

                {/* Message Bubble */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                      نص الرسالة المخصص للعميل:
                    </span>
                    <button
                      onClick={handleCopyMessage}
                      className="text-slate-500 hover:text-slate-800 text-[11px] flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'تم النسخ' : 'نسخ النص'}</span>
                    </button>
                  </div>

                  <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/80 text-sm text-slate-800 leading-relaxed font-medium">
                    {currentRenderedMessage}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                    <span>
                      عدد الأحرف: <strong className="text-slate-600">{segmentInfo.charCount}</strong> (رسالة واحدة / {segmentInfo.segments} جزء SMS)
                    </span>
                    <span>
                      القناة: <strong>{channel === 'sms' ? 'SMS' : 'WhatsApp'}</strong>
                    </span>
                  </div>
                </div>

                {/* Big Action Button */}
                <div className="pt-2">
                  <button
                    onClick={handleSendCurrent}
                    className={`w-full py-4 rounded-2xl text-base font-black text-white shadow-lg transition-all flex items-center justify-center gap-2.5 active:scale-98 ${
                      channel === 'sms'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/30'
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-green-600/30'
                    }`}
                  >
                    {channel === 'sms' ? (
                      <>
                        <Send className="w-5 h-5" />
                        <span>فتح تطبيق الرسائل وإرسال SMS الآن 📱</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-5 h-5" />
                        <span>إرسال عبر واتساب الآن 💬</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Navigation actions */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleSkipCurrent}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all"
                  >
                    تخطي هذا العميل ⏭️
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all"
                  >
                    رجوع للتأكيد ⬅️
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* ========================================================== */}
          {/* STEP 3: Complete Screen */}
          {/* ========================================================== */}
          {step === 3 && (
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 mb-1">
                  تم إرسال إشعارات المديونية بنجاح! 🎉
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  تم تسجيل حالة الإرسال وتحديث سجل الرسائل للعملاء المحددين تلقائياً.
                </p>
              </div>

              <div className="max-w-xs mx-auto bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">عدد الرسائل المرسلة:</span>
                  <span className="font-bold text-emerald-600 font-mono-num">{sentCount} عميل</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">العملاء الذين تم تخطيهم:</span>
                  <span className="font-bold text-slate-600 font-mono-num">{skippedCount}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                  <span className="text-slate-500">طريقة الإرسال:</span>
                  <span className="font-bold text-slate-800">{channel === 'sms' ? 'SMS' : 'WhatsApp'}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
          {step === 1 && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-200/60 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setSentCount(0);
                  setSkippedCount(0);
                  setStep(2);
                }}
                className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
              >
                <span>بدء الإرسال المتتابع والمؤكد</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 2 && (
            <div className="w-full flex justify-between items-center text-xs text-slate-500">
              <span>يمكنك إيقاف المعالج في أي وقت بالضغط على زر الإغلاق ✖️</span>
              <button
                onClick={() => setStep(3)}
                className="text-amber-700 font-bold hover:underline"
              >
                إنهاء المعالج الآن
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="w-full flex justify-center">
              <button
                onClick={handleFinish}
                className="px-8 py-2.5 rounded-xl text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition-all"
              >
                تم والعودة لقائمة العملاء
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
