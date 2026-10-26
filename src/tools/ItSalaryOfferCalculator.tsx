import React, { useState, useEffect, useMemo } from 'react';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import {
  TrendingUp,
  Scale,
  CalendarClock,
  BookmarkCheck,
  RotateCcw,
  Copy,
  Check,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  Info,
  DollarSign,
  ArrowRight,
  Sparkles,
  HelpCircle,
  FileText,
  AlertTriangle,
  Building,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export type CalculatorMode = 'hike' | 'compare' | 'buyout' | 'saved';

export interface CurrencyConfig {
  id: string;
  label: string;
  symbol: string;
  locale: string;
}

export const CURRENCIES: CurrencyConfig[] = [
  { id: 'inr', label: '₹ INR (India)', symbol: '₹', locale: 'en-IN' },
  { id: 'usd', label: '$ USD (United States)', symbol: '$', locale: 'en-US' },
  { id: 'gbp', label: '£ GBP (United Kingdom)', symbol: '£', locale: 'en-GB' },
  { id: 'eur', label: '€ EUR (Europe)', symbol: '€', locale: 'de-DE' },
];

export interface HikeInputs {
  currentSalary: string;
  newOffer: string;
  hikePct: string;
  effectiveTaxPct: string;
}

export interface OfferDetails {
  name: string;
  fixed: string;
  varPct: string;
  payout: string;
  bonus: string;
  other: string;
  tax: string;
  pf: string;
}

export interface BuyoutInputs {
  monthlyGross: string;
  noticeDays: string;
}

export interface SavedScenario {
  id: string;
  title: string;
  timestamp: string;
  currencyId: string;
  offerA: OfferDetails;
  offerB: OfferDetails;
}

const parseNum = (x: string | number | undefined | null): number | null => {
  if (x === undefined || x === null || x === '') return null;
  const n = parseFloat(String(x).replace(/,/g, '').trim());
  return isFinite(n) ? n : null;
};

const DEFAULT_HIKE_INPUTS: HikeInputs = {
  currentSalary: '1200000',
  newOffer: '1600000',
  hikePct: '',
  effectiveTaxPct: '15',
};

const DEFAULT_OFFER_A: OfferDetails = {
  name: 'Current / Offer A',
  fixed: '1200000',
  varPct: '10',
  payout: '100',
  bonus: '0',
  other: '50000',
  tax: '15',
  pf: '3600',
};

const DEFAULT_OFFER_B: OfferDetails = {
  name: 'New Offer B',
  fixed: '1500000',
  varPct: '15',
  payout: '80',
  bonus: '100000',
  other: '60000',
  tax: '18',
  pf: '4500',
};

const DEFAULT_BUYOUT_INPUTS: BuyoutInputs = {
  monthlyGross: '100000',
  noticeDays: '60',
};

export const ItSalaryOfferCalculator: React.FC = () => {
  // Persistence state
  const [activeTab, setActiveTab] = useState<CalculatorMode>(() => {
    try {
      const saved = localStorage.getItem('ipp_salary_mode');
      return (saved as CalculatorMode) || 'hike';
    } catch {
      return 'hike';
    }
  });

  const [currencyId, setCurrencyId] = useState<string>(() => {
    try {
      return localStorage.getItem('ipp_salary_currency') || 'inr';
    } catch {
      return 'inr';
    }
  });

  const [hikeInputs, setHikeInputs] = useState<HikeInputs>(() => {
    try {
      const saved = localStorage.getItem('ipp_salary_hike_inputs');
      return saved ? JSON.parse(saved) : DEFAULT_HIKE_INPUTS;
    } catch {
      return DEFAULT_HIKE_INPUTS;
    }
  });

  const [offerA, setOfferA] = useState<OfferDetails>(() => {
    try {
      const saved = localStorage.getItem('ipp_salary_offer_a');
      return saved ? JSON.parse(saved) : DEFAULT_OFFER_A;
    } catch {
      return DEFAULT_OFFER_A;
    }
  });

  const [offerB, setOfferB] = useState<OfferDetails>(() => {
    try {
      const saved = localStorage.getItem('ipp_salary_offer_b');
      return saved ? JSON.parse(saved) : DEFAULT_OFFER_B;
    } catch {
      return DEFAULT_OFFER_B;
    }
  });

  const [buyoutInputs, setBuyoutInputs] = useState<BuyoutInputs>(() => {
    try {
      const saved = localStorage.getItem('ipp_salary_buyout_inputs');
      return saved ? JSON.parse(saved) : DEFAULT_BUYOUT_INPUTS;
    } catch {
      return DEFAULT_BUYOUT_INPUTS;
    }
  });

  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>(() => {
    try {
      const saved = localStorage.getItem('ipp_salary_saved_comparisons');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [scenarioTitleInput, setScenarioTitleInput] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('ipp_salary_mode', activeTab);
    } catch {}
  }, [activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem('ipp_salary_currency', currencyId);
    } catch {}
  }, [currencyId]);

  useEffect(() => {
    try {
      localStorage.setItem('ipp_salary_hike_inputs', JSON.stringify(hikeInputs));
    } catch {}
  }, [hikeInputs]);

  useEffect(() => {
    try {
      localStorage.setItem('ipp_salary_offer_a', JSON.stringify(offerA));
    } catch {}
  }, [offerA]);

  useEffect(() => {
    try {
      localStorage.setItem('ipp_salary_offer_b', JSON.stringify(offerB));
    } catch {}
  }, [offerB]);

  useEffect(() => {
    try {
      localStorage.setItem('ipp_salary_buyout_inputs', JSON.stringify(buyoutInputs));
    } catch {}
  }, [buyoutInputs]);

  useEffect(() => {
    try {
      localStorage.setItem('ipp_salary_saved_comparisons', JSON.stringify(savedScenarios));
    } catch {}
  }, [savedScenarios]);

  const currentCurrency = useMemo(() => {
    return CURRENCIES.find(c => c.id === currencyId) || CURRENCIES[0];
  }, [currencyId]);

  const formatMoney = (val: number | null | undefined): string => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    const rounded = Math.round(val);
    return `${currentCurrency.symbol}${rounded.toLocaleString(currentCurrency.locale)}`;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const copyToClipboard = async (text: string, key = 'generic') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      showToast('Copied to clipboard!');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      showToast('Could not copy to clipboard');
    }
  };

  // --- HIKE CALCULATIONS ---
  const hikeCalculations = useMemo(() => {
    const cur = parseNum(hikeInputs.currentSalary);
    let nw = parseNum(hikeInputs.newOffer);
    const pctInput = parseNum(hikeInputs.hikePct);
    const taxRate = parseNum(hikeInputs.effectiveTaxPct) || 0;

    if (cur === null || cur <= 0) {
      return { valid: false, error: 'Enter your current annual salary / CTC.' };
    }

    if (nw === null && pctInput !== null) {
      nw = cur * (1 + pctInput / 100);
    }

    if (nw === null) {
      return { valid: false, error: 'Enter a new annual offer or specify a hike %.' };
    }

    const diff = nw - cur;
    const pct = (diff / cur) * 100;
    const monthlyGrossIncrease = diff / 12;
    const monthlyNetIncrease = (diff * (1 - taxRate / 100)) / 12;
    const annualNetIncrease = diff * (1 - taxRate / 100);

    return {
      valid: true,
      current: cur,
      newOffer: nw,
      diff,
      pct,
      monthlyGrossIncrease,
      monthlyNetIncrease,
      annualNetIncrease,
      taxRate,
    };
  }, [hikeInputs]);

  // --- OFFER COMPARISON CALCULATIONS ---
  const calculateSingleOffer = (o: OfferDetails) => {
    const fixed = parseNum(o.fixed) || 0;
    const varPct = parseNum(o.varPct) || 0;
    const payoutPct = o.payout === '' ? 100 : parseNum(o.payout) ?? 100;
    const bonus = parseNum(o.bonus) || 0;
    const other = parseNum(o.other) || 0;
    const tax = parseNum(o.tax) || 0;
    const pf = parseNum(o.pf) || 0;

    const varTarget = (fixed * varPct) / 100;
    const varExpected = (varTarget * payoutPct) / 100;
    const headlineCtc = fixed + varTarget + bonus + other;
    const totalExpectedCtc = fixed + varExpected + bonus + other;
    const monthlyGrossFixed = fixed / 12;
    const monthlyInHandFixed = (monthlyGrossFixed * (1 - tax / 100)) - pf;
    const annualNetAfterTax = (totalExpectedCtc * (1 - tax / 100)) - (pf * 12);

    return {
      fixed,
      varPct,
      payoutPct,
      varTarget,
      varExpected,
      bonus,
      other,
      tax,
      pf,
      headlineCtc,
      totalExpectedCtc,
      monthlyGrossFixed,
      monthlyInHandFixed,
      annualNetAfterTax,
    };
  };

  const comparisonResult = useMemo(() => {
    const a = calculateSingleOffer(offerA);
    const b = calculateSingleOffer(offerB);

    const hasBoth = a.fixed > 0 && b.fixed > 0;
    const netDiff = b.annualNetAfterTax - a.annualNetAfterTax;
    const inHandDiff = b.monthlyInHandFixed - a.monthlyInHandFixed;
    const totalExpectedDiff = b.totalExpectedCtc - a.totalExpectedCtc;

    return {
      hasBoth,
      a,
      b,
      netDiff,
      inHandDiff,
      totalExpectedDiff,
      bBetterNet: netDiff > 0,
      bBetterInHand: inHandDiff > 0,
    };
  }, [offerA, offerB]);

  // Chart data for comparing Offer A vs B
  const comparisonChartData = useMemo(() => {
    if (!comparisonResult.hasBoth) return [];
    return [
      {
        metric: 'Fixed Pay (Base)',
        [offerA.name || 'Offer A']: Math.round(comparisonResult.a.fixed),
        [offerB.name || 'Offer B']: Math.round(comparisonResult.b.fixed),
      },
      {
        metric: 'Expected Variable',
        [offerA.name || 'Offer A']: Math.round(comparisonResult.a.varExpected),
        [offerB.name || 'Offer B']: Math.round(comparisonResult.b.varExpected),
      },
      {
        metric: 'Annual Net In-Hand',
        [offerA.name || 'Offer A']: Math.round(comparisonResult.a.annualNetAfterTax),
        [offerB.name || 'Offer B']: Math.round(comparisonResult.b.annualNetAfterTax),
      },
    ];
  }, [comparisonResult, offerA.name, offerB.name]);

  // --- NOTICE PERIOD BUYOUT CALCULATIONS ---
  const buyoutCalculations = useMemo(() => {
    const monthly = parseNum(buyoutInputs.monthlyGross);
    const days = parseNum(buyoutInputs.noticeDays);

    if (monthly === null || days === null || monthly <= 0 || days <= 0) {
      return { valid: false, error: 'Enter monthly salary and number of notice days to buy out.' };
    }

    const perDayGross = monthly / 30;
    const buyoutTotal = perDayGross * days;

    return {
      valid: true,
      monthly,
      days,
      perDayGross,
      buyoutTotal,
    };
  }, [buyoutInputs]);

  // Saved scenarios actions
  const handleSaveScenario = () => {
    const title = scenarioTitleInput.trim() || `${offerA.name || 'Offer A'} vs ${offerB.name || 'Offer B'}`;
    const newScenario: SavedScenario = {
      id: 'sc_' + Date.now(),
      title,
      timestamp: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      currencyId,
      offerA: { ...offerA },
      offerB: { ...offerB },
    };

    setSavedScenarios(prev => [newScenario, ...prev]);
    setScenarioTitleInput('');
    showToast(`Saved comparison "${title}"!`);
  };

  const handleLoadScenario = (sc: SavedScenario) => {
    setOfferA(sc.offerA);
    setOfferB(sc.offerB);
    setCurrencyId(sc.currencyId);
    setActiveTab('compare');
    showToast(`Loaded scenario: "${sc.title}"`);
  };

  const handleDeleteScenario = (id: string) => {
    setSavedScenarios(prev => prev.filter(s => s.id !== id));
    showToast('Deleted saved scenario');
  };

  // Reset helpers
  const handleResetCurrentTab = () => {
    if (activeTab === 'hike') {
      setHikeInputs(DEFAULT_HIKE_INPUTS);
      showToast('Reset hike calculator inputs');
    } else if (activeTab === 'compare') {
      setOfferA(DEFAULT_OFFER_A);
      setOfferB(DEFAULT_OFFER_B);
      showToast('Reset offer comparison inputs');
    } else if (activeTab === 'buyout') {
      setBuyoutInputs(DEFAULT_BUYOUT_INPUTS);
      showToast('Reset buyout inputs');
    }
  };

  // Quick preset handlers
  const applyHikePreset = (pct: number) => {
    const cur = parseNum(hikeInputs.currentSalary) || 1200000;
    const calculatedNew = cur * (1 + pct / 100);
    setHikeInputs(prev => ({
      ...prev,
      hikePct: String(pct),
      newOffer: String(Math.round(calculatedNew)),
    }));
  };

  const copyComparisonSummary = () => {
    if (!comparisonResult.hasBoth) {
      showToast('Enter fixed pay for both offers first');
      return;
    }
    const text = `IT Job Offer Comparison (${currentCurrency.symbol}):
-----------------------------------------------
1. ${offerA.name || 'Offer A'}:
   - Fixed Pay: ${formatMoney(comparisonResult.a.fixed)}
   - Variable Expected: ${formatMoney(comparisonResult.a.varExpected)} (${offerA.varPct}% target @ ${offerA.payout}%)
   - Joining Bonus: ${formatMoney(comparisonResult.a.bonus)}
   - Other Benefits: ${formatMoney(comparisonResult.a.other)}
   - Total Expected CTC: ${formatMoney(comparisonResult.a.totalExpectedCtc)}
   - Est. Monthly In-Hand (Fixed Net): ${formatMoney(comparisonResult.a.monthlyInHandFixed)}
   - Est. Annual Net After Tax: ${formatMoney(comparisonResult.a.annualNetAfterTax)}

2. ${offerB.name || 'Offer B'}:
   - Fixed Pay: ${formatMoney(comparisonResult.b.fixed)}
   - Variable Expected: ${formatMoney(comparisonResult.b.varExpected)} (${offerB.varPct}% target @ ${offerB.payout}%)
   - Joining Bonus: ${formatMoney(comparisonResult.b.bonus)}
   - Other Benefits: ${formatMoney(comparisonResult.b.other)}
   - Total Expected CTC: ${formatMoney(comparisonResult.b.totalExpectedCtc)}
   - Est. Monthly In-Hand (Fixed Net): ${formatMoney(comparisonResult.b.monthlyInHandFixed)}
   - Est. Annual Net After Tax: ${formatMoney(comparisonResult.b.annualNetAfterTax)}

Verdict:
${comparisonResult.bBetterNet
  ? `Offer B provides ${formatMoney(Math.abs(comparisonResult.netDiff))} more annual net income.`
  : `Offer A provides ${formatMoney(Math.abs(comparisonResult.netDiff))} more annual net income.`}
-----------------------------------------------
Generated on Jawed.co.in Tools`;

    copyToClipboard(text, 'cmp-summary');
  };

  // FAQ items matching and expanding user attachments
  const FAQ_ITEMS = [
    {
      q: 'Does this send my salary or offer numbers anywhere?',
      a: 'No. All calculations run strictly client-side inside your browser engine. Nothing is uploaded, tracked, or sent to external servers or cloud databases. Your inputs stay completely private.',
    },
    {
      q: 'What is a realistic hike when changing IT jobs in India or globally?',
      a: 'In normal market conditions, standard external switches range between 20% to 40% hike on fixed base. For niche, high-demand skills (cloud architecture, distributed systems, GenAI infra), hikes can reach 50%+. However, be vigilant of "inflated CTCs" where companies artificially boost numbers using non-guaranteed variable bonuses or long vesting stock grants.',
    },
    {
      q: 'Why does the tool ask for my effective tax percentage?',
      a: 'Because real take-home pay depends heavily on individual tax slabs, new vs old tax regimes, standard deductions, HRA exemptions, and section 80C declarations. By entering your actual effective tax percentage (usually 10%–25% for most IT brackets), you get a transparent estimate without arbitrary assumptions.',
    },
    {
      q: 'How does variable pay affect my monthly cash in hand?',
      a: 'Variable pay (performance bonus) is typically disbursed quarterly, bi-annually, or annually, and is subject to company performance multipliers. Many IT firms pay only 70%–85% of target variable in tight years. This calculator allows you to stress-test your offer at different variable payout percentages (e.g. 70% or 80%) to see your true baseline income.',
    },
    {
      q: 'Can my new employer buy out my current notice period?',
      a: 'Yes! If the hiring company needs you immediately (e.g., to join within 15 to 30 days instead of 60 or 90 days), you can request them to compensate the notice shortfall as a "Notice Period Buyout" or a "Joining / Sign-on Bonus". Always request this in writing in your official offer letter.',
    },
  ];

  return (
    <main className="container page" style={{ maxWidth: '1080px', margin: '0 auto' }}>
      {/* Toast popup */}
      {toastMessage && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--text)',
            color: 'var(--bg)',
            padding: '10px 20px',
            borderRadius: '9999px',
            fontSize: '14px',
            fontWeight: 600,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Check size={16} />
          {toastMessage}
        </div>
      )}

      {/* Header and Breadcrumbs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Tools', href: '/tools' },
            { label: 'IT Salary & Offer Calculator' },
          ]}
          style={{ marginBottom: 0 }}
        />
        <SocialShareBar
          title="IT Salary & Offer Calculator | Jawed Imtiaz"
          text="Free browser calculators for IT professionals: salary hike %, job offer comparison with variable pay and bonus, and notice period buyout."
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} style={{ color: 'var(--accent)' }} />
            Free Career Utility · 100% Client-Side
          </p>
          <h1 style={{ marginBottom: '8px', fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)' }}>
            IT Salary &amp; Offer Calculator
          </h1>
          <p className="lead" style={{ maxWidth: '780px', marginBottom: '20px' }}>
            Work out your hike %, realistically compare two job offers with variable pay and joining bonus, and calculate notice-period buyout liabilities. Nothing is uploaded or saved on a server.
          </p>
        </div>

        {/* Currency & Quick Actions Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label htmlFor="currency-select" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Currency:
            </label>
            <select
              id="currency-select"
              value={currencyId}
              onChange={e => setCurrencyId(e.target.value)}
              style={{
                width: 'auto',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              {CURRENCIES.map(curr => (
                <option key={curr.id} value={curr.id}>
                  {curr.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleResetCurrentTab}
            title="Reset current tab inputs"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '12px',
          marginBottom: '24px',
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'hike'}
          onClick={() => setActiveTab('hike')}
          className={`tab-button ${activeTab === 'hike' ? 'active' : ''}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <TrendingUp size={16} />
          Hike Calculator
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'compare'}
          onClick={() => setActiveTab('compare')}
          className={`tab-button ${activeTab === 'compare' ? 'active' : ''}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Scale size={16} />
          Compare Offers (A vs B)
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'buyout'}
          onClick={() => setActiveTab('buyout')}
          className={`tab-button ${activeTab === 'buyout' ? 'active' : ''}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <CalendarClock size={16} />
          Notice Period Buyout
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'saved'}
          onClick={() => setActiveTab('saved')}
          className={`tab-button ${activeTab === 'saved' ? 'active' : ''}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <BookmarkCheck size={16} />
          Saved Scenarios ({savedScenarios.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: HIKE CALCULATOR */}
      {/* ========================================================================= */}
      {activeTab === 'hike' && (
        <section
          aria-label="Salary Hike Calculator"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 6px 0', color: 'var(--text-heading)' }}>
              Calculate Salary Hike &amp; Incremental Gains
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
              Enter your current compensation and your new offer amount, or specify an expected hike percentage to see your new CTC and gross/net breakdown.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <div>
              <label htmlFor="hike-cur" style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                Current annual salary / CTC ({currentCurrency.symbol}) *
              </label>
              <input
                id="hike-cur"
                type="text"
                inputMode="decimal"
                value={hikeInputs.currentSalary}
                onChange={e => {
                  const val = e.target.value;
                  setHikeInputs(prev => ({
                    ...prev,
                    currentSalary: val,
                  }));
                }}
                placeholder="e.g. 1200000"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '15px',
                  fontWeight: 500,
                }}
              />
            </div>

            <div>
              <label htmlFor="hike-new" style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                New annual offer ({currentCurrency.symbol})
              </label>
              <input
                id="hike-new"
                type="text"
                inputMode="decimal"
                value={hikeInputs.newOffer}
                onChange={e => {
                  const val = e.target.value;
                  setHikeInputs(prev => ({
                    ...prev,
                    newOffer: val,
                    hikePct: '', // clear percentage if explicit offer is typed
                  }));
                }}
                placeholder="e.g. 1600000"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '15px',
                  fontWeight: 500,
                }}
              />
            </div>

            <div>
              <label htmlFor="hike-pct" style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                Or: Hike % to apply
              </label>
              <input
                id="hike-pct"
                type="text"
                inputMode="decimal"
                value={hikeInputs.hikePct}
                onChange={e => {
                  const val = e.target.value;
                  const cur = parseNum(hikeInputs.currentSalary);
                  const p = parseNum(val);
                  setHikeInputs(prev => ({
                    ...prev,
                    hikePct: val,
                    newOffer: cur && p !== null ? String(Math.round(cur * (1 + p / 100))) : prev.newOffer,
                  }));
                }}
                placeholder="e.g. 30"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '15px',
                  fontWeight: 500,
                }}
              />
            </div>

            <div>
              <label htmlFor="hike-tax" style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                Effective tax % (optional estimate)
              </label>
              <input
                id="hike-tax"
                type="text"
                inputMode="decimal"
                value={hikeInputs.effectiveTaxPct}
                onChange={e => setHikeInputs(prev => ({ ...prev, effectiveTaxPct: e.target.value }))}
                placeholder="e.g. 15"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '15px',
                  fontWeight: 500,
                }}
              />
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Quick Hike Presets:</span>
            {[15, 20, 25, 30, 40, 50].map(p => (
              <button
                key={p}
                type="button"
                onClick={() => applyHikePreset(p)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                +{p}%
              </button>
            ))}
          </div>

          {/* Result Output Card */}
          {hikeCalculations.valid ? (
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '20px',
                background: 'var(--bg)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Calculated Hike
                  </div>
                  <div
                    style={{
                      fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                      fontWeight: 800,
                      color: hikeCalculations.diff >= 0 ? 'var(--emerald)' : 'var(--rose)',
                      lineHeight: 1.1,
                    }}
                  >
                    {hikeCalculations.diff >= 0 ? '+' : ''}
                    {hikeCalculations.pct.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    From {formatMoney(hikeCalculations.current)} to {formatMoney(hikeCalculations.newOffer)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const txt = `Salary Hike Summary:
Current CTC: ${formatMoney(hikeCalculations.current)}
New Offer: ${formatMoney(hikeCalculations.newOffer)}
Hike: ${hikeCalculations.diff >= 0 ? '+' : ''}${hikeCalculations.pct.toFixed(1)}% (${formatMoney(hikeCalculations.diff)}/year)
Gross Change/Month: ${formatMoney(hikeCalculations.monthlyGrossIncrease)}
Net Change/Month (~${hikeCalculations.taxRate}% tax): ${formatMoney(hikeCalculations.monthlyNetIncrease)}`;
                    copyToClipboard(txt, 'hike-summary');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {copiedKey === 'hike-summary' ? <Check size={14} style={{ color: 'var(--emerald)' }} /> : <Copy size={14} />}
                  Copy Result
                </button>
              </div>

              {/* Breakdown Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  marginTop: '20px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <div style={{ padding: '12px', background: 'var(--surface)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>New Annual CTC</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', marginTop: '2px' }}>
                    {formatMoney(hikeCalculations.newOffer)}
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--surface)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Annual Gross Increase</div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: hikeCalculations.diff >= 0 ? 'var(--emerald)' : 'var(--rose)',
                      marginTop: '2px',
                    }}
                  >
                    {hikeCalculations.diff >= 0 ? '+' : ''}
                    {formatMoney(hikeCalculations.diff)}
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--surface)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Monthly Gross Increase</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', marginTop: '2px' }}>
                    {hikeCalculations.diff >= 0 ? '+' : ''}
                    {formatMoney(hikeCalculations.monthlyGrossIncrease)}
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--surface)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Est. Monthly In-Hand Net ({hikeCalculations.taxRate}% tax)
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', marginTop: '2px' }}>
                    {hikeCalculations.diff >= 0 ? '+' : ''}
                    {formatMoney(hikeCalculations.monthlyNetIncrease)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                border: '1px dashed var(--border)',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '14px',
              }}
            >
              <Info size={20} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.6 }} />
              {hikeCalculations.error}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COMPARE OFFERS (A VS B) */}
      {/* ========================================================================= */}
      {activeTab === 'compare' && (
        <section aria-label="Compare Job Offers">
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', margin: '0 0 6px 0', color: 'var(--text-heading)' }}>
                  Side-by-Side Offer Comparison
                </h2>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
                  A higher headline CTC is often misleading. Variable bonuses are rarely 100% guaranteed. Factor in expected payout ratios, joining bonus, tax slabs, and monthly deductions.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={copyComparisonSummary}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {copiedKey === 'cmp-summary' ? <Check size={14} style={{ color: 'var(--emerald)' }} /> : <Copy size={14} />}
                  Copy Summary
                </button>

                <button
                  type="button"
                  onClick={handleSaveScenario}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '0',
                    background: 'var(--accent)',
                    color: '#0f172a',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <BookmarkCheck size={14} />
                  Save Scenario
                </button>
              </div>
            </div>

            {/* Side-by-side Offer Inputs Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '24px',
              }}
            >
              {/* OFFER A */}
              <div
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: '#0f172a',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                    }}
                  >
                    A
                  </div>
                  <input
                    type="text"
                    value={offerA.name}
                    onChange={e => setOfferA(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Offer A Name / Company"
                    style={{
                      fontWeight: 700,
                      fontSize: '16px',
                      background: 'transparent',
                      border: '0',
                      borderBottom: '1px dashed var(--border)',
                      color: 'var(--text-heading)',
                      padding: '2px 4px',
                      width: '100%',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label htmlFor="a-fixed" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                      Fixed annual pay (Base CTC) ({currentCurrency.symbol}) *
                    </label>
                    <input
                      id="a-fixed"
                      type="text"
                      inputMode="decimal"
                      value={offerA.fixed}
                      onChange={e => setOfferA(prev => ({ ...prev, fixed: e.target.value }))}
                      placeholder="e.g. 1200000"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label htmlFor="a-var" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Variable pay (% of fixed)
                      </label>
                      <input
                        id="a-var"
                        type="text"
                        inputMode="decimal"
                        value={offerA.varPct}
                        onChange={e => setOfferA(prev => ({ ...prev, varPct: e.target.value }))}
                        placeholder="e.g. 10"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div>
                      <label htmlFor="a-payout" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Expected payout (%)
                      </label>
                      <input
                        id="a-payout"
                        type="text"
                        inputMode="decimal"
                        value={offerA.payout}
                        onChange={e => setOfferA(prev => ({ ...prev, payout: e.target.value }))}
                        placeholder="e.g. 100"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="a-bonus" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                      Joining / one-time bonus ({currentCurrency.symbol})
                    </label>
                    <input
                      id="a-bonus"
                      type="text"
                      inputMode="decimal"
                      value={offerA.bonus}
                      onChange={e => setOfferA(prev => ({ ...prev, bonus: e.target.value }))}
                      placeholder="e.g. 0"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div>
                    <label htmlFor="a-other" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                      Other annual benefits value ({currentCurrency.symbol})
                    </label>
                    <input
                      id="a-other"
                      type="text"
                      inputMode="decimal"
                      value={offerA.other}
                      onChange={e => setOfferA(prev => ({ ...prev, other: e.target.value }))}
                      placeholder="e.g. 50000"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label htmlFor="a-tax" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Your effective tax %
                      </label>
                      <input
                        id="a-tax"
                        type="text"
                        inputMode="decimal"
                        value={offerA.tax}
                        onChange={e => setOfferA(prev => ({ ...prev, tax: e.target.value }))}
                        placeholder="e.g. 15"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div>
                      <label htmlFor="a-pf" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Monthly PF / Deductions ({currentCurrency.symbol})
                      </label>
                      <input
                        id="a-pf"
                        type="text"
                        inputMode="decimal"
                        value={offerA.pf}
                        onChange={e => setOfferA(prev => ({ ...prev, pf: e.target.value }))}
                        placeholder="e.g. 3600"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* OFFER B */}
              <div
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--indigo)',
                      color: '#ffffff',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                    }}
                  >
                    B
                  </div>
                  <input
                    type="text"
                    value={offerB.name}
                    onChange={e => setOfferB(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Offer B Name / Company"
                    style={{
                      fontWeight: 700,
                      fontSize: '16px',
                      background: 'transparent',
                      border: '0',
                      borderBottom: '1px dashed var(--border)',
                      color: 'var(--text-heading)',
                      padding: '2px 4px',
                      width: '100%',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label htmlFor="b-fixed" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                      Fixed annual pay (Base CTC) ({currentCurrency.symbol}) *
                    </label>
                    <input
                      id="b-fixed"
                      type="text"
                      inputMode="decimal"
                      value={offerB.fixed}
                      onChange={e => setOfferB(prev => ({ ...prev, fixed: e.target.value }))}
                      placeholder="e.g. 1500000"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label htmlFor="b-var" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Variable pay (% of fixed)
                      </label>
                      <input
                        id="b-var"
                        type="text"
                        inputMode="decimal"
                        value={offerB.varPct}
                        onChange={e => setOfferB(prev => ({ ...prev, varPct: e.target.value }))}
                        placeholder="e.g. 15"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div>
                      <label htmlFor="b-payout" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Expected payout (%)
                      </label>
                      <input
                        id="b-payout"
                        type="text"
                        inputMode="decimal"
                        value={offerB.payout}
                        onChange={e => setOfferB(prev => ({ ...prev, payout: e.target.value }))}
                        placeholder="e.g. 80"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="b-bonus" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                      Joining / one-time bonus ({currentCurrency.symbol})
                    </label>
                    <input
                      id="b-bonus"
                      type="text"
                      inputMode="decimal"
                      value={offerB.bonus}
                      onChange={e => setOfferB(prev => ({ ...prev, bonus: e.target.value }))}
                      placeholder="e.g. 100000"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div>
                    <label htmlFor="b-other" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                      Other annual benefits value ({currentCurrency.symbol})
                    </label>
                    <input
                      id="b-other"
                      type="text"
                      inputMode="decimal"
                      value={offerB.other}
                      onChange={e => setOfferB(prev => ({ ...prev, other: e.target.value }))}
                      placeholder="e.g. 60000"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label htmlFor="b-tax" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Your effective tax %
                      </label>
                      <input
                        id="b-tax"
                        type="text"
                        inputMode="decimal"
                        value={offerB.tax}
                        onChange={e => setOfferB(prev => ({ ...prev, tax: e.target.value }))}
                        placeholder="e.g. 18"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div>
                      <label htmlFor="b-pf" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Monthly PF / Deductions ({currentCurrency.symbol})
                      </label>
                      <input
                        id="b-pf"
                        type="text"
                        inputMode="decimal"
                        value={offerB.pf}
                        onChange={e => setOfferB(prev => ({ ...prev, pf: e.target.value }))}
                        placeholder="e.g. 4500"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Output & Table */}
          {comparisonResult.hasBoth ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
              {/* Verdict Banner */}
              <div
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Financial Bottom Line
                  </div>
                  <div style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)', fontWeight: 800, color: 'var(--text-heading)', marginTop: '4px' }}>
                    {comparisonResult.bBetterNet ? (
                      <span>
                        <span style={{ color: 'var(--emerald)' }}>{offerB.name || 'Offer B'}</span> yields{' '}
                        <span style={{ color: 'var(--emerald)' }}>+{formatMoney(comparisonResult.netDiff)}</span> more annual net in-hand
                      </span>
                    ) : (
                      <span>
                        <span style={{ color: 'var(--emerald)' }}>{offerA.name || 'Offer A'}</span> yields{' '}
                        <span style={{ color: 'var(--emerald)' }}>+{formatMoney(Math.abs(comparisonResult.netDiff))}</span> more annual net in-hand
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                    Monthly in-hand difference:{' '}
                    <strong>{formatMoney(Math.abs(comparisonResult.inHandDiff))}/month</strong>{' '}
                    ({comparisonResult.bBetterInHand ? offerB.name || 'Offer B' : offerA.name || 'Offer A'} is higher on base take-home).
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={scenarioTitleInput}
                    onChange={e => setScenarioTitleInput(e.target.value)}
                    placeholder="Scenario label (optional)"
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      fontSize: '13px',
                      width: '180px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveScenario}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '0',
                      background: 'var(--surface)',
                      borderStyle: 'solid',
                      borderWidth: '1px',
                      borderColor: 'var(--border)',
                      color: 'var(--text)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Save Snapshot
                  </button>
                </div>
              </div>

              {/* Visual Breakdown Bar Chart */}
              <div
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '24px',
                }}
              >
                <h3 style={{ fontSize: '1.1rem', margin: '0 0 4px', color: 'var(--text-heading)' }}>
                  Compensation Component Comparison
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 20px' }}>
                  Fixed base vs realistic variable payout vs annual after-tax net ({currentCurrency.symbol})
                </p>

                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={comparisonChartData}
                      margin={{ top: 10, right: 20, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                      <XAxis dataKey="metric" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                      <YAxis
                        stroke="var(--text-muted)"
                        fontSize={12}
                        tickLine={false}
                        tickFormatter={(val) => {
                          if (val >= 1000000) return `${(val / 100000).toFixed(1)}L`;
                          if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                          return val;
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--surface)',
                          borderColor: 'var(--border)',
                          borderRadius: '8px',
                          color: 'var(--text)',
                          fontSize: '13px',
                        }}
                        formatter={(val: number | string | undefined) => [
                          typeof val === 'number' ? formatMoney(val) : String(val),
                          '',
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
                      <Bar dataKey={offerA.name || 'Offer A'} fill="var(--accent)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey={offerB.name || 'Offer B'} fill="var(--indigo)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Detailed Breakdown Table */}
              <div
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '20px',
                  overflowX: 'auto',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Metric</th>
                      <th style={{ padding: '10px 12px', color: 'var(--text-heading)', fontWeight: 700 }}>
                        {offerA.name || 'Offer A'}
                      </th>
                      <th style={{ padding: '10px 12px', color: 'var(--text-heading)', fontWeight: 700 }}>
                        {offerB.name || 'Offer B'}
                      </th>
                      <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        label: 'Fixed annual pay (Base)',
                        a: comparisonResult.a.fixed,
                        b: comparisonResult.b.fixed,
                        highlight: true,
                      },
                      {
                        label: 'Variable target (advertised)',
                        a: comparisonResult.a.varTarget,
                        b: comparisonResult.b.varTarget,
                      },
                      {
                        label: 'Expected variable (realistic)',
                        a: comparisonResult.a.varExpected,
                        b: comparisonResult.b.varExpected,
                        note: `A @ ${offerA.payout || 100}%, B @ ${offerB.payout || 100}%`,
                      },
                      {
                        label: 'Joining / one-time bonus (Year 1)',
                        a: comparisonResult.a.bonus,
                        b: comparisonResult.b.bonus,
                      },
                      {
                        label: 'Other annual benefits',
                        a: comparisonResult.a.other,
                        b: comparisonResult.b.other,
                      },
                      {
                        label: 'Headline CTC (Advertised)',
                        a: comparisonResult.a.headlineCtc,
                        b: comparisonResult.b.headlineCtc,
                        bold: true,
                      },
                      {
                        label: 'Expected Total CTC (Realistic)',
                        a: comparisonResult.a.totalExpectedCtc,
                        b: comparisonResult.b.totalExpectedCtc,
                        bold: true,
                        highlight: true,
                      },
                      {
                        label: 'Est. Monthly In-Hand (Fixed Net)',
                        a: comparisonResult.a.monthlyInHandFixed,
                        b: comparisonResult.b.monthlyInHandFixed,
                        bold: true,
                        highlight: true,
                      },
                      {
                        label: 'Est. Annual Net (After Tax & PF)',
                        a: comparisonResult.a.annualNetAfterTax,
                        b: comparisonResult.b.annualNetAfterTax,
                        bold: true,
                        highlight: true,
                      },
                    ].map((row, idx) => {
                      const diffVal = row.b - row.a;
                      const aWins = row.a > row.b;
                      const bWins = row.b > row.a;

                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            background: row.highlight ? 'rgba(56, 189, 248, 0.03)' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '10px 12px', fontWeight: row.bold ? 700 : 500 }}>
                            {row.label}
                            {row.note && (
                              <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                                {row.note}
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: '10px 12px',
                              fontWeight: row.bold ? 700 : 500,
                              color: aWins && row.highlight ? 'var(--emerald)' : 'var(--text)',
                            }}
                          >
                            {formatMoney(row.a)}
                            {aWins && row.highlight && (
                              <span
                                style={{
                                  marginLeft: '6px',
                                  fontSize: '11px',
                                  background: 'rgba(52, 211, 153, 0.15)',
                                  color: 'var(--emerald)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                }}
                              >
                                Higher
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: '10px 12px',
                              fontWeight: row.bold ? 700 : 500,
                              color: bWins && row.highlight ? 'var(--emerald)' : 'var(--text)',
                            }}
                          >
                            {formatMoney(row.b)}
                            {bWins && row.highlight && (
                              <span
                                style={{
                                  marginLeft: '6px',
                                  fontSize: '11px',
                                  background: 'rgba(52, 211, 153, 0.15)',
                                  color: 'var(--emerald)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                }}
                              >
                                Higher
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                            {diffVal === 0 ? (
                              'Equal'
                            ) : diffVal > 0 ? (
                              <span style={{ color: 'var(--emerald)' }}>
                                +{formatMoney(diffVal)} ({offerB.name || 'B'})
                              </span>
                            ) : (
                              <span style={{ color: 'var(--accent)' }}>
                                +{formatMoney(Math.abs(diffVal))} ({offerA.name || 'A'})
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  * Green tags mark the higher figure. Tax rates and PF deductions are user inputs. Variable pay is non-guaranteed and estimated based on payout assumptions.
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                border: '1px dashed var(--border)',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '14px',
                marginBottom: '32px',
              }}
            >
              <Info size={20} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.6 }} />
              Enter fixed base pay for both Offer A and Offer B above to generate the comparison table and charts.
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: NOTICE PERIOD BUYOUT CALCULATOR */}
      {/* ========================================================================= */}
      {activeTab === 'buyout' && (
        <section
          aria-label="Notice Period Buyout Calculator"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 6px 0', color: 'var(--text-heading)' }}>
              Notice Period Buyout Calculator
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
              Calculate the estimated financial settlement required to waive remaining notice period days when switching employers early.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <div>
              <label htmlFor="buyout-monthly" style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                Monthly gross salary ({currentCurrency.symbol}) *
              </label>
              <input
                id="buyout-monthly"
                type="text"
                inputMode="decimal"
                value={buyoutInputs.monthlyGross}
                onChange={e => setBuyoutInputs(prev => ({ ...prev, monthlyGross: e.target.value }))}
                placeholder="e.g. 100000"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '15px',
                  fontWeight: 500,
                }}
              />
            </div>

            <div>
              <label htmlFor="buyout-days" style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                Notice days you want to buy out *
              </label>
              <input
                id="buyout-days"
                type="text"
                inputMode="decimal"
                value={buyoutInputs.noticeDays}
                onChange={e => setBuyoutInputs(prev => ({ ...prev, noticeDays: e.target.value }))}
                placeholder="e.g. 60"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '15px',
                  fontWeight: 500,
                }}
              />
            </div>
          </div>

          {/* Quick Notice Day Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Quick Day Presets:</span>
            {[15, 30, 45, 60, 90].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setBuyoutInputs(prev => ({ ...prev, noticeDays: String(d) }))}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                {d} Days
              </button>
            ))}
          </div>

          {buyoutCalculations.valid ? (
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '20px',
                background: 'var(--bg)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Estimated Buyout Cost
                  </div>
                  <div
                    style={{
                      fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                      fontWeight: 800,
                      color: 'var(--accent)',
                      lineHeight: 1.1,
                    }}
                  >
                    {formatMoney(buyoutCalculations.buyoutTotal)}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Calculation: {formatMoney(buyoutCalculations.monthly)} ÷ 30 days × {buyoutCalculations.days} days
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const txt = `Notice Period Buyout Calculation:
Monthly Gross Salary: ${formatMoney(buyoutCalculations.monthly)}
Notice Shortfall: ${buyoutCalculations.days} days
Per-day Rate: ${formatMoney(buyoutCalculations.perDayGross)}/day
Total Buyout Payable: ${formatMoney(buyoutCalculations.buyoutTotal)}`;
                    copyToClipboard(txt, 'buyout-summary');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {copiedKey === 'buyout-summary' ? <Check size={14} style={{ color: 'var(--emerald)' }} /> : <Copy size={14} />}
                  Copy Result
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  marginTop: '20px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <div style={{ padding: '12px', background: 'var(--surface)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Per-day Gross Cost</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', marginTop: '2px' }}>
                    {formatMoney(buyoutCalculations.perDayGross)}
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--surface)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Notice Days Shortfall</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', marginTop: '2px' }}>
                    {buyoutCalculations.days} Days
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--surface)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Negotiation Tip</div>
                  <div style={{ fontSize: '13px', color: 'var(--text)', marginTop: '2px', lineHeight: 1.4 }}>
                    Ask your new hiring company to reimburse this as a <em>Sign-on / Notice Buyout Bonus</em> in writing.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                border: '1px dashed var(--border)',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '14px',
              }}
            >
              <Info size={20} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.6 }} />
              {buyoutCalculations.error}
            </div>
          )}

          <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
            ⚠️ <strong>Contract Note:</strong> Employers set their own buyout clauses in employment contracts. Some companies compute buyout strictly on <em>Basic Pay</em>, while others use <em>Gross Salary</em> or <em>Total Fixed CTC</em>. Always verify your company's HR policy and appointment letter.
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SAVED SCENARIOS */}
      {/* ========================================================================= */}
      {activeTab === 'saved' && (
        <section
          aria-label="Saved Scenarios"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: '0 0 6px 0', color: 'var(--text-heading)' }}>
                Saved Comparison Scenarios ({savedScenarios.length})
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
                Snapshots saved in your local browser storage for easy revisiting during your interview and offer negotiations.
              </p>
            </div>
          </div>

          {savedScenarios.length === 0 ? (
            <div
              style={{
                border: '1px dashed var(--border)',
                borderRadius: '12px',
                padding: '36px',
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <BookmarkCheck size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
              <p style={{ margin: '0 0 8px', fontWeight: 600, color: 'var(--text)' }}>No saved scenarios yet</p>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Go to the <strong>Compare Offers</strong> tab, enter two job offers, and click "Save Scenario".
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {savedScenarios.map(sc => {
                const aCalc = calculateSingleOffer(sc.offerA);
                const bCalc = calculateSingleOffer(sc.offerB);
                const curr = CURRENCIES.find(c => c.id === sc.currencyId) || CURRENCIES[0];

                return (
                  <div
                    key={sc.id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '16px',
                      background: 'var(--bg)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-heading)' }}>
                        {sc.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Saved on {sc.timestamp} · Currency: {curr.label}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text)', marginTop: '6px' }}>
                        <strong>{sc.offerA.name || 'Offer A'}:</strong> {curr.symbol}
                        {Math.round(aCalc.annualNetAfterTax).toLocaleString(curr.locale)} Net vs{' '}
                        <strong>{sc.offerB.name || 'Offer B'}:</strong> {curr.symbol}
                        {Math.round(bCalc.annualNetAfterTax).toLocaleString(curr.locale)} Net
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleLoadScenario(sc)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--accent)',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Load to Compare
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteScenario(sc.id)}
                        title="Delete scenario"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'transparent',
                          color: 'var(--rose)',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* EDUCATIONAL GUIDE & BEST PRACTICES */}
      {/* ========================================================================= */}
      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: '12px', color: 'var(--text-heading)' }}>
          How to Use These Calculators for IT Negotiations
        </h2>
        <div style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text)' }}>
          <p style={{ margin: '0 0 12px' }}>
            <strong>1. Hike Calculator:</strong> Enter your current pay and new offer to see both absolute cash increase and percentage hike. Or, specify a target hike percentage (e.g. 30%) to generate the exact counter-offer figure you should pitch to recruiters.
          </p>
          <p style={{ margin: '0 0 12px' }}>
            <strong>2. Compare Offers (Fixed vs Variable Reality):</strong> A higher headline CTC does not guarantee higher take-home pay. Many tech companies pack CTCs with 20%–30% performance variables that depend on business conditions. Use the expected variable payout field (e.g. 70% or 80%) to see your true baseline take-home before making a career decision.
          </p>
          <p style={{ margin: '0 0 12px' }}>
            <strong>3. Notice Period Buyout:</strong> If your current employer enforces a 60 or 90-day notice period and your new employer wants you to start immediately, calculate the exact buyout cost and negotiate with the new employer to cover it as a joining bonus.
          </p>
        </div>

        <ul style={{ margin: '16px 0 0', paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <li>Tax rates and PF contributions are not guessed automatically because your personal deductions, tax regime (Old vs New), and 80C exemptions vary. Enter your real effective tax rate from your recent payslip.</li>
          <li>All results are estimates designed for comparative financial decision-making and do not constitute formal tax, legal, or investment advice.</li>
          <li>Always verify in writing what part of your compensation is fixed base, what is variable, and whether joining bonuses have clawback clauses (e.g., must stay 1 year).</li>
        </ul>
      </section>

      {/* ========================================================================= */}
      {/* FAQ ACCORDION SECTION */}
      {/* ========================================================================= */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', color: 'var(--text-heading)' }}>
          Frequently Asked Questions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  background: 'var(--card)',
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    textAlign: 'left',
                    background: 'transparent',
                    border: '0',
                    color: 'var(--text-heading)',
                    fontWeight: 600,
                    fontSize: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <span>{item.q}</span>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: '0 18px 16px',
                      fontSize: '14px',
                      color: 'var(--text-muted)',
                      lineHeight: 1.6,
                      borderTop: '1px solid var(--border)',
                      paddingTop: '12px',
                    }}
                  >
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
};
