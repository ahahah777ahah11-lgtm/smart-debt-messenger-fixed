import React, { useState } from 'react';
import { X, PlusCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Customer } from '../types';

interface AddTransactionModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  customer,
  isOpen,
  onClose
}) => {
  const { addTransaction, settings } = useApp();

  const [type, setType] = useState<'debit' | 'credit'>('debit');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [note, setNote] = useState('');

  if (!isOpen || !customer) return null;

  const numAmount = Number(amount) || 0;
  
  // Calculate projected new balance
  let projectedDebit = customer.debit;
  let projectedCredit = customer.credit;
  if (type === 'debit') {
    projectedDebit += numAmount;
  } else {
    projectedCredit += numAmount;
  }
  const projectedBalance = projectedDebit - projectedCredit;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) return;

    addTransaction(customer.id, {
      type,
      amount: numAmount,
      date,
      receiptNumber: receiptNumber.trim() || undefined,
      note: note.trim() || (type === 'debit' ? 'مديونية جديدة' : 'سداد دفعة نقدية')
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">إضافة حركة مالية للحساب</h3>
              <p className="text-xs text-slate-500 font-semibold">{customer.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Transaction Type Radio Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">نوع الحركة المالية:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('debit')}
                className={`py-3 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  type === 'debit'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-2xs ring-2 ring-rose-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>مبلغ عليه (مديونية جديدة)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('credit')}
                className={`py-3 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  type === 'credit'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-2xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <span>مبلغ له (سداد / دفعة)</span>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              المبلغ ({settings.currency}) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0.01"
              step="any"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0.00"
              className={`w-full bg-slate-50 border rounded-xl p-3 text-base font-black font-mono-num text-left focus:outline-none focus:ring-2 ${
                type === 'debit'
                  ? 'border-rose-200 text-rose-600 focus:ring-rose-500/30'
                  : 'border-emerald-200 text-emerald-600 focus:ring-emerald-500/30'
              }`}
              dir="ltr"
            />
          </div>

          {/* Date & Receipt */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">التاريخ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الفاتورة / السند</label>
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="INV-001 أو REC-50"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Note / Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">البيان / ملاحظة الحركة</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={type === 'debit' ? 'مثال: شراء بضاعة إضافية' : 'مثال: سداد نقدي سند قبض'}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Projected Balance Preview */}
          <div className="p-3.5 bg-slate-100 rounded-2xl space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>الرصيد الحالي:</span>
              <span className="font-mono-num font-bold">{customer.balance.toLocaleString('ar-EG')} {settings.currency}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
              <span>الرصيد بعد تسجيل الحركة:</span>
              <span className={`font-mono-num font-black ${projectedBalance > 0 ? 'text-rose-600' : projectedBalance < 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                {projectedBalance.toLocaleString('ar-EG')} {settings.currency}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={numAmount <= 0}
              className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ الحركة المالية</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
