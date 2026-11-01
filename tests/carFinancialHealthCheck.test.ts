import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface FinancialHealthCheckParams {
  emi: number;
  monthlySalary: number;
}

export interface FinancialHealthCheckResult {
  status: 'healthy' | 'exceeded' | 'awaiting_income';
  isPass: boolean | null;
  emi: number;
  monthlySalary: number;
  maxRecommendedEmi: number;
  emiRatio: number;
  emiRatioPercent: number;
  difference: number;
  color: string;
  badgeLabel: string;
}

export function evaluateFinancialHealthCheck({
  emi,
  monthlySalary,
}: FinancialHealthCheckParams): FinancialHealthCheckResult {
  const safeSalary = Math.max(0, monthlySalary || 0);
  const safeEmi = Math.max(0, emi || 0);

  if (safeSalary <= 0) {
    return {
      status: 'awaiting_income',
      isPass: null,
      emi: safeEmi,
      monthlySalary: 0,
      maxRecommendedEmi: 0,
      emiRatio: 0,
      emiRatioPercent: 0,
      difference: 0,
      color: 'var(--accent)',
      badgeLabel: 'Enter Monthly Income to Evaluate',
    };
  }

  const maxRecommendedEmi = safeSalary * 0.15;
  const emiRatio = safeEmi / safeSalary;
  const emiRatioPercent = emiRatio * 100;
  const isPass = safeEmi <= maxRecommendedEmi;
  const difference = Math.abs(safeEmi - maxRecommendedEmi);

  return {
    status: isPass ? 'healthy' : 'exceeded',
    isPass,
    emi: safeEmi,
    monthlySalary: safeSalary,
    maxRecommendedEmi,
    emiRatio,
    emiRatioPercent,
    difference,
    color: isPass ? 'var(--emerald)' : 'var(--rose)',
    badgeLabel: isPass ? 'Healthy (≤15% of Income)' : 'Exceeds 15% Recommended Limit',
  };
}

describe('Car Affordability & EMI Calculator - Financial Health Check Indicator', () => {
  it('highlights in GREEN (Healthy) when monthly EMI is below the 15% income guideline', () => {
    // ₹12,000 EMI on ₹100,000 monthly income = 12% (<= 15%)
    const result = evaluateFinancialHealthCheck({
      emi: 12000,
      monthlySalary: 100000,
    });

    assert.equal(result.status, 'healthy');
    assert.equal(result.isPass, true);
    assert.equal(result.color, 'var(--emerald)');
    assert.equal(result.maxRecommendedEmi, 15000);
    assert.equal(result.emiRatioPercent, 12);
    assert.equal(result.difference, 3000); // ₹3,000 cushion remaining
    assert.match(result.badgeLabel, /Healthy/);
  });

  it('highlights in GREEN at the exact 15.0% threshold boundary', () => {
    // ₹15,000 EMI on ₹100,000 monthly income = exactly 15.0%
    const result = evaluateFinancialHealthCheck({
      emi: 15000,
      monthlySalary: 100000,
    });

    assert.equal(result.status, 'healthy');
    assert.equal(result.isPass, true);
    assert.equal(result.color, 'var(--emerald)');
    assert.equal(result.difference, 0);
  });

  it('highlights in RED (Exceeded) when monthly EMI exceeds the 15% income guideline', () => {
    // ₹22,000 EMI on ₹100,000 monthly income = 22% (> 15%)
    const result = evaluateFinancialHealthCheck({
      emi: 22000,
      monthlySalary: 100000,
    });

    assert.equal(result.status, 'exceeded');
    assert.equal(result.isPass, false);
    assert.equal(result.color, 'var(--rose)');
    assert.equal(result.maxRecommendedEmi, 15000);
    assert.equal(result.emiRatioPercent, 22);
    assert.equal(result.difference, 7000); // ₹7,000 over recommended ceiling
    assert.match(result.badgeLabel, /Exceeds/);
  });

  it('detects fractional boundary shifts (14.9% vs 15.1%)', () => {
    // 14.9%: ₹14,900 on ₹100,000
    const passResult = evaluateFinancialHealthCheck({
      emi: 14900,
      monthlySalary: 100000,
    });
    assert.equal(passResult.isPass, true);
    assert.equal(passResult.status, 'healthy');

    // 15.1%: ₹15,100 on ₹100,000
    const failResult = evaluateFinancialHealthCheck({
      emi: 15100,
      monthlySalary: 100000,
    });
    assert.equal(failResult.isPass, false);
    assert.equal(failResult.status, 'exceeded');
  });

  it('gracefully handles missing, zero, or negative monthly salary inputs', () => {
    const zeroSalaryResult = evaluateFinancialHealthCheck({
      emi: 18000,
      monthlySalary: 0,
    });

    assert.equal(zeroSalaryResult.status, 'awaiting_income');
    assert.equal(zeroSalaryResult.isPass, null);
    assert.equal(zeroSalaryResult.difference, 0);

    const negativeSalaryResult = evaluateFinancialHealthCheck({
      emi: 18000,
      monthlySalary: -50000,
    });

    assert.equal(negativeSalaryResult.status, 'awaiting_income');
    assert.equal(negativeSalaryResult.isPass, null);
  });
});
