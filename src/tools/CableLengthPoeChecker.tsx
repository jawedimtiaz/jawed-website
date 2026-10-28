import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import { AdUnitPlaceholder } from '../components/AdUnitPlaceholder';
import {
  Cable,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  FileSpreadsheet,
  FileText,
  Printer,
  Sparkles,
  Info,
  Server,
  Activity,
  HardDrive,
  Camera,
  Layers,
  ChevronRight,
  Sun,
  Moon,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Wifi,
  Phone,
  Sliders,
  Scale,
} from 'lucide-react';
import { jsPDF } from 'jspdf';

// -------------------------------------------------------------
// TYPES & DEFINITIONS
// -------------------------------------------------------------

export type CableCategory = 'Cat5e' | 'Cat6' | 'Cat6a' | 'Cat7' | 'Cat8';
export type LinkSpeed = '100M' | '1G' | '2.5G' | '5G' | '10G' | '25G' | '40G';
export type LengthUnit = 'm' | 'ft';

export interface CableSpec {
  category: CableCategory;
  standard: string;
  maxFreqMHz: number;
  shielding: string;
  speedLimits: Record<LinkSpeed, number>; // distance limit in meters (0 = not supported)
  alienCrosstalkNote: string;
  gaugeAvgAwg: number;
  loopResistancePer100m: number; // Ohms per 100m loop
}

export const CABLE_SPECS: Record<CableCategory, CableSpec> = {
  Cat5e: {
    category: 'Cat5e',
    standard: 'TIA/EIA-568-C.2 Class D',
    maxFreqMHz: 100,
    shielding: 'UTP / STP',
    speedLimits: {
      '100M': 100,
      '1G': 100,
      '2.5G': 100, // 802.3bz NBASE-T
      '5G': 0, // Not rated/standard
      '10G': 0, // Not rated
      '25G': 0,
      '40G': 0,
    },
    alienCrosstalkNote: 'Cat5e is unrated for speeds above 2.5 Gbps. Do not deploy for 5G or 10GBASE-T.',
    gaugeAvgAwg: 24,
    loopResistancePer100m: 18.8,
  },
  Cat6: {
    category: 'Cat6',
    standard: 'TIA/EIA-568-C.2 Class E',
    maxFreqMHz: 250,
    shielding: 'UTP / F/UTP',
    speedLimits: {
      '100M': 100,
      '1G': 100,
      '2.5G': 100,
      '5G': 100,
      '10G': 55, // 55m standard favorable; 37m tight bundles
      '25G': 0,
      '40G': 0,
    },
    alienCrosstalkNote: 'Supports 10 Gbps up to 55 m in clean environments. Tight conduits with bundled cables drop reliable limit to 37 m.',
    gaugeAvgAwg: 23,
    loopResistancePer100m: 15.0,
  },
  Cat6a: {
    category: 'Cat6a',
    standard: 'TIA-568-C.2-10 Class EA',
    maxFreqMHz: 500,
    shielding: 'F/UTP or S/FTP (Augmented)',
    speedLimits: {
      '100M': 100,
      '1G': 100,
      '2.5G': 100,
      '5G': 100,
      '10G': 100, // Full 100m channel
      '25G': 0,
      '40G': 0,
    },
    alienCrosstalkNote: 'Full 100 m 10 Gbps support with internal separator and alien crosstalk isolation. The enterprise standard for modern runs.',
    gaugeAvgAwg: 23,
    loopResistancePer100m: 14.2,
  },
  Cat7: {
    category: 'Cat7',
    standard: 'ISO/IEC 11801 Class F',
    maxFreqMHz: 600,
    shielding: 'S/FTP (Individually shielded pairs)',
    speedLimits: {
      '100M': 100,
      '1G': 100,
      '2.5G': 100,
      '5G': 100,
      '10G': 100,
      '25G': 0,
      '40G': 0,
    },
    alienCrosstalkNote: 'Requires strict grounding. Often uses proprietary GG45 or TERA connectors rather than standard RJ45 for full Class F.',
    gaugeAvgAwg: 23,
    loopResistancePer100m: 13.5,
  },
  Cat8: {
    category: 'Cat8',
    standard: 'ANSI/TIA-568-C.2-1 Class I/II',
    maxFreqMHz: 2000,
    shielding: 'S/FTP heavy shielded',
    speedLimits: {
      '100M': 100,
      '1G': 100,
      '2.5G': 100,
      '5G': 100,
      '10G': 100,
      '25G': 30, // 30m data center switch-to-server channel
      '40G': 30, // 30m data center channel
    },
    alienCrosstalkNote: 'Engineered for 25G/40GBASE-T top-of-rack data center server interconnects up to 30 m channel length.',
    gaugeAvgAwg: 22,
    loopResistancePer100m: 11.8,
  },
};

export type PoeStandardId = '802.3af' | '802.3at' | '802.3bt-type3' | '802.3bt-type4';

export interface PoeStandardSpec {
  id: PoeStandardId;
  name: string;
  commonName: string;
  maxPseWatts: number; // Switch port max output
  minPdWatts: number;  // Guaranteed power at Powered Device end of 100m cable
  pairsUsed: '2-Pair' | '4-Pair';
  classRange: string;
  classes: number[];
  typicalDevices: string;
}

export const POE_STANDARDS: Record<PoeStandardId, PoeStandardSpec> = {
  '802.3af': {
    id: '802.3af',
    name: 'IEEE 802.3af',
    commonName: 'PoE (Type 1)',
    maxPseWatts: 15.4,
    minPdWatts: 12.95,
    pairsUsed: '2-Pair',
    classRange: 'Class 0 to 3',
    classes: [0, 1, 2, 3],
    typicalDevices: 'Basic IP dome cameras, VoIP desk phones, door entry controllers, IoT sensors',
  },
  '802.3at': {
    id: '802.3at',
    name: 'IEEE 802.3at',
    commonName: 'PoE+ (Type 2)',
    maxPseWatts: 30.0,
    minPdWatts: 25.5,
    pairsUsed: '2-Pair',
    classRange: 'Class 4',
    classes: [4],
    typicalDevices: 'Dual-band Wi-Fi 6 APs, outdoor IP cameras with IR night vision, video intercoms',
  },
  '802.3bt-type3': {
    id: '802.3bt-type3',
    name: 'IEEE 802.3bt (Type 3)',
    commonName: 'PoE++ (4PPoE / UPoE)',
    maxPseWatts: 60.0,
    minPdWatts: 51.0,
    pairsUsed: '4-Pair',
    classRange: 'Class 5 to 6',
    classes: [5, 6],
    typicalDevices: 'Tri-band Wi-Fi 6E/7 APs, PTZ speed dome cameras with heaters/blowers, digital signage',
  },
  '802.3bt-type4': {
    id: '802.3bt-type4',
    name: 'IEEE 802.3bt (Type 4)',
    commonName: 'High-Power PoE++ (90W)',
    maxPseWatts: 90.0,
    minPdWatts: 71.3,
    pairsUsed: '4-Pair',
    classRange: 'Class 7 to 8',
    classes: [7, 8],
    typicalDevices: 'Heavy-duty long-range PTZ cameras, intelligent LED lighting, PoE thin clients, POS terminals',
  },
};

export interface PoeClassInfo {
  label: string;
  watts: number;
  standard: PoeStandardId;
  defaultDescription: string;
}

export const POE_CLASSES: Record<string, PoeClassInfo> = {
  'Class 0 (15.4 W)': { label: 'Class 0', watts: 15.4, standard: '802.3af', defaultDescription: 'Default unclassified 802.3af device' },
  'Class 1 (4.0 W)': { label: 'Class 1', watts: 4.0, standard: '802.3af', defaultDescription: 'Very low power IoT sensors, simple phones' },
  'Class 2 (7.0 W)': { label: 'Class 2', watts: 7.0, standard: '802.3af', defaultDescription: 'Standard VoIP desk phones, door contacts' },
  'Class 3 (15.4 W)': { label: 'Class 3', watts: 15.4, standard: '802.3af', defaultDescription: 'Fixed IP cameras (no heater), basic Wi-Fi APs' },
  'Class 4 (30.0 W)': { label: 'Class 4 (PoE+)', watts: 30.0, standard: '802.3at', defaultDescription: 'Outdoor IR cameras, Wi-Fi 6 APs, video intercoms' },
  'Class 5 (45.0 W)': { label: 'Class 5 (PoE++)', watts: 45.0, standard: '802.3bt-type3', defaultDescription: 'High-performance Wi-Fi 6E/7 APs, compact PTZ cameras' },
  'Class 6 (60.0 W)': { label: 'Class 6 (PoE++)', watts: 60.0, standard: '802.3bt-type3', defaultDescription: 'Full PTZ cameras with heaters, small digital displays' },
  'Class 7 (75.0 W)': { label: 'Class 7 (90W)', watts: 75.0, standard: '802.3bt-type4', defaultDescription: 'Heavy-duty PTZ camera systems, multi-sensor cameras' },
  'Class 8 (90.0 W)': { label: 'Class 8 (90W)', watts: 90.0, standard: '802.3bt-type4', defaultDescription: 'High-power smart building LED fixtures, PoE PC hubs' },
};

export interface DeviceRow {
  id: string;
  name: string;
  qty: number;
  classKey: string;
  wattsEach: number;
  estCableLengthM: number;
}

export interface PresetScenario {
  id: string;
  name: string;
  desc: string;
  cableCategory: CableCategory;
  linkSpeed: LinkSpeed;
  channelLengthM: number;
  switchBudgetWatts: number;
  switchPortsCount: number;
  devices: Omit<DeviceRow, 'id'>[];
}

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'retail-cctv',
    name: 'Retail Store CCTV (16-Ports)',
    desc: '12x 4MP fixed cameras + 2x outdoor PTZ cameras w/ heaters + 2x Wi-Fi APs on a 370W switch',
    cableCategory: 'Cat6',
    linkSpeed: '1G',
    channelLengthM: 65,
    switchBudgetWatts: 370,
    switchPortsCount: 16,
    devices: [
      { name: '4MP Indoor Dome Cameras', qty: 8, classKey: 'Class 3 (15.4 W)', wattsEach: 15.4, estCableLengthM: 45 },
      { name: 'Outdoor Perimeter Cameras (IR)', qty: 4, classKey: 'Class 4 (30.0 W)', wattsEach: 22.0, estCableLengthM: 70 },
      { name: 'Parking Lot PTZ Speed Domes (Heater)', qty: 2, classKey: 'Class 6 (60.0 W)', wattsEach: 55.0, estCableLengthM: 85 },
      { name: 'Staff Wi-Fi 6 Access Points', qty: 2, classKey: 'Class 4 (30.0 W)', wattsEach: 25.0, estCableLengthM: 40 },
    ],
  },
  {
    id: 'small-office',
    name: 'Small Office / Branch (8-Ports)',
    desc: '4x VoIP phones + 2x Wi-Fi 6 APs + 2x Security cameras on a 130W switch',
    cableCategory: 'Cat6',
    linkSpeed: '1G',
    channelLengthM: 40,
    switchBudgetWatts: 130,
    switchPortsCount: 8,
    devices: [
      { name: 'VoIP Executive Desk Phones', qty: 4, classKey: 'Class 2 (7.0 W)', wattsEach: 7.0, estCableLengthM: 30 },
      { name: 'Ceiling Wi-Fi 6 Access Points', qty: 2, classKey: 'Class 4 (30.0 W)', wattsEach: 24.5, estCableLengthM: 45 },
      { name: 'Lobby & Door IP Cameras', qty: 2, classKey: 'Class 3 (15.4 W)', wattsEach: 12.0, estCableLengthM: 35 },
    ],
  },
  {
    id: 'enterprise-campus',
    name: 'Enterprise Campus Wi-Fi 7 (24-Ports)',
    desc: '16x Tri-band Wi-Fi 7 APs + 4x Access Controllers + 4x 4K PTZ units on a 740W switch',
    cableCategory: 'Cat6a',
    linkSpeed: '2.5G',
    channelLengthM: 75,
    switchBudgetWatts: 740,
    switchPortsCount: 24,
    devices: [
      { name: 'Tri-band Wi-Fi 7 Access Points', qty: 16, classKey: 'Class 5 (45.0 W)', wattsEach: 32.0, estCableLengthM: 65 },
      { name: 'Biometric Access Control Readers', qty: 4, classKey: 'Class 2 (7.0 W)', wattsEach: 6.5, estCableLengthM: 50 },
      { name: 'High-Power 4K PTZ Perimeter Domes', qty: 4, classKey: 'Class 6 (60.0 W)', wattsEach: 52.0, estCableLengthM: 85 },
    ],
  },
  {
    id: 'homelab-residential',
    name: 'Smart Home & Home Lab (8-Ports)',
    desc: '4x PoE Cameras + 2x Wi-Fi APs + 1x Video Doorbell on a 65W compact desktop switch',
    cableCategory: 'Cat5e',
    linkSpeed: '1G',
    channelLengthM: 28,
    switchBudgetWatts: 65,
    switchPortsCount: 8,
    devices: [
      { name: 'Home Exterior Cameras', qty: 4, classKey: 'Class 3 (15.4 W)', wattsEach: 8.5, estCableLengthM: 25 },
      { name: 'Mesh Wi-Fi Access Points', qty: 2, classKey: 'Class 4 (30.0 W)', wattsEach: 14.0, estCableLengthM: 20 },
      { name: 'PoE Smart Video Doorbell', qty: 1, classKey: 'Class 2 (7.0 W)', wattsEach: 5.5, estCableLengthM: 18 },
    ],
  },
  {
    id: '10g-backbone-run',
    name: '10G Server / Uplink Run (Cat6 vs Cat6a)',
    desc: 'High-speed 10GBASE-T connection testing 55m and 100m channel boundaries',
    cableCategory: 'Cat6',
    linkSpeed: '10G',
    channelLengthM: 52,
    switchBudgetWatts: 240,
    switchPortsCount: 16,
    devices: [
      { name: '10G NBASE-T Wi-Fi 7 Enterprise APs', qty: 4, classKey: 'Class 5 (45.0 W)', wattsEach: 35.0, estCableLengthM: 50 },
      { name: 'PoE+ Edge Switches (PD Powered)', qty: 2, classKey: 'Class 6 (60.0 W)', wattsEach: 58.0, estCableLengthM: 52 },
    ],
  },
];

// Helper to format numbers safely
const fmt = (n: number, d = 1) => n.toFixed(d);

export const CableLengthPoeChecker: React.FC = () => {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const isDark = document.documentElement.dataset.theme === 'dark' ||
      (!document.documentElement.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('tl_theme', next);
    } catch {}
  };

  // Workspace View: 'both' | 'cable' | 'poe'
  const [activeTab, setActiveTab] = useState<'both' | 'cable' | 'poe'>('both');

  // -------------------------------------------------------------
  // CABLE LENGTH CHECKER STATE
  // -------------------------------------------------------------
  const [cableCategory, setCableCategory] = useState<CableCategory>('Cat6');
  const [linkSpeed, setLinkSpeed] = useState<LinkSpeed>('1G');
  const [channelLength, setChannelLength] = useState<number>(75);
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>('m');
  const [isBundledCrosstalk, setIsBundledCrosstalk] = useState<boolean>(false);
  const [permanentLinkPct, setPermanentLinkPct] = useState<number>(90); // 90% in wall, 10% patch cord

  // -------------------------------------------------------------
  // POE BUDGET CHECKER STATE
  // -------------------------------------------------------------
  const [switchBudgetWatts, setSwitchBudgetWatts] = useState<number>(240);
  const [switchPortsCount, setSwitchPortsCount] = useState<number>(16);
  const [deviceRows, setDeviceRows] = useState<DeviceRow[]>([
    { id: 'dev-1', name: 'IP Dome Cameras', qty: 8, classKey: 'Class 3 (15.4 W)', wattsEach: 15.4, estCableLengthM: 50 },
    { id: 'dev-2', name: 'Wi-Fi 6 Access Points', qty: 2, classKey: 'Class 4 (30.0 W)', wattsEach: 30.0, estCableLengthM: 40 },
    { id: 'dev-3', name: 'Outdoor PTZ Camera (Heater)', qty: 1, classKey: 'Class 6 (60.0 W)', wattsEach: 60.0, estCableLengthM: 80 },
  ]);

  // Action status indicators
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [exportedPdf, setExportedPdf] = useState(false);
  const [exportedCsv, setExportedCsv] = useState(false);

  // -------------------------------------------------------------
  // CABLE LENGTH CALCULATIONS
  // -------------------------------------------------------------
  const lengthMeters = useMemo(() => {
    return lengthUnit === 'ft' ? channelLength * 0.3048 : channelLength;
  }, [channelLength, lengthUnit]);

  const lengthFeet = useMemo(() => {
    return lengthUnit === 'm' ? channelLength * 3.28084 : channelLength;
  }, [channelLength, lengthUnit]);

  const cableResult = useMemo(() => {
    const spec = CABLE_SPECS[cableCategory];
    let maxDist = spec.speedLimits[linkSpeed] || 0;

    // Cat6 at 10G derating for tight bundles (alien crosstalk)
    if (cableCategory === 'Cat6' && linkSpeed === '10G' && isBundledCrosstalk) {
      maxDist = 37;
    }

    const isSupported = maxDist > 0;
    const isWithinLimit = isSupported && lengthMeters <= maxDist;
    const deltaMeters = isSupported ? maxDist - lengthMeters : -lengthMeters;
    const overMeters = Math.max(0, lengthMeters - maxDist);
    const headroomPct = isSupported && maxDist > 0 ? ((maxDist - lengthMeters) / maxDist) * 100 : 0;

    // Check permanent link vs patch cord balance
    const estPermanentLinkM = lengthMeters * (permanentLinkPct / 100);
    const estPatchCordM = lengthMeters - estPermanentLinkM;
    const isPermanentLinkWarning = estPermanentLinkM > 90;
    const isPatchCordWarning = estPatchCordM > 10;

    // Attenuation & Electrical estimate
    const loopRes = (lengthMeters / 100) * spec.loopResistancePer100m;
    const oneWayLatencyNs = (lengthMeters / 200000000) * 1e9; // ~5.0 ns per meter (NVP ≈ 0.67c)

    // Status classification
    let status: 'ok' | 'marginal' | 'over' | 'unsupported' = 'ok';
    if (!isSupported) {
      status = 'unsupported';
    } else if (!isWithinLimit) {
      status = 'over';
    } else if (headroomPct <= 10 || isPermanentLinkWarning || (cableCategory === 'Cat6' && linkSpeed === '10G' && lengthMeters > 45 && !isBundledCrosstalk)) {
      status = 'marginal';
    }

    return {
      spec,
      maxDistM: maxDist,
      maxDistFt: maxDist * 3.28084,
      isSupported,
      isWithinLimit,
      overMeters,
      overFeet: overMeters * 3.28084,
      deltaMeters,
      headroomPct,
      estPermanentLinkM,
      estPatchCordM,
      isPermanentLinkWarning,
      isPatchCordWarning,
      loopResistanceOhms: loopRes,
      oneWayLatencyNs,
      status,
    };
  }, [cableCategory, linkSpeed, lengthMeters, isBundledCrosstalk, permanentLinkPct]);

  // -------------------------------------------------------------
  // POE BUDGET CALCULATIONS
  // -------------------------------------------------------------
  const poeResult = useMemo(() => {
    let totalRequestedWatts = 0;
    let totalPortsUsed = 0;
    let maxSinglePortWatts = 0;
    let highestStandard: PoeStandardId = '802.3af';
    let totalCopperCableHeatLossWatts = 0;

    const deviceBreakdowns = deviceRows.map(row => {
      const classInfo = POE_CLASSES[row.classKey] || POE_CLASSES['Class 3 (15.4 W)'];
      const effectiveWattsEach = row.wattsEach > 0 ? row.wattsEach : classInfo.watts;
      const subtotalWatts = effectiveWattsEach * row.qty;
      totalRequestedWatts += subtotalWatts;
      totalPortsUsed += row.qty;

      if (effectiveWattsEach > maxSinglePortWatts) {
        maxSinglePortWatts = effectiveWattsEach;
      }

      // Cable DC resistance power loss calculation (I^2 * R)
      // Standard 48V - 54V PoE nominal
      // Current I = Power / Voltage. For 2-pair or 4-pair
      const currentAmps = effectiveWattsEach / 50.0;
      const spec = CABLE_SPECS[cableCategory];
      const runResistance = (row.estCableLengthM / 100) * spec.loopResistancePer100m;
      // Pair sharing: 4-pair standards halve the loop resistance
      const is4Pair = classInfo.standard === '802.3bt-type3' || classInfo.standard === '802.3bt-type4';
      const effectiveResistance = is4Pair ? runResistance / 2 : runResistance;
      const singleCableLossWatts = Math.min(effectiveWattsEach * 0.25, Math.pow(currentAmps, 2) * effectiveResistance);
      const totalRowCableLoss = singleCableLossWatts * row.qty;
      totalCopperCableHeatLossWatts += totalRowCableLoss;

      return {
        ...row,
        classInfo,
        effectiveWattsEach,
        subtotalWatts,
        singleCableLossWatts,
        totalRowCableLoss,
        wattsDeliveredAtDevice: Math.max(0, effectiveWattsEach - singleCableLossWatts),
      };
    });

    if (maxSinglePortWatts > 60) {
      highestStandard = '802.3bt-type4';
    } else if (maxSinglePortWatts > 30) {
      highestStandard = '802.3bt-type3';
    } else if (maxSinglePortWatts > 15.4) {
      highestStandard = '802.3at';
    } else {
      highestStandard = '802.3af';
    }

    const remainingBudgetWatts = switchBudgetWatts - totalRequestedWatts;
    const utilizationPct = switchBudgetWatts > 0 ? (totalRequestedWatts / switchBudgetWatts) * 100 : 0;
    const recommendedBudgetWithHeadroomWatts = Math.ceil(totalRequestedWatts * 1.25); // 20% headroom safety buffer
    const availablePortsRemaining = switchPortsCount - totalPortsUsed;
    const isPortExceeded = totalPortsUsed > switchPortsCount;

    let status: 'ok' | 'tight' | 'over' | 'nobudget' = 'ok';
    if (!(switchBudgetWatts > 0)) {
      status = 'nobudget';
    } else if (totalRequestedWatts > switchBudgetWatts || isPortExceeded) {
      status = 'over';
    } else if (utilizationPct > 80) {
      status = 'tight';
    }

    return {
      totalRequestedWatts,
      totalPortsUsed,
      maxSinglePortWatts,
      highestStandard,
      remainingBudgetWatts,
      utilizationPct,
      recommendedBudgetWithHeadroomWatts,
      availablePortsRemaining,
      isPortExceeded,
      totalCopperCableHeatLossWatts,
      status,
      deviceBreakdowns,
    };
  }, [deviceRows, switchBudgetWatts, switchPortsCount, cableCategory]);

  // -------------------------------------------------------------
  // DEVICE MANAGEMENT HANDLERS
  // -------------------------------------------------------------
  const handleAddDevice = (template?: Partial<DeviceRow>) => {
    const newId = `dev-${Date.now()}`;
    const newRow: DeviceRow = {
      id: newId,
      name: template?.name || 'New PoE Device',
      qty: template?.qty || 1,
      classKey: template?.classKey || 'Class 3 (15.4 W)',
      wattsEach: template?.wattsEach || 15.4,
      estCableLengthM: template?.estCableLengthM || 50,
    };
    setDeviceRows(prev => [...prev, newRow]);
  };

  const handleUpdateDevice = (id: string, updated: Partial<DeviceRow>) => {
    setDeviceRows(prev =>
      prev.map(row => {
        if (row.id !== id) return row;
        const next = { ...row, ...updated };
        // If classKey changed, auto-update wattsEach unless explicitly overridden
        if (updated.classKey && !updated.wattsEach) {
          next.wattsEach = POE_CLASSES[updated.classKey]?.watts || 15.4;
        }
        return next;
      })
    );
  };

  const handleDeleteDevice = (id: string) => {
    if (deviceRows.length <= 1) return;
    setDeviceRows(prev => prev.filter(r => r.id !== id));
  };

  const handleDuplicateDevice = (id: string) => {
    const source = deviceRows.find(r => r.id === id);
    if (!source) return;
    const newId = `dev-${Date.now()}`;
    setDeviceRows(prev => [...prev, { ...source, id: newId, name: `${source.name} (Copy)` }]);
  };

  const handleApplyPreset = (preset: PresetScenario) => {
    setCableCategory(preset.cableCategory);
    setLinkSpeed(preset.linkSpeed);
    setChannelLength(preset.channelLengthM);
    setLengthUnit('m');
    setSwitchBudgetWatts(preset.switchBudgetWatts);
    setSwitchPortsCount(preset.switchPortsCount);
    setDeviceRows(
      preset.devices.map((d, i) => ({
        ...d,
        id: `preset-${preset.id}-${i}-${Date.now()}`,
      }))
    );
  };

  const handleResetDefaults = () => {
    setCableCategory('Cat6');
    setLinkSpeed('1G');
    setChannelLength(75);
    setLengthUnit('m');
    setIsBundledCrosstalk(false);
    setPermanentLinkPct(90);
    setSwitchBudgetWatts(240);
    setSwitchPortsCount(16);
    setDeviceRows([
      { id: 'dev-1', name: 'IP Dome Cameras', qty: 8, classKey: 'Class 3 (15.4 W)', wattsEach: 15.4, estCableLengthM: 50 },
      { id: 'dev-2', name: 'Wi-Fi 6 Access Points', qty: 2, classKey: 'Class 4 (30.0 W)', wattsEach: 30.0, estCableLengthM: 40 },
      { id: 'dev-3', name: 'Outdoor PTZ Camera (Heater)', qty: 1, classKey: 'Class 6 (60.0 W)', wattsEach: 60.0, estCableLengthM: 80 },
    ]);
  };

  // -------------------------------------------------------------
  // COPY SUMMARY & EXPORTS
  // -------------------------------------------------------------
  const handleCopySummary = () => {
    const text = `=====================================================
CABLE LENGTH & POE BUDGET AUDIT SPECIFICATION
Generated via Jawed Imtiaz Tools (jawed.co.in/tools)
=====================================================

1. CABLE RUN VERIFICATION:
• Cable Category: ${cableCategory} (${cableResult.spec.standard})
• Target Link Speed: ${linkSpeed}
• Channel Run Length: ${lengthMeters.toFixed(1)} m (${lengthFeet.toFixed(0)} ft)
• Maximum Certified Distance: ${cableResult.maxDistM > 0 ? `${cableResult.maxDistM} m (${cableResult.maxDistFt.toFixed(0)} ft)` : 'Not Rated'}
• Compliance Status: ${cableResult.status === 'ok' ? 'PASS (Within certified limits)' : cableResult.status === 'marginal' ? 'MARGINAL (Close to channel limits)' : cableResult.status === 'over' ? `FAIL (Too long by ${cableResult.overMeters.toFixed(1)} m)` : 'FAIL (Speed not supported on this category)'}
• Channel Architecture: ~${cableResult.estPermanentLinkM.toFixed(1)} m permanent solid link + ~${cableResult.estPatchCordM.toFixed(1)} m stranded patch cords
• Loop DC Resistance: ~${cableResult.loopResistanceOhms.toFixed(1)} Ω

2. SWITCH POE POWER BUDGET AUDIT:
• Switch Total PoE Budget: ${switchBudgetWatts} Watts
• Switch Total Ports: ${switchPortsCount} Ports
• Total Requested PoE Power: ${poeResult.totalRequestedWatts.toFixed(1)} Watts
• Total Active PoE Ports: ${poeResult.totalPortsUsed} / ${switchPortsCount} Ports (${poeResult.availablePortsRemaining >= 0 ? `${poeResult.availablePortsRemaining} ports available` : `${Math.abs(poeResult.availablePortsRemaining)} ports exceeded`})
• Remaining PoE Budget: ${poeResult.remainingBudgetWatts.toFixed(1)} Watts
• Power Utilization: ${poeResult.utilizationPct.toFixed(1)}% (${poeResult.status === 'ok' ? 'Optimal Headroom (<80%)' : poeResult.status === 'tight' ? 'Tight Headroom (>80%)' : 'OVER BUDGET'})
• Minimum Required Switch Capability: ${POE_STANDARDS[poeResult.highestStandard].name} (${POE_STANDARDS[poeResult.highestStandard].commonName})
• Recommended Switch Sizing (w/ 20% Headroom): ${poeResult.recommendedBudgetWithHeadroomWatts} Watts
• Estimated Total Copper Cable Heat Dissipation: ~${poeResult.totalCopperCableHeatLossWatts.toFixed(1)} Watts

3. CONNECTED DEVICE INVENTORY:
${deviceRows.map((d, i) => `  ${i + 1}. ${d.name}: ${d.qty}x @ ${d.wattsEach}W (${d.classKey}) = ${(d.qty * d.wattsEach).toFixed(1)}W [Avg Run: ${d.estCableLengthM}m]`).join('\n')}
=====================================================`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  // CSV Export Engine
  const handleExportCsv = () => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const dateStamp = new Date().toISOString().split('T')[0];

    const escapeCsv = (val: string | number | boolean | null | undefined): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows: (string | number)[][] = [
      ['ETHERNET CABLE LENGTH & POE POWER BUDGET SPECIFICATION REPORT'],
      ['Generated Date & Time', timestamp],
      ['Source Application', 'Jawed Imtiaz Tools - Cable Length & PoE Budget Checker'],
      ['URL', 'https://jawed.co.in/tools/cable-length-poe-budget-checker'],
      [],
      ['1. CABLE LENGTH & LINK SPEED AUDIT'],
      ['Parameter', 'Configured Value', 'Unit / Details'],
      ['Cable Category', cableCategory, cableResult.spec.standard],
      ['Target Link Speed', linkSpeed, 'Ethernet signaling speed'],
      ['Configured Channel Run Length', `${lengthMeters.toFixed(1)} m`, `${lengthFeet.toFixed(1)} ft`],
      ['Maximum Certified Limit', cableResult.maxDistM > 0 ? `${cableResult.maxDistM} m` : 'Not Rated', `${cableResult.maxDistFt.toFixed(1)} ft`],
      ['Compliance Status', cableResult.status.toUpperCase(), cableResult.isWithinLimit ? 'Within standard limit' : `Exceeds by ${cableResult.overMeters.toFixed(1)} m`],
      ['Permanent Link (In-Wall/Solid)', `${cableResult.estPermanentLinkM.toFixed(1)} m`, 'Standard max limit is 90 m'],
      ['Patch Cords Total (Stranded)', `${cableResult.estPatchCordM.toFixed(1)} m`, 'Standard max limit is 10 m combined'],
      ['Estimated Copper DC Loop Resistance', `${cableResult.loopResistanceOhms.toFixed(1)} Ohms`, 'Based on standard 23/24 AWG solid copper'],
      ['Estimated One-Way Propagation Delay', `${cableResult.oneWayLatencyNs.toFixed(1)} ns`, 'Nominal velocity of propagation ~0.67c'],
      ['Bundle Alien Crosstalk Warning', isBundledCrosstalk ? 'Active (Derated to 37m for Cat6 10G)' : 'Standard / Low risk', ''],
      [],
      ['2. SWITCH POE POWER BUDGET AUDIT'],
      ['Metric', 'Calculated Value', 'Engineering Details'],
      ['Switch Total PoE Budget', `${switchBudgetWatts} W`, 'Rated power capacity from manufacturer datasheet'],
      ['Switch Total PoE Ports', switchPortsCount, 'Physical switch RJ45 PoE ports'],
      ['Total Requested PoE Load', `${poeResult.totalRequestedWatts.toFixed(1)} W`, 'Sum of all connected device reserved classes'],
      ['Total Active PoE Ports Utilized', `${poeResult.totalPortsUsed} / ${switchPortsCount}`, poeResult.isPortExceeded ? 'EXCEEDS SWITCH PORT CAPACITY' : 'Within switch capacity'],
      ['Remaining Available PoE Budget', `${poeResult.remainingBudgetWatts.toFixed(1)} W`, poeResult.remainingBudgetWatts >= 0 ? 'Available for future devices' : 'DEFICIT - POWER EXCEEDED'],
      ['Power Utilization Percentage', `${poeResult.utilizationPct.toFixed(1)}%`, poeResult.utilizationPct <= 80 ? 'Optimal (Under 80% planning habit)' : poeResult.utilizationPct <= 100 ? 'Tight (Over 80% threshold)' : 'OVERLOADED (>100%)'],
      ['Minimum Required Port Standard', POE_STANDARDS[poeResult.highestStandard].name, `${POE_STANDARDS[poeResult.highestStandard].commonName} (${POE_STANDARDS[poeResult.highestStandard].maxPseWatts}W max port output)`],
      ['Recommended Sized Switch Budget', `${poeResult.recommendedBudgetWithHeadroomWatts} W`, 'Includes 20% safety headroom for startup surges'],
      ['Estimated Copper Cable Heat Loss', `${poeResult.totalCopperCableHeatLossWatts.toFixed(1)} W`, 'Dissipated as thermal heating across runs'],
      [],
      ['3. CONNECTED POE DEVICE INVENTORY'],
      ['Device Description', 'Quantity', 'PoE Class', 'Port Output (W)', 'Total Load (W)', 'Avg Cable Length (m)', 'Est. Cable Heat Loss (W)', 'Power at Device (W)'],
      ...poeResult.deviceBreakdowns.map(dev => [
        dev.name,
        dev.qty,
        dev.classKey,
        dev.effectiveWattsEach.toFixed(1),
        dev.subtotalWatts.toFixed(1),
        `${dev.estCableLengthM} m`,
        dev.totalRowCableLoss.toFixed(2),
        dev.wattsDeliveredAtDevice.toFixed(1),
      ]),
      [
        'TOTALS',
        poeResult.totalPortsUsed,
        '—',
        '—',
        `${poeResult.totalRequestedWatts.toFixed(1)} W`,
        '—',
        `${poeResult.totalCopperCableHeatLossWatts.toFixed(1)} W`,
        `${(poeResult.totalRequestedWatts - poeResult.totalCopperCableHeatLossWatts).toFixed(1)} W`,
      ],
      [],
      ['4. IEEE POE STANDARDS REFERENCE GUIDE'],
      ['Standard', 'Common Name', 'Max Switch Port Output (W)', 'Min Guaranteed at Device (W)', 'Conductor Pairs', 'Class Range', 'Typical Hardware'],
      ['802.3af', 'PoE (Type 1)', '15.4 W', '12.95 W', '2-Pair', 'Class 0 to 3', 'VoIP phones, static dome IP cameras, sensors'],
      ['802.3at', 'PoE+ (Type 2)', '30.0 W', '25.50 W', '2-Pair', 'Class 4', 'Wi-Fi 6 APs, outdoor cameras with IR illumination'],
      ['802.3bt Type 3', 'PoE++ (4PPoE)', '60.0 W', '51.00 W', '4-Pair', 'Class 5 to 6', 'Wi-Fi 6E/7 APs, PTZ cameras with heaters, signage'],
      ['802.3bt Type 4', 'High-Power PoE++', '90.0 W', '71.30 W', '4-Pair', 'Class 7 to 8', 'Heavy PTZ systems, intelligent LED fixtures, thin clients'],
      [],
      ['5. TECHNICAL METHODOLOGY & INSTALLATION RULES'],
      ['100m Channel Rule', 'Twisted-pair Ethernet channel limit is 100 metres (328 ft): up to 90m solid permanent horizontal cable + 10m patch cords total.'],
      ['80% Planning Rule', 'Keep continuous PoE load under 80% of total budget to safeguard against thermal derating and camera IR startup spikes.'],
      ['Solid Copper Notice', 'Never use Copper-Clad Aluminium (CCA) for PoE. CCA has high electrical resistance, melts jackets, and causes extreme voltage drops.'],
      ['Class Reservation', 'Switches allocate PoE power based on IEEE class negotiated at link up, regardless of whether the device is idling.'],
    ];

    const csvContent = '\uFEFF' + rows.map(r => r.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cable-length-poe-specification-${cableCategory}-${lengthMeters.toFixed(0)}m-${poeResult.totalRequestedWatts.toFixed(0)}W-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportedCsv(true);
    setTimeout(() => setExportedCsv(false), 2500);
  };

  // PDF Export Engine
  const handleExportPdf = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      const dateStamp = new Date().toISOString().split('T')[0];

      // ==========================================
      // PAGE 1: ENGINEERING AUDIT REPORT
      // ==========================================

      // Top Navy Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.roundedRect(14, 12, 182, 24, 2.5, 2.5, 'F');

      // Accent Left Bar
      doc.setFillColor(56, 189, 248); // sky-400
      doc.roundedRect(14, 12, 3.5, 24, 1.5, 1.5, 'F');

      // Title & Subtitle
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('ETHERNET CABLE & POE POWER AUDIT SPECIFICATION', 21, 20);

      doc.setTextColor(203, 213, 225);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Structured Cabling Certification & PoE Power Budget Engineering Report', 21, 26);

      // Meta
      doc.setFontSize(7.5);
      doc.text(`Generated: ${dateStr}`, 192, 19, { align: 'right' });
      doc.setTextColor(56, 189, 248);
      doc.text('Tools: jawed.co.in/tools', 192, 24, { align: 'right' });

      // Highlight KPI Cards (3 boxes)
      const cardY = 40;
      const cardH = 22;
      const cardW = 58;

      // Card 1: Cable Run Status
      const isCablePass = cableResult.isWithinLimit;
      doc.setFillColor(isCablePass ? 240 : 254, isCablePass ? 253 : 242, isCablePass ? 244 : 242);
      doc.setDrawColor(isCablePass ? 187 : 254, isCablePass ? 247 : 202, isCablePass ? 208 : 202);
      doc.roundedRect(14, cardY, cardW, cardH, 2, 2, 'FD');

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.text('CABLE RUN CERTIFICATION', 18, cardY + 5.5);

      doc.setTextColor(isCablePass ? 5 : 225, isCablePass ? 150 : 29, isCablePass ? 105 : 72);
      doc.setFontSize(13);
      doc.text(cableResult.isSupported ? (cableResult.isWithinLimit ? 'PASS - IN LIMIT' : 'FAIL - TOO LONG') : 'UNSUPPORTED', 18, cardY + 13);

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`${lengthMeters.toFixed(1)}m of ${cableResult.maxDistM}m limit (${cableCategory} @ ${linkSpeed})`, 18, cardY + 18.5);

      // Card 2: PoE Budget Utilization
      const isPoeOk = poeResult.status === 'ok';
      const isPoeTight = poeResult.status === 'tight';
      doc.setFillColor(isPoeOk ? 240 : isPoeTight ? 255 : 254, isPoeOk ? 253 : isPoeTight ? 251 : 242, isPoeOk ? 244 : isPoeTight ? 235 : 242);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(76, cardY, cardW, cardH, 2, 2, 'FD');

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.text('SWITCH POE UTILIZATION', 80, cardY + 5.5);

      doc.setTextColor(isPoeOk ? 5 : isPoeTight ? 217 : 225, isPoeOk ? 150 : isPoeTight ? 119 : 29, isPoeOk ? 105 : isPoeTight ? 6 : 72);
      doc.setFontSize(13);
      doc.text(`${poeResult.totalRequestedWatts.toFixed(1)} W / ${switchBudgetWatts} W`, 80, cardY + 13);

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`${poeResult.utilizationPct.toFixed(0)}% Budget · ${poeResult.remainingBudgetWatts.toFixed(1)}W Left`, 80, cardY + 18.5);

      // Card 3: Switch Ports Allocation
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(138, cardY, cardW, cardH, 2, 2, 'FD');

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.text('POE PORTS CAPACITY', 142, cardY + 5.5);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(13);
      doc.text(`${poeResult.totalPortsUsed} of ${switchPortsCount} Ports`, 142, cardY + 13);

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`Min Standard: ${POE_STANDARDS[poeResult.highestStandard].commonName}`, 142, cardY + 18.5);

      // SECTION 1: Cable Channel Verification Table
      let curY = 68;
      doc.setFillColor(15, 23, 42);
      doc.rect(14, curY, 182, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('1. STRUCTURED CABLING & CHANNEL LENGTH SPECIFICATION', 17, curY + 4.2);

      const cableItems = [
        ['Cable Category & Standard', `${cableCategory} (${cableResult.spec.standard})`, `Bandwidth: ${cableResult.spec.maxFreqMHz} MHz · ${cableResult.spec.shielding}`],
        ['Target Ethernet Link Speed', `${linkSpeed}`, 'Physical layer signaling throughput'],
        ['Total Channel Length Tested', `${lengthMeters.toFixed(1)} m (${lengthFeet.toFixed(1)} ft)`, 'Combined permanent link + all patch cords'],
        ['Certified Standard Limit', cableResult.maxDistM > 0 ? `${cableResult.maxDistM} m (${cableResult.maxDistFt.toFixed(1)} ft)` : 'Not Supported', cableResult.isSupported ? `${cableResult.headroomPct >= 0 ? `${cableResult.headroomPct.toFixed(1)}% Headroom` : `${cableResult.overMeters.toFixed(1)}m Over Limit`}` : 'Speed unrated on category'],
        ['Permanent In-Wall Solid Run', `${cableResult.estPermanentLinkM.toFixed(1)} m`, cableResult.isPermanentLinkWarning ? 'EXCEEDS 90m PERMANENT LINK STANDARD' : 'Within 90m solid horizontal run allowance'],
        ['Patch Cords Allowance (Both Ends)', `${cableResult.estPatchCordM.toFixed(1)} m`, cableResult.isPatchCordWarning ? 'EXCEEDS 10m COMBINED PATCH CORD ALLOWANCE' : 'Within 10m stranded patch cord standard'],
        ['Loop DC Resistance & Latency', `~${cableResult.loopResistanceOhms.toFixed(1)} Ohms`, `One-way propagation delay: ~${cableResult.oneWayLatencyNs.toFixed(1)} ns`],
      ];

      curY += 6;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      const rowH = 6.2;
      doc.rect(14, curY, 182, cableItems.length * rowH, 'FD');

      cableItems.forEach((item, idx) => {
        const itemY = curY + idx * rowH;
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, itemY, 182, rowH, 'F');
        }
        doc.setDrawColor(241, 245, 249);
        doc.line(14, itemY + rowH, 196, itemY + rowH);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text(item[0], 17, itemY + 4.2);

        doc.setTextColor(15, 23, 42);
        doc.text(item[1], 75, itemY + 4.2);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(item[2], 125, itemY + 4.2);
      });

      // SECTION 2: Switch PoE Power Budget Table
      curY += cableItems.length * rowH + 6;
      doc.setFillColor(15, 23, 42);
      doc.rect(14, curY, 182, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('2. SWITCH POE POWER BUDGET & HEADROOM ALLOCATION', 17, curY + 4.2);

      const poeItems = [
        ['Switch Total PoE Budget', `${switchBudgetWatts} Watts`, 'Datasheet rated power supply capacity'],
        ['Total Requested Device Load', `${poeResult.totalRequestedWatts.toFixed(1)} Watts`, 'Combined class power reserved by devices'],
        ['Remaining Switch Power Reserve', `${poeResult.remainingBudgetWatts.toFixed(1)} Watts`, poeResult.remainingBudgetWatts >= 0 ? 'Surplus buffer available' : 'CRITICAL DEFICIT - INSUFFICIENT POWER'],
        ['Power Budget Utilization', `${poeResult.utilizationPct.toFixed(1)}%`, poeResult.utilizationPct <= 80 ? 'Optimal (Maintains 80% safe headroom)' : 'High Load (Exceeds 80% planning habit)'],
        ['Switch PoE Port Allocation', `${poeResult.totalPortsUsed} of ${switchPortsCount} Ports`, `${poeResult.availablePortsRemaining} unused PoE switch ports remaining`],
        ['Required Switch Port Standard', POE_STANDARDS[poeResult.highestStandard].name, `Minimum ${POE_STANDARDS[poeResult.highestStandard].commonName} (${POE_STANDARDS[poeResult.highestStandard].maxPseWatts}W port power)`],
        ['Recommended Sized Switch Capacity', `${poeResult.recommendedBudgetWithHeadroomWatts} Watts`, 'Calculated with 20% safety headroom for device power surges'],
      ];

      curY += 6;
      doc.setFillColor(255, 255, 255);
      doc.rect(14, curY, 182, poeItems.length * rowH, 'FD');

      poeItems.forEach((item, idx) => {
        const itemY = curY + idx * rowH;
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, itemY, 182, rowH, 'F');
        }
        doc.setDrawColor(241, 245, 249);
        doc.line(14, itemY + rowH, 196, itemY + rowH);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text(item[0], 17, itemY + 4.2);

        doc.setTextColor(15, 23, 42);
        doc.text(item[1], 75, itemY + 4.2);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(item[2], 125, itemY + 4.2);
      });

      // SECTION 3: Device Inventory Table
      curY += poeItems.length * rowH + 6;
      doc.setFillColor(15, 23, 42);
      doc.rect(14, curY, 182, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('3. CONNECTED POE DEVICE INVENTORY & POWER AUDIT', 17, curY + 4.2);

      curY += 6;
      const devH = 6.2;
      // Header row
      doc.setFillColor(241, 245, 249);
      doc.rect(14, curY, 182, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text('DEVICE DESCRIPTION', 17, curY + 4.2);
      doc.text('QTY', 85, curY + 4.2);
      doc.text('CLASS', 100, curY + 4.2);
      doc.text('WATTS EA', 125, curY + 4.2);
      doc.text('TOTAL W', 145, curY + 4.2);
      doc.text('AVG RUN', 165, curY + 4.2);
      doc.text('PD DELIVERED', 182, curY + 4.2);

      curY += 6;
      poeResult.deviceBreakdowns.forEach((dev, idx) => {
        const itemY = curY + idx * devH;
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, itemY, 182, devH, 'F');
        }
        doc.setDrawColor(241, 245, 249);
        doc.line(14, itemY + devH, 196, itemY + devH);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(15, 23, 42);
        const nameTrunc = dev.name.length > 35 ? dev.name.substring(0, 32) + '...' : dev.name;
        doc.text(nameTrunc, 17, itemY + 4.2);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(String(dev.qty), 87, itemY + 4.2);
        doc.text(dev.classKey.split(' ')[0] + ' ' + dev.classKey.split(' ')[1], 100, itemY + 4.2);
        doc.text(`${dev.effectiveWattsEach.toFixed(1)}W`, 125, itemY + 4.2);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 132, 199);
        doc.text(`${dev.subtotalWatts.toFixed(1)}W`, 145, itemY + 4.2);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`${dev.estCableLengthM}m`, 165, itemY + 4.2);
        doc.text(`${dev.wattsDeliveredAtDevice.toFixed(1)}W`, 182, itemY + 4.2);
      });

      // Page 1 Footer
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 280, 196, 280);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('Cable Length & PoE Budget Checker · jawed.co.in/tools · Browser-based Engineering Specification', 14, 284);
      doc.text('Page 1 of 1', 196, 284, { align: 'right' });

      // Save PDF file
      doc.save(`cable-length-poe-specification-${cableCategory}-${lengthMeters.toFixed(0)}m-${poeResult.totalRequestedWatts.toFixed(0)}W-${dateStamp}.pdf`);

      setExportedPdf(true);
      setTimeout(() => setExportedPdf(false), 2500);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    }
  };

  return (
    <main className="container page cable-poe-root">
      {/* Top Bar with Breadcrumbs & Social Share */}
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
            { label: 'Cable Length & PoE Budget Checker' },
          ]}
          style={{ marginBottom: 0 }}
        />
        <SocialShareBar
          title="Cable Length & PoE Budget Checker | Jawed Imtiaz"
          text="Free browser-based Ethernet cable distance checker (Cat5e/Cat6/Cat6a) and PoE switch power budget calculator."
          url={typeof window !== 'undefined' ? `${window.location.origin}/tools/cable-length-poe-budget-checker` : 'https://jawed.co.in/tools/cable-length-poe-budget-checker'}
        />
      </div>

      {/* Hero Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
          <p className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Free tool · runs in your browser · nothing is uploaded
          </p>

          <button
            type="button"
            className="button button-secondary no-print"
            onClick={toggleTheme}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              padding: '4px 10px',
              borderRadius: '8px',
            }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                Light Mode
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                Dark Mode
              </>
            )}
          </button>
        </div>

        <h1 style={{ margin: '6px 0 10px', fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontWeight: 800 }}>
          Cable Length &amp; PoE Budget Checker
        </h1>
        <p className="lead" style={{ margin: 0, maxWidth: '820px' }}>
          Check whether a cable run is within certified distance limits for your link speed, and verify whether your network switch has enough PoE power budget for your IP cameras, Wi-Fi APs, and phones.
        </p>
      </div>

      {/* Quick Presets & Workspace View Selector */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
          padding: '12px 16px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
        }}
      >
        {/* Preset Scenarios */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>Presets:</span>
          {PRESET_SCENARIOS.map(preset => (
            <button
              key={preset.id}
              type="button"
              className="button button-secondary"
              onClick={() => handleApplyPreset(preset)}
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
              title={preset.desc}
            >
              {preset.name.split(' (')[0]}
            </button>
          ))}
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="button button-secondary"
            onClick={handleCopySummary}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            title="Copy technical audit summary to clipboard"
          >
            {copiedSummary ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-sky-400" />}
            {copiedSummary ? 'Copied Audit!' : 'Copy Summary'}
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={handleExportCsv}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            title="Export complete cable verification and PoE inventory as CSV"
          >
            {exportedCsv ? <Check className="w-4 h-4 text-emerald-400" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
            {exportedCsv ? 'Exported CSV!' : 'Download CSV'}
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={handleExportPdf}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            title="Export clean PDF engineering specification report"
          >
            {exportedPdf ? <Check className="w-4 h-4 text-emerald-400" /> : <FileText className="w-4 h-4 text-rose-400" />}
            {exportedPdf ? 'Exported PDF!' : 'Download PDF'}
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={handlePrint}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            title="Print calculation report"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            Print
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={handleResetDefaults}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            title="Reset form to defaults"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            Reset
          </button>
        </div>
      </div>

      {/* View Mode Switcher Tabs */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '10px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('both')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'both' ? 800 : 600,
            cursor: 'pointer',
            border: activeTab === 'both' ? '2px solid var(--accent)' : '1px solid var(--border)',
            background: activeTab === 'both' ? 'rgba(56, 189, 248, 0.15)' : 'var(--surface)',
            color: activeTab === 'both' ? 'var(--accent)' : 'var(--text-heading)',
          }}
        >
          <Sliders className="w-4 h-4" />
          Combined Workspace (Cable &amp; PoE)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cable')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'cable' ? 800 : 600,
            cursor: 'pointer',
            border: activeTab === 'cable' ? '2px solid var(--accent)' : '1px solid var(--border)',
            background: activeTab === 'cable' ? 'rgba(56, 189, 248, 0.15)' : 'var(--surface)',
            color: activeTab === 'cable' ? 'var(--accent)' : 'var(--text-heading)',
          }}
        >
          <Cable className="w-4 h-4 text-sky-400" />
          Cable Length Checker
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('poe')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'poe' ? 800 : 600,
            cursor: 'pointer',
            border: activeTab === 'poe' ? '2px solid var(--accent)' : '1px solid var(--border)',
            background: activeTab === 'poe' ? 'rgba(56, 189, 248, 0.15)' : 'var(--surface)',
            color: activeTab === 'poe' ? 'var(--accent)' : 'var(--text-heading)',
          }}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          PoE Power Budget Calculator
        </button>
      </div>

      {/* ========================================================= */}
      {/* MODULE 1: CABLE LENGTH & LINK SPEED VERIFICATION */}
      {/* ========================================================= */}
      {(activeTab === 'both' || activeTab === 'cable') && (
        <div
          className="panel"
          style={{
            padding: '24px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-heading)' }}>
              <Cable className="w-5 h-5 text-sky-400" />
              Cable Length &amp; Link Speed Verification
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              TIA-568 / ISO 11801 Twisted-Pair Standards
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Cable Category */}
            <div>
              <label htmlFor="cable-cat" style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                Cable Category
              </label>
              <select
                id="cable-cat"
                value={cableCategory}
                onChange={e => setCableCategory(e.target.value as CableCategory)}
                style={{ fontSize: '0.88rem' }}
              >
                <option value="Cat5e">Cat5e (100 MHz, Class D)</option>
                <option value="Cat6">Cat6 (250 MHz, Class E)</option>
                <option value="Cat6a">Cat6a (500 MHz, Class EA Augmented)</option>
                <option value="Cat7">Cat7 (600 MHz, Class F Shielded)</option>
                <option value="Cat8">Cat8 (2000 MHz, 25G/40G Data Center)</option>
              </select>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {CABLE_SPECS[cableCategory].standard}
              </div>
            </div>

            {/* Link Speed */}
            <div>
              <label htmlFor="link-spd" style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                Ethernet Link Speed
              </label>
              <select
                id="link-spd"
                value={linkSpeed}
                onChange={e => setLinkSpeed(e.target.value as LinkSpeed)}
                style={{ fontSize: '0.88rem' }}
              >
                <option value="100M">100 Mbps (Fast Ethernet)</option>
                <option value="1G">1 Gbps (1000BASE-T)</option>
                <option value="2.5G">2.5 Gbps (2.5GBASE-T / 802.3bz)</option>
                <option value="5G">5 Gbps (5GBASE-T / 802.3bz)</option>
                <option value="10G">10 Gbps (10GBASE-T)</option>
                <option value="25G">25 Gbps (25GBASE-T Cat8)</option>
                <option value="40G">40 Gbps (40GBASE-T Cat8)</option>
              </select>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Target switch-to-device interface throughput
              </div>
            </div>

            {/* Total Channel Length */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="channel-len" style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>
                  Total Channel Length
                </label>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {(['m', 'ft'] as LengthUnit[]).map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => {
                        if (u !== lengthUnit) {
                          setLengthUnit(u);
                          setChannelLength(prev => (u === 'ft' ? parseFloat((prev * 3.28084).toFixed(1)) : parseFloat((prev * 0.3048).toFixed(1))));
                        }
                      }}
                      style={{
                        padding: '1px 6px',
                        fontSize: '0.72rem',
                        borderRadius: '4px',
                        background: lengthUnit === u ? 'var(--accent)' : 'var(--bg)',
                        color: lengthUnit === u ? '#ffffff' : 'var(--text-muted)',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        fontWeight: lengthUnit === u ? 700 : 400,
                      }}
                    >
                      {u === 'm' ? 'Meters' : 'Feet'}
                    </button>
                  ))}
                </div>
              </div>
              <input
                id="channel-len"
                type="number"
                step="0.5"
                min="1"
                max="500"
                value={channelLength}
                onChange={e => setChannelLength(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                style={{ fontSize: '0.88rem' }}
              />
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                ≈ {lengthUnit === 'm' ? `${lengthFeet.toFixed(0)} feet` : `${lengthMeters.toFixed(1)} meters`}
              </div>
            </div>

            {/* Quick Length Distance Presets */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                Quick Run Presets
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                {[30, 55, 90, 100].map(mVal => {
                  const displayVal = lengthUnit === 'm' ? mVal : Math.round(mVal * 3.28084);
                  return (
                    <button
                      key={mVal}
                      type="button"
                      onClick={() => setChannelLength(displayVal)}
                      style={{
                        padding: '7px 4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '6px',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-heading)',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                      title={`Set length to ${mVal} meters`}
                    >
                      {displayVal}{lengthUnit}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                90m = Max permanent link; 100m = Max channel
              </div>
            </div>
          </div>

          {/* Environmental Conditions: Alien Crosstalk & Link Breakdown */}
          <div
            style={{
              padding: '14px 16px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              marginBottom: '20px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '0.84rem',
                margin: 0,
                color: isBundledCrosstalk ? 'var(--amber)' : 'var(--text-heading)',
                fontWeight: isBundledCrosstalk ? 700 : 500,
              }}
            >
              <input
                type="checkbox"
                checked={isBundledCrosstalk}
                onChange={e => setIsBundledCrosstalk(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--amber)' }}
              />
              Tight conduit / cable bundle (high alien crosstalk environment)
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>Permanent link breakdown:</span>
              <span style={{ fontWeight: 700, color: cableResult.isPermanentLinkWarning ? 'var(--rose)' : 'var(--text-heading)' }}>
                ~{cableResult.estPermanentLinkM.toFixed(1)}m in-wall solid
              </span>
              <span>+</span>
              <span style={{ fontWeight: 700, color: cableResult.isPatchCordWarning ? 'var(--rose)' : 'var(--text-heading)' }}>
                ~{cableResult.estPatchCordM.toFixed(1)}m patch cords
              </span>
            </div>
          </div>

          {/* Result Banner & Interactive Visual Distance Meter */}
          <div
            style={{
              padding: '20px',
              borderRadius: '14px',
              background: cableResult.status === 'ok'
                ? 'rgba(16, 185, 129, 0.08)'
                : cableResult.status === 'marginal'
                ? 'rgba(245, 158, 11, 0.08)'
                : 'rgba(244, 63, 94, 0.08)',
              border: `2px solid ${
                cableResult.status === 'ok'
                  ? 'var(--emerald)'
                  : cableResult.status === 'marginal'
                  ? 'var(--amber)'
                  : 'var(--rose)'
              }`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  {cableResult.status === 'ok' && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
                  {cableResult.status === 'marginal' && <AlertTriangle className="w-6 h-6 text-amber-400" />}
                  {cableResult.status === 'over' && <XCircle className="w-6 h-6 text-rose-400" />}
                  {cableResult.status === 'unsupported' && <XCircle className="w-6 h-6 text-rose-400" />}

                  <span
                    style={{
                      fontSize: '1.45rem',
                      fontWeight: 900,
                      color: cableResult.status === 'ok' ? 'var(--emerald)' : cableResult.status === 'marginal' ? 'var(--amber)' : 'var(--rose)',
                    }}
                  >
                    {cableResult.status === 'ok' && 'Within Certified Limit'}
                    {cableResult.status === 'marginal' && 'Warning: Close to Channel Limit'}
                    {cableResult.status === 'over' && 'Too Long: Exceeds Maximum Distance'}
                    {cableResult.status === 'unsupported' && 'Speed Not Supported on Category'}
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-muted)' }}>
                  {cableResult.isSupported ? (
                    <>
                      Testing <strong>{lengthMeters.toFixed(1)} m</strong> ({lengthFeet.toFixed(0)} ft) against the <strong>{cableResult.maxDistM} m</strong> ({cableResult.maxDistFt.toFixed(0)} ft) certified standard limit for <strong>{cableCategory}</strong> at <strong>{linkSpeed}</strong>.
                      {cableResult.isWithinLimit ? (
                        <span style={{ color: 'var(--emerald)', fontWeight: 700, marginLeft: '6px' }}>
                          ({cableResult.deltaMeters.toFixed(1)} m headroom remaining)
                        </span>
                      ) : (
                        <span style={{ color: 'var(--rose)', fontWeight: 700, marginLeft: '6px' }}>
                          (Exceeds limit by {cableResult.overMeters.toFixed(1)} m / {cableResult.overFeet.toFixed(0)} ft)
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <strong>{cableCategory}</strong> is not rated or certified for <strong>{linkSpeed}</strong> speeds under TIA/ISO standards. Upgrade to Cat6 or Cat6a.
                    </>
                  )}
                </p>
              </div>

              {/* Quick Metrics Badge */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ background: 'var(--surface)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>DC LOOP RESISTANCE</div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-heading)' }}>~{cableResult.loopResistanceOhms.toFixed(1)} Ω</strong>
                </div>
                <div style={{ background: 'var(--surface)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>ONE-WAY LATENCY</div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-heading)' }}>~{cableResult.oneWayLatencyNs.toFixed(0)} ns</strong>
                </div>
              </div>
            </div>

            {/* Visual Distance Meter Progress Bar */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span>0m</span>
                <span style={{ color: 'var(--accent)' }}>90m (Max In-Wall Solid)</span>
                <span style={{ color: 'var(--emerald)' }}>100m (Max Channel)</span>
                <span>120m+</span>
              </div>

              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '14px',
                  background: 'var(--bg)',
                  borderRadius: '7px',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                }}
              >
                {/* 90m Marker */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${(90 / 120) * 100}%`,
                    top: 0,
                    bottom: 0,
                    width: '2px',
                    background: 'rgba(56, 189, 248, 0.5)',
                    zIndex: 2,
                  }}
                  title="90m Permanent Link Boundary"
                />
                {/* 100m Marker */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${(100 / 120) * 100}%`,
                    top: 0,
                    bottom: 0,
                    width: '2px',
                    background: 'rgba(16, 185, 129, 0.8)',
                    zIndex: 2,
                  }}
                  title="100m Total Channel Limit"
                />

                {/* Actual Distance Fill */}
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, (lengthMeters / 120) * 100)}%`,
                    background: cableResult.status === 'ok'
                      ? 'linear-gradient(90deg, #38bdf8 0%, #10b981 100%)'
                      : cableResult.status === 'marginal'
                      ? 'linear-gradient(90deg, #38bdf8 0%, #f59e0b 100%)'
                      : 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)',
                    borderRadius: '6px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            {/* Engineering Warnings & Field Recommendations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
              {cableResult.isPermanentLinkWarning && (
                <div style={{ color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>Permanent Link Notice:</strong> In-wall solid run exceeds 90 m (~{cableResult.estPermanentLinkM.toFixed(1)} m). Under TIA-568 standards, the permanent horizontal link must not exceed 90 m, allowing up to 10 m total for patch cords.
                  </span>
                </div>
              )}

              {cableCategory === 'Cat6' && linkSpeed === '10G' && (
                <div style={{ color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>Cat6 10G Notice:</strong> Cat6 is rated for 10 Gbps up to 55 m only in ideal conditions. In dense wire bundles, alien crosstalk drops reliable distance to 37 m. For runs over 55 m or high-density bundles, use <strong>Cat6a</strong>.
                  </span>
                </div>
              )}

              {cableResult.status === 'over' && (
                <div style={{ color: 'var(--rose)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>Over Distance Solutions:</strong> For copper runs over 100 m, deploy an inline PoE Extender / Repeater partway, an intermediate PoE access switch, or transition to a Single-Mode Fiber optic run with media converters.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODULE 2: POE POWER BUDGET CALCULATOR */}
      {/* ========================================================= */}
      {(activeTab === 'both' || activeTab === 'poe') && (
        <div
          className="panel"
          style={{
            padding: '24px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-heading)' }}>
                <Zap className="w-5 h-5 text-amber-400" />
                Network Switch PoE Power Budget Calculator
              </h2>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Calculate total reserved wattage across IEEE 802.3af (PoE), 802.3at (PoE+), and 802.3bt (PoE++) devices.
              </p>
            </div>

            {/* Quick Switch Budget Presets */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Switch Presets:</span>
              {[65, 130, 240, 370, 740].map(w => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setSwitchBudgetWatts(w)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.74rem',
                    borderRadius: '6px',
                    background: switchBudgetWatts === w ? 'var(--amber)' : 'var(--bg)',
                    color: switchBudgetWatts === w ? '#000000' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    fontWeight: switchBudgetWatts === w ? 800 : 500,
                  }}
                >
                  {w}W
                </button>
              ))}
            </div>
          </div>

          {/* Switch Specifications Form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label htmlFor="switch-budget" style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                Switch Total PoE Budget (Watts)
              </label>
              <input
                id="switch-budget"
                type="number"
                min="1"
                step="1"
                value={switchBudgetWatts}
                onChange={e => setSwitchBudgetWatts(Math.max(1, parseFloat(e.target.value) || 1))}
                style={{ fontSize: '0.9rem' }}
                placeholder="e.g. 240, 370"
              />
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                From manufacturer datasheet (e.g. Cisco, Aruba, Ubiquiti, Netgear)
              </div>
            </div>

            <div>
              <label htmlFor="switch-ports" style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                Total Switch PoE Ports
              </label>
              <select
                id="switch-ports"
                value={switchPortsCount}
                onChange={e => setSwitchPortsCount(parseInt(e.target.value, 10) || 16)}
                style={{ fontSize: '0.9rem' }}
              >
                <option value={4}>4 Ports (Compact Desktop)</option>
                <option value={8}>8 Ports (Small Branch)</option>
                <option value={16}>16 Ports (Standard Rackmount)</option>
                <option value={24}>24 Ports (Enterprise IDF)</option>
                <option value={48}>48 Ports (High Density Core)</option>
              </select>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Physical RJ45 ports delivering PoE power
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                80% Planning Habit Target
              </label>
              <div
                style={{
                  padding: '10px 14px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Safe 80% Threshold</div>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--emerald)' }}>
                    {(switchBudgetWatts * 0.8).toFixed(1)} W
                  </strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>20% Headroom Buffer</div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-heading)' }}>
                    {(switchBudgetWatts * 0.2).toFixed(1)} W
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* PoE Budget KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div style={{ padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                TOTAL REQUESTED POWER
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8', margin: '4px 0 2px' }}>
                {poeResult.totalRequestedWatts.toFixed(1)} W
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Across {poeResult.totalPortsUsed} PoE device ports
              </div>
            </div>

            <div style={{ padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                REMAINING BUDGET
              </div>
              <div
                style={{
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  color: poeResult.remainingBudgetWatts >= 0 ? 'var(--emerald)' : 'var(--rose)',
                  margin: '4px 0 2px',
                }}
              >
                {poeResult.remainingBudgetWatts.toFixed(1)} W
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {poeResult.remainingBudgetWatts >= 0 ? 'Available surplus wattage' : 'Deficit power shortfall'}
              </div>
            </div>

            <div style={{ padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                BUDGET LOAD UTILIZATION
              </div>
              <div
                style={{
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  color: poeResult.utilizationPct <= 80 ? 'var(--emerald)' : poeResult.utilizationPct <= 100 ? 'var(--amber)' : 'var(--rose)',
                  margin: '4px 0 2px',
                }}
              >
                {poeResult.utilizationPct.toFixed(0)}%
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {poeResult.utilizationPct <= 80 ? 'Optimal planning headroom' : poeResult.utilizationPct <= 100 ? 'Warning: Tight headroom' : 'CRITICAL OVER-BUDGET'}
              </div>
            </div>

            <div style={{ padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                MINIMUM PORT STANDARD
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#818cf8', margin: '6px 0 2px' }}>
                {POE_STANDARDS[poeResult.highestStandard].commonName}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Switch ports must support {POE_STANDARDS[poeResult.highestStandard].maxPseWatts}W
              </div>
            </div>
          </div>

          {/* Visual Switch Front Panel Ports Grid */}
          <div
            style={{
              padding: '16px 20px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Server className="w-4 h-4 text-sky-400" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                  Switch Port Front-Panel Layout ({switchPortsCount} RJ45 PoE Ports):
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', fontSize: '0.72rem', fontWeight: 600 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--emerald)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--emerald)' }} />
                  802.3af (PoE)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#38bdf8' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#38bdf8' }} />
                  802.3at (PoE+)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#818cf8' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#818cf8' }} />
                  802.3bt (PoE++)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--border)' }} />
                  Empty
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(switchPortsCount, 24)}, minmax(0, 1fr))`,
                gap: '4px',
                padding: '10px',
                background: '#0b1329',
                borderRadius: '8px',
                border: '1px solid #1e293b',
              }}
            >
              {Array.from({ length: switchPortsCount }).map((_, portIdx) => {
                const portNum = portIdx + 1;
                const isOccupied = portNum <= poeResult.totalPortsUsed;

                // Color code by standard
                let portBg = '#1e293b';
                let portBorder = '#334155';
                let portColor = '#64748b';

                if (isOccupied) {
                  // Find which device group this port belongs to
                  let acc = 0;
                  let devStd: PoeStandardId = '802.3af';
                  for (const d of poeResult.deviceBreakdowns) {
                    acc += d.qty;
                    if (portNum <= acc) {
                      devStd = d.classInfo.standard;
                      break;
                    }
                  }

                  if (devStd === '802.3bt-type3' || devStd === '802.3bt-type4') {
                    portBg = 'rgba(129, 140, 248, 0.25)';
                    portBorder = '#818cf8';
                    portColor = '#c7d2fe';
                  } else if (devStd === '802.3at') {
                    portBg = 'rgba(56, 189, 248, 0.25)';
                    portBorder = '#38bdf8';
                    portColor = '#bae6fd';
                  } else {
                    portBg = 'rgba(16, 185, 129, 0.25)';
                    portBorder = '#10b981';
                    portColor = '#a7f3d0';
                  }
                }

                return (
                  <div
                    key={portNum}
                    style={{
                      height: '28px',
                      background: portBg,
                      border: `1px solid ${portBorder}`,
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: portColor,
                      cursor: 'default',
                    }}
                    title={`Port ${portNum}: ${isOccupied ? 'Active PoE Device' : 'Empty Port'}`}
                  >
                    {portNum}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Connected Device Inventory Table */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)' }}>
                Connected PoE Device Inventory &amp; Port Reservation:
              </h3>
              <button
                type="button"
                className="button button-primary"
                onClick={() => handleAddDevice()}
                style={{ fontSize: '0.8rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus className="w-4 h-4" />
                Add Device Type
              </button>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 12px' }}>Device Description</th>
                    <th style={{ padding: '10px 12px', width: '90px' }}>Quantity</th>
                    <th style={{ padding: '10px 12px', minWidth: '170px' }}>PoE Class Standard</th>
                    <th style={{ padding: '10px 12px', width: '110px' }}>Watts Each</th>
                    <th style={{ padding: '10px 12px', width: '110px' }}>Subtotal (W)</th>
                    <th style={{ padding: '10px 12px', width: '110px' }}>Run Dist (m)</th>
                    <th style={{ padding: '10px 12px', width: '90px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deviceRows.map((dev, idx) => {
                    const rowMetrics = poeResult.deviceBreakdowns[idx];
                    return (
                      <tr
                        key={dev.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: idx % 2 === 1 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                        }}
                      >
                        {/* Device Name */}
                        <td style={{ padding: '8px 12px' }}>
                          <input
                            type="text"
                            value={dev.name}
                            onChange={e => handleUpdateDevice(dev.id, { name: e.target.value })}
                            style={{ padding: '4px 8px', fontSize: '0.82rem', width: '100%' }}
                            placeholder="e.g. IP Dome Camera"
                          />
                        </td>

                        {/* Quantity */}
                        <td style={{ padding: '8px 12px' }}>
                          <input
                            type="number"
                            min="1"
                            max="48"
                            value={dev.qty}
                            onChange={e => handleUpdateDevice(dev.id, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                            style={{ padding: '4px 8px', fontSize: '0.82rem', width: '100%' }}
                          />
                        </td>

                        {/* PoE Class Dropdown */}
                        <td style={{ padding: '8px 12px' }}>
                          <select
                            value={dev.classKey}
                            onChange={e => handleUpdateDevice(dev.id, { classKey: e.target.value })}
                            style={{ padding: '4px 8px', fontSize: '0.82rem', width: '100%' }}
                          >
                            {Object.keys(POE_CLASSES).map(k => (
                              <option key={k} value={k}>
                                {k}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Watts each */}
                        <td style={{ padding: '8px 12px' }}>
                          <input
                            type="number"
                            step="0.1"
                            min="0.5"
                            max="100"
                            value={dev.wattsEach}
                            onChange={e => handleUpdateDevice(dev.id, { wattsEach: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
                            style={{ padding: '4px 8px', fontSize: '0.82rem', width: '100%' }}
                          />
                        </td>

                        {/* Subtotal */}
                        <td style={{ padding: '8px 12px', fontWeight: 800, color: 'var(--accent)' }}>
                          {rowMetrics ? `${rowMetrics.subtotalWatts.toFixed(1)} W` : `${(dev.qty * dev.wattsEach).toFixed(1)} W`}
                        </td>

                        {/* Run Distance (m) */}
                        <td style={{ padding: '8px 12px' }}>
                          <input
                            type="number"
                            step="5"
                            min="1"
                            max="150"
                            value={dev.estCableLengthM}
                            onChange={e => handleUpdateDevice(dev.id, { estCableLengthM: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                            style={{ padding: '4px 8px', fontSize: '0.82rem', width: '100%' }}
                            title="Cable run distance for DC loop heat loss calculation"
                          />
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleDuplicateDevice(dev.id)}
                              style={{ padding: '4px', fontSize: '0.72rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-muted)' }}
                              title="Duplicate Device"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {deviceRows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDevice(dev.id)}
                                style={{ padding: '4px', fontSize: '0.72rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--rose)' }}
                                title="Remove Device"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary Totals Row */}
                  <tr style={{ background: 'rgba(56, 189, 248, 0.08)', fontWeight: 800, borderTop: '2px solid var(--accent)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-heading)' }}>
                      TOTAL ALL DEVICES
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {poeResult.totalPortsUsed} Ports
                    </td>
                    <td style={{ padding: '10px 12px', color: '#818cf8' }}>
                      {POE_STANDARDS[poeResult.highestStandard].name}
                    </td>
                    <td style={{ padding: '10px 12px' }}>—</td>
                    <td style={{ padding: '10px 12px', fontSize: '1rem', color: '#38bdf8' }}>
                      {poeResult.totalRequestedWatts.toFixed(1)} W
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                      ~{poeResult.totalCopperCableHeatLossWatts.toFixed(1)}W Loss
                    </td>
                    <td style={{ padding: '10px 12px' }}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Recommendations Banner */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '12px',
              background: poeResult.status === 'ok'
                ? 'rgba(16, 185, 129, 0.08)'
                : poeResult.status === 'tight'
                ? 'rgba(245, 158, 11, 0.08)'
                : 'rgba(244, 63, 94, 0.08)',
              border: `1px solid ${
                poeResult.status === 'ok'
                  ? 'rgba(16, 185, 129, 0.3)'
                  : poeResult.status === 'tight'
                  ? 'rgba(245, 158, 11, 0.3)'
                  : 'rgba(244, 63, 94, 0.3)'
              }`,
              fontSize: '0.85rem',
            }}
          >
            {poeResult.status === 'ok' && (
              <div style={{ color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>
                  <strong>Within PoE Budget:</strong> Switch power utilization is healthy at <strong>{poeResult.utilizationPct.toFixed(0)}%</strong> with <strong>{poeResult.remainingBudgetWatts.toFixed(1)} W</strong> remaining headroom.
                </span>
              </div>
            )}
            {poeResult.status === 'tight' && (
              <div style={{ color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>
                  <strong>High Utilization Warning:</strong> Total load exceeds the recommended 80% planning habit ({poeResult.utilizationPct.toFixed(0)}%). Consider stepping up to a <strong>{poeResult.recommendedBudgetWithHeadroomWatts} W</strong> switch to prevent power denial when camera IR illuminators turn on at night.
                </span>
              </div>
            )}
            {poeResult.status === 'over' && (
              <div style={{ color: 'var(--rose)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <XCircle className="w-5 h-5 flex-shrink-0" />
                <span>
                  <strong>Over Budget Deficit:</strong> Connected devices require <strong>{poeResult.totalRequestedWatts.toFixed(1)} W</strong>, exceeding switch capacity by <strong>{Math.abs(poeResult.remainingBudgetWatts).toFixed(1)} W</strong>{poeResult.isPortExceeded ? ` and exceeding port capacity by ${Math.abs(poeResult.availablePortsRemaining)} ports` : ''}. The switch will reject power on lower-priority ports.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ad Unit Placeholder */}
      <div className="no-print" style={{ margin: '32px 0' }}>
        <AdUnitPlaceholder slotType="in-feed" />
      </div>

      {/* ========================================================= */}
      {/* TECHNICAL GUIDE: CABLE LIMITS & POE STANDARDS EXPLAINED */}
      {/* ========================================================= */}
      <div className="panel" style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 12px', color: 'var(--text-heading)' }}>
          Ethernet Cable Limits and PoE Power, Explained
        </h2>

        <p style={{ lineHeight: 1.7, fontSize: '0.92rem', color: 'var(--text)' }}>
          <strong>Cable length.</strong> For twisted-pair copper Ethernet, the international standard channel limit is <strong>100 metres (328 ft)</strong>: up to <strong>90 m</strong> of solid permanent horizontal cable in the wall/conduit, plus up to <strong>10 m</strong> of stranded patch cords in total.
          Cat5e and above support 1 Gbps at 100 m. 2.5 Gbps works on Cat5e (NBASE-T), 5 Gbps needs Cat6, and 10 Gbps needs Cat6a for the full 100 m. Cat6 can carry 10 Gbps only over shorter runs, commonly up to 55 m and sometimes as little as 37 m in noisy, tight cable bundles. Cat5e is not rated for 10 Gbps.
        </p>

        <p style={{ lineHeight: 1.7, fontSize: '0.92rem', color: 'var(--text)' }}>
          <strong>PoE standards.</strong> Power over Ethernet delivers DC voltage over the same twisted-pair cable. The network switch (the Power Sourcing Equipment / PSE) reserves power based on the device's advertised IEEE class during link negotiation, not by what the device actually consumes while idling.
        </p>

        {/* IEEE PoE Standards Table */}
        <div style={{ overflowX: 'auto', margin: '20px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px' }}>Standard</th>
                <th style={{ padding: '10px 12px' }}>Common Name</th>
                <th style={{ padding: '10px 12px' }}>Max Switch Port Power</th>
                <th style={{ padding: '10px 12px' }}>Min Power at Device (100m)</th>
                <th style={{ padding: '10px 12px' }}>Conductor Pairs</th>
                <th style={{ padding: '10px 12px' }}>Class Range</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(POE_STANDARDS).map((std, i) => (
                <tr
                  key={std.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: i % 2 === 1 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-heading)' }}>
                    {std.name}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#38bdf8', fontWeight: 600 }}>
                    {std.commonName}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                    {std.maxPseWatts.toFixed(1)} W
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--emerald)', fontWeight: 600 }}>
                    {std.minPdWatts.toFixed(2)} W
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {std.pairsUsed}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {std.classRange}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Best Practice Bullet Points */}
        <ul style={{ paddingLeft: '22px', margin: '16px 0', lineHeight: 1.8, fontSize: '0.9rem', color: 'var(--text)' }}>
          <li>
            <strong>Add up class watts</strong>: Sum the class watts of every connected device and compare with the switch's <strong>total PoE budget</strong>, which is usually significantly lower than ports × maximum port power.
          </li>
          <li>
            <strong>The 80% rule of thumb</strong>: Many experienced network installers keep continuous total load under ~80% of the switch power budget for thermal headroom and device reboot spikes. This is a sound planning habit, not an IEEE standard.
          </li>
          <li>
            <strong>Peak consumption surges</strong>: Many devices draw less than their class maximum during standby, but plan for worst-case peak loads—especially for IP cameras with IR night LEDs, motorized pan-tilt-zoom (PTZ) units, and winter heater blowers.
          </li>
          <li>
            <strong>Always use solid copper cable</strong>: Never install Copper-Clad Aluminium (CCA) cable for PoE runs. CCA has up to 55% higher electrical resistance, overheats inside conduit bundles, causes catastrophic voltage drop, and violates ANSI/TIA standards.
          </li>
        </ul>

        {/* Warning Callout Box for CCA Cable */}
        <div
          style={{
            padding: '16px 18px',
            borderRadius: '12px',
            background: 'rgba(244, 63, 94, 0.08)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            marginTop: '18px',
          }}
        >
          <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" style={{ marginTop: '2px' }} />
          <div style={{ fontSize: '0.84rem', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--rose)' }}>Field Tech Warning: Beware of Cheap CCA (Copper-Clad Aluminium) Cables:</strong>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>
              CCA cable uses an aluminium core with a thin microscopic plating of copper. Because aluminium has much higher resistance than pure annealed copper, PoE current causes severe conductor heating (a recognized fire hazard under NFPA 70 / NEC) and drops voltage below the minimum 37V-42V required for cameras to power on. Always specify <strong>100% Solid Bare Copper (BC)</strong> for structured cabling.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* FREQUENTLY ASKED QUESTIONS (FAQS) */}
      {/* ========================================================= */}
      <div className="panel" style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 16px', color: 'var(--text-heading)' }}>
          Frequently Asked Questions (FAQ)
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <details
            style={{
              padding: '12px 16px',
              background: 'var(--bg)',
              borderRadius: '10px',
              border: '1px solid var(--border)',
            }}
          >
            <summary style={{ fontWeight: 700, cursor: 'pointer', color: 'var(--text-heading)', fontSize: '0.92rem' }}>
              Does this tool send my network or equipment data anywhere?
            </summary>
            <p style={{ margin: '8px 0 0', fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              No. Everything runs strictly in your web browser using client-side JavaScript. No cable lengths, IP camera counts, switch models, or power calculations are ever transmitted or saved to any external server.
            </p>
          </details>

          <details
            style={{
              padding: '12px 16px',
              background: 'var(--bg)',
              borderRadius: '10px',
              border: '1px solid var(--border)',
            }}
          >
            <summary style={{ fontWeight: 700, cursor: 'pointer', color: 'var(--text-heading)', fontSize: '0.92rem' }}>
              Can I run an Ethernet cable over 100 metres (328 ft)?
            </summary>
            <p style={{ margin: '8px 0 0', fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Not reliably on standard copper Ethernet. Standard IEEE CSMA/CD timing, signal attenuation, and crosstalk limits are engineered around 100 metres total channel length. If you need to extend beyond 100 m, deploy an inline PoE Extender partway (adds another 100m), place an intermediate PoE switch, or transition to a Single-Mode Fiber optic run with media converters.
            </p>
          </details>

          <details
            style={{
              padding: '12px 16px',
              background: 'var(--bg)',
              borderRadius: '10px',
              border: '1px solid var(--border)',
            }}
          >
            <summary style={{ fontWeight: 700, cursor: 'pointer', color: 'var(--text-heading)', fontSize: '0.92rem' }}>
              Do all devices consume their full PoE class maximum?
            </summary>
            <p style={{ margin: '8px 0 0', fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              No. An outdoor IP camera might draw only 8 Watts in daylight, but when temperature drops and its internal window heater and 850nm IR illumination ring turn on at dusk, power spikes to 25 Watts. Furthermore, many unmanaged switches reserve the full Class allocation upon link negotiation, regardless of actual current draw. Always plan around class limits to prevent surprise brownouts.
            </p>
          </details>

          <details
            style={{
              padding: '12px 16px',
              background: 'var(--bg)',
              borderRadius: '10px',
              border: '1px solid var(--border)',
            }}
          >
            <summary style={{ fontWeight: 700, cursor: 'pointer', color: 'var(--text-heading)', fontSize: '0.92rem' }}>
              What happens if my devices exceed the switch's PoE power budget?
            </summary>
            <p style={{ margin: '8px 0 0', fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              When the total wattage draw exceeds the switch's internal power supply capacity, the switch initiates PoE Port Power Denial. Managed switches shut off power to lower-priority ports (often the highest-numbered ports like port 24 or 48) to protect the internal switch power supply from thermal shutdown.
            </p>
          </details>

          <details
            style={{
              padding: '12px 16px',
              background: 'var(--bg)',
              borderRadius: '10px',
              border: '1px solid var(--border)',
            }}
          >
            <summary style={{ fontWeight: 700, cursor: 'pointer', color: 'var(--text-heading)', fontSize: '0.92rem' }}>
              Can Cat5e cable handle PoE+ (30W) and PoE++ (60W/90W)?
            </summary>
            <p style={{ margin: '8px 0 0', fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Cat5e is technically rated for 802.3af (15.4W) and 802.3at (30W). However, for 802.3bt Type 3 (60W) and Type 4 (90W), 24 AWG Cat5e conductors experience significant bundle heating. TIA-TSB-184-A guidelines strongly recommend 23 AWG or 22 AWG Cat6a / Cat6 for high-wattage 4-pair PoE to reduce conductor temperatures and prevent insertion loss degradation.
            </p>
          </details>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RELATED IT & INFRASTRUCTURE TOOLS CROSS-LINKS */}
      {/* ========================================================= */}
      <div className="panel" style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 16px', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity className="w-5 h-5 text-sky-400" />
          Related Network &amp; Physical Infrastructure Tools
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/tools/cctv-storage-calculator"
            style={{
              padding: '16px',
              background: 'var(--bg)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              transition: 'border 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontWeight: 700, fontSize: '0.9rem' }}>
              <Camera className="w-4 h-4" />
              CCTV Storage Calculator
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Size NVR hard drives and retention terabytes across H.264/H.265 camera streams and RAID arrays.
            </p>
          </Link>

          <Link
            to="/tools/hardware-storage-calculator"
            style={{
              padding: '16px',
              background: 'var(--bg)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              transition: 'border 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--emerald)', fontWeight: 700, fontSize: '0.9rem' }}>
              <HardDrive className="w-4 h-4" />
              Hardware Storage &amp; RAID
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Calculate hard drive counts, chassis bays, and parity overhead for RAID 5, 6, 10, 50, and 60.
            </p>
          </Link>

          <Link
            to="/tools/server-rack-power-btu-calculator"
            style={{
              padding: '16px',
              background: 'var(--bg)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              transition: 'border 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontWeight: 700, fontSize: '0.9rem' }}>
              <Server className="w-4 h-4" />
              Server Rack Power &amp; BTU
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Estimate rack power consumption (Watts/Amps), breaker derating, and HVAC BTU/hr cooling load.
            </p>
          </Link>

          <Link
            to="/tools/ipv4-subnet-calculator"
            style={{
              padding: '16px',
              background: 'var(--bg)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              transition: 'border 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#818cf8', fontWeight: 700, fontSize: '0.9rem' }}>
              <Layers className="w-4 h-4" />
              IPv4 Subnet &amp; CIDR
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Calculate network bounds, CIDR masks, usable host ranges, and binary representations.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
};
