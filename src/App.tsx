/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { StatsCards } from './components/StatsCards';
import { CustomerList } from './components/CustomerList';
import { ImportModal } from './components/ImportModal';
import { AddTransactionModal } from './components/AddTransactionModal';
import { CustomerDetailsModal } from './components/CustomerDetailsModal';
import { EditCustomerModal } from './components/EditCustomerModal';
import { BulkSendWizardModal } from './components/BulkSendWizardModal';
import { SmsTemplateModal } from './components/SmsTemplateModal';
import { SendHistoryModal } from './components/SendHistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { ExportReportModal } from './components/ExportReportModal';
import { InstallmentPlanModal } from './components/InstallmentPlanModal';
import { HtmlToApkBuilderModal } from './components/HtmlToApkBuilderModal';
import { Customer, UrgencyLevel } from './types';
import { AiUrgencyPanel } from './components/AiUrgencyPanel';
import {
  FileUp,
  Database,
  Send,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  FolderOpen,
  ArrowRight,
  Plus,
  Printer,
  Smartphone
} from 'lucide-react';

function MainDashboard() {
  const {
    settings,
    selectAllDebtors,
    totalDebtorsCount,
    netTotalDebt
  } = useApp();

  // Modals state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importInitialTab, setImportInitialTab] = useState<'db' | 'excel' | 'csv' | 'pdf' | 'manual'>('db');
  const [isBulkSendOpen, setIsBulkSendOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportReportOpen, setIsExportReportOpen] = useState(false);
  const [isApkBuilderOpen, setIsApkBuilderOpen] = useState(false);
  const [exportReportScope, setExportReportScope] = useState<'debtors' | 'all' | 'selected'>('debtors');
  const [activeUrgencyFilter, setActiveUrgencyFilter] = useState<UrgencyLevel | 'all'>('all');

  // Active customer actions
  const [activeTransactionCustomer, setActiveTransactionCustomer] = useState<Customer | null>(null);
  const [activeDetailsCustomer, setActiveDetailsCustomer] = useState<Customer | null>(null);
  const [activeEditCustomer, setActiveEditCustomer] = useState<Customer | null>(null);
  const [activeInstallmentCustomer, setActiveInstallmentCustomer] = useState<Customer | null>(null);

  const handleOpenImportWithTab = (tab: 'db' | 'excel' | 'csv' | 'pdf' | 'manual') => {
    setImportInitialTab(tab);
    setIsImportOpen(true);
  };

  const handleOpenExportReport = (scope: 'debtors' | 'all' | 'selected' = 'debtors') => {
    setExportReportScope(scope);
    setIsExportReportOpen(true);
  };

  const handleSelectAllDebtorsAndSend = () => {
    selectAllDebtors();
    setIsBulkSendOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-16">
      
      {/* Navigation Header */}
      <Navbar
        onOpenImport={() => handleOpenImportWithTab('db')}
        onOpenAddCustomer={() => handleOpenImportWithTab('manual')}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenBulkSend={() => setIsBulkSendOpen(true)}
        onOpenExportReport={() => handleOpenExportReport('debtors')}
        onOpenApkBuilder={() => setIsApkBuilderOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Welcome / Quick Callout Banner for Adel */}
        <div className="mb-6 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -right-10 -top-10 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>جاهز لاستيراد قاعدة البيانات (.db) من مجلد «حسابات 2»</span>
              </div>
              
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight">
                نظام إدارة ومتابعة ديون العملاء وإرسال رسائل SMS
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                استورد ملفات قاعدة البيانات <strong className="text-emerald-300">SQLite (.db)</strong>، وجداول <strong className="text-blue-300">Excel</strong> و<strong className="text-amber-300">CSV</strong> وكشوفات <strong className="text-rose-300">PDF</strong>، ثم أرسل إشعارات مخصصة بالاسم والمبلغ المستحق لكل عميل بنقرة واحدة!
              </p>
            </div>

            {/* Quick Hero Actions */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto shrink-0">
              <button
                onClick={() => handleOpenImportWithTab('db')}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
              >
                <Database className="w-4 h-4" />
                <span>استيراد ملف قاعدة البيانات (.db)</span>
              </button>

              <button
                onClick={handleSelectAllDebtorsAndSend}
                disabled={totalDebtorsCount === 0}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl text-xs sm:text-sm font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>إرسال لجميع المدينين ({totalDebtorsCount})</span>
              </button>
            </div>
          </div>

          {/* Quick Format Badges */}
          <div className="relative z-10 mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <span className="font-semibold text-white">الصيغ المدعومة للاستيراد:</span>
            
            <button
              onClick={() => handleOpenImportWithTab('db')}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>قاعدة بيانات هاتف (.db / .sqlite)</span>
            </button>

            <button
              onClick={() => handleOpenImportWithTab('excel')}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-blue-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>جداول Excel (.xlsx / .xls)</span>
            </button>

            <button
              onClick={() => handleOpenImportWithTab('csv')}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>ملف نصي CSV</span>
            </button>

            <button
              onClick={() => handleOpenImportWithTab('pdf')}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>كشف حساب PDF</span>
            </button>

            <button
              onClick={() => handleOpenExportReport('debtors')}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-200 border border-emerald-400/30 flex items-center gap-1.5 transition-colors cursor-pointer font-bold"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-300" />
              <span>طباعة كشف ديون A4 / تصدير PDF للأرشفة</span>
            </button>

            <button
              onClick={() => setIsApkBuilderOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-200 border border-indigo-400/40 flex items-center gap-1.5 transition-colors cursor-pointer font-bold shadow-xs"
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-300" />
              <span>بناء حزمة أندرويد (HTML to APK Builder ZIP)</span>
            </button>
          </div>
        </div>

        {/* Live Statistics */}
        <StatsCards
          onSelectAllDebtors={selectAllDebtors}
          onOpenBulkSend={() => setIsBulkSendOpen(true)}
        />

        {/* AI Debt Urgency & Prioritization Hub (Gemini AI) */}
        <AiUrgencyPanel
          onFilterUrgency={setActiveUrgencyFilter}
          activeUrgencyFilter={activeUrgencyFilter}
          onOpenBulkSend={() => setIsBulkSendOpen(true)}
        />

        {/* Main Customer Table & Actions */}
        <CustomerList
          onOpenAddTransaction={(customer) => setActiveTransactionCustomer(customer)}
          onOpenCustomerDetails={(customer) => setActiveDetailsCustomer(customer)}
          onOpenEditCustomer={(customer) => setActiveEditCustomer(customer)}
          onOpenBulkSend={() => setIsBulkSendOpen(true)}
          onOpenExportReport={handleOpenExportReport}
          onOpenInstallmentPlan={(customer) => setActiveInstallmentCustomer(customer)}
          activeUrgencyFilter={activeUrgencyFilter}
          onChangeUrgencyFilter={setActiveUrgencyFilter}
        />

      </main>

      {/* MODALS */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        initialTab={importInitialTab}
      />

      <AddTransactionModal
        customer={activeTransactionCustomer}
        isOpen={!!activeTransactionCustomer}
        onClose={() => setActiveTransactionCustomer(null)}
      />

      <CustomerDetailsModal
        customer={activeDetailsCustomer}
        isOpen={!!activeDetailsCustomer}
        onClose={() => setActiveDetailsCustomer(null)}
        onOpenAddTransaction={(cust) => {
          setActiveDetailsCustomer(null);
          setActiveTransactionCustomer(cust);
        }}
        onOpenInstallmentPlan={(cust) => {
          setActiveInstallmentCustomer(cust);
        }}
      />

      <EditCustomerModal
        customer={activeEditCustomer}
        isOpen={!!activeEditCustomer}
        onClose={() => setActiveEditCustomer(null)}
      />

      <BulkSendWizardModal
        isOpen={isBulkSendOpen}
        onClose={() => setIsBulkSendOpen(false)}
      />

      <SmsTemplateModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
      />

      <SendHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <ExportReportModal
        isOpen={isExportReportOpen}
        onClose={() => setIsExportReportOpen(false)}
        defaultScope={exportReportScope}
      />

      <InstallmentPlanModal
        customer={activeInstallmentCustomer}
        isOpen={!!activeInstallmentCustomer}
        onClose={() => setActiveInstallmentCustomer(null)}
      />

      <HtmlToApkBuilderModal
        isOpen={isApkBuilderOpen}
        onClose={() => setIsApkBuilderOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainDashboard />
    </AppProvider>
  );
}
