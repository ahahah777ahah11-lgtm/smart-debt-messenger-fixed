import React, { useRef } from 'react';
import {
  X,
  Settings,
  Store,
  DollarSign,
  Phone,
  Database,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    settings,
    updateSettings,
    customers,
    templates,
    logs,
    resetToSampleData,
    clearAllData,
    importCustomers
  } = useApp();

  const backupInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportBackup = () => {
    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      templates,
      customers,
      logs
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `نسخة_احتياطية_ديون_العملاء_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.settings) updateSettings(parsed.settings);
        if (parsed.customers && Array.isArray(parsed.customers)) {
          importCustomers(parsed.customers, 'replace');
        }
        alert('تم استعادة النسخة الاحتياطية بنجاح!');
        onClose();
      } catch (err: any) {
        alert('الملف غير صالح كنسخة احتياطية: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">إعدادات النظام والنسخ الاحتياطي</h2>
              <p className="text-xs text-slate-500">تخصيص بيانات المتجر والعملة وحفظ البيانات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          
          {/* Store Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Store className="w-4 h-4 text-emerald-600" />
              <span>بيانات المتجر والمراسلات:</span>
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">اسم المتجر / المحل</label>
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) => updateSettings({ storeName: e.target.value })}
                placeholder="مركز الأمل للتجارة"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">رقم هاتف المتجر</label>
                <input
                  type="tel"
                  value={settings.storePhone}
                  onChange={(e) => updateSettings({ storePhone: e.target.value })}
                  placeholder="777000000"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-mono-num text-left focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">الرمز الدولي الافتراضي</label>
                <select
                  value={settings.countryCode}
                  onChange={(e) => updateSettings({ countryCode: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  dir="ltr"
                >
                  <option value="+967">+967 (اليمن)</option>
                  <option value="+966">+966 (السعودية)</option>
                  <option value="+971">+971 (الإمارات)</option>
                  <option value="+968">+968 (عمان)</option>
                  <option value="+965">+965 (الكويت)</option>
                  <option value="+962">+962 (الأردن)</option>
                  <option value="+20">+20 (مصر)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">العملة الأساسية</label>
              <input
                type="text"
                value={settings.currency}
                onChange={(e) => updateSettings({ currency: e.target.value })}
                placeholder="ريال يمني، ريال سعودي، دولار..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Backup & Restore */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-blue-600" />
              <span>النسخ الاحتياطي وحفظ البيانات:</span>
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>تصدير نسخة احتياطية</span>
              </button>

              <button
                type="button"
                onClick={() => backupInputRef.current?.click()}
                className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>استعادة من ملف</span>
              </button>
              <input
                ref={backupInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportBackup(file);
                }}
              />
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (confirm('هل ترغب في إعادة ضبط البيانات وتحميل النموذج التجريبي الأولي؟')) {
                    resetToSampleData();
                    onClose();
                  }
                }}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة تحميل النموذج التجريبي</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('تحذير: سيتم مسح كافة العملاء والحركات المسجلة. هل أنت متأكد؟')) {
                    clearAllData();
                    onClose();
                  }
                }}
                className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1 font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح كافة البيانات</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 text-white hover:bg-slate-800"
          >
            حفظ وإغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
