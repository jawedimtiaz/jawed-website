import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatLocalizedCurrency,
  formatCompactCurrency,
  formatInputPreview,
  getCurrencyConfig,
  getCurrencySymbol,
  getCurrencyPresetDefaults,
  SUPPORTED_CURRENCIES,
  CURRENCY_LIST,
  CurrencyCode,
} from '../src/utils/currencyFormatter.js';

describe('Car Affordability Calculator - Currency Selector Dropdown & Dynamic Formatting', () => {
  it('supports all primary common currencies (USD, INR, EUR, GBP)', () => {
    const commonCurrencies: CurrencyCode[] = ['USD', 'INR', 'EUR', 'GBP'];
    for (const code of commonCurrencies) {
      assert.ok(SUPPORTED_CURRENCIES[code], `Expected ${code} to be in SUPPORTED_CURRENCIES`);
      const cfg = getCurrencyConfig(code);
      assert.equal(cfg.code, code);
      assert.ok(cfg.symbol.length > 0);
      assert.ok(cfg.name.length > 0);
    }
  });

  it('supports other global currencies (CAD, AUD, AED, JPY, SGD)', () => {
    const globalCurrencies: CurrencyCode[] = ['CAD', 'AUD', 'AED', 'JPY', 'SGD'];
    for (const code of globalCurrencies) {
      assert.ok(SUPPORTED_CURRENCIES[code], `Expected ${code} to be in SUPPORTED_CURRENCIES`);
      const cfg = getCurrencyConfig(code);
      assert.equal(cfg.code, code);
      assert.ok(cfg.symbol.length > 0);
      assert.ok(cfg.name.length > 0);
    }
  });

  it('dynamically formats on-road price across common currencies', () => {
    const price = 40000;
    assert.equal(formatLocalizedCurrency(price, 'USD'), '$40,000');
    assert.equal(formatLocalizedCurrency(price, 'GBP'), '£40,000');
    assert.ok(formatLocalizedCurrency(price, 'EUR').includes('€'));
    assert.ok(formatLocalizedCurrency(price, 'EUR').includes('40,000') || formatLocalizedCurrency(price, 'EUR').includes('40.000'));
  });

  it('dynamically generates live input preview badges for financial inputs', () => {
    assert.equal(formatInputPreview('40000', 'USD'), '$40,000');
    assert.equal(formatInputPreview('1200000', 'INR'), '₹12,00,000');
    assert.equal(formatInputPreview('32000', 'EUR'), '€32,000');
    assert.equal(formatInputPreview('28000', 'GBP'), '£28,000');
  });

  it('generates compact badge labels for figures above 1,000', () => {
    assert.equal(formatCompactCurrency(35000, 'USD'), '$35k');
    assert.equal(formatCompactCurrency(1200000, 'INR'), '₹12L');
    assert.equal(formatCompactCurrency(28000, 'GBP'), '£28k');
    assert.equal(formatCompactCurrency(32000, 'EUR'), '€32k');
  });

  it('provides realistic benchmark default packages when user switches currency and applies benchmarks', () => {
    const usdBenchmarks = getCurrencyPresetDefaults('USD');
    assert.equal(usdBenchmarks.price, '35000');
    assert.equal(usdBenchmarks.salary, '6500');
    assert.equal(usdBenchmarks.fuel, '180');
    assert.equal(usdBenchmarks.insurance, '1500');

    const eurBenchmarks = getCurrencyPresetDefaults('EUR');
    assert.equal(eurBenchmarks.price, '32000');
    assert.equal(eurBenchmarks.salary, '4200');

    const inrBenchmarks = getCurrencyPresetDefaults('INR');
    assert.equal(inrBenchmarks.price, '1200000');
    assert.equal(inrBenchmarks.salary, '120000');
  });

  it('formats summary labels with the active currency symbol cleanly', () => {
    const usdSym = getCurrencySymbol('USD');
    const inrSym = getCurrencySymbol('INR');
    const eurSym = getCurrencySymbol('EUR');
    const gbpSym = getCurrencySymbol('GBP');

    assert.equal(`Car On-Road Price (USD · ${usdSym})`, 'Car On-Road Price (USD · $)');
    assert.equal(`Car On-Road Price (INR · ${inrSym})`, 'Car On-Road Price (INR · ₹)');
    assert.equal(`Car On-Road Price (EUR · ${eurSym})`, 'Car On-Road Price (EUR · €)');
    assert.equal(`Car On-Road Price (GBP · ${gbpSym})`, 'Car On-Road Price (GBP · £)');
  });
});
