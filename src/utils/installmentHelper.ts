import { AppSettings, Customer, InstallmentPlan, InstallmentScheduleItem, UrgencyLevel } from '../types';
import { calculateDebtDuration } from './urgencyHelper';

/**
 * Format a number as integer or with 2 decimals in Arabic format
 */
export function formatCurrencyAmount(num: number, currency = 'ريال'): string {
  return `${Math.round(num).toLocaleString('ar-EG')} ${currency}`;
}

/**
 * Helper to add days to a date string (YYYY-MM-DD)
 */
function addDays(baseDate: Date, days: number): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Helper to add months to a date string (YYYY-MM-DD)
 */
function addMonths(baseDate: Date, months: number): string {
  const d = new Date(baseDate);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

/**
 * Generate schedule items ensuring total sum exactly matches remaining debt after down payment
 */
export function generateScheduleItems(
  totalDebt: number,
  downPayment: number,
  numberOfInstallments: number,
  interval: 'weekly' | 'biweekly' | 'monthly',
  startDateStr: string
): InstallmentScheduleItem[] {
  const remaining = Math.max(0, totalDebt - downPayment);
  if (numberOfInstallments <= 0 || remaining <= 0) {
    return [];
  }

  const baseAmount = Math.floor(remaining / numberOfInstallments);
  const remainder = remaining - (baseAmount * numberOfInstallments);

  const baseDate = new Date(startDateStr);
  const schedule: InstallmentScheduleItem[] = [];

  for (let i = 1; i <= numberOfInstallments; i++) {
    let dueDate: string;
    if (interval === 'weekly') {
      dueDate = addDays(baseDate, (i - 1) * 7);
    } else if (interval === 'biweekly') {
      dueDate = addDays(baseDate, (i - 1) * 14);
    } else {
      dueDate = addMonths(baseDate, i - 1);
    }

    // Add remainder to the first installment to ensure exact penny match
    const amount = i === 1 ? baseAmount + remainder : baseAmount;

    schedule.push({
      installmentNumber: i,
      dueDate,
      amount,
      label: `القسط ${i} من ${numberOfInstallments}`,
      status: 'pending'
    });
  }

  return schedule;
}

/**
 * Generates an SMS message for an installment plan
 */
export function generateInstallmentSmsText(
  plan: Omit<InstallmentPlan, 'id' | 'createdAt' | 'smsMessageText'>,
  customer: Customer,
  settings: AppSettings
): string {
  const curr = settings.currency || 'ريال';
  const totalFormatted = formatCurrencyAmount(plan.totalDebt, curr);
  const downPaymentFormatted = formatCurrencyAmount(plan.downPayment, curr);
  const installmentFormatted = formatCurrencyAmount(plan.installmentAmount, curr);
  
  const intervalLabel = 
    plan.interval === 'weekly' ? 'أسبوعياً' :
    plan.interval === 'biweekly' ? 'كل أسبوعين' : 'شهرياً';

  const scheduleSummary = plan.schedule
    .slice(0, 3)
    .map((s) => `• قسط ${s.installmentNumber}: ${formatCurrencyAmount(s.amount, curr)} بتاريخ ${s.dueDate}`)
    .join('\n');

  const moreText = plan.schedule.length > 3 ? `\n... وباقي الأقساط حتى تاريخ ${plan.endDate}` : '';

  let downPaymentPart = '';
  if (plan.downPayment > 0) {
    downPaymentPart = `\n- دفعة أولى مقدمة: ${downPaymentFormatted}`;
  }

  return `الأخ/الأخت ${customer.name} المحترم،
تحية طيبة من ${settings.storeName}.
حرصاً منا على تيسير سداد رصيدكم المستحق البالغ (${totalFormatted})، يسعدنا اقتراح خطة تسوية مجدولة (${plan.planTitle}):${downPaymentPart}
- عدد الأقساط: ${plan.numberOfInstallments} أقساط (${intervalLabel})
- قيمة القسط: حوالي ${installmentFormatted}
مواعيد الاستحقاق المقترحة:
${scheduleSummary}${moreText}
يرجى تأكيد موافقتكم بالتواصل معنا على هاتف: ${settings.storePhone || 'المتجر'}.
شاكرين ومقدرين حسن تعاونكم الدائم.`;
}

/**
 * Calculates heuristic rule-based installment plans based on debt amount and urgency level
 */
export function generateDefaultInstallmentPlans(
  customer: Customer,
  settings: AppSettings
): InstallmentPlan[] {
  const debt = Math.max(0, customer.balance);
  const urgency: UrgencyLevel = customer.urgencyLevel || 'medium';
  const now = new Date();
  
  // Starting date: 7 days from today
  const firstPaymentDate = new Date();
  firstPaymentDate.setDate(now.getDate() + 7);
  const startDateStr = firstPaymentDate.toISOString().split('T')[0];

  const plans: InstallmentPlan[] = [];

  // 1. FAST RECOVERY PLAN (خطة التسوية السريعة والمكثفة)
  // Best for Critical & High urgency: Higher upfront down payment, fewer installments
  let fastDownPct = 0.35;
  let fastInstallments = 2;
  let fastInterval: 'weekly' | 'biweekly' | 'monthly' = 'biweekly';

  if (urgency === 'critical') {
    fastDownPct = 0.40;
    fastInstallments = 2;
    fastInterval = 'weekly';
  } else if (urgency === 'high') {
    fastDownPct = 0.30;
    fastInstallments = 3;
    fastInterval = 'biweekly';
  } else {
    fastDownPct = 0.25;
    fastInstallments = 2;
    fastInterval = 'monthly';
  }

  const fastDownPayment = Math.round(debt * fastDownPct);
  const fastSchedule = generateScheduleItems(debt, fastDownPayment, fastInstallments, fastInterval, startDateStr);
  const fastInstallmentAmt = fastSchedule.length > 0 ? fastSchedule[0].amount : 0;
  const fastEndDate = fastSchedule.length > 0 ? fastSchedule[fastSchedule.length - 1].dueDate : startDateStr;

  const fastPlanBase = {
    planTitle: urgency === 'critical' ? 'خطة التسوية العاجلة (دفعة فورية + قسطين)' : 'خطة السداد السريع الميسر',
    strategyType: 'fast_recovery' as const,
    totalDebt: debt,
    downPayment: fastDownPayment,
    numberOfInstallments: fastInstallments,
    interval: fastInterval,
    installmentAmount: fastInstallmentAmt,
    startDate: startDateStr,
    endDate: fastEndDate,
    schedule: fastSchedule,
    reasoning: `موصى بها لأولوية (${urgency === 'critical' ? 'حرج جداً' : urgency === 'high' ? 'عالية' : 'متوسطة'}): تركز على خفض المخاطرة وتأمين ${Math.round(fastDownPct * 100)}% فورياً مع تقسيط الباقي على ${fastInstallments} دفعات سريعة لتجنب تراكم المديونية.`
  };

  plans.push({
    ...fastPlanBase,
    id: `plan_fast_${Date.now()}`,
    smsMessageText: generateInstallmentSmsText(fastPlanBase, customer, settings),
    createdAt: new Date().toISOString()
  });

  // 2. BALANCED PLAN (خطة الأقساط المتوازنة الشهرية)
  // Moderate down payment (15-20%), 3-4 installments monthly
  let balDownPct = debt >= 100000 ? 0.20 : 0.15;
  let balInstallments = debt >= 100000 ? 4 : 3;
  if (urgency === 'critical') {
    balDownPct = 0.25;
    balInstallments = 3;
  }

  const balDownPayment = Math.round(debt * balDownPct);
  const balSchedule = generateScheduleItems(debt, balDownPayment, balInstallments, 'monthly', startDateStr);
  const balInstallmentAmt = balSchedule.length > 0 ? balSchedule[0].amount : 0;
  const balEndDate = balSchedule.length > 0 ? balSchedule[balSchedule.length - 1].dueDate : startDateStr;

  const balPlanBase = {
    planTitle: 'خطة الأقساط الشهرية المتوازنة (3-4 أشهر)',
    strategyType: 'balanced' as const,
    totalDebt: debt,
    downPayment: balDownPayment,
    numberOfInstallments: balInstallments,
    interval: 'monthly' as const,
    installmentAmount: balInstallmentAmt,
    startDate: startDateStr,
    endDate: balEndDate,
    schedule: balSchedule,
    reasoning: 'الخطة الأكثر قبولاً والتزاماً لدى العملاء: تحقق توازناً ممتازاً بين راحة العميل المالية وضمان تدفقات شهرية منتظمة للمتجر.'
  };

  plans.push({
    ...balPlanBase,
    id: `plan_bal_${Date.now() + 1}`,
    smsMessageText: generateInstallmentSmsText(balPlanBase, customer, settings),
    createdAt: new Date().toISOString()
  });

  // 3. RELAXED / EXTENDED PLAN (خطة التيسير والدفعات المرنة)
  // Low down payment (10%), 5-6 installments
  const relDownPct = debt >= 80000 ? 0.10 : 0.05;
  const relInstallments = debt >= 120000 ? 6 : debt >= 50000 ? 5 : 4;
  const relDownPayment = Math.round(debt * relDownPct);
  const relSchedule = generateScheduleItems(debt, relDownPayment, relInstallments, 'monthly', startDateStr);
  const relInstallmentAmt = relSchedule.length > 0 ? relSchedule[0].amount : 0;
  const relEndDate = relSchedule.length > 0 ? relSchedule[relSchedule.length - 1].dueDate : startDateStr;

  const relPlanBase = {
    planTitle: 'خطة التيسير والدفعات الشهرية المخففة',
    strategyType: 'relaxed' as const,
    totalDebt: debt,
    downPayment: relDownPayment,
    numberOfInstallments: relInstallments,
    interval: 'monthly' as const,
    installmentAmount: relInstallmentAmt,
    startDate: startDateStr,
    endDate: relEndDate,
    schedule: relSchedule,
    reasoning: 'مخصصة للعملاء ذوي المديونيات الكبيرة أو الظروف الخاصة: توفر أقساطاً شهرية صغيرة محفزة على البدء الفوري بالسداد دون مماطلة.'
  };

  plans.push({
    ...relPlanBase,
    id: `plan_rel_${Date.now() + 2}`,
    smsMessageText: generateInstallmentSmsText(relPlanBase, customer, settings),
    createdAt: new Date().toISOString()
  });

  return plans;
}

/**
 * Build a customized plan with user specified parameters
 */
export function buildCustomInstallmentPlan(
  customer: Customer,
  settings: AppSettings,
  options: {
    planTitle?: string;
    downPayment: number;
    numberOfInstallments: number;
    interval: 'weekly' | 'biweekly' | 'monthly';
    startDate: string;
  }
): InstallmentPlan {
  const debt = Math.max(0, customer.balance);
  const downPayment = Math.min(debt, Math.max(0, options.downPayment));
  const numberOfInstallments = Math.max(1, options.numberOfInstallments);
  const schedule = generateScheduleItems(debt, downPayment, numberOfInstallments, options.interval, options.startDate);
  const installmentAmount = schedule.length > 0 ? schedule[0].amount : 0;
  const endDate = schedule.length > 0 ? schedule[schedule.length - 1].dueDate : options.startDate;

  const planBase = {
    planTitle: options.planTitle || `خطة مخصصة (${numberOfInstallments} أقساط)`,
    strategyType: 'balanced' as const,
    totalDebt: debt,
    downPayment,
    numberOfInstallments,
    interval: options.interval,
    installmentAmount,
    startDate: options.startDate,
    endDate,
    schedule,
    reasoning: `خطة مجدولة حسب تفضيلات التاجر بعدد ${numberOfInstallments} قسط ومقدم ${formatCurrencyAmount(downPayment, settings.currency)}.`
  };

  return {
    ...planBase,
    id: `plan_custom_${Date.now()}`,
    smsMessageText: generateInstallmentSmsText(planBase, customer, settings),
    createdAt: new Date().toISOString()
  };
}

/**
 * Fetch AI-generated installment plans from the server (with fallback)
 */
export async function fetchAiInstallmentPlans(
  customer: Customer,
  settings: AppSettings
): Promise<{
  plans: InstallmentPlan[];
  usedFallback: boolean;
  aiNote?: string;
}> {
  try {
    const response = await fetch('/api/ai/suggest-installment-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer,
        storeName: settings.storeName,
        currency: settings.currency,
        storePhone: settings.storePhone
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    if (data && Array.isArray(data.plans) && data.plans.length > 0) {
      return {
        plans: data.plans,
        usedFallback: Boolean(data.usedFallback),
        aiNote: data.aiNote
      };
    }
    throw new Error('Invalid plans response');
  } catch (err) {
    console.warn('Failed to fetch AI installment plans from API, generating smart local plans:', err);
    return {
      plans: generateDefaultInstallmentPlans(customer, settings),
      usedFallback: true,
      aiNote: 'تم احتساب وتوليد خطط التقسيط بذكاء استناداً إلى حجم المديونية ودرجة الإلحاح'
    };
  }
}
