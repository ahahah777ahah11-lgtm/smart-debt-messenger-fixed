import { Customer, CustomerUrgencyAnalysis, UrgencyLevel } from '../types';

/**
 * Calculates debt duration in days based on customer transactions and creation date.
 * If transactions exist, calculates from the earliest debit date.
 * Also returns days since last payment (if any).
 */
export function calculateDebtDuration(customer: Customer, referenceDate = new Date()): {
  durationDays: number;
  daysSinceLastPayment: number | null;
  earliestDebitDate: string;
} {
  const refTime = referenceDate.getTime();
  let earliestDate: Date | null = null;
  let latestPaymentDate: Date | null = null;

  if (customer.transactions && customer.transactions.length > 0) {
    for (const tx of customer.transactions) {
      const txDate = new Date(tx.date);
      if (!isNaN(txDate.getTime())) {
        if (tx.type === 'debit') {
          if (!earliestDate || txDate < earliestDate) {
            earliestDate = txDate;
          }
        } else if (tx.type === 'credit') {
          if (!latestPaymentDate || txDate > latestPaymentDate) {
            latestPaymentDate = txDate;
          }
        }
      }
    }
  }

  // Fallback to customer creation date
  if (!earliestDate) {
    earliestDate = customer.createdAt ? new Date(customer.createdAt) : new Date();
  }

  const durationMs = Math.max(0, refTime - earliestDate.getTime());
  const durationDays = Math.max(1, Math.floor(durationMs / (1000 * 60 * 60 * 24)));

  let daysSinceLastPayment: number | null = null;
  if (latestPaymentDate) {
    const payDiffMs = Math.max(0, refTime - latestPaymentDate.getTime());
    daysSinceLastPayment = Math.floor(payDiffMs / (1000 * 60 * 60 * 24));
  }

  return {
    durationDays,
    daysSinceLastPayment,
    earliestDebitDate: earliestDate.toISOString().split('T')[0]
  };
}

/**
 * Visual styling and metadata for each Urgency Level
 */
export const URGENCY_CONFIG: Record<
  UrgencyLevel,
  {
    label: string;
    englishLabel: string;
    badgeBg: string;
    textColor: string;
    borderColor: string;
    dotColor: string;
    lightBg: string;
    icon: string;
    description: string;
  }
> = {
  critical: {
    label: 'حرج جداً',
    englishLabel: 'Critical',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-300',
    dotColor: 'bg-rose-600',
    lightBg: 'bg-rose-50',
    icon: '🚨',
    description: 'دين قديم و/أو بمبلغ مرتفع جداً يتطلب تحصيلاً فورياً واتصالاً مباشراً'
  },
  high: {
    label: 'أولوية عالية',
    englishLabel: 'High',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
    dotColor: 'bg-amber-500',
    lightBg: 'bg-amber-50',
    icon: '⚠️',
    description: 'مبلغ معتبر أو تجاوز 30 يوماً دون سداد منتظم، يحتاج إشعاراً عاجلاً'
  },
  medium: {
    label: 'أولوية متوسطة',
    englishLabel: 'Medium',
    badgeBg: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-300',
    dotColor: 'bg-yellow-500',
    lightBg: 'bg-yellow-50',
    icon: '🟡',
    description: 'رصيد ومعدل مدة متوسطة (15-30 يوماً)، عميل يحتاج متابعة روتينية'
  },
  low: {
    label: 'أولوية منخفضة',
    englishLabel: 'Low',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-300',
    dotColor: 'bg-emerald-500',
    lightBg: 'bg-emerald-50',
    icon: '🟢',
    description: 'دين حديث أو مبلغ بسيط أو عميل ملتزم بسداد منتظم'
  }
};

/**
 * Rule-based heuristic categorization fallback (used if API is unavailable or offline)
 */
export function calculateLocalUrgency(customer: Customer, currency = 'ريال'): CustomerUrgencyAnalysis {
  const { durationDays, daysSinceLastPayment } = calculateDebtDuration(customer);
  const balance = Math.max(0, customer.balance);

  // Score base from amount and duration
  // Amount factor (0 - 50 points)
  let amountScore = 0;
  if (balance >= 150000) amountScore = 50;
  else if (balance >= 100000) amountScore = 42;
  else if (balance >= 60000) amountScore = 32;
  else if (balance >= 30000) amountScore = 22;
  else amountScore = Math.min(15, Math.floor((balance / 30000) * 15));

  // Duration factor (0 - 50 points)
  let durationScore = 0;
  if (durationDays >= 60) durationScore = 50;
  else if (durationDays >= 40) durationScore = 40;
  else if (durationDays >= 25) durationScore = 28;
  else if (durationDays >= 14) durationScore = 18;
  else durationScore = Math.min(12, Math.floor((durationDays / 14) * 12));

  let totalScore = Math.min(100, Math.max(5, amountScore + durationScore));

  const riskFactors: string[] = [];
  if (balance >= 100000) {
    riskFactors.push(`مبلغ مالي مرتفع (${balance.toLocaleString('ar-EG')} ${currency})`);
  }
  if (durationDays >= 30) {
    riskFactors.push(`عمر الدين تجاوز ${durationDays} يوماً`);
  }
  if (daysSinceLastPayment && daysSinceLastPayment >= 20) {
    riskFactors.push(`انقطاع عن السداد منذ ${daysSinceLastPayment} يوماً`);
  } else if (!daysSinceLastPayment && durationDays > 10) {
    riskFactors.push('لا توجد أي دفعات سداد مسجلة');
  }

  let urgencyLevel: UrgencyLevel = 'low';
  let reasoning = '';
  let suggestedAction = '';
  let recommendedTone: 'urgent' | 'firm' | 'friendly' | 'formal' = 'friendly';
  let recommendedFollowUpDays = 7;

  if (totalScore >= 75 || (balance >= 120000 && durationDays >= 25) || durationDays >= 60) {
    urgencyLevel = 'critical';
    totalScore = Math.max(78, totalScore);
    recommendedTone = 'urgent';
    reasoning = `مستوى حرج جداً: عمر الدين (${durationDays} يوماً) مع رصيد مستحق مرتفع (${balance.toLocaleString('ar-EG')} ${currency}). التأخير يشكل خطورة على التدفقات المالية للمتجر ويستوجب إجراءً فورياً.`;
    suggestedAction = 'اتصال هاتفي مباشر مع العميل وإرسال إنذار SMS عاجل للمطالبة بالحضور أو السداد الفوري.';
    recommendedFollowUpDays = 1;
  } else if (totalScore >= 50 || balance >= 70000 || durationDays >= 30) {
    urgencyLevel = 'high';
    recommendedTone = 'firm';
    reasoning = `أولوية عالية: تجاوز عمر الدين ${durationDays} يوماً بمبلغ (${balance.toLocaleString('ar-EG')} ${currency}). يلزم اتخاذ إجراء حازم قبل تفاقم التأخير.`;
    suggestedAction = 'إرسال تذكير SMS رسمي ومتابعة عبر واتساب لطلب تحديد موعد سداد محدد.';
    recommendedFollowUpDays = 3;
  } else if (totalScore >= 30 || durationDays >= 15 || balance >= 35000) {
    urgencyLevel = 'medium';
    recommendedTone = 'firm';
    reasoning = `أولوية متوسطة: عمر الدين ${durationDays} يوماً ورصيد متوسط (${balance.toLocaleString('ar-EG')} ${currency}). وضع الحساب مستقر ولكنه بحاجة لمتابعة دورية.`;
    suggestedAction = 'إرسال رسالة تذكير دورية ببيان الرصيد وطلب السداد خلال الأسبوع.';
    recommendedFollowUpDays = 5;
  } else {
    urgencyLevel = 'low';
    recommendedTone = 'friendly';
    reasoning = `أولوية منخفضة: دين حديث نسبياً (${durationDays} يوماً) وبمبلغ محدود (${balance.toLocaleString('ar-EG')} ${currency}). التزام العميل جيد.`;
    suggestedAction = 'تذكير ودي عبر رسائل SMS أو واتساب في نهاية الشهر.';
    recommendedFollowUpDays = 10;
  }

  return {
    customerId: customer.id,
    urgencyLevel,
    urgencyScore: totalScore,
    debtDurationDays: durationDays,
    reasoning,
    suggestedAction,
    recommendedTone,
    riskFactors,
    recommendedFollowUpDays,
    analyzedAt: new Date().toISOString()
  };
}

/**
 * Calls server Gemini API to prioritize a batch of debtor customers.
 * Falls back gracefully to heuristic calculation if offline or server endpoint fails.
 */
export async function fetchAiPrioritization(
  customers: Customer[],
  storeName?: string,
  currency?: string
): Promise<{
  analyses: Record<string, CustomerUrgencyAnalysis>;
  usedFallback: boolean;
  message?: string;
}> {
  const debtors = customers.filter((c) => c.balance > 0);
  if (debtors.length === 0) {
    return { analyses: {}, usedFallback: false };
  }

  try {
    const response = await fetch('/api/ai/prioritize-debts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customers: debtors,
        storeName,
        currency
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data && data.analyses && Array.isArray(data.analyses)) {
      const map: Record<string, CustomerUrgencyAnalysis> = {};
      data.analyses.forEach((a: CustomerUrgencyAnalysis) => {
        map[a.customerId] = a;
      });
      return {
        analyses: map,
        usedFallback: Boolean(data.usedFallback),
        message: data.message
      };
    }
    throw new Error('Invalid response structure from prioritization API');
  } catch (err) {
    console.warn('API call failed, applying smart local heuristic fallback:', err);
    const map: Record<string, CustomerUrgencyAnalysis> = {};
    debtors.forEach((c) => {
      map[c.id] = calculateLocalUrgency(c, currency);
    });
    return {
      analyses: map,
      usedFallback: true,
      message: 'تم التحليل محلياً بدقة بناءً على عمر الدين وحجم المبلغ'
    };
  }
}

/**
 * Calls server Gemini API to analyze a single customer.
 */
export async function fetchSingleCustomerAnalysis(
  customer: Customer,
  storeName?: string,
  currency?: string
): Promise<CustomerUrgencyAnalysis> {
  try {
    const response = await fetch('/api/ai/analyze-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer,
        storeName,
        currency
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    if (data && data.analysis) {
      return data.analysis;
    }
    throw new Error('Invalid response structure');
  } catch (err) {
    console.warn('Single customer API failed, applying local fallback:', err);
    return calculateLocalUrgency(customer, currency);
  }
}
