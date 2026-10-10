export interface Transaction {
  id: string;
  date: string;
  type: 'debit' | 'credit'; // debit = عليه (مشتريات/دين جديد), credit = له (سداد/دفعة)
  amount: number;
  note: string;
  receiptNumber?: string;
}

export type CustomerStatus = 'unnotified' | 'sent' | 'postponed' | 'exempt';
export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

export interface CustomerUrgencyAnalysis {
  customerId: string;
  urgencyLevel: UrgencyLevel;
  urgencyScore: number; // 1-100
  debtDurationDays: number;
  reasoning: string;
  suggestedAction: string;
  recommendedTone: 'urgent' | 'firm' | 'friendly' | 'formal';
  riskFactors: string[];
  recommendedFollowUpDays: number;
  analyzedAt: string;
}

export interface InstallmentScheduleItem {
  installmentNumber: number;
  dueDate: string; // YYYY-MM-DD
  amount: number;
  label?: string; // e.g. "دفعة مقدمة فورية", "القسط الأول"
  status: 'pending' | 'paid';
}

export interface InstallmentPlan {
  id: string;
  planTitle: string; // e.g. "خطة سداد عاجلة ومكثفة"
  strategyType: 'fast_recovery' | 'balanced' | 'relaxed';
  totalDebt: number;
  downPayment: number;
  numberOfInstallments: number;
  interval: 'weekly' | 'biweekly' | 'monthly';
  installmentAmount: number;
  startDate: string;
  endDate: string;
  schedule: InstallmentScheduleItem[];
  reasoning: string;
  smsMessageText: string;
  createdAt: string;
}

export type WhatsAppApiProvider = 'meta_cloud' | 'ultramsg' | 'green_api' | 'custom_webhook' | 'simulation';

export interface WhatsAppApiConfig {
  enabled: boolean;
  provider: WhatsAppApiProvider;
  metaPhoneNumberId?: string;
  metaAccessToken?: string;
  ultramsgInstanceId?: string;
  ultramsgToken?: string;
  greenApiInstanceId?: string;
  greenApiToken?: string;
  customEndpointUrl?: string;
  customApiKey?: string;
  customHeadersJson?: string;
  autoFallbackToWeb: boolean;
  delayBetweenBatchMs: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  debit: number; // المبلغ الذي عليه (مدين)
  credit: number; // المبلغ الذي له (دائن)
  balance: number; // صافي الرصيد = debit - credit (إذا كان موجباً فالعميل مدين)
  notes?: string;
  category?: string; // تصنيف العميل
  accountNumber?: string;
  status: CustomerStatus; // حالة الإرسال
  lastSentAt?: string | null;
  lastSentChannel?: 'sms' | 'whatsapp' | 'whatsapp_api' | null;
  transactions: Transaction[];
  createdAt: string;
  updatedAt: string;

  // AI Urgency Categorization fields
  urgencyLevel?: UrgencyLevel;
  urgencyScore?: number; // 1-100
  urgencyReasoning?: string;
  urgencySuggestedAction?: string;
  urgencyTone?: 'urgent' | 'firm' | 'friendly' | 'formal';
  urgencyRiskFactors?: string[];
  urgencyDebtDurationDays?: number;
  urgencyAnalyzedAt?: string;

  // Active Installment Plan
  activeInstallmentPlan?: InstallmentPlan;
}

export interface SmsTemplate {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
}

export interface SendLogEntry {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  amount: number;
  messageText: string;
  channel: 'sms' | 'whatsapp' | 'whatsapp_api';
  timestamp: string;
  status: 'sent' | 'delivered' | 'failed';
  apiMessageId?: string;
  apiResponse?: string;
}

export interface AppSettings {
  storeName: string;
  storePhone: string;
  currency: string;
  countryCode: string;
  autoFormatPhone: boolean;
  whatsappApi: WhatsAppApiConfig;
}

export interface SqliteTableInfo {
  name: string;
  rowCount: number;
  columns: string[];
}

export interface ColumnMapping {
  nameCol: string;
  phoneCol: string;
  debitCol: string;
  creditCol: string;
  balanceCol: string;
  notesCol?: string;
  accountNumberCol?: string;
}
