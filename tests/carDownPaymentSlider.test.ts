import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface DownPaymentScalingParams {
  price: number;
  downPaymentValue: number;
  isPercent: boolean;
  interestRate: number;
  loanYears: number;
}

export function calculateDownPaymentScaling({
  price,
  downPaymentValue,
  isPercent,
  interestRate,
  loanYears,
}: DownPaymentScalingParams) {
  const safePrice = Math.max(0, price);
  const safeRate = Math.max(0, Math.min(25, interestRate));
  const safeYears = Math.max(1, Math.min(7, loanYears));
  const totalMonths = safeYears * 12;
  const monthlyRate = safeRate / 1200;

  // Compute Down Payment Amount & Fraction
  const rawDp = Math.max(0, downPaymentValue);
  const dpAmount = isPercent
    ? (safePrice * Math.min(100, rawDp)) / 100
    : Math.min(safePrice, rawDp);
  const dpFraction = safePrice > 0 ? dpAmount / safePrice : 0;
  const principal = Math.max(0, safePrice - dpAmount);

  // EMI formula
  let emi = 0;
  if (principal > 0) {
    if (monthlyRate === 0) {
      emi = principal / totalMonths;
    } else {
      const compound = Math.pow(1 + monthlyRate, totalMonths);
      emi = (principal * monthlyRate * compound) / (compound - 1);
    }
  }

  const totalRepaid = emi * totalMonths;
  const totalInterest = Math.max(0, totalRepaid - principal);

  return {
    price: safePrice,
    dpAmount: Math.round(dpAmount),
    dpFraction,
    dpPercent: Math.round(dpFraction * 1000) / 10,
    principal: Math.round(principal),
    emi: Math.round(emi),
    totalInterest: Math.round(totalInterest),
    totalRepaid: Math.round(totalRepaid),
    totalCost: Math.round(dpAmount + totalRepaid),
  };
}

describe('Car Affordability & EMI Calculator - Down Payment Range Slider & Dynamic Scaling', () => {
  const carPrice = 1200000; // ₹12 Lakhs
  const interestRate = 9.0; // 9% p.a.
  const loanYears = 5; // 5 Years

  it('correctly calculates principal, EMI, and interest scaling across percentage presets (10%, 20%, 30%, 50%)', () => {
    const dp10 = calculateDownPaymentScaling({
      price: carPrice,
      downPaymentValue: 10,
      isPercent: true,
      interestRate,
      loanYears,
    });
    const dp20 = calculateDownPaymentScaling({
      price: carPrice,
      downPaymentValue: 20,
      isPercent: true,
      interestRate,
      loanYears,
    });
    const dp30 = calculateDownPaymentScaling({
      price: carPrice,
      downPaymentValue: 30,
      isPercent: true,
      interestRate,
      loanYears,
    });
    const dp50 = calculateDownPaymentScaling({
      price: carPrice,
      downPaymentValue: 50,
      isPercent: true,
      interestRate,
      loanYears,
    });

    // 10% Down Payment
    assert.equal(dp10.dpAmount, 120000);
    assert.equal(dp10.principal, 1080000);
    assert.equal(dp10.emi, 22419);

    // 20% Standard Benchmark
    assert.equal(dp20.dpAmount, 240000);
    assert.equal(dp20.principal, 960000);
    assert.equal(dp20.emi, 19928);

    // 30% Down Payment
    assert.equal(dp30.dpAmount, 360000);
    assert.equal(dp30.principal, 840000);
    assert.equal(dp30.emi, 17437);

    // 50% Half Upfront
    assert.equal(dp50.dpAmount, 600000);
    assert.equal(dp50.principal, 600000);
    assert.equal(dp50.emi, 12455);

    // As down payment increases, principal, EMI, and total interest monotonically decrease
    assert.ok(dp10.principal > dp20.principal);
    assert.ok(dp20.principal > dp30.principal);
    assert.ok(dp30.principal > dp50.principal);

    assert.ok(dp10.emi > dp20.emi);
    assert.ok(dp20.emi > dp30.emi);
    assert.ok(dp30.emi > dp50.emi);

    assert.ok(dp10.totalInterest > dp20.totalInterest);
    assert.ok(dp20.totalInterest > dp30.totalInterest);
    assert.ok(dp30.totalInterest > dp50.totalInterest);

    // Verify concrete interest savings from 10% down to 30% down
    const interestSaved = dp10.totalInterest - dp30.totalInterest;
    assert.ok(interestSaved > 50000, `Interest saved should be > ₹50,000 (was ${interestSaved})`);
  });

  it('correctly scales when adjusting upfront amount in absolute Rupee mode (₹)', () => {
    const dpRupees = calculateDownPaymentScaling({
      price: carPrice,
      downPaymentValue: 300000, // ₹3,00,000 fixed
      isPercent: false,
      interestRate,
      loanYears,
    });

    assert.equal(dpRupees.dpAmount, 300000);
    assert.equal(dpRupees.principal, 900000);
    assert.equal(dpRupees.dpPercent, 25);
    assert.equal(dpRupees.emi, 18683);
  });

  it('safely clamps slider values at 0% (zero down) and 100% (full upfront payment)', () => {
    // 0% down payment
    const dpZero = calculateDownPaymentScaling({
      price: carPrice,
      downPaymentValue: 0,
      isPercent: true,
      interestRate,
      loanYears,
    });
    assert.equal(dpZero.dpAmount, 0);
    assert.equal(dpZero.principal, 1200000);
    assert.equal(dpZero.emi, 24910);

    // 100% full upfront cash purchase
    const dpFull = calculateDownPaymentScaling({
      price: carPrice,
      downPaymentValue: 100,
      isPercent: true,
      interestRate,
      loanYears,
    });
    assert.equal(dpFull.dpAmount, 1200000);
    assert.equal(dpFull.principal, 0);
    assert.equal(dpFull.emi, 0);
    assert.equal(dpFull.totalInterest, 0);
    assert.equal(dpFull.totalCost, 1200000);
  });

  it('handles negative or out-of-bounds down payments gracefully', () => {
    const dpNeg = calculateDownPaymentScaling({
      price: carPrice,
      downPaymentValue: -50000,
      isPercent: false,
      interestRate,
      loanYears,
    });
    assert.equal(dpNeg.dpAmount, 0);
    assert.equal(dpNeg.principal, carPrice);

    const dpExceed = calculateDownPaymentScaling({
      price: carPrice,
      downPaymentValue: 1500000, // exceeds price
      isPercent: false,
      interestRate,
      loanYears,
    });
    assert.equal(dpExceed.dpAmount, carPrice);
    assert.equal(dpExceed.principal, 0);
  });
});
