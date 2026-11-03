import {
  INITIAL_CATEGORIES,
  type FixedOrVariable,
  type MoneyCategory,
  type MoneyTransaction,
  type TransactionType,
} from '../../db/db';

export interface KeywordCategoryRule {
  id: string;
  type: TransactionType;
  category: string;
  subCategory: string;
  fixedOrVariable: FixedOrVariable;
  keywords: string[];
  weight?: number;
  isCustom?: boolean;
}

export interface CategoryCandidateScore {
  type: TransactionType;
  category: string;
  subCategory: string;
  fixedOrVariable: FixedOrVariable;
  confidence: number;
  matchedKeywords: string[];
  ruleScore: number;
  bayesScore: number;
}

export interface CategoryPrediction {
  predictedType: TransactionType;
  category: string;
  subCategory: string;
  fixedOrVariable: FixedOrVariable;
  confidence: number;
  confidenceLabel: 'High' | 'Medium' | 'Low';
  matchedKeywords: string[];
  source:
    | 'custom-rule'
    | 'hybrid-ml-rule'
    | 'keyword-rule'
    | 'ml-naive-bayes'
    | 'fallback';
  alternatives: Array<{
    type: TransactionType;
    category: string;
    subCategory: string;
    fixedOrVariable: FixedOrVariable;
    confidence: number;
  }>;
}

export interface PredictCategoryOptions {
  txType?: TransactionType;
  allowTypeInference?: boolean;
  historicalTransactions?: MoneyTransaction[];
  categories?: MoneyCategory[];
  customRules?: KeywordCategoryRule[];
}

export const CUSTOM_ML_RULES_STORAGE_KEY = 'jawed_mm_custom_ml_rules_v1';

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'into',
  'paid',
  'payment',
  'bill',
  'txn',
  'tx',
  'upi',
  'pos',
  'ach',
  'ecs',
  'nach',
  'ref',
  'no',
  'id',
  'inr',
  'rs',
  'month',
  'monthly',
  'via',
  'towards',
  'online',
  'order',
]);

/**
 * Built-in weighted keyword & phrase rules covering Indian and global merchants,
 * utility providers, medical expenses, transport, education, income, and transfers.
 */
export const DEFAULT_KEYWORD_CATEGORY_RULES: KeywordCategoryRule[] = [
  // Food & Groceries — Supermarket & Ration
  {
    id: 'rule-food-supermarket',
    type: 'Expense',
    category: 'Food & Groceries',
    subCategory: 'Supermarket Groceries',
    fixedOrVariable: 'Variable',
    keywords: [
      'grocery',
      'groceries',
      'supermarket',
      'bigbasket',
      'blinkit',
      'instamart',
      'zepto',
      'dmart',
      'reliance smart',
      'more supermarket',
      'nature basket',
      'Spencer',
      'ration',
      'staples',
      'kirana',
      'provision store',
    ],
    weight: 1.25,
  },
  // Food & Groceries — Dining Out / Delivery
  {
    id: 'rule-food-dining',
    type: 'Expense',
    category: 'Food & Groceries',
    subCategory: 'Dining Out / Takeaway',
    fixedOrVariable: 'Variable',
    keywords: [
      'swiggy',
      'zomato',
      'restaurant',
      'cafe',
      'coffee',
      'starbucks',
      'blue tokai',
      'third wave',
      'pizza',
      'dominos',
      'mcdonalds',
      'kfc',
      'burger',
      'biryani',
      'bakery',
      'dining',
      'lunch',
      'dinner',
      'breakfast',
      'snacks',
      'tea',
      'chai',
      'eatsure',
    ],
    weight: 1.2,
  },
  // Food & Groceries — Dairy & Fresh Produce
  {
    id: 'rule-food-dairy',
    type: 'Expense',
    category: 'Food & Groceries',
    subCategory: 'Dairy & Fresh Produce',
    fixedOrVariable: 'Variable',
    keywords: [
      'milk',
      'dairy',
      'nandini',
      'amul',
      'country delight',
      'vegetables',
      'fruits',
      'fresh produce',
      'meat',
      'chicken',
      'fish',
      'licious',
      'freshtohome',
      'eggs',
    ],
    weight: 1.2,
  },
  // Rent & Housing — Apartment Rent
  {
    id: 'rule-rent-apartment',
    type: 'Expense',
    category: 'Rent & Housing',
    subCategory: 'Apartment Rent',
    fixedOrVariable: 'Fixed',
    keywords: [
      'apartment rent',
      'house rent',
      'flat rent',
      'monthly rent',
      'rent',
      'landlord',
      'lease',
      'nobroker',
      'housing',
      'pg rent',
      'hostel',
    ],
    weight: 1.35,
  },
  // Rent & Housing — Society Maintenance & Repairs
  {
    id: 'rule-rent-maintenance',
    type: 'Expense',
    category: 'Rent & Housing',
    subCategory: 'Society Maintenance',
    fixedOrVariable: 'Fixed',
    keywords: [
      'society maintenance',
      'maintenance charges',
      'mygate',
      'adda',
      'apartment maintenance',
      'plumber',
      'electrician',
      'carpenter',
      'urban company',
      'home repair',
      'property tax',
    ],
    weight: 1.25,
  },
  // Utilities & Broadband — Electricity
  {
    id: 'rule-utilities-electricity',
    type: 'Expense',
    category: 'Utilities & Broadband',
    subCategory: 'Electricity Bill',
    fixedOrVariable: 'Fixed',
    keywords: [
      'electricity',
      'bescom',
      'msedcl',
      'tata power',
      'adani electricity',
      'bses',
      'cesc',
      'tneb',
      'uppcl',
      'power bill',
      'electric bill',
      'water bill',
      'bwssb',
      'lpg',
      'indane',
      'bharatgas',
      'hp gas',
      'piped gas',
      'gail',
    ],
    weight: 1.35,
  },
  // Utilities & Broadband — Fiber & Mobile
  {
    id: 'rule-utilities-broadband',
    type: 'Expense',
    category: 'Utilities & Broadband',
    subCategory: 'Fiber Broadband',
    fixedOrVariable: 'Fixed',
    keywords: [
      'broadband',
      'fiber',
      'jiofiber',
      'airtel xstream',
      'act fibernet',
      'hathway',
      'excitel',
      'bsnl',
      'wifi',
      'internet',
      'mobile recharge',
      'postpaid',
      'prepaid',
      'airtel',
      'jio',
      'vodafone',
      'vi recharge',
      'dth',
      'tataplay',
    ],
    weight: 1.3,
  },
  // Medical & Health — Pharmacy
  {
    id: 'rule-medical-pharmacy',
    type: 'Expense',
    category: 'Medical & Health',
    subCategory: 'Pharmacy & Medicines',
    fixedOrVariable: 'Variable',
    keywords: [
      'pharmacy',
      'apollo pharmacy',
      'apollo',
      'medplus',
      'pharmeasy',
      'tata 1mg',
      '1mg',
      'netmeds',
      'medicine',
      'medicines',
      'tablets',
      'syrup',
      'chemist',
      'drugstore',
      'vitamins',
      'supplements',
      'first aid',
    ],
    weight: 1.35,
  },
  // Medical & Health — Doctor & Diagnostics
  {
    id: 'rule-medical-doctor',
    type: 'Expense',
    category: 'Medical & Health',
    subCategory: 'Doctor Consultation',
    fixedOrVariable: 'Variable',
    keywords: [
      'doctor',
      'consultation',
      'hospital',
      'clinic',
      'dental',
      'dentist',
      'eye care',
      'optician',
      'lenskart',
      'diagnostic',
      'pathology',
      'lab test',
      'blood test',
      'dr lal',
      'metropolis',
      'thyrocare',
      'practo',
      'manipal hospital',
      'fortis',
      'max healthcare',
      'medical',
      'health checkup',
    ],
    weight: 1.35,
  },
  // Education — School & Courses
  {
    id: 'rule-education-school',
    type: 'Expense',
    category: 'Education',
    subCategory: 'School Tuition',
    fixedOrVariable: 'Fixed',
    keywords: [
      'school',
      'tuition',
      'college',
      'university',
      'academy',
      'institute',
      'semester fee',
      'admission fee',
      'school fee',
      'coaching',
      'byjus',
      'unacademy',
      'allen',
    ],
    weight: 1.35,
  },
  // Education — Books & Online Learning
  {
    id: 'rule-education-courses',
    type: 'Expense',
    category: 'Education',
    subCategory: 'Books & Stationery',
    fixedOrVariable: 'Variable',
    keywords: [
      'udemy',
      'coursera',
      'edx',
      'pluralsight',
      'linkedin learning',
      'certification',
      'exam fee',
      'ccna',
      'mcse',
      'aws exam',
      'books',
      'textbook',
      'stationery',
      'crossword',
      'sapna book',
      'kindle',
    ],
    weight: 1.25,
  },
  // Transport & Fuel — Fuel
  {
    id: 'rule-transport-fuel',
    type: 'Expense',
    category: 'Transport & Fuel',
    subCategory: 'Petrol / Fuel',
    fixedOrVariable: 'Variable',
    keywords: [
      'petrol',
      'diesel',
      'fuel',
      'indian oil',
      'iocl',
      'hpcl',
      'hindustan petroleum',
      'bpcl',
      'bharat petroleum',
      'shell',
      'nayara',
      'cng',
      'ev charging',
      'fastag',
      'toll',
      'parking',
      'car service',
      'bike service',
      'tyre',
    ],
    weight: 1.35,
  },
  // Transport & Fuel — Metro, Cab & Transit
  {
    id: 'rule-transport-commute',
    type: 'Expense',
    category: 'Transport & Fuel',
    subCategory: 'Metro & Cab Commute',
    fixedOrVariable: 'Variable',
    keywords: [
      'uber',
      'ola',
      'rapido',
      'namma yatri',
      'blu smart',
      'metro',
      'bmrcl',
      'dmrc',
      'bus pass',
      'bmtc',
      'auto rickshaw',
      'cab',
      'taxi',
      'irctc',
      'railway',
      'train ticket',
      'redbus',
      'makemytrip',
      'indigo',
      'air india',
      'vistara',
      'flight',
    ],
    weight: 1.3,
  },
  // Lifestyle & Family — Shopping, Subscriptions & Apparel
  {
    id: 'rule-lifestyle-shopping',
    type: 'Expense',
    category: 'Lifestyle & Family',
    subCategory: 'Clothing & Footwear',
    fixedOrVariable: 'Variable',
    keywords: [
      'amazon',
      'flipkart',
      'myntra',
      'ajio',
      'nykaa',
      'meesho',
      'tatacliq',
      'zara',
      'h&m',
      'westside',
      'pantaloons',
      'lifestyle',
      'decathlon',
      'titan',
      'footwear',
      'bata',
      'nike',
      'adidas',
      'apparel',
      'clothing',
      'shopping',
      'electronics',
      'croma',
      'reliance digital',
      'netflix',
      'spotify',
      'prime video',
      'hotstar',
      'youtube premium',
      'bookmyshow',
      'pvr',
      'inox',
      'cinema',
      'movie',
      'salon',
      ' haircut',
      'gym',
      'cult fit',
      'gift',
      'festival',
      'eid',
      'diwali',
    ],
    weight: 1.15,
  },
  // Income — Salary & Payroll
  {
    id: 'rule-income-salary',
    type: 'Income',
    category: 'Salary',
    subCategory: 'Monthly Payroll',
    fixedOrVariable: 'Fixed',
    keywords: [
      'salary',
      'payroll',
      'monthly payroll',
      'stipend',
      'payslip',
      'bonus',
      'incentive',
      'arrears',
      'reimbursement',
      'employer',
      'gratuity',
      'dividend',
      'interest credit',
    ],
    weight: 1.4,
  },
  // Income — Freelance & Consulting
  {
    id: 'rule-income-freelance',
    type: 'Income',
    category: 'Freelance & Consulting',
    subCategory: 'IT Field Advisory',
    fixedOrVariable: 'Variable',
    keywords: [
      'freelance',
      'consulting',
      'retainer',
      'milestone',
      'client',
      'invoice',
      'advisory',
      'audit',
      'architecture audit',
      'contract payment',
      'project fee',
      'upwork',
      'fiverr',
      'stripe payout',
      'razorpay settlement',
    ],
    weight: 1.4,
  },
  // Transfer — Self Transfer & ATM
  {
    id: 'rule-transfer-self',
    type: 'Transfer',
    category: 'Transfer',
    subCategory: 'NEFT / IMPS Self Transfer',
    fixedOrVariable: 'Variable',
    keywords: [
      'self transfer',
      'neft self',
      'imps self',
      'icici to sbi',
      'sbi to icici',
      'icici to ubi',
      'ubi to icici',
      'atm withdrawal',
      'cash withdrawal',
      'credit card bill settlement',
      'cc bill payment',
      'wallet top-up',
      'contra',
    ],
    weight: 1.45,
  },
];

/**
 * Extracts normalized word unigrams and bigrams from a transaction description.
 */
export function tokenizeTransactionDescription(text: string): string[] {
  const cleaned = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s&+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return [];

  const rawWords = cleaned
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

  const tokens = [...rawWords];
  for (let i = 0; i < rawWords.length - 1; i += 1) {
    tokens.push(`${rawWords[i]} ${rawWords[i + 1]}`);
  }

  return tokens;
}

/**
 * Loads user-defined custom keyword categorization rules from localStorage (if available).
 */
export function loadCustomKeywordRules(): KeywordCategoryRule[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(CUSTOM_ML_RULES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is KeywordCategoryRule =>
        Boolean(item && typeof item.category === 'string' && Array.isArray(item.keywords))
    );
  } catch {
    return [];
  }
}

/**
 * Persists a custom keyword rule to localStorage and returns the updated list.
 */
export function saveCustomKeywordRule(
  ruleInput: Omit<KeywordCategoryRule, 'id' | 'isCustom'> & { id?: string }
): KeywordCategoryRule[] {
  const existing = loadCustomKeywordRules();
  const cleanKeywords = ruleInput.keywords
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  if (cleanKeywords.length === 0) return existing;

  const newRule: KeywordCategoryRule = {
    id: ruleInput.id || `custom-rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: ruleInput.type,
    category: ruleInput.category,
    subCategory: ruleInput.subCategory,
    fixedOrVariable: ruleInput.fixedOrVariable,
    keywords: Array.from(new Set(cleanKeywords)),
    weight: ruleInput.weight ?? 1.6,
    isCustom: true,
  };

  const next = [
    newRule,
    ...existing.filter((r) => r.id !== newRule.id),
  ];

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(CUSTOM_ML_RULES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota errors
    }
  }

  return next;
}

/**
 * Deletes a custom keyword rule by ID from localStorage.
 */
export function deleteCustomKeywordRule(ruleId: string): KeywordCategoryRule[] {
  const existing = loadCustomKeywordRules();
  const next = existing.filter((r) => r.id !== ruleId);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(CUSTOM_ML_RULES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  }
  return next;
}

interface NaiveBayesCategoryStats {
  type: TransactionType;
  category: string;
  docCount: number;
  totalTokens: number;
  tokenCounts: Map<string, number>;
  subCategoryCounts: Map<string, number>;
  natureCounts: Map<FixedOrVariable, number>;
}

/**
 * Trains a Multinomial Naive Bayes model on historical transactions + category metadata
 * and scores each candidate category for the given tokens.
 */
function computeNaiveBayesScores(
  tokens: string[],
  historicalTransactions: MoneyTransaction[],
  categories: MoneyCategory[],
  targetType?: TransactionType
): Map<string, { score: number; bestSubCategory: string; bestNature: FixedOrVariable; matchedTokens: string[] }> {
  const statsByKey = new Map<string, NaiveBayesCategoryStats>();
  const vocabulary = new Set<string>();
  let totalDocs = 0;

  const ensureCategoryStats = (
    type: TransactionType,
    category: string,
    defaultSubCategory = 'General',
    defaultNature: FixedOrVariable = 'Variable'
  ): NaiveBayesCategoryStats => {
    const key = `${type}::${category}`;
    let entry = statsByKey.get(key);
    if (!entry) {
      entry = {
        type,
        category,
        docCount: 0,
        totalTokens: 0,
        tokenCounts: new Map(),
        subCategoryCounts: new Map([[defaultSubCategory, 1]]),
        natureCounts: new Map([[defaultNature, 1]]),
      };
      statsByKey.set(key, entry);
    }
    return entry;
  };

  // Seed priors from configured categories and their sub-category names
  for (const cat of categories) {
    if (targetType && cat.type !== targetType) continue;
    const entry = ensureCategoryStats(
      cat.type,
      cat.name,
      cat.subCategories?.[0] || 'General',
      cat.defaultFixedOrVariable
    );
    const catTokens = tokenizeTransactionDescription(
      `${cat.name} ${(cat.subCategories || []).join(' ')}`
    );
    entry.docCount += 1;
    totalDocs += 1;
    for (const token of catTokens) {
      vocabulary.add(token);
      entry.tokenCounts.set(token, (entry.tokenCounts.get(token) || 0) + 2);
      entry.totalTokens += 2;
    }
  }

  // Train on historical ledger transactions
  for (const tx of historicalTransactions) {
    if (targetType && tx.type !== targetType) continue;
    const entry = ensureCategoryStats(
      tx.type,
      tx.category,
      tx.subCategory || 'General',
      tx.fixedOrVariable || 'Variable'
    );
    entry.docCount += 2;
    totalDocs += 2;

    if (tx.subCategory) {
      entry.subCategoryCounts.set(
        tx.subCategory,
        (entry.subCategoryCounts.get(tx.subCategory) || 0) + 2
      );
    }
    if (tx.fixedOrVariable) {
      entry.natureCounts.set(
        tx.fixedOrVariable,
        (entry.natureCounts.get(tx.fixedOrVariable) || 0) + 2
      );
    }

    const txTokens = tokenizeTransactionDescription(`${tx.note} ${tx.subCategory}`);
    for (const token of txTokens) {
      vocabulary.add(token);
      entry.tokenCounts.set(token, (entry.tokenCounts.get(token) || 0) + 3);
      entry.totalTokens += 3;
    }
  }

  const vocabSize = Math.max(1, vocabulary.size);
  const results = new Map<
    string,
    { score: number; bestSubCategory: string; bestNature: FixedOrVariable; matchedTokens: string[] }
  >();

  if (tokens.length === 0 || statsByKey.size === 0) {
    return results;
  }

  // Compute unnormalized log-likelihood + matched token weight for each category
  for (const [key, entry] of statsByKey.entries()) {
    const matchedTokens: string[] = [];
    let tokenGain = 0;

    for (const tok of tokens) {
      const count = entry.tokenCounts.get(tok) || 0;
      if (count > 0) {
        matchedTokens.push(tok);
        const prob = (count + 1) / (entry.totalTokens + vocabSize);
        tokenGain += Math.max(0.25, 1 + Math.log10(prob * vocabSize));
      }
    }

    let bestSubCategory = 'General';
    let bestSubCount = -1;
    for (const [sub, cnt] of entry.subCategoryCounts.entries()) {
      if (cnt > bestSubCount) {
        bestSubCount = cnt;
        bestSubCategory = sub;
      }
    }

    let bestNature: FixedOrVariable = 'Variable';
    let bestNatureCount = -1;
    for (const [nat, cnt] of entry.natureCounts.entries()) {
      if (cnt > bestNatureCount) {
        bestNatureCount = cnt;
        bestNature = nat;
      }
    }

    const priorBoost = totalDocs > 0 ? (entry.docCount / totalDocs) * 0.15 : 0;
    results.set(key, {
      score: matchedTokens.length > 0 ? tokenGain + priorBoost : 0,
      bestSubCategory,
      bestNature,
      matchedTokens: Array.from(new Set(matchedTokens)),
    });
  }

  return results;
}

/**
 * Predicts the transaction type, category, sub-category, Fixed/Variable nature,
 * confidence score (0-99%), and matched keywords using a hybrid ML (Multinomial Naive Bayes)
 * + weighted Keyword Rule engine.
 */
export function predictTransactionCategory(
  description: string,
  options: PredictCategoryOptions = {}
): CategoryPrediction {
  const {
    txType,
    allowTypeInference = false,
    historicalTransactions = [],
    categories = INITIAL_CATEGORIES,
    customRules,
  } = options;

  const normalizedDesc = String(description || '').toLowerCase().trim();
  const tokens = tokenizeTransactionDescription(normalizedDesc);
  const activeCustomRules = customRules ?? loadCustomKeywordRules();
  const allRules: KeywordCategoryRule[] = [
    ...activeCustomRules,
    ...DEFAULT_KEYWORD_CATEGORY_RULES,
  ];

  const effectiveTargetType = allowTypeInference ? undefined : txType;

  // 1. Evaluate Keyword & Phrase Rules
  const candidateMap = new Map<
    string,
    {
      type: TransactionType;
      category: string;
      subCategory: string;
      fixedOrVariable: FixedOrVariable;
      ruleScore: number;
      bayesScore: number;
      matchedKeywords: Set<string>;
      matchedCustomRule: boolean;
    }
  >();

  const ensureCandidate = (
    type: TransactionType,
    category: string,
    subCategory: string,
    fixedOrVariable: FixedOrVariable
  ) => {
    const key = `${type}::${category}`;
    let existing = candidateMap.get(key);
    if (!existing) {
      existing = {
        type,
        category,
        subCategory,
        fixedOrVariable,
        ruleScore: 0,
        bayesScore: 0,
        matchedKeywords: new Set<string>(),
        matchedCustomRule: false,
      };
      candidateMap.set(key, existing);
    }
    return existing;
  };

  if (normalizedDesc.length > 0) {
    for (const rule of allRules) {
      if (effectiveTargetType && rule.type !== effectiveTargetType) continue;

      const matchedInRule: string[] = [];
      for (const kw of rule.keywords) {
        const cleanKw = kw.toLowerCase().trim();
        if (!cleanKw) continue;
        // Match full word or phrase boundary where possible, or substring for multi-char merchant names
        const escaped = cleanKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const boundaryRegex = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i');
        if (boundaryRegex.test(normalizedDesc) || (cleanKw.length >= 4 && normalizedDesc.includes(cleanKw))) {
          matchedInRule.push(cleanKw);
        }
      }

      if (matchedInRule.length > 0) {
        const weight = rule.weight ?? 1.0;
        const ruleGain = matchedInRule.reduce(
          (sum, kw) => sum + (kw.includes(' ') ? 1.8 : 1.15) * weight,
          0
        );
        const candidate = ensureCandidate(
          rule.type,
          rule.category,
          rule.subCategory,
          rule.fixedOrVariable
        );
        if (ruleGain > candidate.ruleScore) {
          candidate.subCategory = rule.subCategory;
          candidate.fixedOrVariable = rule.fixedOrVariable;
        }
        candidate.ruleScore += ruleGain;
        if (rule.isCustom) {
          candidate.matchedCustomRule = true;
        }
        for (const kw of matchedInRule) {
          candidate.matchedKeywords.add(kw);
        }
      }
    }
  }

  // 2. Evaluate Multinomial Naive Bayes classifier trained on historical transactions & categories
  const bayesScores = computeNaiveBayesScores(
    tokens,
    historicalTransactions,
    categories,
    effectiveTargetType
  );

  for (const [key, bayes] of bayesScores.entries()) {
    if (bayes.score <= 0) continue;
    const [bType, bCategory] = key.split('::') as [TransactionType, string];
    const catObj = categories.find((c) => c.name === bCategory && c.type === bType);
    const candidate = ensureCandidate(
      bType,
      bCategory,
      bayes.bestSubCategory || catObj?.subCategories?.[0] || 'General',
      bayes.bestNature || catObj?.defaultFixedOrVariable || 'Variable'
    );
    candidate.bayesScore += bayes.score;
    for (const tok of bayes.matchedTokens) {
      candidate.matchedKeywords.add(tok);
    }
  }

  // 3. Also check if any user-created custom category name or sub-category directly appears in the description
  if (normalizedDesc.length > 0) {
    for (const cat of categories) {
      if (effectiveTargetType && cat.type !== effectiveTargetType) continue;
      for (const sub of cat.subCategories || []) {
        const cleanSub = sub.toLowerCase().trim();
        if (cleanSub.length >= 3 && normalizedDesc.includes(cleanSub)) {
          const candidate = ensureCandidate(
            cat.type,
            cat.name,
            sub,
            cat.defaultFixedOrVariable
          );
          candidate.ruleScore += 1.5;
          candidate.subCategory = sub;
          candidate.matchedKeywords.add(cleanSub);
        }
      }
    }
  }

  // 4. Rank all candidates by combined ML + Rule score
  const ranked = Array.from(candidateMap.values())
    .map((c) => {
      const combinedScore = c.ruleScore * 1.4 + c.bayesScore * 0.9;
      return {
        ...c,
        combinedScore,
      };
    })
    .filter((c) => c.combinedScore > 0)
    .sort((a, b) => b.combinedScore - a.combinedScore);

  if (ranked.length === 0) {
    const resolvedType: TransactionType = txType || 'Expense';
    if (resolvedType === 'Transfer') {
      return {
        predictedType: 'Transfer',
        category: 'Transfer',
        subCategory: 'NEFT / IMPS Self Transfer',
        fixedOrVariable: 'Variable',
        confidence: 35,
        confidenceLabel: 'Low',
        matchedKeywords: [],
        source: 'fallback',
        alternatives: [],
      };
    }

    const fallbackCat =
      categories.find((c) => c.type === resolvedType) ||
      INITIAL_CATEGORIES.find((c) => c.type === resolvedType)!;

    return {
      predictedType: resolvedType,
      category: fallbackCat?.name || (resolvedType === 'Income' ? 'Salary' : 'Lifestyle & Family'),
      subCategory: fallbackCat?.subCategories?.[0] || 'General',
      fixedOrVariable: fallbackCat?.defaultFixedOrVariable || 'Variable',
      confidence: 25,
      confidenceLabel: 'Low',
      matchedKeywords: [],
      source: 'fallback',
      alternatives: [],
    };
  }

  const top = ranked[0];
  const totalScoreSum = ranked.reduce((sum, item) => sum + item.combinedScore, 0) || 1;
  const relativeDominance = top.combinedScore / totalScoreSum;

  // Calibrate confidence score between 52% and 99%
  const rawConfidence = Math.min(
    99,
    Math.max(
      52,
      Math.round(50 + Math.min(35, top.combinedScore * 12) + relativeDominance * 14)
    )
  );

  const confidenceLabel: CategoryPrediction['confidenceLabel'] =
    rawConfidence >= 82 ? 'High' : rawConfidence >= 65 ? 'Medium' : 'Low';

  let source: CategoryPrediction['source'] = 'keyword-rule';
  if (top.matchedCustomRule) {
    source = 'custom-rule';
  } else if (top.ruleScore > 0 && top.bayesScore > 0) {
    source = 'hybrid-ml-rule';
  } else if (top.ruleScore > 0) {
    source = 'keyword-rule';
  } else {
    source = 'ml-naive-bayes';
  }

  // Ensure predicted category's subCategory is valid if the category exists in `categories`
  const matchedCatObj = categories.find(
    (c) => c.name === top.category && c.type === top.type
  );
  let resolvedSubCategory = top.subCategory;
  let resolvedNature = top.fixedOrVariable;
  if (matchedCatObj) {
    resolvedNature = matchedCatObj.defaultFixedOrVariable || top.fixedOrVariable;
    if (
      matchedCatObj.subCategories.length > 0 &&
      !matchedCatObj.subCategories.includes(resolvedSubCategory)
    ) {
      resolvedSubCategory = matchedCatObj.subCategories[0];
    }
  }

  const alternatives = ranked.slice(1, 4).map((alt) => ({
    type: alt.type,
    category: alt.category,
    subCategory: alt.subCategory,
    fixedOrVariable: alt.fixedOrVariable,
    confidence: Math.max(
      15,
      Math.min(85, Math.round((alt.combinedScore / totalScoreSum) * 100))
    ),
  }));

  return {
    predictedType: top.type,
    category: top.category,
    subCategory: resolvedSubCategory,
    fixedOrVariable: resolvedNature,
    confidence: rawConfidence,
    confidenceLabel,
    matchedKeywords: Array.from(top.matchedKeywords),
    source,
    alternatives,
  };
}

/**
 * Automatically categorizes a new transaction input based on its description (`note`)
 * if no explicit category override is locked or when auto-categorization is requested.
 */
export function autoCategorizeTransactionInput(
  txInput: Omit<MoneyTransaction, 'id'> & { id?: string },
  options: PredictCategoryOptions = {}
): {
  transaction: Omit<MoneyTransaction, 'id'> & { id?: string };
  prediction: CategoryPrediction;
} {
  const prediction = predictTransactionCategory(txInput.note, {
    ...options,
    txType: txInput.type,
  });

  if (txInput.type === 'Transfer') {
    return {
      transaction: {
        ...txInput,
        category: 'Transfer',
      },
      prediction,
    };
  }

  if (prediction.source !== 'fallback' && prediction.confidence >= 55) {
    return {
      transaction: {
        ...txInput,
        category: prediction.category,
        subCategory: txInput.subCategory || prediction.subCategory,
        fixedOrVariable: prediction.fixedOrVariable,
      },
      prediction,
    };
  }

  return {
    transaction: txInput,
    prediction,
  };
}
