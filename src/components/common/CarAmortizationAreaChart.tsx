import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export interface AmortizationRow {
  month: number;
  emi: number;
  principal: number;
  interest: number;
  balance: number;
}

interface CarAmortizationAreaChartProps {
  data: AmortizationRow[];
  height?: number;
  currencySymbol?: string;
  formatCurrency?: (val: number) => string;
}

export const CarAmortizationAreaChart: React.FC<CarAmortizationAreaChartProps> = ({
  data,
  height = 280,
  currencySymbol = '₹',
  formatCurrency,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(700);

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

    const color = d3.scaleOrdinal<string>()
      .domain(['principal', 'interest'])
      .range(['#0ea5e9', '#f43f5e']);

    const area = d3.area<any>()
      .x(d => x(d.data.month))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveMonotoneX);

    const xAxis = d3.axisBottom(x).ticks(6).tickFormat(d => data.length > 84 ? `Y${d}` : `M${d}`);
    const yAxis = d3.axisLeft(y).ticks(5).tickFormat(d => `${currencySymbol}${(Number(d) / 1000).toFixed(0)}k`);

    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(xAxis)
      .attr('color', 'var(--text-muted)')
      .selectAll('text')
      .style('font-size', '11px');

    g.append('g')
      .call(yAxis)
      .attr('color', 'var(--text-muted)')
      .selectAll('text')
      .style('font-size', '11px');

    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.15)
      .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(() => ''));

    const layers = g.selectAll('.layer')
      .data(stackedData)
      .enter()
      .append('g')
      .attr('class', 'layer');

    layers.append('path')
      .attr('class', 'area')
      .style('fill', d => color(d.key))
      .style('opacity', 0.85)
      .attr('d', area);

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
      .attr('r', 5)
      .style('fill', '#0ea5e9')
      .style('stroke', '#ffffff')
      .style('stroke-width', 2);

    focus.append('circle')
      .attr('class', 'interest-circle')
      .attr('r', 5)
      .style('fill', '#f43f5e')
      .style('stroke', '#ffffff')
      .style('stroke-width', 2);

    const renderVal = (val: number) => {
      if (formatCurrency) return formatCurrency(val);
      return `${currencySymbol}${Math.round(val).toLocaleString()}`;
    };

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

      tooltip
        .style('display', 'block')
        .style('left', `${event.pageX + 14}px`)
        .style('top', `${event.pageY - 36}px`)
        .html(`
          <div style="font-weight:800;font-size:0.82rem;margin-bottom:6px;border-bottom:1px solid var(--border);padding-bottom:4px">
            ${data.length > 84 ? `Year ${d.month}` : `Month ${d.month}`} Breakdown
          </div>
          <div style="display:flex;align-items:center;gap:6px;color:#0ea5e9;margin-bottom:2px">
            <span style="width:8px;height:8px;border-radius:50%;background:#0ea5e9;display:inline-block"></span>
            <span>Principal: <strong>${renderVal(d.principal)}</strong></span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;color:#f43f5e;margin-bottom:4px">
            <span style="width:8px;height:8px;border-radius:50%;background:#f43f5e;display:inline-block"></span>
            <span>Interest: <strong>${renderVal(d.interest)}</strong></span>
          </div>
          <div style="font-size:0.72rem;color:var(--text-muted);border-top:1px solid var(--border);padding-top:4px">
            Balance: ${renderVal(d.balance)}
          </div>
        `);
    })
    .on('mouseleave', () => {
      focus.style('display', 'none');
      tooltip.style('display', 'none');
    });

  }, [data, height, currencySymbol, formatCurrency, containerWidth]);

  return (
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
        }}
      />
    </div>
  );
};
