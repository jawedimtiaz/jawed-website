/**
 * Localized Currency Formatter Utility for Car Affordability & EMI Calculator
 * Supports multiple international currencies with native locale grouping,
 * symbol placement, compact notation, and browser locale auto-detection.
 */

export type CurrencyCode =
  | 'INR'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'AED'
  | 'CAD'
  | 'AUD'
  | 'JPY'
  | 'SGD';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  countryName: string;
  locale: string;
  numberingSystem: 'indian' | 'standard';
  exampleFormatted: string;
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    countryName: 'India',
    locale: 'en-IN',
    numberingSystem: 'indian',
    exampleFormatted: '₹12,00,000',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    countryName: 'United States',
    locale: 'en-US',
    numberingSystem: 'standard',
    exampleFormatted: '$1,200,000',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    countryName: 'European Union',
    locale: 'en-IE',
    numberingSystem: 'standard',
    exampleFormatted: '€1,200,000',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    countryName: 'United Kingdom',
    locale: 'en-GB',
    numberingSystem: 'standard',
    exampleFormatted: '£1,200,000',
  },
  AED: {
    code: 'AED',
    symbol: 'AED',
    name: 'UAE Dirham',
    countryName: 'United Arab Emirates',
    locale: 'en-AE',
    numberingSystem: 'standard',
    exampleFormatted: 'AED 1,200,000',
  },
  CAD: {
    code: 'CAD',
    symbol: 'CA$',
    name: 'Canadian Dollar',
    countryName: 'Canada',
    locale: 'en-US',
    numberingSystem: 'standard',
    exampleFormatted: 'CA$1,200,000',
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    countryName: 'Australia',
    locale: 'en-US',
    numberingSystem: 'standard',
    exampleFormatted: 'A$1,200,000',
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    countryName: 'Japan',
    locale: 'ja-JP',
    numberingSystem: 'standard',
    exampleFormatted: '¥1,200,000',
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    countryName: 'Singapore',
    locale: 'en-US',
    numberingSystem: 'standard',
    exampleFormatted: 'S$1,200,000',
  },
};

export const CURRENCY_LIST: CurrencyConfig[] = Object.values(SUPPORTED_CURRENCIES);

export const DEFAULT_CURRENCY_CODE: CurrencyCode = 'INR';

/**
 * Normalizes an unknown string into a valid supported CurrencyCode.
 * Falls back to 'INR' if unrecognized.
 */
export function normalizeCurrencyCode(rawCode?: string | null): CurrencyCode {
  if (!rawCode) return DEFAULT_CURRENCY_CODE;
  const upper = rawCode.toUpperCase().trim() as CurrencyCode;
  return SUPPORTED_CURRENCIES[upper] ? upper : DEFAULT_CURRENCY_CODE;
}

/**
 * Returns currency configuration for a given code.
 */
export function getCurrencyConfig(code?: string | null): CurrencyConfig {
  const normalized = normalizeCurrencyCode(code);
  return SUPPORTED_CURRENCIES[normalized];
}

/**
 * Returns the display symbol for a currency code (e.g. ₹, $, €, £).
 */
export function getCurrencySymbol(code?: string | null): string {
  return getCurrencyConfig(code).symbol;
}

export interface FormatCurrencyOptions {
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  useGrouping?: boolean;
}

/**
 * Formats a numeric value into a localized currency string.
 * Uses Intl.NumberFormat for standards-compliant locale and symbol placement.
 */
export function formatLocalizedCurrency(
  value: number,
  currencyCode?: string | null,
  options?: FormatCurrencyOptions
): string {
  const num = typeof value === 'number' && !isNaN(value) && isFinite(value) ? value : 0;
  const config = getCurrencyConfig(currencyCode);

  const maxFraction = options?.maximumFractionDigits ?? 0;
  const minFraction = options?.minimumFractionDigits ?? 0;
  const useGrouping = options?.useGrouping ?? true;

  try {
    // If standard CAD / AUD / SGD where en-US disambiguates nicely
    if (config.code === 'CAD' || config.code === 'AUD') {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: config.code,
        maximumFractionDigits: maxFraction,
        minimumFractionDigits: minFraction,
        useGrouping,
      });
      return formatter.format(num);
    }

    if (config.code === 'SGD') {
      const absFormatted = Math.abs(Math.round(num)).toLocaleString('en-US');
      const sign = num < 0 ? '-' : '';
      return `${sign}S$${absFormatted}`;
    }

    if (config.code === 'AED') {
      const absFormatted = Math.abs(Math.round(num)).toLocaleString('en-US');
      const sign = num < 0 ? '-' : '';
      return `${sign}AED ${absFormatted}`;
    }

    const formatter = new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      maximumFractionDigits: maxFraction,
      minimumFractionDigits: minFraction,
      useGrouping,
    });

    const formatted = formatter.format(num);
    // Replace non-breaking spaces with standard spaces for clean rendering
    return formatted.replace(/\u00A0/g, ' ');
  } catch {
    // Graceful fallback if Intl fails
    const rounded = Math.round(num);
    const sign = rounded < 0 ? '-' : '';
    const absVal = Math.abs(rounded);
    const formattedNum = config.numberingSystem === 'indian'
      ? absVal.toLocaleString('en-IN')
      : absVal.toLocaleString('en-US');
    return `${sign}${config.symbol}${formattedNum}`;
  }
}

/**
 * Compact currency formatting for chart axes, small tags, or condensed gauges.
 * E.g., ₹12L / ₹1.5Cr (INR) or $1.2M / $25k (USD).
 */
export function formatCompactCurrency(
  value: number,
  currencyCode?: string | null
): string {
  const num = typeof value === 'number' && !isNaN(value) && isFinite(value) ? value : 0;
  const config = getCurrencyConfig(currencyCode);
  const sign = num < 0 ? '−' : '';
  const abs = Math.abs(num);

  if (config.code === 'INR') {
    if (abs >= 10000000) {
      return `${sign}₹${(abs / 10000000).toFixed(abs % 10000000 === 0 ? 0 : 1)}Cr`;
    }
    if (abs >= 100000) {
      return `${sign}₹${(abs / 100000).toFixed(abs % 100000 === 0 ? 0 : 1)}L`;
    }
    if (abs >= 1000) {
      return `${sign}₹${(abs / 1000).toFixed(0)}k`;
    }
    return `${sign}₹${Math.round(abs)}`;
  }

  // International standard (Million / Thousand)
  const sym = config.symbol;
  if (abs >= 1000000) {
    return `${sign}${sym}${(abs / 1000000).toFixed(abs % 1000000 === 0 ? 0 : 1)}M`;
  }
  if (abs >= 1000) {
    return `${sign}${sym}${(abs / 1000).toFixed(0)}k`;
  }
  return `${sign}${sym}${Math.round(abs)}`;
}

/**
 * Suggests a currency code based on a regional locale tag (e.g. 'en-US', 'en-IN', 'fr-FR').
 */
export function matchLocaleToCurrency(localeTag?: string | null): CurrencyCode {
  if (!localeTag) return DEFAULT_CURRENCY_CODE;
  const tag = localeTag.toLowerCase();

  if (tag.includes('-in') || tag.startsWith('hi') || tag.startsWith('ta') || tag.startsWith('te') || tag.startsWith('bn')) {
    return 'INR';
  }
  if (tag.includes('-us')) {
    return 'USD';
  }
  if (tag.includes('-gb')) {
    return 'GBP';
  }
  if (tag.includes('-ca')) {
    return 'CAD';
  }
  if (tag.includes('-au')) {
    return 'AUD';
  }
  if (tag.includes('-ae') || tag.startsWith('ar')) {
    return 'AED';
  }
  if (tag.includes('-jp') || tag.startsWith('ja')) {
    return 'JPY';
  }
  if (tag.includes('-sg')) {
    return 'SGD';
  }
  if (
    tag.includes('-de') ||
    tag.includes('-fr') ||
    tag.includes('-es') ||
    tag.includes('-it') ||
    tag.includes('-nl') ||
    tag.includes('-ie') ||
    tag.includes('-pt') ||
    tag.includes('-at') ||
    tag.includes('-be') ||
    tag.includes('-fi') ||
    tag.includes('-gr')
  ) {
    return 'EUR';
  }

  return DEFAULT_CURRENCY_CODE;
}

/**
 * Detects the user's browser language / regional settings if running in the client.
 */
export function detectBrowserCurrency(): {
  detectedCode: CurrencyCode;
  detectedLocale: string;
  isRecognized: boolean;
} {
  if (typeof navigator === 'undefined') {
    return { detectedCode: DEFAULT_CURRENCY_CODE, detectedLocale: 'en-IN', isRecognized: false };
  }

  const userLocales = navigator.languages && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language || 'en-IN'];

  for (const loc of userLocales) {
    const matched = matchLocaleToCurrency(loc);
    if (matched) {
      return {
        detectedCode: matched,
        detectedLocale: loc,
        isRecognized: matched !== 'INR' || loc.toLowerCase().includes('in'),
      };
    }
  }

  return { detectedCode: DEFAULT_CURRENCY_CODE, detectedLocale: userLocales[0] || 'en-IN', isRecognized: false };
}
