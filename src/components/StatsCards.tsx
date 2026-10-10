import React from 'react';
import {
  TrendingUp,
  Users,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  CheckSquare
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface StatsCardsProps {
  onSelectAllDebtors: () => void;
  onOpenBulkSend: () => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  onSelectAllDebtors,
  onOpenBulkSend
}) => {
  const {
    netTotalDebt,
    totalDebitAmount,
    totalCreditAmount,
    totalDebtorsCount,
    sentDebtorsCount,
    pendingDebtorsCount,
    selectedCustomerIds,
    settings,
    urgencyCounts
  } = useApp();

  const sendProgressPercent = totalDebtorsCount > 0
    ? Math.round((sentDebtorsCount / totalDebtorsCount) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* 1. Net Total Debt */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-rose-200 transition-all">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500">إجمالي المديونية المستحقة</span>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-2xl sm:text-3xl font-black text-rose-600 font-mono-num">
            {netTotalDebt.toLocaleString('ar-EG')}
          </span>
          <span className="text-xs font-medium text-slate-500">
            {settings.currency}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>مطلوبة من المدينين</span>
          <span className="text-rose-600 font-semibold">{totalDebtorsCount} عميل مدين</span>
        </div>
      </div>

      {/* 2. Debtors Count & AI Urgency Quick View */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-amber-200 transition-all">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500">العملاء المدينون وتصنيف الذكاء الاصطناعي</span>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono-num">
            {totalDebtorsCount}
          </span>
          <span className="text-xs font-medium text-slate-500">عميل عليهم مبالغ</span>
        </div>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold text-[10px]">
              🚨 {urgencyCounts.critical} حرج
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 font-bold text-[10px]">
              ⚠️ {urgencyCounts.high} عالي
            </span>
          </div>
          <button
            onClick={onSelectAllDebtors}
            className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 hover:underline transition-all"
          >
            <span>تحديد الكل</span>
          </button>
        </div>
      </div>

      {/* 3. Debit vs Credit Total */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-teal-500" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500">حركة الحسابات العامة</span>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1.5 mb-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
              إجمالي عليه (مدين):
            </span>
            <span className="font-bold text-rose-600 font-mono-num">
              {totalDebitAmount.toLocaleString('ar-EG')}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
              إجمالي له (مسدد/دائن):
            </span>
            <span className="font-bold text-emerald-600 font-mono-num">
              {totalCreditAmount.toLocaleString('ar-EG')}
            </span>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 text-left">
          {settings.currency}
        </div>
      </div>

      {/* 4. SMS Notification Status */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-200 transition-all">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500">حالة إشعارات SMS</span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Send className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {sentDebtorsCount} تم الإرسال
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
            <Clock className="w-3.5 h-3.5" />
            {pendingDebtorsCount} بانتظار الإرسال
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${sendProgressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>نسبة التغطية: {sendProgressPercent}%</span>
          {selectedCustomerIds.length > 0 && (
            <button
              onClick={onOpenBulkSend}
              className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              إرسال الآن ({selectedCustomerIds.length})
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
