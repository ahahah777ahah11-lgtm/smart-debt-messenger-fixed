import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const apiKey = process.env.GEMINI_API_KEY;

// Initialize GoogleGenAI SDK with required telemetry header
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

interface CustomerPayload {
  id: string;
  name: string;
  phone?: string;
  debit: number;
  credit: number;
  balance: number;
  notes?: string;
  category?: string;
  accountNumber?: string;
  status?: string;
  createdAt?: string;
  transactions?: Array<{
    id: string;
    date: string;
    type: 'debit' | 'credit';
    amount: number;
    note?: string;
  }>;
}

/**
 * Helper to compute days open for a customer
 */
function computeCustomerDuration(customer: CustomerPayload, refDate = new Date()): number {
  let earliestDate: Date | null = null;
  if (customer.transactions && customer.transactions.length > 0) {
    for (const tx of customer.transactions) {
      if (tx.type === 'debit') {
        const d = new Date(tx.date);
        if (!isNaN(d.getTime())) {
          if (!earliestDate || d < earliestDate) {
            earliestDate = d;
          }
        }
      }
    }
  }
  if (!earliestDate && customer.createdAt) {
    earliestDate = new Date(customer.createdAt);
  }
  if (!earliestDate) {
    earliestDate = new Date();
  }
  const diffMs = Math.max(0, refDate.getTime() - earliestDate.getTime());
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Local fallback evaluation algorithm in case Gemini API is not reachable
 */
function calculateFallbackAnalysis(customer: CustomerPayload, currency = 'ريال') {
  const durationDays = computeCustomerDuration(customer);
  const balance = Math.max(0, customer.balance);

  let amountScore = 0;
  if (balance >= 150000) amountScore = 50;
  else if (balance >= 100000) amountScore = 42;
  else if (balance >= 60000) amountScore = 32;
  else if (balance >= 30000) amountScore = 22;
  else amountScore = Math.min(15, Math.floor((balance / 30000) * 15));

  let durationScore = 0;
  if (durationDays >= 60) durationScore = 50;
  else if (durationDays >= 40) durationScore = 40;
  else if (durationDays >= 25) durationScore = 28;
  else if (durationDays >= 14) durationScore = 18;
  else durationScore = Math.min(12, Math.floor((durationDays / 14) * 12));

  let totalScore = Math.min(100, Math.max(5, amountScore + durationScore));

  const riskFactors: string[] = [];
  if (balance >= 100000) riskFactors.push(`مبلغ مرتفع (${balance.toLocaleString('ar-EG')} ${currency})`);
  if (durationDays >= 30) riskFactors.push(`عمر الدين تجاوز ${durationDays} يوماً`);

  let urgencyLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
  let reasoning = '';
  let suggestedAction = '';
  let recommendedTone: 'urgent' | 'firm' | 'friendly' | 'formal' = 'friendly';
  let recommendedFollowUpDays = 7;

  if (totalScore >= 75 || (balance >= 120000 && durationDays >= 25) || durationDays >= 60) {
    urgencyLevel = 'critical';
    totalScore = Math.max(80, totalScore);
    recommendedTone = 'urgent';
    reasoning = `مستوى حرج جداً: عمر الدين (${durationDays} يوماً) مع رصيد مستحق مرتفع (${balance.toLocaleString('ar-EG')} ${currency}). التأخير يشكل عبئاً على السيولة ويستوجب إجراءً فورياً.`;
    suggestedAction = 'اتصال هاتفي مباشر مع العميل وإرسال إنذار SMS عاجل للمطالبة بالحضور أو السداد الفوري.';
    recommendedFollowUpDays = 1;
  } else if (totalScore >= 50 || balance >= 70000 || durationDays >= 30) {
    urgencyLevel = 'high';
    recommendedTone = 'firm';
    reasoning = `أولوية عالية: تجاوز عمر الدين ${durationDays} يوماً بمبلغ (${balance.toLocaleString('ar-EG')} ${currency}). يلزم اتخاذ إجراء حازم لمتابعة السداد.`;
    suggestedAction = 'إرسال تذكير SMS رسمي ومتابعة عبر واتساب لتحديد موعد سداد محدد.';
    recommendedFollowUpDays = 3;
  } else if (totalScore >= 30 || durationDays >= 15 || balance >= 35000) {
    urgencyLevel = 'medium';
    recommendedTone = 'firm';
    reasoning = `أولوية متوسطة: عمر الدين ${durationDays} يوماً ورصيد متوسط (${balance.toLocaleString('ar-EG')} ${currency}). الحساب بحاجة لمتابعة دورية.`;
    suggestedAction = 'إرسال رسالة تذكير دورية ببيان الرصيد وطلب السداد.';
    recommendedFollowUpDays = 5;
  } else {
    urgencyLevel = 'low';
    recommendedTone = 'friendly';
    reasoning = `أولوية منخفضة: دين حديث نسبياً (${durationDays} يوماً) وبمبلغ محدود (${balance.toLocaleString('ar-EG')} ${currency}).`;
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
 * POST /api/ai/prioritize-debts
 * Batch categorization of customers by urgency level using Gemini API
 */
app.post('/api/ai/prioritize-debts', async (req: Request, res: Response) => {
  const { customers, storeName, currency } = req.body as {
    customers: CustomerPayload[];
    storeName?: string;
    currency?: string;
  };

  if (!customers || !Array.isArray(customers) || customers.length === 0) {
    return res.status(400).json({ error: 'قائمة العملاء فارغة' });
  }

  const curr = currency || 'ريال';
  const debtorCustomers = customers.filter((c) => c.balance > 0);

  if (debtorCustomers.length === 0) {
    return res.json({ analyses: [], usedFallback: false });
  }

  // If Gemini API is not configured, use local fallback
  if (!ai || !apiKey) {
    console.warn('GEMINI_API_KEY not found in environment, using deterministic local evaluation');
    const fallbackResults = debtorCustomers.map((c) => calculateFallbackAnalysis(c, curr));
    return res.json({
      analyses: fallbackResults,
      usedFallback: true,
      message: 'تم التحليل بواسطة خوارزمية قياس المخاطر المحلية بناءً على عمر الدين وحجم المبلغ'
    });
  }

  try {
    // Prepare concise data for Gemini with pre-computed duration
    const debtorsSummary = debtorCustomers.map((c) => {
      const durationDays = computeCustomerDuration(c);
      const recentTx = (c.transactions || []).slice(0, 4).map((t) => ({
        date: t.date,
        type: t.type,
        amount: t.amount,
        note: t.note,
      }));
      return {
        id: c.id,
        name: c.name,
        phone: c.phone || 'بدون هاتف',
        balance: c.balance,
        debit: c.debit,
        credit: c.credit,
        accountNumber: c.accountNumber || '',
        category: c.category || '',
        notes: c.notes || '',
        status: c.status || 'unnotified',
        debtDurationDays: durationDays,
        recentTransactions: recentTx,
      };
    });

    const prompt = `أنت خبير مالي ومحاسبي متخصص في إدارة التحصيل ومتابعة ديون العملاء لمتجر "${storeName || 'المركز التجاري'}".
مهمتك: تصنيف كل عميل مدين إلى "مستوى استعجال / درجة إلحاح التحصيل" (Urgency Level) لترتيب أولويات المتابعة والإشعار عبر SMS وواتساب.

مستويات الاستعجال الأربعة:
1. "critical" (حرج جداً):
   - ديون قديمة (تجاوزت 45 إلى 60+ يوماً) بمبالغ كبيرة، أو ديون ضخمة جداً دون سداد منتظم، أو عملاء لديهم وعود مؤجلة ومماطلة.
   - يتطلب تدخلاً فورياً (اتصال هاتفي مباشر، زيارة، أو إنذار رسمي).
2. "high" (أولوية عالية):
   - مبالغ معتبرة أو ديون تجاوزت 30 إلى 45 يوماً دون سداد كافٍ.
   - يتطلب إشعاراً عاجلاً ومتابعة حثيثة.
3. "medium" (أولوية متوسطة):
   - مبالغ متوسطة أو مدة دين ما بين 15 إلى 30 يوماً مع حركة حساب طبيعية.
   - يتطلب تذكيراً روتينياً ببيان الحساب.
4. "low" (أولوية منخفضة):
   - ديون حديثة (أقل من 15 يوماً) أو مبالغ بسيطة، أو عملاء منتظمون في دفعاتهم.
   - تذكير ودي في نهاية الشهر.

العملة المستخدمة: ${curr}.
بيانات العملاء المدينين للتحليل:
${JSON.stringify(debtorsSummary, null, 2)}

قم بتحليل كل عميل بدقة مع ذكر:
- urgencyLevel (critical | high | medium | low)
- urgencyScore (من 1 إلى 100، حيث 100 أقصى خطورة واستعجال)
- debtDurationDays (عمر الدين باليوم)
- reasoning (شرح تحليلي واضح ومقنع باللغة العربية يربط بين مدة الدين وحجم المبلغ وسجل الحركات)
- suggestedAction (خطوة عملية موصى بها للتحصيل)
- recommendedTone (urgent | firm | friendly | formal)
- riskFactors (قائمة بأهم عوامل الخطر باللغة العربية)
- recommendedFollowUpDays (عدد الأيام الموصى بها قبل المتابعة التالية)`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'أنت نظام ذكي لتحليل مخاطر الديون وتصنيف أولويات التحصيل التجاري باللغة العربية بدقة عالية.',
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: 'قائمة بنتائج تقييم درجات إلحاح التحصيل لكل عميل',
          items: {
            type: Type.OBJECT,
            properties: {
              customerId: { type: Type.STRING },
              urgencyLevel: {
                type: Type.STRING,
                description: 'Must be one of: critical, high, medium, low',
              },
              urgencyScore: { type: Type.INTEGER, description: 'Score from 1 to 100' },
              debtDurationDays: { type: Type.INTEGER, description: 'Debt duration in days' },
              reasoning: { type: Type.STRING, description: 'Clear Arabic rationale' },
              suggestedAction: { type: Type.STRING, description: 'Recommended collection action in Arabic' },
              recommendedTone: {
                type: Type.STRING,
                description: 'Tone: urgent, firm, friendly, or formal',
              },
              riskFactors: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Risk factor tags in Arabic',
              },
              recommendedFollowUpDays: { type: Type.INTEGER },
            },
            required: [
              'customerId',
              'urgencyLevel',
              'urgencyScore',
              'debtDurationDays',
              'reasoning',
              'suggestedAction',
              'recommendedTone',
              'riskFactors',
              'recommendedFollowUpDays',
            ],
          },
        },
      },
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error('Gemini API returned empty response text');
    }

    const parsedArray = JSON.parse(textOutput);
    const nowIso = new Date().toISOString();

    const finalizedResults = parsedArray.map((item: any) => {
      // Validate urgencyLevel
      let level: 'critical' | 'high' | 'medium' | 'low' = 'medium';
      if (['critical', 'high', 'medium', 'low'].includes(item.urgencyLevel)) {
        level = item.urgencyLevel;
      }
      return {
        customerId: String(item.customerId),
        urgencyLevel: level,
        urgencyScore: Math.min(100, Math.max(1, Number(item.urgencyScore) || 50)),
        debtDurationDays: Number(item.debtDurationDays) || 1,
        reasoning: String(item.reasoning || ''),
        suggestedAction: String(item.suggestedAction || ''),
        recommendedTone: item.recommendedTone || 'firm',
        riskFactors: Array.isArray(item.riskFactors) ? item.riskFactors : [],
        recommendedFollowUpDays: Number(item.recommendedFollowUpDays) || 3,
        analyzedAt: nowIso,
      };
    });

    return res.json({
      analyses: finalizedResults,
      usedFallback: false,
      message: 'تم التحليل بنجاح بواسطة Gemini AI',
    });
  } catch (err: any) {
    console.error('Error in Gemini prioritization API:', err);
    // Graceful fallback so users are never interrupted
    const fallbackResults = debtorCustomers.map((c) => calculateFallbackAnalysis(c, curr));
    return res.json({
      analyses: fallbackResults,
      usedFallback: true,
      message: 'تعذر الاتصال بـ Gemini مؤقتاً، وتم التحليل الاحتياطي بناءً على عمر الدين وحجم الرصيد بدقة.',
    });
  }
});

/**
 * POST /api/ai/analyze-customer
 * Deep analysis of a single customer's urgency level
 */
app.post('/api/ai/analyze-customer', async (req: Request, res: Response) => {
  const { customer, storeName, currency } = req.body as {
    customer: CustomerPayload;
    storeName?: string;
    currency?: string;
  };

  if (!customer) {
    return res.status(400).json({ error: 'بيانات العميل غير متوفرة' });
  }

  const curr = currency || 'ريال';

  if (!ai || !apiKey) {
    const fallback = calculateFallbackAnalysis(customer, curr);
    return res.json({ analysis: fallback, usedFallback: true });
  }

  try {
    const durationDays = computeCustomerDuration(customer);
    const prompt = `قم بتحليل وتقييم درجة إلحاح تحصيل المديونية (Urgency Level) للعميل التالي في متجر "${storeName || 'المتجر'}":
الاسم: ${customer.name}
رقم الهاتف: ${customer.phone || 'غير مسجل'}
الرصيد المستحق (الدين): ${customer.balance} ${curr}
إجمالي المبيعات (عليه): ${customer.debit} ${curr}
إجمالي السداد (له): ${customer.credit} ${curr}
رقم الحساب: ${customer.accountNumber || 'لا يوجد'}
التصنيف: ${customer.category || 'عام'}
الملاحظات: ${customer.notes || 'لا توجد'}
عمر الدين التقديري: ${durationDays} يوماً
الحركات السابقة: ${JSON.stringify(customer.transactions || [])}

المطلوب:
تقييم مستوى الاستعجال: critical أو high أو medium أو low بناءً على عمر الدين وحجم المبلغ وتاريخ السداد.
أعطِ درجة خطورة من 1 إلى 100، وشرحاً وافياً بالأسباب باللغة العربية، وخطوة عملية للتحصيل، ونبرة الرسالة، وعوامل المخاطرة.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'أنت مستشار مالي متخصص في تحليل ديون العملاء وترتيب أولويات السداد باللغة العربية.',
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerId: { type: Type.STRING },
            urgencyLevel: {
              type: Type.STRING,
              description: 'Must be critical, high, medium, or low',
            },
            urgencyScore: { type: Type.INTEGER },
            debtDurationDays: { type: Type.INTEGER },
            reasoning: { type: Type.STRING },
            suggestedAction: { type: Type.STRING },
            recommendedTone: { type: Type.STRING },
            riskFactors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendedFollowUpDays: { type: Type.INTEGER },
          },
          required: [
            'customerId',
            'urgencyLevel',
            'urgencyScore',
            'debtDurationDays',
            'reasoning',
            'suggestedAction',
            'recommendedTone',
            'riskFactors',
            'recommendedFollowUpDays',
          ],
        },
      },
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error('Empty response from model');
    }

    const item = JSON.parse(textOutput);
    let level: 'critical' | 'high' | 'medium' | 'low' = 'medium';
    if (['critical', 'high', 'medium', 'low'].includes(item.urgencyLevel)) {
      level = item.urgencyLevel;
    }

    const result = {
      customerId: customer.id,
      urgencyLevel: level,
      urgencyScore: Math.min(100, Math.max(1, Number(item.urgencyScore) || 50)),
      debtDurationDays: Number(item.debtDurationDays) || durationDays,
      reasoning: String(item.reasoning || ''),
      suggestedAction: String(item.suggestedAction || ''),
      recommendedTone: item.recommendedTone || 'firm',
      riskFactors: Array.isArray(item.riskFactors) ? item.riskFactors : [],
      recommendedFollowUpDays: Number(item.recommendedFollowUpDays) || 3,
      analyzedAt: new Date().toISOString(),
    };

    return res.json({ analysis: result, usedFallback: false });
  } catch (err: any) {
    console.error('Error analyzing customer with Gemini:', err);
    const fallback = calculateFallbackAnalysis(customer, curr);
    return res.json({ analysis: fallback, usedFallback: true });
  }
});

/**
 * Helper to build fallback installment plans on server
 */
function calculateFallbackInstallmentPlans(
  customer: CustomerPayload & { urgencyLevel?: string; urgencyScore?: number },
  storeName = 'المتجر',
  curr = 'ريال',
  storePhone = ''
) {
  const debt = Math.max(0, customer.balance);
  const urgency = customer.urgencyLevel || 'medium';
  const now = new Date();

  function formatDate(d: Date) {
    return d.toISOString().split('T')[0];
  }

  function addDays(d: Date, days: number) {
    const res = new Date(d);
    res.setDate(res.getDate() + days);
    return formatDate(res);
  }

  function addMonths(d: Date, months: number) {
    const res = new Date(d);
    res.setMonth(res.getMonth() + months);
    return formatDate(res);
  }

  const startDate = new Date();
  startDate.setDate(now.getDate() + 7);
  const startStr = formatDate(startDate);

  function createSchedule(
    total: number,
    down: number,
    count: number,
    interval: 'weekly' | 'biweekly' | 'monthly'
  ) {
    const remaining = Math.max(0, total - down);
    const base = Math.floor(remaining / count);
    const remainder = remaining - base * count;
    const schedule = [];
    for (let i = 1; i <= count; i++) {
      let dueDate = startStr;
      if (interval === 'weekly') dueDate = addDays(startDate, (i - 1) * 7);
      else if (interval === 'biweekly') dueDate = addDays(startDate, (i - 1) * 14);
      else dueDate = addMonths(startDate, i - 1);

      schedule.push({
        installmentNumber: i,
        dueDate,
        amount: i === 1 ? base + remainder : base,
        label: `القسط ${i} من ${count}`,
        status: 'pending' as const,
      });
    }
    return schedule;
  }

  function makeSms(
    title: string,
    down: number,
    count: number,
    installmentAmt: number,
    interval: string,
    schedule: any[]
  ) {
    const downText = down > 0 ? `\n- دفعة مقدمة: ${down.toLocaleString('ar-EG')} ${curr}` : '';
    const schedSummary = schedule
      .slice(0, 3)
      .map((s) => `• قسط ${s.installmentNumber}: ${s.amount.toLocaleString('ar-EG')} ${curr} (${s.dueDate})`)
      .join('\n');
    const moreText = schedule.length > 3 ? `\n... وباقي الأقساط حتى نهاية الجدولة` : '';

    return `الأخ/الأخت ${customer.name} المحترم،
تحية طيبة من ${storeName}.
تيسيراً لسداد حسابكم المستحق (${debt.toLocaleString('ar-EG')} ${curr})، نقترح عليكم خطة (${title}):${downText}
- عدد الأقساط: ${count} أقساط (${interval})
- قيمة القسط: ${installmentAmt.toLocaleString('ar-EG')} ${curr}
مواعيد الاستحقاق المقترحة:
${schedSummary}${moreText}
يرجى تأكيد موافقتكم بالتواصل معنا على هاتف: ${storePhone || 'المتجر'}.
شاكرين حسن تعاونكم.`;
  }

  // 1. Fast Recovery
  const fastDownPct = urgency === 'critical' ? 0.40 : urgency === 'high' ? 0.30 : 0.25;
  const fastCount = urgency === 'critical' ? 2 : 3;
  const fastInterval: 'weekly' | 'biweekly' = urgency === 'critical' ? 'weekly' : 'biweekly';
  const fastDown = Math.round(debt * fastDownPct);
  const fastSched = createSchedule(debt, fastDown, fastCount, fastInterval);
  const fastAmt = fastSched.length > 0 ? fastSched[0].amount : 0;
  const fastEnd = fastSched.length > 0 ? fastSched[fastSched.length - 1].dueDate : startStr;

  // 2. Balanced Plan
  const balDownPct = debt >= 100000 ? 0.20 : 0.15;
  const balCount = debt >= 100000 ? 4 : 3;
  const balDown = Math.round(debt * balDownPct);
  const balSched = createSchedule(debt, balDown, balCount, 'monthly');
  const balAmt = balSched.length > 0 ? balSched[0].amount : 0;
  const balEnd = balSched.length > 0 ? balSched[balSched.length - 1].dueDate : startStr;

  // 3. Relaxed Plan
  const relDownPct = 0.10;
  const relCount = debt >= 100000 ? 6 : 5;
  const relDown = Math.round(debt * relDownPct);
  const relSched = createSchedule(debt, relDown, relCount, 'monthly');
  const relAmt = relSched.length > 0 ? relSched[0].amount : 0;
  const relEnd = relSched.length > 0 ? relSched[relSched.length - 1].dueDate : startStr;

  const nowIso = new Date().toISOString();

  return [
    {
      id: `plan_fast_${Date.now()}`,
      planTitle: urgency === 'critical' ? 'خطة التسوية العاجلة (دفعة فورية + قسطين)' : 'خطة السداد السريع والتسوية الودية',
      strategyType: 'fast_recovery' as const,
      totalDebt: debt,
      downPayment: fastDown,
      numberOfInstallments: fastCount,
      interval: fastInterval,
      installmentAmount: fastAmt,
      startDate: startStr,
      endDate: fastEnd,
      schedule: fastSched,
      reasoning: `خطة مصممة لمعالجة أولوية (${urgency === 'critical' ? 'حرج جداً' : 'عالية'}): تأمين نسبة ${Math.round(fastDownPct * 100)}% كمقدم فوراً وسداد الباقي سريعاً لتقليص المخاطرة.`,
      smsMessageText: makeSms('السداد السريع', fastDown, fastCount, fastAmt, fastInterval === 'weekly' ? 'أسبوعياً' : 'كل أسبوعين', fastSched),
      createdAt: nowIso
    },
    {
      id: `plan_bal_${Date.now() + 1}`,
      planTitle: 'خطة الأقساط الشهرية المتوازنة (3-4 أشهر)',
      strategyType: 'balanced' as const,
      totalDebt: debt,
      downPayment: balDown,
      numberOfInstallments: balCount,
      interval: 'monthly' as const,
      installmentAmount: balAmt,
      startDate: startStr,
      endDate: balEnd,
      schedule: balSched,
      reasoning: 'الخطة المثالية لأغلب العملاء: دفعات شهرية منتظمة تضمن تدفقات مالية للمتجر وتناسب قدرة العميل على السداد.',
      smsMessageText: makeSms('الأقساط الشهرية المتوازنة', balDown, balCount, balAmt, 'شهرياً', balSched),
      createdAt: nowIso
    },
    {
      id: `plan_rel_${Date.now() + 2}`,
      planTitle: 'خطة التيسير والدفعات المرنة المخففة',
      strategyType: 'relaxed' as const,
      totalDebt: debt,
      downPayment: relDown,
      numberOfInstallments: relCount,
      interval: 'monthly' as const,
      installmentAmount: relAmt,
      startDate: startStr,
      endDate: relEnd,
      schedule: relSched,
      reasoning: 'خطة ميسرة بأقساط شهرية صغيرة للديون المرتفعة تشجع العميل على الالتزام دون تعثر.',
      smsMessageText: makeSms('الدفعات الشهرية الميسرة', relDown, relCount, relAmt, 'شهرياً', relSched),
      createdAt: nowIso
    }
  ];
}

/**
 * POST /api/ai/suggest-installment-plans
 * Suggests 3 structured installment payment plans using Gemini AI based on debt & urgency
 */
app.post('/api/ai/suggest-installment-plans', async (req: Request, res: Response) => {
  const { customer, storeName, currency, storePhone } = req.body;
  const curr = currency || 'ريال';

  if (!customer || typeof customer.balance !== 'number' || customer.balance <= 0) {
    return res.status(400).json({ error: 'بيانات العميل غير صحيحة أو الرصيد ليس مديونية موجبة' });
  }

  if (!ai) {
    const fallbackPlans = calculateFallbackInstallmentPlans(customer, storeName, curr, storePhone);
    return res.json({ plans: fallbackPlans, usedFallback: true });
  }

  try {
    const durationDays = computeCustomerDuration(customer);
    const urgency = customer.urgencyLevel || 'medium';
    const urgencyScore = customer.urgencyScore || 50;

    const prompt = `أنت خبير مالي في إعادة جدولة الديون وتصميم خطط أقساط للعملاء باللغة العربية.
قم بإنشاء 3 خطط تقسيط مجدولة واضحة وقابلة للتطبيق للعميل التالي في متجر "${storeName || 'المتجر'}":
- اسم العميل: ${customer.name}
- هاتف العميل: ${customer.phone || 'غير مسجل'}
- إجمالي الدين المستحق: ${customer.balance} ${curr}
- درجة إلحاح التحصيل الحالية: ${urgency} (الدرجة: ${urgencyScore}/100)
- عمر الدين: ${durationDays} يوماً
- تصنيف العميل: ${customer.category || 'عام'}
- هاتف التواصل بالمتجر: ${storePhone || ''}

المطلوب بدقة:
إنشاء 3 خطط استراتيجية مختلفة:
1. fast_recovery (خطة السداد السريع والتسوية الفورية): تناسب الاستعجال العالي وتطلب دفعة أولى مقدمة معتبرة (30%-50%) وتقسيط الباقي على 2 إلى 3 أقساط سريعة (أسبوعية أو نصف شهرية).
2. balanced (خطة الأقساط المتوازنة): دفعة مقدمة معتدلة (15%-25%) و3 إلى 4 أقساط شهرية مريحة.
3. relaxed (خطة التيسير والدفعات المرنة): دفعة أولى رمزية (5%-10%) و4 إلى 6 أقساط شهرية صغيرة للتشجيع على السداد.

لكل خطة:
- احسب جدول التواريخ بحيث يبدأ بعد أسبوع من تاريخ اليوم، واذكر كل قسط وتاريخه ومبلغه.
- اكتب نص رسالة SMS وواتساب كامل ومهذب ومقنع باللهجة العربية المهنية، يحتوي على اسم العميل والمتجر وإجمالي الدين والدفعة الأولى والأقساط وتواريخها وتفاصيل التواصل.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'أنت مستشار مالي متخصص في جدولة وتحصيل ديون العملاء وتصميم خطط أقساط ملائمة باللغة العربية.',
        temperature: 0.25,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plans: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  planTitle: { type: Type.STRING },
                  strategyType: {
                    type: Type.STRING,
                    description: 'fast_recovery, balanced, or relaxed'
                  },
                  totalDebt: { type: Type.NUMBER },
                  downPayment: { type: Type.NUMBER },
                  numberOfInstallments: { type: Type.INTEGER },
                  interval: {
                    type: Type.STRING,
                    description: 'weekly, biweekly, or monthly'
                  },
                  installmentAmount: { type: Type.NUMBER },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  schedule: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        installmentNumber: { type: Type.INTEGER },
                        dueDate: { type: Type.STRING },
                        amount: { type: Type.NUMBER },
                        label: { type: Type.STRING },
                        status: { type: Type.STRING, description: 'pending or paid' }
                      },
                      required: ['installmentNumber', 'dueDate', 'amount', 'label', 'status']
                    }
                  },
                  reasoning: { type: Type.STRING },
                  smsMessageText: { type: Type.STRING }
                },
                required: [
                  'planTitle',
                  'strategyType',
                  'totalDebt',
                  'downPayment',
                  'numberOfInstallments',
                  'interval',
                  'installmentAmount',
                  'startDate',
                  'endDate',
                  'schedule',
                  'reasoning',
                  'smsMessageText'
                ]
              }
            },
            aiNote: { type: Type.STRING }
          },
          required: ['plans']
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error('Empty response from model for installment plans');
    }

    const parsed = JSON.parse(textOutput);
    if (!parsed || !Array.isArray(parsed.plans) || parsed.plans.length === 0) {
      throw new Error('Invalid plans array in model response');
    }

    const formattedPlans = parsed.plans.map((p: any, idx: number) => {
      let st: 'fast_recovery' | 'balanced' | 'relaxed' = 'balanced';
      if (['fast_recovery', 'balanced', 'relaxed'].includes(p.strategyType)) {
        st = p.strategyType;
      }
      let interv: 'weekly' | 'biweekly' | 'monthly' = 'monthly';
      if (['weekly', 'biweekly', 'monthly'].includes(p.interval)) {
        interv = p.interval;
      }

      return {
        id: `plan_ai_${Date.now()}_${idx}`,
        planTitle: String(p.planTitle || `خطة مقترحة ${idx + 1}`),
        strategyType: st,
        totalDebt: Number(p.totalDebt) || customer.balance,
        downPayment: Math.round(Number(p.downPayment) || 0),
        numberOfInstallments: Math.max(1, Number(p.numberOfInstallments) || 3),
        interval: interv,
        installmentAmount: Math.round(Number(p.installmentAmount) || Math.floor(customer.balance / 3)),
        startDate: String(p.startDate || new Date().toISOString().split('T')[0]),
        endDate: String(p.endDate || new Date().toISOString().split('T')[0]),
        schedule: Array.isArray(p.schedule)
          ? p.schedule.map((s: any, sIdx: number) => ({
              installmentNumber: Number(s.installmentNumber) || sIdx + 1,
              dueDate: String(s.dueDate || new Date().toISOString().split('T')[0]),
              amount: Math.round(Number(s.amount) || 0),
              label: String(s.label || `القسط ${sIdx + 1}`),
              status: s.status === 'paid' ? 'paid' : 'pending'
            }))
          : [],
        reasoning: String(p.reasoning || ''),
        smsMessageText: String(p.smsMessageText || ''),
        createdAt: new Date().toISOString()
      };
    });

    return res.json({
      plans: formattedPlans,
      usedFallback: false,
      aiNote: parsed.aiNote || 'تم إنشاء خطط التقسيط وتحليلها بنجاح بواسطة Gemini AI'
    });
  } catch (err: any) {
    console.error('Error generating installment plans with Gemini:', err);
    const fallbackPlans = calculateFallbackInstallmentPlans(customer, storeName, curr, storePhone);
    return res.json({
      plans: fallbackPlans,
      usedFallback: true,
      aiNote: 'تم إنشاء خطط التقسيط محلياً بدقة متناهية'
    });
  }
});

/**
 * Download HTML to APK Builder ZIP archive
 */
app.get(['/api/download/html-to-apk-builder.zip', '/html-to-apk-builder.zip'], (_req: Request, res: Response) => {
  const zipPath = path.resolve(process.cwd(), 'public', 'html-to-apk-builder.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="html-to-apk-builder.zip"');
    return res.sendFile(zipPath);
  }
  return res.status(404).json({ error: 'Zip file not found' });
});


/**
 * Mount Vite in dev or static files in production
 */
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
