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

export interface CurrencyPresetDefaults {
  price: string;
  salary: string;
  downPayment: string;
  fuel: string;
  insurance: string;
  maintenance: string;
  parking: string;
  misc: string;
  savings: string;
  car2Price: string;
  car3Price: string;
  label: string;
  placeholderPrice: string;
  placeholderSalary: string;
  placeholderFuel: string;
  placeholderInsurance: string;
  placeholderCar2: string;
  placeholderCar3: string;
  placeholderDownPayment?: string;
  placeholderMaintenance?: string;
  placeholderParking?: string;
  placeholderMisc?: string;
  placeholderSavings?: string;
  placeholderCar2Price?: string;
  placeholderCar3Price?: string;
}

export type PopulatedCurrencyPresetDefaults = Required<CurrencyPresetDefaults>;

export const CURRENCY_PRESET_DEFAULTS: Record<CurrencyCode, CurrencyPresetDefaults> = {
  INR: {
    price: '1200000',
    salary: '120000',
    downPayment: '20',
    fuel: '6000',
    insurance: '35000',
    maintenance: '15000',
    parking: '2000',
    misc: '1500',
    savings: '300000',
    car2Price: '900000',
    car3Price: '1500000',
    label: 'Indian Rupee (₹ · Lakhs)',
    placeholderPrice: 'e.g. 12,00,000',
    placeholderSalary: 'e.g. 1,20,000',
    placeholderFuel: 'e.g. 6,000',
    placeholderInsurance: 'e.g. 35,000',
    placeholderCar2: 'e.g. 9,00,000',
    placeholderCar3: 'e.g. 15,00,000',
  },
  USD: {
    price: '35000',
    salary: '6500',
    downPayment: '20',
    fuel: '180',
    insurance: '1500',
    maintenance: '800',
    parking: '150',
    misc: '100',
    savings: '20000',
    car2Price: '28000',
    car3Price: '48000',
    label: 'US Dollar ($ · Standard)',
    placeholderPrice: 'e.g. 35,000',
    placeholderSalary: 'e.g. 6,500',
    placeholderFuel: 'e.g. 180',
    placeholderInsurance: 'e.g. 1,500',
    placeholderCar2: 'e.g. 28,000',
    placeholderCar3: 'e.g. 48,000',
  },
  EUR: {
    price: '32000',
    salary: '4200',
    downPayment: '20',
    fuel: '160',
    insurance: '1200',
    maintenance: '750',
    parking: '120',
    misc: '80',
    savings: '18000',
    car2Price: '24000',
    car3Price: '45000',
    label: 'Euro (€ · Standard)',
    placeholderPrice: 'e.g. 32,000',
    placeholderSalary: 'e.g. 4,200',
    placeholderFuel: 'e.g. 160',
    placeholderInsurance: 'e.g. 1,200',
    placeholderCar2: 'e.g. 24,000',
    placeholderCar3: 'e.g. 45,000',
  },
  GBP: {
    price: '28000',
    salary: '3800',
    downPayment: '20',
    fuel: '150',
    insurance: '1100',
    maintenance: '650',
    parking: '100',
    misc: '70',
    savings: '15000',
    car2Price: '22000',
    car3Price: '40000',
    label: 'British Pound (£ · Standard)',
    placeholderPrice: 'e.g. 28,000',
    placeholderSalary: 'e.g. 3,800',
    placeholderFuel: 'e.g. 150',
    placeholderInsurance: 'e.g. 1,100',
    placeholderCar2: 'e.g. 22,000',
    placeholderCar3: 'e.g. 40,000',
  },
  AED: {
    price: '130000',
    salary: '18000',
    downPayment: '20',
    fuel: '700',
    insurance: '4000',
    maintenance: '3000',
    parking: '400',
    misc: '300',
    savings: '60000',
    car2Price: '95000',
    car3Price: '180000',
    label: 'UAE Dirham (AED)',
    placeholderPrice: 'e.g. 130,000',
    placeholderSalary: 'e.g. 18,000',
    placeholderFuel: 'e.g. 700',
    placeholderInsurance: 'e.g. 4,000',
    placeholderCar2: 'e.g. 95,000',
    placeholderCar3: 'e.g. 180,000',
  },
  CAD: {
    price: '45000',
    salary: '7000',
    downPayment: '20',
    fuel: '220',
    insurance: '1800',
    maintenance: '900',
    parking: '180',
    misc: '120',
    savings: '25000',
    car2Price: '35000',
    car3Price: '60000',
    label: 'Canadian Dollar (CA$)',
    placeholderPrice: 'e.g. 45,000',
    placeholderSalary: 'e.g. 7,000',
    placeholderFuel: 'e.g. 220',
    placeholderInsurance: 'e.g. 1,800',
    placeholderCar2: 'e.g. 35,000',
    placeholderCar3: 'e.g. 60,000',
  },
  AUD: {
    price: '48000',
    salary: '7500',
    downPayment: '20',
    fuel: '240',
    insurance: '1900',
    maintenance: '950',
    parking: '200',
    misc: '130',
    savings: '28000',
    car2Price: '38000',
    car3Price: '65000',
    label: 'Australian Dollar (A$)',
    placeholderPrice: 'e.g. 48,000',
    placeholderSalary: 'e.g. 7,500',
    placeholderFuel: 'e.g. 240',
    placeholderInsurance: 'e.g. 1,900',
    placeholderCar2: 'e.g. 38,000',
    placeholderCar3: 'e.g. 65,000',
  },
  JPY: {
    price: '3800000',
    salary: '450000',
    downPayment: '20',
    fuel: '18000',
    insurance: '120000',
    maintenance: '80000',
    parking: '15000',
    misc: '10000',
    savings: '1500000',
    car2Price: '2800000',
    car3Price: '5200000',
    label: 'Japanese Yen (¥)',
    placeholderPrice: 'e.g. 3,800,000',
    placeholderSalary: 'e.g. 450,000',
    placeholderFuel: 'e.g. 18,000',
    placeholderInsurance: 'e.g. 120,000',
    placeholderCar2: 'e.g. 2,800,000',
    placeholderCar3: 'e.g. 5,200,000',
  },
  SGD: {
    price: '140000',
    salary: '9000',
    downPayment: '20',
    fuel: '300',
    insurance: '2200',
    maintenance: '1200',
    parking: '250',
    misc: '150',
    savings: '40000',
    car2Price: '110000',
    car3Price: '190000',
    label: 'Singapore Dollar (S$)',
    placeholderPrice: 'e.g. 140,000',
    placeholderSalary: 'e.g. 9,000',
    placeholderFuel: 'e.g. 300',
    placeholderInsurance: 'e.g. 2,200',
    placeholderCar2: 'e.g. 110,000',
    placeholderCar3: 'e.g. 190,000',
  },
};

/**
 * Returns fully populated preset defaults for any currency code
 */
export function getCurrencyPresetDefaults(code?: string | null): PopulatedCurrencyPresetDefaults {
  const normalized = normalizeCurrencyCode(code);
  const base = CURRENCY_PRESET_DEFAULTS[normalized] || CURRENCY_PRESET_DEFAULTS.INR;
  const pNum = parseFloat(base.price) || 0;
  const dpNum = Math.round(pNum * 0.2);

  return {
    ...base,
    placeholderDownPayment: base.placeholderDownPayment || `e.g. ${dpNum.toLocaleString()}`,
    placeholderMaintenance: base.placeholderMaintenance || `e.g. ${(parseFloat(base.maintenance) || 0).toLocaleString()}`,
    placeholderParking: base.placeholderParking || `e.g. ${(parseFloat(base.parking) || 0).toLocaleString()}`,
    placeholderMisc: base.placeholderMisc || `e.g. ${(parseFloat(base.misc) || 0).toLocaleString()}`,
    placeholderSavings: base.placeholderSavings || `e.g. ${(parseFloat(base.savings) || 0).toLocaleString()}`,
    placeholderCar2Price: base.placeholderCar2Price || base.placeholderCar2 || `e.g. ${(parseFloat(base.car2Price) || 0).toLocaleString()}`,
    placeholderCar3Price: base.placeholderCar3Price || base.placeholderCar3 || `e.g. ${(parseFloat(base.car3Price) || 0).toLocaleString()}`,
  };
}

/**
 * Parses raw input and returns formatted currency preview for display below the input
 */
export function formatInputPreview(raw: string | number, currencyCode: CurrencyCode): string {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.-]/g, ''));
  if (isNaN(n) || n <= 0) return '';
  return formatLocalizedCurrency(n, currencyCode);
}

