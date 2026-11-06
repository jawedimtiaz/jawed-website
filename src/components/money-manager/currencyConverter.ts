export const SUPPORTED_CURRENCIES = [
  'INR',
  'USD',
  'EUR',
  'GBP',
  'AED',
  'SGD',
  'JPY',
  'CAD',
  'AUD',
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export interface CurrencyMetadata {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  decimals: number;
}

export const CURRENCY_METADATA: Record<CurrencyCode, CurrencyMetadata> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', decimals: 0 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'en-IE', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', decimals: 2 },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'en-AE', decimals: 2 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG', decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP', decimals: 0 },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', locale: 'en-CA', decimals: 2 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU', decimals: 2 },
};

/**
 * Deterministic daily reference rates showing how many INR equal 1 unit of the given currency.
 * Used immediately when offline or before live API rates resolve.
 */
export const FALLBACK_RATES_TO_INR: Record<CurrencyCode, number> = {
  INR: 1,
  USD: 84.5,
  EUR: 91.2,
  GBP: 108.4,
  AED: 23.0,
  SGD: 63.1,
  JPY: 0.56,
  CAD: 60.8,
  AUD: 55.4,
};

export interface DailyExchangeRateSnapshot {
  base: CurrencyCode;
  date: string;
  timestamp: number;
  /** How many INR equal 1 unit of CurrencyCode */
  ratesToINR: Record<CurrencyCode, number>;
  /** How many units of CurrencyCode equal 1 INR */
  ratesFromINR: Record<CurrencyCode, number>;
  source: 'api' | 'cache' | 'fallback';
  providerUrl?: string;
}

export interface MultiCurrencyTransactionLike {
  amount: number;
  currency?: CurrencyCode | string;
  originalAmount?: number;
  exchangeRateToINR?: number;
  rateDate?: string;
}

export interface ResolvedTransactionCurrencyValue {
  /** Converted amount in targetCurrency */
  amountInTarget: number;
  /** Converted amount in base currency (INR) */
  amountInINR: number;
  /** Original amount in the transaction's native currency */
  originalAmount: number;
  /** Normalized ISO 4217 currency code of the transaction */
  originalCurrency: CurrencyCode;
  /** Target currency requested */
  targetCurrency: CurrencyCode;
  /** 1 unit of originalCurrency = exchangeRateToINR INR */
  exchangeRateToINR: number;
  /** Whether the transaction was recorded in a non-INR currency */
  isForeignCurrency: boolean;
}

const EXCHANGE_RATE_STORAGE_KEY = 'jawed_mm_daily_exchange_rates_v1';

let memoryCachedRates: DailyExchangeRateSnapshot | null = null;

export function isSupportedCurrency(code: unknown): code is CurrencyCode {
  return (
    typeof code === 'string' &&
    (SUPPORTED_CURRENCIES as readonly string[]).includes(code.toUpperCase())
  );
}

export function normalizeCurrencyCode(
  code?: string | null,
  fallback: CurrencyCode = 'INR',
): CurrencyCode {
  if (!code || typeof code !== 'string') return fallback;
  const upper = code.trim().toUpperCase();
  return isSupportedCurrency(upper) ? upper : fallback;
}

export function buildRatesFromINR(
  ratesToINR: Partial<Record<CurrencyCode, number>> = FALLBACK_RATES_TO_INR,
): Record<CurrencyCode, number> {
  const result = {} as Record<CurrencyCode, number>;
  for (const code of SUPPORTED_CURRENCIES) {
    const toInr = Number(ratesToINR[code]) || FALLBACK_RATES_TO_INR[code] || 1;
    result[code] = code === 'INR' ? 1 : Number((1 / toInr).toFixed(6));
  }
  return result;
}

export function normalizeRatesToINR(
  customRates?: Partial<Record<CurrencyCode, number>> | null,
): Record<CurrencyCode, number> {
  const result = { ...FALLBACK_RATES_TO_INR };
  if (customRates && typeof customRates === 'object') {
    for (const code of SUPPORTED_CURRENCIES) {
      const candidate = Number(customRates[code]);
      if (Number.isFinite(candidate) && candidate > 0) {
        result[code] = candidate;
      }
    }
  }
  result.INR = 1;
  return result;
}

export function getActiveRatesToINR(
  overrideRates?: Partial<Record<CurrencyCode, number>> | null,
): Record<CurrencyCode, number> {
  if (overrideRates) {
    return normalizeRatesToINR(overrideRates);
  }
  if (memoryCachedRates?.ratesToINR) {
    return normalizeRatesToINR(memoryCachedRates.ratesToINR);
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(EXCHANGE_RATE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DailyExchangeRateSnapshot>;
        if (parsed && parsed.ratesToINR && typeof parsed.ratesToINR === 'object') {
          return normalizeRatesToINR(parsed.ratesToINR);
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }
  return { ...FALLBACK_RATES_TO_INR };
}

export function getCachedExchangeRateSnapshot(): DailyExchangeRateSnapshot {
  const todayStr = new Date().toISOString().slice(0, 10);
  if (memoryCachedRates) {
    return memoryCachedRates;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(EXCHANGE_RATE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DailyExchangeRateSnapshot;
        if (parsed && parsed.ratesToINR) {
          const normalizedToInr = normalizeRatesToINR(parsed.ratesToINR);
          const snapshot: DailyExchangeRateSnapshot = {
            base: normalizeCurrencyCode(parsed.base, 'INR'),
            date: typeof parsed.date === 'string' ? parsed.date : todayStr,
            timestamp: Number(parsed.timestamp) || Date.now(),
            ratesToINR: normalizedToInr,
            ratesFromINR: buildRatesFromINR(normalizedToInr),
            source: 'cache',
            providerUrl: parsed.providerUrl,
          };
          memoryCachedRates = snapshot;
          return snapshot;
        }
      }
    } catch {
      // Ignore corrupt cache
    }
  }
  return {
    base: 'INR',
    date: todayStr,
    timestamp: Date.now(),
    ratesToINR: { ...FALLBACK_RATES_TO_INR },
    ratesFromINR: buildRatesFromINR(FALLBACK_RATES_TO_INR),
    source: 'fallback',
  };
}

/**
 * Converts an amount from `fromCurrency` to `toCurrency` using `ratesToINR`
 * (where 1 unit of currency X = ratesToINR[X] INR).
 */
export function convertCurrencyAmount(
  amount: number,
  fromCurrency: CurrencyCode | string = 'INR',
  toCurrency: CurrencyCode | string = 'INR',
  ratesToINR?: Partial<Record<CurrencyCode, number>> | null,
): number {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount === 0) return 0;

  const from = normalizeCurrencyCode(fromCurrency, 'INR');
  const to = normalizeCurrencyCode(toCurrency, 'INR');
  if (from === to) return Number(numericAmount.toFixed(2));

  const activeRates = getActiveRatesToINR(ratesToINR);
  const fromRateToInr = activeRates[from] || FALLBACK_RATES_TO_INR[from] || 1;
  const toRateToInr = activeRates[to] || FALLBACK_RATES_TO_INR[to] || 1;

  const amountInInr = numericAmount * fromRateToInr;
  const converted = to === 'INR' ? amountInInr : amountInInr / toRateToInr;
  return Number(converted.toFixed(2));
}

export function convertToBaseCurrency(
  amount: number,
  fromCurrency: CurrencyCode | string = 'INR',
  baseCurrency: CurrencyCode | string = 'INR',
  ratesToINR?: Partial<Record<CurrencyCode, number>> | null,
): number {
  return convertCurrencyAmount(amount, fromCurrency, baseCurrency, ratesToINR);
}

/**
 * Resolves a transaction's native currency amount, its INR base equivalent, and its value in any target currency.
 * Supports both:
 *  1) Transactions created with `{ amount: 100, currency: 'USD' }` (where `amount` is in the foreign currency)
 *  2) Transactions persisted with `{ amount: 8450, originalAmount: 100, currency: 'USD', exchangeRateToINR: 84.5 }`
 */
export function resolveTransactionAmountInCurrency(
  tx: MultiCurrencyTransactionLike,
  targetCurrency: CurrencyCode | string = 'INR',
  ratesToINR?: Partial<Record<CurrencyCode, number>> | null,
): ResolvedTransactionCurrencyValue {
  const rawAmount = Number(tx?.amount) || 0;
  const originalCurrency = normalizeCurrencyCode(tx?.currency, 'INR');
  const target = normalizeCurrencyCode(targetCurrency, 'INR');
  const activeRates = getActiveRatesToINR(ratesToINR);

  const explicitRate =
    typeof tx?.exchangeRateToINR === 'number' &&
    Number.isFinite(tx.exchangeRateToINR) &&
    tx.exchangeRateToINR > 0
      ? tx.exchangeRateToINR
      : undefined;

  const effectiveRateToINR =
    originalCurrency === 'INR'
      ? 1
      : explicitRate ?? activeRates[originalCurrency] ?? FALLBACK_RATES_TO_INR[originalCurrency] ?? 1;

  let originalAmount = rawAmount;
  let amountInINR = rawAmount;

  if (originalCurrency !== 'INR') {
    const hasDistinctOriginal =
      typeof tx?.originalAmount === 'number' &&
      Number.isFinite(tx.originalAmount) &&
      tx.originalAmount > 0;

    if (hasDistinctOriginal) {
      originalAmount = Number(tx.originalAmount);
      // Check if tx.amount is already stored as the converted INR amount
      const expectedInr = Number((originalAmount * effectiveRateToINR).toFixed(2));
      if (Math.abs(rawAmount - expectedInr) <= 1 || rawAmount !== originalAmount) {
        amountInINR = rawAmount;
      } else {
        amountInINR = expectedInr;
      }
    } else {
      originalAmount = rawAmount;
      amountInINR = Number((rawAmount * effectiveRateToINR).toFixed(2));
    }
  } else {
    originalAmount = rawAmount;
    amountInINR = rawAmount;
  }

  const amountInTarget =
    target === 'INR'
      ? Number(amountInINR.toFixed(2))
      : target === originalCurrency && !ratesToINR
        ? Number(originalAmount.toFixed(2))
        : convertCurrencyAmount(amountInINR, 'INR', target, activeRates);

  return {
    amountInTarget,
    amountInINR: Number(amountInINR.toFixed(2)),
    originalAmount: Number(originalAmount.toFixed(2)),
    originalCurrency,
    targetCurrency: target,
    exchangeRateToINR: Number(effectiveRateToINR.toFixed(4)),
    isForeignCurrency: originalCurrency !== 'INR',
  };
}

export function resolveTransactionInrAmount(
  tx: MultiCurrencyTransactionLike,
  ratesToINR?: Partial<Record<CurrencyCode, number>> | null,
): number {
  return resolveTransactionAmountInCurrency(tx, 'INR', ratesToINR).amountInINR;
}

export interface FetchDailyExchangeRatesOptions {
  baseCurrency?: CurrencyCode | string;
  date?: string;
  forceRefresh?: boolean;
  fetchImpl?: typeof fetch;
}

/**
 * Fetches daily exchange rates from public daily exchange rate APIs
 * (Primary: open.er-api.com, Secondary: api.frankfurter.app) and normalizes
 * all supported currencies into `ratesToINR` (1 unit of currency = X INR) and `ratesFromINR`.
 */
export async function fetchDailyExchangeRates(
  options: FetchDailyExchangeRatesOptions = {},
): Promise<DailyExchangeRateSnapshot> {
  const base = normalizeCurrencyCode(options.baseCurrency, 'INR');
  const todayStr = (options.date || new Date().toISOString().slice(0, 10)).slice(0, 10);

  if (!options.forceRefresh) {
    const cached = getCachedExchangeRateSnapshot();
    if (cached.source !== 'fallback' && cached.date === todayStr) {
      return cached;
    }
  }

  const fetcher =
    options.fetchImpl ?? (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : undefined);

  if (fetcher) {
    const endpoints = [
      `https://open.er-api.com/v6/latest/${base}`,
      `https://api.frankfurter.app/${options.date ? todayStr : 'latest'}?from=${base}`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetcher(endpoint);
        if (!response || !response.ok) continue;
        const payload = (await response.json()) as {
          rates?: Record<string, number>;
          conversion_rates?: Record<string, number>;
          date?: string;
          time_last_update_utc?: string;
        };

        const rawRates = payload?.rates ?? payload?.conversion_rates;
        if (rawRates && typeof rawRates === 'object') {
          const baseToInr =
            base === 'INR'
              ? 1
              : Number(rawRates.INR) > 0
                ? Number(rawRates.INR)
                : FALLBACK_RATES_TO_INR[base];

          const computedToInr: Record<CurrencyCode, number> = { ...FALLBACK_RATES_TO_INR };
          for (const code of SUPPORTED_CURRENCIES) {
            if (code === 'INR') {
              computedToInr.INR = 1;
            } else if (code === base) {
              computedToInr[code] = Number(baseToInr.toFixed(4));
            } else {
              const unitsPerBase = Number(rawRates[code]);
              if (Number.isFinite(unitsPerBase) && unitsPerBase > 0) {
                // 1 base = unitsPerBase of `code`, and 1 base = baseToInr INR
                // Therefore 1 unit of `code` = (baseToInr / unitsPerBase) INR
                computedToInr[code] = Number((baseToInr / unitsPerBase).toFixed(4));
              }
            }
          }

          const resolvedDate =
            typeof payload.date === 'string' && payload.date.length >= 10
              ? payload.date.slice(0, 10)
              : todayStr;

          const snapshot: DailyExchangeRateSnapshot = {
            base,
            date: resolvedDate,
            timestamp: Date.now(),
            ratesToINR: computedToInr,
            ratesFromINR: buildRatesFromINR(computedToInr),
            source: 'api',
            providerUrl: endpoint,
          };

          memoryCachedRates = snapshot;
          if (typeof window !== 'undefined' && window.localStorage) {
            try {
              window.localStorage.setItem(EXCHANGE_RATE_STORAGE_KEY, JSON.stringify(snapshot));
            } catch {
              // Ignore quota errors
            }
          }
          return snapshot;
        }
      } catch {
        // Continue to next endpoint or fallback
      }
    }
  }

  const fallbackSnapshot: DailyExchangeRateSnapshot = {
    base,
    date: todayStr,
    timestamp: Date.now(),
    ratesToINR: { ...FALLBACK_RATES_TO_INR },
    ratesFromINR: buildRatesFromINR(FALLBACK_RATES_TO_INR),
    source: 'fallback',
  };
  memoryCachedRates = fallbackSnapshot;
  return fallbackSnapshot;
}

export function formatCurrencyAmount(
  amount: number,
  currency: CurrencyCode | string = 'INR',
  options?: { showSign?: boolean; compact?: boolean; decimals?: number },
): string {
  const code = normalizeCurrencyCode(currency, 'INR');
  const meta = CURRENCY_METADATA[code] || CURRENCY_METADATA.INR;
  const numeric = Number(amount) || 0;
  const absVal = Math.abs(numeric);
  const decimals = options?.decimals ?? (code === 'INR' || code === 'JPY' ? 0 : 2);

  let formattedNumber: string;
  if (options?.compact && absVal >= 100000 && code === 'INR') {
    formattedNumber =
      absVal >= 10000000
        ? `${(absVal / 10000000).toFixed(2)}Cr`
        : `${(absVal / 100000).toFixed(1)}L`;
  } else if (options?.compact && absVal >= 1000) {
    formattedNumber = `${(absVal / 1000).toFixed(1)}k`;
  } else {
    formattedNumber = absVal.toLocaleString(meta.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  const signPrefix =
    numeric < 0 ? '-' : options?.showSign && numeric > 0 ? '+' : '';
  return `${signPrefix}${meta.symbol}${formattedNumber}`;
}

export interface CurrencyBreakdownRow {
  currency: CurrencyCode;
  symbol: string;
  transactionCount: number;
  originalIncome: number;
  originalExpense: number;
  convertedIncomeINR: number;
  convertedExpenseINR: number;
  exchangeRateToINR: number;
}

/**
 * Summarizes multi-currency exposure across a list of transactions.
 */
export function summarizeMultiCurrencyTransactions(
  transactions: Array<MultiCurrencyTransactionLike & { type?: string }>,
  ratesToINR?: Partial<Record<CurrencyCode, number>> | null,
): CurrencyBreakdownRow[] {
  const activeRates = getActiveRatesToINR(ratesToINR);
  const map = new Map<CurrencyCode, CurrencyBreakdownRow>();

  for (const tx of transactions) {
    if (tx.type !== 'Income' && tx.type !== 'Expense') continue;
    const resolved = resolveTransactionAmountInCurrency(tx, 'INR', activeRates);
    const code = resolved.originalCurrency;
    const meta = CURRENCY_METADATA[code];

    const existing = map.get(code) ?? {
      currency: code,
      symbol: meta.symbol,
      transactionCount: 0,
      originalIncome: 0,
      originalExpense: 0,
      convertedIncomeINR: 0,
      convertedExpenseINR: 0,
      exchangeRateToINR: resolved.exchangeRateToINR,
    };

    existing.transactionCount += 1;
    if (tx.type === 'Income') {
      existing.originalIncome = Number((existing.originalIncome + resolved.originalAmount).toFixed(2));
      existing.convertedIncomeINR = Number((existing.convertedIncomeINR + resolved.amountInINR).toFixed(2));
    } else if (tx.type === 'Expense') {
      existing.originalExpense = Number((existing.originalExpense + resolved.originalAmount).toFixed(2));
      existing.convertedExpenseINR = Number((existing.convertedExpenseINR + resolved.amountInINR).toFixed(2));
    }
    map.set(code, existing);
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      b.convertedExpenseINR + b.convertedIncomeINR - (a.convertedExpenseINR + a.convertedIncomeINR),
  );
}
