import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Layers, TrendingUp, TrendingDown, Info, Check, CheckCircle2 } from 'lucide-react';

export interface AmortizationRow {
  month: number;
  emi: number;
  principal: number;
  interest: number;
  balance: number;
}

export type ChartFocusMode = 'combined' | 'principal' | 'interest';

export interface CarAmortizationAreaChartProps {
  data: AmortizationRow[];
  height?: number;
  currencySymbol?: string;
  formatCurrency?: (val: number) => string;
  initialFocusMode?: ChartFocusMode;
  focusMode?: ChartFocusMode;
  onFocusModeChange?: (mode: ChartFocusMode) => void;
  showToggleButtons?: boolean;
}

export const CarAmortizationAreaChart: React.FC<CarAmortizationAreaChartProps> = ({
  data,
  height = 280,
  currencySymbol = '₹',
  formatCurrency,
  initialFocusMode = 'combined',
  focusMode: controlledFocusMode,
  onFocusModeChange,
  showToggleButtons = true,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(700);
  const [internalFocusMode, setInternalFocusMode] = useState<ChartFocusMode>(initialFocusMode);

  const activeFocusMode = controlledFocusMode !== undefined ? controlledFocusMode : internalFocusMode;

  const handleSelectFocusMode = (mode: ChartFocusMode) => {
    setInternalFocusMode(mode);
    if (onFocusModeChange) {
      onFocusModeChange(mode);
    }
  };

  const renderVal = (val: number) => {
    if (formatCurrency) return formatCurrency(val);
    return `${currencySymbol}${Math.round(val).toLocaleString()}`;
  };

  // Precompute financial metrics for the informative summary callouts
  const metrics = useMemo(() => {
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
  }, [data]);

  useEffect(() => {
    if (!svgRef.current?.parentElement) return;
    const updateWidth = () => {
      const parent = svgRef.current?.parentElement;
      if (parent && parent.clientWidth > 0) {
        setContainerWidth(parent.clientWidth);
      }
    };

    updateWidth();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && svgRef.current.parentElement) {
      ro = new ResizeObserver(() => updateWidth());
      ro.observe(svgRef.current.parentElement);
    }
    window.addEventListener('resize', updateWidth);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const isMobile = containerWidth < 500;
    const margin = isMobile
      ? { top: 16, right: 14, bottom: 36, left: 48 }
      : { top: 20, right: 30, bottom: 40, left: 65 };
    const width = Math.max(120, containerWidth - margin.left - margin.right);
    const chartHeight = Math.max(100, height - margin.top - margin.bottom);

    svg
      .attr('width', containerWidth)
      .attr('height', height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    let chartData = data;
    if (data.length > 84) {
      const yearlyMap = new Map<number, { month: number; principal: number; interest: number; balance: number }>();
      data.forEach(d => {
        const yr = Math.ceil(d.month / 12);
        const existing = yearlyMap.get(yr) || { month: yr, principal: 0, interest: 0, balance: d.balance };
        existing.principal += d.principal;
        existing.interest += d.interest;
        existing.balance = d.balance;
        yearlyMap.set(yr, existing);
      });
      chartData = Array.from(yearlyMap.values()) as AmortizationRow[];
    }

    const x = d3.scaleLinear()
      .domain(d3.extent(chartData, d => d.month) as [number, number])
      .range([0, width]);

    const stack = d3.stack<any>()
      .keys(['principal', 'interest'])
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const stackedData = stack(chartData);

    const maxY = d3.max(stackedData, layer => d3.max(layer, d => d[1])) || 1000;

    const y = d3.scaleLinear()
      .domain([0, maxY])
      .nice()
      .range([chartHeight, 0]);

    // Mode-specific color and opacity styling
    const getLayerFill = (key: string) => {
      if (key === 'principal') {
        return '#0ea5e9'; // sky-500
      }
      return '#f43f5e'; // rose-500
    };

    const getLayerOpacity = (key: string) => {
      if (activeFocusMode === 'combined') {
        return 0.85;
      }
      if (activeFocusMode === 'principal') {
        return key === 'principal' ? 0.95 : 0.14;
      }
      if (activeFocusMode === 'interest') {
        return key === 'interest' ? 0.95 : 0.14;
      }
      return 0.85;
    };

    const getLayerStroke = (key: string) => {
      if (activeFocusMode === 'principal' && key === 'principal') {
        return '#0284c7';
      }
      if (activeFocusMode === 'interest' && key === 'interest') {
        return '#e11d48';
      }
      return 'transparent';
    };

    const area = d3.area<any>()
      .x(d => x(d.data.month))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveMonotoneX);

    const xAxis = d3.axisBottom(x).ticks(6).tickFormat(d => data.length > 84 ? `Y${d}` : `M${d}`);
    const yAxis = d3.axisLeft(y).ticks(5).tickFormat(d => `${currencySymbol}${(Number(d) / 1000).toFixed(0)}k`);

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(xAxis)
      .attr('color', 'var(--text-muted)')
      .selectAll('text')
      .style('font-size', '11px');

    // Y Axis
    g.append('g')
      .call(yAxis)
      .attr('color', 'var(--text-muted)')
      .selectAll('text')
      .style('font-size', '11px');

    // Subtle Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.15)
      .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(() => ''));

    // Stacked Area Layers
    const layers = g.selectAll('.layer')
      .data(stackedData)
      .enter()
      .append('g')
      .attr('class', 'layer');

    layers.append('path')
      .attr('class', 'area')
      .style('fill', d => getLayerFill(d.key))
      .style('opacity', d => getLayerOpacity(d.key))
      .style('stroke', d => getLayerStroke(d.key))
      .style('stroke-width', (d) => {
        if (activeFocusMode === 'principal' && d.key === 'principal') return '2.5px';
        if (activeFocusMode === 'interest' && d.key === 'interest') return '2.5px';
        return '0px';
      })
      .style('transition', 'opacity 0.25s ease, fill 0.25s ease')
      .attr('d', area);

    // Crossover line indicator if applicable (when principal >= interest)
    const crossover = chartData.find(d => d.principal >= d.interest);
    if (crossover && crossover.month > 1 && crossover.month < chartData[chartData.length - 1].month) {
      const crossX = x(crossover.month);
      const isCrossoverHighlighted = activeFocusMode === 'combined' || activeFocusMode === 'principal';

      const crossG = g.append('g')
        .attr('class', 'crossover-marker')
        .style('opacity', isCrossoverHighlighted ? 0.9 : 0.35);

      crossG.append('line')
        .attr('x1', crossX)
        .attr('x2', crossX)
        .attr('y1', 0)
        .attr('y2', chartHeight)
        .style('stroke', '#10b981')
        .style('stroke-dasharray', '3,3')
        .style('stroke-width', isCrossoverHighlighted ? 1.5 : 1);

      crossG.append('text')
        .attr('x', crossX)
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('font-weight', '700')
        .style('fill', '#10b981')
        .text(isMobile ? `Cross M${crossover.month}` : `Crossover: M${crossover.month}`);
    }

    // Hover Elements
    const tooltip = d3.select(tooltipRef.current);
    const bisect = d3.bisector((d: any) => d.month).left;

    const focus = g.append('g')
      .attr('display', 'none');

    focus.append('line')
      .attr('class', 'x-hover-line')
      .attr('y1', 0)
      .attr('y2', chartHeight)
      .style('stroke', 'var(--accent)')
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.8);

    focus.append('circle')
      .attr('class', 'principal-circle')
      .attr('r', activeFocusMode === 'principal' ? 6 : 5)
      .style('fill', '#0ea5e9')
      .style('stroke', '#ffffff')
      .style('stroke-width', activeFocusMode === 'principal' ? 2.5 : 2)
      .style('opacity', activeFocusMode === 'interest' ? 0.4 : 1);

    focus.append('circle')
      .attr('class', 'interest-circle')
      .attr('r', activeFocusMode === 'interest' ? 6 : 5)
      .style('fill', '#f43f5e')
      .style('stroke', '#ffffff')
      .style('stroke-width', activeFocusMode === 'interest' ? 2.5 : 2)
      .style('opacity', activeFocusMode === 'principal' ? 0.4 : 1);

    svg.on('mousemove', function (event) {
      const [mouseX] = d3.pointer(event, g.node());
      const x0 = x.invert(mouseX);
      const i = bisect(chartData, x0, 1);
      const d0 = chartData[i - 1];
      const d1 = chartData[i];
      if (!d0) return;
      const d = d1 && x0 - d0.month > d1.month - x0 ? d1 : d0;

      const xPos = x(d.month);
      const pY = y(d.principal);
      const totalY = y(d.principal + d.interest);

      focus.attr('transform', `translate(${xPos},0)`);
      focus.select('.x-hover-line').attr('y2', chartHeight);
      focus.select('.principal-circle').attr('cy', pY);
      focus.select('.interest-circle').attr('cy', totalY);
      focus.style('display', null);

      const totalMonthly = d.principal + d.interest;
      const curPrincipalPct = totalMonthly > 0 ? ((d.principal / totalMonthly) * 100).toFixed(0) : '0';
      const curInterestPct = totalMonthly > 0 ? ((d.interest / totalMonthly) * 100).toFixed(0) : '0';

      tooltip
        .style('display', 'block')
        .style('left', `${event.pageX + 14}px`)
        .style('top', `${event.pageY - 36}px`)
        .html(`
          <div style="font-weight:800;font-size:0.82rem;margin-bottom:6px;border-bottom:1px solid var(--border);padding-bottom:4px;display:flex;justify-content:space-between;align-items:center;gap:8px">
            <span>${data.length > 84 ? `Year ${d.month}` : `Month ${d.month}`} Breakdown</span>
            <span style="font-size:0.7rem;color:var(--text-muted)">EMI: ${renderVal(d.emi)}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;color:#0ea5e9;margin-bottom:3px;font-weight:${activeFocusMode === 'principal' ? '800' : '500'}">
            <span style="display:flex;align-items:center;gap:6px">
              <span style="width:8px;height:8px;border-radius:50%;background:#0ea5e9;display:inline-block"></span>
              Principal:
            </span>
            <span><strong>${renderVal(d.principal)}</strong> <span style="font-size:0.7rem;opacity:0.85">(${curPrincipalPct}%)</span></span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;color:#f43f5e;margin-bottom:4px;font-weight:${activeFocusMode === 'interest' ? '800' : '500'}">
            <span style="display:flex;align-items:center;gap:6px">
              <span style="width:8px;height:8px;border-radius:50%;background:#f43f5e;display:inline-block"></span>
              Interest:
            </span>
            <span><strong>${renderVal(d.interest)}</strong> <span style="font-size:0.7rem;opacity:0.85">(${curInterestPct}%)</span></span>
          </div>
          <div style="font-size:0.72rem;color:var(--text-muted);border-top:1px solid var(--border);padding-top:4px;display:flex;justify-content:space-between">
            <span>Outstanding Debt:</span>
            <span><strong>${renderVal(d.balance)}</strong></span>
          </div>
        `);
    })
    .on('mouseleave', () => {
      focus.style('display', 'none');
      tooltip.style('display', 'none');
    });

  }, [data, height, currencySymbol, formatCurrency, containerWidth, activeFocusMode]);

  return (
    <div className="car-amortization-chart-wrapper" style={{ width: '100%' }}>
      {/* Chart SVG Canvas */}
      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg ref={svgRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            display: 'none',
            padding: '10px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
            fontSize: '0.78rem',
            pointerEvents: 'none',
            zIndex: 99999,
            color: 'var(--text)',
            minWidth: '190px',
          }}
        />
      </div>

      {/* Interactive Toggle Buttons Bar */}
      {showToggleButtons && (
        <div style={{ marginTop: '14px' }}>
          <div
            role="tablist"
            aria-label="Amortization Chart Visualization Focus Modes"
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '6px',
              background: 'var(--surface-accent)',
              borderRadius: '10px',
              border: '1px solid var(--border)',
            }}
          >
            {/* 1. Combined View Toggle Button */}
            <button
              type="button"
              role="tab"
              id="chart-focus-combined-tab"
              data-testid="chart-focus-combined"
              aria-selected={activeFocusMode === 'combined'}
              aria-controls="chart-focus-info-panel"
              onClick={() => handleSelectFocusMode('combined')}
              style={{
                flex: '1 1 auto',
                minWidth: '140px',
                minHeight: '44px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: activeFocusMode === 'combined' ? '1.5px solid var(--accent)' : '1px solid transparent',
                background: activeFocusMode === 'combined' ? 'var(--accent)' : 'transparent',
                color: activeFocusMode === 'combined' ? '#ffffff' : 'var(--text)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                fontWeight: activeFocusMode === 'combined' ? 700 : 500,
                boxShadow: activeFocusMode === 'combined' ? '0 2px 8px rgba(14, 165, 233, 0.3)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Layers size={16} />
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div>Combined View</div>
                <div style={{ fontSize: '0.68rem', opacity: 0.85, fontWeight: 400 }}>Principal + Interest</div>
              </div>
            </button>

            {/* 2. Principal Focus Toggle Button */}
            <button
              type="button"
              role="tab"
              id="chart-focus-principal-tab"
              data-testid="chart-focus-principal"
              aria-selected={activeFocusMode === 'principal'}
              aria-controls="chart-focus-info-panel"
              onClick={() => handleSelectFocusMode('principal')}
              style={{
                flex: '1 1 auto',
                minWidth: '140px',
                minHeight: '44px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: activeFocusMode === 'principal' ? '1.5px solid #0284c7' : '1px solid transparent',
                background: activeFocusMode === 'principal' ? '#0ea5e9' : 'transparent',
                color: activeFocusMode === 'principal' ? '#ffffff' : 'var(--text)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                fontWeight: activeFocusMode === 'principal' ? 700 : 500,
                boxShadow: activeFocusMode === 'principal' ? '0 2px 8px rgba(14, 165, 233, 0.3)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <TrendingUp size={16} />
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div>Principal Focus</div>
                <div style={{ fontSize: '0.68rem', opacity: 0.85, fontWeight: 400 }}>Equity Buildup Curve</div>
              </div>
            </button>

            {/* 3. Interest Focus Toggle Button */}
            <button
              type="button"
              role="tab"
              id="chart-focus-interest-tab"
              data-testid="chart-focus-interest"
              aria-selected={activeFocusMode === 'interest'}
              aria-controls="chart-focus-info-panel"
              onClick={() => handleSelectFocusMode('interest')}
              style={{
                flex: '1 1 auto',
                minWidth: '140px',
                minHeight: '44px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: activeFocusMode === 'interest' ? '1.5px solid #e11d48' : '1px solid transparent',
                background: activeFocusMode === 'interest' ? '#f43f5e' : 'transparent',
                color: activeFocusMode === 'interest' ? '#ffffff' : 'var(--text)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                fontWeight: activeFocusMode === 'interest' ? 700 : 500,
                boxShadow: activeFocusMode === 'interest' ? '0 2px 8px rgba(244, 63, 94, 0.3)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <TrendingDown size={16} />
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div>Interest Focus</div>
                <div style={{ fontSize: '0.68rem', opacity: 0.85, fontWeight: 400 }}>Interest Burden Decay</div>
              </div>
            </button>
          </div>

          {/* Contextual Informative Card Tailored to Active Focus Mode */}
          {metrics && (
            <div
              id="chart-focus-info-panel"
              role="tabpanel"
              aria-labelledby={`chart-focus-${activeFocusMode}-tab`}
              style={{
                marginTop: '10px',
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                transition: 'all 0.2s ease',
              }}
            >
              {activeFocusMode === 'combined' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-heading)' }}>
                      <Layers size={16} style={{ color: 'var(--accent)' }} />
                      <span>Combined Amortization Breakdown</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.74rem' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9', fontWeight: 700 }}>
                        Principal: {metrics.principalShare.toFixed(0)}%
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(244, 63, 94, 0.12)', color: '#f43f5e', fontWeight: 700 }}>
                        Interest: {metrics.interestShare.toFixed(0)}%
                      </span>
                      {metrics.crossoverMonth && (
                        <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontWeight: 700 }}>
                          Crossover: Month {metrics.crossoverMonth}
                        </span>
                      )}
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.79rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    Your total monthly EMI remains fixed across all {metrics.tenureMonths} months, but its internal composition shifts continuously. Early payments predominantly service bank interest charges, while subsequent payments build your equity at an accelerating pace.
                  </p>
                </div>
              )}

              {activeFocusMode === 'principal' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.86rem', color: '#0ea5e9' }}>
                      <TrendingUp size={16} />
                      <span>Principal Equity Acceleration Curve</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.74rem' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9', fontWeight: 700 }}>
                        Month 1: {renderVal(metrics.p1)} ({metrics.p1Pct.toFixed(0)}%)
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(14, 165, 233, 0.18)', color: '#0284c7', fontWeight: 700 }}>
                        Month {metrics.tenureMonths}: {renderVal(metrics.pEnd)} ({metrics.pEndPct.toFixed(0)}%)
                      </span>
                      {metrics.crossoverMonth && (
                        <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontWeight: 700 }}>
                          &gt;50% Equity: Month {metrics.crossoverMonth}
                        </span>
                      )}
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.79rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    Spotlight on principal equity: Every month, the amount paying off your actual vehicle principal surges from <strong>{renderVal(metrics.p1)}</strong> up to <strong>{renderVal(metrics.pEnd)}</strong>. {metrics.crossoverMonth ? `By Month ${metrics.crossoverMonth}, the majority of each installment builds your direct net worth rather than financing cost.` : ''}
                  </p>
                </div>
              )}

              {activeFocusMode === 'interest' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.86rem', color: '#f43f5e' }}>
                      <TrendingDown size={16} />
                      <span>Interest Obligation &amp; Borrowing Cost Decay</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.74rem' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(244, 63, 94, 0.12)', color: '#f43f5e', fontWeight: 700 }}>
                        Peak (Month 1): {renderVal(metrics.i1)} ({metrics.i1Pct.toFixed(0)}%)
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(244, 63, 94, 0.18)', color: '#e11d48', fontWeight: 700 }}>
                        Final Month: {renderVal(metrics.iEnd)}
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', fontWeight: 700 }}>
                        Total Interest: {renderVal(metrics.totalInterest)}
                      </span>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.79rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    Spotlight on borrowing cost: Because interest is computed on your outstanding balance, interest charges peak at <strong>{renderVal(metrics.i1)}</strong> in Month 1 and collapse to just <strong>{renderVal(metrics.iEnd)}</strong> in Month {metrics.tenureMonths}. Prepaying principal in the early months yields the highest interest savings.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
