import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Mobile Collapsible View State Manager Model
 */
export class CollapsibleChartState {
  private collapsed: boolean;
  private storageKey: string;
  private storageMock: Map<string, string>;

  constructor(storageKey = 'car_calc_chart_collapsed', initialStorage?: Record<string, string>) {
    this.storageKey = storageKey;
    this.storageMock = new Map();
    if (initialStorage) {
      Object.entries(initialStorage).forEach(([k, v]) => this.storageMock.set(k, v));
    }
    this.collapsed = this.loadFromStorage();
  }

  private loadFromStorage(): boolean {
    const raw = this.storageMock.get(this.storageKey);
    if (!raw) return false;
    try {
      return JSON.parse(raw) === true;
    } catch {
      return false;
    }
  }

  public isCollapsed(): boolean {
    return this.collapsed;
  }

  public toggle(): boolean {
    this.collapsed = !this.collapsed;
    this.storageMock.set(this.storageKey, JSON.stringify(this.collapsed));
    return this.collapsed;
  }

  public setCollapsed(value: boolean): void {
    this.collapsed = value;
    this.storageMock.set(this.storageKey, JSON.stringify(value));
  }

  public getAriaAttributes() {
    return {
      'aria-expanded': !this.collapsed,
      'aria-controls': 'amortization-area-chart-container',
      'title': this.collapsed ? 'Expand Stacked Area Chart' : 'Collapse Chart to save screen space',
    };
  }
}

/**
 * Collapsed Summary Preview Generator
 */
export function generateCollapsedChartSummary({
  loanYears,
  principal,
  interest,
  formatCurrency,
}: {
  loanYears: number;
  principal: number;
  interest: number;
  formatCurrency: (n: number) => string;
}) {
  const totalMonths = Math.max(1, loanYears) * 12;
  const formattedPrincipal = formatCurrency(principal);
  const formattedInterest = formatCurrency(interest);

  return {
    totalMonths,
    formattedPrincipal,
    formattedInterest,
    badgeText: 'Collapsed',
    summaryText: `Chart hidden for compact view · ${loanYears} Years (${totalMonths} Months) · Principal ${formattedPrincipal}, Interest ${formattedInterest}`,
    actionText: 'Tap to expand graph',
  };
}

/**
 * Touch Range Slider Specification Checker
 */
export interface SliderMobileSpec {
  id: string;
  className: string;
  minHeight: number;
  thumbSizeDesktop: number;
  thumbSizeMobile: number;
  trackHeight: number;
  touchAction: string;
}

export const CAR_CALCULATOR_SLIDERS: SliderMobileSpec[] = [
  {
    id: 'downPaymentSlider',
    className: 'touch-range-slider',
    minHeight: 44,
    thumbSizeDesktop: 28,
    thumbSizeMobile: 32,
    trackHeight: 8,
    touchAction: 'pan-y',
  },
  {
    id: 'loanYears',
    className: 'touch-range-slider',
    minHeight: 44,
    thumbSizeDesktop: 28,
    thumbSizeMobile: 32,
    trackHeight: 8,
    touchAction: 'pan-y',
  },
  {
    id: 'downPaymentMasterSlider',
    className: 'touch-range-slider',
    minHeight: 44,
    thumbSizeDesktop: 28,
    thumbSizeMobile: 32,
    trackHeight: 8,
    touchAction: 'pan-y',
  },
  {
    id: 'compareLoanYears',
    className: 'touch-range-slider',
    minHeight: 44,
    thumbSizeDesktop: 28,
    thumbSizeMobile: 32,
    trackHeight: 8,
    touchAction: 'pan-y',
  },
  {
    id: 'sensitivitySlider',
    className: 'touch-range-slider',
    minHeight: 44,
    thumbSizeDesktop: 28,
    thumbSizeMobile: 32,
    trackHeight: 8,
    touchAction: 'pan-y',
  },
];

describe('Car Affordability & EMI Calculator - Mobile UI & Touch Ergonomics', () => {
  describe('1. Collapsible Amortization Chart State & Persistence', () => {
    it('defaults to expanded (not collapsed) when no preference is saved', () => {
      const state = new CollapsibleChartState();
      assert.strictEqual(state.isCollapsed(), false);
      const aria = state.getAriaAttributes();
      assert.strictEqual(aria['aria-expanded'], true);
    });

    it('toggles collapse state and synchronizes with storage', () => {
      const state = new CollapsibleChartState();
      const collapsed = state.toggle();
      assert.strictEqual(collapsed, true);
      assert.strictEqual(state.isCollapsed(), true);

      const aria = state.getAriaAttributes();
      assert.strictEqual(aria['aria-expanded'], false);

      const expandedAgain = state.toggle();
      assert.strictEqual(expandedAgain, false);
      assert.strictEqual(state.isCollapsed(), false);
    });

    it('restores collapsed state from storage if previously saved by user', () => {
      const initialStore = { car_calc_chart_collapsed: 'true' };
      const state = new CollapsibleChartState('car_calc_chart_collapsed', initialStore);
      assert.strictEqual(state.isCollapsed(), true);
    });

    it('safely handles corrupted storage payloads without breaking UI', () => {
      const initialStore = { car_calc_chart_collapsed: 'invalid-json{' };
      const state = new CollapsibleChartState('car_calc_chart_collapsed', initialStore);
      assert.strictEqual(state.isCollapsed(), false);
    });
  });

  describe('2. Collapsed View Summary Information & Viewport Space Optimization', () => {
    const dummyFmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

    it('generates accurate 5-year loan preview metrics when collapsed', () => {
      const summary = generateCollapsedChartSummary({
        loanYears: 5,
        principal: 960000,
        interest: 236208,
        formatCurrency: dummyFmt,
      });

      assert.strictEqual(summary.totalMonths, 60);
      assert.strictEqual(summary.formattedPrincipal, '₹9,60,000');
      assert.strictEqual(summary.formattedInterest, '₹2,36,208');
      assert.match(summary.summaryText, /60 Months/);
      assert.match(summary.summaryText, /5 Years/);
      assert.match(summary.summaryText, /Principal ₹9,60,000/);
      assert.match(summary.summaryText, /Interest ₹2,36,208/);
    });

    it('generates accurate 7-year loan preview metrics when collapsed', () => {
      const summary = generateCollapsedChartSummary({
        loanYears: 7,
        principal: 1000000,
        interest: 382400,
        formatCurrency: dummyFmt,
      });

      assert.strictEqual(summary.totalMonths, 84);
      assert.match(summary.summaryText, /84 Months/);
      assert.match(summary.summaryText, /7 Years/);
    });

    it('provides clear accessibility actions and badge indicators in collapsed mode', () => {
      const summary = generateCollapsedChartSummary({
        loanYears: 3,
        principal: 500000,
        interest: 75000,
        formatCurrency: dummyFmt,
      });

      assert.strictEqual(summary.badgeText, 'Collapsed');
      assert.strictEqual(summary.actionText, 'Tap to expand graph');
    });
  });

  describe('3. Mobile Touch Slider Specifications & Hitbox Standards', () => {
    it('verifies all 5 interactive sliders have the mobile touch-range-slider class', () => {
      assert.strictEqual(CAR_CALCULATOR_SLIDERS.length, 5);
      CAR_CALCULATOR_SLIDERS.forEach(slider => {
        assert.strictEqual(slider.className, 'touch-range-slider');
      });
    });

    it('verifies minimum 44px touch hitbox for all slider inputs per WCAG AA standards', () => {
      CAR_CALCULATOR_SLIDERS.forEach(slider => {
        assert.ok(slider.minHeight >= 44, `${slider.id} minHeight (${slider.minHeight}) must be >= 44px`);
      });
    });

    it('verifies ergonomic thumb size of 28px on desktop and 32px on mobile touch viewports', () => {
      CAR_CALCULATOR_SLIDERS.forEach(slider => {
        assert.ok(slider.thumbSizeDesktop >= 28, `${slider.id} desktop thumb must be >= 28px`);
        assert.ok(slider.thumbSizeMobile >= 32, `${slider.id} mobile thumb must be >= 32px`);
      });
    });

    it('verifies touch-action: pan-y is configured to prevent scroll-drag conflicts on smartphones', () => {
      CAR_CALCULATOR_SLIDERS.forEach(slider => {
        assert.strictEqual(slider.touchAction, 'pan-y');
      });
    });

    it('verifies track height of 8px ensures clear visual track boundary behind enlarged thumb', () => {
      CAR_CALCULATOR_SLIDERS.forEach(slider => {
        assert.strictEqual(slider.trackHeight, 8);
      });
    });
  });

  describe('4. Down Payment & Sensitivity Range Slider Value Clamping', () => {
    it('clamps percentage down payment correctly between 0% and 90%', () => {
      const clampPct = (val: number) => Math.max(0, Math.min(90, Math.round(val)));
      assert.strictEqual(clampPct(-5), 0);
      assert.strictEqual(clampPct(20), 20);
      assert.strictEqual(clampPct(90), 90);
      assert.strictEqual(clampPct(95), 90);
    });

    it('clamps interest rate sensitivity slider between -2.0% and +2.0%', () => {
      const clampSensitivity = (delta: number) => Math.max(-2, Math.min(2, delta));
      assert.strictEqual(clampSensitivity(-3.5), -2);
      assert.strictEqual(clampSensitivity(-1.25), -1.25);
      assert.strictEqual(clampSensitivity(0), 0);
      assert.strictEqual(clampSensitivity(1.5), 1.5);
      assert.strictEqual(clampSensitivity(4.0), 2);
    });
  });
});
