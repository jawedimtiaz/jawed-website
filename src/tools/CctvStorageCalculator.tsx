import React, { useState, useEffect, useMemo } from 'react';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import {
  HardDrive,
  Camera,
  Calendar,
  Layers,
  Copy,
  Check,
  Printer,
  RotateCcw,
  Info,
  Server,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export type ResolutionPresetKey = '1080p' | '4mp' | '5mp' | '4k' | 'custom';
export type CodecKey = 'h265' | 'h264';
export type RaidTypeKey = 'none' | 'raid0' | 'raid1' | 'raid5' | 'raid6' | 'raid10';

interface PresetOption {
  name: string;
  resKey: ResolutionPresetKey;
  codec: CodecKey;
  cameras: number;
  retentionDays: number;
  recordingPct: number;
  headroomPct: number;
  driveSizeTb: number;
  raidType: RaidTypeKey;
  description: string;
}

const QUICK_PRESETS: PresetOption[] = [
  {
    name: 'Home / SOHO',
    resKey: '1080p',
    codec: 'h265',
    cameras: 4,
    retentionDays: 15,
    recordingPct: 80,
    headroomPct: 15,
    driveSizeTb: 4,
    raidType: 'raid1',
    description: '4x 1080p cameras, 15 days retention, motion detection, RAID 1 mirror protection.',
  },
  {
    name: 'Retail Store',
    resKey: '4mp',
    codec: 'h265',
    cameras: 16,
    retentionDays: 30,
    recordingPct: 100,
    headroomPct: 15,
    driveSizeTb: 8,
    raidType: 'raid5',
    description: '16x 4MP cameras, 30 days continuous recording, balanced RAID 5 single-parity storage.',
  },
  {
    name: 'Warehouse',
    resKey: '4mp',
    codec: 'h265',
    cameras: 32,
    retentionDays: 45,
    recordingPct: 90,
    headroomPct: 20,
    driveSizeTb: 12,
    raidType: 'raid6',
    description: '32x 4MP cameras, 45 days retention, dual-parity RAID 6 safeguarding large capacity drives.',
  },
  {
    name: 'Enterprise',
    resKey: '4k',
    codec: 'h265',
    cameras: 64,
    retentionDays: 60,
    recordingPct: 100,
    headroomPct: 20,
    driveSizeTb: 16,
    raidType: 'raid6',
    description: '64x 4K Ultra-HD cameras, 60 days continuous 24/7 recording with enterprise RAID 6 protection.',
  },
];

const RESOLUTION_BITRATES: Record<Exclude<ResolutionPresetKey, 'custom'>, Record<CodecKey, number>> = {
  '1080p': { h264: 4.0, h265: 2.0 },
  '4mp': { h264: 6.0, h265: 3.0 },
  '5mp': { h264: 8.0, h265: 4.0 },
  '4k': { h264: 12.0, h265: 6.0 },
};

const RAID_DEFINITIONS: Record<
  RaidTypeKey,
  {
    label: string;
    min: number;
    use: (n: number) => number;
    faultTolerance: string;
    description: string;
    suitability: string;
  }
> = {
  none: {
    label: 'None (JBOD / Single Pool)',
    min: 1,
    use: n => n,
    faultTolerance: '0 drives (Any drive loss loses data)',
    description: 'All drives pooled without parity. Maximum capacity, but zero fault protection.',
    suitability: 'Non-critical consumer setups only. Not recommended for security installations.',
  },
  raid0: {
    label: 'RAID 0 (Striped Array)',
    min: 2,
    use: n => n,
    faultTolerance: '0 drives (1 drive failure loses ALL data)',
    description: 'Striped block level across drives. High speed write, 100% capacity, extreme failure risk.',
    suitability: 'Never recommended for CCTV; catastrophic data loss on single disk failure.',
  },
  raid1: {
    label: 'RAID 1 (Mirrored Pair)',
    min: 2,
    use: n => (n % 2 === 0 ? n / 2 : 0),
    faultTolerance: '1 drive per pair (50% capacity)',
    description: '1-to-1 disk mirroring. Simple and resilient, but consumes 50% of raw disk space for redundancy.',
    suitability: 'Ideal for 2-bay small business and home NVRs.',
  },
  raid5: {
    label: 'RAID 5 (Single Distributed Parity)',
    min: 3,
    use: n => n - 1,
    faultTolerance: '1 drive failure tolerated',
    description: 'Distributed parity block striping. Retains capacity of N-1 drives.',
    suitability: 'Most common surveillance sweet spot for 4 to 8 bay recorders.',
  },
  raid6: {
    label: 'RAID 6 (Dual Distributed Parity)',
    min: 4,
    use: n => n - 2,
    faultTolerance: '2 simultaneous drive failures tolerated',
    description: 'Two independent parity blocks. Retains capacity of N-2 drives, survives rebuild stress.',
    suitability: 'Recommended standard for large 8TB+ drives and enterprise 8+ bay SAN/NVRs.',
  },
  raid10: {
    label: 'RAID 10 (Striped Mirrors 1+0)',
    min: 4,
    use: n => (n % 2 === 0 ? n / 2 : 0),
    faultTolerance: '1 to 2 drives (1 per mirrored pair)',
    description: 'Combines mirroring and striping. Fast rebuild times without heavy parity recalculation.',
    suitability: 'Best for ultra high-throughput write environments and massive camera deployments.',
  },
};

const POPULAR_DRIVE_SIZES = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

export const CctvStorageCalculator: React.FC = () => {
  const [cameras, setCameras] = useState<number>(() => {
    try {
      const v = localStorage.getItem('cctv_calc_cams');
      return v ? Math.max(1, parseInt(v, 10) || 16) : 16;
    } catch {
      return 16;
    }
  });

  const [resolutionPreset, setResolutionPreset] = useState<ResolutionPresetKey>(() => {
    try {
      const v = localStorage.getItem('cctv_calc_res');
      return (v as ResolutionPresetKey) || '1080p';
    } catch {
      return '1080p';
    }
  });

  const [codec, setCodec] = useState<CodecKey>(() => {
    try {
      const v = localStorage.getItem('cctv_calc_codec');
      return (v as CodecKey) || 'h265';
    } catch {
      return 'h265';
    }
  });

  const [bitrateMbps, setBitrateMbps] = useState<number>(() => {
    try {
      const v = localStorage.getItem('cctv_calc_mbps');
      return v ? Math.max(0.1, parseFloat(v) || 2.0) : 2.0;
    } catch {
      return 2.0;
    }
  });

  const [retentionDays, setRetentionDays] = useState<number>(() => {
    try {
      const v = localStorage.getItem('cctv_calc_days');
      return v ? Math.max(1, parseInt(v, 10) || 30) : 30;
    } catch {
      return 30;
    }
  });

  const [recordingPct, setRecordingPct] = useState<number>(() => {
    try {
      const v = localStorage.getItem('cctv_calc_rec');
      return v ? Math.min(100, Math.max(1, parseInt(v, 10) || 100)) : 100;
    } catch {
      return 100;
    }
  });

  const [headroomPct, setHeadroomPct] = useState<number>(() => {
    try {
      const v = localStorage.getItem('cctv_calc_head');
      return v !== null ? Math.max(0, parseInt(v, 10) || 15) : 15;
    } catch {
      return 15;
    }
  });

  const [driveSizeTb, setDriveSizeTb] = useState<number>(() => {
    try {
      const v = localStorage.getItem('cctv_calc_drv');
      return v ? Math.max(0.5, parseFloat(v) || 8) : 8;
    } catch {
      return 8;
    }
  });

  const [raidType, setRaidType] = useState<RaidTypeKey>(() => {
    try {
      const v = localStorage.getItem('cctv_calc_raid');
      return (v as RaidTypeKey) || 'raid5';
    } catch {
      return 'raid5';
    }
  });

  const [copiedSummary, setCopiedSummary] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('cctv_calc_cams', String(cameras));
      localStorage.setItem('cctv_calc_res', resolutionPreset);
      localStorage.setItem('cctv_calc_codec', codec);
      localStorage.setItem('cctv_calc_mbps', String(bitrateMbps));
      localStorage.setItem('cctv_calc_days', String(retentionDays));
      localStorage.setItem('cctv_calc_rec', String(recordingPct));
      localStorage.setItem('cctv_calc_head', String(headroomPct));
      localStorage.setItem('cctv_calc_drv', String(driveSizeTb));
      localStorage.setItem('cctv_calc_raid', raidType);
    } catch {
      // Ignore quota errors
    }
  }, [
    cameras,
    resolutionPreset,
    codec,
    bitrateMbps,
    retentionDays,
    recordingPct,
    headroomPct,
    driveSizeTb,
    raidType,
  ]);

  const handleResolutionChange = (newRes: ResolutionPresetKey) => {
    setResolutionPreset(newRes);
    if (newRes !== 'custom') {
      const recMbps = RESOLUTION_BITRATES[newRes][codec];
      setBitrateMbps(recMbps);
    }
  };

  const handleCodecChange = (newCodec: CodecKey) => {
    setCodec(newCodec);
    if (resolutionPreset !== 'custom') {
      const recMbps = RESOLUTION_BITRATES[resolutionPreset][newCodec];
      setBitrateMbps(recMbps);
    }
  };

  const handleApplyPreset = (p: PresetOption) => {
    setCameras(p.cameras);
    setResolutionPreset(p.resKey);
    setCodec(p.codec);
    if (p.resKey !== 'custom') {
      setBitrateMbps(RESOLUTION_BITRATES[p.resKey][p.codec]);
    }
    setRetentionDays(p.retentionDays);
    setRecordingPct(p.recordingPct);
    setHeadroomPct(p.headroomPct);
    setDriveSizeTb(p.driveSizeTb);
    setRaidType(p.raidType);
  };

  const handleReset = () => {
    setCameras(16);
    setResolutionPreset('1080p');
    setCodec('h265');
    setBitrateMbps(2.0);
    setRetentionDays(30);
    setRecordingPct(100);
    setHeadroomPct(15);
    setDriveSizeTb(8);
    setRaidType('raid5');
  };

  const calculations = useMemo(() => {
    const safeMbps = Math.max(0.01, bitrateMbps || 0.1);
    const safeCams = Math.max(1, cameras || 1);
    const safeDays = Math.max(1, retentionDays || 1);
    const safeRec = Math.min(100, Math.max(1, recordingPct || 100));
    const safeHead = Math.max(0, headroomPct || 0);
    const safeDriveTb = Math.max(0.5, driveSizeTb || 1);

    // GB per camera 24h: mbps * 86400 / 8 / 1000
    const gbPerCamera24h = (safeMbps * 86400) / 8 / 1000;
    const gbPerCameraPerDay = gbPerCamera24h * (safeRec / 100);
    const gbPerCameraRetention = gbPerCameraPerDay * safeDays;

    const totalRawGb = gbPerCameraRetention * safeCams;
    const totalRawTb = totalRawGb / 1000;

    const totalNeedGb = totalRawGb * (1 + safeHead / 100);
    const totalNeedTb = totalNeedGb / 1000;
    const headroomOnlyTb = totalNeedTb - totalRawTb;

    // Operating system binary TiB equivalent
    const totalNeedTib = totalNeedGb / 1024 / 1.024;

    const totalDailyGb = gbPerCameraPerDay * safeCams;
    const totalDailyTb = totalDailyGb / 1000;

    const raidInfo = RAID_DEFINITIONS[raidType];
    let drivesNeeded = 0;
    let usableStorageTb = 0;
    let rawStorageTb = 0;
    let parityStorageTb = 0;
    let possible = false;

    for (let n = raidInfo.min; n <= 64; n++) {
      const u = raidInfo.use(n) * safeDriveTb;
      if (u >= totalNeedTb) {
        drivesNeeded = n;
        usableStorageTb = u;
        rawStorageTb = n * safeDriveTb;
        parityStorageTb = rawStorageTb - usableStorageTb;
        possible = true;
        break;
      }
    }

    const raidMatrix = (Object.keys(RAID_DEFINITIONS) as RaidTypeKey[]).map(key => {
      const def = RAID_DEFINITIONS[key];
      let nDrives = 0;
      let uTb = 0;
      let ok = false;
      for (let n = def.min; n <= 64; n++) {
        const u = def.use(n) * safeDriveTb;
        if (u >= totalNeedTb) {
          nDrives = n;
          uTb = u;
          ok = true;
          break;
        }
      }
      const rawTb = nDrives * safeDriveTb;
      const parityTb = rawTb - uTb;
      return {
        key,
        label: def.label,
        min: def.min,
        faultTolerance: def.faultTolerance,
        drives: nDrives,
        usableTb: uTb,
        rawTb,
        parityTb,
        possible: ok,
        isCurrent: key === raidType,
      };
    });

    return {
      safeMbps,
      safeCams,
      safeDays,
      safeRec,
      safeHead,
      safeDriveTb,
      gbPerCamera24h,
      gbPerCameraPerDay,
      gbPerCameraRetention,
      totalRawGb,
      totalRawTb,
      totalNeedGb,
      totalNeedTb,
      headroomOnlyTb,
      totalNeedTib,
      totalDailyGb,
      totalDailyTb,
      drivesNeeded,
      usableStorageTb,
      rawStorageTb,
      parityStorageTb,
      possible,
      raidMatrix,
    };
  }, [cameras, bitrateMbps, retentionDays, recordingPct, headroomPct, driveSizeTb, raidType]);

  const handleCopySummary = () => {
    const text = `=====================================================
CCTV STORAGE & HARD DRIVE BOM SPECIFICATION
Generated via Jawed Imtiaz CCTV Calculator (jawed.co.in/tools)
=====================================================
• System Scale: ${calculations.safeCams} Cameras
• Video Resolution: ${resolutionPreset.toUpperCase()} (${codec.toUpperCase()})
• Bitrate per Camera: ${calculations.safeMbps.toFixed(2)} Mbps
• Target Retention: ${calculations.safeDays} Days
• Duty Cycle: ${calculations.safeRec}% of 24h day (${calculations.safeRec === 100 ? 'Continuous 24/7' : 'Motion detection'})
• Headroom Safety Buffer: ${calculations.safeHead}%

STORAGE REQUIREMENTS:
• Per Camera Daily Rate: ${calculations.gbPerCameraPerDay.toFixed(1)} GB/day
• Per Camera Total Retention: ${(calculations.gbPerCameraRetention / 1000).toFixed(2)} TB (${calculations.gbPerCameraRetention.toFixed(0)} GB)
• Total Unpadded Video Data: ${calculations.totalRawTb.toFixed(2)} TB
• Total Usable Capacity Needed: ${calculations.totalNeedTb.toFixed(2)} TB
• OS Binary Capacity (TiB): ~${calculations.totalNeedTib.toFixed(2)} TiB

DRIVE ARRAY & RAID SPECIFICATION:
• Target RAID Configuration: ${RAID_DEFINITIONS[raidType].label}
• Drive Capacity: ${calculations.safeDriveTb} TB Surveillance HDDs
• Required Drives: ${calculations.possible ? `${calculations.drivesNeeded} × ${calculations.safeDriveTb} TB Drives` : 'Exceeds 64 drive chassis limit'}
• Usable Array Storage: ${calculations.usableStorageTb.toFixed(1)} TB
• Raw Array Storage: ${calculations.rawStorageTb.toFixed(1)} TB
• Redundancy / Parity Reserved: ${calculations.parityStorageTb.toFixed(1)} TB
• Fault Tolerance: ${RAID_DEFINITIONS[raidType].faultTolerance}
=====================================================`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const storagePieData = useMemo(() => {
    return [
      { name: 'Raw Video Footage', value: parseFloat(calculations.totalRawTb.toFixed(2)), color: '#38bdf8' },
      { name: 'Headroom Buffer', value: parseFloat(calculations.headroomOnlyTb.toFixed(2)), color: '#f59e0b' },
    ];
  }, [calculations.totalRawTb, calculations.headroomOnlyTb]);

  const arrayBarData = useMemo(() => {
    return [
      {
        name: 'Storage Overview',
        'Usable Needed': parseFloat(calculations.totalNeedTb.toFixed(2)),
        'Usable Provided': parseFloat(calculations.usableStorageTb.toFixed(2)),
        'RAID Parity / Mirror': parseFloat(calculations.parityStorageTb.toFixed(2)),
      },
    ];
  }, [calculations.totalNeedTb, calculations.usableStorageTb, calculations.parityStorageTb]);

  return (
    <main className="container page cctv-calculator-root">
      {/* Top Bar with Breadcrumbs & Social Share (Hidden during Print) */}
      <div
        className="no-print"
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
            { label: 'CCTV Storage Calculator' },
          ]}
          style={{ marginBottom: 0 }}
        />
        <SocialShareBar
          title="CCTV Storage Calculator | Jawed Imtiaz"
          text="Free browser-based CCTV video storage and hard drive RAID capacity calculator for camera systems."
          url={typeof window !== 'undefined' ? `${window.location.origin}/tools/cctv-storage-calculator` : 'https://jawed.co.in/tools/cctv-storage-calculator'}
        />
      </div>

      {/* Hero Header */}
      <div style={{ marginBottom: '24px' }}>
        <p className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles className="w-4 h-4 text-emerald-400" />
          Free tool · runs in your browser · nothing is uploaded
        </p>
        <h1 style={{ margin: '6px 0 10px', fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontWeight: 800 }}>
          CCTV Storage Calculator
        </h1>
        <p className="lead" style={{ margin: 0, maxWidth: '820px' }}>
          Estimate how many terabytes and how many drives your camera system needs.
          Nothing is uploaded. Calculate daily stream rates, continuous vs motion recording, headroom, and RAID configurations entirely in your browser.
        </p>
      </div>

      {/* Top Action Bar */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '20px',
          padding: '12px 16px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>Quick Presets:</span>
          {QUICK_PRESETS.map(preset => (
            <button
              key={preset.name}
              type="button"
              className="button button-secondary"
              onClick={() => handleApplyPreset(preset)}
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="button button-secondary"
            onClick={handleCopySummary}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            title="Copy specification summary to clipboard"
          >
            {copiedSummary ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-sky-400" />}
            {copiedSummary ? 'Copied BOM!' : 'Copy Summary'}
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={handlePrint}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            title="Print or Save calculation summary as PDF"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            Print Calculation
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={handleReset}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            title="Reset form to defaults"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            Reset
          </button>
        </div>
      </div>

      {/* Main Grid: Form Inputs (Left) and Results / Visualizations (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" style={{ marginBottom: '32px' }}>
        {/* Form Inputs (5 columns on desktop) */}
        <div className="lg:col-span-5" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Camera Parameters */}
          <div className="panel" style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-heading)' }}>
              <Camera className="w-5 h-5 text-sky-400" />
              Camera Stream Settings
            </h3>

            {/* Number of Cameras */}
            <div className="form-field" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="cams" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Number of cameras
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[4, 8, 16, 32, 64].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCameras(n)}
                      style={{
                        padding: '2px 7px',
                        fontSize: '0.72rem',
                        borderRadius: '4px',
                        background: cameras === n ? 'var(--accent)' : 'var(--bg)',
                        color: cameras === n ? '#ffffff' : 'var(--text-muted)',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <input
                id="cams"
                type="number"
                min="1"
                max="500"
                value={cameras}
                onChange={e => setCameras(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
            </div>

            {/* Resolution Preset & Codec */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div className="form-field">
                <label htmlFor="res" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Resolution
                </label>
                <select
                  id="res"
                  value={resolutionPreset}
                  onChange={e => handleResolutionChange(e.target.value as ResolutionPresetKey)}
                >
                  <option value="1080p">2 MP (1080p)</option>
                  <option value="4mp">4 MP</option>
                  <option value="5mp">5 MP</option>
                  <option value="4k">8 MP (4K)</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="codec" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Codec
                </label>
                <select
                  id="codec"
                  value={codec}
                  onChange={e => handleCodecChange(e.target.value as CodecKey)}
                >
                  <option value="h265">H.265 / H.265+</option>
                  <option value="h264">H.264</option>
                </select>
              </div>
            </div>

            {/* Bitrate per camera */}
            <div className="form-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="mbps" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Bitrate per camera (Mbps), edit to match your camera
                </label>
              </div>
              <input
                id="mbps"
                type="number"
                step="0.1"
                min="0.1"
                max="100"
                value={bitrateMbps}
                onChange={e => {
                  setBitrateMbps(Math.max(0.1, parseFloat(e.target.value) || 0.1));
                  setResolutionPreset('custom');
                }}
              />
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Presets are starting points. Check your camera&apos;s web interface for actual bitrate.
              </p>
            </div>
          </div>

          {/* Retention & Duty Cycle */}
          <div className="panel" style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-heading)' }}>
              <Calendar className="w-5 h-5 text-emerald-400" />
              Retention &amp; Schedule
            </h3>

            {/* Retention Days */}
            <div className="form-field" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="days" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Retention (days)
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[7, 15, 30, 60, 90].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setRetentionDays(d)}
                      style={{
                        padding: '2px 7px',
                        fontSize: '0.72rem',
                        borderRadius: '4px',
                        background: retentionDays === d ? 'var(--emerald)' : 'var(--bg)',
                        color: retentionDays === d ? '#ffffff' : 'var(--text-muted)',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
              <input
                id="days"
                type="number"
                min="1"
                max="730"
                value={retentionDays}
                onChange={e => setRetentionDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
            </div>

            {/* Recording time (% of day) */}
            <div className="form-field" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="rec" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Recording time (% of the day)
                </label>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent)' }}>
                  {recordingPct}%
                </span>
              </div>
              <input
                id="rec"
                type="number"
                min="1"
                max="100"
                value={recordingPct}
                onChange={e => setRecordingPct(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 100)))}
              />
              <div className="muted" style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                100 = continuous. Use a lower value for motion-only recording.
              </div>
            </div>

            {/* Headroom (%) */}
            <div className="form-field">
              <label htmlFor="head" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                Headroom (%)
              </label>
              <input
                id="head"
                type="number"
                min="0"
                max="100"
                value={headroomPct}
                onChange={e => setHeadroomPct(Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                10 to 20% covers bitrate spikes at night, audio streams, and recorder overhead.
              </p>
            </div>
          </div>

          {/* Hard Drive & RAID Level */}
          <div className="panel" style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-heading)' }}>
              <HardDrive className="w-5 h-5 text-amber-400" />
              Drive Capacity &amp; RAID Level
            </h3>

            {/* Drive Size (TB) */}
            <div className="form-field" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="drv" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Drive size (TB)
                </label>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Decimal TB (1 TB = 1,000 GB)
                </span>
              </div>
              <input
                id="drv"
                type="number"
                step="0.5"
                min="1"
                max="40"
                value={driveSizeTb}
                onChange={e => setDriveSizeTb(Math.max(0.5, parseFloat(e.target.value) || 1))}
              />
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                {POPULAR_DRIVE_SIZES.map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setDriveSizeTb(sz)}
                    style={{
                      padding: '2px 7px',
                      fontSize: '0.72rem',
                      borderRadius: '4px',
                      background: driveSizeTb === sz ? 'var(--amber)' : 'var(--bg)',
                      color: driveSizeTb === sz ? '#ffffff' : 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                  >
                    {sz} TB
                  </button>
                ))}
              </div>
            </div>

            {/* RAID Level */}
            <div className="form-field">
              <label htmlFor="raid" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                RAID level
              </label>
              <select
                id="raid"
                value={raidType}
                onChange={e => setRaidType(e.target.value as RaidTypeKey)}
              >
                <option value="none">None (JBOD / single)</option>
                <option value="raid0">RAID 0</option>
                <option value="raid1">RAID 1</option>
                <option value="raid5">RAID 5</option>
                <option value="raid6">RAID 6</option>
                <option value="raid10">RAID 10</option>
              </select>
              <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {RAID_DEFINITIONS[raidType].description}
              </p>
            </div>
          </div>
        </div>

        {/* Results & Visualizations (7 columns on desktop) */}
        <div className="lg:col-span-7" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Main Calculation Hero Result */}
          <div
            className="panel cctv-result-hero"
            style={{
              padding: '24px',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(16, 185, 129, 0.05) 100%)',
              border: '2px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span className="pill" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontWeight: 700, fontSize: '0.78rem', marginBottom: '8px' }}>
                  USABLE CAPACITY NEEDED
                </span>
                <div style={{ fontSize: 'clamp(2.4rem, 4vw, 3.4rem)', fontWeight: 900, color: 'var(--text-heading)', lineHeight: 1.1, margin: '6px 0' }}>
                  {calculations.totalNeedTb.toFixed(1)} <span style={{ fontSize: '1.8rem', color: '#38bdf8' }}>TB</span>
                </div>
                <div className="muted" style={{ fontSize: '0.95rem' }}>
                  usable capacity needed, including {calculations.safeHead}% headroom
                </div>
              </div>

              {/* Hardware Recommendation Card */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  textAlign: 'right',
                }}
              >
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  RECOMMENDED DISKS
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-heading)', margin: '4px 0' }}>
                  {calculations.possible ? (
                    `${calculations.drivesNeeded} drives (${calculations.usableStorageTb.toFixed(1)} TB usable)`
                  ) : (
                    <span style={{ color: 'var(--rose)' }}>Not possible within 64 drives</span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--emerald)', fontWeight: 600 }}>
                  {calculations.possible ? (
                    `${RAID_DEFINITIONS[raidType].label.split(' ')[0]} with ${calculations.safeDriveTb} TB drives`
                  ) : (
                    'Try larger drives'
                  )}
                </div>
              </div>
            </div>

            {/* Core Calculations List (Matches attachment output) */}
            <ul style={{ paddingLeft: '20px', margin: '20px 0 0', lineHeight: 1.8, fontSize: '0.95rem' }}>
              <li>
                Per camera per day: <b>{calculations.gbPerCameraPerDay.toFixed(1)} GB</b>
              </li>
              <li>
                Per camera for {calculations.safeDays} days: <b>{calculations.gbPerCameraRetention.toFixed(0)} GB</b>
              </li>
              <li>
                All {calculations.safeCams} cameras, no headroom: <b>{calculations.totalRawTb.toFixed(2)} TB</b>
              </li>
              <li>
                {RAID_DEFINITIONS[raidType].label.split(' ')[0]} with {calculations.safeDriveTb} TB drives:{' '}
                <b>
                  {calculations.possible
                    ? `${calculations.drivesNeeded} drives (${calculations.usableStorageTb.toFixed(1)} TB usable)`
                    : 'not possible within 64 drives. Try larger drives.'}
                </b>
              </li>
            </ul>
          </div>

          {/* Drive Bay Chassis Visualizer */}
          {calculations.possible && (
            <div className="panel" style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Server className="w-4 h-4 text-sky-400" />
                  Chassis Hard Drive Bays ({calculations.drivesNeeded} Disks Required)
                </h4>
                <div style={{ display: 'flex', gap: '10px', fontSize: '0.75rem', fontWeight: 600 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#38bdf8' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#38bdf8' }} />
                    Data Storage
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f59e0b' }} />
                    Parity / Mirror
                  </span>
                </div>
              </div>

              {/* Bay layout */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
                  gap: '8px',
                  background: 'var(--bg)',
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                }}
              >
                {Array.from({ length: Math.min(32, Math.max(calculations.drivesNeeded, 8)) }).map((_, idx) => {
                  const driveNum = idx + 1;
                  const isPopulated = driveNum <= calculations.drivesNeeded;
                  let isParity = false;
                  if (isPopulated) {
                    if (raidType === 'raid5' && driveNum === calculations.drivesNeeded) isParity = true;
                    else if (raidType === 'raid6' && driveNum > calculations.drivesNeeded - 2) isParity = true;
                    else if ((raidType === 'raid1' || raidType === 'raid10') && driveNum % 2 === 0) isParity = true;
                  }

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 4px',
                        borderRadius: '6px',
                        border: `1px solid ${
                          !isPopulated
                            ? 'var(--border)'
                            : isParity
                            ? 'rgba(245, 158, 11, 0.5)'
                            : 'rgba(56, 189, 248, 0.5)'
                        }`,
                        background: !isPopulated
                          ? 'rgba(255, 255, 255, 0.02)'
                          : isParity
                          ? 'rgba(245, 158, 11, 0.12)'
                          : 'rgba(56, 189, 248, 0.12)',
                        textAlign: 'center',
                      }}
                      title={
                        isPopulated
                          ? `Bay ${driveNum}: ${calculations.safeDriveTb} TB (${isParity ? 'Parity' : 'Data'})`
                          : `Bay ${driveNum}: Empty`
                      }
                    >
                      <HardDrive
                        className="w-4 h-4 mx-auto mb-1"
                        style={{
                          color: !isPopulated
                            ? 'var(--text-muted)'
                            : isParity
                            ? '#f59e0b'
                            : '#38bdf8',
                        }}
                      />
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                        Bay {driveNum}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                        {isPopulated ? `${calculations.safeDriveTb} TB` : 'Empty'}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '8px' }}>
                <span>
                  Raw Disks: <strong>{calculations.rawStorageTb.toFixed(1)} TB</strong> | Usable Storage: <strong>{calculations.usableStorageTb.toFixed(1)} TB</strong>
                </span>
                <span>
                  Parity Overhead: <strong>{calculations.parityStorageTb.toFixed(1)} TB</strong>
                </span>
              </div>
            </div>
          )}

          {/* Visual Charts: Storage & RAID Provisioning */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pie Chart: Storage Composition */}
            <div className="panel" style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '8px' }}>
                Storage Composition (TB)
              </div>
              <div style={{ width: '100%', height: '180px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={storagePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {storagePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text-heading)',
                        fontSize: '0.8rem',
                      }}
                      formatter={(val: number) => [`${val} TB`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '6px' }} iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart: Array Provisioning */}
            <div className="panel" style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '8px' }}>
                Array Provisioning vs Need (TB)
              </div>
              <div style={{ width: '100%', height: '180px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={arrayBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" hide />
                    <YAxis stroke="var(--text-muted)" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text-heading)',
                        fontSize: '0.8rem',
                      }}
                      formatter={(val: number) => [`${val} TB`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.75rem' }} iconSize={8} />
                    <Bar dataKey="Usable Needed" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Usable Provided" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="RAID Parity / Mirror" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side RAID Level Comparison Table */}
      <div className="panel" style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers className="w-5 h-5 text-sky-400" />
          Side-by-Side RAID Level Comparison for {calculations.totalNeedTb.toFixed(1)} TB Target
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          Compare drive requirements, usable storage, and parity redundancy across all standard RAID levels using {calculations.safeDriveTb} TB drives.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px' }}>RAID Level</th>
                <th style={{ padding: '10px 12px' }}>Min Drives</th>
                <th style={{ padding: '10px 12px' }}>Drives Required ({calculations.safeDriveTb}TB)</th>
                <th style={{ padding: '10px 12px' }}>Usable Storage</th>
                <th style={{ padding: '10px 12px' }}>Parity / Mirror</th>
                <th style={{ padding: '10px 12px' }}>Fault Tolerance</th>
                <th style={{ padding: '10px 12px' }} className="no-print">Action</th>
              </tr>
            </thead>
            <tbody>
              {calculations.raidMatrix.map(row => (
                <tr
                  key={row.key}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: row.isCurrent ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                    fontWeight: row.isCurrent ? 700 : 400,
                  }}
                >
                  <td style={{ padding: '12px', color: 'var(--text-heading)' }}>
                    {row.label.split(' ')[0]} {row.label.split(' ')[1]}
                    {row.isCurrent && (
                      <span className="pill" style={{ marginLeft: '8px', fontSize: '0.7rem', padding: '2px 6px', background: 'var(--accent)', color: '#ffffff' }}>
                        Selected
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>{row.min}</td>
                  <td style={{ padding: '12px' }}>
                    {row.possible ? (
                      <strong style={{ color: 'var(--text-heading)' }}>{row.drives} drives</strong>
                    ) : (
                      <span style={{ color: 'var(--rose)' }}>&gt; 64</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', color: 'var(--emerald)' }}>
                    {row.possible ? `${row.usableTb.toFixed(1)} TB` : 'N/A'}
                  </td>
                  <td style={{ padding: '12px', color: 'var(--amber)' }}>
                    {row.possible ? `${row.parityTb.toFixed(1)} TB` : 'N/A'}
                  </td>
                  <td style={{ padding: '12px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {row.faultTolerance}
                  </td>
                  <td style={{ padding: '12px' }} className="no-print">
                    {!row.isCurrent && row.possible && (
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => setRaidType(row.key)}
                        style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                      >
                        Select
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Explanatory Article: How CCTV storage is calculated (Exact text from attachment) */}
      <section
        className="panel"
        style={{
          padding: '28px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          marginBottom: '32px',
        }}
      >
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 14px', color: 'var(--text-heading)' }}>
          How CCTV storage is calculated
        </h2>

        <p style={{ lineHeight: 1.7, color: 'var(--text)', marginBottom: '16px' }}>
          Video storage depends on how much data each camera produces every second. The formula is simple:
        </p>

        <p style={{ lineHeight: 1.7, color: 'var(--text)', marginBottom: '16px' }}>
          <b>GB per camera per day = bitrate (Mbps) × 86,400 seconds ÷ 8 ÷ 1,000</b>. For example, a 4 Mbps stream uses 4 × 86,400 ÷ 8 ÷ 1,000 = 43.2 GB per day. Multiply by the number of cameras and days of retention, then add headroom.
        </p>

        <ul style={{ paddingLeft: '24px', lineHeight: 1.8, color: 'var(--text)', display: 'grid', gap: '10px' }}>
          <li>
            <b>Bitrate is the biggest unknown.</b> The presets are typical starting points only. Real bitrate depends on frame rate, scene motion, lighting, bitrate mode and the camera brand. Read the actual figure from your camera&apos;s web page or the recorder&apos;s status screen and type it in.
          </li>
          <li>
            <b>Motion recording</b> reduces storage only if the scene is quiet. Busy scenes can record almost all day.
          </li>
          <li>
            <b>Headroom</b> of 10 to 20% covers bitrate spikes at night, audio, and the recorder&apos;s own overhead.
          </li>
          <li>
            <b>RAID</b> trades capacity for protection. RAID 5 loses one drive&apos;s capacity, RAID 6 two, and RAID 1 or 10 half. RAID is not a backup. Surveillance-rated drives are recommended.
          </li>
          <li>
            Drive makers use decimal terabytes (1 TB = 1,000 GB), which matches this calculator. Operating systems may show slightly less.
          </li>
        </ul>

        <p style={{ lineHeight: 1.7, color: 'var(--text)', marginTop: '16px', marginBottom: 0 }}>
          Results are estimates for planning. Confirm the final design with your recorder&apos;s capacity tool and the actual camera settings.
        </p>
      </section>

      {/* FAQ Section (Exact text from attachment) */}
      <section
        className="panel"
        style={{
          padding: '28px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
        }}
      >
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 18px', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HelpCircle className="w-5 h-5 text-sky-400" />
          FAQ
        </h2>

        <div style={{ display: 'grid', gap: '14px' }}>
          <details
            style={{
              padding: '14px 18px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
            }}
          >
            <summary style={{ fontWeight: 700, color: 'var(--text-heading)', cursor: 'pointer', fontSize: '0.95rem' }}>
              Is anything uploaded?
            </summary>
            <p style={{ margin: '10px 0 0', lineHeight: 1.6, color: 'var(--text)', fontSize: '0.9rem' }}>
              No. Everything is calculated in your browser.
            </p>
          </details>

          <details
            style={{
              padding: '14px 18px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
            }}
          >
            <summary style={{ fontWeight: 700, color: 'var(--text-heading)', cursor: 'pointer', fontSize: '0.95rem' }}>
              Why is my real usage different?
            </summary>
            <p style={{ margin: '10px 0 0', lineHeight: 1.6, color: 'var(--text)', fontSize: '0.9rem' }}>
              Variable bitrate, scene activity, frame rate, audio and recorder overhead all change the result. Measure a few days of real usage and adjust the bitrate.
            </p>
          </details>

          <details
            style={{
              padding: '14px 18px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
            }}
          >
            <summary style={{ fontWeight: 700, color: 'var(--text-heading)', cursor: 'pointer', fontSize: '0.95rem' }}>
              Which RAID should I use for CCTV?
            </summary>
            <p style={{ margin: '10px 0 0', lineHeight: 1.6, color: 'var(--text)', fontSize: '0.9rem' }}>
              RAID 5 is common for balance, and RAID 6 is safer with many large drives. Always check your recorder&apos;s supported modes.
            </p>
          </details>
        </div>
      </section>
    </main>
  );
};
