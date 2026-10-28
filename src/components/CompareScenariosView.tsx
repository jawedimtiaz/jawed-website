import React, { useState, useMemo } from 'react';
import {
  Scale,
  SlidersHorizontal,
  BarChart3,
  Grid,
  Sliders,
  Copy,
  Plus,
  RotateCcw,
  Trash2,
  ArrowRightLeft,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  ScenarioConfig,
  ResolutionPresetKey,
  CodecKey,
  RaidTypeKey,
  computeScenarioMetrics,
  DEFAULT_SCENARIOS,
} from '../tools/CctvStorageCalculator';

const RESOLUTION_BITRATES: Record<Exclude<ResolutionPresetKey, 'custom'>, Record<CodecKey, number>> = {
  '720p': { h264: 2.5, h265: 1.2 },
  '1080p': { h264: 4.0, h265: 2.0 },
  '3mp': { h264: 5.0, h265: 2.5 },
  '4mp': { h264: 6.0, h265: 3.0 },
  '5mp': { h264: 8.0, h265: 4.0 },
  '4k': { h264: 12.0, h265: 6.0 },
  '12mp': { h264: 16.0, h265: 8.0 },
};

export interface CompareScenariosViewProps {
  scenarios?: ScenarioConfig[];
  onUpdateScenario?: (id: string, updated: Partial<ScenarioConfig>) => void;
  onAddScenario?: (template?: Partial<ScenarioConfig>) => void;
  onDeleteScenario?: (id: string) => void;
  onDuplicateScenario?: (id: string) => void;
  onToggleScenarioEnabled?: (id: string) => void;
  onApplyScenarioToCalculator?: (scenario: ScenarioConfig) => void;
  onSaveCurrentAsScenario?: () => void;
  onResetDefaultScenarios?: () => void;
  onClose?: () => void;
  isDarkMode?: boolean;
  // Backwards compatibility props
  scenarioA?: ScenarioConfig;
  scenarioB?: ScenarioConfig;
  onChangeScenarioB?: (updated: Partial<ScenarioConfig>) => void;
  onCopyAtoB?: () => void;
  onSwapAandB?: () => void;
  onCloseComparison?: () => void;
  onApplyPresetComparison?: (preset: 'codec' | 'retention' | 'motion' | 'resolution') => void;
}

export const CompareScenariosView: React.FC<CompareScenariosViewProps> = ({
  scenarios: propsScenarios,
  onUpdateScenario,
  onAddScenario,
  onDeleteScenario,
  onDuplicateScenario,
  onToggleScenarioEnabled,
  onApplyScenarioToCalculator,
  onSaveCurrentAsScenario,
  onResetDefaultScenarios,
  onClose,
  isDarkMode = true,
  // Backwards compatibility props
  scenarioA,
  scenarioB,
  onChangeScenarioB,
  onCopyAtoB,
  onSwapAandB,
  onCloseComparison,
}) => {
  // If scenarios not passed via props, fallback to scenarioA & scenarioB or default scenarios
  const [internalScenarios, setInternalScenarios] = useState<ScenarioConfig[]>(() => {
    if (propsScenarios && propsScenarios.length > 0) return propsScenarios;
    if (scenarioA && scenarioB) {
      return [
        { ...scenarioA, id: 'sc-a', name: scenarioA.name || 'Scenario A (Baseline)', color: '#3b82f6', enabled: true },
        { ...scenarioB, id: 'sc-b', name: scenarioB.name || 'Scenario B (Alternative)', color: '#10b981', enabled: true },
      ];
    }
    return DEFAULT_SCENARIOS;
  });

  const activeScenariosList = propsScenarios && propsScenarios.length > 0 ? propsScenarios : internalScenarios;

  const [chartMetric, setChartMetric] = useState<'storage' | 'ingestion' | 'drives' | 'cost'>('storage');
  const [viewTab, setViewTab] = useState<'evolution' | 'matrix' | 'tune'>('evolution');

  const handleToggle = (id: string) => {
    if (onToggleScenarioEnabled) {
      onToggleScenarioEnabled(id);
    } else {
      setInternalScenarios(prev => prev.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
    }
  };

  const handleUpdate = (id: string, updated: Partial<ScenarioConfig>) => {
    if (onUpdateScenario) {
      onUpdateScenario(id, updated);
    } else {
      setInternalScenarios(prev => prev.map(s => (s.id === id ? { ...s, ...updated } : s)));
    }
  };

  const handleApplyPresetFilter = (type: 'all' | 'codec' | 'resolution' | 'retention' | 'motion') => {
    const updater = (prev: ScenarioConfig[]) => {
      if (type === 'all') return prev.map(s => ({ ...s, enabled: true }));
      if (type === 'codec') {
        return prev.map((s, idx) => ({ ...s, enabled: idx === 0 || idx === 1 }));
      }
      if (type === 'resolution') {
        return prev.map((s, idx) => ({ ...s, enabled: idx === 1 || idx === 2 }));
      }
      if (type === 'retention') {
        return prev.map((s, idx) => ({ ...s, enabled: idx === 2 || idx === 3 }));
      }
      if (type === 'motion') {
        return prev.map((s, idx) => ({ ...s, enabled: idx === 3 || idx === 4 }));
      }
      return prev;
    };

    if (onUpdateScenario && propsScenarios) {
      const updated = updater(propsScenarios);
      updated.forEach(s => {
        if (s.id) onUpdateScenario(s.id, { enabled: s.enabled });
      });
    } else {
      setInternalScenarios(updater);
    }
  };

  // Compute metrics for all enabled scenarios
  const enabledScenarios = useMemo(() => {
    const list = activeScenariosList.filter(s => s.enabled);
    return list.length > 0 ? list : [activeScenariosList[0]];
  }, [activeScenariosList]);

  const computedMetricsList = useMemo(() => {
    return enabledScenarios.map(s => computeScenarioMetrics(s));
  }, [enabledScenarios]);

  const baseline = computedMetricsList[0];
  const finalScenario = computedMetricsList[computedMetricsList.length - 1];

  // Overall evolution delta
  const overallDeltaTb = finalScenario.totalNeedTb - baseline.totalNeedTb;
  const overallDeltaPct = baseline.totalNeedTb > 0 ? (overallDeltaTb / baseline.totalNeedTb) * 100 : 0;
  const overallDeltaDrives = finalScenario.drivesNeeded - baseline.drivesNeeded;
  const overallDeltaDailyGb = finalScenario.totalDailyGb - baseline.totalDailyGb;
  const overallDeltaCost = finalScenario.totalHardDriveCost - baseline.totalHardDriveCost;

  // Step-by-step transitions
  const evolutionSteps = useMemo(() => {
    const steps: {
      from: ReturnType<typeof computeScenarioMetrics>;
      to: ReturnType<typeof computeScenarioMetrics>;
      deltaTb: number;
      deltaPct: number;
      deltaDrives: number;
      highlight: string;
      direction: 'increase' | 'decrease' | 'neutral';
    }[] = [];

    for (let i = 0; i < computedMetricsList.length - 1; i++) {
      const from = computedMetricsList[i];
      const to = computedMetricsList[i + 1];
      const deltaTb = to.totalNeedTb - from.totalNeedTb;
      const deltaPct = from.totalNeedTb > 0 ? (deltaTb / from.totalNeedTb) * 100 : 0;
      const deltaDrives = to.drivesNeeded - from.drivesNeeded;

      // Identify primary driver of change
      let highlight = '';
      if (from.codec !== to.codec) {
        highlight = `Codec: ${from.codec.toUpperCase()} → ${to.codec.toUpperCase()}`;
      } else if (from.resolutionPreset !== to.resolutionPreset) {
        highlight = `Resolution: ${from.resolutionPreset.toUpperCase()} → ${to.resolutionPreset.toUpperCase()}`;
      } else if (from.retentionDays !== to.retentionDays) {
        highlight = `Retention: ${from.safeDays}d → ${to.safeDays}d (${to.safeDays > from.safeDays ? '+' : ''}${to.safeDays - from.safeDays}d)`;
      } else if (from.recordingPct !== to.recordingPct) {
        highlight = `Duty Cycle: ${from.safeRec}% → ${to.safeRec}%`;
      } else if (from.safeCams !== to.safeCams) {
        highlight = `Cameras: ${from.safeCams} → ${to.safeCams} Cams`;
      } else {
        highlight = `Configuration Shift`;
      }

      steps.push({
        from,
        to,
        deltaTb,
        deltaPct,
        deltaDrives,
        highlight,
        direction: deltaTb > 0.1 ? 'increase' : deltaTb < -0.1 ? 'decrease' : 'neutral',
      });
    }

    return steps;
  }, [computedMetricsList]);

  // Chart data
  const chartData = useMemo(() => {
    return computedMetricsList.map(item => ({
      name: item.name.length > 22 ? item.name.substring(0, 20) + '…' : item.name,
      fullName: item.name,
      color: item.color || '#6366f1',
      usableTb: parseFloat(item.totalNeedTb.toFixed(1)),
      parityTb: parseFloat(item.parityStorageTb.toFixed(1)),
      rawTb: parseFloat(item.rawStorageTb.toFixed(1)),
      dailyGb: parseFloat(item.totalDailyGb.toFixed(0)),
      dailyTb: parseFloat(item.totalDailyTb.toFixed(2)),
      drives: item.drivesNeeded,
      cost: item.totalHardDriveCost,
      cams: item.safeCams,
      res: item.resolutionPreset.toUpperCase(),
      codec: item.codec.toUpperCase(),
      days: item.safeDays,
      recPct: item.safeRec,
    }));
  }, [computedMetricsList]);

  const handleClose = onClose || onCloseComparison;

  return (
    <div
      className="panel"
      style={{
        padding: '24px',
        background: 'var(--surface)',
        border: '2px solid var(--accent)',
        borderRadius: '16px',
        marginBottom: '32px',
        boxShadow: '0 8px 32px rgba(99, 102, 241, 0.12)',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              margin: '0 0 4px',
              color: 'var(--text-heading)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Scale className="w-5 h-5 text-indigo-400" />
            Compare Scenarios &amp; Storage Evolution
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.2)',
                color: 'var(--accent)',
                marginLeft: '4px',
              }}
            >
              {enabledScenarios.length} of {activeScenariosList.length} Sets Active
            </span>
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Toggle between different sets of camera configurations to see how total storage capacity, drive counts, and hardware budgets evolve.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {onSaveCurrentAsScenario && (
            <button
              type="button"
              className="button button-secondary"
              onClick={onSaveCurrentAsScenario}
              style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              title="Snapshot the current live calculator inputs as a new scenario"
            >
              <Copy className="w-3.5 h-3.5 text-sky-400" />
              Save Current Form as Scenario
            </button>
          )}

          {onAddScenario && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => onAddScenario()}
              style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              title="Add a custom camera configuration scenario"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              Add Scenario
            </button>
          )}

          {onResetDefaultScenarios && (
            <button
              type="button"
              className="button button-secondary"
              onClick={onResetDefaultScenarios}
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
              title="Reset scenarios to the 6 standard deployment benchmarks"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              Reset Defaults
            </button>
          )}

          {handleClose && (
            <button
              type="button"
              className="button button-secondary"
              onClick={handleClose}
              style={{ fontSize: '0.78rem', padding: '4px 10px', color: 'var(--rose)' }}
            >
              Close Comparison
            </button>
          )}
        </div>
      </div>

      {/* Scenario Configuration Toggle Ribbon */}
      <div
        style={{
          background: 'var(--bg)',
          borderRadius: '12px',
          padding: '14px',
          border: '1px solid var(--border)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              Camera Configuration Sets (Toggle to include in evolution):
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Click any scenario to toggle on/off
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>Quick Filters:</span>
            <button
              type="button"
              onClick={() => handleApplyPresetFilter('all')}
              className="button button-secondary"
              style={{ fontSize: '0.72rem', padding: '2px 8px' }}
            >
              Compare All
            </button>
            <button
              type="button"
              onClick={() => handleApplyPresetFilter('codec')}
              className="button button-secondary"
              style={{ fontSize: '0.72rem', padding: '2px 8px' }}
            >
              Codec Impact (H.264 vs H.265)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPresetFilter('resolution')}
              className="button button-secondary"
              style={{ fontSize: '0.72rem', padding: '2px 8px' }}
            >
              Resolution Jump (1080p vs 4K)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPresetFilter('retention')}
              className="button button-secondary"
              style={{ fontSize: '0.72rem', padding: '2px 8px' }}
            >
              Retention (30d vs 90d)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPresetFilter('motion')}
              className="button button-secondary"
              style={{ fontSize: '0.72rem', padding: '2px 8px' }}
            >
              Motion Duty Cycle (100% vs 40%)
            </button>
          </div>
        </div>

        {/* Horizontal Scenario Pill Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '10px',
          }}
        >
          {activeScenariosList.map((sc, idx) => {
            const isEnabled = sc.enabled !== false;
            const scColor = sc.color || ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'][idx % 6];
            const m = computeScenarioMetrics(sc);

            return (
              <div
                key={sc.id || `sc-${idx}`}
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: isEnabled ? `2px solid ${scColor}` : '1px dashed var(--border)',
                  background: isEnabled ? `${scColor}10` : 'rgba(0,0,0,0.02)',
                  opacity: isEnabled ? 1 : 0.65,
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  cursor: 'pointer',
                }}
                onClick={() => sc.id && handleToggle(sc.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        border: `2px solid ${scColor}`,
                        background: isEnabled ? scColor : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    >
                      {isEnabled && '✓'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isEnabled ? 'var(--text-heading)' : 'var(--text-muted)' }}>
                        {sc.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {sc.cameras} Cams · {sc.resolutionPreset.toUpperCase()} · {sc.codec.toUpperCase()} · {sc.retentionDays}d ({sc.recordingPct}%)
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isEnabled ? scColor : 'var(--text-muted)' }}>
                      {m.totalNeedTb.toFixed(1)} TB
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {m.drivesNeeded} × {m.safeDriveTb}TB
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '8px',
                    paddingTop: '6px',
                    borderTop: '1px solid var(--border)',
                    fontSize: '0.72rem',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <span style={{ color: 'var(--text-muted)' }}>
                    Daily: <strong>{m.totalDailyGb.toFixed(0)} GB/d</strong> (${m.totalHardDriveCost.toLocaleString()})
                  </span>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    {onApplyScenarioToCalculator && (
                      <button
                        type="button"
                        onClick={() => onApplyScenarioToCalculator(sc)}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${scColor}`,
                          borderRadius: '4px',
                          color: scColor,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          cursor: 'pointer',
                        }}
                        title="Load this camera configuration directly into the live calculator"
                      >
                        Load into Form
                      </button>
                    )}

                    {onDuplicateScenario && sc.id && (
                      <button
                        type="button"
                        onClick={() => onDuplicateScenario(sc.id!)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                        title="Duplicate scenario"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}

                    {onDeleteScenario && sc.id && activeScenariosList.length > 2 && (
                      <button
                        type="button"
                        onClick={() => onDeleteScenario(sc.id!)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--rose)',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                        title="Delete scenario"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Evolution Summary Cards: Tracking Capacity Evolution across Toggled Configurations */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {/* Usable Storage Evolution */}
        <div
          style={{
            padding: '14px 16px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            borderLeft: `4px solid ${overallDeltaTb > 0 ? 'var(--rose)' : overallDeltaTb < 0 ? 'var(--emerald)' : 'var(--accent)'}`,
          }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Storage Capacity Evolution
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)', marginTop: '2px' }}>
            {baseline.totalNeedTb.toFixed(1)} TB → {finalScenario.totalNeedTb.toFixed(1)} TB
          </div>
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              marginTop: '4px',
              color: overallDeltaTb > 0 ? 'var(--rose)' : overallDeltaTb < 0 ? 'var(--emerald)' : 'var(--text-muted)',
            }}
          >
            {overallDeltaTb > 0 ? `+${overallDeltaTb.toFixed(1)} TB (+${overallDeltaPct.toFixed(0)}% Growth)` : overallDeltaTb < 0 ? `${overallDeltaTb.toFixed(1)} TB (${overallDeltaPct.toFixed(0)}% Saved)` : 'Baseline Baseline (No Net Change)'}
          </div>
        </div>

        {/* Drive Count Evolution */}
        <div
          style={{
            padding: '14px 16px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            borderLeft: '4px solid var(--accent)',
          }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Drive Bay Scalability
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)', marginTop: '2px' }}>
            {baseline.drivesNeeded} Disks → {finalScenario.drivesNeeded} Disks
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {overallDeltaDrives > 0 ? `+${overallDeltaDrives} Drive Bays Needed` : overallDeltaDrives < 0 ? `${overallDeltaDrives} Fewer Drives` : 'Identical Drive Bay Footprint'}
          </div>
        </div>

        {/* Daily Ingestion Rate */}
        <div
          style={{
            padding: '14px 16px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            borderLeft: '4px solid var(--cyan)',
          }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Daily Write Ingestion
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)', marginTop: '2px' }}>
            {baseline.totalDailyGb.toFixed(0)} GB/d → {finalScenario.totalDailyGb.toFixed(0)} GB/d
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--cyan)', marginTop: '4px', fontWeight: 600 }}>
            {baseline.totalBandwidthMbps.toFixed(0)} Mbps → {finalScenario.totalBandwidthMbps.toFixed(0)} Mbps Network
          </div>
        </div>

        {/* Hard Drive BOM Cost Evolution */}
        <div
          style={{
            padding: '14px 16px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            borderLeft: '4px solid #a78bfa',
          }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Hard Drive BOM Variance
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)', marginTop: '2px' }}>
            ${baseline.totalHardDriveCost.toLocaleString()} → ${finalScenario.totalHardDriveCost.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              marginTop: '4px',
              color: overallDeltaCost > 0 ? 'var(--rose)' : overallDeltaCost < 0 ? 'var(--emerald)' : 'var(--text-muted)',
            }}
          >
            {overallDeltaCost > 0 ? `+$${overallDeltaCost.toLocaleString()} Investment` : overallDeltaCost < 0 ? `-$${Math.abs(overallDeltaCost).toLocaleString()} Cost Savings` : '$0 Net Variance'}
          </div>
        </div>
      </div>

      {/* View Sub-Tabs: Evolution Chart vs Step-by-Step vs Matrix Table */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          marginBottom: '16px',
          paddingBottom: '8px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setViewTab('evolution')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: viewTab === 'evolution' ? '1px solid var(--accent)' : '1px solid transparent',
              background: viewTab === 'evolution' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: viewTab === 'evolution' ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <BarChart3 className="w-4 h-4" />
            Evolution Trajectory &amp; Pipeline
          </button>
          <button
            type="button"
            onClick={() => setViewTab('matrix')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: viewTab === 'matrix' ? '1px solid var(--accent)' : '1px solid transparent',
              background: viewTab === 'matrix' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: viewTab === 'matrix' ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Grid className="w-4 h-4" />
            Comparative Specification Matrix
          </button>
          <button
            type="button"
            onClick={() => setViewTab('tune')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: viewTab === 'tune' ? '1px solid var(--accent)' : '1px solid transparent',
              background: viewTab === 'tune' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: viewTab === 'tune' ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sliders className="w-4 h-4" />
            Tune Scenario Parameters
          </button>
        </div>

        {viewTab === 'evolution' && (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: '4px' }}>Chart Metric:</span>
            {(['storage', 'ingestion', 'drives', 'cost'] as const).map(mKey => (
              <button
                key={mKey}
                type="button"
                onClick={() => setChartMetric(mKey)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  border: chartMetric === mKey ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: chartMetric === mKey ? 'var(--accent)' : 'var(--bg)',
                  color: chartMetric === mKey ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                {mKey === 'storage' && 'Storage (TB)'}
                {mKey === 'ingestion' && 'Ingestion (GB/d)'}
                {mKey === 'drives' && 'Drive Count'}
                {mKey === 'cost' && 'BOM Cost ($)'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab 1: Evolution Trajectory Chart & Step-by-Step Evolution Pipeline */}
      {viewTab === 'evolution' && (
        <div>
          {/* Chart Section */}
          <div
            style={{
              background: 'var(--bg)',
              borderRadius: '12px',
              padding: '18px',
              border: '1px solid var(--border)',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                  Capacity Evolution Trajectory across Active Configurations
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Visual comparison showing how total storage capacity demands evolve across each configuration set.
                </p>
              </div>
            </div>

            <div style={{ width: '100%', height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                  <XAxis
                    dataKey="name"
                    stroke="var(--text-muted)"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-12}
                    textAnchor="end"
                  />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text-heading)',
                      fontSize: '0.78rem',
                    }}
                    formatter={(val: any, name: string) => {
                      if (name === 'usableTb') return [`${val} TB`, 'Usable Storage Needed'];
                      if (name === 'parityTb') return [`${val} TB`, 'RAID Parity Overhead'];
                      if (name === 'dailyGb') return [`${val} GB/day`, 'Daily Ingestion Rate'];
                      if (name === 'drives') return [`${val} Disks`, 'Drives Required'];
                      if (name === 'cost') return [`$${Number(val).toLocaleString()}`, 'BOM Investment'];
                      return [val, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.78rem', paddingTop: '10px' }} />

                  {chartMetric === 'storage' && (
                    <>
                      <Bar dataKey="usableTb" name="Usable Storage (TB)" fill="var(--accent)" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-usable-${index}`} fill={entry.color || 'var(--accent)'} />
                        ))}
                      </Bar>
                      <Bar dataKey="parityTb" name="RAID Parity (TB)" fill="rgba(148, 163, 184, 0.45)" radius={[4, 4, 0, 0]} />
                    </>
                  )}

                  {chartMetric === 'ingestion' && (
                    <Bar dataKey="dailyGb" name="Daily Ingestion (GB/day)" fill="#06b6d4" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-ingest-${index}`} fill={entry.color || '#06b6d4'} />
                      ))}
                    </Bar>
                  )}

                  {chartMetric === 'drives' && (
                    <Bar dataKey="drives" name="Disks Required" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-drives-${index}`} fill={entry.color || '#8b5cf6'} />
                      ))}
                    </Bar>
                  )}

                  {chartMetric === 'cost' && (
                    <Bar dataKey="cost" name="Hard Drive Cost ($)" fill="#10b981" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-cost-${index}`} fill={entry.color || '#10b981'} />
                      ))}
                    </Bar>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Step-by-Step Evolution Pipeline / Changelog */}
          {evolutionSteps.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                Sequential Configuration Evolution Pipeline
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {evolutionSteps.map((st, i) => (
                  <div
                    key={`step-${i}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      fontSize: '0.8rem',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'rgba(99, 102, 241, 0.2)',
                          color: 'var(--accent)',
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <strong>{st.from.name}</strong> → <strong>{st.to.name}</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Primary Driver: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{st.highlight}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Storage Variance</div>
                        <strong
                          style={{
                            color: st.direction === 'increase' ? 'var(--rose)' : st.direction === 'decrease' ? 'var(--emerald)' : 'var(--text-muted)',
                            fontSize: '0.9rem',
                          }}
                        >
                          {st.deltaTb > 0 ? `+${st.deltaTb.toFixed(1)} TB` : `${st.deltaTb.toFixed(1)} TB`} ({st.deltaPct >= 0 ? `+${st.deltaPct.toFixed(0)}%` : `${st.deltaPct.toFixed(0)}%`})
                        </strong>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Drive Count</div>
                        <span style={{ fontWeight: 600 }}>
                          {st.deltaDrives > 0 ? `+${st.deltaDrives} Drives` : st.deltaDrives < 0 ? `${st.deltaDrives} Drives` : 'Same'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Comparative Specification Matrix Table */}
      {viewTab === 'matrix' && (
        <div style={{ overflowX: 'auto', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.06)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px 12px' }}>Scenario</th>
                <th style={{ padding: '10px 12px' }}>Cameras &amp; Res</th>
                <th style={{ padding: '10px 12px' }}>Codec &amp; Rate</th>
                <th style={{ padding: '10px 12px' }}>Retention</th>
                <th style={{ padding: '10px 12px' }}>Daily Ingestion</th>
                <th style={{ padding: '10px 12px' }}>Usable TB</th>
                <th style={{ padding: '10px 12px' }}>Drives &amp; RAID</th>
                <th style={{ padding: '10px 12px' }}>BOM Cost</th>
                <th style={{ padding: '10px 12px' }}>Variance vs #1</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {computedMetricsList.map((m, idx) => {
                const diffTb = m.totalNeedTb - baseline.totalNeedTb;
                const diffPct = baseline.totalNeedTb > 0 ? (diffTb / baseline.totalNeedTb) * 100 : 0;
                const scColor = m.color || '#6366f1';

                return (
                  <tr
                    key={`mat-${m.id || idx}`}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                    }}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: scColor }} />
                        {m.name}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>{m.safeCams} Cams · {m.resolutionPreset.toUpperCase()}</td>
                    <td style={{ padding: '10px 12px' }}>{m.codec.toUpperCase()} · {m.safeMbps} Mbps</td>
                    <td style={{ padding: '10px 12px' }}>{m.safeDays} Days ({m.safeRec}%)</td>
                    <td style={{ padding: '10px 12px' }}>{m.totalDailyGb.toFixed(0)} GB/d</td>
                    <td style={{ padding: '10px 12px', fontWeight: 800, color: scColor }}>
                      {m.totalNeedTb.toFixed(1)} TB
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {m.drivesNeeded} × {m.safeDriveTb}TB ({m.raidType.toUpperCase()})
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                      ${m.totalHardDriveCost.toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {idx === 0 ? (
                        <span style={{ color: 'var(--text-muted)' }}>Baseline</span>
                      ) : (
                        <span
                          style={{
                            fontWeight: 700,
                            color: diffTb > 0 ? 'var(--rose)' : diffTb < 0 ? 'var(--emerald)' : 'var(--text-muted)',
                          }}
                        >
                          {diffTb > 0 ? `+${diffTb.toFixed(1)} TB` : `${diffTb.toFixed(1)} TB`} ({diffPct >= 0 ? `+${diffPct.toFixed(0)}%` : `${diffPct.toFixed(0)}%`})
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {onApplyScenarioToCalculator && (
                        <button
                          type="button"
                          onClick={() => onApplyScenarioToCalculator(m)}
                          className="button button-secondary"
                          style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                        >
                          Apply to Form
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Tune Scenario Parameters Inline */}
      {viewTab === 'tune' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
          {activeScenariosList.map((sc, idx) => {
            const scColor = sc.color || '#6366f1';
            const m = computeScenarioMetrics(sc);

            return (
              <div
                key={`tune-${sc.id || idx}`}
                style={{
                  background: 'var(--bg)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: `2px solid ${scColor}50`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: scColor }} />
                    <input
                      type="text"
                      value={sc.name}
                      onChange={e => sc.id && handleUpdate(sc.id, { name: e.target.value })}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid var(--border)',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        color: 'var(--text-heading)',
                        width: '180px',
                      }}
                    />
                  </div>
                  <strong style={{ color: scColor }}>{m.totalNeedTb.toFixed(1)} TB</strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.78rem' }}>
                  {/* Cameras */}
                  <div>
                    <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '2px' }}>Cameras</label>
                    <input
                      type="number"
                      min={1}
                      max={256}
                      value={sc.cameras}
                      onChange={e => sc.id && handleUpdate(sc.id, { cameras: Math.max(1, parseInt(e.target.value) || 1) })}
                      style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-heading)' }}
                    />
                  </div>

                  {/* Resolution */}
                  <div>
                    <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '2px' }}>Resolution</label>
                    <select
                      value={sc.resolutionPreset}
                      onChange={e => {
                        const newRes = e.target.value as ResolutionPresetKey;
                        const newMbps = newRes !== 'custom' ? RESOLUTION_BITRATES[newRes][sc.codec] : sc.bitrateMbps;
                        if (sc.id) handleUpdate(sc.id, { resolutionPreset: newRes, bitrateMbps: newMbps });
                      }}
                      style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-heading)' }}
                    >
                      <option value="720p">720p HD</option>
                      <option value="1080p">1080p FHD</option>
                      <option value="3mp">3MP QHD</option>
                      <option value="4mp">4MP QHD</option>
                      <option value="5mp">5MP</option>
                      <option value="4k">4K Ultra-HD</option>
                      <option value="12mp">12MP Ultra-HD</option>
                      <option value="custom">Custom Bitrate</option>
                    </select>
                  </div>

                  {/* Codec */}
                  <div>
                    <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '2px' }}>Codec</label>
                    <select
                      value={sc.codec}
                      onChange={e => {
                        const newCodec = e.target.value as CodecKey;
                        const newMbps = sc.resolutionPreset !== 'custom' ? RESOLUTION_BITRATES[sc.resolutionPreset][newCodec] : sc.bitrateMbps;
                        if (sc.id) handleUpdate(sc.id, { codec: newCodec, bitrateMbps: newMbps });
                      }}
                      style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-heading)' }}
                    >
                      <option value="h264">H.264 (AVC)</option>
                      <option value="h265">H.265 (HEVC)</option>
                    </select>
                  </div>

                  {/* Retention Days */}
                  <div>
                    <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '2px' }}>Retention Days</label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={sc.retentionDays}
                      onChange={e => sc.id && handleUpdate(sc.id, { retentionDays: Math.max(1, parseInt(e.target.value) || 1) })}
                      style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-heading)' }}
                    />
                  </div>

                  {/* Duty Cycle */}
                  <div>
                    <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '2px' }}>Duty Cycle (%)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={sc.recordingPct}
                      onChange={e => sc.id && handleUpdate(sc.id, { recordingPct: Math.min(100, Math.max(1, parseInt(e.target.value) || 100)) })}
                      style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-heading)' }}
                    />
                  </div>

                  {/* RAID Type */}
                  <div>
                    <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '2px' }}>RAID Type</label>
                    <select
                      value={sc.raidType}
                      onChange={e => sc.id && handleUpdate(sc.id, { raidType: e.target.value as RaidTypeKey })}
                      style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-heading)' }}
                    >
                      <option value="none">No RAID (JBOD)</option>
                      <option value="raid0">RAID 0 (Striping)</option>
                      <option value="raid1">RAID 1 (Mirror)</option>
                      <option value="raid5">RAID 5 (1 Parity)</option>
                      <option value="raid6">RAID 6 (2 Parities)</option>
                      <option value="raid10">RAID 10 (Striped Mirrors)</option>
                    </select>
                  </div>
                </div>

                {onApplyScenarioToCalculator && (
                  <button
                    type="button"
                    onClick={() => onApplyScenarioToCalculator(sc)}
                    className="button button-secondary"
                    style={{ width: '100%', marginTop: '12px', fontSize: '0.75rem', padding: '4px' }}
                  >
                    Load into Form ({m.totalNeedTb.toFixed(1)} TB)
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
