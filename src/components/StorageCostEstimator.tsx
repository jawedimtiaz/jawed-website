import React, { useState } from 'react';
import {
  DollarSign,
  HardDrive,
  Server,
  Layers,
  ShieldCheck,
  TrendingUp,
  Percent,
  Check,
  Info,
  ChevronDown,
  ChevronUp,
  Cpu,
  Sparkles,
  ArrowRightLeft,
  Calendar,
  Camera,
  Coins,
} from 'lucide-react';

export interface StorageCostEstimatorProps {
  // Mode & Pricing inputs
  costInputMode: 'per_tb' | 'per_drive';
  onCostInputModeChange: (mode: 'per_tb' | 'per_drive') => void;
  pricePerTb: number;
  onPricePerTbChange: (val: number) => void;
  pricePerDrive: number;
  onPricePerDriveChange: (val: number) => void;
  driveSizeTb: number;

  // System & RAID metrics
  drivesNeeded: number;
  usableStorageTb: number;
  rawStorageTb: number;
  parityStorageTb: number;
  raidType: string;
  cameras: number;
  retentionDays: number;
  possible: boolean;

  // Optional NVR Chassis & Hot Spares
  includeNvrCost: boolean;
  onIncludeNvrCostChange: (val: boolean) => void;
  nvrCostType: 'per_bay' | 'fixed';
  onNvrCostTypeChange: (val: 'per_bay' | 'fixed') => void;
  nvrCostPerBay: number;
  onNvrCostPerBayChange: (val: number) => void;
  nvrFixedCost: number;
  onNvrFixedCostChange: (val: number) => void;
  hotSparesCount: number;
  onHotSparesCountChange: (val: number) => void;

  isDarkMode?: boolean;
}

export interface DriveMarketTier {
  id: string;
  name: string;
  pricePerTb: number;
  tierLabel: string;
  description: string;
  rpm: string;
  workload: string;
  color: string;
}

export const DRIVE_MARKET_TIERS: DriveMarketTier[] = [
  {
    id: 'budget-surv',
    name: 'Entry Surveillance',
    pricePerTb: 18,
    tierLabel: 'Budget / Entry',
    description: 'WD Purple / Seagate SkyHawk (5400-5900 RPM, 64-128MB cache)',
    rpm: '5,400 RPM',
    workload: '180 TB/yr',
    color: '#38bdf8',
  },
  {
    id: 'standard-comm',
    name: 'Commercial Surveillance',
    pricePerTb: 22,
    tierLabel: 'Most Common',
    description: 'WD Purple / SkyHawk 7200 RPM with RV sensors & AllFrame',
    rpm: '7,200 RPM',
    workload: '180-300 TB/yr',
    color: '#10b981',
  },
  {
    id: 'enterprise-ai',
    name: 'Enterprise AI & Analytics',
    pricePerTb: 26,
    tierLabel: 'Enterprise AI',
    description: 'WD Purple Pro / SkyHawk AI (High concurrency, Deep learning)',
    rpm: '7,200 RPM',
    workload: '550 TB/yr',
    color: '#f59e0b',
  },
  {
    id: 'datacenter-exos',
    name: 'Datacenter Nearline',
    pricePerTb: 30,
    tierLabel: 'Mission Critical',
    description: 'Seagate Exos X20 / WD Ultrastar (2.5M hr MTBF, SAS/SATA)',
    rpm: '7,200 RPM',
    workload: '550 TB/yr',
    color: '#8b5cf6',
  },
  {
    id: 'enterprise-ssd',
    name: 'Enterprise Flash / NVMe',
    pricePerTb: 55,
    tierLabel: 'Extreme IOPS',
    description: 'Enterprise U.2 / SATA SSD for ultra-low latency playback',
    rpm: 'Solid State',
    workload: '1 DWPD',
    color: '#ec4899',
  },
];

export const StorageCostEstimator: React.FC<StorageCostEstimatorProps> = ({
  costInputMode,
  onCostInputModeChange,
  pricePerTb,
  onPricePerTbChange,
  pricePerDrive,
  onPricePerDriveChange,
  driveSizeTb,
  drivesNeeded,
  usableStorageTb,
  rawStorageTb,
  parityStorageTb,
  raidType,
  cameras,
  retentionDays,
  possible,
  includeNvrCost,
  onIncludeNvrCostChange,
  nvrCostType,
  onNvrCostTypeChange,
  nvrCostPerBay,
  onNvrCostPerBayChange,
  nvrFixedCost,
  onNvrFixedCostChange,
  hotSparesCount,
  onHotSparesCountChange,
  isDarkMode = true,
}) => {
  const [showAdvancedEnclosure, setShowAdvancedEnclosure] = useState<boolean>(includeNvrCost || hotSparesCount > 0);

  const safeDriveTb = Math.max(0.5, driveSizeTb || 1);
  const safeDrives = possible ? Math.max(0, drivesNeeded) : 0;
  const safeSpares = possible ? Math.max(0, hotSparesCount) : 0;
  const totalDrivesWithSpares = safeDrives + safeSpares;

  // Synchronized values
  const effectivePricePerDrive = costInputMode === 'per_drive' ? pricePerDrive : pricePerTb * safeDriveTb;
  const effectivePricePerTb = costInputMode === 'per_tb' ? pricePerTb : (safeDriveTb > 0 ? pricePerDrive / safeDriveTb : 0);

  // Core Storage Hardware Cost
  const baseDrivesCost = safeDrives * effectivePricePerDrive;
  const sparesCost = safeSpares * effectivePricePerDrive;
  const totalDrivesCost = baseDrivesCost + sparesCost;

  // Chassis / NVR cost
  const nvrChassisCost = includeNvrCost && possible
    ? (nvrCostType === 'per_bay' ? totalDrivesWithSpares * nvrCostPerBay : nvrFixedCost)
    : 0;

  const totalHardwareInvestment = totalDrivesCost + nvrChassisCost;

  // Per-unit breakdown
  const costPerCamera = cameras > 0 ? totalHardwareInvestment / cameras : 0;
  const costPerDay = retentionDays > 0 ? totalHardwareInvestment / retentionDays : 0;
  const costPerUsableTb = usableStorageTb > 0 ? totalHardwareInvestment / usableStorageTb : 0;
  const costPerRawTb = rawStorageTb > 0 ? totalHardwareInvestment / rawStorageTb : 0;

  // Parity breakdown
  let parityDrives = 0;
  if (raidType === 'raid1') parityDrives = Math.floor(safeDrives / 2);
  else if (raidType === 'raid5') parityDrives = 1;
  else if (raidType === 'raid6') parityDrives = 2;
  else if (raidType === 'raid10') parityDrives = Math.floor(safeDrives / 2);

  const usableDrives = Math.max(0, safeDrives - parityDrives);
  const usableDrivesCost = usableDrives * effectivePricePerDrive;
  const parityCost = parityDrives * effectivePricePerDrive;
  const parityCostPct = totalDrivesCost > 0 ? (parityCost / totalDrivesCost) * 100 : 0;

  // Handle tier preset selection
  const handleSelectTier = (tier: DriveMarketTier) => {
    onPricePerTbChange(tier.pricePerTb);
    onPricePerDriveChange(Math.round(tier.pricePerTb * safeDriveTb * 100) / 100);
  };

  return (
    <div
      className="panel"
      style={{
        padding: '22px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        marginTop: '16px',
        boxShadow: isDarkMode ? '0 4px 20px rgba(0, 0, 0, 0.25)' : '0 2px 12px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Header with Title and Mode Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '18px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '14px',
        }}
      >
        <div>
          <h3
            style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--text-heading)',
            }}
          >
            <Coins className="w-5 h-5 text-emerald-400" />
            Hardware Investment &amp; Cost Estimation
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Calculate total projected surveillance storage equipment investment by capacity rate or per-drive unit cost.
          </p>
        </div>

        {/* Dual Mode Switcher Tabs */}
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '3px',
            gap: '2px',
          }}
        >
          <button
            type="button"
            onClick={() => onCostInputModeChange('per_tb')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: costInputMode === 'per_tb' ? 700 : 500,
              borderRadius: '7px',
              background: costInputMode === 'per_tb' ? 'var(--emerald)' : 'transparent',
              color: costInputMode === 'per_tb' ? '#ffffff' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Layers className="w-3.5 h-3.5" />
            Price per TB ($/TB)
          </button>

          <button
            type="button"
            onClick={() => onCostInputModeChange('per_drive')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: costInputMode === 'per_drive' ? 700 : 500,
              borderRadius: '7px',
              background: costInputMode === 'per_drive' ? 'var(--emerald)' : 'transparent',
              color: costInputMode === 'per_drive' ? '#ffffff' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <HardDrive className="w-3.5 h-3.5" />
            Price per Drive ($/Drive)
          </button>
        </div>
      </div>

      {/* Dual Synchronized Price Inputs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px',
          marginBottom: '16px',
        }}
      >
        {/* Input 1: Price per TB */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '12px',
            background: costInputMode === 'per_tb' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg)',
            border: costInputMode === 'per_tb' ? '1.5px solid var(--emerald)' : '1px solid var(--border)',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label
              htmlFor="cost-calc-price-tb"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: costInputMode === 'per_tb' ? 'var(--emerald)' : 'var(--text-heading)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <DollarSign className="w-4 h-4" />
              Drive Price per TB ($/TB)
              {costInputMode === 'per_tb' && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    background: 'var(--emerald)',
                    color: '#ffffff',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 700,
                  }}
                >
                  ACTIVE
                </span>
              )}
            </label>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Storage density metric</span>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                fontSize: '1rem',
              }}
            >
              $
            </span>
            <input
              id="cost-calc-price-tb"
              type="number"
              step="0.5"
              min="0"
              max="500"
              value={effectivePricePerTb}
              onChange={e => {
                const val = Math.max(0, parseFloat(e.target.value) || 0);
                onPricePerTbChange(val);
                onPricePerDriveChange(Math.round(val * safeDriveTb * 100) / 100);
                if (costInputMode !== 'per_tb') onCostInputModeChange('per_tb');
              }}
              style={{
                width: '100%',
                paddingLeft: '28px',
                paddingRight: '64px',
                height: '40px',
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-heading)',
              }}
            />
            <span
              style={{
                position: 'absolute',
                right: '12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
              }}
            >
              / TB
            </span>
          </div>

          <div
            style={{
              marginTop: '6px',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Surveillance average: $20–$32/TB</span>
            <span>= ${(effectivePricePerTb * safeDriveTb).toFixed(0)} / {safeDriveTb}TB drive</span>
          </div>
        </div>

        {/* Input 2: Price per Storage Device / Drive */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '12px',
            background: costInputMode === 'per_drive' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg)',
            border: costInputMode === 'per_drive' ? '1.5px solid var(--emerald)' : '1px solid var(--border)',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label
              htmlFor="cost-calc-price-drive"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: costInputMode === 'per_drive' ? 'var(--emerald)' : 'var(--text-heading)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <HardDrive className="w-4 h-4" />
              Price per Storage Device ($/drive)
              {costInputMode === 'per_drive' && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    background: 'var(--emerald)',
                    color: '#ffffff',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 700,
                  }}
                >
                  ACTIVE
                </span>
              )}
            </label>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Single {safeDriveTb} TB unit</span>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                fontSize: '1rem',
              }}
            >
              $
            </span>
            <input
              id="cost-calc-price-drive"
              type="number"
              step="1"
              min="0"
              max="10000"
              value={effectivePricePerDrive}
              onChange={e => {
                const val = Math.max(0, parseFloat(e.target.value) || 0);
                onPricePerDriveChange(val);
                onPricePerTbChange(safeDriveTb > 0 ? Math.round((val / safeDriveTb) * 100) / 100 : 0);
                if (costInputMode !== 'per_drive') onCostInputModeChange('per_drive');
              }}
              style={{
                width: '100%',
                paddingLeft: '28px',
                paddingRight: '70px',
                height: '40px',
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-heading)',
              }}
            />
            <span
              style={{
                position: 'absolute',
                right: '12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
              }}
            >
              / drive
            </span>
          </div>

          <div
            style={{
              marginTop: '6px',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Unit for {safeDriveTb} TB HDD</span>
            <span>= ${effectivePricePerTb.toFixed(2)} / TB</span>
          </div>
        </div>
      </div>

      {/* Market Drive Pricing Presets */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Market Pricing Presets (Quick Apply)
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Auto-calculates $/TB &amp; ${safeDriveTb}TB drive price
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '8px',
          }}
        >
          {DRIVE_MARKET_TIERS.map(tier => {
            const isSelected = Math.abs(effectivePricePerTb - tier.pricePerTb) < 0.2;
            const driveEquivalent = Math.round(tier.pricePerTb * safeDriveTb);
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => handleSelectTier(tier)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg)',
                  border: isSelected ? '1.5px solid var(--emerald)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                    {tier.name}
                  </span>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: isSelected ? 'var(--emerald)' : tier.color,
                    }}
                  >
                    ${tier.pricePerTb}/TB
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  ${driveEquivalent} per {safeDriveTb}TB drive
                </div>
                <div
                  style={{
                    fontSize: '0.66rem',
                    color: 'var(--text-muted)',
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={tier.description}
                >
                  {tier.workload} • {tier.rpm}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Enclosure & Hot Spares Accordion */}
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: '10px',
          background: 'var(--bg)',
          marginBottom: '18px',
          overflow: 'hidden',
        }}
      >
        <button
          type="button"
          onClick={() => setShowAdvancedEnclosure(!showAdvancedEnclosure)}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-heading)',
            cursor: 'pointer',
            fontSize: '0.82rem',
            fontWeight: 700,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server className="w-4 h-4 text-sky-400" />
            <span>Optional Hardware Add-ons: NVR Server Enclosure &amp; Hot Spares</span>
            {(includeNvrCost || hotSparesCount > 0) && (
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(56, 189, 248, 0.2)',
                  color: '#38bdf8',
                  fontWeight: 700,
                }}
              >
                CONFIGURED (+${(nvrChassisCost + sparesCost).toLocaleString()})
              </span>
            )}
          </div>
          {showAdvancedEnclosure ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvancedEnclosure && (
          <div style={{ padding: '14px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {/* Hot Spares Selector */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-heading)', display: 'block', marginBottom: '6px' }}>
                Budget Hot / Cold Spare Drives
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[0, 1, 2, 4].map(count => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => onHotSparesCountChange(count)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: '0.75rem',
                      fontWeight: hotSparesCount === count ? 800 : 500,
                      borderRadius: '6px',
                      background: hotSparesCount === count ? 'var(--sky)' : 'var(--surface)',
                      color: hotSparesCount === count ? '#ffffff' : 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                  >
                    {count === 0 ? 'None (0)' : `+${count} Spare${count > 1 ? 's' : ''}`}
                  </button>
                ))}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {hotSparesCount > 0
                  ? `Adds ${hotSparesCount} × ${safeDriveTb}TB ($${sparesCost.toLocaleString()}) to hardware procurement.`
                  : 'No dedicated spare drives included in budget.'}
              </p>
            </div>

            {/* NVR Enclosure Budget Toggle */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                  Include NVR / Chassis Bay Cost
                </label>
                <input
                  type="checkbox"
                  id="include-nvr"
                  checked={includeNvrCost}
                  onChange={e => onIncludeNvrCostChange(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--emerald)', cursor: 'pointer' }}
                />
              </div>

              {includeNvrCost ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={nvrCostType}
                    onChange={e => onNvrCostTypeChange(e.target.value as 'per_bay' | 'fixed')}
                    style={{
                      padding: '5px 8px',
                      fontSize: '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text-heading)',
                    }}
                  >
                    <option value="per_bay">Per Bay ($/bay)</option>
                    <option value="fixed">Fixed Chassis ($)</option>
                  </select>

                  {nvrCostType === 'per_bay' ? (
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                      <span style={{ position: 'absolute', left: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>$</span>
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={nvrCostPerBay}
                        onChange={e => onNvrCostPerBayChange(Math.max(0, parseFloat(e.target.value) || 0))}
                        style={{
                          width: '100%',
                          paddingLeft: '20px',
                          paddingRight: '45px',
                          height: '32px',
                          fontSize: '0.8rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text-heading)',
                        }}
                      />
                      <span style={{ position: 'absolute', right: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>/bay</span>
                    </div>
                  ) : (
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                      <span style={{ position: 'absolute', left: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>$</span>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={nvrFixedCost}
                        onChange={e => onNvrFixedCostChange(Math.max(0, parseFloat(e.target.value) || 0))}
                        style={{
                          width: '100%',
                          paddingLeft: '20px',
                          height: '32px',
                          fontSize: '0.8rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text-heading)',
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Enable to factor recorder chassis / server rack enclosure into project investment.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Projected Investment Cost Breakdown Cards */}
      {possible ? (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            {/* Total Projected Investment Card */}
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1.5px solid rgba(16, 185, 129, 0.35)',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--emerald)', textTransform: 'uppercase' }}>
                Total Projected Hardware Investment
              </div>
              <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--emerald)', margin: '4px 0' }}>
                ${totalHardwareInvestment.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {safeDrives} array drives {safeSpares > 0 ? `+ ${safeSpares} spares ` : ''}
                {nvrChassisCost > 0 ? `+ $${nvrChassisCost.toLocaleString()} NVR` : ''}
              </div>
            </div>

            {/* Cost Per Camera Channel */}
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Cost per Camera Channel
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-heading)', margin: '4px 0' }}>
                ${costPerCamera.toFixed(0)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Across {cameras} recording channels
              </div>
            </div>

            {/* Cost Per Retention Day */}
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Cost per Day of Retention
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-heading)', margin: '4px 0' }}>
                ${costPerDay.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Across {retentionDays} days archive footprint
              </div>
            </div>

            {/* Effective Cost per Usable TB */}
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Effective $/Usable TB
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-heading)', margin: '4px 0' }}>
                ${costPerUsableTb.toFixed(1)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Factoring RAID parity loss ({usableStorageTb.toFixed(1)} TB usable)
              </div>
            </div>
          </div>

          {/* RAID Parity Investment Share & Protection Breakdown */}
          {safeDrives > 1 && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  RAID Redundancy &amp; Parity Protection Cost Share
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {raidType.toUpperCase()}: {parityDrives} parity drive{parityDrives > 1 ? 's' : ''} (${parityCost.toLocaleString()} parity overhead)
                </span>
              </div>

              {/* Visual Split Bar */}
              <div
                style={{
                  height: '10px',
                  borderRadius: '5px',
                  background: 'var(--surface)',
                  overflow: 'hidden',
                  display: 'flex',
                  border: '1px solid var(--border)',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    width: `${totalDrivesCost > 0 ? (usableDrivesCost / totalDrivesCost) * 100 : 100}%`,
                    background: '#10b981',
                    transition: 'width 0.3s ease',
                  }}
                  title={`Usable Data Storage: $${usableDrivesCost.toLocaleString()}`}
                />
                <div
                  style={{
                    width: `${totalDrivesCost > 0 ? (parityCost / totalDrivesCost) * 100 : 0}%`,
                    background: '#f59e0b',
                    transition: 'width 0.3s ease',
                  }}
                  title={`Parity / Mirroring Overhead: $${parityCost.toLocaleString()}`}
                />
                {sparesCost > 0 && (
                  <div
                    style={{
                      width: `${totalDrivesCost > 0 ? (sparesCost / totalDrivesCost) * 100 : 0}%`,
                      background: '#38bdf8',
                      transition: 'width 0.3s ease',
                    }}
                    title={`Hot Spares: $${sparesCost.toLocaleString()}`}
                  />
                )}
              </div>

              {/* Legend & Details */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  <span>Usable Video: <strong>{usableDrives} drives</strong> (${usableDrivesCost.toLocaleString()})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                  <span>RAID Parity / Mirror: <strong>{parityDrives} drive{parityDrives > 1 ? 's' : ''}</strong> (${parityCost.toLocaleString()} • {parityCostPct.toFixed(0)}%)</span>
                </div>
                {safeSpares > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} />
                    <span>Hot Spares: <strong>{safeSpares} drive{safeSpares > 1 ? 's' : ''}</strong> (${sparesCost.toLocaleString()})</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: 'var(--rose)',
            fontSize: '0.85rem',
            textAlign: 'center',
          }}
        >
          Selected RAID configuration exceeds 64 bays. Select a larger drive capacity to calculate hardware investment.
        </div>
      )}
    </div>
  );
};
