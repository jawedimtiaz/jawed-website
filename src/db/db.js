import { openDB } from 'idb';

export const DB_NAME = 'JawedMoneyManagerDB';
export const DB_VERSION = 2;

const SAMPLE_RECEIPT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="560" viewBox="0 0 420 560">
  <rect width="420" height="560" rx="16" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <rect x="24" y="24" width="372" height="68" rx="10" fill="#0f172a"/>
  <text x="44" y="56" fill="#38bdf8" font-family="monospace" font-size="18" font-weight="bold">METRO FRESH SUPERMARKET</text>
  <text x="44" y="76" fill="#94a3b8" font-family="monospace" font-size="12">GSTIN: 19AABCM4921R1Z6 • Kolkata, WB</text>
  <line x1="24" y1="114" x2="396" y2="114" stroke="#cbd5e1" stroke-dasharray="4 4"/>
  <text x="28" y="140" fill="#334155" font-family="monospace" font-size="13">Date: 2026-11-02 18:40   Bill #INV-88412</text>
  <text x="28" y="162" fill="#334155" font-family="monospace" font-size="13">Payment Mode: UPI (ICICI Bank)</text>
  <line x1="24" y1="180" x2="396" y2="180" stroke="#cbd5e1"/>
  <text x="28" y="210" fill="#0f172a" font-family="monospace" font-size="13" font-weight="bold">ITEM                          QTY    AMOUNT</text>
  <text x="28" y="242" fill="#1e293b" font-family="monospace" font-size="13">Daawat Basmati Rice 5kg        1   ₹640.00</text>
  <text x="28" y="270" fill="#1e293b" font-family="monospace" font-size="13">Cold Pressed Mustard Oil 2L    1   ₹420.00</text>
  <text x="28" y="298" fill="#1e293b" font-family="monospace" font-size="13">Amul Butter &amp; Dairy Pack       2   ₹580.00</text>
  <text x="28" y="326" fill="#1e293b" font-family="monospace" font-size="13">Fresh Vegetables &amp; Fruits     1   ₹890.00</text>
  <text x="28" y="354" fill="#1e293b" font-family="monospace" font-size="13">Household Essentials           1   ₹920.00</text>
  <line x1="24" y1="384" x2="396" y2="384" stroke="#cbd5e1"/>
  <text x="28" y="418" fill="#0f172a" font-family="monospace" font-size="16" font-weight="bold">TOTAL PAID (INR)                 ₹3,450.00</text>
  <rect x="28" y="454" width="364" height="64" rx="8" fill="#f0fdf4" stroke="#86efac"/>
  <text x="46" y="482" fill="#166534" font-family="monospace" font-size="13" font-weight="bold">✓ UPI TRANSACTION SUCCESSFUL</text>
  <text x="46" y="502" fill="#15803d" font-family="monospace" font-size="11">RRN: 630619482014 • Verified Local Receipt</text>
</svg>`;

export const SAMPLE_RECEIPT_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(SAMPLE_RECEIPT_SVG)}`;

export const INITIAL_ACCOUNTS = [
  {
    id: 'acc-icici',
    name: 'ICICI',
    type: 'Bank',
    openingBalance: 145000,
    currentBalance: 145000,
    reconciled: true,
    lastReconciledAt: '2026-11-01',
  },
  {
    id: 'acc-sbi',
    name: 'SBI',
    type: 'Bank',
    openingBalance: 82500,
    currentBalance: 82500,
    reconciled: true,
    lastReconciledAt: '2026-11-01',
  },
  {
    id: 'acc-ubi',
    name: 'UBI',
    type: 'Bank',
    openingBalance: 38000,
    currentBalance: 38000,
    reconciled: true,
    lastReconciledAt: '2026-10-28',
  },
  {
    id: 'acc-cash',
    name: 'Cash',
    type: 'Cash',
    openingBalance: 12000,
    currentBalance: 12000,
    reconciled: true,
    lastReconciledAt: '2026-11-02',
  },
  {
    id: 'acc-card',
    name: 'Credit Card',
    type: 'Card',
    openingBalance: 0,
    currentBalance: 0,
    reconciled: false,
    lastReconciledAt: '2026-10-25',
  },
];

export const INITIAL_CATEGORIES = [
  {
    id: 'cat-salary',
    name: 'Salary',
    type: 'Income',
    defaultFixedOrVariable: 'Fixed',
    iconName: 'Briefcase',
    subCategories: ['Monthly Payroll', 'Performance Bonus', 'Arrears'],
    color: '#2563eb',
  },
  {
    id: 'cat-freelance',
    name: 'IT Consulting',
    type: 'Income',
    defaultFixedOrVariable: 'Variable',
    iconName: 'Laptop',
    subCategories: ['Field Dispatch', 'Network Audit', 'Advisory'],
    color: '#0ea5e9',
  },
  {
    id: 'cat-dividends',
    name: 'Dividends & Interest',
    type: 'Income',
    defaultFixedOrVariable: 'Variable',
    iconName: 'TrendingUp',
    subCategories: ['Bank Interest', 'ETF Dividend', 'FD Maturity'],
    color: '#10b981',
  },
  {
    id: 'cat-rent',
    name: 'Rent & Housing',
    type: 'Expense',
    defaultFixedOrVariable: 'Fixed',
    iconName: 'Home',
    subCategories: ['Apartment Rent', 'Society Maintenance', 'Property Tax'],
    monthlyBudget: 24000,
    color: '#ef4444',
  },
  {
    id: 'cat-food',
    name: 'Food & Groceries',
    type: 'Expense',
    defaultFixedOrVariable: 'Variable',
    iconName: 'Utensils',
    subCategories: ['Supermarket Groceries', 'Vegetables & Dairy', 'Dining Out', 'Tea & Snacks'],
    monthlyBudget: 16000,
    color: '#3b82f6',
  },
  {
    id: 'cat-utilities',
    name: 'Utilities & Broadband',
    type: 'Expense',
    defaultFixedOrVariable: 'Fixed',
    iconName: 'Zap',
    subCategories: ['Electricity Bill', 'Fiber Broadband', 'Mobile Postpaid', 'LPG Cylinder'],
    monthlyBudget: 6500,
    color: '#10b981',
  },
  {
    id: 'cat-education',
    name: 'Education',
    type: 'Expense',
    defaultFixedOrVariable: 'Fixed',
    iconName: 'GraduationCap',
    subCategories: ['School Tuition', 'Books & Stationery', 'Certification Exam'],
    monthlyBudget: 8500,
    color: '#f59e0b',
  },
  {
    id: 'cat-medical',
    name: 'Medical & Health',
    type: 'Expense',
    defaultFixedOrVariable: 'Variable',
    iconName: 'HeartPulse',
    subCategories: ['Pharmacy & Medicines', 'Doctor Consultation', 'Lab Diagnostics'],
    monthlyBudget: 5000,
    color: '#8b5cf6',
  },
  {
    id: 'cat-transport',
    name: 'Transport & Fuel',
    type: 'Expense',
    defaultFixedOrVariable: 'Variable',
    iconName: 'Car',
    subCategories: ['Petrol / Fuel', 'Metro & Cab', 'Vehicle Servicing'],
    monthlyBudget: 6000,
    color: '#ec4899',
  },
  {
    id: 'cat-lifestyle',
    name: 'Lifestyle & Family',
    type: 'Expense',
    defaultFixedOrVariable: 'Variable',
    iconName: 'ShoppingBag',
    subCategories: ['Apparel', 'Home Hardware', 'Gifts & Charity', 'Subscriptions'],
    monthlyBudget: 8000,
    color: '#14b8a6',
  },
];

export const INITIAL_SINKING_FUNDS = [
  {
    id: 'sf-school-fees',
    name: 'Children School Fees (Annual Admission)',
    targetAmount: 60000,
    monthlyTarget: 5000,
    currentAccrued: 45000,
  },
  {
    id: 'sf-eid-festival',
    name: 'Eid / Festival & Charity Provision',
    targetAmount: 36000,
    monthlyTarget: 3000,
    currentAccrued: 24000,
  },
  {
    id: 'sf-insurance',
    name: 'Annual Health & Term Insurance Premium',
    targetAmount: 42000,
    monthlyTarget: 3500,
    currentAccrued: 35000,
  },
  {
    id: 'sf-it-lab',
    name: 'Home Lab & MacBook Replacement Reserve',
    targetAmount: 90000,
    monthlyTarget: 4500,
    currentAccrued: 54000,
  },
];

export const INITIAL_RECURRING_RULES = [
  {
    id: 'rec-monthly-salary',
    title: 'Monthly Payroll Salary Credit',
    frequency: 'Monthly',
    type: 'Income',
    accountId: 'acc-icici',
    amount: 118000,
    category: 'Salary',
    subCategory: 'Monthly Payroll',
    fixedOrVariable: 'Fixed',
    note: 'Automated monthly salary NEFT credit',
    startDate: '2026-11-01',
    nextRunDate: '2026-12-01',
    timeOfDay: '09:30',
    active: true,
    lastGeneratedDate: '2026-11-01',
    generatedCount: 1,
  },
  {
    id: 'rec-monthly-rent',
    title: 'Apartment Rent & Society Maintenance',
    frequency: 'Monthly',
    type: 'Expense',
    accountId: 'acc-icici',
    amount: 22000,
    category: 'Rent & Housing',
    subCategory: 'Apartment Rent',
    fixedOrVariable: 'Fixed',
    note: 'Standing instruction for monthly house rent',
    startDate: '2026-11-01',
    nextRunDate: '2026-12-01',
    timeOfDay: '11:15',
    active: true,
    lastGeneratedDate: '2026-11-01',
    generatedCount: 1,
  },
  {
    id: 'rec-monthly-broadband',
    title: 'Dual-WAN Fiber Broadband & Utilities',
    frequency: 'Monthly',
    type: 'Expense',
    accountId: 'acc-sbi',
    amount: 1499,
    category: 'Utilities & Broadband',
    subCategory: 'Fiber Broadband',
    fixedOrVariable: 'Fixed',
    note: 'Recurring monthly ISP fiber bill auto-pay',
    startDate: '2026-11-05',
    nextRunDate: '2026-11-05',
    timeOfDay: '10:00',
    active: true,
    generatedCount: 0,
  },
  {
    id: 'rec-weekly-produce',
    title: 'Weekly Fresh Vegetables & Dairy Basket',
    frequency: 'Weekly',
    type: 'Expense',
    accountId: 'acc-cash',
    amount: 1250,
    category: 'Food & Groceries',
    subCategory: 'Vegetables & Dairy',
    fixedOrVariable: 'Variable',
    note: 'Weekly market produce & dairy refill',
    startDate: '2026-11-08',
    nextRunDate: '2026-11-08',
    timeOfDay: '08:30',
    active: true,
    generatedCount: 0,
  },
  {
    id: 'rec-monthly-sbi-reserve',
    title: 'Monthly Sinking Fund Transfer to SBI',
    frequency: 'Monthly',
    type: 'Transfer',
    accountId: 'acc-icici',
    toAccountId: 'acc-sbi',
    amount: 16000,
    category: 'Transfer',
    subCategory: 'NEFT / IMPS Self Transfer',
    fixedOrVariable: 'Fixed',
    note: 'Automated monthly transfer for annual provisions reserve',
    startDate: '2026-11-10',
    nextRunDate: '2026-11-10',
    timeOfDay: '14:00',
    active: true,
    generatedCount: 0,
  },
];

export const INITIAL_TRANSACTIONS = [
  {
    id: 'tx-2026-11-01-salary',
    date: '2026-11-01T09:30',
    type: 'Income',
    accountId: 'acc-icici',
    amount: 118000,
    category: 'Salary',
    subCategory: 'Monthly Payroll',
    fixedOrVariable: 'Fixed',
    note: 'November monthly salary credited via NEFT',
    receiptImages: [],
    isAnomaly: false,
  },
  {
    id: 'tx-2026-11-01-rent',
    date: '2026-11-01T11:15',
    type: 'Expense',
    accountId: 'acc-icici',
    amount: 22000,
    category: 'Rent & Housing',
    subCategory: 'Apartment Rent',
    fixedOrVariable: 'Fixed',
    note: 'Monthly house rent + maintenance transfer',
    receiptImages: [],
    isAnomaly: false,
  },
  {
    id: 'tx-2026-11-01-atm-transfer',
    date: '2026-11-01T16:20',
    type: 'Transfer',
    accountId: 'acc-sbi',
    toAccountId: 'acc-cash',
    amount: 8000,
    category: 'Transfer',
    subCategory: 'ATM Withdrawal',
    fixedOrVariable: 'Variable',
    note: 'Withdrew cash from SBI ATM for household petty cash',
    receiptImages: [],
    isAnomaly: false,
  },
  {
    id: 'tx-2026-11-02-groceries',
    date: '2026-11-02T18:40',
    type: 'Expense',
    accountId: 'acc-icici',
    amount: 3450,
    category: 'Food & Groceries',
    subCategory: 'Supermarket Groceries',
    fixedOrVariable: 'Variable',
    note: 'Monthly ration, basmati rice, mustard oil & fresh produce',
    receiptImages: [SAMPLE_RECEIPT_DATA_URL],
    isAnomaly: false,
  },
  {
    id: 'tx-2026-11-02-utilities',
    date: '2026-11-02T19:15',
    type: 'Expense',
    accountId: 'acc-sbi',
    amount: 4280,
    category: 'Utilities & Broadband',
    subCategory: 'Electricity Bill',
    fixedOrVariable: 'Fixed',
    note: 'CESC electricity bill + dual-WAN fiber broadband',
    receiptImages: [],
    isAnomaly: false,
  },
  {
    id: 'tx-2026-11-02-education',
    date: '2026-11-02T20:05',
    type: 'Expense',
    accountId: 'acc-ubi',
    amount: 6500,
    category: 'Education',
    subCategory: 'School Tuition',
    fixedOrVariable: 'Fixed',
    note: 'Quarterly school tuition & lab activity fee',
    receiptImages: [],
    isAnomaly: false,
  },
  {
    id: 'tx-2026-11-02-medical-anomaly',
    date: '2026-11-02T21:10',
    type: 'Expense',
    accountId: 'acc-card',
    amount: 7850,
    category: 'Medical & Health',
    subCategory: 'Lab Diagnostics',
    fixedOrVariable: 'Variable',
    note: 'Unbudgeted comprehensive family blood panel & dental check',
    receiptImages: [],
    isAnomaly: true,
  },
  {
    id: 'tx-2026-11-02-consulting',
    date: '2026-11-02T21:45',
    type: 'Income',
    accountId: 'acc-sbi',
    amount: 14500,
    category: 'IT Consulting',
    subCategory: 'Network Audit',
    fixedOrVariable: 'Variable',
    note: 'Weekend enterprise Wi-Fi & rack cabling dispatch payout',
    receiptImages: [],
    isAnomaly: false,
  },
  {
    id: 'tx-2026-11-02-transport',
    date: '2026-11-02T14:10',
    type: 'Expense',
    accountId: 'acc-cash',
    amount: 2150,
    category: 'Transport & Fuel',
    subCategory: 'Petrol / Fuel',
    fixedOrVariable: 'Variable',
    note: 'Full tank petrol refill + parking',
    receiptImages: [],
    isAnomaly: false,
  },
  {
    id: 'tx-2026-10-01-salary',
    date: '2026-10-01T09:30',
    type: 'Income',
    accountId: 'acc-icici',
    amount: 118000,
    category: 'Salary',
    subCategory: 'Monthly Payroll',
    fixedOrVariable: 'Fixed',
    note: 'October salary credit',
    receiptImages: [],
    isAnomaly: false,
  },
  {
    id: 'tx-2026-10-12-expenses',
    date: '2026-10-12T18:00',
    type: 'Expense',
    accountId: 'acc-icici',
    amount: 61400,
    category: 'Rent & Housing',
    subCategory: 'Apartment Rent',
    fixedOrVariable: 'Fixed',
    note: 'October consolidated rent, groceries & festive shopping',
    receiptImages: [],
    isAnomaly: false,
  },
  {
    id: 'tx-2026-09-01-salary',
    date: '2026-09-01T09:30',
    type: 'Income',
    accountId: 'acc-icici',
    amount: 124000,
    category: 'Salary',
    subCategory: 'Monthly Payroll',
    fixedOrVariable: 'Fixed',
    note: 'September salary + on-call allowance',
    receiptImages: [],
    isAnomaly: false,
  },
  {
    id: 'tx-2026-09-15-expenses',
    date: '2026-09-15T18:00',
    type: 'Expense',
    accountId: 'acc-icici',
    amount: 54800,
    category: 'Rent & Housing',
    subCategory: 'Apartment Rent',
    fixedOrVariable: 'Fixed',
    note: 'September household & utility expenses',
    receiptImages: [],
    isAnomaly: false,
  },
  {
    id: 'tx-2026-08-01-salary',
    date: '2026-08-01T09:30',
    type: 'Income',
    accountId: 'acc-icici',
    amount: 118000,
    category: 'Salary',
    subCategory: 'Monthly Payroll',
    fixedOrVariable: 'Fixed',
    note: 'August salary credit',
    receiptImages: [],
    isAnomaly: false,
  },
  {
    id: 'tx-2026-08-18-expenses',
    date: '2026-08-18T18:00',
    type: 'Expense',
    accountId: 'acc-icici',
    amount: 58200,
    category: 'Food & Groceries',
    subCategory: 'Supermarket Groceries',
    fixedOrVariable: 'Variable',
    note: 'August rent, school books & groceries',
    receiptImages: [],
    isAnomaly: false,
  },
  {
    id: 'tx-2026-07-01-salary',
    date: '2026-07-01T09:30',
    type: 'Income',
    accountId: 'acc-icici',
    amount: 115000,
    category: 'Salary',
    subCategory: 'Monthly Payroll',
    fixedOrVariable: 'Fixed',
    note: 'July salary credit',
    receiptImages: [],
    isAnomaly: false,
  },
  {
    id: 'tx-2026-07-19-expenses',
    date: '2026-07-19T18:00',
    type: 'Expense',
    accountId: 'acc-icici',
    amount: 52900,
    category: 'Rent & Housing',
    subCategory: 'Apartment Rent',
    fixedOrVariable: 'Fixed',
    note: 'July household & medical expenses',
    receiptImages: [],
    isAnomaly: false,
  },
  {
    id: 'tx-2026-06-01-salary',
    date: '2026-06-01T09:30',
    type: 'Income',
    accountId: 'acc-icici',
    amount: 115000,
    category: 'Salary',
    subCategory: 'Monthly Payroll',
    fixedOrVariable: 'Fixed',
    note: 'June salary credit',
    receiptImages: [],
    isAnomaly: false,
  },
  {
    id: 'tx-2026-06-20-expenses',
    date: '2026-06-20T18:00',
    type: 'Expense',
    accountId: 'acc-icici',
    amount: 49500,
    category: 'Utilities & Broadband',
    subCategory: 'Electricity Bill',
    fixedOrVariable: 'Fixed',
    note: 'June summer AC electricity + household expenses',
    receiptImages: [],
    isAnomaly: false,
  },
];

const memoryStore = {
  accounts: new Map(),
  categories: new Map(),
  transactions: new Map(),
  sinkingFunds: new Map(),
  recurringRules: new Map(),
  seeded: false,
};

function hasNativeIndexedDB() {
  return typeof globalThis !== 'undefined' && typeof globalThis.indexedDB !== 'undefined';
}

let dbPromise = null;

export async function getMoneyManagerDB() {
  if (!hasNativeIndexedDB()) {
    return null;
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('accounts')) {
          db.createObjectStore('accounts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
          txStore.createIndex('by-date', 'date');
          txStore.createIndex('by-account', 'accountId');
          txStore.createIndex('by-type', 'type');
        }
        if (!db.objectStoreNames.contains('sinkingFunds')) {
          db.createObjectStore('sinkingFunds', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('recurringRules')) {
          const recStore = db.createObjectStore('recurringRules', { keyPath: 'id' });
          recStore.createIndex('by-nextRunDate', 'nextRunDate');
          recStore.createIndex('by-frequency', 'frequency');
        }
      },
    });
  }

  return dbPromise;
}

export const initDB = getMoneyManagerDB;

export function computeNextRecurringDate(currentDateStr, frequency) {
  const [yStr, mStr, dStr] = String(currentDateStr).slice(0, 10).split('-');
  const year = Number.parseInt(yStr, 10) || 2026;
  const monthIdx = (Number.parseInt(mStr, 10) || 1) - 1;
  const day = Number.parseInt(dStr, 10) || 1;

  if (frequency === 'Daily') {
    const dt = new Date(Date.UTC(year, monthIdx, day + 1));
    return dt.toISOString().slice(0, 10);
  }

  if (frequency === 'Weekly') {
    const dt = new Date(Date.UTC(year, monthIdx, day + 7));
    return dt.toISOString().slice(0, 10);
  }

  if (frequency === 'Bi-Weekly') {
    const dt = new Date(Date.UTC(year, monthIdx, day + 14));
    return dt.toISOString().slice(0, 10);
  }

  const monthsToAdd =
    frequency === 'Quarterly' ? 3 : frequency === 'Yearly' ? 12 : 1;
  const totalMonthIdx = monthIdx + monthsToAdd;
  const targetYear = year + Math.floor(totalMonthIdx / 12);
  const targetMonthIdx = ((totalMonthIdx % 12) + 12) % 12;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonthIdx + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, daysInTargetMonth);
  const dt = new Date(Date.UTC(targetYear, targetMonthIdx, clampedDay));
  return dt.toISOString().slice(0, 10);
}

export function computeRecurringOccurrencesForMonth(rule, yearMonth) {
  if (!rule || !rule.active || !yearMonth) return [];

  const [yStr, mStr] = String(yearMonth).split('-');
  const year = Number.parseInt(yStr, 10);
  const month = Number.parseInt(mStr, 10);
  if (!year || !month) return [];

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = `${yearMonth}-01`;
  const monthEnd = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

  const anchorDate = String(rule.startDate || rule.nextRunDate || monthStart).slice(0, 10);
  if (anchorDate > monthEnd) return [];
  if (rule.endDate && String(rule.endDate).slice(0, 10) < monthStart) return [];

  const occurrences = [];
  let cursor = anchorDate;
  let safety = 0;

  while (cursor <= monthEnd && safety < 1500) {
    safety += 1;
    if (cursor >= monthStart && cursor <= monthEnd) {
      if (!rule.endDate || cursor <= String(rule.endDate).slice(0, 10)) {
        occurrences.push(cursor);
      }
    }
    const nextCursor = computeNextRecurringDate(cursor, rule.frequency);
    if (nextCursor <= cursor) break;
    cursor = nextCursor;
  }

  return occurrences;
}

export function buildRecurringFeedTransactionsForMonth(
  transactions,
  recurringRules,
  yearMonth
) {
  const baseTransactions = Array.isArray(transactions) ? [...transactions] : [];
  if (!Array.isArray(recurringRules) || recurringRules.length === 0 || !yearMonth) {
    return baseTransactions;
  }

  const existingIds = new Set(baseTransactions.map((tx) => tx.id));
  const synthesized = [];

  for (const rule of recurringRules) {
    if (!rule.active) continue;
    const occurrences = computeRecurringOccurrencesForMonth(rule, yearMonth);

    for (const occDate of occurrences) {
      const deterministicTxId = `tx-rec-${rule.id}-${occDate}`;
      if (existingIds.has(deterministicTxId)) continue;

      const alreadyLoggedForRuleDate = baseTransactions.some((tx) => {
        const txDate = String(tx.date || '').slice(0, 10);
        if (tx.recurringRuleId === rule.id && txDate === occDate) {
          return true;
        }
        if (
          txDate === occDate &&
          tx.type === rule.type &&
          tx.accountId === rule.accountId &&
          tx.category === (rule.type === 'Transfer' ? 'Transfer' : rule.category) &&
          Number(tx.amount) === Number(rule.amount)
        ) {
          return true;
        }
        return false;
      });

      if (alreadyLoggedForRuleDate) continue;

      const timePart =
        rule.timeOfDay && /^\d{2}:\d{2}$/.test(rule.timeOfDay) ? rule.timeOfDay : '09:00';
      const baseNote = rule.note || rule.title;
      const formattedNote =
        baseNote.includes('[Auto-Recurring:') || baseNote.includes('[Recurring')
          ? baseNote
          : `${baseNote} [Auto-Recurring: ${rule.frequency}]`;

      const autoEntry = {
        id: deterministicTxId,
        date: `${occDate}T${timePart}`,
        type: rule.type,
        accountId: rule.accountId,
        toAccountId: rule.type === 'Transfer' ? rule.toAccountId : undefined,
        amount: Number(rule.amount) || 0,
        category: rule.type === 'Transfer' ? 'Transfer' : rule.category,
        subCategory: rule.subCategory || rule.title,
        fixedOrVariable: rule.fixedOrVariable,
        note: formattedNote,
        receiptImages: [],
        isAnomaly: false,
        recurringRuleId: rule.id,
      };

      existingIds.add(autoEntry.id);
      synthesized.push(autoEntry);
    }
  }

  return [...baseTransactions, ...synthesized].sort((a, b) =>
    String(b.date).localeCompare(String(a.date))
  );
}

export async function syncRecurringTransactionsForMonth(yearMonth) {
  const [yStr, mStr] = String(yearMonth).split('-');
  const year = Number.parseInt(yStr, 10) || 2026;
  const month = Number.parseInt(mStr, 10) || 11;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthEndDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
  return processDueRecurringRules(monthEndDate);
}

export async function processDueRecurringRules(referenceDateStr) {
  const cutoffDate = String(referenceDateStr || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const db = await getMoneyManagerDB();

  let rules;
  let existingTxMap;

  if (!db) {
    rules = [...memoryStore.recurringRules.values()];
    existingTxMap = new Map(memoryStore.transactions);
  } else {
    const [allRules, allTx] = await Promise.all([
      db.getAll('recurringRules'),
      db.getAll('transactions'),
    ]);
    rules = allRules;
    existingTxMap = new Map(allTx.map((t) => [t.id, t]));
  }

  const generatedTransactions = [];
  const updatedRules = [];

  for (const rawRule of rules) {
    if (!rawRule.active) continue;

    const rule = { ...rawRule };
    let safetyCounter = 0;
    let ruleChanged = false;

    while (
      rule.active &&
      rule.nextRunDate <= cutoffDate &&
      (!rule.endDate || rule.nextRunDate <= rule.endDate) &&
      safetyCounter < 366
    ) {
      safetyCounter += 1;
      const runDate = rule.nextRunDate;
      const deterministicTxId = `tx-rec-${rule.id}-${runDate}`;

      if (!existingTxMap.has(deterministicTxId)) {
        const timePart =
          rule.timeOfDay && /^\d{2}:\d{2}$/.test(rule.timeOfDay) ? rule.timeOfDay : '09:00';
        const newTx = {
          id: deterministicTxId,
          date: `${runDate}T${timePart}`,
          type: rule.type,
          accountId: rule.accountId,
          toAccountId: rule.type === 'Transfer' ? rule.toAccountId : undefined,
          amount: Number(rule.amount) || 0,
          category: rule.type === 'Transfer' ? 'Transfer' : rule.category,
          subCategory: rule.subCategory,
          fixedOrVariable: rule.fixedOrVariable,
          note: `${rule.note || rule.title} [Auto-Recurring: ${rule.frequency}]`,
          receiptImages: [],
          isAnomaly: false,
          recurringRuleId: rule.id,
        };

        existingTxMap.set(newTx.id, newTx);
        generatedTransactions.push(newTx);
      }

      rule.lastGeneratedDate = runDate;
      rule.generatedCount = (Number(rule.generatedCount) || 0) + 1;
      const nextDate = computeNextRecurringDate(runDate, rule.frequency);
      rule.nextRunDate = nextDate;
      if (rule.endDate && nextDate > rule.endDate) {
        rule.active = false;
      }
      ruleChanged = true;
    }

    if (ruleChanged) {
      updatedRules.push(rule);
    }
  }

  if (generatedTransactions.length > 0 || updatedRules.length > 0) {
    if (!db) {
      for (const tx of generatedTransactions) {
        memoryStore.transactions.set(tx.id, tx);
      }
      for (const r of updatedRules) {
        memoryStore.recurringRules.set(r.id, r);
      }
    } else {
      const tx = db.transaction(['transactions', 'recurringRules'], 'readwrite');
      for (const entry of generatedTransactions) {
        await tx.objectStore('transactions').put(entry);
      }
      for (const r of updatedRules) {
        await tx.objectStore('recurringRules').put(r);
      }
      await tx.done;
    }
  }

  return { generatedTransactions, updatedRules };
}

export async function triggerRecurringRuleNow(ruleId, customDateStr) {
  const db = await getMoneyManagerDB();
  const existingRule = !db
    ? memoryStore.recurringRules.get(ruleId)
    : await db.get('recurringRules', ruleId);

  if (!existingRule) return null;

  const targetDate = String(customDateStr || existingRule.nextRunDate).slice(0, 10);
  const timePart =
    existingRule.timeOfDay && /^\d{2}:\d{2}$/.test(existingRule.timeOfDay)
      ? existingRule.timeOfDay
      : '09:00';

  const txId = `tx-rec-${existingRule.id}-${targetDate}-${Date.now().toString(36).slice(-4)}`;
  const newTx = {
    id: txId,
    date: `${targetDate}T${timePart}`,
    type: existingRule.type,
    accountId: existingRule.accountId,
    toAccountId: existingRule.type === 'Transfer' ? existingRule.toAccountId : undefined,
    amount: Number(existingRule.amount) || 0,
    category: existingRule.type === 'Transfer' ? 'Transfer' : existingRule.category,
    subCategory: existingRule.subCategory,
    fixedOrVariable: existingRule.fixedOrVariable,
    note: `${existingRule.note || existingRule.title} [Recurring: ${existingRule.frequency}]`,
    receiptImages: [],
    isAnomaly: false,
    recurringRuleId: existingRule.id,
  };

  const nextRunDate = computeNextRecurringDate(targetDate, existingRule.frequency);
  const updatedRule = {
    ...existingRule,
    lastGeneratedDate: targetDate,
    generatedCount: (Number(existingRule.generatedCount) || 0) + 1,
    nextRunDate,
    active:
      existingRule.endDate && nextRunDate > existingRule.endDate
        ? false
        : existingRule.active,
  };

  if (!db) {
    memoryStore.transactions.set(newTx.id, newTx);
    memoryStore.recurringRules.set(updatedRule.id, updatedRule);
  } else {
    const tx = db.transaction(['transactions', 'recurringRules'], 'readwrite');
    await tx.objectStore('transactions').put(newTx);
    await tx.objectStore('recurringRules').put(updatedRule);
    await tx.done;
  }

  return newTx;
}

export async function initializeAndSeedDatabase(referenceDateStr) {
  const db = await getMoneyManagerDB();

  if (!db) {
    if (!memoryStore.seeded && memoryStore.accounts.size === 0) {
      for (const acc of INITIAL_ACCOUNTS) memoryStore.accounts.set(acc.id, { ...acc });
      for (const cat of INITIAL_CATEGORIES) memoryStore.categories.set(cat.id, { ...cat });
      for (const tx of INITIAL_TRANSACTIONS) memoryStore.transactions.set(tx.id, { ...tx });
      for (const sf of INITIAL_SINKING_FUNDS) memoryStore.sinkingFunds.set(sf.id, { ...sf });
      for (const rec of INITIAL_RECURRING_RULES) memoryStore.recurringRules.set(rec.id, { ...rec });
      memoryStore.seeded = true;
    }
    if (referenceDateStr) {
      await processDueRecurringRules(referenceDateStr);
    }
    return getAllLedgerState();
  }

  const existingAccounts = await db.count('accounts');
  if (existingAccounts === 0) {
    const tx = db.transaction(
      ['accounts', 'categories', 'transactions', 'sinkingFunds', 'recurringRules'],
      'readwrite'
    );
    for (const acc of INITIAL_ACCOUNTS) {
      await tx.objectStore('accounts').put(acc);
    }
    for (const cat of INITIAL_CATEGORIES) {
      await tx.objectStore('categories').put(cat);
    }
    for (const entry of INITIAL_TRANSACTIONS) {
      await tx.objectStore('transactions').put(entry);
    }
    for (const sf of INITIAL_SINKING_FUNDS) {
      await tx.objectStore('sinkingFunds').put(sf);
    }
    for (const rec of INITIAL_RECURRING_RULES) {
      await tx.objectStore('recurringRules').put(rec);
    }
    await tx.done;
  } else {
    const existingRules = await db.count('recurringRules');
    if (existingRules === 0) {
      const tx = db.transaction('recurringRules', 'readwrite');
      for (const rec of INITIAL_RECURRING_RULES) {
        await tx.store.put(rec);
      }
      await tx.done;
    }
  }

  if (referenceDateStr) {
    await processDueRecurringRules(referenceDateStr);
  }

  return getAllLedgerState();
}

export function calculateAccountSummaries(accounts, transactions) {
  return accounts.map((account) => {
    let totalCredits = 0;
    let totalDebits = 0;
    let transactionCount = 0;

    for (const tx of transactions) {
      const amount = Number(tx.amount) || 0;
      if (tx.type === 'Income' && tx.accountId === account.id) {
        totalCredits += amount;
        transactionCount += 1;
      } else if (tx.type === 'Expense' && tx.accountId === account.id) {
        totalDebits += amount;
        transactionCount += 1;
      } else if (tx.type === 'Transfer') {
        if (tx.accountId === account.id) {
          totalDebits += amount;
          transactionCount += 1;
        }
        if (tx.toAccountId === account.id) {
          totalCredits += amount;
          transactionCount += 1;
        }
      }
    }

    const currentBalance = (Number(account.openingBalance) || 0) + totalCredits - totalDebits;

    return {
      ...account,
      totalCredits,
      totalDebits,
      currentBalance,
      transactionCount,
    };
  });
}

export function calculateMonthlyMetrics(transactions, yearMonth) {
  let income = 0;
  let expense = 0;
  let transfersVolume = 0;
  let fixedExpense = 0;
  let variableExpense = 0;
  let anomalyCount = 0;
  let anomalyTotal = 0;

  for (const tx of transactions) {
    if (!tx.date || !tx.date.startsWith(yearMonth)) continue;
    const amount = Number(tx.amount) || 0;

    if (tx.type === 'Income') {
      income += amount;
    } else if (tx.type === 'Expense') {
      expense += amount;
      if (tx.fixedOrVariable === 'Fixed') {
        fixedExpense += amount;
      } else {
        variableExpense += amount;
      }
      if (tx.isAnomaly) {
        anomalyCount += 1;
        anomalyTotal += amount;
      }
    } else if (tx.type === 'Transfer') {
      transfersVolume += amount;
    }
  }

  const netBalance = income - expense;
  const savingsRate = income > 0 ? Number((((income - expense) / income) * 100).toFixed(1)) : 0;
  const fixedRatioPercent = expense > 0 ? Number(((fixedExpense / expense) * 100).toFixed(1)) : 0;
  const variableRatioPercent =
    expense > 0 ? Number(((variableExpense / expense) * 100).toFixed(1)) : 0;

  return {
    yearMonth,
    income,
    expense,
    netBalance,
    transfersVolume,
    savingsRate,
    fixedExpense,
    variableExpense,
    fixedRatioPercent,
    variableRatioPercent,
    anomalyCount,
    anomalyTotal,
  };
}

const CHART_COLORS = [
  '#ef4444',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#6366f1',
];

function resolveCategoryBudgetAndColorMaps(categoriesOrThresholds, customCategoriesOrColors) {
  const budgetMap = new Map();
  const colorMap = new Map();

  for (const cat of INITIAL_CATEGORIES) {
    if (cat.name && cat.color) {
      colorMap.set(cat.name, cat.color);
    }
  }

  let fallbackThreshold;

  if (typeof categoriesOrThresholds === 'number') {
    const valid = Math.max(0, Number(categoriesOrThresholds) || 0);
    fallbackThreshold = valid > 0 ? valid : undefined;
  } else if (Array.isArray(categoriesOrThresholds)) {
    for (const cat of categoriesOrThresholds) {
      if (cat && cat.name) {
        if (typeof cat.monthlyBudget === 'number' && cat.monthlyBudget > 0) {
          budgetMap.set(cat.name, cat.monthlyBudget);
        }
        if (cat.color) {
          colorMap.set(cat.name, cat.color);
        }
      }
    }
  } else if (categoriesOrThresholds && typeof categoriesOrThresholds === 'object') {
    for (const [k, v] of Object.entries(categoriesOrThresholds)) {
      const num = Number(v);
      if (num > 0) {
        budgetMap.set(k, num);
      }
    }
  } else {
    for (const cat of INITIAL_CATEGORIES) {
      if (cat.name && typeof cat.monthlyBudget === 'number' && cat.monthlyBudget > 0) {
        budgetMap.set(cat.name, cat.monthlyBudget);
      }
    }
  }

  if (Array.isArray(customCategoriesOrColors)) {
    for (const cat of customCategoriesOrColors) {
      if (cat && cat.name && cat.color) {
        colorMap.set(cat.name, cat.color);
      }
    }
  } else if (customCategoriesOrColors && typeof customCategoriesOrColors === 'object') {
    for (const [k, v] of Object.entries(customCategoriesOrColors)) {
      if (typeof v === 'string' && v.trim()) {
        colorMap.set(k, v.trim());
      }
    }
  }

  return { budgetMap, fallbackThreshold, colorMap };
}

export function calculateCategoryBreakdown(
  transactions,
  yearMonth,
  categoriesOrThresholds,
  customCategoriesOrColors
) {
  const map = new Map();
  let totalExpense = 0;

  for (const tx of transactions) {
    if (!tx.date?.startsWith(yearMonth) || tx.type !== 'Expense') continue;
    const amount = Number(tx.amount) || 0;
    totalExpense += amount;
    const current = map.get(tx.category) || { amount: 0, count: 0 };
    map.set(tx.category, {
      amount: current.amount + amount,
      count: current.count + 1,
    });
  }

  const { budgetMap, fallbackThreshold, colorMap } = resolveCategoryBudgetAndColorMaps(
    categoriesOrThresholds,
    customCategoriesOrColors
  );
  const sorted = [...map.entries()].sort((a, b) => b[1].amount - a[1].amount);

  return sorted.map(([category, data], idx) => {
    const monthlyBudget = budgetMap.get(category) ?? fallbackThreshold;
    const hasBudget = typeof monthlyBudget === 'number' && monthlyBudget > 0;
    const isOverBudget = hasBudget ? data.amount > monthlyBudget : false;
    const budgetUtilizationPercent = hasBudget
      ? Number(((data.amount / monthlyBudget) * 100).toFixed(1))
      : 0;
    const overBudgetAmount =
      hasBudget && data.amount > monthlyBudget ? data.amount - monthlyBudget : 0;
    const resolvedColor = colorMap.get(category) || CHART_COLORS[idx % CHART_COLORS.length];

    return {
      category,
      amount: data.amount,
      count: data.count,
      percentage: totalExpense > 0 ? Number(((data.amount / totalExpense) * 100).toFixed(1)) : 0,
      color: resolvedColor,
      monthlyBudget: hasBudget ? monthlyBudget : undefined,
      isOverBudget,
      budgetUtilizationPercent,
      overBudgetAmount,
    };
  });
}

export function calculateSixMonthTrend(transactions, referenceYearMonth) {
  const [yearStr, monthStr] = String(referenceYearMonth || '2026-11').split('-');
  const baseYear = Number.parseInt(yearStr, 10) || 2026;
  const baseMonth = Number.parseInt(monthStr, 10) || 11;

  const shortMonths = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const items = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const dateObj = new Date(baseYear, baseMonth - 1 - offset, 1);
    const y = dateObj.getFullYear();
    const m = dateObj.getMonth() + 1;
    const ym = `${y}-${String(m).padStart(2, '0')}`;
    const metrics = calculateMonthlyMetrics(transactions, ym);

    items.push({
      yearMonth: ym,
      label: `${shortMonths[m - 1]} '${String(y).slice(-2)}`,
      income: metrics.income,
      expense: metrics.expense,
      net: metrics.netBalance,
    });
  }

  return items;
}

export function calculateTwelveMonthTrend(transactions, referenceYearMonth) {
  const [yearStr, monthStr] = String(referenceYearMonth || '2026-11').split('-');
  const baseYear = Number.parseInt(yearStr, 10) || 2026;
  const baseMonth = Number.parseInt(monthStr, 10) || 11;

  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const items = [];

  for (let offset = 11; offset >= 0; offset -= 1) {
    const dateObj = new Date(baseYear, baseMonth - 1 - offset, 1);
    const y = dateObj.getFullYear();
    const m = dateObj.getMonth() + 1;
    const ym = `${y}-${String(m).padStart(2, '0')}`;
    const metrics = calculateMonthlyMetrics(transactions, ym);

    items.push({
      yearMonth: ym,
      label: `${shortMonths[m - 1]} '${String(y).slice(-2)}`,
      income: metrics.income,
      expense: metrics.expense,
      net: metrics.netBalance,
    });
  }

  return items;
}

export async function getAllLedgerState() {
  const db = await getMoneyManagerDB();

  let rawAccounts;
  let categories;
  let transactions;
  let sinkingFunds;
  let recurringRules;

  if (!db) {
    rawAccounts = [...memoryStore.accounts.values()];
    categories = [...memoryStore.categories.values()];
    transactions = [...memoryStore.transactions.values()];
    sinkingFunds = [...memoryStore.sinkingFunds.values()];
    recurringRules = [...memoryStore.recurringRules.values()];
  } else {
    [rawAccounts, categories, transactions, sinkingFunds, recurringRules] = await Promise.all([
      db.getAll('accounts'),
      db.getAll('categories'),
      db.getAll('transactions'),
      db.getAll('sinkingFunds'),
      db.getAll('recurringRules'),
    ]);
  }

  const defaultColorMap = new Map(
    INITIAL_CATEGORIES.map((c, idx) => [c.name, c.color || CHART_COLORS[idx % CHART_COLORS.length]])
  );
  categories = categories.map((cat, idx) => ({
    ...cat,
    color: cat.color || defaultColorMap.get(cat.name) || CHART_COLORS[idx % CHART_COLORS.length],
  }));

  transactions.sort((a, b) => b.date.localeCompare(a.date));
  recurringRules.sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate));

  const accounts = calculateAccountSummaries(rawAccounts, transactions);

  if (db) {
    const tx = db.transaction('accounts', 'readwrite');
    for (const acc of accounts) {
      await tx.store.put({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        openingBalance: acc.openingBalance,
        currentBalance: acc.currentBalance,
        reconciled: acc.reconciled,
        lastReconciledAt: acc.lastReconciledAt,
      });
    }
    await tx.done;
  } else {
    for (const acc of accounts) {
      memoryStore.accounts.set(acc.id, {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        openingBalance: acc.openingBalance,
        currentBalance: acc.currentBalance,
        reconciled: acc.reconciled,
        lastReconciledAt: acc.lastReconciledAt,
      });
    }
  }

  return {
    accounts,
    categories,
    transactions,
    sinkingFunds,
    recurringRules,
  };
}

export async function saveTransaction(transactionInput) {
  const id =
    transactionInput.id || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const record = {
    ...transactionInput,
    id,
    amount: Math.max(0, Number(transactionInput.amount) || 0),
    receiptImages: Array.isArray(transactionInput.receiptImages)
      ? transactionInput.receiptImages
      : [],
    isAnomaly: Boolean(transactionInput.isAnomaly),
  };

  const db = await getMoneyManagerDB();
  if (!db) {
    memoryStore.transactions.set(record.id, record);
  } else {
    await db.put('transactions', record);
  }

  return record;
}

export const addTransaction = saveTransaction;
export const updateTransaction = saveTransaction;

export async function deleteTransaction(id) {
  const db = await getMoneyManagerDB();
  if (!db) {
    memoryStore.transactions.delete(id);
  } else {
    await db.delete('transactions', id);
  }
}

export async function bulkImportTransactions(transactionsInput, options) {
  if (!Array.isArray(transactionsInput) || transactionsInput.length === 0) {
    return [];
  }

  const shouldSkipDuplicates = options?.skipDuplicates ?? true;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const makeDuplicateKey = (tx) => {
    const dateOnly = String(tx.date || '').slice(0, 10);
    const roundedAmt = Math.round(Math.abs(Number(tx.amount) || 0) * 100);
    const cleanDesc = String(tx.note ?? tx.description ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
    return `${dateOnly}|${roundedAmt}|${cleanDesc}`;
  };

  const db = await getMoneyManagerDB();
  const existingTransactions = !db
    ? [...memoryStore.transactions.values()]
    : await db.getAll('transactions');

  const existingFingerprints = new Set();
  const existingIds = new Set();
  for (const existing of existingTransactions) {
    existingIds.add(existing.id);
    if (shouldSkipDuplicates) {
      existingFingerprints.add(makeDuplicateKey(existing));
    }
  }

  const records = [];
  for (const item of transactionsInput) {
    const numericAmount = Math.max(0, Number(item.amount) || 0);
    if (numericAmount <= 0) continue;

    const dupKey = makeDuplicateKey({
      date: item.date,
      amount: numericAmount,
      note: item.note,
      description: item.description,
    });
    if (shouldSkipDuplicates && existingFingerprints.has(dupKey)) {
      continue;
    }
    existingFingerprints.add(dupKey);

    let assignedId =
      item.id && uuidRegex.test(item.id) && !existingIds.has(item.id)
        ? item.id
        : crypto.randomUUID();
    while (existingIds.has(assignedId)) {
      assignedId = crypto.randomUUID();
    }
    existingIds.add(assignedId);

    records.push({
      ...item,
      id: assignedId,
      amount: numericAmount,
      receiptImages: Array.isArray(item.receiptImages) ? item.receiptImages : [],
      isAnomaly: Boolean(item.isAnomaly),
    });
  }

  if (records.length === 0) return [];

  if (!db) {
    for (const rec of records) {
      memoryStore.transactions.set(rec.id, rec);
    }
  } else {
    const tx = db.transaction('transactions', 'readwrite');
    const store = tx.objectStore('transactions');
    for (const rec of records) {
      await store.put(rec);
    }
    await tx.done;
  }

  return records;
}

export async function saveAccount(account) {
  const db = await getMoneyManagerDB();
  if (!db) {
    memoryStore.accounts.set(account.id, { ...account });
  } else {
    await db.put('accounts', account);
  }
  return account;
}

export async function saveCategory(category) {
  const defaultColor =
    INITIAL_CATEGORIES.find((c) => c.id === category.id || c.name === category.name)?.color ||
    '#3b82f6';
  const normalized = {
    ...category,
    color: category.color?.trim() || defaultColor,
    monthlyBudget:
      category.monthlyBudget !== undefined && Number(category.monthlyBudget) > 0
        ? Number(category.monthlyBudget)
        : undefined,
  };
  const db = await getMoneyManagerDB();
  if (!db) {
    memoryStore.categories.set(normalized.id, normalized);
  } else {
    await db.put('categories', normalized);
  }
  return normalized;
}

export async function deleteCategory(id) {
  const db = await getMoneyManagerDB();
  if (!db) {
    memoryStore.categories.delete(id);
  } else {
    await db.delete('categories', id);
  }
}

export async function saveSinkingFund(fund) {
  const db = await getMoneyManagerDB();
  if (!db) {
    memoryStore.sinkingFunds.set(fund.id, { ...fund });
  } else {
    await db.put('sinkingFunds', fund);
  }
  return fund;
}

export async function deleteSinkingFund(id) {
  const db = await getMoneyManagerDB();
  if (!db) {
    memoryStore.sinkingFunds.delete(id);
  } else {
    await db.delete('sinkingFunds', id);
  }
}

export async function saveRecurringRule(ruleInput) {
  const id =
    ruleInput.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const record = {
    ...ruleInput,
    id,
    amount: Math.max(0, Number(ruleInput.amount) || 0),
    generatedCount: Number(ruleInput.generatedCount) || 0,
    active: ruleInput.active ?? true,
  };

  const db = await getMoneyManagerDB();
  if (!db) {
    memoryStore.recurringRules.set(record.id, record);
  } else {
    await db.put('recurringRules', record);
  }
  return record;
}

export async function deleteRecurringRule(id) {
  const db = await getMoneyManagerDB();
  if (!db) {
    memoryStore.recurringRules.delete(id);
  } else {
    await db.delete('recurringRules', id);
  }
}

export async function exportDatabaseBackup() {
  const state = await getAllLedgerState();
  return {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    database: DB_NAME,
    accounts: state.accounts.map(({ totalCredits, totalDebits, transactionCount, ...acc }) => acc),
    categories: state.categories,
    transactions: state.transactions,
    sinkingFunds: state.sinkingFunds,
    recurringRules: state.recurringRules,
  };
}

export async function triggerJsonBackupDownload() {
  const payload = await exportDatabaseBackup();
  const jsonContent = JSON.stringify(payload, null, 2);
  const isoDate = new Date().toISOString().slice(0, 10);
  const fileName = `jawed-money-manager-backup-${isoDate}.json`;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const recordCount =
    (payload.accounts?.length || 0) +
    (payload.categories?.length || 0) +
    (payload.transactions?.length || 0) +
    (payload.sinkingFunds?.length || 0) +
    (payload.recurringRules?.length || 0);

  return { fileName, recordCount };
}

export async function restoreDatabaseBackup(payload, mode = 'replace') {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid backup file format.');
  }

  const incomingAccounts = Array.isArray(payload.accounts) ? payload.accounts : [];
  const incomingCategories = Array.isArray(payload.categories) ? payload.categories : [];
  const incomingTransactions = Array.isArray(payload.transactions) ? payload.transactions : [];
  const incomingSinkingFunds = Array.isArray(payload.sinkingFunds) ? payload.sinkingFunds : [];
  const incomingRecurringRules = Array.isArray(payload.recurringRules)
    ? payload.recurringRules
    : [];

  if (
    incomingAccounts.length === 0 &&
    incomingTransactions.length === 0 &&
    incomingCategories.length === 0 &&
    incomingSinkingFunds.length === 0 &&
    incomingRecurringRules.length === 0
  ) {
    throw new Error('Backup JSON does not contain any accounts, transactions, or categories.');
  }

  const db = await getMoneyManagerDB();

  if (!db) {
    if (mode === 'replace') {
      memoryStore.accounts.clear();
      memoryStore.categories.clear();
      memoryStore.transactions.clear();
      memoryStore.sinkingFunds.clear();
      memoryStore.recurringRules.clear();
    }
    for (const acc of incomingAccounts) memoryStore.accounts.set(acc.id, acc);
    for (const cat of incomingCategories) memoryStore.categories.set(cat.id, cat);
    for (const tx of incomingTransactions) memoryStore.transactions.set(tx.id, tx);
    for (const sf of incomingSinkingFunds) memoryStore.sinkingFunds.set(sf.id, sf);
    for (const rec of incomingRecurringRules) memoryStore.recurringRules.set(rec.id, rec);
    memoryStore.seeded = true;
    return getAllLedgerState();
  }

  const tx = db.transaction(
    ['accounts', 'categories', 'transactions', 'sinkingFunds', 'recurringRules'],
    'readwrite'
  );
  if (mode === 'replace') {
    await Promise.all([
      tx.objectStore('accounts').clear(),
      tx.objectStore('categories').clear(),
      tx.objectStore('transactions').clear(),
      tx.objectStore('sinkingFunds').clear(),
      tx.objectStore('recurringRules').clear(),
    ]);
  }

  for (const acc of incomingAccounts) {
    await tx.objectStore('accounts').put(acc);
  }
  for (const cat of incomingCategories) {
    await tx.objectStore('categories').put(cat);
  }
  for (const entry of incomingTransactions) {
    await tx.objectStore('transactions').put(entry);
  }
  for (const sf of incomingSinkingFunds) {
    await tx.objectStore('sinkingFunds').put(sf);
  }
  for (const rec of incomingRecurringRules) {
    await tx.objectStore('recurringRules').put(rec);
  }
  await tx.done;

  return getAllLedgerState();
}

export async function resetDatabaseToDefaults() {
  return restoreDatabaseBackup(
    {
      version: DB_VERSION,
      exportedAt: new Date().toISOString(),
      database: DB_NAME,
      accounts: INITIAL_ACCOUNTS,
      categories: INITIAL_CATEGORIES,
      transactions: INITIAL_TRANSACTIONS,
      sinkingFunds: INITIAL_SINKING_FUNDS,
      recurringRules: INITIAL_RECURRING_RULES,
    },
    'replace'
  );
}

export function formatINR(value, includeSign = false) {
  const num = Number(value) || 0;
  const absFormatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.abs(num));

  if (num < 0) {
    return `-${absFormatted}`;
  }
  if (includeSign && num > 0) {
    return `+${absFormatted}`;
  }
  return absFormatted;
}

export async function getAllTransactions() {
  const state = await getAllLedgerState();
  return state.transactions;
}

export async function getAllAccounts() {
  const state = await getAllLedgerState();
  return state.accounts;
}

export async function removeReceiptFromTransaction(transactionId, receiptIndex) {
  const state = await getAllLedgerState();
  const target = state.transactions.find((tx) => tx.id === transactionId);
  if (!target) return null;

  const existingReceipts = Array.isArray(target.receiptImages) ? target.receiptImages : [];
  if (receiptIndex < 0 || receiptIndex >= existingReceipts.length) {
    return target;
  }

  const nextReceipts = existingReceipts.filter((_, idx) => idx !== receiptIndex);
  return saveTransaction({
    ...target,
    receiptImages: nextReceipts,
  });
}

export async function attachReceiptToTransaction(transactionId, receiptDataUrl) {
  const cleanUrl = String(receiptDataUrl || '').trim();
  if (!cleanUrl) return null;

  const state = await getAllLedgerState();
  const target = state.transactions.find((tx) => tx.id === transactionId);
  if (!target) return null;

  const existingReceipts = Array.isArray(target.receiptImages) ? target.receiptImages : [];
  return saveTransaction({
    ...target,
    receiptImages: [...existingReceipts, cleanUrl],
  });
}


