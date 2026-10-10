import { AppSettings, Customer } from '../types';
import { DEFAULT_TEMPLATES } from './smsHelper';

export const INITIAL_SETTINGS: AppSettings = {
  storeName: 'مركز الأمل للتجارة والخدمات',
  storePhone: '777000000',
  currency: 'ريال يمني',
  countryCode: '+967',
  autoFormatPhone: true,
  whatsappApi: {
    enabled: true,
    provider: 'simulation',
    metaPhoneNumberId: '',
    metaAccessToken: '',
    ultramsgInstanceId: '',
    ultramsgToken: '',
    greenApiInstanceId: '',
    greenApiToken: '',
    customEndpointUrl: '',
    customApiKey: '',
    customHeadersJson: '',
    autoFallbackToWeb: true,
    delayBetweenBatchMs: 1500
  }
};

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust_init_1',
    name: 'عادل حزام اليافعي',
    phone: '777123456',
    debit: 85000,
    credit: 15000,
    balance: 70000,
    notes: 'حساب توريدات بقالة ومواد غذائية لشهر فبراير',
    category: 'عميل مميز',
    accountNumber: 'ACC-101',
    status: 'unnotified',
    lastSentAt: null,
    lastSentChannel: null,
    urgencyLevel: 'high',
    urgencyScore: 72,
    urgencyDebtDurationDays: 39,
    urgencyReasoning: 'مبلغ دين كبير (70,000 ريال) مضى عليه 39 يوماً مع تباطؤ في السداد منذ 12 مارس. يُنصح بمتابعة حازمة.',
    urgencySuggestedAction: 'إرسال تذكير SMS رسمي ومتابعة الحساب لتحديد موعد تسوية الدفعة القادمة.',
    urgencyTone: 'firm',
    urgencyRiskFactors: ['عمر الدين تجاوز شهر', 'رصيد مستحق 70,000 ريال'],
    urgencyAnalyzedAt: '2026-03-25T10:00:00.000Z',
    transactions: [
      {
        id: 'tx_1_1',
        date: '2026-03-01',
        type: 'debit',
        amount: 85000,
        note: 'فاتورة مبيعات بضائع رقم 1042',
        receiptNumber: 'INV-1042'
      },
      {
        id: 'tx_1_2',
        date: '2026-03-12',
        type: 'credit',
        amount: 15000,
        note: 'سند قبض نقدي رقم 55',
        receiptNumber: 'REC-55'
      }
    ],
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-12T11:00:00.000Z'
  },
  {
    id: 'cust_init_2',
    name: 'محمد عبدالله الصنعاني',
    phone: '771987654',
    debit: 120000,
    credit: 40000,
    balance: 80000,
    notes: 'فواتير مشتريات وتجهيزات المحل الجديد',
    category: 'عميل جملة',
    accountNumber: 'ACC-102',
    status: 'unnotified',
    lastSentAt: null,
    lastSentChannel: null,
    urgencyLevel: 'high',
    urgencyScore: 78,
    urgencyDebtDurationDays: 35,
    urgencyReasoning: 'رصيد مرتفع (80,000 ريال) رغم وجود سداد جزئي سابق. تجارة جملة تتطلب سرعة دورة رأس المال.',
    urgencySuggestedAction: 'إرسال إشعار SMS تفصيلي بالرصيد المتبقي واقتراح تحويل مصرفي.',
    urgencyTone: 'firm',
    urgencyRiskFactors: ['رصيد جملة مرتفع', 'مضى أكثر من 30 يوماً'],
    urgencyAnalyzedAt: '2026-03-25T10:00:00.000Z',
    transactions: [
      {
        id: 'tx_2_1',
        date: '2026-03-05',
        type: 'debit',
        amount: 120000,
        note: 'شراء بضاعة بالآجل',
        receiptNumber: 'INV-1050'
      },
      {
        id: 'tx_2_2',
        date: '2026-03-18',
        type: 'credit',
        amount: 40000,
        note: 'حوالة مصرفية حساب الكريمي',
        receiptNumber: 'TRF-889'
      }
    ],
    activeInstallmentPlan: {
      id: 'plan_init_2',
      planTitle: 'خطة الأقساط الشهرية المتوازنة (3 أقساط)',
      strategyType: 'balanced',
      totalDebt: 80000,
      downPayment: 20000,
      numberOfInstallments: 3,
      interval: 'monthly',
      installmentAmount: 20000,
      startDate: '2026-04-01',
      endDate: '2026-06-01',
      schedule: [
        {
          installmentNumber: 1,
          dueDate: '2026-04-01',
          amount: 20000,
          label: 'القسط 1 من 3',
          status: 'paid'
        },
        {
          installmentNumber: 2,
          dueDate: '2026-05-01',
          amount: 20000,
          label: 'القسط 2 من 3',
          status: 'pending'
        },
        {
          installmentNumber: 3,
          dueDate: '2026-06-01',
          amount: 20000,
          label: 'القسط 3 من 3',
          status: 'pending'
        }
      ],
      reasoning: 'تم اعتماد خطة سداد ميسرة بعد سداد الدفعة الأولى، بمعدل 20,000 ريال شهرياً.',
      smsMessageText: 'الأخ/الأخت محمد عبدالله الصنعاني المحترم،\nتحية طيبة من مركز الأمل للتجارة والخدمات.\nتذكيراً بخطة السداد المعتمدة لرصيدكم المستحق (80,000 ريال):\n- تم سداد القسط الأول (20,000 ريال).\n- القسط القادم يستحق في 2026-05-01 بمبلغ 20,000 ريال.\nشاكرين حسن التزامكم.',
      createdAt: '2026-03-20T10:00:00.000Z'
    },
    createdAt: '2026-03-05T12:00:00.000Z',
    updatedAt: '2026-03-18T14:30:00.000Z'
  },
  {
    id: 'cust_init_3',
    name: 'أحمد علي القدسي',
    phone: '733456789',
    debit: 45000,
    credit: 45000,
    balance: 0,
    notes: 'تم تصفية الحساب بالكامل نقداً',
    category: 'عميل منتظم',
    accountNumber: 'ACC-103',
    status: 'sent',
    lastSentAt: '2026-03-20T09:15:00.000Z',
    lastSentChannel: 'sms',
    transactions: [
      {
        id: 'tx_3_1',
        date: '2026-03-10',
        type: 'debit',
        amount: 45000,
        note: 'فاتورة رقم 1080',
        receiptNumber: 'INV-1080'
      },
      {
        id: 'tx_3_2',
        date: '2026-03-20',
        type: 'credit',
        amount: 45000,
        note: 'سداد كامل الحساب',
        receiptNumber: 'REC-76'
      }
    ],
    createdAt: '2026-03-10T08:00:00.000Z',
    updatedAt: '2026-03-20T09:15:00.000Z'
  },
  {
    id: 'cust_init_4',
    name: 'خالد عبده الحكيمي',
    phone: '770112233',
    debit: 195000,
    credit: 25000,
    balance: 170000,
    notes: 'متبقي حساب أجهزة كهربائية وطاقة شمسية',
    category: 'عميل آجل',
    accountNumber: 'ACC-104',
    status: 'unnotified',
    lastSentAt: null,
    lastSentChannel: null,
    urgencyLevel: 'critical',
    urgencyScore: 94,
    urgencyDebtDurationDays: 41,
    urgencyReasoning: 'مستوى حرج جداً: رصيد ضخم جداً (170,000 ريال) مضى عليه أكثر من 40 يوماً مع دفعة واحدة ضئيلة لا تتعدى 13%. يشكل مخاطرة مالية رئيسية.',
    urgencySuggestedAction: 'اتصال هاتفي مباشر فوري من الإدارة وإرسال إنذار SMS عاجل للمطالبة بسداد دفعة مجزية أو جدولتها كتابياً.',
    urgencyTone: 'urgent',
    urgencyRiskFactors: ['رصيد ضخم (170,000 ريال)', 'تجاوز 40 يوماً', 'سداد جزئي ضئيل'],
    urgencyAnalyzedAt: '2026-03-25T10:00:00.000Z',
    transactions: [
      {
        id: 'tx_4_1',
        date: '2026-02-28',
        type: 'debit',
        amount: 195000,
        note: 'شراء بطاريات والواح شمسية',
        receiptNumber: 'INV-990'
      },
      {
        id: 'tx_4_2',
        date: '2026-03-14',
        type: 'credit',
        amount: 25000,
        note: 'دفعة أولى',
        receiptNumber: 'REC-62'
      }
    ],
    createdAt: '2026-02-28T16:00:00.000Z',
    updatedAt: '2026-03-14T10:00:00.000Z'
  },
  {
    id: 'cust_init_5',
    name: 'طارق حسن العدني',
    phone: '773665544',
    debit: 32000,
    credit: 0,
    balance: 32000,
    notes: 'وعد بالسداد نهاية الأسبوع الحالي',
    category: 'عميل منتظم',
    accountNumber: 'ACC-105',
    status: 'unnotified',
    lastSentAt: null,
    lastSentChannel: null,
    urgencyLevel: 'medium',
    urgencyScore: 48,
    urgencyDebtDurationDays: 25,
    urgencyReasoning: 'مبلغ متوسط (32,000 ريال) وعمر دين 25 يوماً مع وعد بالسداد. يحتاج إلى تذكير ودي قبل نهاية الأسبوع.',
    urgencySuggestedAction: 'إرسال تذكير لطيف عبر واتساب للتأكيد على موعد السداد الموعود.',
    urgencyTone: 'friendly',
    urgencyRiskFactors: ['وعد سداد قائم'],
    urgencyAnalyzedAt: '2026-03-25T10:00:00.000Z',
    transactions: [
      {
        id: 'tx_5_1',
        date: '2026-03-15',
        type: 'debit',
        amount: 32000,
        note: 'مشتريات متنوعة',
        receiptNumber: 'INV-1110'
      }
    ],
    createdAt: '2026-03-15T11:00:00.000Z',
    updatedAt: '2026-03-15T11:00:00.000Z'
  },
  {
    id: 'cust_init_6',
    name: 'صالح ناصر المهري',
    phone: '775889900',
    debit: 0,
    credit: 15000,
    balance: -15000,
    notes: 'دائن - له رصيد متبقي لدينا ناتج عن إرجاع بضاعة',
    category: 'عميل دائن',
    accountNumber: 'ACC-106',
    status: 'exempt',
    lastSentAt: null,
    lastSentChannel: null,
    transactions: [
      {
        id: 'tx_6_1',
        date: '2026-03-16',
        type: 'credit',
        amount: 15000,
        note: 'مردودات مبيعات - رصيد للعميل',
        receiptNumber: 'RET-12'
      }
    ],
    createdAt: '2026-03-16T15:00:00.000Z',
    updatedAt: '2026-03-16T15:00:00.000Z'
  },
  {
    id: 'cust_init_7',
    name: 'يوسف سعيد التعزي',
    phone: '772334455',
    debit: 68000,
    credit: 18000,
    balance: 50000,
    notes: 'مستلزمات صيانة ومواد بناء',
    category: 'عميل آجل',
    accountNumber: 'ACC-107',
    status: 'unnotified',
    lastSentAt: null,
    lastSentChannel: null,
    urgencyLevel: 'medium',
    urgencyScore: 56,
    urgencyDebtDurationDays: 32,
    urgencyReasoning: 'رصيد 50,000 ريال تجاوز شهراً بقليل مع وجود سداد جزئي مشجع في 19 مارس. يحتاج متابعة اعتيادية.',
    urgencySuggestedAction: 'إرسال رسالة SMS تذكيرية ببيان الرصيد الحالي وشكر العميل على الدفعة السابقة.',
    urgencyTone: 'firm',
    urgencyRiskFactors: ['عمر الدين 32 يوماً'],
    urgencyAnalyzedAt: '2026-03-25T10:00:00.000Z',
    transactions: [
      {
        id: 'tx_7_1',
        date: '2026-03-08',
        type: 'debit',
        amount: 68000,
        note: 'فاتورة مواد صيانة',
        receiptNumber: 'INV-1065'
      },
      {
        id: 'tx_7_2',
        date: '2026-03-19',
        type: 'credit',
        amount: 18000,
        note: 'دفعة سداد نقدية',
        receiptNumber: 'REC-71'
      }
    ],
    createdAt: '2026-03-08T09:00:00.000Z',
    updatedAt: '2026-03-19T13:00:00.000Z'
  },
  {
    id: 'cust_init_8',
    name: 'فهد عبدالكريم المأربي',
    phone: '774998877',
    debit: 240000,
    credit: 50000,
    balance: 190000,
    notes: 'مورد وتاجر تجزئة - دفعة شيك مستحقة',
    category: 'عميل جملة',
    accountNumber: 'ACC-108',
    status: 'unnotified',
    lastSentAt: null,
    lastSentChannel: null,
    urgencyLevel: 'critical',
    urgencyScore: 96,
    urgencyDebtDurationDays: 49,
    urgencyReasoning: 'مستوى حرج جداً: أعلى رصيد مديونية في المحفظة (190,000 ريال) مضى عليه 49 يوماً مع دفعة شيك قديمة. يتطلب إشعاراً عاجلاً ومتابعة مكثفة.',
    urgencySuggestedAction: 'اتصال هاتفي مباشر مع التاجر وإرسال كشف حساب رسمي ومطالبة بدفعة نقدية عاجلة.',
    urgencyTone: 'urgent',
    urgencyRiskFactors: ['أعلى رصيد مديونية (190,000 ريال)', 'عمر الدين 49 يوماً', 'دفعة شيك مستحقة'],
    urgencyAnalyzedAt: '2026-03-25T10:00:00.000Z',
    transactions: [
      {
        id: 'tx_8_1',
        date: '2026-02-20',
        type: 'debit',
        amount: 240000,
        note: 'فاتورة بضاعة جملة',
        receiptNumber: 'INV-950'
      },
      {
        id: 'tx_8_2',
        date: '2026-03-10',
        type: 'credit',
        amount: 50000,
        note: 'دفعة شيك مصرفي',
        receiptNumber: 'CHK-331'
      }
    ],
    createdAt: '2026-02-20T11:00:00.000Z',
    updatedAt: '2026-03-10T14:00:00.000Z'
  }
];
