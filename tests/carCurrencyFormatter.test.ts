import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatLocalizedCurrency,
  formatCompactCurrency,
  getCurrencyConfig,
  getCurrencySymbol,
  matchLocaleToCurrency,
  normalizeCurrencyCode,
  SUPPORTED_CURRENCIES,
  CURRENCY_LIST,
  CurrencyCode,
} from '../src/utils/currencyFormatter.js';

describe('Car Affordability & EMI Calculator - Localized Currency Formatter', () => {
  describe('formatLocalizedCurrency() - Multi-Currency Global Formatting', () => {
    const testAmount = 1200000; // 12 Lakhs / 1.2 Million

    it('formats Indian Rupee (INR) using Lakhs numbering grouping', () => {
      const formatted = formatLocalizedCurrency(testAmount, 'INR');
      assert.ok(
        formatted.includes('₹') && formatted.includes('12,00,000'),
        `Expected INR formatted with lakhs grouping, received "${formatted}"`
      );
    });

    it('formats US Dollar (USD) using Million/Thousands numbering grouping', () => {
      const formatted = formatLocalizedCurrency(testAmount, 'USD');
      assert.ok(
        formatted.includes('$') && formatted.includes('1,200,000'),
        `Expected USD formatted as $1,200,000, received "${formatted}"`
      );
    });

    it('formats Euro (EUR) with Euro symbol and standard grouping', () => {
      const formatted = formatLocalizedCurrency(testAmount, 'EUR');
      assert.ok(
        formatted.includes('€') && (formatted.includes('1,200,000') || formatted.includes('1.200.000')),
        `Expected EUR formatted with € symbol, received "${formatted}"`
      );
    });

    it('formats British Pound (GBP) with Pound symbol', () => {
      const formatted = formatLocalizedCurrency(testAmount, 'GBP');
      assert.ok(
        formatted.includes('£') && formatted.includes('1,200,000'),
        `Expected GBP formatted as £1,200,000, received "${formatted}"`
      );
    });

    it('formats UAE Dirham (AED) cleanly', () => {
      const formatted = formatLocalizedCurrency(testAmount, 'AED');
      assert.ok(
        formatted.includes('AED') && formatted.includes('1,200,000'),
        `Expected AED formatted with AED prefix, received "${formatted}"`
      );
    });

    it('formats Canadian Dollar (CAD) with disambiguated symbol', () => {
      const formatted = formatLocalizedCurrency(testAmount, 'CAD');
      assert.ok(
        formatted.includes('CA$') || formatted.includes('$1,200,000'),
        `Expected CAD formatted, received "${formatted}"`
      );
    });

    it('formats Australian Dollar (AUD) with disambiguated symbol', () => {
      const formatted = formatLocalizedCurrency(testAmount, 'AUD');
      assert.ok(
        formatted.includes('A$') || formatted.includes('$1,200,000'),
        `Expected AUD formatted, received "${formatted}"`
      );
    });

    it('formats Japanese Yen (JPY) and Singapore Dollar (SGD)', () => {
      const jpyFormatted = formatLocalizedCurrency(testAmount, 'JPY');
      assert.ok(
        jpyFormatted.includes('¥') || jpyFormatted.includes('￥'),
        `Expected Yen symbol, received "${jpyFormatted}"`
      );

      const sgdFormatted = formatLocalizedCurrency(testAmount, 'SGD');
      assert.ok(
        sgdFormatted.includes('S$') && sgdFormatted.includes('1,200,000'),
        `Expected SGD formatted, received "${sgdFormatted}"`
      );
    });
  });

  describe('Edge Case & Boundary Handling', () => {
    it('handles zero amount across multiple currencies', () => {
      assert.equal(formatLocalizedCurrency(0, 'INR'), '₹0');
      assert.equal(formatLocalizedCurrency(0, 'USD'), '$0');
      assert.equal(formatLocalizedCurrency(0, 'GBP'), '£0');
    });

    it('handles negative values gracefully with sign preservation', () => {
      const inrNeg = formatLocalizedCurrency(-25000, 'INR');
      const usdNeg = formatLocalizedCurrency(-25000, 'USD');
      assert.ok(inrNeg.includes('-') && inrNeg.includes('25,000'), `Expected negative INR, got "${inrNeg}"`);
      assert.ok(usdNeg.includes('-') && usdNeg.includes('25,000'), `Expected negative USD, got "${usdNeg}"`);
    });

    it('handles non-numeric or NaN values by safely defaulting to 0', () => {
      // @ts-expect-error test invalid inputs
      assert.equal(formatLocalizedCurrency(NaN, 'USD'), '$0');
      // @ts-expect-error test invalid inputs
      assert.equal(formatLocalizedCurrency(null, 'USD'), '$0');
      // @ts-expect-error test invalid inputs
      assert.equal(formatLocalizedCurrency(undefined, 'INR'), '₹0');
    });

    it('supports custom decimal fraction digits when requested', () => {
      const formattedWithDecimals = formatLocalizedCurrency(19928.45, 'USD', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      });
      assert.equal(formattedWithDecimals, '$19,928.45');
    });
  });

  describe('formatCompactCurrency() - Condensed Chart Axis Notation', () => {
    it('formats INR compact values with Lakhs (L) and Crores (Cr)', () => {
      assert.equal(formatCompactCurrency(1200000, 'INR'), '₹12L');
      assert.equal(formatCompactCurrency(15000000, 'INR'), '₹1.5Cr');
      assert.equal(formatCompactCurrency(20000000, 'INR'), '₹2Cr');
      assert.equal(formatCompactCurrency(24000, 'INR'), '₹24k');
      assert.equal(formatCompactCurrency(500, 'INR'), '₹500');
    });

    it('formats USD / standard currencies with Millions (M) and Thousands (k)', () => {
      assert.equal(formatCompactCurrency(1200000, 'USD'), '$1.2M');
      assert.equal(formatCompactCurrency(2000000, 'USD'), '$2M');
      assert.equal(formatCompactCurrency(24000, 'USD'), '$24k');
      assert.equal(formatCompactCurrency(500, 'USD'), '$500');
    });

    it('formats GBP and EUR compact representations correctly', () => {
      assert.equal(formatCompactCurrency(1200000, 'GBP'), '£1.2M');
      assert.equal(formatCompactCurrency(24000, 'GBP'), '£24k');
      assert.equal(formatCompactCurrency(1200000, 'EUR'), '€1.2M');
    });
  });

  describe('Regional Auto-Detection & Code Normalization', () => {
    it('maps international locale tags to corresponding currency codes', () => {
      assert.equal(matchLocaleToCurrency('en-IN'), 'INR');
      assert.equal(matchLocaleToCurrency('hi-IN'), 'INR');
      assert.equal(matchLocaleToCurrency('en-US'), 'USD');
      assert.equal(matchLocaleToCurrency('en-GB'), 'GBP');
      assert.equal(matchLocaleToCurrency('de-DE'), 'EUR');
      assert.equal(matchLocaleToCurrency('fr-FR'), 'EUR');
      assert.equal(matchLocaleToCurrency('es-ES'), 'EUR');
      assert.equal(matchLocaleToCurrency('en-CA'), 'CAD');
      assert.equal(matchLocaleToCurrency('en-AU'), 'AUD');
      assert.equal(matchLocaleToCurrency('en-AE'), 'AED');
      assert.equal(matchLocaleToCurrency('ja-JP'), 'JPY');
      assert.equal(matchLocaleToCurrency('en-SG'), 'SGD');
    });

    it('falls back to default INR when locale is unknown or undefined', () => {
      assert.equal(matchLocaleToCurrency('xx-XX'), 'INR');
      assert.equal(matchLocaleToCurrency(undefined), 'INR');
      assert.equal(matchLocaleToCurrency(null), 'INR');
    });

    it('normalizes arbitrary casing and unknown currency codes safely', () => {
      assert.equal(normalizeCurrencyCode('usd'), 'USD');
      assert.equal(normalizeCurrencyCode('InR'), 'INR');
      assert.equal(normalizeCurrencyCode('eur'), 'EUR');
      assert.equal(normalizeCurrencyCode('UNKNOWN_CODE'), 'INR');
      assert.equal(normalizeCurrencyCode(null), 'INR');
    });

    it('resolves currency symbols reliably', () => {
      assert.equal(getCurrencySymbol('INR'), '₹');
      assert.equal(getCurrencySymbol('USD'), '$');
      assert.equal(getCurrencySymbol('EUR'), '€');
      assert.equal(getCurrencySymbol('GBP'), '£');
      assert.equal(getCurrencySymbol('AED'), 'AED');
      assert.equal(getCurrencySymbol('CAD'), 'CA$');
      assert.equal(getCurrencySymbol('AUD'), 'A$');
    });

    it('exposes all supported currencies with valid configuration properties', () => {
      assert.ok(CURRENCY_LIST.length >= 8);
      for (const cur of CURRENCY_LIST) {
        assert.ok(cur.code.length === 3);
        assert.ok(cur.symbol.length >= 1);
        assert.ok(cur.name.length > 0);
        assert.ok(cur.locale.length >= 2);
        assert.ok(cur.numberingSystem === 'indian' || cur.numberingSystem === 'standard');
      }
    });
  });
});
