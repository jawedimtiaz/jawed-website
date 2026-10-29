import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import { AdUnitPlaceholder } from '../components/AdUnitPlaceholder';
import {
  HardDrive,
  Server,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Copy,
  Check,
  Download,
  RotateCcw,
  Info,
  DollarSign,
  Cpu,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRightLeft,
  Sliders,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Scale,
  Sun,
  Moon,
  Clock,
  Zap,
  Printer,
} from 'lucide-react';
import { jsPDF } from 'jspdf';

export type RaidLevel = 'jbod' | 'raid0' | 'raid1' | 'raid5' | 'raid6' | 'raid10' | 'raid50' | 'raid60';

export interface RaidSpec {
  id: RaidLevel;
  name: string;
  minDrives: number;
  parityDrivesCount: (dataDrives: number) => number;
  calcDrivesForUsable: (targetUsableTb: number, driveSizeTb: number) => number;
  calcUsableFromDrives: (totalDrives: number, driveSizeTb: number) => number;
  calcParityFromDrives: (totalDrives: number, driveSizeTb: number) => number;
  faultToleranceText: (drives: number) => string;
  maxFailedDrives: (drives: number) => number;
  efficiencyPercent: (drives: number) => number;
  readPerf: string;
  writePerf: string;
  rebuildRiskLevel: 'None' | 'Very High' | 'High' | 'Low' | 'Very Low';
  rebuildRiskDesc: string;
  bestUse: string;
  summary: string;
}

export const RAID_SPECS: Record<RaidLevel, RaidSpec> = {
  jbod: {
    id: 'jbod',
    name: 'JBOD (Spanning)',
    minDrives: 1,
    parityDrivesCount: () => 0,
    calcDrivesForUsable: (target, size) => Math.max(1, Math.ceil(target / size)),
    calcUsableFromDrives: (drives, size) => drives * size,
    calcParityFromDrives: () => 0,
    faultToleranceText: () => '0 Drives (No Redundancy)',
    maxFailedDrives: () => 0,
    efficiencyPercent: () => 100,
    readPerf: 'Standard (1x)',
    writePerf: 'Standard (1x)',
    rebuildRiskLevel: 'Very High',
    rebuildRiskDesc: 'Single drive failure results in loss of data spanning across that disk. No rebuild protection.',
    bestUse: 'Non-critical scratch disks, secondary temporary buffers, or simple capacity pooling.',
    summary: 'Combines multiple drives into a single volume without data striping or redundancy.',
  },
  raid0: {
    id: 'raid0',
    name: 'RAID 0 (Striping)',
    minDrives: 2,
    parityDrivesCount: () => 0,
    calcDrivesForUsable: (target, size) => Math.max(2, Math.ceil(target / size)),
    calcUsableFromDrives: (drives, size) => drives * size,
    calcParityFromDrives: () => 0,
    faultToleranceText: () => '0 Drives (Zero Tolerance)',
    maxFailedDrives: () => 0,
    efficiencyPercent: () => 100,
    readPerf: 'Very Fast (Nx)',
    writePerf: 'Very Fast (Nx)',
    rebuildRiskLevel: 'Very High',
    rebuildRiskDesc: 'Any single disk loss destroys the entire array volume completely. Zero tolerance.',
    bestUse: 'High-speed scratch cache, temporary video render caches, non-critical simulation datasets.',
    summary: 'Data striped across all drives for maximum throughput and 100% capacity utilization, but zero redundancy.',
  },
  raid1: {
    id: 'raid1',
    name: 'RAID 1 (Mirroring)',
    minDrives: 2,
    parityDrivesCount: (drives) => Math.floor(drives / 2),
    calcDrivesForUsable: (target, size) => {
      const pairs = Math.max(1, Math.ceil(target / size));
      return pairs * 2;
    },
    calcUsableFromDrives: (drives, size) => Math.floor(drives / 2) * size,
    calcParityFromDrives: (drives, size) => Math.ceil(drives / 2) * size,
    faultToleranceText: (drives) => `1 Drive per mirror pair (Up to ${Math.floor(drives / 2)} drives total)`,
    maxFailedDrives: (drives) => Math.floor(drives / 2),
    efficiencyPercent: () => 50,
    readPerf: 'Fast (2x Reads)',
    writePerf: 'Standard (1x Writes)',
    rebuildRiskLevel: 'Low',
    rebuildRiskDesc: 'Simple disk-to-disk mirror copy. Rebuild overhead is minimal without parity CPU math.',
    bestUse: 'Operating system boot drives, critical accounting databases, small 2-bay office NAS.',
    summary: 'Data duplicated 1:1 on pairs of drives. Half of total disk capacity is dedicated to mirrors.',
  },
  raid5: {
    id: 'raid5',
    name: 'RAID 5 (Single Parity)',
    minDrives: 3,
    parityDrivesCount: () => 1,
    calcDrivesForUsable: (target, size) => {
      const dataDrives = Math.max(2, Math.ceil(target / size));
      return dataDrives + 1;
    },
    calcUsableFromDrives: (drives, size) => Math.max(0, drives - 1) * size,
    calcParityFromDrives: (drives, size) => (drives >= 3 ? 1 * size : 0),
    faultToleranceText: () => '1 Drive Failure',
    maxFailedDrives: () => 1,
    efficiencyPercent: (drives) => (drives >= 3 ? Math.round(((drives - 1) / drives) * 100) : 0),
    readPerf: 'Fast ((N-1)x Reads)',
    writePerf: 'Moderate (4x I/O Write Penalty)',
    rebuildRiskLevel: 'High',
    rebuildRiskDesc: 'CRITICAL WARNING: On modern large drives (≥8TB), multi-day rebuild times create severe risk of secondary drive failure or Unrecoverable Read Errors (URE) leading to catastrophic array loss.',
    bestUse: 'Budget-sensitive storage with drives ≤4TB, read-heavy workloads with regular offsite backups.',
    summary: 'Block-level striping with distributed single parity. Sacrifices the capacity of exactly one drive.',
  },
  raid6: {
    id: 'raid6',
    name: 'RAID 6 (Dual Parity)',
    minDrives: 4,
    parityDrivesCount: () => 2,
    calcDrivesForUsable: (target, size) => {
      const dataDrives = Math.max(2, Math.ceil(target / size));
      return dataDrives + 2;
    },
    calcUsableFromDrives: (drives, size) => Math.max(0, drives - 2) * size,
    calcParityFromDrives: (drives, size) => (drives >= 4 ? 2 * size : 0),
    faultToleranceText: () => '2 Simultaneous Drive Failures',
    maxFailedDrives: () => 2,
    efficiencyPercent: (drives) => (drives >= 4 ? Math.round(((drives - 2) / drives) * 100) : 0),
    readPerf: 'Fast ((N-2)x Reads)',
    writePerf: 'Moderate (6x I/O Parity Penalty)',
    rebuildRiskLevel: 'Very Low',
    rebuildRiskDesc: 'EXCELLENT: Dual Reed-Solomon parity survives a second disk failure even during an active multi-day rebuild. Gold standard for large drives.',
    bestUse: 'Enterprise CCTV NVRs, mission-critical SAN/NAS storage, arrays using drives ≥6TB.',
    summary: 'Distributed dual parity (P + Q). Can survive two concurrent disk failures without data loss.',
  },
  raid10: {
    id: 'raid10',
    name: 'RAID 10 (1+0 Striped Mirrors)',
    minDrives: 4,
    parityDrivesCount: (drives) => drives / 2,
    calcDrivesForUsable: (target, size) => {
      const pairs = Math.max(2, Math.ceil(target / size));
      return pairs * 2;
    },
    calcUsableFromDrives: (drives, size) => (Math.floor(drives / 2)) * size,
    calcParityFromDrives: (drives, size) => (Math.floor(drives / 2)) * size,
    faultToleranceText: (drives) => `1 Drive per mirror pair (Up to ${Math.floor(drives / 2)} non-paired drives)`,
    maxFailedDrives: (drives) => Math.floor(drives / 2),
    efficiencyPercent: () => 50,
    readPerf: 'Very Fast (Full Striped Parallel)',
    writePerf: 'Fast (No Parity Calculation Overhead)',
    rebuildRiskLevel: 'Very Low',
    rebuildRiskDesc: 'Fastest rebuild times of any redundant RAID. Data copied directly from surviving mirror pair without heavy parity recalculation.',
    bestUse: 'High IOPS transaction databases, virtual machine datastores, low-latency editing pools.',
    summary: 'Combines mirroring (RAID 1) with striping (RAID 0). 50% capacity efficiency with superior IOPS and fast rebuilds.',
  },
  raid50: {
    id: 'raid50',
    name: 'RAID 50 (Striped RAID 5)',
    minDrives: 6,
    parityDrivesCount: () => 2,
    calcDrivesForUsable: (target, size) => {
      // 2 sub-arrays of min 3 drives = 6 drives minimum
      const neededDataDrives = Math.ceil(target / size);
      // Data drives = Total - 2 parity drives (1 per sub-array)
      let drives = Math.max(6, neededDataDrives + 2);
      if (drives % 2 !== 0) drives += 1; // Keep balanced sub-arrays
      return drives;
    },
    calcUsableFromDrives: (drives, size) => {
      const safeDrives = Math.max(6, drives - (drives % 2));
      return (safeDrives - 2) * size;
    },
    calcParityFromDrives: (drives, size) => {
      return drives >= 6 ? 2 * size : 0;
    },
    faultToleranceText: () => '1 Drive per RAID 5 group (Up to 2 drives across groups)',
    maxFailedDrives: () => 2,
    efficiencyPercent: (drives) => (drives >= 6 ? Math.round(((drives - 2) / drives) * 100) : 0),
    readPerf: 'Very Fast (Multiple RAID 5 sets striped)',
    writePerf: 'Good (Better than monolithic RAID 5)',
    rebuildRiskLevel: 'Low',
    rebuildRiskDesc: 'Rebuild times are significantly shorter than large single-set RAID 5 arrays because only one sub-group rebuilds.',
    bestUse: 'Large enterprise capacity pools needing balanced throughput and faster rebuild times.',
    summary: 'Stripes data across two or more RAID 5 sub-arrays. Offers better rebuild times and throughput than RAID 5.',
  },
  raid60: {
    id: 'raid60',
    name: 'RAID 60 (Striped RAID 6)',
    minDrives: 8,
    parityDrivesCount: () => 4,
    calcDrivesForUsable: (target, size) => {
      // 2 sub-arrays of min 4 drives = 8 drives minimum
      const neededDataDrives = Math.ceil(target / size);
      // Data drives = Total - 4 parity drives (2 per sub-array)
      let drives = Math.max(8, neededDataDrives + 4);
      if (drives % 2 !== 0) drives += 1; // Keep balanced sub-arrays
      return drives;
    },
    calcUsableFromDrives: (drives, size) => {
      const safeDrives = Math.max(8, drives - (drives % 2));
      return (safeDrives - 4) * size;
    },
    calcParityFromDrives: (drives, size) => {
      return drives >= 8 ? 4 * size : 0;
    },
    faultToleranceText: () => '2 Drives per RAID 6 group (Up to 4 drives total across groups)',
    maxFailedDrives: () => 4,
    efficiencyPercent: (drives) => (drives >= 8 ? Math.round(((drives - 4) / drives) * 100) : 0),
    readPerf: 'Very Fast (Striped parallel dual parity)',
    writePerf: 'Good',
    rebuildRiskLevel: 'Very Low',
    rebuildRiskDesc: 'Maximum enterprise resilience. Can survive up to 4 simultaneous disk failures if distributed across sets.',
    bestUse: 'High-density multi-petabyte storage arrays, large video surveillance archives, cold storage pools.',
    summary: 'Stripes data across two or more RAID 6 sub-arrays. Exceptional fault tolerance and rebuild safety.',
  },
};

export const COMMON_DRIVE_SIZES = [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 30];

export const CHASSIS_PRESETS = [
  { bays: 4, name: '4-Bay', formFactor: '1U Rack / Tower NAS', desc: 'Compact desktop NAS or 1U shallow-depth appliance' },
  { bays: 8, name: '8-Bay', formFactor: '2U Rack / High Tower', desc: 'Standard mid-market surveillance NVR or SMB storage' },
  { bays: 12, name: '12-Bay', formFactor: '2U Storage Server', desc: 'Enterprise 2U front-loading 3.5" drive chassis' },
  { bays: 16, name: '16-Bay', formFactor: '3U Storage Server', desc: 'Enterprise video surveillance & analytics server' },
  { bays: 24, name: '24-Bay', formFactor: '4U Storage Server', desc: 'Standard 4U high-density enterprise SAN/NAS enclosure' },
  { bays: 36, name: '36-Bay', formFactor: '4U Top-Loader', desc: 'High-density top-loading SAS/SATA storage chassis' },
  { bays: 48, name: '48-Bay', formFactor: '4U Ultra-Dense', desc: 'Data center bulk storage shelf or secondary backup target' },
  { bays: 60, name: '60-Bay', formFactor: '4U JBOD Drawer', desc: 'Hyperscale 4U storage expansion shelf / JBOD unit' },
];

export const DRIVE_CLASS_PRICING = [
  { id: 'surveillance', name: 'Surveillance HDD (WD Purple / Seagate SkyHawk)', avgPricePerTb: 16, rpm: '5400 - 7200 RPM', workload: '180 TB/yr', warranty: '3 Years' },
  { id: 'enterprise', name: 'Enterprise SAS/SATA (Seagate Exos / WD Gold)', avgPricePerTb: 19, rpm: '7200 RPM Enterprise', workload: '550 TB/yr', warranty: '5 Years' },
  { id: 'nas', name: 'NAS Grade HDD (WD Red Plus / Seagate IronWolf)', avgPricePerTb: 17, rpm: '5400 - 7200 RPM', workload: '180 - 300 TB/yr', warranty: '3 - 5 Years' },
  { id: 'ssd_enterprise', name: 'Enterprise SATA SSD (Read-Intensive)', avgPricePerTb: 75, rpm: 'Solid State', workload: '0.8 - 1 DWPD', warranty: '5 Years' },
];

export const SCENARIO_PRESETS = [
  {
    name: 'Small Office NAS',
    targetTb: 16,
    raid: 'raid1' as RaidLevel,
    driveTb: 16,
    spares: 0,
    desc: '2x 16TB drives in RAID 1 mirror for simple, redundant file sharing.',
  },
  {
    name: 'Mid-Size CCTV (64 TB)',
    targetTb: 64,
    raid: 'raid5' as RaidLevel,
    driveTb: 16,
    spares: 0,
    desc: '5x 16TB drives (4 Data + 1 Parity) providing 64TB usable space.',
  },
  {
    name: 'Enterprise Surveillance (150 TB)',
    targetTb: 150,
    raid: 'raid6' as RaidLevel,
    driveTb: 18,
    spares: 1,
    desc: '11x 18TB drives (9 data + 2 parity + 1 hot spare) in dual-parity RAID 6.',
  },
  {
    name: 'High-IOPS Database (100 TB)',
    targetTb: 100,
    raid: 'raid10' as RaidLevel,
    driveTb: 20,
    spares: 0,
    desc: '10x 20TB drives in striped mirror pairs (RAID 10) for maximum write IOPS.',
  },
  {
    name: 'Petabyte Archive (400 TB)',
    targetTb: 400,
    raid: 'raid60' as RaidLevel,
    driveTb: 22,
    spares: 2,
    desc: '24x 22TB drives in RAID 60 with dual distributed parity and 2 hot spares.',
  },
];

export const HardwareStorageCalculator: React.FC = () => {
  // Calculator Mode: 'target-to-drives' (given target usable capacity -> calculate drives)
  // or 'drives-to-usable' (given drive count & drive size -> calculate usable storage)
  const [calcMode, setCalcMode] = useState<'target-to-drives' | 'drives-to-usable'>(() => {
    return (localStorage.getItem('hw_calc_mode') as 'target-to-drives' | 'drives-to-usable') || 'target-to-drives';
  });

  // Inputs for Target Mode
  const [targetUsableTb, setTargetUsableTb] = useState<number>(() => {
    const saved = localStorage.getItem('hw_calc_target_tb');
    return saved ? Number(saved) : 64;
  });

  // Inputs for Drives-to-Usable Mode
  const [manualDriveCount, setManualDriveCount] = useState<number>(() => {
    const saved = localStorage.getItem('hw_calc_manual_drives');
    return saved ? Number(saved) : 8;
  });

  // Common Hardware Parameters
  const [selectedRaid, setSelectedRaid] = useState<RaidLevel>(() => {
    const saved = localStorage.getItem('hw_calc_raid');
    return (saved as RaidLevel) || 'raid6';
  });

  const [driveSizeTb, setDriveSizeTb] = useState<number>(() => {
    const saved = localStorage.getItem('hw_calc_drive_size');
    return saved ? Number(saved) : 16;
  });

  const [hotSparesCount, setHotSparesCount] = useState<number>(() => {
    const saved = localStorage.getItem('hw_calc_spares');
    return saved !== null ? Number(saved) : 0;
  });

  // Cost Estimation
  const [enableCost, setEnableCost] = useState<boolean>(() => {
    return localStorage.getItem('hw_calc_enable_cost') === 'true';
  });

  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    return localStorage.getItem('hw_calc_currency') || '$';
  });

  const [pricingMode, setPricingMode] = useState<'preset' | 'custom_drive' | 'custom_tb'>('preset');
  const [selectedDrivePreset, setSelectedDrivePreset] = useState<string>('enterprise');
  const [customCostPerDrive, setCustomCostPerDrive] = useState<number>(280);
  const [customCostPerTb, setCustomCostPerTb] = useState<number>(18);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'calculator' | 'matrix' | 'enclosure' | 'rebuild_risk'>('calculator');

  // Copied feedback
  const [copiedBom, setCopiedBom] = useState<boolean>(false);

  // Theme support
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const docTheme = document.documentElement.getAttribute('data-theme');
    if (docTheme === 'light' || docTheme === 'dark') return docTheme;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('hw_calc_mode', calcMode);
    localStorage.setItem('hw_calc_target_tb', String(targetUsableTb));
    localStorage.setItem('hw_calc_manual_drives', String(manualDriveCount));
    localStorage.setItem('hw_calc_raid', selectedRaid);
    localStorage.setItem('hw_calc_drive_size', String(driveSizeTb));
    localStorage.setItem('hw_calc_spares', String(hotSparesCount));
    localStorage.setItem('hw_calc_enable_cost', String(enableCost));
    localStorage.setItem('hw_calc_currency', selectedCurrency);
  }, [calcMode, targetUsableTb, manualDriveCount, selectedRaid, driveSizeTb, hotSparesCount, enableCost, selectedCurrency]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    if (next === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  };

  // Current RAID Spec
  const currentSpec = RAID_SPECS[selectedRaid];

  // Core Math Calculations
  const calcResults = useMemo(() => {
    const safeDriveSize = Math.max(0.5, driveSizeTb);
    const safeSpares = Math.max(0, hotSparesCount);

    let activeArrayDrives = 0;
    let usableTb = 0;

    if (calcMode === 'target-to-drives') {
      const safeTarget = Math.max(1, targetUsableTb);
      activeArrayDrives = currentSpec.calcDrivesForUsable(safeTarget, safeDriveSize);
      usableTb = currentSpec.calcUsableFromDrives(activeArrayDrives, safeDriveSize);
    } else {
      // Drives to Usable mode
      const safeTotalDrives = Math.max(currentSpec.minDrives, manualDriveCount);
      activeArrayDrives = safeTotalDrives;
      usableTb = currentSpec.calcUsableFromDrives(activeArrayDrives, safeDriveSize);
    }

    const parityTb = currentSpec.calcParityFromDrives(activeArrayDrives, safeDriveSize);
    const spareTb = safeSpares * safeDriveSize;
    const totalPhysicalDrives = activeArrayDrives + safeSpares;
    const rawCapacityTb = totalPhysicalDrives * safeDriveSize;

    // Binary TiB (Tebibytes) conversion: 1 TB (decimal) = 10^12 bytes; 1 TiB (binary) = 2^40 = 1,099,511,627,776 bytes (~0.9095 TiB)
    const usableTib = usableTb * (1000 ** 4 / 1024 ** 4);
    const rawTib = rawCapacityTb * (1000 ** 4 / 1024 ** 4);

    const storageEfficiencyPct = rawCapacityTb > 0 ? (usableTb / rawCapacityTb) * 100 : 0;
    const parityOverheadPct = rawCapacityTb > 0 ? (parityTb / rawCapacityTb) * 100 : 0;
    const spareOverheadPct = rawCapacityTb > 0 ? (spareTb / rawCapacityTb) * 100 : 0;

    // Data drives vs Parity drives breakdown
    let parityDrives = 0;
    if (selectedRaid === 'raid1' || selectedRaid === 'raid10') {
      parityDrives = Math.floor(activeArrayDrives / 2);
    } else if (selectedRaid === 'raid5') {
      parityDrives = 1;
    } else if (selectedRaid === 'raid6') {
      parityDrives = 2;
    } else if (selectedRaid === 'raid50') {
      parityDrives = 2;
    } else if (selectedRaid === 'raid60') {
      parityDrives = 4;
    }
    const dataDrives = Math.max(1, activeArrayDrives - parityDrives);

    // Chassis fit analysis
    const bestChassis = CHASSIS_PRESETS.find(c => c.bays >= totalPhysicalDrives) || {
      bays: Math.ceil(totalPhysicalDrives / 24) * 24,
      name: `Multi-Enclosure (${Math.ceil(totalPhysicalDrives / 24)}x 24-Bay)`,
      formFactor: 'Clustered Storage JBODs',
      desc: 'High-density multi-shelf rack expansion',
    };

    const emptyBays = Math.max(0, bestChassis.bays - totalPhysicalDrives);
    const chassisUtilizationPct = Math.min(100, (totalPhysicalDrives / bestChassis.bays) * 100);

    // Cost calculations
    let costPerDrive = 0;
    if (pricingMode === 'preset') {
      const p = DRIVE_CLASS_PRICING.find(d => d.id === selectedDrivePreset) || DRIVE_CLASS_PRICING[1];
      costPerDrive = p.avgPricePerTb * safeDriveSize;
    } else if (pricingMode === 'custom_drive') {
      costPerDrive = customCostPerDrive;
    } else {
      costPerDrive = customCostPerTb * safeDriveSize;
    }

    const totalDriveCost = totalPhysicalDrives * costPerDrive;
    const costPerUsableTb = usableTb > 0 ? totalDriveCost / usableTb : 0;
    const costPerRawTb = rawCapacityTb > 0 ? totalDriveCost / rawCapacityTb : 0;

    // Estimated rebuild time based on typical 160 MB/s sustained sequential disk rebuild rate
    // Time (seconds) = (Drive Size in Bytes) / (160 * 10^6 bytes/s)
    const avgRebuildSpeedMBps = 160;
    const rebuildHours = (safeDriveSize * 1000 * 1000) / (avgRebuildSpeedMBps * 3600);

    return {
      activeArrayDrives,
      dataDrives,
      parityDrives,
      hotSpares: safeSpares,
      totalPhysicalDrives,
      usableTb,
      usableTib,
      parityTb,
      spareTb,
      rawCapacityTb,
      rawTib,
      storageEfficiencyPct,
      parityOverheadPct,
      spareOverheadPct,
      bestChassis,
      emptyBays,
      chassisUtilizationPct,
      costPerDrive,
      totalDriveCost,
      costPerUsableTb,
      costPerRawTb,
      rebuildHours,
    };
  }, [
    calcMode,
    targetUsableTb,
    manualDriveCount,
    selectedRaid,
    driveSizeTb,
    hotSparesCount,
    currentSpec,
    pricingMode,
    selectedDrivePreset,
    customCostPerDrive,
    customCostPerTb,
  ]);

  // Comparison Matrix for all RAID levels given current target or drive count
  const comparisonMatrix = useMemo(() => {
    const raids: RaidLevel[] = ['jbod', 'raid0', 'raid1', 'raid5', 'raid6', 'raid10', 'raid50', 'raid60'];
    const safeDriveSize = Math.max(0.5, driveSizeTb);
    const safeSpares = Math.max(0, hotSparesCount);

    return raids.map(r => {
      const spec = RAID_SPECS[r];
      let drives = 0;
      let usable = 0;

      if (calcMode === 'target-to-drives') {
        drives = spec.calcDrivesForUsable(Math.max(1, targetUsableTb), safeDriveSize);
        usable = spec.calcUsableFromDrives(drives, safeDriveSize);
      } else {
        drives = Math.max(spec.minDrives, manualDriveCount);
        usable = spec.calcUsableFromDrives(drives, safeDriveSize);
      }

      const parity = spec.calcParityFromDrives(drives, safeDriveSize);
      const totalDrivesWithSpares = drives + safeSpares;
      const raw = totalDrivesWithSpares * safeDriveSize;
      const eff = raw > 0 ? (usable / raw) * 100 : 0;

      return {
        id: r,
        spec,
        activeDrives: drives,
        totalDrives: totalDrivesWithSpares,
        usableTb: usable,
        parityTb: parity,
        rawTb: raw,
        efficiencyPct: eff,
        faultTolerance: spec.faultToleranceText(drives),
        rebuildRisk: spec.rebuildRiskLevel,
        readPerf: spec.readPerf,
        writePerf: spec.writePerf,
      };
    });
  }, [calcMode, targetUsableTb, manualDriveCount, driveSizeTb, hotSparesCount]);

  // Copy Bill of Materials (BOM) & Hardware Summary to clipboard
  const handleCopyBom = () => {
    const text = `HARDWARE STORAGE & RAID SPECIFICATION
--------------------------------------------------
Configuration Summary:
• Mode: ${calcMode === 'target-to-drives' ? `Target ${targetUsableTb} TB Usable` : `${manualDriveCount} Physical Drives Installed`}
• RAID Level: ${currentSpec.name}
• Individual Disk Size: ${driveSizeTb} TB
• Total Physical Hard Drives: ${calcResults.totalPhysicalDrives} Disks
  - Active Data Disks: ${calcResults.dataDrives}
  - Parity / Redundancy Disks: ${calcResults.parityDrives}
  - Dedicated Hot Spares: ${calcResults.hotSpares}

Storage Metrics:
• Usable Storage Capacity: ${calcResults.usableTb.toFixed(1)} TB (${calcResults.usableTib.toFixed(1)} TiB)
• Raw Unformatted Capacity: ${calcResults.rawCapacityTb.toFixed(1)} TB (${calcResults.rawTib.toFixed(1)} TiB)
• Parity Redundancy Overhead: ${calcResults.parityTb.toFixed(1)} TB (${calcResults.parityOverheadPct.toFixed(1)}%)
• Storage Efficiency: ${calcResults.storageEfficiencyPct.toFixed(1)}%
• Fault Tolerance: ${currentSpec.faultToleranceText(calcResults.activeArrayDrives)}

Chassis & Infrastructure:
• Recommended Chassis: ${calcResults.bestChassis.name} (${calcResults.bestChassis.formFactor})
• Enclosure Utilization: ${calcResults.chassisUtilizationPct.toFixed(0)}% (${calcResults.totalPhysicalDrives} / ${calcResults.bestChassis.bays} bays occupied)
• Spare Expansion Slots: ${calcResults.emptyBays} bays available
• Est. Single Disk Rebuild Time: ~${calcResults.rebuildHours.toFixed(1)} hours (at 160 MB/s)
${
  enableCost
    ? `
Financial Estimate:
• Drive Unit Cost: ${selectedCurrency}${calcResults.costPerDrive.toFixed(0)} / disk
• Total Disk Investment: ${selectedCurrency}${calcResults.totalDriveCost.toLocaleString()}
• Cost per Usable TB: ${selectedCurrency}${calcResults.costPerUsableTb.toFixed(2)} / TB`
    : ''
}
--------------------------------------------------
Generated via Jawed Imtiaz Storage Calculator: jawed.co.in/tools/hardware-storage-calculator`;

    navigator.clipboard.writeText(text);
    setCopiedBom(true);
    setTimeout(() => setCopiedBom(false), 2500);
  };

  // Download PDF Hardware Specification
  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor = [15, 23, 42]; // Slate 900
    const accentColor = [2, 132, 199]; // Sky 600

    // Header banner
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(14, 12, 182, 22, 2.5, 2.5, 'F');
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.roundedRect(14, 12, 4, 22, 1.5, 1.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('HARDWARE STORAGE & RAID SPECIFICATION SHEET', 22, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    doc.text('Enterprise Array Geometry · Disk Sizing · Parity & Chassis Bill of Materials', 22, 27);

    const nowStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    doc.setFontSize(8);
    doc.text(`Generated: ${nowStr}`, 190, 26, { align: 'right' });

    // Key Highlights (3 Summary Cards)
    const cardY = 40;
    const cardW = 58;
    const cardH = 24;

    // Card 1: Total Drives
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, cardY, cardW, cardH, 2, 2, 'FD');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL HARD DRIVES', 18, cardY + 6);
    doc.setFontSize(14);
    doc.setTextColor(2, 132, 199);
    doc.text(`${calcResults.totalPhysicalDrives} Drives`, 18, cardY + 14);
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(`${calcResults.dataDrives} Data · ${calcResults.parityDrives} Parity · ${calcResults.hotSpares} Spare`, 18, cardY + 20);

    // Card 2: Usable Capacity
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(76, cardY, cardW, cardH, 2, 2, 'FD');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('USABLE CAPACITY', 80, cardY + 6);
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129);
    doc.text(`${calcResults.usableTb.toFixed(1)} TB`, 80, cardY + 14);
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(`${calcResults.usableTib.toFixed(1)} TiB (${calcResults.storageEfficiencyPct.toFixed(0)}% Efficiency)`, 80, cardY + 20);

    // Card 3: Fault Tolerance
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(138, cardY, cardW, cardH, 2, 2, 'FD');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('REDUNDANCY & FAULT TOLERANCE', 142, cardY + 6);
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`${currentSpec.name}`, 142, cardY + 13);
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(currentSpec.faultToleranceText(calcResults.activeArrayDrives), 142, cardY + 20);

    // Section 1: Detailed Storage Geometry Table
    let curY = 72;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('1. ARRAY GEOMETRY & CAPACITY BREAKDOWN', 14, curY);

    curY += 4;
    const tableRows = [
      ['RAID Architecture', currentSpec.name, currentSpec.summary],
      ['Individual Drive Capacity', `${driveSizeTb} TB (${(driveSizeTb * 0.9095).toFixed(1)} TiB)`, 'Standard 3.5" enterprise surveillance/NAS SATA HDD'],
      ['Total Physical Drives Required', `${calcResults.totalPhysicalDrives} Drives`, `${calcResults.dataDrives} Data + ${calcResults.parityDrives} Parity + ${calcResults.hotSpares} Hot Spare`],
      ['Total Raw Disk Capacity', `${calcResults.rawCapacityTb.toFixed(1)} TB (${calcResults.rawTib.toFixed(1)} TiB)`, 'Unformatted sum of all drive platters'],
      ['Effective Usable Capacity', `${calcResults.usableTb.toFixed(1)} TB (${calcResults.usableTib.toFixed(1)} TiB)`, 'Formatted volume space available for filesystem storage'],
      ['Parity / Redundancy Storage', `${calcResults.parityTb.toFixed(1)} TB (${calcResults.parityOverheadPct.toFixed(1)}%)`, 'Dedicated redundancy bits for drive failure reconstruction'],
      ['Hot Spare Reserve Capacity', `${calcResults.spareTb.toFixed(1)} TB (${calcResults.spareOverheadPct.toFixed(1)}%)`, 'Unstriped standby drive automatically rebuilding on failure'],
      ['Fault Tolerance Limit', currentSpec.faultToleranceText(calcResults.activeArrayDrives), 'Maximum concurrent disk losses survived without data loss'],
      ['Read / Write Performance', `${currentSpec.readPerf} Read / ${currentSpec.writePerf} Write`, 'Array throughput characteristic relative to single drive speed'],
      ['Recommended Chassis Enclosure', `${calcResults.bestChassis.name} (${calcResults.bestChassis.formFactor})`, `${calcResults.emptyBays} spare bays remaining for expansion`],
      ['Single Disk Rebuild Estimate', `~${calcResults.rebuildHours.toFixed(1)} Hours`, 'Estimated sustained sequential array reconstruction time at 160 MB/s'],
    ];

    if (enableCost) {
      tableRows.push(
        ['Estimated Drive Unit Cost', `${selectedCurrency}${calcResults.costPerDrive.toFixed(0)} / disk`, 'Market price estimate per storage drive'],
        ['Total Disk Hardware Investment', `${selectedCurrency}${calcResults.totalDriveCost.toLocaleString()}`, `Procurement cost for ${calcResults.totalPhysicalDrives} hard drives`],
        ['Cost per Usable Terabyte', `${selectedCurrency}${calcResults.costPerUsableTb.toFixed(2)} / usable TB`, 'Normalized storage investment density'],
      );
    }

    tableRows.forEach((row, idx) => {
      const rowH = 7.6;
      const y = curY + idx * rowH;
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, 182, rowH, 'F');
      }
      doc.setDrawColor(241, 245, 249);
      doc.line(14, y + rowH, 196, y + rowH);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.6);
      doc.setTextColor(51, 65, 85);
      doc.text(row[0], 17, y + 5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(row[1], 74, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(row[2], 126, y + 5);
    });

    // Section 2: Rebuild Risk & Engineering Advisory
    curY += tableRows.length * 7.6 + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('2. REBUILD RISK & URE VULNERABILITY ADVISORY', 14, curY);

    curY += 5;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, curY, 182, 28, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const riskColor = currentSpec.rebuildRiskLevel === 'Very High' || currentSpec.rebuildRiskLevel === 'High' ? [220, 38, 38] : [16, 185, 129];
    doc.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
    doc.text(`Array Risk Rating: ${currentSpec.rebuildRiskLevel.toUpperCase()}`, 18, curY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const splitDesc = doc.splitTextToSize(currentSpec.rebuildRiskDesc, 174);
    doc.text(splitDesc, 18, curY + 12);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Engineering best practice: For arrays utilizing disks ≥8TB, RAID 6 (dual parity) or RAID 10 (mirrored striping) is strictly recommended due to the non-trivial mathematical probability of a secondary sector read failure during multi-day rebuilds.`, 18, curY + 23);

    // Footer
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 280, 196, 280);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Hardware Storage & RAID Calculator · jawed.co.in/tools · Browser-based Engineering Specification', 14, 285);
    doc.text('Page 1 of 1', 196, 285, { align: 'right' });

    doc.save(`hardware-storage-spec-${selectedRaid}-${calcResults.usableTb.toFixed(0)}tb.pdf`);
  };

  // Export CSV Bill of Materials
  const handleDownloadCsv = () => {
    const csvContent = [
      ['Parameter', 'Value', 'Unit / Notes'],
      ['Calculator Mode', calcMode === 'target-to-drives' ? 'Target Usable Capacity' : 'Drive Count Known', 'Input mode'],
      ['RAID Level', currentSpec.name, currentSpec.summary],
      ['Individual Drive Capacity', driveSizeTb, 'TB per disk'],
      ['Total Physical Drives Required', calcResults.totalPhysicalDrives, 'Total 3.5" HDD/SSD count'],
      ['Active Data Drives', calcResults.dataDrives, 'Carrying filesystem data'],
      ['Parity / Mirror Drives', calcResults.parityDrives, 'Redundancy overhead'],
      ['Dedicated Hot Spares', calcResults.hotSpares, 'Automatic standby spares'],
      ['Effective Usable Capacity', calcResults.usableTb.toFixed(2), 'Decimal Terabytes (TB)'],
      ['Effective Usable Capacity (Binary)', calcResults.usableTib.toFixed(2), 'Binary Tebibytes (TiB)'],
      ['Total Raw Capacity', calcResults.rawCapacityTb.toFixed(2), 'TB'],
      ['Storage Efficiency', `${calcResults.storageEfficiencyPct.toFixed(1)}%`, 'Usable / Raw ratio'],
      ['Fault Tolerance', currentSpec.faultToleranceText(calcResults.activeArrayDrives), 'Max survived disk losses'],
      ['Recommended Chassis', calcResults.bestChassis.name, calcResults.bestChassis.formFactor],
      ['Chassis Bays Occupied', `${calcResults.totalPhysicalDrives} / ${calcResults.bestChassis.bays}`, `${calcResults.emptyBays} spare expansion bays`],
      ['Estimated Rebuild Time', `${calcResults.rebuildHours.toFixed(1)} hours`, 'At 160 MB/s sustained'],
      enableCost ? ['Cost per Drive', `${selectedCurrency}${calcResults.costPerDrive.toFixed(2)}`, 'Unit price'] : null,
      enableCost ? ['Total Drive Investment', `${selectedCurrency}${calcResults.totalDriveCost.toFixed(2)}`, 'Total disk cost'] : null,
      enableCost ? ['Cost per Usable TB', `${selectedCurrency}${calcResults.costPerUsableTb.toFixed(2)}`, 'Cost density'] : null,
    ]
      .filter(Boolean)
      .map(row => (row ? row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') : ''))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `hardware-storage-bom-${selectedRaid}-${calcResults.usableTb.toFixed(0)}tb.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApplyScenario = (preset: typeof SCENARIO_PRESETS[0]) => {
    setCalcMode('target-to-drives');
    setTargetUsableTb(preset.targetTb);
    setSelectedRaid(preset.raid);
    setDriveSizeTb(preset.driveTb);
    setHotSparesCount(preset.spares);
  };

  return (
    <main className="main-content hardware-storage-calculator-root" style={{ maxWidth: '1240px', margin: '0 auto', padding: '24px 16px 80px' }}>
      <div className="no-print">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Diagnostic Tools', href: '/tools' },
            { label: 'Hardware Storage & RAID Calculator' },
          ]}
        />

        <SocialShareBar
          title="Hardware Storage & RAID Calculator | Hard Drive Sizing, Parity & Chassis Advisor"
          text="Calculate how many hard drives are required for your target usable capacity based on RAID 5, RAID 6, RAID 10, RAID 50, drive capacity, parity overhead, hot spares, and server chassis bays."
        />
      </div>

      {/* Print-Only Engineering Specification Header (A4 / Letter Clean Documentation) */}
      <div className="print-only" style={{ display: 'none', marginBottom: '16pt', borderBottom: '2px solid #0f172a', paddingBottom: '10pt' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '7.5pt', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 700, marginBottom: '2pt' }}>
              Storage Infrastructure Engineering Specification
            </div>
            <h1 style={{ fontSize: '16pt', fontWeight: 800, margin: '0 0 3pt', color: '#0f172a' }}>
              Hardware Storage &amp; RAID Array Report
            </h1>
            <p style={{ margin: 0, fontSize: '8.5pt', color: '#475569' }}>
              Drive sizing, parity overhead, binary TiB capacity, chassis enclosure bay layout, and rebuild risk analysis.
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '8pt', color: '#64748b', flexShrink: 0 }}>
            <div><strong>Date:</strong> {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
            <div><strong>Configured Architecture:</strong> {currentSpec.name}</div>
            <div><strong>Drive Profile:</strong> {calcResults.totalPhysicalDrives}x {driveSizeTb} TB ({calcResults.dataDrives} Data + {calcResults.parityDrives} Parity {calcResults.hotSpares > 0 ? `+ ${calcResults.hotSpares} Spare` : ''})</div>
            <div><strong>Effective Usable:</strong> {calcResults.usableTb.toFixed(1)} TB (~{calcResults.usableTib.toFixed(1)} TiB)</div>
          </div>
        </div>
      </div>

      {/* Header with Title and Mode Actions */}
      <div style={{ margin: '16px 0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              <span>IT Infrastructure</span>
              <span aria-hidden="true">·</span>
              <span>Storage Engineering</span>
              <span aria-hidden="true">·</span>
              <span>RAID Geometry Sizing</span>
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: 'clamp(1.85rem, 3.2vw, 2.5rem)', fontWeight: 800, color: 'var(--text-heading)' }}>
              Hardware Storage &amp; RAID Calculator
            </h1>
            <p style={{ margin: 0, maxWidth: '820px', color: 'var(--text-muted)', fontSize: '0.98rem', lineHeight: 1.6 }}>
              Determine the exact number of hard drives needed to meet your usable storage target across RAID 0, RAID 1, RAID 5, RAID 6, RAID 10, RAID 50, and RAID 60.
              Includes parity overhead, binary TiB conversion, hot spare planning, chassis enclosure sizing, and rebuild vulnerability analysis.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="no-print">
            <button
              type="button"
              className="button button-secondary no-print"
              onClick={() => window.print()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                padding: '6px 12px',
                borderRadius: '8px',
              }}
              title="Print Hardware Storage Report (A4 / Letter)"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              Print Report
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={toggleTheme}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                padding: '6px 12px',
                borderRadius: '8px',
              }}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  Light Mode
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-400" />
                  Dark Mode
                </>
              )}
            </button>
            <Link
              to="/tools/cctv-storage-calculator"
              className="button button-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                padding: '6px 12px',
                borderRadius: '8px',
                textDecoration: 'none',
              }}
              title="Jump to CCTV Storage Calculator to calculate camera bandwidth & retention days"
            >
              <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
              CCTV Storage Tool
            </Link>
          </div>
        </div>
      </div>

      {/* Preset Scenarios Strip */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '20px',
          padding: '10px 14px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
        }}
      >
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          Deployment Presets:
        </span>
        {SCENARIO_PRESETS.map(preset => (
          <button
            key={preset.name}
            type="button"
            className="button button-secondary"
            onClick={() => handleApplyScenario(preset)}
            style={{ fontSize: '0.76rem', padding: '4px 10px', whiteSpace: 'nowrap' }}
            title={preset.desc}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Navigation Tabs (Single-Elevation, Functional Filter Controls) */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '12px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('calculator')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'calculator' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            border: activeTab === 'calculator' ? '1px solid var(--accent)' : '1px solid var(--border)',
            background: activeTab === 'calculator' ? 'var(--surface-accent)' : 'var(--surface)',
            color: activeTab === 'calculator' ? 'var(--accent)' : 'var(--text)',
            whiteSpace: 'nowrap',
          }}
        >
          <Sliders className="w-4 h-4" />
          Hardware Drive Sizer
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'matrix' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            border: activeTab === 'matrix' ? '1px solid var(--accent)' : '1px solid var(--border)',
            background: activeTab === 'matrix' ? 'var(--surface-accent)' : 'var(--surface)',
            color: activeTab === 'matrix' ? 'var(--accent)' : 'var(--text)',
            whiteSpace: 'nowrap',
          }}
        >
          <Scale className="w-4 h-4" />
          All-RAID Comparison Matrix
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('enclosure')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'enclosure' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            border: activeTab === 'enclosure' ? '1px solid var(--accent)' : '1px solid var(--border)',
            background: activeTab === 'enclosure' ? 'var(--surface-accent)' : 'var(--surface)',
            color: activeTab === 'enclosure' ? 'var(--accent)' : 'var(--text)',
            whiteSpace: 'nowrap',
          }}
        >
          <Server className="w-4 h-4" />
          Chassis &amp; Bay Sizing Advisor
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rebuild_risk')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'rebuild_risk' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            border: activeTab === 'rebuild_risk' ? '1px solid var(--accent)' : '1px solid var(--border)',
            background: activeTab === 'rebuild_risk' ? 'var(--surface-accent)' : 'var(--surface)',
            color: activeTab === 'rebuild_risk' ? 'var(--accent)' : 'var(--text)',
            whiteSpace: 'nowrap',
          }}
        >
          <ShieldCheck className="w-4 h-4" />
          Rebuild Risk &amp; URE Advisory
        </button>
      </div>

      {/* Primary Calculator View */}
      {activeTab === 'calculator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          {/* Top Configuration & Sizing Controls Card */}
          <div
            style={{
              padding: '20px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
            }}
          >
            {/* Mode Switcher */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>Calculation Mode:</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setCalcMode('target-to-drives')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: calcMode === 'target-to-drives' ? 700 : 500,
                      cursor: 'pointer',
                      border: calcMode === 'target-to-drives' ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: calcMode === 'target-to-drives' ? 'var(--accent)' : 'transparent',
                      color: calcMode === 'target-to-drives' ? '#ffffff' : 'var(--text)',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    1. Target Usable Capacity → Calculate Required Drives
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcMode('drives-to-usable')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: calcMode === 'drives-to-usable' ? 700 : 500,
                      cursor: 'pointer',
                      border: calcMode === 'drives-to-usable' ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: calcMode === 'drives-to-usable' ? 'var(--accent)' : 'transparent',
                      color: calcMode === 'drives-to-usable' ? '#ffffff' : 'var(--text)',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    2. Known Drive Count → Calculate Resulting Usable Storage
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} className="no-print">
                <button
                  type="button"
                  className="button button-secondary no-print"
                  onClick={() => window.print()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', padding: '6px 12px' }}
                  title="Print clean calculation report on A4/Letter paper"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-400" />
                  Print Report
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={handleCopyBom}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', padding: '6px 12px' }}
                  title="Copy full hardware bill of materials to clipboard"
                >
                  {copiedBom ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedBom ? 'Copied BOM!' : 'Copy BOM'}
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={handleDownloadPdf}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', padding: '6px 12px' }}
                  title="Download professional PDF hardware specification sheet"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  PDF Spec
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={handleDownloadCsv}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', padding: '6px 12px' }}
                  title="Export raw CSV data for procurement spreadsheets"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  CSV
                </button>
              </div>
            </div>

            {/* Inputs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
              {/* Input 1: Target Usable Capacity OR Manual Drive Count */}
              {calcMode === 'target-to-drives' ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                    <label htmlFor="target-tb-input" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                      Target Usable Storage (TB):
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }} className="tabular-nums">
                      ~{(targetUsableTb * (1000 ** 4 / 1024 ** 4)).toFixed(1)} TiB
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      id="target-tb-input"
                      type="number"
                      min={1}
                      max={5000}
                      step={1}
                      value={targetUsableTb}
                      onChange={e => setTargetUsableTb(Math.max(1, Number(e.target.value)))}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-heading)',
                        fontWeight: 700,
                        fontSize: '1rem',
                      }}
                      className="tabular-nums"
                    />
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[20, 60, 100, 250].map(v => (
                        <button
                          key={v}
                          type="button"
                          className="button button-secondary"
                          onClick={() => setTargetUsableTb(v)}
                          style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                        >
                          {v}T
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={300}
                    step={2}
                    value={Math.min(300, targetUsableTb)}
                    onChange={e => setTargetUsableTb(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '8px', accentColor: 'var(--accent)' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Enter clean usable capacity required by your files, NVR video streams, or databases.
                  </span>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                    <label htmlFor="drive-count-input" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                      Installed Active Drives:
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Min {currentSpec.minDrives} drives for {currentSpec.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      id="drive-count-input"
                      type="number"
                      min={currentSpec.minDrives}
                      max={120}
                      step={1}
                      value={manualDriveCount}
                      onChange={e => setManualDriveCount(Math.max(currentSpec.minDrives, Number(e.target.value)))}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-heading)',
                        fontWeight: 700,
                        fontSize: '1rem',
                      }}
                      className="tabular-nums"
                    />
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[4, 8, 12, 16, 24].map(v => (
                        <button
                          key={v}
                          type="button"
                          className="button button-secondary"
                          onClick={() => setManualDriveCount(Math.max(currentSpec.minDrives, v))}
                          style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                        >
                          {v}x
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={currentSpec.minDrives}
                    max={60}
                    step={1}
                    value={Math.min(60, manualDriveCount)}
                    onChange={e => setManualDriveCount(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '8px', accentColor: 'var(--accent)' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Number of active array disks in your server or NAS backplane.
                  </span>
                </div>
              )}

              {/* Input 2: RAID Level Selection */}
              <div>
                <label htmlFor="raid-select" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '6px' }}>
                  RAID Level:
                </label>
                <select
                  id="raid-select"
                  value={selectedRaid}
                  onChange={e => setSelectedRaid(e.target.value as RaidLevel)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-heading)',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                  }}
                >
                  <option value="raid6">RAID 6 (Dual Parity · Highly Recommended for ≥6TB)</option>
                  <option value="raid5">RAID 5 (Single Parity · Balanced Cost)</option>
                  <option value="raid10">RAID 10 (Striped Mirrors 1+0 · Highest IOPS &amp; Fast Rebuild)</option>
                  <option value="raid1">RAID 1 (1:1 Mirroring · 2-Bay Small Deployments)</option>
                  <option value="raid50">RAID 50 (Striped RAID 5 · Enterprise Pools ≥6 Drives)</option>
                  <option value="raid60">RAID 60 (Striped RAID 6 · Hyperscale Archives ≥8 Drives)</option>
                  <option value="raid0">RAID 0 (Striping · Zero Redundancy Scratch Cache)</option>
                  <option value="jbod">JBOD (Spanning · Simple Drive Pooling)</option>
                </select>
                <div style={{ marginTop: '6px', fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  <strong style={{ color: 'var(--text-heading)' }}>Fault Tolerance: </strong>
                  {currentSpec.faultToleranceText(calcResults.activeArrayDrives)}
                </div>
              </div>

              {/* Input 3: Individual Drive Capacity */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                  <label htmlFor="drive-size-select" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                    Individual Drive Capacity:
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }} className="tabular-nums">
                    ~{(driveSizeTb * 0.9095).toFixed(1)} TiB Formatted
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    id="drive-size-select"
                    value={COMMON_DRIVE_SIZES.includes(driveSizeTb) ? driveSizeTb : 'custom'}
                    onChange={e => {
                      if (e.target.value !== 'custom') {
                        setDriveSizeTb(Number(e.target.value));
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-heading)',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                    }}
                  >
                    {COMMON_DRIVE_SIZES.map(sz => (
                      <option key={sz} value={sz}>
                        {sz} TB Enterprise HDD
                      </option>
                    ))}
                    {!COMMON_DRIVE_SIZES.includes(driveSizeTb) && (
                      <option value="custom">Custom ({driveSizeTb} TB)</option>
                    )}
                  </select>
                  <input
                    type="number"
                    min={0.5}
                    max={100}
                    step={0.5}
                    value={driveSizeTb}
                    onChange={e => setDriveSizeTb(Math.max(0.5, Number(e.target.value)))}
                    style={{
                      width: '74px',
                      padding: '8px 8px',
                      borderRadius: '8px',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-heading)',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      textAlign: 'center',
                    }}
                    className="tabular-nums"
                    title="Custom drive size in TB"
                  />
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {[4, 8, 12, 16, 18, 20, 22].map(sz => (
                    <button
                      key={sz}
                      type="button"
                      className="button button-secondary"
                      onClick={() => setDriveSizeTb(sz)}
                      style={{
                        fontSize: '0.72rem',
                        padding: '2px 7px',
                        background: driveSizeTb === sz ? 'var(--accent)' : undefined,
                        color: driveSizeTb === sz ? '#ffffff' : undefined,
                        borderColor: driveSizeTb === sz ? 'var(--accent)' : undefined,
                      }}
                    >
                      {sz}TB
                    </button>
                  ))}
                </div>
              </div>

              {/* Input 4: Dedicated Hot Spares */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                  <label htmlFor="hot-spares-select" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                    Dedicated Hot Spares:
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {hotSparesCount > 0 ? `+${(hotSparesCount * driveSizeTb).toFixed(0)} TB Raw Standby` : 'No Hot Spare'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[0, 1, 2, 3].map(count => (
                    <button
                      key={count}
                      type="button"
                      className="button button-secondary"
                      onClick={() => setHotSparesCount(count)}
                      style={{
                        flex: 1,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        padding: '8px 4px',
                        background: hotSparesCount === count ? 'rgba(16, 185, 129, 0.2)' : undefined,
                        borderColor: hotSparesCount === count ? 'var(--emerald)' : undefined,
                        color: hotSparesCount === count ? 'var(--emerald)' : undefined,
                      }}
                    >
                      {count === 0 ? 'None (0)' : `${count} Spare${count > 1 ? 's' : ''}`}
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                  Pre-installed idle drive that spins up automatically to rebuild when a drive reports errors.
                </span>
              </div>
            </div>
          </div>

          {/* Key Output Metrics (4 High-Impact KPI Cards) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {/* KPI 1: Required Hard Drives */}
            <div
              style={{
                padding: '20px',
                borderRadius: '12px',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  TOTAL DRIVES REQUIRED
                </span>
                <HardDrive className="w-4 h-4 text-sky-400" />
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: 'var(--accent)', margin: '6px 0 2px' }} className="tabular-nums">
                {calcResults.totalPhysicalDrives} Disks
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-heading)' }}>
                {calcResults.dataDrives} Data + {calcResults.parityDrives} Parity {calcResults.hotSpares > 0 ? `+ ${calcResults.hotSpares} Spare` : ''}
              </div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Using standard {driveSizeTb} TB 3.5" enterprise surveillance/NAS SATA drives
              </div>
            </div>

            {/* KPI 2: Usable Capacity */}
            <div
              style={{
                padding: '20px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  USABLE FORMATTED CAPACITY
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: 'var(--emerald)', margin: '6px 0 2px' }} className="tabular-nums">
                {calcResults.usableTb.toFixed(1)} TB
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-heading)' }} className="tabular-nums">
                ~{calcResults.usableTib.toFixed(1)} TiB Binary Filesystem
              </div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Raw disk pool: {calcResults.rawCapacityTb.toFixed(1)} TB ({calcResults.storageEfficiencyPct.toFixed(0)}% storage efficiency)
              </div>
            </div>

            {/* KPI 3: Redundancy & Parity Overhead */}
            <div
              style={{
                padding: '20px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  PARITY &amp; SPARE OVERHEAD
                </span>
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: 'var(--amber)', margin: '6px 0 2px' }} className="tabular-nums">
                {(calcResults.parityTb + calcResults.spareTb).toFixed(1)} TB
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-heading)' }}>
                {calcResults.parityTb.toFixed(1)} TB Parity + {calcResults.spareTb.toFixed(1)} TB Spare
              </div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Tolerance: {currentSpec.faultToleranceText(calcResults.activeArrayDrives)}
              </div>
            </div>

            {/* KPI 4: Chassis Enclosure Bay Fit */}
            <div
              style={{
                padding: '20px',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  ENCLOSURE BAY SIZING
                </span>
                <Server className="w-4 h-4 text-indigo-400" />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--indigo)', margin: '6px 0 2px' }}>
                {calcResults.bestChassis.name}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-heading)' }}>
                {calcResults.totalPhysicalDrives} / {calcResults.bestChassis.bays} Bays Occupied ({calcResults.chassisUtilizationPct.toFixed(0)}%)
              </div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {calcResults.emptyBays} spare bays remaining for expansion
              </div>
            </div>
          </div>

          {/* Visual Storage Geometry & Bay Layout Card */}
          <div
            style={{
              padding: '20px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                  Disk Array Geometry &amp; Capacity Bar
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Visual distribution of usable storage space, redundancy parity data, and dedicated hot spare capacity.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '14px', fontSize: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--emerald)' }} />
                  <span>Usable: {calcResults.usableTb.toFixed(1)} TB ({calcResults.storageEfficiencyPct.toFixed(0)}%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--amber)' }} />
                  <span>Parity: {calcResults.parityTb.toFixed(1)} TB ({calcResults.parityOverheadPct.toFixed(0)}%)</span>
                </div>
                {calcResults.hotSpares > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--accent)' }} />
                    <span>Spare: {calcResults.spareTb.toFixed(1)} TB ({calcResults.spareOverheadPct.toFixed(0)}%)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Segmented Capacity Bar */}
            <div
              style={{
                height: '24px',
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                background: 'var(--border)',
                border: '1px solid var(--border)',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: `${calcResults.storageEfficiencyPct}%`,
                  background: 'var(--emerald)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                }}
                title={`Usable: ${calcResults.usableTb.toFixed(1)} TB (${calcResults.storageEfficiencyPct.toFixed(1)}%)`}
              >
                {calcResults.storageEfficiencyPct > 15 ? `${calcResults.usableTb.toFixed(1)} TB Usable` : ''}
              </div>
              <div
                style={{
                  width: `${calcResults.parityOverheadPct}%`,
                  background: 'var(--amber)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                }}
                title={`Parity: ${calcResults.parityTb.toFixed(1)} TB (${calcResults.parityOverheadPct.toFixed(1)}%)`}
              >
                {calcResults.parityOverheadPct > 12 ? `${calcResults.parityTb.toFixed(1)} TB Parity` : ''}
              </div>
              {calcResults.hotSpares > 0 && (
                <div
                  style={{
                    width: `${calcResults.spareOverheadPct}%`,
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0f172a',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                  }}
                  title={`Spare: ${calcResults.spareTb.toFixed(1)} TB (${calcResults.spareOverheadPct.toFixed(1)}%)`}
                >
                  {calcResults.spareOverheadPct > 8 ? `${calcResults.spareTb.toFixed(1)} TB` : ''}
                </div>
              )}
            </div>

            {/* Interactive Chassis Drive Bay Grid Simulation */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                  Chassis Drive Bay Layout: {calcResults.bestChassis.name} ({calcResults.bestChassis.formFactor})
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {calcResults.totalPhysicalDrives} Installed Disks · {calcResults.emptyBays} Empty Slots
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(auto-fill, minmax(70px, 1fr))`,
                  gap: '6px',
                  padding: '12px',
                  background: 'var(--bg)',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                }}
              >
                {Array.from({ length: calcResults.bestChassis.bays }).map((_, idx) => {
                  let bayType: 'data' | 'parity' | 'spare' | 'empty' = 'empty';
                  if (idx < calcResults.dataDrives) {
                    bayType = 'data';
                  } else if (idx < calcResults.dataDrives + calcResults.parityDrives) {
                    bayType = 'parity';
                  } else if (idx < calcResults.totalPhysicalDrives) {
                    bayType = 'spare';
                  }

                  let bg = 'rgba(255, 255, 255, 0.03)';
                  let borderColor = 'var(--border)';
                  let textColor = 'var(--text-muted)';
                  let label = `Bay ${idx + 1}`;
                  let status = 'Empty Slot';

                  if (bayType === 'data') {
                    bg = 'rgba(16, 185, 129, 0.12)';
                    borderColor = 'rgba(16, 185, 129, 0.4)';
                    textColor = 'var(--emerald)';
                    status = 'Data Disk';
                  } else if (bayType === 'parity') {
                    bg = 'rgba(245, 158, 11, 0.12)';
                    borderColor = 'rgba(245, 158, 11, 0.4)';
                    textColor = 'var(--amber)';
                    status = 'Parity Disk';
                  } else if (bayType === 'spare') {
                    bg = 'rgba(56, 189, 248, 0.12)';
                    borderColor = 'rgba(56, 189, 248, 0.4)';
                    textColor = 'var(--accent)';
                    status = 'Hot Spare';
                  }

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '6px',
                        background: bg,
                        border: `1px solid ${borderColor}`,
                        textAlign: 'center',
                        fontSize: '0.68rem',
                        transition: 'transform 0.1s ease',
                      }}
                      title={`${label}: ${status} (${bayType !== 'empty' ? `${driveSizeTb} TB` : 'Available for expansion'})`}
                    >
                      <HardDrive className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: textColor }} />
                      <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>Bay {idx + 1}</div>
                      <div style={{ fontSize: '0.62rem', color: textColor, fontWeight: 600 }}>{status}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detailed Hardware Specifications Table */}
          <div
            style={{
              padding: '20px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
            }}
          >
            <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              Hardware Storage Engineering Specifications
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 12px' }}>Parameter</th>
                    <th style={{ padding: '8px 12px' }}>Engineered Value</th>
                    <th style={{ padding: '8px 12px' }}>Technical Description</th>
                  </tr>
                </thead>
                <tbody style={{ color: 'var(--text)' }}>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>RAID Level Architecture</td>
                    <td style={{ padding: '8px 12px', color: 'var(--accent)', fontWeight: 700 }}>{currentSpec.name}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{currentSpec.summary}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>Total Hard Drives Required</td>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }} className="tabular-nums">
                      {calcResults.totalPhysicalDrives} Drives ({calcResults.dataDrives} Data + {calcResults.parityDrives} Parity {calcResults.hotSpares > 0 ? `+ ${calcResults.hotSpares} Spare` : ''})
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Discrete 3.5-inch enterprise SATA/SAS mechanical or solid-state disks</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>Effective Usable Storage</td>
                    <td style={{ padding: '8px 12px', color: 'var(--emerald)', fontWeight: 700 }} className="tabular-nums">
                      {calcResults.usableTb.toFixed(2)} TB ({calcResults.usableTib.toFixed(2)} TiB)
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Net capacity available to formatted filesystems (XFS, ext4, ZFS, NTFS)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>Total Raw Drive Capacity</td>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }} className="tabular-nums">
                      {calcResults.rawCapacityTb.toFixed(1)} TB ({calcResults.rawTib.toFixed(1)} TiB)
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Total unformatted capacity across all {calcResults.totalPhysicalDrives} disk platters</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>Array Storage Efficiency</td>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }} className="tabular-nums">
                      {calcResults.storageEfficiencyPct.toFixed(1)}% Usable
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                      {calcResults.parityOverheadPct.toFixed(1)}% Parity Overhead {calcResults.hotSpares > 0 ? `+ ${calcResults.spareOverheadPct.toFixed(1)}% Hot Spare` : ''}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>Drive Fault Tolerance</td>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>{currentSpec.faultToleranceText(calcResults.activeArrayDrives)}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Number of concurrent disk losses sustained without array collapse</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>I/O Throughput Profile</td>
                    <td style={{ padding: '8px 12px' }}>{currentSpec.readPerf} Read / {currentSpec.writePerf} Write</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Sequential streaming vs parity write penalty calculation</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>Single Disk Rebuild Estimate</td>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }} className="tabular-nums">
                      ~{calcResults.rebuildHours.toFixed(1)} Hours
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Estimated sustained sequential reconstruction at 160 MB/s disk write rate</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>Recommended Chassis</td>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--indigo)' }}>{calcResults.bestChassis.name} ({calcResults.bestChassis.formFactor})</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{calcResults.bestChassis.desc} ({calcResults.emptyBays} spare bays remaining)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Optional Drive Procurement & Investment Cost Estimator */}
          <div
            style={{
              padding: '20px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                  Drive Hardware Investment &amp; Cost Sizing
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Estimate total procurement investment for hard drives and analyze cost per usable terabyte.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-heading)' }}>
                  <input
                    type="checkbox"
                    checked={enableCost}
                    onChange={e => setEnableCost(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  Enable Cost Estimator
                </label>
              </div>
            </div>

            {enableCost && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '12px' }}>
                <div>
                  <label htmlFor="currency-select" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>
                    Currency Symbol:
                  </label>
                  <select
                    id="currency-select"
                    value={selectedCurrency}
                    onChange={e => setSelectedCurrency(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-heading)',
                      fontWeight: 700,
                    }}
                  >
                    <option value="$">$ USD / CAD / AUD</option>
                    <option value="€">€ EUR (Euro)</option>
                    <option value="£">£ GBP (British Pound)</option>
                    <option value="₹">₹ INR (Indian Rupee)</option>
                    <option value="¥">¥ JPY / CNY</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="pricing-mode-select" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>
                    Drive Pricing Mode:
                  </label>
                  <select
                    id="pricing-mode-select"
                    value={pricingMode}
                    onChange={e => setPricingMode(e.target.value as 'preset' | 'custom_drive' | 'custom_tb')}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-heading)',
                      fontWeight: 700,
                    }}
                  >
                    <option value="preset">Market Drive Class Preset</option>
                    <option value="custom_drive">Custom Unit Price ($ / Drive)</option>
                    <option value="custom_tb">Custom Normalized Price ($ / TB)</option>
                  </select>
                </div>

                {pricingMode === 'preset' ? (
                  <div>
                    <label htmlFor="drive-preset-select" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>
                      Drive Class Preset:
                    </label>
                    <select
                      id="drive-preset-select"
                      value={selectedDrivePreset}
                      onChange={e => setSelectedDrivePreset(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-heading)',
                      }}
                    >
                      {DRIVE_CLASS_PRICING.map(dp => (
                        <option key={dp.id} value={dp.id}>
                          {dp.name} (~${dp.avgPricePerTb}/TB)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : pricingMode === 'custom_drive' ? (
                  <div>
                    <label htmlFor="custom-cost-drive" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>
                      Unit Price ({selectedCurrency} / Drive):
                    </label>
                    <input
                      id="custom-cost-drive"
                      type="number"
                      min={10}
                      max={5000}
                      step={5}
                      value={customCostPerDrive}
                      onChange={e => setCustomCostPerDrive(Math.max(1, Number(e.target.value)))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-heading)',
                        fontWeight: 700,
                      }}
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="custom-cost-tb" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>
                      Unit Rate ({selectedCurrency} / TB):
                    </label>
                    <input
                      id="custom-cost-tb"
                      type="number"
                      min={5}
                      max={200}
                      step={1}
                      value={customCostPerTb}
                      onChange={e => setCustomCostPerTb(Math.max(1, Number(e.target.value)))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-heading)',
                        fontWeight: 700,
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {enableCost && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  marginTop: '16px',
                  padding: '12px 16px',
                  background: 'var(--bg)',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Estimated Price / Drive</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)' }} className="tabular-nums">
                    {selectedCurrency}{calcResults.costPerDrive.toFixed(0)} / disk
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Total Disk Investment</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--emerald)' }} className="tabular-nums">
                    {selectedCurrency}{calcResults.totalDriveCost.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Cost / Usable Terabyte</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)' }} className="tabular-nums">
                    {selectedCurrency}{calcResults.costPerUsableTb.toFixed(2)} / usable TB
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Cost / Raw Terabyte</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)' }} className="tabular-nums">
                    {selectedCurrency}{calcResults.costPerRawTb.toFixed(2)} / raw TB
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: All-RAID Comparison Matrix */}
      {activeTab === 'matrix' && (
        <div
          style={{
            padding: '20px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)' }}>
              Side-by-Side RAID Architecture Matrix
            </h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Comparing all RAID configurations for {calcMode === 'target-to-drives' ? `${targetUsableTb} TB target usable capacity` : `${manualDriveCount} active hard drives`} using {driveSizeTb} TB disks.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 12px' }}>RAID Level</th>
                  <th style={{ padding: '10px 12px' }}>Total Drives</th>
                  <th style={{ padding: '10px 12px' }}>Usable TB</th>
                  <th style={{ padding: '10px 12px' }}>Raw TB</th>
                  <th style={{ padding: '10px 12px' }}>Efficiency</th>
                  <th style={{ padding: '10px 12px' }}>Fault Tolerance</th>
                  <th style={{ padding: '10px 12px' }}>Rebuild Risk</th>
                  <th style={{ padding: '10px 12px' }}>Action</th>
                </tr>
              </thead>
              <tbody style={{ color: 'var(--text)' }}>
                {comparisonMatrix.map(row => {
                  const isSelected = row.id === selectedRaid;
                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: isSelected ? 'var(--surface-accent)' : undefined,
                        fontWeight: isSelected ? 700 : 400,
                      }}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: isSelected ? 'var(--accent)' : 'var(--text-heading)' }}>
                          {row.spec.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: '240px' }}>
                          {row.spec.bestUse}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }} className="tabular-nums font-mono">
                        {row.totalDrives} Drives
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--emerald)', fontWeight: 700 }} className="tabular-nums font-mono">
                        {row.usableTb.toFixed(1)} TB
                      </td>
                      <td style={{ padding: '10px 12px' }} className="tabular-nums font-mono">
                        {row.rawTb.toFixed(1)} TB
                      </td>
                      <td style={{ padding: '10px 12px' }} className="tabular-nums font-mono">
                        {row.efficiencyPct.toFixed(0)}%
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '0.78rem' }}>
                        {row.faultTolerance}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color:
                              row.rebuildRisk === 'Very High' || row.rebuildRisk === 'High'
                                ? 'var(--rose)'
                                : row.rebuildRisk === 'Very Low' || row.rebuildRisk === 'Low'
                                ? 'var(--emerald)'
                                : 'var(--amber)',
                          }}
                        >
                          {row.rebuildRisk}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {isSelected ? (
                          <span style={{ fontSize: '0.74rem', color: 'var(--accent)', fontWeight: 800 }}>Active</span>
                        ) : (
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => {
                              setSelectedRaid(row.id);
                              setActiveTab('calculator');
                            }}
                            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                          >
                            Select
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Chassis & Bay Sizing Advisor */}
      {activeTab === 'enclosure' && (
        <div
          style={{
            padding: '20px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
          }}
        >
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)' }}>
              Storage Server &amp; Chassis Enclosure Advisor
            </h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Evaluate common rackmount and desktop chassis form factors for fitting {calcResults.totalPhysicalDrives} total drives.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {CHASSIS_PRESETS.map(chassis => {
              const fits = chassis.bays >= calcResults.totalPhysicalDrives;
              const empty = chassis.bays - calcResults.totalPhysicalDrives;
              const util = Math.min(100, (calcResults.totalPhysicalDrives / chassis.bays) * 100);
              const isBest = calcResults.bestChassis.bays === chassis.bays;

              return (
                <div
                  key={chassis.bays}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: isBest
                      ? '2px solid var(--accent)'
                      : fits
                      ? '1px solid var(--border)'
                      : '1px dashed var(--border)',
                    background: isBest ? 'var(--surface-accent)' : 'var(--bg)',
                    opacity: fits ? 1 : 0.65,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: '0 0 2px', fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                        {chassis.name}
                      </h4>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{chassis.formFactor}</span>
                    </div>
                    {isBest && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          color: '#ffffff',
                          background: 'var(--accent)',
                          padding: '2px 8px',
                          borderRadius: '10px',
                        }}
                      >
                        Recommended Fit
                      </span>
                    )}
                  </div>

                  <p style={{ margin: '8px 0 12px', fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {chassis.desc}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Capacity Fit:</span>
                    <strong style={{ color: fits ? 'var(--emerald)' : 'var(--rose)' }}>
                      {fits ? `${util.toFixed(0)}% Utilized` : `Too Small (${calcResults.totalPhysicalDrives - chassis.bays} Drives Over)`}
                    </strong>
                  </div>

                  <div
                    style={{
                      height: '8px',
                      borderRadius: '4px',
                      background: 'var(--border)',
                      overflow: 'hidden',
                      marginBottom: '10px',
                    }}
                  >
                    <div
                      style={{
                        width: `${util}%`,
                        height: '100%',
                        background: fits ? (util > 90 ? 'var(--amber)' : 'var(--emerald)') : 'var(--rose)',
                      }}
                    />
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {fits ? (
                      <span>
                        <strong style={{ color: 'var(--text-heading)' }}>{empty}</strong> empty expansion bays remaining for future growth.
                      </span>
                    ) : (
                      <span>Requires a larger 3U/4U enclosure or secondary JBOD shelf.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Rebuild Risk & URE Advisory */}
      {activeTab === 'rebuild_risk' && (
        <div
          style={{
            padding: '20px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
          }}
        >
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)' }}>
              RAID Rebuild Risk &amp; Unrecoverable Read Error (URE) Physics
            </h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Why drive size, array parity type, and rebuild duration dictate data survival in production storage systems.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Risk Explanation 1 */}
            <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                  The URE Mathematical Reality
                </h4>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                Standard SATA hard drives have an Unrecoverable Read Error (URE) rating of 1 sector per $10^{14}$ bits read (~12.5 TB).
                When rebuilding a degraded RAID 5 array of 16 TB or 20 TB disks, reading through multiple terabytes of data gives a very high statistical probability of encountering an unreadable sector.
                With single-parity RAID 5, a single read error during rebuild causes catastrophic array failure.
              </p>
            </div>

            {/* Risk Explanation 2 */}
            <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Clock className="w-4 h-4 text-sky-400" />
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                  Rebuild Duration Stress ({driveSizeTb} TB Disks)
                </h4>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                At typical sustained array write rates of 160 MB/s, reconstructing a modern {driveSizeTb} TB disk takes approximately{' '}
                <strong style={{ color: 'var(--accent)' }}>~{calcResults.rebuildHours.toFixed(1)} continuous hours</strong> (over {Math.ceil(calcResults.rebuildHours / 24)} days).
                During this multi-day reconstruction window, all surviving drives are operated under 100% sequential read load, drastically elevating the risk of mechanical spindle, actuator, or electronics failure.
              </p>
            </div>

            {/* Recommendations */}
            <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                  Enterprise Engineering Recommendations
                </h4>
              </div>
              <ul style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, paddingLeft: '18px' }}>
                <li><strong style={{ color: 'var(--text-heading)' }}>Drives &ge; 6 TB:</strong> Use RAID 6 (dual parity) or RAID 10 (mirrored striping). Avoid RAID 5.</li>
                <li><strong style={{ color: 'var(--text-heading)' }}>High Write IOPS:</strong> Prefer RAID 10. Rebuilds read from only one drive, taking hours instead of days.</li>
                <li><strong style={{ color: 'var(--text-heading)' }}>Dedicated Hot Spares:</strong> Maintain at least 1 pre-powered hot spare drive in 12+ bay chassis.</li>
                <li><strong style={{ color: 'var(--text-heading)' }}>Periodic Data Scrubbing:</strong> Run monthly SMART background surface parity patrol checks to detect bad sectors early.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Tool Navigation Banner: CCTV Storage Link */}
      <div
        className="no-print"
        style={{
          marginTop: '32px',
          padding: '16px 20px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-heading)' }}>
            Need to calculate storage based on security camera bitrates and retention days?
          </span>
          <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Use the CCTV Storage Calculator to estimate daily gigabytes, motion duty cycles, H.264/H.265 codecs, and multi-site camera groups.
          </p>
        </div>

        <Link
          to="/tools/cctv-storage-calculator"
          className="button button-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.82rem',
            padding: '8px 16px',
            textDecoration: 'none',
          }}
        >
          Open CCTV Storage Calculator
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div
        className="panel no-print"
        style={{
          marginTop: '16px',
          padding: '16px 20px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-heading)' }}>
            Planning camera cable runs and PoE switch power budgets?
          </span>
          <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Verify Cat5e/Cat6/Cat6a distance limits (100m channel rule) and switch PoE capacity with the Cable Length &amp; PoE Budget Checker.
          </p>
        </div>

        <Link
          to="/tools/cable-length-poe-budget-checker"
          className="button button-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.82rem',
            padding: '8px 16px',
            textDecoration: 'none',
          }}
        >
          Open Cable &amp; PoE Checker
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div style={{ marginTop: '32px' }}>
        <AdUnitPlaceholder slotType="in-feed" />
      </div>
    </main>
  );
};
export default HardwareStorageCalculator;
