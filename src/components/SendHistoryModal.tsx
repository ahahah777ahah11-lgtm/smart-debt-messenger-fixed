import React, { useState } from 'react';
import {
  X,
  History,
  Send,
  MessageCircle,
  Download,
  Trash2,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SendHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SendHistoryModal: React.FC<SendHistoryModalProps> = ({
  isOpen,
  onClose
}) => {
  const { logs, settings } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredLogs = logs.filter(
    (l) =>
      l.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone.includes(searchTerm) ||
      l.messageText.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportLogsToCsv = () => {
    if (logs.length === 0) return;
    const header = 'م,اسم العميل,رقم الهاتف,المبلغ المستحق,القناة,تاريخ ووقت الإرسال,نص الرسالة';
    const rows = logs.map((l, i) =>
      `"${i + 1}","${l.customerName}","${l.phone}","${l.amount}","${l.channel}","${new Date(l.timestamp).toLocaleString('ar-EG')}","${l.messageText.replace(/"/g, '""')}"`
    );
    const csvContent = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `سجل_رسائل_الديون_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                سجل الرسائل المرسلة ومتابعة الحالات
              </h2>
              <p className="text-xs text-slate-500">
                تتبع جميع إشعارات SMS والواتساب التي تم إرسالها للعملاء
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {logs.length > 0 && (
              <button
                onClick={exportLogsToCsv}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50 flex items-center gap-1.5 shadow-2xs transition-all"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>تصدير السجل CSV</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث في سجل الرسائل بالاسم، الرقم، أو النص..."
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Table / List */}
        <div className="p-4 overflow-y-auto flex-1">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <History className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600">لا توجد رسائل مرسلة مسجلة حتى الآن</p>
              <p className="text-xs text-slate-400">
                عند إرسال أي رسالة SMS أو واتساب للعملاء، ستظهر تفاصيلها وحالتها هنا تلقائياً.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3 border-b">العميل</th>
                    <th className="p-3 border-b">الهاتف</th>
                    <th className="p-3 border-b">المبلغ المستحق</th>
                    <th className="p-3 border-b">القناة</th>
                    <th className="p-3 border-b">تاريخ ووقت الإرسال</th>
                    <th className="p-3 border-b">نص الرسالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-bold text-slate-900">{log.customerName}</td>
                      <td className="p-3 font-mono-num text-slate-600" dir="ltr">{log.phone}</td>
                      <td className="p-3 font-black text-rose-600 font-mono-num">
                        {log.amount.toLocaleString('ar-EG')} {settings.currency}
                      </td>
                      <td className="p-3">
                        {log.channel === 'sms' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <Send className="w-3 h-3" />
                            SMS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                            <MessageCircle className="w-3 h-3" />
                            واتساب
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 font-mono-num text-[11px]">
                        {new Date(log.timestamp).toLocaleString('ar-EG', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs truncate" title={log.messageText}>
                        {log.messageText}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>إجمالي الرسائل المسجلة: <strong>{logs.length}</strong></span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
