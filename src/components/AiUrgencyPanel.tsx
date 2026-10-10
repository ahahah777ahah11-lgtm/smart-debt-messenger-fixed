import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  Send,
  RefreshCw,
  TrendingUp,
  Info,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UrgencyLevel } from '../types';
import { URGENCY_CONFIG } from '../utils/urgencyHelper';

interface AiUrgencyPanelProps {
  onFilterUrgency: (level: UrgencyLevel | 'all') => void;
  activeUrgencyFilter: UrgencyLevel | 'all';
  onOpenBulkSend: () => void;
}

export const AiUrgencyPanel: React.FC<AiUrgencyPanelProps> = ({
  onFilterUrgency,
  activeUrgencyFilter,
  onOpenBulkSend
}) => {
  const {
    settings,
    urgencyCounts,
    urgencyAmounts,
    totalDebtorsCount,
    isAnalyzingAi,
    lastAiAnalyzedAt,
    aiAnalysisMessage,
    runBatchAiPrioritization,
    selectCustomersByUrgency
  } = useApp();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleRunAiAnalysis = async () => {
    const result = await runBatchAiPrioritization();
    if (result.success) {
      setToastMessage(result.message || `تم تحليل ${result.count} عميل بنجاح`);
    } else {
      setToastMessage(result.message || 'تعذر استكمال التحليل');
    }
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleSendUrgentOnly = () => {
    selectCustomersByUrgency('urgent_and_critical');
    onOpenBulkSend();
  };

  const highAndCriticalCount = urgencyCounts.critical + urgencyCounts.high;
  const highAndCriticalAmount = urgencyAmounts.critical + urgencyAmounts.high;

  return (
    <div className="mb-6 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-slate-700/60 relative overflow-hidden">
      {/* Decorative Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Row */}
      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin-slow" />
            <span>محرك الذكاء الاصطناعي Gemini 3.8 Flash • تحليل أولويات التحصيل</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <span>تصنيف إلحاح المديونيات بناءً على عمر الدين وحجم المبلغ</span>
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            يحلل الذكاء الاصطناعي مدة بقاء الدين (بالأيام) مع حجم الرصيد وسجل السداد، ليصنف المدينين إلى 4 درجات خطورة (حرج جداً، عالي، متوسط، منخفض) لتوجيه جهود التحصيل والإشعارات بدقة.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full lg:w-auto shrink-0">
          <button
            onClick={handleRunAiAnalysis}
            disabled={isAnalyzingAi || totalDebtorsCount === 0}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            title="إعادة تحليل كافة الديون بالذكاء الاصطناعي"
          >
            <RefreshCw className={`w-4 h-4 ${isAnalyzingAi ? 'animate-spin' : ''}`} />
            <span>{isAnalyzingAi ? 'جاري التحليل عبر Gemini...' : 'تحليل وتحديث الأولويات (Gemini)'}</span>
          </button>

          <button
            onClick={handleSendUrgentOnly}
            disabled={highAndCriticalCount === 0}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-rose-500 hover:bg-rose-400 text-white shadow-md shadow-rose-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            title="تحديد وإرسال رسائل فورية للحالات الحرجة والعالية فقط"
          >
            <Send className="w-4 h-4" />
            <span>إرسال للحالات الحرجة والعالية ({highAndCriticalCount})</span>
          </button>
        </div>
      </div>

      {/* Toast feedback if available */}
      {toastMessage && (
        <div className="relative z-10 mt-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-xs text-emerald-300 hover:text-white"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* 4 Urgency Level Interactive Cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-5">
        
        {/* 1. Critical (حرج جداً) */}
        <div
          onClick={() => onFilterUrgency(activeUrgencyFilter === 'critical' ? 'all' : 'critical')}
          className={`rounded-2xl p-4 transition-all cursor-pointer relative overflow-hidden border ${
            activeUrgencyFilter === 'critical'
              ? 'bg-rose-950/80 border-rose-400 ring-2 ring-rose-400/50'
              : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-rose-400/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-bold text-rose-300">حرج جداً (Critical)</span>
            </div>
            <span className="text-lg">🚨</span>
          </div>

          <div className="flex items-baseline justify-between mb-1">
            <span className="text-2xl font-black text-white font-mono-num">
              {urgencyCounts.critical}
            </span>
            <span className="text-xs font-semibold text-rose-300 font-mono-num">
              {urgencyAmounts.critical.toLocaleString('ar-EG')} {settings.currency}
            </span>
          </div>

          <p className="text-[11px] text-slate-300 line-clamp-2">
            ديون قديمة (تجاوزت 45 إلى 60 يوماً) أو مبالغ ضخمة تحتاج اتصالاً هاتفياً فورياً.
          </p>

          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-rose-300 font-bold">
            <span>{activeUrgencyFilter === 'critical' ? 'الفلتر نشط الآن' : 'انقر لعرض الحالات الحرجة'}</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* 2. High (أولوية عالية) */}
        <div
          onClick={() => onFilterUrgency(activeUrgencyFilter === 'high' ? 'all' : 'high')}
          className={`rounded-2xl p-4 transition-all cursor-pointer relative overflow-hidden border ${
            activeUrgencyFilter === 'high'
              ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-400/50'
              : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-amber-400/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-xs font-bold text-amber-300">أولوية عالية (High)</span>
            </div>
            <span className="text-lg">⚠️</span>
          </div>

          <div className="flex items-baseline justify-between mb-1">
            <span className="text-2xl font-black text-white font-mono-num">
              {urgencyCounts.high}
            </span>
            <span className="text-xs font-semibold text-amber-300 font-mono-num">
              {urgencyAmounts.high.toLocaleString('ar-EG')} {settings.currency}
            </span>
          </div>

          <p className="text-[11px] text-slate-300 line-clamp-2">
            مبالغ معتبرة أو عمر دين (30-45 يوماً) بحاجة لإشعار SMS حازم ومتابعة.
          </p>

          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-amber-300 font-bold">
            <span>{activeUrgencyFilter === 'high' ? 'الفلتر نشط الآن' : 'انقر لعرض العالية'}</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* 3. Medium (أولوية متوسطة) */}
        <div
          onClick={() => onFilterUrgency(activeUrgencyFilter === 'medium' ? 'all' : 'medium')}
          className={`rounded-2xl p-4 transition-all cursor-pointer relative overflow-hidden border ${
            activeUrgencyFilter === 'medium'
              ? 'bg-yellow-950/80 border-yellow-400 ring-2 ring-yellow-400/50'
              : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-yellow-400/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span className="text-xs font-bold text-yellow-300">أولوية متوسطة (Medium)</span>
            </div>
            <span className="text-lg">🟡</span>
          </div>

          <div className="flex items-baseline justify-between mb-1">
            <span className="text-2xl font-black text-white font-mono-num">
              {urgencyCounts.medium}
            </span>
            <span className="text-xs font-semibold text-yellow-300 font-mono-num">
              {urgencyAmounts.medium.toLocaleString('ar-EG')} {settings.currency}
            </span>
          </div>

          <p className="text-[11px] text-slate-300 line-clamp-2">
            رصيد متوسط أو عمر دين (15-30 يوماً) يحتاج متابعة روتينية وإشعار دوري.
          </p>

          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-yellow-300 font-bold">
            <span>{activeUrgencyFilter === 'medium' ? 'الفلتر نشط الآن' : 'انقر لعرض المتوسطة'}</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* 4. Low (أولوية منخفضة) */}
        <div
          onClick={() => onFilterUrgency(activeUrgencyFilter === 'low' ? 'all' : 'low')}
          className={`rounded-2xl p-4 transition-all cursor-pointer relative overflow-hidden border ${
            activeUrgencyFilter === 'low'
              ? 'bg-emerald-950/80 border-emerald-400 ring-2 ring-emerald-400/50'
              : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-emerald-400/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold text-emerald-300">أولوية منخفضة (Low)</span>
            </div>
            <span className="text-lg">🟢</span>
          </div>

          <div className="flex items-baseline justify-between mb-1">
            <span className="text-2xl font-black text-white font-mono-num">
              {urgencyCounts.low}
            </span>
            <span className="text-xs font-semibold text-emerald-300 font-mono-num">
              {urgencyAmounts.low.toLocaleString('ar-EG')} {settings.currency}
            </span>
          </div>

          <p className="text-[11px] text-slate-300 line-clamp-2">
            ديون حديثة (أقل من 15 يوماً) أو مبالغ بسيطة، عملاء ملتزمون بسداد منتظم.
          </p>

          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-emerald-300 font-bold">
            <span>{activeUrgencyFilter === 'low' ? 'الفلتر نشط الآن' : 'انقر لعرض المنخفضة'}</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

      </div>

      {/* Footer Info strip */}
      <div className="relative z-10 mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>آخر تقييم للذكاء الاصطناعي:</span>
            <strong className="text-slate-200">
              {lastAiAnalyzedAt
                ? new Date(lastAiAnalyzedAt).toLocaleDateString('ar-EG', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'جاهز للتقييم الأول'}
            </strong>
          </span>

          {activeUrgencyFilter !== 'all' && (
            <button
              onClick={() => onFilterUrgency('all')}
              className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
            >
              إلغاء فلتر الاستعجال والعودة للكل
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span>إجمالي المبالغ عالية الخطورة:</span>
          <strong className="text-rose-300 font-mono-num">
            {highAndCriticalAmount.toLocaleString('ar-EG')} {settings.currency}
          </strong>
        </div>
      </div>

    </div>
  );
};
