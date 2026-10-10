import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  Plus,
  Trash2,
  CheckCircle2,
  Smartphone,
  Star,
  Copy,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SmsTemplate } from '../types';
import { calculateSmsSegments, renderTemplate } from '../utils/smsHelper';

interface SmsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmsTemplateModal: React.FC<SmsTemplateModalProps> = ({
  isOpen,
  onClose
}) => {
  const { templates, saveTemplate, deleteTemplate, setDefaultTemplate, settings, customers } = useApp();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates.find((t) => t.isDefault)?.id || templates[0]?.id || ''
  );

  const [isEditing, setIsEditing] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');

  if (!isOpen) return null;

  const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const sampleCustomer = customers[0] || {
    id: 'demo',
    name: 'عادل حزام',
    phone: '777123456',
    debit: 85000,
    credit: 15000,
    balance: 70000,
    status: 'unnotified',
    transactions: [],
    createdAt: '',
    updatedAt: ''
  };

  const previewText = currentTemplate
    ? renderTemplate(currentTemplate.content, sampleCustomer, settings)
    : '';

  const segmentInfo = calculateSmsSegments(currentTemplate ? currentTemplate.content : '');

  const availableVariables = [
    { tag: '{اسم_العميل}', label: 'اسم العميل' },
    { tag: '{المبلغ_المستحق}', label: 'المبلغ المستحق (الصافي)' },
    { tag: '{المبلغ_عليه}', label: 'ما عليه (مدين)' },
    { tag: '{المبلغ_له}', label: 'ما له (دائن)' },
    { tag: '{العملة}', label: 'العملة' },
    { tag: '{اسم_المتجر}', label: 'اسم المتجر' },
    { tag: '{رقم_التواصل}', label: 'رقم هاتف المتجر' },
    { tag: '{تاريخ_اليوم}', label: 'تاريخ اليوم' }
  ];

  const handleInsertTag = (tag: string) => {
    if (isEditing) {
      setTemplateContent((prev) => prev + ' ' + tag);
    } else if (currentTemplate) {
      const updated = {
        ...currentTemplate,
        content: currentTemplate.content + ' ' + tag
      };
      saveTemplate(updated);
    }
  };

  const handleStartCreateNew = () => {
    setIsEditing(true);
    setTemplateName('قالب رسالة جديد');
    setTemplateContent('الأخ {اسم_العميل}، نود تذكيركم بأن رصيد حسابكم لدى {اسم_المتجر} هو {المبلغ_المستحق} {العملة}. شكراً لكم.');
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || !templateContent.trim()) return;

    const newId = `tpl_${Date.now()}`;
    const newTpl: SmsTemplate = {
      id: newId,
      name: templateName.trim(),
      content: templateContent.trim(),
      isDefault: templates.length === 0
    };

    saveTemplate(newTpl);
    setSelectedTemplateId(newId);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                إدارة وتخصيص قوالب رسائل SMS وواتساب
              </h2>
              <p className="text-xs text-slate-500">
                تخصيص نصوص الإشعارات التلقائية بالمتغيرات الديناميكية
              </p>
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
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Column: Templates List */}
          <div className="md:col-span-4 space-y-3 border-b md:border-b-0 md:border-l border-slate-200 pb-4 md:pb-0 md:pl-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">القوالب المتوفرة:</span>
              <button
                onClick={handleStartCreateNew}
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>قالب جديد</span>
              </button>
            </div>

            <div className="space-y-2">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => {
                    setSelectedTemplateId(tpl.id);
                    setIsEditing(false);
                  }}
                  className={`p-3 rounded-2xl border text-right cursor-pointer transition-all ${
                    selectedTemplateId === tpl.id && !isEditing
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-2xs ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {tpl.name}
                    </span>
                    {tpl.isDefault && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                        افتراضي
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {tpl.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Template Editor & Simulation */}
          <div className="md:col-span-8 space-y-5">
            
            {/* Create New Form */}
            {isEditing ? (
              <form onSubmit={handleSaveNew} className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800">إنشاء قالب جديد:</h4>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-xs text-slate-500 hover:underline"
                  >
                    إلغاء
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">عنوان القالب</label>
                  <input
                    type="text"
                    required
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="مثال: تذكير نهاية الشهر"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">نص الرسالة</label>
                  <textarea
                    rows={4}
                    required
                    value={templateContent}
                    onChange={(e) => setTemplateContent(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                  />
                </div>

                {/* Variable Tag inserters */}
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1.5 font-semibold">
                    اضغط لإدراج متغير ديناميكي في النص:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableVariables.map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => handleInsertTag(v.tag)}
                        className="px-2 py-1 rounded-lg bg-emerald-100/70 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold transition-all"
                      >
                        + {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    حفظ القالب الجديد
                  </button>
                </div>
              </form>
            ) : currentTemplate ? (
              <div className="space-y-4">
                
                {/* Active Template Controls */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{currentTemplate.name}</h3>
                    {!currentTemplate.isDefault && (
                      <button
                        onClick={() => setDefaultTemplate(currentTemplate.id)}
                        className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1 font-bold"
                      >
                        <Star className="w-3.5 h-3.5" />
                        <span>تعيين كافتراضي</span>
                      </button>
                    )}
                  </div>

                  {templates.length > 1 && (
                    <button
                      onClick={() => deleteTemplate(currentTemplate.id)}
                      className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف القالب</span>
                    </button>
                  )}
                </div>

                {/* Content Editor */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">نص القالب:</label>
                  <textarea
                    rows={4}
                    value={currentTemplate.content}
                    onChange={(e) => {
                      saveTemplate({
                        ...currentTemplate,
                        content: e.target.value
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed font-medium"
                  />
                </div>

                {/* Variable Buttons */}
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1.5 font-semibold">
                    اضغط لإدراج متغير في النص:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableVariables.map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => handleInsertTag(v.tag)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 text-[11px] font-bold transition-all border border-slate-200"
                      >
                        + {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Segment counter */}
                <div className="flex items-center justify-between text-xs text-slate-500 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span>
                    عدد الحروف: <strong className="text-slate-800 font-mono-num">{segmentInfo.charCount}</strong>
                  </span>
                  <span>
                    عدد أجزاء SMS: <strong className="text-emerald-700 font-mono-num">{segmentInfo.segments}</strong>
                  </span>
                  <span>
                    المتبقي في الجزء: <strong className="text-slate-600 font-mono-num">{segmentInfo.remainingInSegment}</strong> حرف
                  </span>
                </div>

                {/* Phone Simulation Preview */}
                <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-emerald-600" />
                      معاينة حية على هاتف العميل ({sampleCustomer.name}):
                    </span>
                  </div>

                  {/* SMS Bubble */}
                  <div className="bg-emerald-600 text-white rounded-2xl rounded-tr-xs p-4 text-xs sm:text-sm leading-relaxed shadow-sm font-medium">
                    {previewText}
                  </div>
                </div>

              </div>
            ) : null}

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all"
          >
            حفظ وإغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
