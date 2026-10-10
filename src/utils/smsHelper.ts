import { AppSettings, Customer, SmsTemplate } from '../types';

export const DEFAULT_TEMPLATES: SmsTemplate[] = [
  {
    id: 'tpl_1',
    name: 'تذكير لطيف ومحترم (الموصى به)',
    content: 'أخي الكريم {اسم_العميل}، نود تذكيركم بأن رصيد حسابكم المستحق لدى {اسم_المتجر} هو {المبلغ_المستحق} {العملة}. شاكرين ومقدرين حسن تعاونكم الدائم معنا.',
    isDefault: true
  },
  {
    id: 'tpl_2',
    name: 'إشعار مديونية رسمي ومفصل',
    content: 'السلام عليكم ورحمة الله، الأخ {اسم_العميل}، نلفت عنايتكم بأن المبلغ المستحق عليكم هو {المبلغ_المستحق} {العملة} (حساب: {المبلغ_عليه} - سداد: {المبلغ_له}). يرجى التكرم بزيارة {اسم_المتجر} أو التواصل على {رقم_التواصل} لتسوية الحساب. دمتم بخير.',
    isDefault: false
  },
  {
    id: 'tpl_3',
    name: 'تذكير عاجل للمتأخرات',
    content: 'الأخ {اسم_العميل}، نرجو التكرم بسرعة سداد المبلغ المستحق عليكم وقدره {المبلغ_المستحق} {العملة} لدى {اسم_المتجر} خلال اليومين القادمين، لمزيد من التفاصيل يرجى الاتصال بنا. شكراً لاهتمامكم.',
    isDefault: false
  },
  {
    id: 'tpl_4',
    name: 'إشعار شكر وتقدير بعد السداد',
    content: 'عزيزنا {اسم_العميل}، تم استلام دفعتكم بنجاح شاكرين لكم التزامكم وسرعة سدادكم. نسعد دوماً بخدمتكم في {اسم_المتجر}.',
    isDefault: false
  }
];

// Replace template placeholders with real customer and store data
export function renderTemplate(template: string, customer: Customer, settings: AppSettings): string {
  const today = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const dueAmount = Math.max(0, customer.balance).toLocaleString('ar-EG');
  const debitAmount = customer.debit.toLocaleString('ar-EG');
  const creditAmount = customer.credit.toLocaleString('ar-EG');

  return template
    .replace(/\{اسم_العميل\}|\{الاسم\}/g, customer.name)
    .replace(/\{المبلغ_المستحق\}|\{المبلغ\}|\{الرصيد\}/g, dueAmount)
    .replace(/\{المبلغ_عليه\}|\{عليه\}/g, debitAmount)
    .replace(/\{المبلغ_له\}|\{له\}/g, creditAmount)
    .replace(/\{العملة\}/g, settings.currency)
    .replace(/\{اسم_المتجر\}|\{المتجر\}/g, settings.storeName)
    .replace(/\{رقم_التواصل\}|\{هاتف_المتجر\}/g, settings.storePhone)
    .replace(/\{رقم_الحساب\}/g, customer.accountNumber || '')
    .replace(/\{تاريخ_اليوم\}|\{التاريخ\}/g, today);
}

// Clean and normalize phone number for SMS and WhatsApp
export function normalizePhoneNumber(phone: string, defaultCountryCode: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If already starts with +
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // If starts with 00
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.substring(2);
  }

  // Country specific normalization:
  // Yemen (+967): if starts with 7xx or 07xx
  if (defaultCountryCode.includes('967')) {
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith('967')) {
      return '+967' + cleaned;
    }
    return '+' + cleaned;
  }

  // Saudi (+966): if starts with 05xx or 5xx
  if (defaultCountryCode.includes('966')) {
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith('966')) {
      return '+966' + cleaned;
    }
    return '+' + cleaned;
  }

  // Fallback
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  const code = defaultCountryCode.replace(/[^\d]/g, '');
  if (!cleaned.startsWith(code)) {
    return `+${code}${cleaned}`;
  }
  return `+${cleaned}`;
}

// Create Universal SMS URI (compatible with Android, iOS, desktop)
export function createSmsUri(phone: string, message: string, defaultCountryCode: string): string {
  const normPhone = normalizePhoneNumber(phone, defaultCountryCode);
  const encodedBody = encodeURIComponent(message);
  
  // iOS uses `sms:+123456&body=...`, Android accepts `sms:+123456?body=...`
  // Modern web standards support `sms:PHONE?body=MSG`
  const isApple = typeof navigator !== 'undefined' && /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
  const separator = isApple ? '&' : '?';
  
  return `sms:${normPhone}${separator}body=${encodedBody}`;
}

// Create WhatsApp direct messaging URL
export function createWhatsAppUri(phone: string, message: string, defaultCountryCode: string): string {
  const normPhone = normalizePhoneNumber(phone, defaultCountryCode).replace('+', '');
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${normPhone}?text=${encodedText}`;
}

// Calculate SMS character length and segments (Arabic is Unicode UCS-2: 70 chars per single SMS, 67 for multipart)
export function calculateSmsSegments(text: string): {
  charCount: number;
  segments: number;
  remainingInSegment: number;
  isArabic: boolean;
} {
  const charCount = text.length;
  // If contains Arabic or non-GSM-7 characters
  const isArabic = /[\u0600-\u06FF]/.test(text);

  const singleLimit = isArabic ? 70 : 160;
  const multiLimit = isArabic ? 67 : 153;

  if (charCount <= singleLimit) {
    return {
      charCount,
      segments: charCount === 0 ? 0 : 1,
      remainingInSegment: singleLimit - charCount,
      isArabic
    };
  }

  const segments = Math.ceil(charCount / multiLimit);
  const remainingInSegment = segments * multiLimit - charCount;

  return {
    charCount,
    segments,
    remainingInSegment,
    isArabic
  };
}
