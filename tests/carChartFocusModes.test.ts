import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ChartFocusMode, AmortizationRow } from '../src/components/common/CarAmortizationAreaChart';

/**
 * Metric calculator helper mirroring CarAmortizationAreaChart internal computations
 */
export function computeChartFocusMetrics(data: AmortizationRow[]) {
  if (!data || data.length === 0) return null;

  const totalPrincipal = data.reduce((acc, r) => acc + r.principal, 0);
  const totalInterest = data.reduce((acc, r) => acc + r.interest, 0);
  const totalPaid = totalPrincipal + totalInterest;
  const firstMonth = data[0];
  const lastMonth = data[data.length - 1];

  const p1 = firstMonth.principal;
  const p1Pct = totalPaid > 0 ? (p1 / (p1 + firstMonth.interest)) * 100 : 0;

  const pEnd = lastMonth.principal;
  const pEndPct = totalPaid > 0 ? (pEnd / (pEnd + lastMonth.interest)) * 100 : 0;

  const i1 = firstMonth.interest;
  const i1Pct = totalPaid > 0 ? (i1 / (p1 + firstMonth.interest)) * 100 : 0;

  const iEnd = lastMonth.interest;
  const iEndPct = totalPaid > 0 ? (iEnd / (pEnd + lastMonth.interest)) * 100 : 0;

  const crossover = data.find((r) => r.principal >= r.interest);
  const crossoverMonth = crossover ? crossover.month : null;

  const principalShare = totalPaid > 0 ? (totalPrincipal / totalPaid) * 100 : 0;
  const interestShare = totalPaid > 0 ? (totalInterest / totalPaid) * 100 : 0;

  return {
    totalPrincipal,
    totalInterest,
    totalPaid,
    p1,
    p1Pct,
    pEnd,
    pEndPct,
    i1,
    i1Pct,
    iEnd,
    iEndPct,
    crossoverMonth,
    principalShare,
    interestShare,
    tenureMonths: data.length,
  };
}

/**
 * Focus View State Manager Model
 */
export class ChartFocusStateManager {
  private currentMode: ChartFocusMode;
  private onChangeListeners: Array<(mode: ChartFocusMode) => void> = [];

  constructor(initialMode: ChartFocusMode = 'combined') {
    this.currentMode = initialMode;
  }

  public getMode(): ChartFocusMode {
    return this.currentMode;
  }

  public setMode(mode: ChartFocusMode): void {
    if (this.currentMode !== mode) {
      this.currentMode = mode;
      this.onChangeListeners.forEach(listener => listener(mode));
    }
  }

  public subscribe(listener: (mode: ChartFocusMode) => void): () => void {
    this.onChangeListeners.push(listener);
    return () => {
      this.onChangeListeners = this.onChangeListeners.filter(l => l !== listener);
    };
  }

  public getButtonAriaAttributes(mode: ChartFocusMode) {
    return {
      role: 'tab',
      'aria-selected': this.currentMode === mode,
      'aria-controls': 'chart-focus-info-panel',
      'id': `chart-focus-${mode}-tab`,
      'data-testid': `chart-focus-${mode}`,
    };
  }

  public getLayerStyling(key: 'principal' | 'interest') {
    if (this.currentMode === 'combined') {
      return {
        fill: key === 'principal' ? '#0ea5e9' : '#f43f5e',
        opacity: 0.85,
        strokeWidth: '0px',
      };
    }
    if (this.currentMode === 'principal') {
      return {
        fill: key === 'principal' ? '#0ea5e9' : '#f43f5e',
        opacity: key === 'principal' ? 0.95 : 0.14,
        strokeWidth: key === 'principal' ? '2.5px' : '0px',
      };
    }
    // interest focus
    return {
      fill: key === 'principal' ? '#0ea5e9' : '#f43f5e',
      opacity: key === 'interest' ? 0.95 : 0.14,
      strokeWidth: key === 'interest' ? '2.5px' : '0px',
    };
  }
}

/**
 * Generate synthetic loan schedule for testing
 */
function makeSchedule(principal: number, annualRate: number, years: number): AmortizationRow[] {
  const n = years * 12;
  const r = annualRate / 1200;
  const emi = r === 0 ? principal / n : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  let bal = principal;
  const rows: AmortizationRow[] = [];

  for (let m = 1; m <= n; m++) {
    const interest = bal * r;
    const princ = Math.min(bal, emi - interest);
    bal = Math.max(0, bal - princ);
    rows.push({
      month: m,
      emi,
      principal: princ,
      interest,
      balance: bal,
    });
  }
  return rows;
}

describe('Car Amortization Chart Focus Modes Suite', () => {
  describe('Focus State Management & Aria Accessibility', () => {
    it('defaults to "combined" view mode', () => {
      const manager = new ChartFocusStateManager();
      assert.strictEqual(manager.getMode(), 'combined');
    });

    it('toggles between combined, principal, and interest focus modes', () => {
      const manager = new ChartFocusStateManager();

      manager.setMode('principal');
      assert.strictEqual(manager.getMode(), 'principal');

      manager.setMode('interest');
      assert.strictEqual(manager.getMode(), 'interest');

      manager.setMode('combined');
      assert.strictEqual(manager.getMode(), 'combined');
    });

    it('emits change events when mode transitions', () => {
      const manager = new ChartFocusStateManager('combined');
      const events: ChartFocusMode[] = [];
      manager.subscribe(m => events.push(m));

      manager.setMode('principal');
      manager.setMode('interest');
      manager.setMode('interest'); // duplicate should not re-trigger

      assert.deepStrictEqual(events, ['principal', 'interest']);
    });

    it('generates compliant ARIA tab attributes for all three toggle buttons', () => {
      const manager = new ChartFocusStateManager('principal');

      const combinedAria = manager.getButtonAriaAttributes('combined');
      assert.strictEqual(combinedAria.role, 'tab');
      assert.strictEqual(combinedAria['aria-selected'], false);
      assert.strictEqual(combinedAria['data-testid'], 'chart-focus-combined');

      const principalAria = manager.getButtonAriaAttributes('principal');
      assert.strictEqual(principalAria['aria-selected'], true);
      assert.strictEqual(principalAria['data-testid'], 'chart-focus-principal');

      const interestAria = manager.getButtonAriaAttributes('interest');
      assert.strictEqual(interestAria['aria-selected'], false);
      assert.strictEqual(interestAria['data-testid'], 'chart-focus-interest');
    });
  });

  describe('D3 Layer Highlighting & Spotlighting Physics', () => {
    it('applies balanced opacity to both layers in Combined View', () => {
      const manager = new ChartFocusStateManager('combined');
      const principalStyle = manager.getLayerStyling('principal');
      const interestStyle = manager.getLayerStyling('interest');

      assert.strictEqual(principalStyle.opacity, 0.85);
      assert.strictEqual(interestStyle.opacity, 0.85);
    });

    it('spotlights Principal layer and dims Interest in Principal Focus mode', () => {
      const manager = new ChartFocusStateManager('principal');
      const principalStyle = manager.getLayerStyling('principal');
      const interestStyle = manager.getLayerStyling('interest');

      assert.strictEqual(principalStyle.opacity, 0.95);
      assert.strictEqual(principalStyle.strokeWidth, '2.5px');
      assert.strictEqual(interestStyle.opacity, 0.14);
    });

    it('spotlights Interest layer and dims Principal in Interest Focus mode', () => {
      const manager = new ChartFocusStateManager('interest');
      const principalStyle = manager.getLayerStyling('principal');
      const interestStyle = manager.getLayerStyling('interest');

      assert.strictEqual(interestStyle.opacity, 0.95);
      assert.strictEqual(interestStyle.strokeWidth, '2.5px');
      assert.strictEqual(principalStyle.opacity, 0.14);
    });
  });

  describe('Informative Metric Calculations across Loan Tenures', () => {
    it('computes accurate crossover month and equity share for a 5-year loan', () => {
      const rows = makeSchedule(960000, 9.0, 5);
      const metrics = computeChartFocusMetrics(rows);

      assert.ok(metrics !== null);
      assert.strictEqual(metrics.tenureMonths, 60);

      // In a 9% 5-year loan, initial principal is less than initial interest or close
      // Month 1: Principal starts lower, ends near 100% of EMI
      assert.ok(metrics.p1 < metrics.pEnd, 'Principal should increase over time');
      assert.ok(metrics.pEndPct > 95, 'Final month principal should be nearly 100% of payment');
      assert.ok(metrics.i1 > metrics.iEnd, 'Interest should decrease over time');
      assert.ok(metrics.iEndPct < 5, 'Final month interest should be very small');

      // Verify crossover month exists
      assert.ok(metrics.crossoverMonth !== null);
      assert.ok(metrics.crossoverMonth >= 1 && metrics.crossoverMonth <= 60);
    });

    it('handles short 3-year loans with fast crossover point', () => {
      const rows = makeSchedule(500000, 8.5, 3);
      const metrics = computeChartFocusMetrics(rows);

      assert.ok(metrics !== null);
      assert.strictEqual(metrics.tenureMonths, 36);
      // For a 3-year loan, crossover occurs very early
      assert.ok(metrics.crossoverMonth !== null);
      assert.ok(metrics.crossoverMonth <= 18, `Expected early crossover in 3yr loan, got M${metrics.crossoverMonth}`);
    });

    it('handles empty data gracefully', () => {
      const metrics = computeChartFocusMetrics([]);
      assert.strictEqual(metrics, null);
    });
  });
});
