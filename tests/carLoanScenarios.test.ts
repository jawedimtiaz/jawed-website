import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface SavedLoanScenario {
  id: string;
  name: string;
  price: string;
  downPayment: string;
  isDownPaymentPercent: boolean;
  interestRate: string;
  loanYears: number;
  description?: string;
}

export function calculateScenarioLoan(scenario: SavedLoanScenario) {
  const priceNum = Math.max(0, parseFloat(scenario.price.replace(/,/g, '')) || 0);
  const dpVal = Math.max(0, parseFloat(scenario.downPayment.replace(/,/g, '')) || 0);
  const dpAmount = scenario.isDownPaymentPercent
    ? (priceNum * Math.min(100, dpVal)) / 100
    : Math.min(priceNum, dpVal);
  const principal = Math.max(0, priceNum - dpAmount);
  const rateNum = Math.max(0, parseFloat(scenario.interestRate.replace(/,/g, '')) || 0);
  const monthlyRate = rateNum / 12 / 100;
  const totalMonths = Math.max(1, (scenario.loanYears || 1) * 12);

  let emi = 0;
  if (principal > 0) {
    if (monthlyRate === 0) {
      emi = principal / totalMonths;
    } else {
      const compound = Math.pow(1 + monthlyRate, totalMonths);
      emi = (principal * monthlyRate * compound) / (compound - 1);
    }
  }

  const totalAmount = emi * totalMonths;
  const totalInterest = Math.max(0, totalAmount - principal);

  return {
    price: priceNum,
    downPaymentAmount: dpAmount,
    principal,
    monthlyRate,
    totalMonths,
    emi: Math.round(emi),
    totalInterest: Math.round(totalInterest),
    totalCost: Math.round(priceNum + totalInterest),
  };
}

const DEFAULT_LOAN_SCENARIOS: SavedLoanScenario[] = [
  {
    id: 'scenario-5yr',
    name: 'Scenario A: 5-Year Standard',
    price: '1200000',
    downPayment: '20',
    isDownPaymentPercent: true,
    interestRate: '9',
    loanYears: 5,
    description: 'Balanced monthly EMI and total interest commitment',
  },
  {
    id: 'scenario-7yr',
    name: 'Scenario B: 7-Year Lower EMI',
    price: '1200000',
    downPayment: '20',
    isDownPaymentPercent: true,
    interestRate: '9.5',
    loanYears: 7,
    description: 'Lowest monthly outlay, higher cumulative interest over time',
  },
  {
    id: 'scenario-3yr',
    name: 'Scenario C: 3-Year Rapid Payoff',
    price: '1200000',
    downPayment: '30',
    isDownPaymentPercent: true,
    interestRate: '8.5',
    loanYears: 3,
    description: 'Higher monthly payments but minimizes total interest and gets debt-free quickly',
  },
];

describe('Car Affordability & EMI Calculator - Saved Loan Scenarios', () => {
  it('provides default standard scenarios covering 5-year, 7-year, and 3-year options', () => {
    assert.equal(DEFAULT_LOAN_SCENARIOS.length, 3);
    const ids = DEFAULT_LOAN_SCENARIOS.map(s => s.id);
    assert.deepEqual(ids, ['scenario-5yr', 'scenario-7yr', 'scenario-3yr']);

    const scenario5yr = DEFAULT_LOAN_SCENARIOS.find(s => s.id === 'scenario-5yr')!;
    assert.equal(scenario5yr.loanYears, 5);
    assert.equal(scenario5yr.interestRate, '9');

    const scenario7yr = DEFAULT_LOAN_SCENARIOS.find(s => s.id === 'scenario-7yr')!;
    assert.equal(scenario7yr.loanYears, 7);
    assert.equal(scenario7yr.interestRate, '9.5');
  });

  it('correctly calculates EMI and interest comparison across 5-year vs 7-year loan scenarios', () => {
    const sc5 = calculateScenarioLoan(DEFAULT_LOAN_SCENARIOS[0]);
    const sc7 = calculateScenarioLoan(DEFAULT_LOAN_SCENARIOS[1]);

    // Principal for ₹12L car with 20% down is ₹9.6L
    assert.equal(sc5.principal, 960000);
    assert.equal(sc7.principal, 960000);

    // 5-year loan EMI is higher than 7-year loan EMI
    assert.ok(sc5.emi > sc7.emi, `Expected 5-year EMI (${sc5.emi}) > 7-year EMI (${sc7.emi})`);

    // But 7-year total interest is substantially higher than 5-year total interest
    assert.ok(
      sc7.totalInterest > sc5.totalInterest,
      `Expected 7-year total interest (${sc7.totalInterest}) > 5-year total interest (${sc5.totalInterest})`
    );

    // Verify concrete calculations:
    // 5yr: 960,000 @ 9% for 60 mos => EMI approx ₹19,928
    assert.ok(Math.abs(sc5.emi - 19928) <= 2, `5yr emi was ${sc5.emi}`);
    // 7yr: 960,000 @ 9.5% for 84 mos => EMI approx ₹15,690
    assert.ok(Math.abs(sc7.emi - 15690) <= 2, `7yr emi was ${sc7.emi}`);

    // Total interest difference
    const extraInterestIn7Yr = sc7.totalInterest - sc5.totalInterest;
    assert.ok(extraInterestIn7Yr > 120000, `Extra interest paid for 7yr term should be > 1.2L`);
  });

  it('allows adding a custom loan scenario and calculating its parameters', () => {
    const customScenario: SavedLoanScenario = {
      id: 'scenario-custom-zero-interest',
      name: 'Promotional 0% 2-Year Scheme',
      price: '1000000',
      downPayment: '500000',
      isDownPaymentPercent: false,
      interestRate: '0',
      loanYears: 2,
    };

    const result = calculateScenarioLoan(customScenario);
    assert.equal(result.principal, 500000);
    assert.equal(result.totalMonths, 24);
    assert.equal(result.emi, Math.round(500000 / 24));
    assert.equal(result.totalInterest, 0);
  });

  it('detects when active loan values diverge from a saved scenario', () => {
    const activeScenario = DEFAULT_LOAN_SCENARIOS[0]; // 5-yr, 9%
    const currentValues = {
      price: '1200000',
      downPayment: '20',
      isDownPaymentPercent: true,
      interestRate: '9.25', // changed rate
      loanYears: 5,
    };

    const isModified =
      currentValues.price !== activeScenario.price ||
      currentValues.downPayment !== activeScenario.downPayment ||
      currentValues.isDownPaymentPercent !== activeScenario.isDownPaymentPercent ||
      currentValues.interestRate !== activeScenario.interestRate ||
      currentValues.loanYears !== activeScenario.loanYears;

    assert.equal(isModified, true);
  });
});
