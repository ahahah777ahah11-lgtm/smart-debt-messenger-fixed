import React from 'react';
import {
  FileUp,
  UserPlus,
  MessageSquare,
  History,
  Settings as SettingsIcon,
  Store,
  DollarSign,
  Send,
  Database,
  Printer,
  Smartphone
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface NavbarProps {
  onOpenImport: () => void;
  onOpenAddCustomer: () => void;
  onOpenTemplates: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenBulkSend: () => void;
  onOpenExportReport: () => void;
  onOpenApkBuilder: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenImport,
  onOpenAddCustomer,
  onOpenTemplates,
  onOpenHistory,
  onOpenSettings,
  onOpenBulkSend,
  onOpenExportReport,
  onOpenApkBuilder
}) => {
  const { settings, updateSettings, selectedCustomerIds, totalDebtorsCount } = useApp();

  const currencies = [
    'ريال يمني',
    'ريال سعودي',
    'دولار أمريكي',
    'درهم إماراتي',
    'جنيه مصري',
    'دينار أردني',
    'دينار كويتي'
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          
          {/* Logo & Store Branding */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 leading-tight">
                  {settings.storeName || 'إدارة ديون العملاء'}
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  نظام SMS الذكي
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                استيراد من DB/SQLite وExcel وPDF مع إشعارات SMS وواتساب
              </p>
            </div>
          </div>

          {/* Currency Switcher */}
          <div className="hidden md:flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200">
            <DollarSign className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-600 font-medium">العملة:</span>
            <select
              value={settings.currency}
              onChange={(e) => updateSettings({ currency: e.target.value })}
              className="bg-transparent text-xs font-semibold text-slate-800 border-none focus:outline-none cursor-pointer"
            >
              {currencies.map((curr) => (
                <option key={curr} value={curr}>
                  {curr}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Bulk Send Button if any selected */}
            {selectedCustomerIds.length > 0 && (
              <button
                onClick={onOpenBulkSend}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all animate-pulse"
              >
                <Send className="w-4 h-4" />
                <span>إرسال للمحددين ({selectedCustomerIds.length})</span>
              </button>
            )}

            {/* Import Button (Prominent) */}
            <button
              onClick={onOpenImport}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition-all"
            >
              <FileUp className="w-4 h-4" />
              <span>استيراد ملف</span>
              <span className="hidden lg:inline-flex text-[10px] bg-emerald-700/60 px-1.5 py-0.5 rounded text-emerald-100">
                DB / Excel / PDF
              </span>
            </button>

            {/* Add Customer Button */}
            <button
              onClick={onOpenAddCustomer}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200"
            >
              <UserPlus className="w-4 h-4 text-slate-600" />
              <span>عميل جديد</span>
            </button>

            {/* Templates */}
            <button
              onClick={onOpenTemplates}
              title="قوالب الرسائل"
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200 flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4 text-slate-600" />
              <span className="hidden xl:inline">قوالب SMS</span>
            </button>

            {/* Print & Export Report */}
            <button
              onClick={onOpenExportReport}
              title="طباعة كشف الديون وتصدير PDF / Excel للأرشفة الورقية"
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xs flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">طباعة وأرشفة (PDF/Excel)</span>
            </button>

            {/* HTML to APK Builder Button */}
            <button
              onClick={onOpenApkBuilder}
              title="تصدير حزمة تطبيق أندرويد (HTML to APK Builder ZIP)"
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-indigo-200" />
              <span className="hidden lg:inline">بناء APK</span>
            </button>

            {/* History Log */}
            <button
              onClick={onOpenHistory}
              title="سجل الرسائل المرسلة"
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200 flex items-center gap-1.5"
            >
              <History className="w-4 h-4 text-slate-600" />
              <span className="hidden xl:inline">سجل الإرسال</span>
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              title="الإعدادات"
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all border border-slate-200"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
