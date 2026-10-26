import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import * as d3 from 'd3';
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
  FileSpreadsheet,
  FileText,
  Video,
  Sliders,
  Sun,
  Moon,
  Activity,
  Clock,
  Grid,
  BarChart3,
  TrendingUp,
  Zap,
  Search,
  SlidersHorizontal,
  ArrowRightLeft,
  Scale,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
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

export type ResolutionPresetKey = '720p' | '1080p' | '3mp' | '4mp' | '5mp' | '4k' | '12mp' | 'custom';
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

export interface OptimizationTip {
  id: string;
  category: 'Codec' | 'FPS' | 'Schedule' | 'Bitrate' | 'RAID' | 'Resolution';
  title: string;
  description: string;
  potentialSavings: string;
  impactLevel: 'High' | 'Medium' | 'Informational';
  actionButtonLabel?: string;
  onApplyAction?: () => void;
}

const QUICK_PRESETS: PresetOption[] = [
  {
    name: 'Home Office',
    resKey: '1080p',
    codec: 'h265',
    cameras: 4,
    retentionDays: 30,
    recordingPct: 80,
    headroomPct: 15,
    driveSizeTb: 4,
    raidType: 'raid1',
    description: '4x 1080p cameras, 30 days retention, motion detection, RAID 1 mirror protection.',
  },
  {
    name: 'Retail Store',
    resKey: '4mp',
    codec: 'h265',
    cameras: 16,
    retentionDays: 15,
    recordingPct: 100,
    headroomPct: 15,
    driveSizeTb: 8,
    raidType: 'raid5',
    description: '16x 4MP cameras, 15 days continuous recording, balanced RAID 5 single-parity storage.',
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

export interface CameraBrandPreset {
  id: string;
  brand: string;
  modelSeries: string;
  resolutionName: string;
  resKey: ResolutionPresetKey;
  codec: CodecKey;
  smartCodec: string;
  bitrateMbps: number;
  fps: number;
  sceneActivity: 'Low' | 'Medium' | 'High';
  note: string;
}

export const CAMERA_BRAND_PRESETS: CameraBrandPreset[] = [
  // Axis Communications
  {
    id: 'axis-1080p-zip',
    brand: 'Axis Communications',
    modelSeries: 'M/P-Series (Indoor/Office)',
    resolutionName: '2 MP (1080p)',
    resKey: '1080p',
    codec: 'h265',
    smartCodec: 'Zipstream (H.265)',
    bitrateMbps: 1.5,
    fps: 25,
    sceneActivity: 'Medium',
    note: 'Axis Zipstream dynamic FPS and ROI optimization in moderate office/corridor scenes.',
  },
  {
    id: 'axis-4mp-zip',
    brand: 'Axis Communications',
    modelSeries: 'P32/Q35 (Commercial Retail)',
    resolutionName: '4 MP',
    resKey: '4mp',
    codec: 'h265',
    smartCodec: 'Zipstream (H.265)',
    bitrateMbps: 2.5,
    fps: 25,
    sceneActivity: 'Medium',
    note: 'Axis Zipstream adaptive bitrate for active retail or public area monitoring.',
  },
  {
    id: 'axis-4k-zip',
    brand: 'Axis Communications',
    modelSeries: 'Q-Series (Forensic / City)',
    resolutionName: '8 MP (4K)',
    resKey: '4k',
    codec: 'h265',
    smartCodec: 'Zipstream (H.265)',
    bitrateMbps: 4.8,
    fps: 30,
    sceneActivity: 'High',
    note: 'Axis Forensic 4K with Zipstream preserving critical evidentiary details in high-motion scenes.',
  },
  {
    id: 'axis-1080p-std',
    brand: 'Axis Communications',
    modelSeries: 'Legacy / Standard H.264',
    resolutionName: '2 MP (1080p)',
    resKey: '1080p',
    codec: 'h264',
    smartCodec: 'Standard H.264',
    bitrateMbps: 3.5,
    fps: 25,
    sceneActivity: 'Medium',
    note: 'Traditional H.264 baseline without Zipstream compression.',
  },

  // Hikvision
  {
    id: 'hik-1080p-acusense',
    brand: 'Hikvision',
    modelSeries: 'Pro Series (AcuSense)',
    resolutionName: '2 MP (1080p)',
    resKey: '1080p',
    codec: 'h265',
    smartCodec: 'H.265+ (Smart Codec)',
    bitrateMbps: 1.5,
    fps: 25,
    sceneActivity: 'Medium',
    note: 'Hikvision H.265+ smart encoding with deep-learning false alarm filtering.',
  },
  {
    id: 'hik-4mp-colorvu',
    brand: 'Hikvision',
    modelSeries: 'ColorVu 4 MP (24/7 Color)',
    resolutionName: '4 MP',
    resKey: '4mp',
    codec: 'h265',
    smartCodec: 'H.265+ (Smart Codec)',
    bitrateMbps: 2.5,
    fps: 25,
    sceneActivity: 'Medium',
    note: 'Hikvision 4MP ColorVu vivid color surveillance with H.265+ storage optimization.',
  },
  {
    id: 'hik-5mp-acusense',
    brand: 'Hikvision',
    modelSeries: 'Ultra Series 5 MP',
    resolutionName: '5 MP',
    resKey: '5mp',
    codec: 'h265',
    smartCodec: 'H.265+ (Smart Codec)',
    bitrateMbps: 3.4,
    fps: 20,
    sceneActivity: 'Medium',
    note: 'Balanced 5MP wide-aspect capture for commercial parking lots and building perimeters.',
  },
  {
    id: 'hik-4k-deepinview',
    brand: 'Hikvision',
    modelSeries: 'DeepinView 4K (8 MP)',
    resolutionName: '8 MP (4K)',
    resKey: '4k',
    codec: 'h265',
    smartCodec: 'H.265+ (Smart Codec)',
    bitrateMbps: 5.0,
    fps: 25,
    sceneActivity: 'High',
    note: 'Flagship 4K AI camera stream with multi-target facial and vehicle classification.',
  },
  {
    id: 'hik-4mp-h264',
    brand: 'Hikvision',
    modelSeries: 'Value / Baseline H.264',
    resolutionName: '4 MP',
    resKey: '4mp',
    codec: 'h264',
    smartCodec: 'H.264 Standard',
    bitrateMbps: 6.0,
    fps: 25,
    sceneActivity: 'Medium',
    note: 'Standard CBR/VBR H.264 stream for legacy third-party NVR compatibility.',
  },

  // Dahua Technology
  {
    id: 'dahua-1080p-wizsense',
    brand: 'Dahua Technology',
    modelSeries: 'WizSense 2 MP (1080p)',
    resolutionName: '2 MP (1080p)',
    resKey: '1080p',
    codec: 'h265',
    smartCodec: 'Smart H.265+ / AI Coding',
    bitrateMbps: 1.5,
    fps: 25,
    sceneActivity: 'Medium',
    note: 'Dahua AI Coding focusing target bit budget on humans and vehicles.',
  },
  {
    id: 'dahua-4mp-tioc',
    brand: 'Dahua Technology',
    modelSeries: 'TiOC 4 MP (Three-in-One)',
    resolutionName: '4 MP',
    resKey: '4mp',
    codec: 'h265',
    smartCodec: 'Smart H.265+ / AI Coding',
    bitrateMbps: 2.6,
    fps: 25,
    sceneActivity: 'Medium',
    note: 'Dahua TiOC active deterrence 4MP with integrated audio and warning light metadata.',
  },
  {
    id: 'dahua-4k-wizmind',
    brand: 'Dahua Technology',
    modelSeries: 'WizMind 4K (8 MP)',
    resolutionName: '8 MP (4K)',
    resKey: '4k',
    codec: 'h265',
    smartCodec: 'Smart H.265+ / AI Coding',
    bitrateMbps: 5.2,
    fps: 25,
    sceneActivity: 'High',
    note: 'Dahua enterprise 4K panoramic and perimeter protection with Smart H.265+ encoding.',
  },
  {
    id: 'dahua-4mp-h264',
    brand: 'Dahua Technology',
    modelSeries: 'Lite Series H.264',
    resolutionName: '4 MP',
    resKey: '4mp',
    codec: 'h264',
    smartCodec: 'H.264 Standard',
    bitrateMbps: 5.8,
    fps: 25,
    sceneActivity: 'Medium',
    note: 'Traditional Dahua H.264 profile without Smart+ compression.',
  },

  // Hanwha Vision (Wisenet)
  {
    id: 'hanwha-1080p-wise',
    brand: 'Hanwha Vision (Wisenet)',
    modelSeries: 'Q-Series 2 MP',
    resolutionName: '2 MP (1080p)',
    resKey: '1080p',
    codec: 'h265',
    smartCodec: 'WiseStream II (H.265)',
    bitrateMbps: 1.4,
    fps: 30,
    sceneActivity: 'Medium',
    note: 'Hanwha WiseStream dynamic bandwidth control for commercial interiors.',
  },
  {
    id: 'hanwha-4mp-wise',
    brand: 'Hanwha Vision (Wisenet)',
    modelSeries: 'X-Series AI 4 MP',
    resolutionName: '4 MP',
    resKey: '4mp',
    codec: 'h265',
    smartCodec: 'WiseStream III AI (H.265)',
    bitrateMbps: 2.3,
    fps: 30,
    sceneActivity: 'Medium',
    note: 'Hanwha WiseStream III AI-guided region-of-interest compression.',
  },
  {
    id: 'hanwha-4k-wise',
    brand: 'Hanwha Vision (Wisenet)',
    modelSeries: 'P-Series 4K (8 MP)',
    resolutionName: '8 MP (4K)',
    resKey: '4k',
    codec: 'h265',
    smartCodec: 'WiseStream III AI (H.265)',
    bitrateMbps: 4.8,
    fps: 30,
    sceneActivity: 'High',
    note: 'Enterprise 4K AI stream with real-time metadata analytics and bandwidth throttling.',
  },

  // Uniview (UNV)
  {
    id: 'unv-1080p-u265',
    brand: 'Uniview (UNV)',
    modelSeries: 'Easy / Prime 2 MP',
    resolutionName: '2 MP (1080p)',
    resKey: '1080p',
    codec: 'h265',
    smartCodec: 'Ultra 265 (Deep Compression)',
    bitrateMbps: 1.3,
    fps: 25,
    sceneActivity: 'Low',
    note: 'Uniview Ultra 265 combining H.265 with U-Code GOP reduction.',
  },
  {
    id: 'unv-4mp-u265',
    brand: 'Uniview (UNV)',
    modelSeries: 'Prime Series 4 MP',
    resolutionName: '4 MP',
    resKey: '4mp',
    codec: 'h265',
    smartCodec: 'Ultra 265',
    bitrateMbps: 2.2,
    fps: 25,
    sceneActivity: 'Medium',
    note: 'Cost-effective 4MP commercial building surveillance with Ultra 265.',
  },
  {
    id: 'unv-4k-u265',
    brand: 'Uniview (UNV)',
    modelSeries: 'Pro Series 4K (8 MP)',
    resolutionName: '8 MP (4K)',
    resKey: '4k',
    codec: 'h265',
    smartCodec: 'Ultra 265',
    bitrateMbps: 4.6,
    fps: 25,
    sceneActivity: 'High',
    note: 'UNV Pro series 4K wide-area coverage with smart bandwidth control.',
  },

  // Bosch Security
  {
    id: 'bosch-1080p-idnr',
    brand: 'Bosch Security',
    modelSeries: 'FLEXIDOME IP 3000i 2 MP',
    resolutionName: '2 MP (1080p)',
    resKey: '1080p',
    codec: 'h265',
    smartCodec: 'Intelligent DNR (H.265)',
    bitrateMbps: 1.6,
    fps: 30,
    sceneActivity: 'Medium',
    note: 'Bosch Intelligent Dynamic Noise Reduction actively suppresses sensor grain.',
  },
  {
    id: 'bosch-4k-idnr',
    brand: 'Bosch Security',
    modelSeries: 'DINION IP 8000 4K (8 MP)',
    resolutionName: '8 MP (4K)',
    resKey: '4k',
    codec: 'h265',
    smartCodec: 'Intelligent DNR (H.265)',
    bitrateMbps: 5.0,
    fps: 30,
    sceneActivity: 'High',
    note: 'Mission-critical 4K surveillance for airports and high-security infrastructure.',
  },
];

export const RESOLUTION_PRESET_DETAILS: Record<
  Exclude<ResolutionPresetKey, 'custom'>,
  {
    label: string;
    shortLabel: string;
    megapixels: string;
    bitrateH264: number;
    bitrateH265: number;
    typicalUsage: string;
  }
> = {
  '720p': {
    label: '1 MP (720p HD)',
    shortLabel: '720p',
    megapixels: '1.0 MP (1280×720)',
    bitrateH264: 2.5,
    bitrateH265: 1.2,
    typicalUsage: 'Legacy analog HD or entry-level indoor cameras',
  },
  '1080p': {
    label: '2 MP (1080p Full HD)',
    shortLabel: '1080p',
    megapixels: '2.0 MP (1920×1080)',
    bitrateH264: 4.0,
    bitrateH265: 2.0,
    typicalUsage: 'Standard office corridors, indoor retail & cash registers',
  },
  '3mp': {
    label: '3 MP (1536p)',
    shortLabel: '3 MP',
    megapixels: '3.0 MP (2048×1536)',
    bitrateH264: 5.0,
    bitrateH265: 2.5,
    typicalUsage: 'Wide 4:3 view indoor halls & building entryways',
  },
  '4mp': {
    label: '4 MP (Super HD)',
    shortLabel: '4 MP',
    megapixels: '4.0 MP (2560×1440)',
    bitrateH264: 6.0,
    bitrateH265: 3.0,
    typicalUsage: 'Most popular modern commercial & outdoor surveillance',
  },
  '5mp': {
    label: '5 MP (Quad HD)',
    shortLabel: '5 MP',
    megapixels: '5.0 MP (2592×1944)',
    bitrateH264: 8.0,
    bitrateH265: 4.0,
    typicalUsage: 'High-detail parking lots & wide perimeter monitoring',
  },
  '4k': {
    label: '8 MP (4K Ultra HD)',
    shortLabel: '4K (8MP)',
    megapixels: '8.0 MP (3840×2160)',
    bitrateH264: 12.0,
    bitrateH265: 6.0,
    typicalUsage: 'Forensic zoom, stadiums, public plazas & license plate recognition',
  },
  '12mp': {
    label: '12 MP (Fisheye / 8K)',
    shortLabel: '12 MP',
    megapixels: '12.0 MP (4000×3000)',
    bitrateH264: 16.0,
    bitrateH265: 8.0,
    typicalUsage: '360° fisheye ceiling mounts & ultra wide-area overview',
  },
};

const RESOLUTION_BITRATES: Record<Exclude<ResolutionPresetKey, 'custom'>, Record<CodecKey, number>> = {
  '720p': { h264: 2.5, h265: 1.2 },
  '1080p': { h264: 4.0, h265: 2.0 },
  '3mp': { h264: 5.0, h265: 2.5 },
  '4mp': { h264: 6.0, h265: 3.0 },
  '5mp': { h264: 8.0, h265: 4.0 },
  '4k': { h264: 12.0, h265: 6.0 },
  '12mp': { h264: 16.0, h265: 8.0 },
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

export type ScheduleProfileKey = 'retail' | 'office' | 'warehouse' | 'constant_247' | 'night_shift';

export interface ScheduleProfile {
  key: ScheduleProfileKey;
  name: string;
  description: string;
  hourlyMultipliers: number[];
}

export const SCHEDULE_PROFILES: Record<ScheduleProfileKey, ScheduleProfile> = {
  retail: {
    key: 'retail',
    name: 'Retail Store / Shopping Mall',
    description: 'High foot traffic and constant motion 09:00–21:00; quiet night baseline with VBR compression.',
    hourlyMultipliers: [
      0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.40, 0.55,
      0.85, 1.25, 1.45, 1.50, 1.40, 1.45, 1.50, 1.45,
      1.35, 1.25, 1.10, 0.90, 0.55, 0.35, 0.35, 0.35,
    ],
  },
  office: {
    key: 'office',
    name: 'Commercial Office Building',
    description: 'Standard 9-to-5 workday motion spikes during arrival, lunch hour, and departure.',
    hourlyMultipliers: [
      0.30, 0.30, 0.30, 0.30, 0.30, 0.35, 0.50, 0.80,
      1.35, 1.40, 1.25, 1.45, 1.50, 1.30, 1.35, 1.40,
      1.45, 1.20, 0.70, 0.45, 0.35, 0.30, 0.30, 0.30,
    ],
  },
  warehouse: {
    key: 'warehouse',
    name: 'Logistics & Warehouse Center',
    description: 'Two-shift operational heavy loading 06:00–22:00 with security patrols during night hours.',
    hourlyMultipliers: [
      0.45, 0.40, 0.40, 0.45, 0.50, 0.75, 1.30, 1.40,
      1.45, 1.40, 1.35, 1.40, 1.30, 1.40, 1.45, 1.40,
      1.35, 1.30, 1.25, 1.10, 0.85, 0.65, 0.50, 0.45,
    ],
  },
  constant_247: {
    key: 'constant_247',
    name: '24/7 Constant CBR Stream',
    description: 'Uniform bitrate 100% flat continuous stream (e.g., constant bit rate or high-density traffic).',
    hourlyMultipliers: Array(24).fill(1.0),
  },
  night_shift: {
    key: 'night_shift',
    name: 'Night Security & Perimeter Focus',
    description: 'High activity, floodlights, and movement during night hours (20:00–06:00).',
    hourlyMultipliers: [
      1.35, 1.40, 1.40, 1.35, 1.30, 1.20, 0.75, 0.50,
      0.40, 0.40, 0.45, 0.45, 0.50, 0.45, 0.40, 0.40,
      0.45, 0.55, 0.80, 1.15, 1.30, 1.35, 1.40, 1.40,
    ],
  },
};

interface CameraGroupSpec {
  id: string;
  name: string;
  weight: number;
  count: number;
}

interface StorageHeatmapProps {
  cameras: number;
  baseBitrateMbps: number;
  recordingPct: number;
  codec: CodecKey;
  theme: 'dark' | 'light';
  onApplyDutyCycle?: (pct: number) => void;
}

export const StorageHeatmap: React.FC<StorageHeatmapProps> = ({
  cameras,
  baseBitrateMbps,
  recordingPct,
  codec,
  theme,
  onApplyDutyCycle,
}) => {
  const [profileKey, setProfileKey] = useState<ScheduleProfileKey>('retail');
  const [metricMode, setMetricMode] = useState<'mbps' | 'gb_hr'>('mbps');
  const [selectedCell, setSelectedCell] = useState<{ camName: string; hour: number } | null>(null);

  const isDarkMode = theme === 'dark';
  const profile = SCHEDULE_PROFILES[profileKey];

  const cameraGroups = useMemo<CameraGroupSpec[]>(() => {
    if (cameras <= 12) {
      return Array.from({ length: cameras }, (_, i) => ({
        id: `cam-${i + 1}`,
        name: `Camera ${i + 1}`,
        weight: 0.85 + (i % 5) * 0.1,
        count: 1,
      }));
    } else {
      const basePerZone = Math.floor(cameras / 8);
      const remainder = cameras % 8;

      const zoneNames = [
        'Main Entrance & Foyer',
        'Parking Lot & Driveway',
        'Cashier / POS Counters',
        'Interior Corridors',
        'Perimeter Fence Line',
        'Loading Dock & Freight',
        'Server / Data Room',
        'Outdoor Rooftop & Perimeter',
      ];

      const weights = [1.3, 1.1, 1.25, 0.9, 1.05, 1.2, 0.8, 0.95];

      return zoneNames.map((name, i) => ({
        id: `zone-${i + 1}`,
        name: `${name} (${basePerZone + (i < remainder ? 1 : 0)} Cams)`,
        weight: weights[i],
        count: basePerZone + (i < remainder ? 1 : 0),
      }));
    }
  }, [cameras]);

  const heatmapData = useMemo(() => {
    let globalMaxVal = 0;
    let globalMinVal = Infinity;
    const hourlyTotalsMbps = Array(24).fill(0);
    const hourlyTotalsGb = Array(24).fill(0);

    const rows = cameraGroups.map(group => {
      const hours = profile.hourlyMultipliers.map((hourMult, hour) => {
        const dutyRatio = recordingPct / 100;
        const cellMbps = baseBitrateMbps * group.weight * hourMult;
        const cellGbHr = (cellMbps * 3600 / 8 / 1000) * dutyRatio * group.count;

        const val = metricMode === 'mbps' ? cellMbps * group.count : cellGbHr;
        if (val > globalMaxVal) globalMaxVal = val;
        if (val < globalMinVal) globalMinVal = val;

        hourlyTotalsMbps[hour] += cellMbps * group.count;
        hourlyTotalsGb[hour] += cellGbHr;

        return {
          hour,
          hourLabel: `${hour.toString().padStart(2, '0')}:00`,
          cellMbps,
          totalGroupMbps: cellMbps * group.count,
          cellGbHr,
          motionPct: Math.round(hourMult * 100),
          val,
        };
      });

      const totalDailyGbGroup = hours.reduce((acc, h) => acc + h.cellGbHr, 0);

      return {
        group,
        hours,
        totalDailyGbGroup,
      };
    });

    const totalSystemDailyGb = hourlyTotalsGb.reduce((a, b) => a + b, 0);

    let peakHour = 0;
    let peakMbps = 0;
    let minHour = 0;
    let minMbps = Infinity;

    hourlyTotalsMbps.forEach((mbps, h) => {
      if (mbps > peakMbps) {
        peakMbps = mbps;
        peakHour = h;
      }
      if (mbps < minMbps) {
        minMbps = mbps;
        minHour = h;
      }
    });

    const cbrDailyGb = (baseBitrateMbps * cameras * 86400 / 8 / 1000) * (recordingPct / 100);
    const vbrSavingsGb = Math.max(0, cbrDailyGb - totalSystemDailyGb);
    const avgDutyCycleRatio = Math.round((totalSystemDailyGb / (cbrDailyGb || 1)) * 100);

    return {
      rows,
      globalMaxVal: globalMaxVal || 1,
      globalMinVal: globalMinVal === Infinity ? 0 : globalMinVal,
      hourlyTotalsMbps,
      hourlyTotalsGb,
      totalSystemDailyGb,
      peakHour,
      peakMbps,
      minHour,
      minMbps,
      cbrDailyGb,
      vbrSavingsGb,
      avgDutyCycleRatio,
    };
  }, [cameraGroups, profile, baseBitrateMbps, recordingPct, cameras, metricMode]);

  const getCellStyle = (val: number) => {
    const ratio = val / (heatmapData.globalMaxVal || 1);

    let bg = 'rgba(30, 41, 59, 0.8)';
    let text = isDarkMode ? '#e2e8f0' : '#1e293b';

    if (ratio < 0.25) {
      bg = isDarkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(241, 245, 249, 1)';
      text = isDarkMode ? '#94a3b8' : '#475569';
    } else if (ratio < 0.45) {
      bg = isDarkMode ? 'rgba(3, 105, 161, 0.65)' : 'rgba(186, 230, 253, 0.85)';
      text = isDarkMode ? '#e0f2fe' : '#0369a1';
    } else if (ratio < 0.65) {
      bg = isDarkMode ? 'rgba(5, 150, 105, 0.7)' : 'rgba(167, 243, 208, 0.9)';
      text = isDarkMode ? '#ecfdf5' : '#047857';
    } else if (ratio < 0.85) {
      bg = isDarkMode ? 'rgba(217, 119, 6, 0.75)' : 'rgba(253, 230, 138, 0.95)';
      text = isDarkMode ? '#fffbeb' : '#b45309';
    } else if (ratio < 1.05) {
      bg = isDarkMode ? 'rgba(225, 29, 72, 0.85)' : 'rgba(254, 202, 202, 1)';
      text = isDarkMode ? '#fff1f2' : '#be123c';
    } else {
      bg = isDarkMode ? 'rgba(192, 38, 211, 0.9)' : 'rgba(245, 208, 254, 1)';
      text = isDarkMode ? '#fdf4ff' : '#86198f';
    }

    return {
      background: bg,
      color: text,
      border: '1px solid rgba(255, 255, 255, 0.08)',
    };
  };

  return (
    <div
      className="panel"
      style={{
        padding: '24px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        marginBottom: '32px',
      }}
    >
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
              fontSize: '1.2rem',
              fontWeight: 800,
              margin: '0 0 4px',
              color: 'var(--text-heading)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Grid className="w-5 h-5 text-sky-400" />
            CCTV Storage &amp; Bandwidth Activity Heatmap
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Visualize 24-hour peak bandwidth spikes and storage density across cameras or surveillance zones based on motion schedules.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setMetricMode('mbps')}
              style={{
                padding: '4px 10px',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: metricMode === 'mbps' ? 'var(--accent)' : 'transparent',
                color: metricMode === 'mbps' ? '#ffffff' : 'var(--text-muted)',
              }}
            >
              Bandwidth (Mbps)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('gb_hr')}
              style={{
                padding: '4px 10px',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: metricMode === 'gb_hr' ? 'var(--emerald)' : 'transparent',
                color: metricMode === 'gb_hr' ? '#ffffff' : 'var(--text-muted)',
              }}
            >
              Storage (GB / hr)
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
          marginBottom: '16px',
          padding: '12px',
          background: 'var(--bg)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginRight: '6px' }}>
          <Clock className="w-4 h-4 text-sky-400" />
          Time Activity Schedule:
        </span>
        {(Object.keys(SCHEDULE_PROFILES) as ScheduleProfileKey[]).map(key => {
          const item = SCHEDULE_PROFILES[key];
          const isSelected = profileKey === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setProfileKey(key)}
              style={{
                padding: '5px 12px',
                fontSize: '0.78rem',
                fontWeight: isSelected ? 700 : 500,
                borderRadius: '6px',
                background: isSelected ? 'var(--accent)' : 'var(--surface)',
                color: isSelected ? '#ffffff' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title={item.description}
            >
              {item.name}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
          }}
        >
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            🔥 Peak Bandwidth Hour
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--rose)', marginTop: '2px' }}>
            {heatmapData.peakHour.toString().padStart(2, '0')}:00 – {(heatmapData.peakHour + 1).toString().padStart(2, '0')}:00
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {heatmapData.peakMbps.toFixed(1)} Mbps total stream ingestion
          </div>
        </div>

        <div
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
          }}
        >
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            🌙 Quiet Night Window
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
            {heatmapData.minHour.toString().padStart(2, '0')}:00 – {(heatmapData.minHour + 1).toString().padStart(2, '0')}:00
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {heatmapData.minMbps.toFixed(1)} Mbps baseline VBR
          </div>
        </div>

        <div
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
          }}
        >
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            ⚡ Peak Fluctuation Ratio
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--amber)', marginTop: '2px' }}>
            {(heatmapData.peakMbps / (heatmapData.minMbps || 1)).toFixed(1)}× Swing
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            VBR dynamic bitrate range
          </div>
        </div>

        <div
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
          }}
        >
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            💡 Daily VBR Schedule Duty
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--emerald)', marginTop: '2px' }}>
            ~{heatmapData.avgDutyCycleRatio}% Duty Cycle
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {onApplyDutyCycle && (
              <button
                type="button"
                onClick={() => onApplyDutyCycle(heatmapData.avgDutyCycleRatio)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--emerald)',
                  fontWeight: 700,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                }}
              >
                Apply {heatmapData.avgDutyCycleRatio}% to calculator
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.75rem',
            minWidth: '800px',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  padding: '8px 10px',
                  textAlign: 'left',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-heading)',
                  fontWeight: 700,
                  width: '180px',
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                }}
              >
                Camera / Zone
              </th>
              {Array.from({ length: 24 }).map((_, h) => (
                <th
                  key={h}
                  style={{
                    padding: '6px 2px',
                    textAlign: 'center',
                    background: h === heatmapData.peakHour ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: h === heatmapData.peakHour ? 'var(--rose)' : 'var(--text-muted)',
                    fontWeight: h === heatmapData.peakHour ? 800 : 600,
                    fontSize: '0.68rem',
                  }}
                >
                  {h.toString().padStart(2, '0')}h
                </th>
              ))}
              <th
                style={{
                  padding: '8px 10px',
                  textAlign: 'right',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-heading)',
                  fontWeight: 700,
                  width: '90px',
                }}
              >
                Daily Total
              </th>
            </tr>
          </thead>
          <tbody>
            {heatmapData.rows.map(row => (
              <tr key={row.group.id}>
                <td
                  style={{
                    padding: '8px 10px',
                    fontWeight: 600,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-heading)',
                    fontSize: '0.78rem',
                    position: 'sticky',
                    left: 0,
                    zIndex: 2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.group.name}
                </td>

                {row.hours.map(cell => {
                  const style = getCellStyle(cell.val);
                  const isHovered = selectedCell?.camName === row.group.name && selectedCell?.hour === cell.hour;

                  return (
                    <td
                      key={cell.hour}
                      onMouseEnter={() => setSelectedCell({ camName: row.group.name, hour: cell.hour })}
                      onMouseLeave={() => setSelectedCell(null)}
                      style={{
                        padding: '8px 2px',
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: '0.68rem',
                        cursor: 'pointer',
                        transition: 'transform 0.1s ease',
                        transform: isHovered ? 'scale(1.15)' : 'none',
                        zIndex: isHovered ? 10 : 1,
                        position: 'relative',
                        ...style,
                      }}
                      title={`${row.group.name} (${cell.hourLabel}): ${metricMode === 'mbps' ? `${cell.totalGroupMbps.toFixed(1)} Mbps` : `${cell.cellGbHr.toFixed(2)} GB/hr`} [Motion: ${cell.motionPct}%]`}
                    >
                      {metricMode === 'mbps'
                        ? cell.totalGroupMbps < 10
                          ? cell.totalGroupMbps.toFixed(1)
                          : Math.round(cell.totalGroupMbps)
                        : cell.cellGbHr < 10
                        ? cell.cellGbHr.toFixed(1)
                        : Math.round(cell.cellGbHr)}
                    </td>
                  );
                })}

                <td
                  style={{
                    padding: '8px 10px',
                    textAlign: 'right',
                    fontWeight: 700,
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--emerald)',
                    fontSize: '0.78rem',
                  }}
                >
                  {(row.totalDailyGbGroup / 1000).toFixed(2)} TB/d
                </td>
              </tr>
            ))}

            <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}>
              <td
                style={{
                  padding: '8px 10px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-heading)',
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                }}
              >
                System Aggregate Total
              </td>
              {Array.from({ length: 24 }).map((_, h) => {
                const totalMbps = heatmapData.hourlyTotalsMbps[h];
                const totalGb = heatmapData.hourlyTotalsGb[h];
                const isPeak = h === heatmapData.peakHour;

                return (
                  <td
                    key={h}
                    style={{
                      padding: '8px 2px',
                      textAlign: 'center',
                      background: isPeak ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg)',
                      border: '1px solid var(--border)',
                      color: isPeak ? 'var(--rose)' : 'var(--text-heading)',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                    }}
                  >
                    {metricMode === 'mbps' ? totalMbps.toFixed(0) : totalGb.toFixed(0)}
                  </td>
                );
              })}
              <td
                style={{
                  padding: '8px 10px',
                  textAlign: 'right',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: '#38bdf8',
                  fontSize: '0.82rem',
                }}
              >
                {(heatmapData.totalSystemDailyGb / 1000).toFixed(2)} TB/d
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '0.78rem' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>Activity Density:</span>
          <span style={{ padding: '2px 8px', borderRadius: '4px', background: isDarkMode ? '#1e293b' : '#f1f5f9', color: 'var(--text-muted)' }}>
            Low (0–25%)
          </span>
          <span style={{ padding: '2px 8px', borderRadius: '4px', background: isDarkMode ? '#0369a1' : '#bae6fd', color: isDarkMode ? '#fff' : '#0369a1' }}>
            Moderate (25–50%)
          </span>
          <span style={{ padding: '2px 8px', borderRadius: '4px', background: isDarkMode ? '#059669' : '#a7f3d0', color: isDarkMode ? '#fff' : '#047857' }}>
            Busy (50–75%)
          </span>
          <span style={{ padding: '2px 8px', borderRadius: '4px', background: isDarkMode ? '#d97706' : '#fde68a', color: isDarkMode ? '#fff' : '#b45309' }}>
            Peak (75–100%)
          </span>
          <span style={{ padding: '2px 8px', borderRadius: '4px', background: isDarkMode ? '#dc2626' : '#fecaca', color: isDarkMode ? '#fff' : '#be123c' }}>
            Heavy Surge (&gt;100%)
          </span>
        </div>

        {selectedCell ? (
          <div
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontWeight: 700,
            }}
          >
            📌 {selectedCell.camName} @ {selectedCell.hour.toString().padStart(2, '0')}:00–{(selectedCell.hour + 1).toString().padStart(2, '0')}:00
          </div>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Hover or tap any matrix cell to inspect hourly stream rates.
          </span>
        )}
      </div>
    </div>
  );
};

export interface ScenarioConfig {
  name: string;
  cameras: number;
  resolutionPreset: ResolutionPresetKey;
  codec: CodecKey;
  bitrateMbps: number;
  retentionDays: number;
  recordingPct: number;
  headroomPct: number;
  driveSizeTb: number;
  raidType: RaidTypeKey;
  pricePerTb: number;
}

export function computeScenarioMetrics(cfg: ScenarioConfig) {
  const safeMbps = Math.max(0.01, cfg.bitrateMbps || 0.1);
  const safeCams = Math.max(1, cfg.cameras || 1);
  const safeDays = Math.max(1, cfg.retentionDays || 1);
  const safeRec = Math.min(100, Math.max(1, cfg.recordingPct || 100));
  const safeHead = Math.max(0, cfg.headroomPct || 0);
  const safeDriveTb = Math.max(0.5, cfg.driveSizeTb || 1);
  const safePricePerTb = Math.max(0, cfg.pricePerTb || 0);

  const gbPerCameraPerDay = (safeMbps * 86400 / 8 / 1000) * (safeRec / 100);
  const totalRawGb = gbPerCameraPerDay * safeDays * safeCams;
  const totalNeedTb = (totalRawGb * (1 + safeHead / 100)) / 1000;

  const raidInfo = RAID_DEFINITIONS[cfg.raidType];
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

  const totalHardDriveCost = drivesNeeded * safeDriveTb * safePricePerTb;

  return {
    ...cfg,
    safeMbps,
    safeCams,
    safeDays,
    safeRec,
    safeHead,
    safeDriveTb,
    totalNeedTb,
    drivesNeeded,
    usableStorageTb,
    rawStorageTb,
    parityStorageTb,
    possible,
    totalHardDriveCost,
  };
}

interface CompareScenariosPanelProps {
  scenarioA: ScenarioConfig;
  scenarioB: ScenarioConfig;
  onChangeScenarioB: (updated: Partial<ScenarioConfig>) => void;
  onCopyAtoB: () => void;
  onSwapAandB: () => void;
  onCloseComparison: () => void;
  onApplyPresetComparison: (preset: 'codec' | 'retention' | 'motion' | 'resolution') => void;
}

export const CompareScenariosPanel: React.FC<CompareScenariosPanelProps> = ({
  scenarioA,
  scenarioB,
  onChangeScenarioB,
  onCopyAtoB,
  onSwapAandB,
  onCloseComparison,
  onApplyPresetComparison,
}) => {
  const metricsA = computeScenarioMetrics(scenarioA);
  const metricsB = computeScenarioMetrics(scenarioB);

  const deltaTb = metricsB.totalNeedTb - metricsA.totalNeedTb;
  const deltaPct = metricsA.totalNeedTb > 0 ? (deltaTb / metricsA.totalNeedTb) * 100 : 0;

  const deltaDrives = metricsB.drivesNeeded - metricsA.drivesNeeded;
  const deltaCost = metricsB.totalHardDriveCost - metricsA.totalHardDriveCost;

  return (
    <div
      className="panel"
      style={{
        padding: '24px',
        background: 'var(--surface)',
        border: '2px solid var(--accent)',
        borderRadius: '16px',
        marginBottom: '32px',
      }}
    >
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
            <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
            Side-by-Side Scenario Comparison
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Compare storage requirements, drive counts, and hard drive BOM costs between two distinct system configurations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="button button-secondary"
            onClick={onCopyAtoB}
            style={{ fontSize: '0.78rem', padding: '4px 10px' }}
            title="Duplicate Scenario A inputs into Scenario B"
          >
            Copy A → B
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={onSwapAandB}
            style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            title="Swap Scenario A and Scenario B"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Swap A ↔ B
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={onCloseComparison}
            style={{ fontSize: '0.78rem', padding: '4px 10px', color: 'var(--rose)' }}
          >
            Close Comparison
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '6px',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '20px',
          padding: '10px 14px',
          background: 'var(--bg)',
          borderRadius: '10px',
          border: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '6px' }}>
          Quick Comparisons:
        </span>
        <button
          type="button"
          onClick={() => onApplyPresetComparison('codec')}
          className="button button-secondary"
          style={{ fontSize: '0.75rem', padding: '3px 8px' }}
        >
          H.264 vs H.265 Upgrade
        </button>
        <button
          type="button"
          onClick={() => onApplyPresetComparison('retention')}
          className="button button-secondary"
          style={{ fontSize: '0.75rem', padding: '3px 8px' }}
        >
          30 Days vs 60 Days Retention
        </button>
        <button
          type="button"
          onClick={() => onApplyPresetComparison('motion')}
          className="button button-secondary"
          style={{ fontSize: '0.75rem', padding: '3px 8px' }}
        >
          24/7 (100%) vs Motion (75%)
        </button>
        <button
          type="button"
          onClick={() => onApplyPresetComparison('resolution')}
          className="button button-secondary"
          style={{ fontSize: '0.75rem', padding: '3px 8px' }}
        >
          1080p vs 4K Ultra-HD
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Scenario A (Baseline) */}
        <div
          style={{
            padding: '18px',
            background: 'var(--bg)',
            border: '2px solid var(--accent)',
            borderRadius: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '6px',
                background: 'var(--accent)',
                color: '#ffffff',
                textTransform: 'uppercase',
              }}
            >
              Scenario A (Current Form Baseline)
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Form Parameters
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem', marginBottom: '14px' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Cameras:</span> <strong>{metricsA.safeCams} Cams</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Resolution:</span> <strong>{metricsA.resolutionPreset.toUpperCase()}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Codec:</span> <strong>{metricsA.codec.toUpperCase()}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Bitrate:</span> <strong>{metricsA.safeMbps.toFixed(2)} Mbps</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Retention:</span> <strong>{metricsA.safeDays} Days</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Duty Cycle:</span> <strong>{metricsA.safeRec}%</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Disk Size:</span> <strong>{metricsA.safeDriveTb} TB</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>RAID Level:</span> <strong>{metricsA.raidType.toUpperCase()}</strong></div>
          </div>

          <div
            style={{
              padding: '12px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Usable Storage Needed:</span>
              <strong style={{ fontSize: '1.2rem', color: '#38bdf8' }}>{metricsA.totalNeedTb.toFixed(1)} TB</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Required HDDs:</span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-heading)' }}>
                {metricsA.possible ? `${metricsA.drivesNeeded} × ${metricsA.safeDriveTb}TB drives` : 'Exceeds 64'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Drive BOM Cost:</span>
              <strong style={{ fontSize: '1.05rem', color: 'var(--emerald)' }}>
                ${metricsA.totalHardDriveCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </strong>
            </div>
          </div>
        </div>

        {/* Scenario B (Comparison Target) */}
        <div
          style={{
            padding: '18px',
            background: 'var(--bg)',
            border: '2px solid var(--emerald)',
            borderRadius: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '6px',
                background: 'var(--emerald)',
                color: '#ffffff',
                textTransform: 'uppercase',
              }}
            >
              Scenario B (Comparison Target)
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--emerald)', fontWeight: 700 }}>
              Editable Controls
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Codec:</label>
              <select
                value={scenarioB.codec}
                onChange={e => onChangeScenarioB({ codec: e.target.value as CodecKey })}
                style={{ fontSize: '0.78rem', padding: '4px', width: '100%' }}
              >
                <option value="h265">H.265 / Smart Codec</option>
                <option value="h264">H.264 Standard</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Retention (Days):</label>
              <select
                value={scenarioB.retentionDays}
                onChange={e => onChangeScenarioB({ retentionDays: parseInt(e.target.value, 10) || 30 })}
                style={{ fontSize: '0.78rem', padding: '4px', width: '100%' }}
              >
                {[7, 15, 30, 45, 60, 90, 120, 180].map(d => (
                  <option key={d} value={d}>{d} Days Retention</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Resolution:</label>
              <select
                value={scenarioB.resolutionPreset}
                onChange={e => {
                  const res = e.target.value as ResolutionPresetKey;
                  const recMbps = res !== 'custom' ? RESOLUTION_BITRATES[res][scenarioB.codec] : scenarioB.bitrateMbps;
                  onChangeScenarioB({ resolutionPreset: res, bitrateMbps: recMbps });
                }}
                style={{ fontSize: '0.78rem', padding: '4px', width: '100%' }}
              >
                <option value="1080p">1080p (2 MP)</option>
                <option value="4mp">4 MP Super HD</option>
                <option value="5mp">5 MP Quad HD</option>
                <option value="4k">4K Ultra HD (8 MP)</option>
                <option value="720p">720p HD</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Duty Cycle (%):</label>
              <select
                value={scenarioB.recordingPct}
                onChange={e => onChangeScenarioB({ recordingPct: parseInt(e.target.value, 10) || 100 })}
                style={{ fontSize: '0.78rem', padding: '4px', width: '100%' }}
              >
                <option value={100}>100% Continuous 24/7</option>
                <option value={80}>80% Active Motion</option>
                <option value={60}>60% Moderate Motion</option>
                <option value={40}>40% Low Night Motion</option>
              </select>
            </div>
          </div>

          <div
            style={{
              padding: '12px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Usable Storage Needed:</span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--emerald)' }}>{metricsB.totalNeedTb.toFixed(1)} TB</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Required HDDs:</span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-heading)' }}>
                {metricsB.possible ? `${metricsB.drivesNeeded} × ${metricsB.safeDriveTb}TB drives` : 'Exceeds 64'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Drive BOM Cost:</span>
              <strong style={{ fontSize: '1.05rem', color: 'var(--emerald)' }}>
                ${metricsB.totalHardDriveCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: '16px',
          borderRadius: '12px',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Net Storage Variance (B vs A)
          </div>
          <div
            style={{
              fontSize: '1.2rem',
              fontWeight: 800,
              color: deltaTb > 0 ? 'var(--rose)' : deltaTb < 0 ? 'var(--emerald)' : 'var(--text-heading)',
              marginTop: '2px',
            }}
          >
            {deltaTb > 0 ? `+${deltaTb.toFixed(1)} TB` : `${deltaTb.toFixed(1)} TB`}{' '}
            <span style={{ fontSize: '0.85rem' }}>({deltaPct >= 0 ? `+${deltaPct.toFixed(0)}%` : `${deltaPct.toFixed(0)}%`})</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Drive Quantity Change
          </div>
          <div
            style={{
              fontSize: '1.2rem',
              fontWeight: 800,
              color: deltaDrives > 0 ? 'var(--rose)' : deltaDrives < 0 ? 'var(--emerald)' : 'var(--text-heading)',
              marginTop: '2px',
            }}
          >
            {deltaDrives > 0 ? `+${deltaDrives} Drives` : deltaDrives < 0 ? `${deltaDrives} Drives` : 'No Change'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Project Hard Drive BOM Savings / Cost
          </div>
          <div
            style={{
              fontSize: '1.2rem',
              fontWeight: 800,
              color: deltaCost > 0 ? 'var(--rose)' : deltaCost < 0 ? 'var(--emerald)' : 'var(--text-heading)',
              marginTop: '2px',
            }}
          >
            {deltaCost > 0
              ? `+$${deltaCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              : deltaCost < 0
              ? `-$${Math.abs(deltaCost).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Savings`
              : '$0 Difference'}
          </div>
        </div>
      </div>
    </div>
  );
};

const D3StorageGauge: React.FC<{
  neededTb: number;
  usableTb: number;
}> = ({ neededTb, usableTb }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const percentage = usableTb > 0 ? Math.round((neededTb / usableTb) * 100) : 0;
  const isOverCapacity = neededTb > usableTb;

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 200;
    const height = 160;
    const radius = 75;
    const innerRadius = radius - 16;
    const outerRadius = radius;

    // Semi-circle arc: 270 deg span (-135 to +135 deg)
    const startAngle = -Math.PI * 0.75;
    const endAngle = Math.PI * 0.75;
    const angleRange = endAngle - startAngle;

    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2 + 12})`);

    // Track Arc
    const backgroundArc = d3
      .arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .startAngle(startAngle)
      .endAngle(endAngle)
      .cornerRadius(4);

    g.append('path')
      .attr('d', backgroundArc as any)
      .attr('fill', 'rgba(255, 255, 255, 0.08)');

    // Progress Calculation
    const progressRatio = Math.min(1.0, Math.max(0, neededTb / (usableTb || 1)));
    const targetAngle = startAngle + progressRatio * angleRange;

    let gaugeColor = '#38bdf8'; // sky blue
    if (isOverCapacity) {
      gaugeColor = '#ef4444'; // rose red
    } else if (progressRatio > 0.88) {
      gaugeColor = '#f59e0b'; // amber
    } else if (progressRatio > 0.4) {
      gaugeColor = '#10b981'; // emerald
    }

    const progressArc = d3
      .arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .startAngle(startAngle)
      .cornerRadius(4);

    // Animated Path
    g.append('path')
      .datum({ endAngle: startAngle })
      .attr('fill', gaugeColor)
      .transition()
      .duration(750)
      .ease(d3.easeCubicOut)
      .attrTween('d', function (d: any) {
        const interpolate = d3.interpolate(d.endAngle, targetAngle);
        return function (t: number) {
          d.endAngle = interpolate(t);
          return (progressArc as any)(d);
        };
      });

    // Decorative inner tick dots
    const numTicks = 9;
    for (let i = 0; i < numTicks; i++) {
      const tickRatio = i / (numTicks - 1);
      const tickAngle = startAngle + tickRatio * angleRange - Math.PI / 2;
      const tickRadius = innerRadius - 7;
      const tx = Math.cos(tickAngle) * tickRadius;
      const ty = Math.sin(tickAngle) * tickRadius;

      g.append('circle')
        .attr('cx', tx)
        .attr('cy', ty)
        .attr('r', 1.5)
        .attr('fill', tickRatio <= progressRatio ? gaugeColor : 'rgba(255, 255, 255, 0.2)');
    }

  }, [neededTb, usableTb, isOverCapacity]);

  return (
    <div style={{ textAlign: 'center', position: 'relative', width: '200px', height: '160px', margin: '0 auto' }}>
      <svg ref={svgRef} width="200" height="160" viewBox="0 0 200 160" />
      <div
        style={{
          position: 'absolute',
          top: '42px',
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontSize: '1.8rem',
            fontWeight: 900,
            lineHeight: 1,
            color: isOverCapacity ? 'var(--rose)' : percentage > 88 ? 'var(--amber)' : 'var(--text-heading)',
          }}
        >
          {percentage}%
        </span>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '3px' }}>
          Array Utilization
        </span>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            marginTop: '5px',
            color: isOverCapacity ? 'var(--rose)' : 'var(--emerald)',
          }}
        >
          {neededTb.toFixed(1)} / {usableTb.toFixed(1)} TB
        </span>
      </div>
    </div>
  );
};

/**
 * Custom hook to manage state synchronized automatically with localStorage.
 * Ensures persistence across browser refreshes, tab closures, and page navigation.
 */
export function useLocalStorageState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        return JSON.parse(item) as T;
      }
    } catch (error) {
      console.warn(`[useLocalStorageState] Error reading key "${key}":`, error);
    }
    return defaultValue;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`[useLocalStorageState] Error writing key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue];
}

export const CctvStorageCalculator: React.FC = () => {
  const [theme, setTheme] = useLocalStorageState<'dark' | 'light'>('cctv_calc_theme', 'dark');

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Persistent User Input States
  const [cameras, setCameras] = useLocalStorageState<number>('cctv_calc_cams', 16);
  const [resolutionPreset, setResolutionPreset] = useLocalStorageState<ResolutionPresetKey>('cctv_calc_res', '1080p');
  const [codec, setCodec] = useLocalStorageState<CodecKey>('cctv_calc_codec', 'h265');
  const [bitrateMbps, setBitrateMbps] = useLocalStorageState<number>('cctv_calc_mbps', 2.0);
  const [retentionDays, setRetentionDays] = useLocalStorageState<number>('cctv_calc_days', 30);
  const [recordingPct, setRecordingPct] = useLocalStorageState<number>('cctv_calc_rec', 100);
  const [headroomPct, setHeadroomPct] = useLocalStorageState<number>('cctv_calc_head', 15);
  const [driveSizeTb, setDriveSizeTb] = useLocalStorageState<number>('cctv_calc_drv', 8);
  const [raidType, setRaidType] = useLocalStorageState<RaidTypeKey>('cctv_calc_raid', 'raid5');
  const [pricePerTb, setPricePerTb] = useLocalStorageState<number>('cctv_calc_price_per_tb', 25);
  const [driveWorkloadRatingTbYr, setDriveWorkloadRatingTbYr] = useLocalStorageState<number>('cctv_calc_tbw_rating', 180);
  const [enableCloudBackup, setEnableCloudBackup] = useLocalStorageState<boolean>('cctv_calc_enable_cloud', false);
  const [cloudPricePerTbMonth, setCloudPricePerTbMonth] = useLocalStorageState<number>('cctv_calc_cloud_price', 15);
  const [cloudBackupScopePct, setCloudBackupScopePct] = useLocalStorageState<number>('cctv_calc_cloud_scope', 100);
  const [enableMultiTier, setEnableMultiTier] = useLocalStorageState<boolean>('cctv_calc_enable_tier', false);
  const [tier1Days, setTier1Days] = useLocalStorageState<number>('cctv_calc_tier1_days', 7);
  const [tier2BitratePct, setTier2BitratePct] = useLocalStorageState<number>('cctv_calc_tier2_bitrate_pct', 50);
  const [tier2DriveSizeTb, setTier2DriveSizeTb] = useLocalStorageState<number>('cctv_calc_tier2_drv', 16);
  const [tier2Raid, setTier2Raid] = useLocalStorageState<RaidTypeKey>('cctv_calc_tier2_raid', 'raid6');
  const [h265SavingsPct, setH265SavingsPct] = useLocalStorageState<number>('cctv_calc_h265_savings', 50);
  const [selectedBrandPresetId, setSelectedBrandPresetId] = useLocalStorageState<string>('cctv_calc_brand_preset', 'custom');
  const [brandFilter, setBrandFilter] = useLocalStorageState<string>('cctv_calc_brand_filter', 'All');
  const [presetSearchQuery, setPresetSearchQuery] = useLocalStorageState<string>('cctv_calc_preset_search', '');
  const [enableComparisonMode, setEnableComparisonMode] = useLocalStorageState<boolean>('cctv_calc_enable_compare', false);
  const [scenarioB, setScenarioB] = useLocalStorageState<ScenarioConfig>('cctv_calc_scenario_b', {
    name: 'Scenario B',
    cameras: 16,
    resolutionPreset: '1080p',
    codec: 'h265',
    bitrateMbps: 2.0,
    retentionDays: 60,
    recordingPct: 100,
    headroomPct: 15,
    driveSizeTb: 8,
    raidType: 'raid5',
    pricePerTb: 25,
  });

  const [copiedSummary, setCopiedSummary] = useState(false);
  const [exportedCsv, setExportedCsv] = useState(false);
  const [exportedPdf, setExportedPdf] = useState(false);

  const currentScenarioA = useMemo<ScenarioConfig>(() => ({
    name: 'Scenario A',
    cameras,
    resolutionPreset,
    codec,
    bitrateMbps,
    retentionDays,
    recordingPct,
    headroomPct,
    driveSizeTb,
    raidType,
    pricePerTb,
  }), [
    cameras,
    resolutionPreset,
    codec,
    bitrateMbps,
    retentionDays,
    recordingPct,
    headroomPct,
    driveSizeTb,
    raidType,
    pricePerTb,
  ]);

  const handleCopyAtoB = () => {
    setScenarioB({ ...currentScenarioA, name: 'Scenario B' });
  };

  const handleSwapAandB = () => {
    setCameras(scenarioB.cameras);
    setResolutionPreset(scenarioB.resolutionPreset);
    setCodec(scenarioB.codec);
    setBitrateMbps(scenarioB.bitrateMbps);
    setRetentionDays(scenarioB.retentionDays);
    setRecordingPct(scenarioB.recordingPct);
    setHeadroomPct(scenarioB.headroomPct);
    setDriveSizeTb(scenarioB.driveSizeTb);
    setRaidType(scenarioB.raidType);
    setPricePerTb(scenarioB.pricePerTb);

    setScenarioB({ ...currentScenarioA, name: 'Scenario B' });
  };

  const handleApplyPresetComparison = (presetType: 'codec' | 'retention' | 'motion' | 'resolution') => {
    if (presetType === 'codec') {
      const nextCodec: CodecKey = codec === 'h264' ? 'h265' : 'h264';
      const reductionRatio = nextCodec === 'h265' ? 0.5 : 2.0;
      setScenarioB({
        ...currentScenarioA,
        codec: nextCodec,
        bitrateMbps: Math.max(0.1, parseFloat((bitrateMbps * reductionRatio).toFixed(2))),
      });
    } else if (presetType === 'retention') {
      setScenarioB({
        ...currentScenarioA,
        retentionDays: retentionDays === 30 ? 60 : retentionDays * 2,
      });
    } else if (presetType === 'motion') {
      setScenarioB({
        ...currentScenarioA,
        recordingPct: recordingPct === 100 ? 75 : 100,
      });
    } else if (presetType === 'resolution') {
      const nextRes: ResolutionPresetKey = resolutionPreset === '4k' ? '1080p' : '4k';
      const nextMbps = RESOLUTION_BITRATES[nextRes][codec];
      setScenarioB({
        ...currentScenarioA,
        resolutionPreset: nextRes,
        bitrateMbps: nextMbps,
      });
    }
  };

  const activePreset = useMemo(() => {
    return CAMERA_BRAND_PRESETS.find(p => p.id === selectedBrandPresetId) || null;
  }, [selectedBrandPresetId]);

  const filteredPresetsGrouped = useMemo(() => {
    const q = presetSearchQuery.toLowerCase().trim();

    const list = CAMERA_BRAND_PRESETS.filter(p => {
      let matchesBrand = true;
      if (brandFilter === 'Axis') matchesBrand = p.brand.includes('Axis');
      else if (brandFilter === 'Hikvision') matchesBrand = p.brand.includes('Hikvision');
      else if (brandFilter === 'Dahua') matchesBrand = p.brand.includes('Dahua');
      else if (brandFilter === 'Hanwha') matchesBrand = p.brand.includes('Hanwha');
      else if (brandFilter === 'UNV') matchesBrand = p.brand.includes('Uniview');
      else if (brandFilter === 'Bosch') matchesBrand = p.brand.includes('Bosch');

      let matchesSearch = true;
      if (q) {
        matchesSearch =
          p.brand.toLowerCase().includes(q) ||
          p.modelSeries.toLowerCase().includes(q) ||
          p.resolutionName.toLowerCase().includes(q) ||
          p.smartCodec.toLowerCase().includes(q) ||
          p.note.toLowerCase().includes(q);
      }

      return matchesBrand && matchesSearch;
    });

    const groups: { brand: string; presets: CameraBrandPreset[] }[] = [];
    list.forEach(p => {
      let g = groups.find(x => x.brand === p.brand);
      if (!g) {
        g = { brand: p.brand, presets: [] };
        groups.push(g);
      }
      g.presets.push(p);
    });
    return groups;
  }, [brandFilter, presetSearchQuery]);

  const totalMatchingPresets = useMemo(() => {
    return filteredPresetsGrouped.reduce((acc, g) => acc + g.presets.length, 0);
  }, [filteredPresetsGrouped]);

  const handleSelectBrandPreset = (presetId: string) => {
    setSelectedBrandPresetId(presetId);
    if (presetId === 'custom') return;
    const p = CAMERA_BRAND_PRESETS.find(item => item.id === presetId);
    if (p) {
      setResolutionPreset(p.resKey);
      setCodec(p.codec);
      setBitrateMbps(p.bitrateMbps);
    }
  };



  const handleResolutionChange = (newRes: ResolutionPresetKey) => {
    setResolutionPreset(newRes);
    if (newRes !== 'custom') {
      const recMbps = RESOLUTION_BITRATES[newRes][codec];
      setBitrateMbps(recMbps);
    }
  };

  const handleCodecChange = (newCodec: CodecKey) => {
    if (newCodec === codec) return;
    setCodec(newCodec);

    const reductionRatio = 1 - (h265SavingsPct || 50) / 100; // e.g. 0.50

    if (resolutionPreset !== 'custom') {
      const recMbps = RESOLUTION_BITRATES[resolutionPreset][newCodec];
      setBitrateMbps(recMbps);
    } else {
      if (newCodec === 'h265') {
        setBitrateMbps(prev => Math.max(0.1, parseFloat((prev * reductionRatio).toFixed(2))));
      } else {
        setBitrateMbps(prev => Math.max(0.1, parseFloat((prev / reductionRatio).toFixed(2))));
      }
    }
  };

  const handleSavingsPctChange = (newPct: number) => {
    const oldPct = h265SavingsPct;
    setH265SavingsPct(newPct);
    try {
      localStorage.setItem('cctv_calc_h265_savings', String(newPct));
    } catch {
      // ignore
    }

    if (codec === 'h265' && bitrateMbps > 0) {
      const oldRatio = 1 - oldPct / 100;
      const newRatio = 1 - newPct / 100;
      const baseH264 = bitrateMbps / (oldRatio || 1);
      setBitrateMbps(Math.max(0.1, parseFloat((baseH264 * newRatio).toFixed(2))));
    }
  };

  const handleApplyPreset = (p: PresetOption) => {
    setSelectedBrandPresetId('custom');
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
    setSelectedBrandPresetId('custom');
    setBrandFilter('All');
    setCameras(16);
    setResolutionPreset('1080p');
    setCodec('h265');
    setBitrateMbps(2.0);
    setRetentionDays(30);
    setRecordingPct(100);
    setHeadroomPct(15);
    setDriveSizeTb(8);
    setRaidType('raid5');
    setPricePerTb(25);
    setDriveWorkloadRatingTbYr(180);
    setEnableCloudBackup(false);
    setCloudPricePerTbMonth(15);
    setCloudBackupScopePct(100);
    setEnableMultiTier(false);
    setTier1Days(7);
    setTier2BitratePct(50);
    setTier2DriveSizeTb(16);
    setTier2Raid('raid6');
  };

  const calculations = useMemo(() => {
    const safeMbps = Math.max(0.01, bitrateMbps || 0.1);
    const safeCams = Math.max(1, cameras || 1);
    const safeDays = Math.max(1, retentionDays || 1);
    const safeRec = Math.min(100, Math.max(1, recordingPct || 100));
    const safeHead = Math.max(0, headroomPct || 0);
    const safeDriveTb = Math.max(0.5, driveSizeTb || 1);
    const safePricePerTb = Math.max(0, pricePerTb || 0);
    const safeTbwRating = Math.max(10, driveWorkloadRatingTbYr || 180);

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
      const driveCost = nDrives * safeDriveTb * safePricePerTb;
      return {
        key,
        label: def.label,
        min: def.min,
        faultTolerance: def.faultTolerance,
        drives: nDrives,
        usableTb: uTb,
        rawTb,
        parityTb,
        driveCost,
        possible: ok,
        isCurrent: key === raidType,
      };
    });

    // H.264 baseline comparison for H.265 savings
    const h264EquivalentBitrate = codec === 'h265' ? safeMbps / (1 - (h265SavingsPct || 50) / 100) : safeMbps;
    const h264DailyGb = (h264EquivalentBitrate * 86400 / 8 / 1000) * (safeRec / 100);
    const h264NeedTb = (h264DailyGb * safeDays * safeCams * (1 + safeHead / 100)) / 1000;
    const tbSavedWithH265 = Math.max(0, h264NeedTb - totalNeedTb);

    // Hard drive financial budget metrics
    const costPerDrive = safeDriveTb * safePricePerTb;
    const totalHardDriveCost = drivesNeeded * costPerDrive;
    const rawCostPerUsableTb = usableStorageTb > 0 ? totalHardDriveCost / usableStorageTb : 0;

    // Workload & Lifespan estimation
    const dailyTbPerDrive = drivesNeeded > 0 ? totalDailyTb / drivesNeeded : totalDailyTb;
    const annualTbPerDrive = dailyTbPerDrive * 365.25;

    // Expected mechanical lifespan (capped at 5.0 years standard vendor warranty)
    const rawLifespanYears = annualTbPerDrive > 0 ? safeTbwRating / annualTbPerDrive : 5.0;
    const estimatedLifespanYears = Math.min(5.0, Math.max(0.2, rawLifespanYears));
    const estimatedLifespanMonths = Math.round(estimatedLifespanYears * 12);

    const workloadPct = (annualTbPerDrive / safeTbwRating) * 100;
    let workloadStatus: 'Low' | 'Optimal' | 'Heavy' | 'Overworked' = 'Optimal';
    if (workloadPct < 50) workloadStatus = 'Low';
    else if (workloadPct <= 100) workloadStatus = 'Optimal';
    else if (workloadPct <= 150) workloadStatus = 'Heavy';
    else workloadStatus = 'Overworked';

    // Cloud Backup Calculations
    const safeCloudPrice = Math.max(0, cloudPricePerTbMonth || 0);
    const safeCloudScope = Math.min(100, Math.max(1, cloudBackupScopePct || 100));
    const cloudStorageTb = enableCloudBackup ? totalNeedTb * (safeCloudScope / 100) : 0;
    const monthlyCloudCost = cloudStorageTb * safeCloudPrice;
    const annualCloudCost = monthlyCloudCost * 12;
    const threeYearCloudCost = annualCloudCost * 3;
    const threeYearHybridTco = totalHardDriveCost + threeYearCloudCost;
    const requiredUploadBandwidthMbps = enableCloudBackup
      ? safeMbps * safeCams * (safeRec / 100) * (safeCloudScope / 100)
      : 0;

    // Multi-Tier Storage Architecture Calculations
    const safeTier1Days = enableMultiTier ? Math.min(tier1Days, safeDays) : safeDays;
    const safeTier2Days = enableMultiTier ? Math.max(0, safeDays - safeTier1Days) : 0;
    const safeTier2BitratePct = Math.min(100, Math.max(10, tier2BitratePct || 50));

    // Tier 1 (Primary Hot Tier) Calculations
    const tier1NeedTb = enableMultiTier
      ? (gbPerCameraPerDay * safeTier1Days * safeCams * (1 + safeHead / 100)) / 1000
      : totalNeedTb;

    let tier1DrivesNeeded = 0;
    let tier1UsableTb = 0;
    let tier1RawTb = 0;
    let tier1ParityTb = 0;
    let tier1Possible = false;

    for (let n = raidInfo.min; n <= 64; n++) {
      const u = raidInfo.use(n) * safeDriveTb;
      if (u >= tier1NeedTb) {
        tier1DrivesNeeded = n;
        tier1UsableTb = u;
        tier1RawTb = n * safeDriveTb;
        tier1ParityTb = tier1RawTb - tier1UsableTb;
        tier1Possible = true;
        break;
      }
    }
    const tier1DriveCost = tier1DrivesNeeded * safeDriveTb * safePricePerTb;

    // Tier 2 (Secondary Cold Archive Tier) Calculations
    const tier2BitrateMbps = safeMbps * (safeTier2BitratePct / 100);
    const tier2GbPerCameraPerDay = (tier2BitrateMbps * 86400 / 8 / 1000) * (safeRec / 100);
    const tier2NeedTb = enableMultiTier && safeTier2Days > 0
      ? (tier2GbPerCameraPerDay * safeTier2Days * safeCams * (1 + safeHead / 100)) / 1000
      : 0;

    const tier2RaidInfo = RAID_DEFINITIONS[tier2Raid];
    let tier2DrivesNeeded = 0;
    let tier2UsableTb = 0;
    let tier2RawTb = 0;
    let tier2ParityTb = 0;
    let tier2Possible = false;

    if (enableMultiTier && safeTier2Days > 0) {
      for (let n = tier2RaidInfo.min; n <= 64; n++) {
        const u = tier2RaidInfo.use(n) * tier2DriveSizeTb;
        if (u >= tier2NeedTb) {
          tier2DrivesNeeded = n;
          tier2UsableTb = u;
          tier2RawTb = n * tier2DriveSizeTb;
          tier2ParityTb = tier2RawTb - tier2UsableTb;
          tier2Possible = true;
          break;
        }
      }
    }
    const tier2DriveCost = tier2DrivesNeeded * tier2DriveSizeTb * safePricePerTb;

    const combinedMultiTierStorageTb = tier1NeedTb + tier2NeedTb;
    const combinedMultiTierDrives = tier1DrivesNeeded + tier2DrivesNeeded;
    const combinedMultiTierBomCost = tier1DriveCost + tier2DriveCost;
    const multiTierStorageSavingsTb = Math.max(0, totalNeedTb - combinedMultiTierStorageTb);
    const multiTierCostSavingsDollar = Math.max(0, totalHardDriveCost - combinedMultiTierBomCost);

    return {
      safeMbps,
      safeCams,
      safeDays,
      safeRec,
      safeHead,
      safeDriveTb,
      safePricePerTb,
      safeTbwRating,
      costPerDrive,
      totalHardDriveCost,
      rawCostPerUsableTb,
      dailyTbPerDrive,
      annualTbPerDrive,
      rawLifespanYears,
      estimatedLifespanYears,
      estimatedLifespanMonths,
      workloadPct,
      workloadStatus,
      enableCloudBackup,
      safeCloudPrice,
      safeCloudScope,
      cloudStorageTb,
      monthlyCloudCost,
      annualCloudCost,
      threeYearCloudCost,
      threeYearHybridTco,
      requiredUploadBandwidthMbps,
      enableMultiTier,
      safeTier1Days,
      safeTier2Days,
      safeTier2BitratePct,
      tier1NeedTb,
      tier1DrivesNeeded,
      tier1UsableTb,
      tier1RawTb,
      tier1ParityTb,
      tier1Possible,
      tier1DriveCost,
      tier2BitrateMbps,
      tier2GbPerCameraPerDay,
      tier2NeedTb,
      tier2DriveSizeTb,
      tier2Raid,
      tier2DrivesNeeded,
      tier2UsableTb,
      tier2RawTb,
      tier2ParityTb,
      tier2Possible,
      tier2DriveCost,
      combinedMultiTierStorageTb,
      combinedMultiTierDrives,
      combinedMultiTierBomCost,
      multiTierStorageSavingsTb,
      multiTierCostSavingsDollar,
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
      h264NeedTb,
      tbSavedWithH265,
    };
  }, [
    cameras,
    bitrateMbps,
    retentionDays,
    recordingPct,
    headroomPct,
    driveSizeTb,
    raidType,
    codec,
    h265SavingsPct,
    pricePerTb,
    driveWorkloadRatingTbYr,
    enableCloudBackup,
    cloudPricePerTbMonth,
    cloudBackupScopePct,
    enableMultiTier,
    tier1Days,
    tier2BitratePct,
    tier2DriveSizeTb,
    tier2Raid,
  ]);

  const optimizationTips = useMemo<OptimizationTip[]>(() => {
    const tips: OptimizationTip[] = [];

    // 1. CODEC OPTIMIZATION
    if (codec === 'h264') {
      const reductionRatio = 1 - (h265SavingsPct || 50) / 100;
      const currentNeedTb = calculations.totalNeedTb;
      const projectedNeedTb = currentNeedTb * reductionRatio;
      const savedTb = Math.max(0, currentNeedTb - projectedNeedTb);

      tips.push({
        id: 'enable-h265',
        category: 'Codec',
        title: 'Upgrade from H.264 to H.265 / Smart Compression',
        description: `Your system is currently calculating using the legacy H.264 standard. Modern H.265 / Smart Codecs (Axis Zipstream, Hikvision H.265+, Dahua Smart Codec) reduce stream bandwidth by ${h265SavingsPct}%.`,
        potentialSavings: `Save ~${savedTb.toFixed(1)} TB (${h265SavingsPct}% storage reduction)`,
        impactLevel: 'High',
        actionButtonLabel: 'Switch to H.265',
        onApplyAction: () => handleCodecChange('h265'),
      });
    }

    // 2. RECORDING SCHEDULE & MOTION DETECTION
    if (recordingPct === 100) {
      const currentNeedTb = calculations.totalNeedTb;
      const projectedNeedTb = (currentNeedTb * 75) / 100;
      const savedTb = Math.max(0, currentNeedTb - projectedNeedTb);

      tips.push({
        id: 'motion-recording',
        category: 'Schedule',
        title: 'Enable Motion-Activated Recording Duty Cycle',
        description: 'Your schedule is currently set to 100% continuous 24/7 recording. Configuring smart motion detection or dual-stream analytics during off-peak hours reduces daily recording duty cycle to ~75%.',
        potentialSavings: `Save ~${savedTb.toFixed(1)} TB of disk space`,
        impactLevel: 'High',
        actionButtonLabel: 'Set to 75% Motion Duty Cycle',
        onApplyAction: () => setRecordingPct(75),
      });
    }

    // 3. FRAME RATE (FPS) TUNING
    if (bitrateMbps >= 3.5 || resolutionPreset === '4k' || resolutionPreset === '5mp') {
      const savedTb = calculations.totalNeedTb * 0.30;

      tips.push({
        id: 'fps-tuning',
        category: 'FPS',
        title: 'Optimize Frame Rate (Lower FPS from 30 to 15 FPS)',
        description: 'CCTV rarely requires 30 fps smooth motion. Standard commercial surveillance at 15 fps provides crisp motion capture for faces and license plates while dropping stream bitrates by ~30%.',
        potentialSavings: `Potential ~${savedTb.toFixed(1)} TB storage savings`,
        impactLevel: 'Medium',
        actionButtonLabel: 'Apply 15 FPS Bitrate Reduction',
        onApplyAction: () => {
          setBitrateMbps(prev => Math.max(0.5, parseFloat((prev * 0.7).toFixed(2))));
          setSelectedBrandPresetId('custom');
        },
      });
    }

    // 4. BITRATE CONTROL MODE (VBR vs CBR)
    if (bitrateMbps > 4.0 && resolutionPreset !== '4k') {
      tips.push({
        id: 'vbr-mode',
        category: 'Bitrate',
        title: 'Switch Camera Stream from CBR to VBR (Variable Bitrate)',
        description: 'CBR (Constant Bitrate) forces maximum stream transmission even during empty scenes at night. VBR allows the camera encoder to automatically drop bitrate during quiet hours.',
        potentialSavings: 'Reduces overnight storage ingestion spikes by up to 50%',
        impactLevel: 'Medium',
      });
    }

    // 5. RAID RESILIENCE & EFFICIENCY CHECK
    if (raidType === 'none' || raidType === 'raid0') {
      tips.push({
        id: 'raid-protection',
        category: 'RAID',
        title: 'Warning: Enable RAID 5 or RAID 6 for Hard Drive Redundancy',
        description: 'Your current selection (JBOD/RAID 0) offers zero disk fault tolerance. A single drive failure will permanently lose all stored video recordings across the entire system.',
        potentialSavings: 'Prevents total catastrophic video data loss',
        impactLevel: 'High',
        actionButtonLabel: 'Switch to RAID 5 Protection',
        onApplyAction: () => setRaidType('raid5'),
      });
    } else if ((raidType === 'raid1' || raidType === 'raid10') && calculations.drivesNeeded >= 6) {
      tips.push({
        id: 'raid-efficiency',
        category: 'RAID',
        title: 'Consider RAID 6 for Higher Capacity Storage Efficiency',
        description: 'RAID 1/10 consumes 50% of raw disk space for mirroring. On chassis with 6+ drives, RAID 6 provides dual-disk parity protection while recovering 66-80% usable capacity.',
        potentialSavings: 'Gains 15-30% additional usable storage capacity',
        impactLevel: 'Medium',
        actionButtonLabel: 'Switch to RAID 6',
        onApplyAction: () => setRaidType('raid6'),
      });
    }

    // 6. HEADROOM BUFFER TUNING
    if (headroomPct > 20) {
      const excessPct = headroomPct - 15;
      const savedTb = calculations.totalNeedTb * (excessPct / 100);
      tips.push({
        id: 'headroom-buffer',
        category: 'Bitrate',
        title: 'Tune Safety Headroom Buffer to Standard 15%',
        description: 'Your headroom safety buffer is set above 20%. A 15% headroom buffer is the industry standard for covering night noise spikes and audio without over-allocating hard drive space.',
        potentialSavings: `Frees ~${savedTb.toFixed(1)} TB array headroom`,
        impactLevel: 'Informational',
        actionButtonLabel: 'Set Headroom to 15%',
        onApplyAction: () => setHeadroomPct(15),
      });
    }

    // 7. SURVEILLANCE-GRADE HDD SPECIFICATION
    tips.push({
      id: 'surveillance-hdds',
      category: 'Bitrate',
      title: 'Deploy Surveillance-Rated Enterprise Hard Drives',
      description: 'Use dedicated 24/7 surveillance drives (e.g. Western Digital Purple Pro, Seagate SkyHawk AI) designed for 90% write / 10% read duty cycles rather than standard desktop PC HDDs which fail prematurely under heavy multi-camera NVR write loads.',
      potentialSavings: 'Ensures 24/7 continuous write reliability & full warranty coverage',
      impactLevel: 'Informational',
    });

    return tips;
  }, [codec, bitrateMbps, recordingPct, headroomPct, resolutionPreset, raidType, calculations, h265SavingsPct]);

  const handleCopySummary = () => {
    const text = `=====================================================
CCTV STORAGE & HARD DRIVE BOM SPECIFICATION
Generated via Jawed Imtiaz CCTV Calculator (jawed.co.in/tools)
=====================================================
• System Scale: ${calculations.safeCams} Cameras
• Camera Profile: ${activePreset ? `${activePreset.brand} - ${activePreset.modelSeries} (${activePreset.smartCodec}, ${activePreset.fps}fps)` : 'Custom / Generic VBR'}
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
      ['CCTV STORAGE & HARD DRIVE BOM SPECIFICATION REPORT'],
      ['Generated Date & Time', timestamp],
      ['Source Application', 'Jawed Imtiaz Tools - CCTV Storage Calculator'],
      ['URL', 'https://jawed.co.in/tools/cctv-storage-calculator'],
      [],
      ['1. SYSTEM PARAMETERS & CAMERA STREAM CONFIGURATION'],
      ['Parameter', 'Configured Value', 'Unit / Details'],
      ['Number of Cameras', calculations.safeCams, 'Cameras'],
      ['Camera Manufacturer Profile', activePreset ? `${activePreset.brand} - ${activePreset.modelSeries}` : 'Custom / Standard VBR', activePreset ? `${activePreset.smartCodec} (${activePreset.fps} fps, ${activePreset.sceneActivity} motion)` : ''],
      ['Video Resolution Preset', resolutionPreset.toUpperCase(), ''],
      ['Video Codec', codec.toUpperCase(), 'Compression standard'],
      ['Bitrate per Camera', calculations.safeMbps.toFixed(2), 'Mbps (Megabits per second)'],
      ['Target Retention Period', calculations.safeDays, 'Days'],
      ['Recording Duty Cycle', calculations.safeRec, `% (${calculations.safeRec === 100 ? 'Continuous 24/7' : 'Motion detection only'})`],
      ['Safety Headroom Buffer', calculations.safeHead, '% (Covers night spikes, audio, and recorder overhead)'],
      ['Target Drive Capacity', calculations.safeDriveTb, 'TB per drive (Decimal 1 TB = 1,000 GB)'],
      ['Selected RAID Array Level', RAID_DEFINITIONS[raidType].label, RAID_DEFINITIONS[raidType].faultTolerance],
      [],
      ['2. ESTIMATED STORAGE REQUIREMENTS'],
      ['Requirement Metric', 'Value', 'Unit'],
      ['Data Generated per Camera (24h continuous)', calculations.gbPerCamera24h.toFixed(2), 'GB/camera/day'],
      ['Data Generated per Camera (with duty cycle)', calculations.gbPerCameraPerDay.toFixed(2), 'GB/camera/day'],
      ['Retention Data per Camera (GB)', calculations.gbPerCameraRetention.toFixed(1), 'GB/camera'],
      ['Retention Data per Camera (TB)', (calculations.gbPerCameraRetention / 1000).toFixed(2), 'TB/camera'],
      ['Total Raw Video Storage (No Headroom)', calculations.totalRawTb.toFixed(2), 'TB'],
      ['Safety Headroom Buffer Storage', calculations.headroomOnlyTb.toFixed(2), 'TB'],
      ['Total Usable Storage Capacity Needed', calculations.totalNeedTb.toFixed(2), 'TB (Decimal)'],
      ['OS Binary Storage Equivalent', calculations.totalNeedTib.toFixed(2), 'TiB (Base-2 binary)'],
      ['Daily Ingestion Rate (All Cameras)', calculations.totalDailyGb.toFixed(1), 'GB/day'],
      ['Daily Ingestion Rate (All Cameras)', calculations.totalDailyTb.toFixed(2), 'TB/day'],
      [],
      ['3. HARD DRIVE & RAID ARRAY BILL OF MATERIALS (BOM)'],
      ['Specification Item', 'Value', 'Technical Note'],
      ['Target RAID Level', RAID_DEFINITIONS[raidType].label, RAID_DEFINITIONS[raidType].suitability],
      ['Individual Drive Capacity', `${calculations.safeDriveTb} TB`, 'Surveillance-grade SATA/SAS HDD'],
      ['Minimum Drive Count Required', calculations.possible ? `${calculations.drivesNeeded} Drives` : 'Exceeds 64 drive chassis limit', 'Drives needed to satisfy retention and headroom'],
      ['Usable Array Capacity Provided', calculations.possible ? `${calculations.usableStorageTb.toFixed(2)} TB` : 'N/A', 'Effective capacity for video footage'],
      ['Parity / Redundancy Storage Reserved', calculations.possible ? `${calculations.parityStorageTb.toFixed(2)} TB` : 'N/A', 'Dedicated to failure protection and rebuild parity'],
      ['Total Raw Physical Storage', calculations.possible ? `${calculations.rawStorageTb.toFixed(2)} TB` : 'N/A', 'Combined sum of all drive capacities'],
      ['Array Storage Efficiency', calculations.rawStorageTb > 0 ? `${((calculations.usableStorageTb / calculations.rawStorageTb) * 100).toFixed(1)}%` : '0%', 'Usable storage divided by raw disk capacity'],
      ['Hardware Fault Tolerance', RAID_DEFINITIONS[raidType].faultTolerance, 'System survives drive failures without downtime or data loss'],
      [],
      ['4. SIDE-BY-SIDE RAID COMPARISON MATRIX'],
      ['RAID Level', 'Min Drives', 'Drives Needed', `Usable Capacity (${calculations.safeDriveTb}TB drives)`, 'Parity / Mirror Overhead', 'Total Raw Capacity', 'Fault Tolerance', 'Selected Status'],
      ...calculations.raidMatrix.map(row => [
        row.label,
        row.min,
        row.possible ? `${row.drives} drives` : 'Exceeds 64',
        row.possible ? `${row.usableTb.toFixed(1)} TB` : 'N/A',
        row.possible ? `${row.parityTb.toFixed(1)} TB` : 'N/A',
        row.possible ? `${row.rawTb.toFixed(1)} TB` : 'N/A',
        row.faultTolerance,
        row.isCurrent ? 'SELECTED' : ''
      ]),
      [],
      ['5. CALCULATION METHODOLOGY & ASSUMPTIONS'],
      ['Formula', 'GB per camera per day = bitrate (Mbps) * 86,400 seconds / 8 / 1,000 * (recording_time_pct / 100)'],
      ['Note 1', 'Bitrates are estimates based on standard surveillance codecs. Variable Bit Rate (VBR) can fluctuate.'],
      ['Note 2', 'Surveillance-rated hard drives (e.g. WD Purple, Seagate SkyHawk) are recommended for 24/7 write duty.'],
      ['Note 3', 'Drive manufacturers compute in decimal (1 TB = 1,000 GB = 1,000,000 MB), matching this calculator.']
    ];

    const csvContent = '\uFEFF' + rows.map(r => r.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cctv-storage-calculation-${calculations.safeCams}cams-${calculations.safeDays}days-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportedCsv(true);
    setTimeout(() => setExportedCsv(false), 2500);
  };

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
      const timeStr = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const dateStamp = new Date().toISOString().split('T')[0];

      // ==========================================
      // PAGE 1: EXECUTIVE ENGINEERING REPORT
      // ==========================================

      // Top Navy Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.roundedRect(14, 12, 182, 25, 2.5, 2.5, 'F');

      // Accent Left Bar
      doc.setFillColor(14, 165, 233); // sky-500
      doc.roundedRect(14, 12, 3.5, 25, 1.5, 1.5, 'F');

      // Title & Subtitle
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('CCTV STORAGE & HARD DRIVE BOM SPECIFICATION', 21, 20);

      doc.setTextColor(203, 213, 225); // slate-300
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Video Surveillance Storage Engineering & Hardware Sizing Report', 21, 26);

      // Header Meta (Right aligned)
      doc.setFontSize(7.5);
      doc.setTextColor(203, 213, 225);
      doc.text(`Generated: ${dateStr} ${timeStr}`, 192, 19, { align: 'right' });
      doc.setTextColor(56, 189, 248); // sky-400
      doc.text('Tools: jawed.co.in/tools', 192, 24, { align: 'right' });
      doc.setTextColor(52, 211, 153); // emerald-400
      doc.text('Status: Verified Client Tender Specification', 192, 29, { align: 'right' });

      // Highlight KPI Cards (3 boxes)
      const cardY = 41;
      const cardH = 22;
      const cardW = 58;

      // Card 1: Total Usable Storage Needed
      doc.setFillColor(240, 249, 255); // sky-50
      doc.setDrawColor(186, 230, 253); // sky-200
      doc.roundedRect(14, cardY, cardW, cardH, 2, 2, 'FD');

      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.text('TOTAL USABLE STORAGE NEEDED', 18, cardY + 5.5);

      doc.setTextColor(2, 132, 199); // sky-600
      doc.setFontSize(14);
      doc.text(`${calculations.totalNeedTb.toFixed(1)} TB`, 18, cardY + 13);

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`incl. ${calculations.safeHead}% headroom (~${calculations.totalNeedTib.toFixed(1)} TiB)`, 18, cardY + 18.5);

      // Card 2: Hard Drives & Array
      doc.setFillColor(255, 251, 235); // amber-50
      doc.setDrawColor(253, 230, 138); // amber-200
      doc.roundedRect(76, cardY, cardW, cardH, 2, 2, 'FD');

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.text('ARRAY DRIVE ALLOCATION', 80, cardY + 5.5);

      doc.setTextColor(217, 119, 6); // amber-600
      doc.setFontSize(13);
      doc.text(
        calculations.possible ? `${calculations.drivesNeeded} × ${calculations.safeDriveTb} TB` : 'Exceeds 64 Bays',
        80,
        cardY + 13
      );

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(
        `${RAID_DEFINITIONS[raidType].label.split(' ')[0]} ${RAID_DEFINITIONS[raidType].label.split(' ')[1]} (${calculations.usableStorageTb.toFixed(1)} TB Usable)`,
        80,
        cardY + 18.5
      );

      // Card 3: Camera Stream Ingestion
      doc.setFillColor(236, 253, 245); // emerald-50
      doc.setDrawColor(167, 243, 208); // emerald-200
      doc.roundedRect(138, cardY, cardW, cardH, 2, 2, 'FD');

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.text('CAMERAS & DAILY INGESTION', 142, cardY + 5.5);

      doc.setTextColor(5, 150, 105); // emerald-600
      doc.setFontSize(14);
      doc.text(`${calculations.safeCams} Cameras`, 142, cardY + 13);

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`${calculations.totalDailyGb.toFixed(0)} GB/day (${calculations.totalDailyTb.toFixed(2)} TB/day)`, 142, cardY + 18.5);

      // SECTION 1: System Parameters & Stream Configuration
      const s1Y = 67;
      doc.setFillColor(15, 23, 42);
      doc.rect(14, s1Y, 182, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('1. SYSTEM PARAMETERS & CAMERA STREAM CONFIGURATION', 17, s1Y + 4.2);

      // Table 1: Box container
      const t1Y = s1Y + 6;
      const t1H = 43;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, t1Y, 182, t1H, 'FD');

      const s1Rows = [
        ['Number of Cameras', `${calculations.safeCams} Cameras`, 'Retention Period', `${calculations.safeDays} Days`],
        ['Camera Profile', activePreset ? `${activePreset.brand.split(' ')[0]} ${activePreset.modelSeries}` : 'Standard / Custom VBR', 'Recording Duty Cycle', `${calculations.safeRec}% (${calculations.safeRec === 100 ? 'Continuous 24/7' : 'Motion detection'})`],
        ['Video Resolution Preset', `${resolutionPreset.toUpperCase()}`, 'Headroom Safety Margin', `${calculations.safeHead}%`],
        ['Video Codec standard', `${codec.toUpperCase()}${activePreset ? ` (${activePreset.smartCodec})` : ''}`, 'Individual Drive Capacity', `${calculations.safeDriveTb} TB (Decimal 1TB=1000GB)`],
        ['Bitrate per Camera', `${calculations.safeMbps.toFixed(2)} Mbps`, 'Selected RAID Level', `${RAID_DEFINITIONS[raidType].label}`],
        ['Total System Bitrate', `${(calculations.safeMbps * calculations.safeCams).toFixed(1)} Mbps`, 'Target Frame Rate', activePreset ? `${activePreset.fps} fps (${activePreset.sceneActivity} motion)` : 'Standard 25 fps'],
      ];

      s1Rows.forEach((r, idx) => {
        const rowH = 7.15;
        const rowY = t1Y + idx * rowH;
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, rowY, 182, rowH, 'F');
        }
        doc.setDrawColor(241, 245, 249);
        doc.line(14, rowY + rowH, 196, rowY + rowH);

        // Col 1 label & val
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.0);
        doc.setTextColor(71, 85, 105);
        doc.text(r[0], 17, rowY + 4.8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        const col1Val = doc.splitTextToSize(r[1], 45);
        doc.text(col1Val, 56, rowY + 4.8);

        // Vertical divider
        doc.setDrawColor(226, 232, 240);
        doc.line(105, rowY, 105, rowY + rowH);

        // Col 2 label & val
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text(r[2], 108, rowY + 4.8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(r[3], 152, rowY + 4.8);
      });

      // SECTION 2: Estimated Storage Requirements Breakdown
      const s2Y = 115;
      doc.setFillColor(15, 23, 42);
      doc.rect(14, s2Y, 182, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('2. ESTIMATED STORAGE CAPACITY & INGESTION METRICS', 17, s2Y + 4.2);

      const t2Y = s2Y + 6;
      const s2Data = [
        ['Daily Ingestion per Camera (24h continuous)', `${calculations.gbPerCamera24h.toFixed(2)} GB/day`, 'Theoretical maximum 24h data generated per camera'],
        ['Daily Ingestion per Camera (with duty cycle)', `${calculations.gbPerCameraPerDay.toFixed(2)} GB/day`, `Adjusted for ${calculations.safeRec}% recording duty cycle`],
        ['Retention Storage per Camera (Full duration)', `${(calculations.gbPerCameraRetention / 1000).toFixed(2)} TB (${calculations.gbPerCameraRetention.toFixed(0)} GB)`, `Required footprint for 1 camera across ${calculations.safeDays} days`],
        ['Total Raw Video Data (All cameras, no headroom)', `${calculations.totalRawTb.toFixed(2)} TB`, `Unpadded video stream accumulation for ${calculations.safeCams} cameras`],
        ['Safety Headroom Buffer Allocation', `${calculations.headroomOnlyTb.toFixed(2)} TB`, `${calculations.safeHead}% allocated for night sensor noise & audio`],
        ['Total Usable Storage Capacity Needed', `${calculations.totalNeedTb.toFixed(2)} TB`, 'Net storage that must be provided by the disk array'],
        ['Operating System Binary Format Equivalent', `~${calculations.totalNeedTib.toFixed(2)} TiB`, 'Capacity seen in Windows/Linux (1 TiB = 1,024 GiB)'],
        ['System-Wide Daily Ingestion Rate', `${calculations.totalDailyGb.toFixed(1)} GB/day (${calculations.totalDailyTb.toFixed(2)} TB/day)`, `Aggregate write throughput required across all ${calculations.safeCams} streams`],
      ];

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, t2Y, 182, s2Data.length * 6.5 + 6.5, 'FD');

      // Table Header Row
      doc.setFillColor(241, 245, 249);
      doc.rect(14, t2Y, 182, 6.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(71, 85, 105);
      doc.text('STORAGE METRIC', 17, t2Y + 4.5);
      doc.text('CALCULATED VALUE', 95, t2Y + 4.5);
      doc.text('ENGINEERING CONTEXT', 135, t2Y + 4.5);
      doc.setDrawColor(203, 213, 225);
      doc.line(14, t2Y + 6.5, 196, t2Y + 6.5);

      s2Data.forEach((row, i) => {
        const rowY = t2Y + 6.5 + i * 6.5;
        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, rowY, 182, 6.5, 'F');
        }
        doc.setDrawColor(241, 245, 249);
        doc.line(14, rowY + 6.5, 196, rowY + 6.5);

        doc.setFont('helvetica', i === 5 ? 'bold' : 'normal');
        doc.setFontSize(7.2);
        if (i === 5) {
          doc.setTextColor(2, 132, 199);
        } else {
          doc.setTextColor(15, 23, 42);
        }
        doc.text(row[0], 17, rowY + 4.5);

        doc.setFont('helvetica', 'bold');
        if (i === 5) {
          doc.setTextColor(2, 132, 199);
        } else {
          doc.setTextColor(15, 23, 42);
        }
        doc.text(row[1], 95, rowY + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(row[2], 135, rowY + 4.5);
      });

      // SECTION 3: Hard Drive & RAID Bill of Materials (BOM)
      const s3Y = 186;
      doc.setFillColor(15, 23, 42);
      doc.rect(14, s3Y, 182, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('3. HARD DRIVE ARRAY & RAID BILL OF MATERIALS (BOM)', 17, s3Y + 4.2);

      const t3Y = s3Y + 6;
      const t3H = 80;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, t3Y, 182, t3H, 'FD');

      const s3Items = [
        ['Target Array Configuration', RAID_DEFINITIONS[raidType].label, 'Standard surveillance array profile'],
        ['Drive Model Recommendation', `${calculations.safeDriveTb} TB Surveillance-grade SATA/SAS HDD`, '24/7 continuous write duty (e.g. WD Purple, Seagate SkyHawk)'],
        ['Total Hard Drives Required', calculations.possible ? `${calculations.drivesNeeded} × ${calculations.safeDriveTb} TB Drives` : 'Exceeds 64 drive enclosure limit', 'Calculated disk quantity required to satisfy retention + headroom'],
        ['Usable Storage Capacity Provided', calculations.possible ? `${calculations.usableStorageTb.toFixed(1)} TB (${(calculations.usableStorageTb - calculations.totalNeedTb >= 0 ? '+' : '')}${(calculations.usableStorageTb - calculations.totalNeedTb).toFixed(1)} TB surplus)` : 'N/A', 'Net file storage available for video recordings'],
        ['Parity & Redundancy Overhead', calculations.possible ? `${calculations.parityStorageTb.toFixed(1)} TB` : 'N/A', 'Dedicated capacity used exclusively for parity / disk mirroring'],
        ['Total Raw Physical Storage Capacity', calculations.possible ? `${calculations.rawStorageTb.toFixed(1)} TB` : 'N/A', 'Combined raw unformatted physical disk capacity'],
        ['Storage Efficiency Ratio', calculations.rawStorageTb > 0 ? `${((calculations.usableStorageTb / calculations.rawStorageTb) * 100).toFixed(1)}%` : '0%', 'Usable storage divided by raw disk capacity'],
        ['Fault Tolerance / Protection Level', RAID_DEFINITIONS[raidType].faultTolerance, 'Array can sustain drive losses without data outage or video loss'],
        ['Architectural Assessment', RAID_DEFINITIONS[raidType].suitability, 'Engineering suitability assessment for this deployment'],
      ];

      s3Items.forEach((item, idx) => {
        const rowY = t3Y + idx * 8.8;
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, rowY, 182, 8.8, 'F');
        }
        doc.setDrawColor(241, 245, 249);
        doc.line(14, rowY + 8.8, 196, rowY + 8.8);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(71, 85, 105);
        doc.text(item[0], 17, rowY + 5.5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(item[1], 75, rowY + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(item[2], 135, rowY + 5.5);
      });

      // Page 1 Footer
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 280, 196, 280);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('CCTV Storage Calculator · jawed.co.in/tools · Browser-based Engineering Specification', 14, 284);
      doc.text('Page 1 of 2', 196, 284, { align: 'right' });

      // ==========================================
      // PAGE 2: COMPARATIVE RAID MATRIX & GUIDELINES
      // ==========================================
      doc.addPage();

      // Top Header Page 2
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(14, 12, 182, 20, 2.5, 2.5, 'F');

      doc.setFillColor(14, 165, 233);
      doc.roundedRect(14, 12, 3.5, 20, 1.5, 1.5, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('COMPARATIVE RAID MATRIX & ENGINEERING SPECIFICATIONS', 21, 19);

      doc.setTextColor(203, 213, 225);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Side-by-side array evaluation for ${calculations.totalNeedTb.toFixed(1)} TB target using ${calculations.safeDriveTb} TB surveillance disks`, 21, 25);

      doc.setFontSize(7.5);
      doc.setTextColor(203, 213, 225);
      doc.text(`Date: ${dateStr}`, 192, 22, { align: 'right' });

      // SECTION 4: Side-by-Side RAID Matrix Comparison Table
      const s4Y = 36;
      doc.setFillColor(15, 23, 42);
      doc.rect(14, s4Y, 182, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('4. SIDE-BY-SIDE RAID ARCHITECTURE COMPARISON TABLE', 17, s4Y + 4.2);

      const t4Y = s4Y + 6;
      const t4HeaderH = 7;
      const t4RowH = 9.5;
      const matrixRows = calculations.raidMatrix;

      // Table 4 Container
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, t4Y, 182, t4HeaderH + matrixRows.length * t4RowH, 'FD');

      // Table 4 Headers
      doc.setFillColor(241, 245, 249);
      doc.rect(14, t4Y, 182, t4HeaderH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text('RAID LEVEL', 17, t4Y + 4.8);
      doc.text('MIN', 55, t4Y + 4.8);
      doc.text(`DRIVES (${calculations.safeDriveTb}TB)`, 68, t4Y + 4.8);
      doc.text('USABLE TB', 96, t4Y + 4.8);
      doc.text('PARITY TB', 118, t4Y + 4.8);
      doc.text('RAW TB', 138, t4Y + 4.8);
      doc.text('FAULT TOLERANCE', 156, t4Y + 4.8);
      doc.setDrawColor(203, 213, 225);
      doc.line(14, t4Y + t4HeaderH, 196, t4Y + t4HeaderH);

      matrixRows.forEach((row, i) => {
        const rowY = t4Y + t4HeaderH + i * t4RowH;
        if (row.isCurrent) {
          doc.setFillColor(240, 249, 255); // Highlight selected row
          doc.rect(14, rowY, 182, t4RowH, 'F');
          doc.setFillColor(14, 165, 233);
          doc.rect(14, rowY, 2, t4RowH, 'F');
        } else if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, rowY, 182, t4RowH, 'F');
        }
        doc.setDrawColor(241, 245, 249);
        doc.line(14, rowY + t4RowH, 196, rowY + t4RowH);

        doc.setFont('helvetica', row.isCurrent ? 'bold' : 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(15, 23, 42);
        const labelText = row.label.length > 22 ? row.label.substring(0, 20) + '...' : row.label;
        doc.text(labelText, 17, rowY + 4.5);
        if (row.isCurrent) {
          doc.setFontSize(6);
          doc.setTextColor(2, 132, 199);
          doc.text('[SELECTED]', 17, rowY + 8);
        }

        doc.setFontSize(7.2);
        doc.setTextColor(100, 116, 139);
        doc.text(`${row.min}`, 57, rowY + 6);

        doc.setFont('helvetica', 'bold');
        if (row.possible) {
          doc.setTextColor(15, 23, 42);
        } else {
          doc.setTextColor(239, 68, 68);
        }
        doc.text(row.possible ? `${row.drives} drives` : '> 64 Limit', 68, rowY + 6);

        doc.setTextColor(5, 150, 105);
        doc.text(row.possible ? `${row.usableTb.toFixed(1)} TB` : 'N/A', 96, rowY + 6);

        doc.setTextColor(217, 119, 6);
        doc.text(row.possible ? `${row.parityTb.toFixed(1)} TB` : 'N/A', 118, rowY + 6);

        doc.setTextColor(71, 85, 105);
        doc.text(row.possible ? `${row.rawTb.toFixed(1)} TB` : 'N/A', 138, rowY + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.text(doc.splitTextToSize(row.faultTolerance, 38), 156, rowY + 4.5);
      });

      // SECTION 5: Storage Allocation Bar & Capacity
      const s5Y = t4Y + t4HeaderH + matrixRows.length * t4RowH + 6;
      doc.setFillColor(15, 23, 42);
      doc.rect(14, s5Y, 182, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('5. CAPACITY PROVISIONING & STORAGE PROPORTION', 17, s5Y + 4.2);

      const t5Y = s5Y + 6;
      const t5H = 26;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, t5Y, 182, t5H, 'FD');

      // Visual Bar
      const totalBarW = 174;
      const barH = 7;
      const barX = 18;
      const barY = t5Y + 5;

      const rawVideoRatio = calculations.totalNeedTb > 0 ? calculations.totalRawTb / calculations.totalNeedTb : 0.85;
      const videoW = Math.max(10, Math.min(totalBarW - 10, totalBarW * rawVideoRatio));
      const bufferW = totalBarW - videoW;

      // Video Bar portion
      doc.setFillColor(14, 165, 233); // sky-500
      doc.rect(barX, barY, videoW, barH, 'F');

      // Buffer Bar portion
      doc.setFillColor(245, 158, 11); // amber-500
      doc.rect(barX + videoW, barY, bufferW, barH, 'F');

      // Text descriptions under bar
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(2, 132, 199);
      doc.text(`Raw Video Footage: ${calculations.totalRawTb.toFixed(1)} TB (${(rawVideoRatio * 100).toFixed(0)}%)`, barX, barY + 12);

      doc.setTextColor(217, 119, 6);
      doc.text(`Headroom Buffer: ${calculations.headroomOnlyTb.toFixed(1)} TB (${(100 - rawVideoRatio * 100).toFixed(0)}%)`, barX + videoW, barY + 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Total Storage Provisioned: ${calculations.usableStorageTb.toFixed(1)} TB Usable | ${calculations.parityStorageTb.toFixed(1)} TB Parity Overhead | ${calculations.rawStorageTb.toFixed(1)} TB Raw Capacity`, barX, barY + 18);

      // SECTION 6: Surveillance Engineering Guidelines & Best Practices
      const s6Y = t5Y + t5H + 6;
      doc.setFillColor(15, 23, 42);
      doc.rect(14, s6Y, 182, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('6. SURVEILLANCE INFRASTRUCTURE DEPLOYMENT GUIDELINES', 17, s6Y + 4.2);

      const t6Y = s6Y + 6;
      const t6H = 70;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, t6Y, 182, t6H, 'FD');

      const guidelines = [
        ['Bitrate Dynamics:', 'Preset bitrates represent initial engineering baselines. Real bitrates depend dynamically on scene motion density, camera frame rate (fps), lighting conditions, and night-time infrared (IR) sensor noise, which can increase stream bitrates by 20% to 40%.'],
        ['Motion vs Continuous:', 'Setting a 100% duty cycle assumes uninterrupted 24/7 continuous stream recording. For motion-triggered schedules, evaluate busy daytime periods carefully; high-traffic public areas often record upwards of 80% to 95% of daytime hours.'],
        ['Safety Headroom:', 'A 15% to 20% headroom safety buffer is strongly recommended to absorb bitrate spikes at night, multi-channel G.711/AAC audio streams, recorder file system metadata, and future camera additions.'],
        ['Surveillance HDDs:', 'Standard desktop hard drives are unsuitable for CCTV recording. Always specify 24/7 surveillance-rated drives (e.g., Western Digital Purple / Purple Pro, Seagate SkyHawk AI) engineered with rotational vibration (RV) sensors and firmware tuned for sequential multi-stream write workloads.'],
        ['RAID Reliability:', 'RAID 5 offers the best capacity balance for up to 8 drives. When deploying 8 TB or larger drives, RAID 6 (dual parity) is strongly advised to eliminate failure risks during multi-day rebuild stress.'],
        ['Decimal vs Binary:', 'Hard drive manufacturers calculate capacity using decimal terabytes (1 TB = 1,000 GB = 1,000,000 MB). Operating systems (Windows, Linux, macOS) report binary TiB (1 TiB = 1,024 GiB), appearing ~9% lower in storage managers.'],
      ];

      guidelines.forEach((g, idx) => {
        const itemY = t6Y + 4 + idx * 11;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(15, 23, 42);
        doc.text(`• ${g[0]}`, 17, itemY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        const splitText = doc.splitTextToSize(g[1], 144);
        doc.text(splitText, 48, itemY);
      });

      // Page 2 Footer
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 280, 196, 280);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('CCTV Storage Calculator · jawed.co.in/tools · Browser-based Engineering Specification', 14, 284);
      doc.text('Page 2 of 2', 196, 284, { align: 'right' });

      // Save PDF file
      doc.save(`cctv-storage-specification-${calculations.safeCams}cams-${calculations.safeDays}days-${dateStamp}.pdf`);

      setExportedPdf(true);
      setTimeout(() => setExportedPdf(false), 2500);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    }
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
          <p className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Free tool · runs in your browser · nothing is uploaded
          </p>

          {/* Top Manual Theme Toggle Button */}
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
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode (Overrides system preference)`}
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

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setEnableComparisonMode(prev => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              background: enableComparisonMode ? 'rgba(99, 102, 241, 0.2)' : undefined,
              borderColor: enableComparisonMode ? 'var(--accent)' : undefined,
              fontWeight: enableComparisonMode ? 700 : 500,
            }}
            title="Compare two side-by-side scenarios to evaluate codecs, retention days, or resolution scaling"
          >
            <SlidersHorizontal className="w-4 h-4 text-purple-400" />
            {enableComparisonMode ? 'Hide Comparison' : 'Compare Scenarios'}
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={toggleTheme}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
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
            onClick={handleExportPdf}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            title="Export clean, professional PDF calculation report for clients or print"
          >
            {exportedPdf ? <Check className="w-4 h-4 text-emerald-400" /> : <FileText className="w-4 h-4 text-rose-400" />}
            {exportedPdf ? 'Exported PDF!' : 'Export PDF'}
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={handleExportCsv}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            title="Export calculation results, drive specifications, and RAID matrix as a CSV file"
          >
            {exportedCsv ? <Check className="w-4 h-4 text-emerald-400" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
            {exportedCsv ? 'Exported CSV!' : 'Export CSV'}
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

      {/* Compare Scenarios Side-by-Side Panel */}
      {enableComparisonMode && (
        <CompareScenariosPanel
          scenarioA={currentScenarioA}
          scenarioB={scenarioB}
          onChangeScenarioB={updated => setScenarioB(prev => ({ ...prev, ...updated }))}
          onCopyAtoB={handleCopyAtoB}
          onSwapAandB={handleSwapAandB}
          onCloseComparison={() => setEnableComparisonMode(false)}
          onApplyPresetComparison={handleApplyPresetComparison}
        />
      )}

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="cams" style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>
                  Number of cameras
                </label>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Quick presets:
                </span>
              </div>

              {/* Quick Access Camera Count Preset Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '8px' }}>
                {[4, 8, 16, 32, 64].map(n => {
                  const isSelected = cameras === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCameras(n)}
                      style={{
                        padding: '6px 4px',
                        fontSize: '0.78rem',
                        fontWeight: isSelected ? 800 : 600,
                        borderRadius: '6px',
                        background: isSelected ? 'var(--accent)' : 'var(--bg)',
                        color: isSelected ? '#ffffff' : 'var(--text-heading)',
                        border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      title={`Auto-fill ${n} cameras`}
                    >
                      {n} Cams
                    </button>
                  );
                })}
              </div>

              <input
                id="cams"
                type="number"
                min="1"
                max="500"
                value={cameras}
                onChange={e => setCameras(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
              <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Select a quick preset above (4, 8, 16, 32, 64) or enter a custom camera quantity.
              </p>
            </div>

            {/* Camera Manufacturer Presets (Axis, Hikvision, Dahua, etc.) */}
            <div
              style={{
                marginBottom: '16px',
                padding: '14px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '10px',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                <label
                  htmlFor="mfr-preset"
                  style={{
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--text-heading)',
                    margin: 0,
                  }}
                >
                  <Video className="w-4 h-4 text-sky-400" />
                  Camera Brand / Manufacturer Presets
                </label>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Axis · Hikvision · Dahua · Hanwha · UNV · Bosch
                </span>
              </div>

              {/* Brand Filter Buttons & Real-Time Search Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {['All', 'Axis', 'Hikvision', 'Dahua', 'Hanwha', 'UNV', 'Bosch'].map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBrandFilter(b)}
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        borderRadius: '4px',
                        background: brandFilter === b ? 'var(--accent)' : 'var(--bg)',
                        color: brandFilter === b ? '#ffffff' : 'var(--text-muted)',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        fontWeight: brandFilter === b ? 700 : 400,
                      }}
                    >
                      {b}
                    </button>
                  ))}
                </div>

                {/* Real-time Preset Search Input */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search
                    className="w-3.5 h-3.5"
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search model, codec, resolution (e.g., AcuSense, Zipstream, 4K)..."
                    value={presetSearchQuery}
                    onChange={e => setPresetSearchQuery(e.target.value)}
                    style={{
                      fontSize: '0.8rem',
                      padding: '6px 28px 6px 30px',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      width: '100%',
                    }}
                  />
                  {presetSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPresetSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        padding: '2px',
                      }}
                      title="Clear search query"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Manufacturer Preset Dropdown */}
              <select
                id="mfr-preset"
                value={selectedBrandPresetId}
                onChange={e => handleSelectBrandPreset(e.target.value)}
                style={{
                  fontSize: '0.85rem',
                  padding: '8px 10px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  width: '100%',
                }}
              >
                <option value="custom">
                  -- Custom / Generic Bitrate ({totalMatchingPresets} preset{totalMatchingPresets !== 1 ? 's' : ''} available) --
                </option>
                {filteredPresetsGrouped.map(group => (
                  <optgroup key={group.brand} label={`${group.brand} (${group.presets.length})`}>
                    {group.presets.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.brand.split(' ')[0]} {p.modelSeries} · {p.resolutionName} ({p.smartCodec}) – {p.bitrateMbps} Mbps
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {/* Real-time Search Match Indicator */}
              {presetSearchQuery.trim() && (
                <div style={{ fontSize: '0.72rem', color: 'var(--emerald)', fontWeight: 600, marginTop: '4px' }}>
                  🔍 Found {totalMatchingPresets} matching camera model{totalMatchingPresets !== 1 ? 's' : ''} for &quot;{presetSearchQuery}&quot;
                </div>
              )}

              {/* Active Preset Detail Info Card */}
              {activePreset ? (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    fontSize: '0.78rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px',
                      flexWrap: 'wrap',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>
                      {activePreset.brand}: {activePreset.modelSeries}
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'rgba(56, 189, 248, 0.2)',
                        color: '#38bdf8',
                      }}
                    >
                      {activePreset.smartCodec} · {activePreset.fps} fps · {activePreset.sceneActivity} Motion
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {activePreset.note}
                  </p>
                </div>
              ) : (
                <p style={{ margin: '6px 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Selecting a manufacturer preset auto-populates realistic bitrates, codecs, and recommended resolutions.
                </p>
              )}
            </div>

            {/* Resolution Preset & Bitrate Standards */}
            <div
              style={{
                marginBottom: '16px',
                padding: '14px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '10px',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                <label
                  htmlFor="res"
                  style={{
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--text-heading)',
                    margin: 0,
                  }}
                >
                  <Sliders className="w-4 h-4 text-sky-400" />
                  Camera Resolution &amp; Bitrate Presets
                </label>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Auto-populates standard bitrates
                </span>
              </div>

              {/* Quick Resolution Preset Pill Buttons */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {(Object.keys(RESOLUTION_PRESET_DETAILS) as Array<Exclude<ResolutionPresetKey, 'custom'>>).map(key => {
                  const details = RESOLUTION_PRESET_DETAILS[key];
                  const isSelected = resolutionPreset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleResolutionChange(key)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.72rem',
                        borderRadius: '4px',
                        background: isSelected ? 'var(--accent)' : 'var(--bg)',
                        color: isSelected ? '#ffffff' : 'var(--text-muted)',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        fontWeight: isSelected ? 700 : 400,
                      }}
                      title={`${details.label} (${details.megapixels}) - Default bitrate: ${RESOLUTION_BITRATES[key][codec]} Mbps (${codec.toUpperCase()})`}
                    >
                      {details.shortLabel}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setResolutionPreset('custom')}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    borderRadius: '4px',
                    background: resolutionPreset === 'custom' ? 'var(--accent)' : 'var(--bg)',
                    color: resolutionPreset === 'custom' ? '#ffffff' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    fontWeight: resolutionPreset === 'custom' ? 700 : 400,
                  }}
                >
                  Custom
                </button>
              </div>

              {/* Resolution Dropdown */}
              <select
                id="res"
                value={resolutionPreset}
                onChange={e => handleResolutionChange(e.target.value as ResolutionPresetKey)}
                style={{
                  fontSize: '0.85rem',
                  padding: '8px 10px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  width: '100%',
                }}
              >
                {(Object.keys(RESOLUTION_PRESET_DETAILS) as Array<Exclude<ResolutionPresetKey, 'custom'>>).map(key => {
                  const details = RESOLUTION_PRESET_DETAILS[key];
                  const curMbps = RESOLUTION_BITRATES[key][codec];
                  const altCodec: CodecKey = codec === 'h265' ? 'h264' : 'h265';
                  const altMbps = RESOLUTION_BITRATES[key][altCodec];
                  return (
                    <option key={key} value={key}>
                      {details.label} · Preset: {curMbps} Mbps ({codec.toUpperCase()}) / {altMbps} Mbps ({altCodec.toUpperCase()})
                    </option>
                  );
                })}
                <option value="custom">-- Custom / Manual Bitrate Entry --</option>
              </select>

              {/* Active Resolution Detail Info Card */}
              {resolutionPreset !== 'custom' && RESOLUTION_PRESET_DETAILS[resolutionPreset] ? (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    fontSize: '0.78rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px',
                      flexWrap: 'wrap',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>
                      {RESOLUTION_PRESET_DETAILS[resolutionPreset].label} ({RESOLUTION_PRESET_DETAILS[resolutionPreset].megapixels})
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'rgba(56, 189, 248, 0.2)',
                        color: '#38bdf8',
                      }}
                    >
                      Default: {RESOLUTION_BITRATES[resolutionPreset][codec]} Mbps ({codec.toUpperCase()})
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    <b>Typical Application:</b> {RESOLUTION_PRESET_DETAILS[resolutionPreset].typicalUsage}
                  </p>
                </div>
              ) : (
                <p style={{ margin: '6px 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Don&apos;t know your camera&apos;s exact bitrate? Selecting a resolution populates standard industry starting points (e.g. 2 Mbps for 1080p, 3 Mbps for 4MP, 6 Mbps for 4K under H.265).
                </p>
              )}
            </div>

            {/* Codec Toggle Switch & Efficiency Multiplier */}
            <div
              style={{
                marginBottom: '16px',
                padding: '14px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '10px',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                <label
                  style={{
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--text-heading)',
                    margin: 0,
                  }}
                >
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Compression Codec &amp; Efficiency Switch
                </label>
                {codec === 'h265' && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(16, 185, 129, 0.18)',
                      color: 'var(--emerald)',
                    }}
                  >
                    -{h265SavingsPct}% Bitrate Multiplier
                  </span>
                )}
              </div>

              {/* Segmented Codec Toggle Switch */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px',
                  background: 'var(--bg)',
                  padding: '4px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  marginBottom: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleCodecChange('h264')}
                  style={{
                    padding: '8px 10px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: codec === 'h264' ? 'var(--accent)' : 'transparent',
                    color: codec === 'h264' ? '#ffffff' : 'var(--text-muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  H.264 (Baseline)
                </button>
                <button
                  type="button"
                  onClick={() => handleCodecChange('h265')}
                  style={{
                    padding: '8px 10px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: codec === 'h265' ? 'var(--emerald)' : 'transparent',
                    color: codec === 'h265' ? '#ffffff' : 'var(--text-muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  H.265 / Smart Codec
                </button>
              </div>

              {/* Efficiency Multiplier Pills */}
              {codec === 'h265' ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                    <span>H.265 Efficiency Savings:</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[30, 40, 50].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleSavingsPctChange(pct)}
                          style={{
                            padding: '2px 8px',
                            fontSize: '0.72rem',
                            fontWeight: h265SavingsPct === pct ? 700 : 400,
                            borderRadius: '4px',
                            background: h265SavingsPct === pct ? 'var(--emerald)' : 'var(--bg)',
                            color: h265SavingsPct === pct ? '#ffffff' : 'var(--text-muted)',
                            border: '1px solid var(--border)',
                            cursor: 'pointer',
                          }}
                        >
                          {pct}% Savings
                        </button>
                      ))}
                    </div>
                  </div>
                  {calculations.tbSavedWithH265 > 0 && (
                    <div
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        color: 'var(--emerald)',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                      }}
                    >
                      💡 H.265 saves ~{calculations.tbSavedWithH265.toFixed(1)} TB of HDD storage over {calculations.safeDays} days compared to H.264!
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Switch to H.265 or Smart Codec to apply automatic 30–50% bitrate reduction multipliers.
                </p>
              )}
            </div>

            {/* Bitrate per camera */}
            <div className="form-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="mbps" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Bitrate per camera (Mbps)
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[1.5, 2.0, 2.5, 3.5, 5.0].map(mb => (
                    <button
                      key={mb}
                      type="button"
                      onClick={() => {
                        setBitrateMbps(mb);
                        setSelectedBrandPresetId('custom');
                      }}
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.7rem',
                        borderRadius: '4px',
                        background: bitrateMbps === mb ? 'var(--accent)' : 'var(--bg)',
                        color: bitrateMbps === mb ? '#ffffff' : 'var(--text-muted)',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                      title={`Set bitrate to ${mb} Mbps`}
                    >
                      {mb}M
                    </button>
                  ))}
                </div>
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
                  setSelectedBrandPresetId('custom');
                }}
              />
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {activePreset
                  ? `Populated from ${activePreset.brand} profile. Edit manually to match your camera's exact stream configuration.`
                  : "Presets are typical starting points. Read the actual figure from your camera's web page and type it in."}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                <label htmlFor="drv" style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>
                  Drive size (TB)
                </label>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Decimal TB (1 TB = 1,000 GB)
                </span>
              </div>

              {/* NVR / DVR Storage Capacity Presets */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                    Common NVR/DVR Storage Capacity Presets:
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--amber)', fontWeight: 600 }}>
                    Auto-fills drive size
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {[2, 4, 8, 12, 16, 18, 20, 24].map(sz => {
                    const isSelected = driveSizeTb === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setDriveSizeTb(sz)}
                        style={{
                          padding: '4px 9px',
                          fontSize: '0.78rem',
                          fontWeight: isSelected ? 800 : 600,
                          borderRadius: '6px',
                          background: isSelected ? 'var(--amber)' : 'var(--bg)',
                          color: isSelected ? '#ffffff' : 'var(--text-heading)',
                          border: isSelected ? '1px solid var(--amber)' : '1px solid var(--border)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 2px 6px rgba(245, 158, 11, 0.3)' : 'none',
                        }}
                        title={`Auto-fill ${sz} TB NVR/DVR hard drive capacity`}
                      >
                        {sz} TB
                      </button>
                    );
                  })}
                </div>
              </div>

              <input
                id="drv"
                type="number"
                step="0.5"
                min="0.5"
                max="50"
                value={driveSizeTb}
                onChange={e => setDriveSizeTb(Math.max(0.5, parseFloat(e.target.value) || 1))}
              />
              <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Click any NVR/DVR capacity preset above (2TB, 4TB, 8TB, 12TB, etc.) or type a custom disk capacity.
              </p>
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

            {/* Hard Drive Unit Price ($/TB) for Project Budgeting */}
            <div className="form-field" style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label htmlFor="price-tb" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Drive Price per TB ($)
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[20, 25, 30, 35].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPricePerTb(p)}
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.72rem',
                        borderRadius: '4px',
                        background: pricePerTb === p ? 'var(--emerald)' : 'var(--bg)',
                        color: pricePerTb === p ? '#ffffff' : 'var(--text-muted)',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    >
                      ${p}
                    </button>
                  ))}
                </div>
              </div>
              <input
                id="price-tb"
                type="number"
                step="1"
                min="0"
                max="500"
                value={pricePerTb}
                onChange={e => setPricePerTb(Math.max(0, parseFloat(e.target.value) || 0))}
              />
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Surveillance-rated HDDs (WD Purple Pro, Seagate SkyHawk AI) average $20–$35/TB.
              </p>
            </div>

            {/* Drive Workload Rating (TB/year) */}
            <div className="form-field" style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                <label htmlFor="tbw-rating" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Workload Rating (TB/year)
                </label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {[
                    { label: '55 TB/yr (Desktop)', val: 55 },
                    { label: '180 TB/yr (Standard)', val: 180 },
                    { label: '300 TB/yr (Commercial)', val: 300 },
                    { label: '550 TB/yr (Enterprise AI)', val: 550 },
                  ].map(w => (
                    <button
                      key={w.val}
                      type="button"
                      onClick={() => setDriveWorkloadRatingTbYr(w.val)}
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.7rem',
                        borderRadius: '4px',
                        background: driveWorkloadRatingTbYr === w.val ? 'var(--accent)' : 'var(--bg)',
                        color: driveWorkloadRatingTbYr === w.val ? '#ffffff' : 'var(--text-muted)',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        fontWeight: driveWorkloadRatingTbYr === w.val ? 700 : 400,
                      }}
                      title={w.label}
                    >
                      {w.val}TB
                    </button>
                  ))}
                </div>
              </div>
              <input
                id="tbw-rating"
                type="number"
                step="10"
                min="10"
                max="1000"
                value={driveWorkloadRatingTbYr}
                onChange={e => setDriveWorkloadRatingTbYr(Math.max(10, parseInt(e.target.value, 10) || 180))}
              />
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Standard surveillance drives = 180 TB/yr; Enterprise AI drives = 550 TB/yr.
              </p>
            </div>

            {/* Hard Drive Budget Callout Box */}
            {calculations.possible && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Hard Drive Project Cost
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--emerald)' }}>
                    ${calculations.totalHardDriveCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <div>{calculations.drivesNeeded} drives × ${calculations.costPerDrive.toFixed(0)}/disk</div>
                  <div>~${calculations.rawCostPerUsableTb.toFixed(1)}/usable TB</div>
                </div>
              </div>
            )}
          </div>

          {/* Multi-Tier Storage Architecture Module */}
          <div
            className="panel"
            style={{
              padding: '20px',
              background: 'var(--surface)',
              border: enableMultiTier ? '1px solid var(--emerald)' : '1px solid var(--border)',
              borderRadius: '14px',
              transition: 'border 0.2s ease',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: enableMultiTier ? '16px' : '0',
              }}
            >
              <h3
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--text-heading)',
                }}
              >
                <Layers className="w-5 h-5 text-emerald-400" />
                Multi-Tier Storage Architecture
              </h3>

              {/* Toggle Switch */}
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: enableMultiTier ? 'var(--emerald)' : 'var(--text-muted)',
                }}
              >
                <input
                  type="checkbox"
                  checked={enableMultiTier}
                  onChange={e => setEnableMultiTier(e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: 'var(--emerald)',
                    cursor: 'pointer',
                  }}
                />
                {enableMultiTier ? 'Multi-Tier Enabled' : 'Enable 2-Tier Storage'}
              </label>
            </div>

            {enableMultiTier && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Define a primary high-performance tier for immediate playback (e.g. 7 days full 4K) and offload remaining days to a secondary cold archive tier at reduced bitrate/sub-stream quality.
                </p>

                {/* Tier 1 Primary Days */}
                <div className="form-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label htmlFor="tier1-days" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                      Tier 1 Primary Retention (Days)
                    </label>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--emerald)' }}>
                      First {calculations.safeTier1Days} Days @ 100% Bitrate
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                    {[3, 7, 14, 30].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setTier1Days(d)}
                        style={{
                          padding: '2px 8px',
                          fontSize: '0.72rem',
                          borderRadius: '4px',
                          background: tier1Days === d ? 'var(--emerald)' : 'var(--bg)',
                          color: tier1Days === d ? '#ffffff' : 'var(--text-muted)',
                          border: '1px solid var(--border)',
                          cursor: 'pointer',
                          fontWeight: tier1Days === d ? 700 : 400,
                        }}
                      >
                        {d} Days
                      </button>
                    ))}
                  </div>
                  <input
                    id="tier1-days"
                    type="number"
                    min="1"
                    max={retentionDays}
                    value={tier1Days}
                    onChange={e => setTier1Days(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                </div>

                {/* Tier 2 Archive Bitrate % */}
                <div className="form-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label htmlFor="tier2-bitrate" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                      Tier 2 Archive Bitrate Scale (%)
                    </label>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8' }}>
                      {tier2BitratePct}% Quality ({calculations.tier2BitrateMbps.toFixed(2)} Mbps)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                    {[
                      { label: '30% Keyframe / Low FPS', val: 30 },
                      { label: '50% Sub-Stream', val: 50 },
                      { label: '75% Moderate VBR', val: 75 },
                      { label: '100% Full Mirror', val: 100 },
                    ].map(b => (
                      <button
                        key={b.val}
                        type="button"
                        onClick={() => setTier2BitratePct(b.val)}
                        style={{
                          padding: '2px 6px',
                          fontSize: '0.7rem',
                          borderRadius: '4px',
                          background: tier2BitratePct === b.val ? 'var(--accent)' : 'var(--bg)',
                          color: tier2BitratePct === b.val ? '#ffffff' : 'var(--text-muted)',
                          border: '1px solid var(--border)',
                          cursor: 'pointer',
                          fontWeight: tier2BitratePct === b.val ? 700 : 400,
                        }}
                        title={b.label}
                      >
                        {b.val}%
                      </button>
                    ))}
                  </div>
                  <input
                    id="tier2-bitrate"
                    type="number"
                    min="10"
                    max="100"
                    value={tier2BitratePct}
                    onChange={e => setTier2BitratePct(Math.min(100, Math.max(10, parseInt(e.target.value, 10) || 50)))}
                  />
                </div>

                {/* Tier 2 Drive Size & RAID */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="tier2-drv" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                      Tier 2 Drive Size (TB)
                    </label>
                    <select
                      id="tier2-drv"
                      value={tier2DriveSizeTb}
                      onChange={e => setTier2DriveSizeTb(parseFloat(e.target.value) || 16)}
                      style={{ fontSize: '0.82rem', padding: '6px' }}
                    >
                      {[8, 12, 16, 18, 20, 22, 24].map(sz => (
                        <option key={sz} value={sz}>{sz} TB Archive Disk</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="tier2-raid" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                      Tier 2 RAID Array
                    </label>
                    <select
                      id="tier2-raid"
                      value={tier2Raid}
                      onChange={e => setTier2Raid(e.target.value as RaidTypeKey)}
                      style={{ fontSize: '0.82rem', padding: '6px' }}
                    >
                      <option value="raid5">RAID 5</option>
                      <option value="raid6">RAID 6 (Dual Parity)</option>
                      <option value="none">JBOD Pool</option>
                    </select>
                  </div>
                </div>

                {/* Multi-Tier Summary Breakdown */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tier 1 (First {calculations.safeTier1Days}d Hot):</span>
                    <strong>{calculations.tier1NeedTb.toFixed(1)} TB ({calculations.tier1DrivesNeeded} × {calculations.safeDriveTb}TB drives)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tier 2 (Days {calculations.safeTier1Days + 1}–{calculations.safeDays} Cold):</span>
                    <strong>{calculations.tier2NeedTb.toFixed(1)} TB ({calculations.tier2DrivesNeeded} × {calculations.tier2DriveSizeTb}TB drives)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                    <span style={{ fontWeight: 700 }}>Total Multi-Tier Storage Needed:</span>
                    <strong style={{ color: 'var(--emerald)' }}>{calculations.combinedMultiTierStorageTb.toFixed(1)} TB ({calculations.combinedMultiTierDrives} Disks)</strong>
                  </div>
                  {calculations.multiTierCostSavingsDollar > 0 && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--emerald)', fontWeight: 700, marginTop: '2px' }}>
                      💡 Multi-Tier architecture saves ~{calculations.multiTierStorageSavingsTb.toFixed(1)} TB of storage (${calculations.multiTierCostSavingsDollar.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} hard drive BOM savings vs single tier)!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Optional Off-Site Cloud Backup Estimation Module */}
          <div
            className="panel"
            style={{
              padding: '20px',
              background: 'var(--surface)',
              border: enableCloudBackup ? '1px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: '14px',
              transition: 'border 0.2s ease',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: enableCloudBackup ? '16px' : '0',
              }}
            >
              <h3
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--text-heading)',
                }}
              >
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Optional Cloud Backup Estimation
              </h3>

              {/* Toggle Switch */}
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: enableCloudBackup ? 'var(--brand)' : 'var(--text-muted)',
                }}
              >
                <input
                  type="checkbox"
                  checked={enableCloudBackup}
                  onChange={e => setEnableCloudBackup(e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: 'var(--accent)',
                    cursor: 'pointer',
                  }}
                />
                {enableCloudBackup ? 'Cloud Backup Enabled' : 'Enable Off-Site Cloud'}
              </label>
            </div>

            {enableCloudBackup && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Cloud Price per TB/month */}
                <div className="form-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                    <label htmlFor="cloud-price" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                      Cloud Storage Price ($/TB/month)
                    </label>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {[
                        { label: '$6 Wasabi / B2', val: 6 },
                        { label: '$15 Standard Object', val: 15 },
                        { label: '$25 AWS S3 / Azure', val: 25 },
                      ].map(cp => (
                        <button
                          key={cp.val}
                          type="button"
                          onClick={() => setCloudPricePerTbMonth(cp.val)}
                          style={{
                            padding: '2px 6px',
                            fontSize: '0.7rem',
                            borderRadius: '4px',
                            background: cloudPricePerTbMonth === cp.val ? 'var(--accent)' : 'var(--bg)',
                            color: cloudPricePerTbMonth === cp.val ? '#ffffff' : 'var(--text-muted)',
                            border: '1px solid var(--border)',
                            cursor: 'pointer',
                            fontWeight: cloudPricePerTbMonth === cp.val ? 700 : 400,
                          }}
                          title={cp.label}
                        >
                          ${cp.val}/mo
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    id="cloud-price"
                    type="number"
                    step="0.5"
                    min="0"
                    max="200"
                    value={cloudPricePerTbMonth}
                    onChange={e => setCloudPricePerTbMonth(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Wasabi/Backblaze B2 ≈ $6/TB/mo; AWS S3 Standard ≈ $23/TB/mo.
                  </p>
                </div>

                {/* Off-Site Scope / Stream Coverage % */}
                <div className="form-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label htmlFor="cloud-scope" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                      Cloud Backup Stream Scope (%)
                    </label>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent)' }}>
                      {cloudBackupScopePct}% Streams
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                    {[25, 50, 75, 100].map(sc => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => setCloudBackupScopePct(sc)}
                        style={{
                          padding: '2px 8px',
                          fontSize: '0.72rem',
                          borderRadius: '4px',
                          background: cloudBackupScopePct === sc ? 'var(--accent)' : 'var(--bg)',
                          color: cloudBackupScopePct === sc ? '#ffffff' : 'var(--text-muted)',
                          border: '1px solid var(--border)',
                          cursor: 'pointer',
                          fontWeight: cloudBackupScopePct === sc ? 700 : 400,
                        }}
                      >
                        {sc}% {sc === 25 ? '(Critical Only)' : sc === 100 ? '(Full Duplicate)' : ''}
                      </button>
                    ))}
                  </div>
                  <input
                    id="cloud-scope"
                    type="number"
                    min="1"
                    max="100"
                    value={cloudBackupScopePct}
                    onChange={e => setCloudBackupScopePct(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 100)))}
                  />
                </div>

                {/* Off-Site Cloud Cost Projections */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Off-Site Cloud Capacity ({calculations.safeDays}d):</span>
                    <strong style={{ color: 'var(--text-heading)' }}>{calculations.cloudStorageTb.toFixed(1)} TB</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Monthly Cloud Storage Bill:</span>
                    <strong style={{ color: 'var(--brand)', fontSize: '1.05rem' }}>
                      ${calculations.monthlyCloudCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mo
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Annual Cloud Subscription:</span>
                    <strong style={{ color: 'var(--text-heading)' }}>
                      ${calculations.annualCloudCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} / yr
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Min. Upload Internet Pipe:</span>
                    <strong style={{ color: 'var(--emerald)' }}>
                      {calculations.requiredUploadBandwidthMbps.toFixed(1)} Mbps Continuous
                    </strong>
                  </div>
                </div>
              </div>
            )}
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

              {/* Hardware & Budget Summary Cards */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {/* Hardware Recommendation Card */}
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    textAlign: 'right',
                    minWidth: '160px',
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

                {/* Hard Drive Budget Card */}
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    textAlign: 'right',
                    minWidth: '160px',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    HARD DRIVE BUDGET
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--emerald)', margin: '4px 0' }}>
                    {calculations.possible ? (
                      `$${calculations.totalHardDriveCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                    ) : (
                      'N/A'
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {calculations.possible ? (
                      `@ $${calculations.safePricePerTb}/TB (${calculations.drivesNeeded} × ${calculations.safeDriveTb}TB)`
                    ) : (
                      'Adjust drive setup'
                    )}
                  </div>
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

          {/* Estimated Drive Lifespan & Mechanical Workload Reliability */}
          <div
            className="panel"
            style={{
              padding: '20px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <h4
                style={{
                  fontSize: '0.98rem',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-heading)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <HardDrive className="w-4 h-4 text-emerald-400" />
                Drive Expected Lifespan &amp; Workload Reliability
              </h4>

              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background:
                    calculations.workloadStatus === 'Overworked'
                      ? 'rgba(239, 68, 68, 0.15)'
                      : calculations.workloadStatus === 'Heavy'
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(16, 185, 129, 0.15)',
                  color:
                    calculations.workloadStatus === 'Overworked'
                      ? 'var(--rose)'
                      : calculations.workloadStatus === 'Heavy'
                      ? 'var(--amber)'
                      : 'var(--emerald)',
                  border: `1px solid ${
                    calculations.workloadStatus === 'Overworked'
                      ? 'var(--rose)'
                      : calculations.workloadStatus === 'Heavy'
                      ? 'var(--amber)'
                      : 'var(--emerald)'
                  }`,
                }}
              >
                {calculations.workloadStatus} Workload ({calculations.workloadPct.toFixed(0)}% of TBW limit)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center mb-3">
              {/* Estimated Lifespan Hero Stat */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Estimated Drive Lifespan
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--emerald)', lineHeight: 1.1 }}>
                  {calculations.estimatedLifespanYears.toFixed(1)} Years
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  ~{calculations.estimatedLifespanMonths} Months estimated write operation
                </div>
              </div>

              {/* Workload Rates Summary */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  fontSize: '0.82rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Daily System Ingestion:</span>
                  <strong style={{ color: 'var(--text-heading)' }}>{calculations.totalDailyTb.toFixed(2)} TB/day</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Write Rate per Disk:</span>
                  <strong style={{ color: '#38bdf8' }}>{calculations.dailyTbPerDrive.toFixed(2)} TB/day/disk</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Annual Disk Workload:</span>
                  <strong style={{ color: 'var(--text-heading)' }}>{calculations.annualTbPerDrive.toFixed(1)} TB/year</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Drive Rated Limit:</span>
                  <strong style={{ color: 'var(--emerald)' }}>{calculations.safeTbwRating} TB/year</strong>
                </div>
              </div>
            </div>

            {/* Assessment Note */}
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {calculations.workloadStatus === 'Overworked'
                ? `⚠️ High Risk: At ${calculations.annualTbPerDrive.toFixed(1)} TB/yr write rate per drive, the workload exceeds the ${calculations.safeTbwRating} TB/yr rated limit. Consider upgrading to Enterprise/AI Surveillance drives (550 TB/yr) or adding more drives to prevent accelerated mechanical wear.`
                : calculations.workloadStatus === 'Heavy'
                ? `⚠️ Moderate Risk: Drives operate near their maximum ${calculations.safeTbwRating} TB/yr workload limit. Expected lifespan is ~${calculations.estimatedLifespanYears.toFixed(1)} years.`
                : `✅ Low Risk: Drives operate well within their ${calculations.safeTbwRating} TB/yr rated limit (${calculations.workloadPct.toFixed(0)}% utilization), ensuring reliable write operation across the standard 3 to 5 year warranty period.`}
            </p>
          </div>

          {/* D3.js Circular Storage Progress Gauge */}
          <div
            className="panel"
            style={{
              padding: '20px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <h4
                style={{
                  fontSize: '0.98rem',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-heading)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Sliders className="w-4 h-4 text-sky-400" />
                D3.js Storage Gauge vs Configured Drive Limit
              </h4>
              <span
                className="pill"
                style={{
                  fontSize: '0.72rem',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  fontWeight: 700,
                }}
              >
                D3.js Arc Visualization
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-5" style={{ display: 'flex', justifyContent: 'center' }}>
                <D3StorageGauge
                  neededTb={calculations.totalNeedTb}
                  usableTb={calculations.usableStorageTb}
                />
              </div>

              <div className="sm:col-span-7" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--bg)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>Footage Needed (incl. Headroom):</span>
                  <strong style={{ color: 'var(--text-heading)' }}>{calculations.totalNeedTb.toFixed(2)} TB</strong>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--bg)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>Array Usable Storage Provided:</span>
                  <strong style={{ color: 'var(--emerald)' }}>{calculations.usableStorageTb.toFixed(2)} TB Usable</strong>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--bg)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>RAID Drive Allocation:</span>
                  <strong style={{ color: 'var(--amber)' }}>
                    {calculations.drivesNeeded} × {calculations.safeDriveTb} TB ({RAID_DEFINITIONS[raidType].label.split(' ')[0]})
                  </strong>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: calculations.totalNeedTb > calculations.usableStorageTb ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                    borderRadius: '8px',
                    border: `1px solid ${calculations.totalNeedTb > calculations.usableStorageTb ? 'var(--rose)' : 'var(--emerald)'}`,
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>Capacity Feasibility Status:</span>
                  <strong style={{ color: calculations.totalNeedTb > calculations.usableStorageTb ? 'var(--rose)' : 'var(--emerald)' }}>
                    {calculations.totalNeedTb > calculations.usableStorageTb
                      ? `OVER CAPACITY (${(calculations.totalNeedTb - calculations.usableStorageTb).toFixed(1)} TB DEFICIT)`
                      : `CAPACITY OK (${(calculations.usableStorageTb - calculations.totalNeedTb).toFixed(1)} TB SURPLUS)`}
                  </strong>
                </div>
              </div>
            </div>
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

      {/* Storage & Bandwidth Activity Heatmap Panel */}
      <StorageHeatmap
        cameras={calculations.safeCams}
        baseBitrateMbps={calculations.safeMbps}
        recordingPct={calculations.safeRec}
        codec={codec}
        theme={theme}
        onApplyDutyCycle={(pct) => setRecordingPct(pct)}
      />

      {/* Dynamic Storage Optimization Tips Panel */}
      <div
        className="panel"
        style={{
          padding: '24px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          marginBottom: '32px',
        }}
      >
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
                fontSize: '1.2rem',
                fontWeight: 800,
                margin: '0 0 4px',
                color: 'var(--text-heading)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Sparkles className="w-5 h-5 text-amber-400" />
              Dynamic Storage Optimization Tips
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Tailored engineering recommendations to reduce disk capacity demands and optimize drive array costs based on your current inputs.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              className="pill"
              style={{
                fontSize: '0.78rem',
                padding: '4px 10px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--amber)',
                fontWeight: 700,
                borderRadius: '6px',
              }}
            >
              ⚡ {optimizationTips.length} Active Tips
            </span>
          </div>
        </div>

        {/* Tip Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {optimizationTips.map(tip => {
            let impactBg = 'rgba(56, 189, 248, 0.12)';
            let impactColor = 'var(--brand)';
            let impactBorder = 'rgba(56, 189, 248, 0.3)';

            if (tip.impactLevel === 'High') {
              impactBg = 'rgba(16, 185, 129, 0.12)';
              impactColor = 'var(--emerald)';
              impactBorder = 'rgba(16, 185, 129, 0.3)';
            } else if (tip.impactLevel === 'Informational') {
              impactBg = 'rgba(168, 85, 247, 0.12)';
              impactColor = '#c084fc';
              impactBorder = 'rgba(168, 85, 247, 0.3)';
            }

            return (
              <div
                key={tip.id}
                style={{
                  padding: '16px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {tip.category}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: impactBg,
                        color: impactColor,
                        border: `1px solid ${impactBorder}`,
                      }}
                    >
                      {tip.impactLevel} Impact
                    </span>
                  </div>

                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-heading)' }}>
                    {tip.title}
                  </h4>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
                    {tip.description}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border)',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--emerald)' }}>
                    💡 {tip.potentialSavings}
                  </span>

                  {tip.actionButtonLabel && tip.onApplyAction && (
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={tip.onApplyAction}
                      style={{
                        fontSize: '0.75rem',
                        padding: '4px 10px',
                        borderRadius: '6px',
                      }}
                    >
                      {tip.actionButtonLabel}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Side-by-Side RAID Level Comparison Table */}
      <div className="panel" style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers className="w-5 h-5 text-sky-400" />
              Side-by-Side RAID Level Comparison for {calculations.totalNeedTb.toFixed(1)} TB Target
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Compare drive requirements, usable storage, and parity redundancy across all standard RAID levels using {calculations.safeDriveTb} TB drives.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="button button-secondary no-print"
              onClick={handleExportPdf}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
              title="Export complete technical calculation report as a clean PDF"
            >
              {exportedPdf ? <Check className="w-4 h-4 text-emerald-400" /> : <FileText className="w-4 h-4 text-rose-400" />}
              {exportedPdf ? 'Exported PDF!' : 'Export PDF Report'}
            </button>
            <button
              type="button"
              className="button button-secondary no-print"
              onClick={handleExportCsv}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
              title="Export all data and RAID comparison matrix to CSV"
            >
              {exportedCsv ? <Check className="w-4 h-4 text-emerald-400" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
              {exportedCsv ? 'Exported CSV!' : 'Export CSV Matrix'}
            </button>
          </div>
        </div>

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
