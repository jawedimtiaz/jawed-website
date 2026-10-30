import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import { AdUnitPlaceholder } from '../components/AdUnitPlaceholder';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';
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
  DollarSign,
  Package,
  Download,
  X,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as d3 from 'd3';

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

// -------------------------------------------------------------
// VENDOR PROFILES & HARDWARE POLICIES
// -------------------------------------------------------------
export type NetworkVendor = 'cisco' | 'ubiquiti' | 'aruba' | 'netgear' | 'mikrotik' | 'generic';

export interface VendorProfile {
  id: NetworkVendor;
  name: string;
  shortName: string;
  badgeColor: string;
  poeReservationPolicy: 'class-max' | 'lldp-dynamic' | 'hybrid';
  backplaneMultiplierGbps: number;
  defaultPoeVoltageV: number;
  maxSwitchPortWatts: number;
  backplaneCapacityNote: string;
  featuresNote: string;
  recommendedPolicy: string;
}

export const VENDOR_PROFILES: Record<NetworkVendor, VendorProfile> = {
  cisco: {
    id: 'cisco',
    name: 'Cisco Catalyst / Meraki',
    shortName: 'Cisco',
    badgeColor: '#00bceb',
    poeReservationPolicy: 'lldp-dynamic',
    backplaneMultiplierGbps: 2.0,
    defaultPoeVoltageV: 54.0,
    maxSwitchPortWatts: 90,
    backplaneCapacityNote: 'Line-rate non-blocking switching fabric (100% full-duplex backplane bandwidth across all ports).',
    featuresNote: 'Supports CDP / LLDP-MED dynamic power negotiation, UPOE/UPOE+ (60W/90W), and per-port priority policing.',
    recommendedPolicy: 'Dynamic LLDP-MED Allocation active. Reduces reserved PoE budget overhead by ~15-20% based on real-time hardware telemetry.',
  },
  ubiquiti: {
    id: 'ubiquiti',
    name: 'Ubiquiti UniFi / EdgeSwitch',
    shortName: 'Ubiquiti',
    badgeColor: '#006fff',
    poeReservationPolicy: 'class-max',
    backplaneMultiplierGbps: 2.0,
    defaultPoeVoltageV: 50.0,
    maxSwitchPortWatts: 60,
    backplaneCapacityNote: 'UniFi non-blocking throughput matching total active port throughput across all RJ45 ports.',
    featuresNote: 'Strict class-based power allocation with UniFi OS Network Controller port visualizer and 24V passive options.',
    recommendedPolicy: 'Class-based maximum power allocation enforced. Plan switch power capacity against total class upper limits.',
  },
  aruba: {
    id: 'aruba',
    name: 'Aruba / HPE Networking CX',
    shortName: 'Aruba',
    badgeColor: '#ff8300',
    poeReservationPolicy: 'lldp-dynamic',
    backplaneMultiplierGbps: 2.0,
    defaultPoeVoltageV: 54.0,
    maxSwitchPortWatts: 90,
    backplaneCapacityNote: 'High-speed Aruba ASIC switching architecture supporting SmartRate multi-gigabit non-blocking backplane.',
    featuresNote: 'SmartRate multi-gigabit auto-tuning (1G/2.5G/5G/10G) with 0.1W precision LLDP power allocation.',
    recommendedPolicy: 'Aruba SmartRate dynamic allocation optimizes PoE headroom for high-density Wi-Fi 6E/7 AP deployments.',
  },
  netgear: {
    id: 'netgear',
    name: 'Netgear ProAV / Business M4200',
    shortName: 'Netgear',
    badgeColor: '#e50012',
    poeReservationPolicy: 'class-max',
    backplaneMultiplierGbps: 2.0,
    defaultPoeVoltageV: 52.0,
    maxSwitchPortWatts: 90,
    backplaneCapacityNote: 'Full wire-speed non-blocking fabric tailored for NDI / Dante uncompressed IP video streaming.',
    featuresNote: 'Static class allocation with optional EPS (External Power Supply) expansion module support for ProAV setups.',
    recommendedPolicy: 'Static Class Allocation. Attach an EPS expansion power supply module if total PoE draw exceeds switch base PSU.',
  },
  mikrotik: {
    id: 'mikrotik',
    name: 'MikroTik RouterBOARD / CRS',
    shortName: 'MikroTik',
    badgeColor: '#e03a3e',
    poeReservationPolicy: 'hybrid',
    backplaneMultiplierGbps: 2.0,
    defaultPoeVoltageV: 48.0,
    maxSwitchPortWatts: 30,
    backplaneCapacityNote: 'Marvell / Realtek switch chip hardware offloading for full wire-speed Layer-2 forwarding.',
    featuresNote: 'Active 802.3af/at & Passive PoE auto-detect with RouterOS per-port current telemetry and thermal cutoff.',
    recommendedPolicy: 'Auto-detect active/passive PoE. Check RouterOS current telemetry under high ambient bundle temperatures.',
  },
  generic: {
    id: 'generic',
    name: 'Generic / Unmanaged Switch',
    shortName: 'Generic',
    badgeColor: '#64748b',
    poeReservationPolicy: 'class-max',
    backplaneMultiplierGbps: 2.0,
    defaultPoeVoltageV: 48.0,
    maxSwitchPortWatts: 30,
    backplaneCapacityNote: 'Standard unmanaged shared memory buffer switching matrix.',
    featuresNote: 'Standard IEEE 802.3af/at class-based worst-case power reservation without dynamic negotiation.',
    recommendedPolicy: 'Standard IEEE Class Reservation. Maintain a 20% headroom safety buffer for IR illuminator night spikes.',
  },
};

// -------------------------------------------------------------
// ENTERPRISE NETWORK SWITCH SERIES CATALOG & SPECS
// -------------------------------------------------------------
export interface SwitchSeriesModel {
  id: string;
  vendorId: NetworkVendor;
  vendorName: string;
  seriesName: string;
  modelCode: string;
  portsCount: number;
  poeBudgetWatts: number;
  hasSecondaryPsuOption?: boolean;
  poeBudgetWithSecondaryPsuWatts?: number;
  secondaryPsuNote?: string;
  maxPortWatts: number;
  supportedStandards: PoeStandardId[];
  defaultPoEVoltageV: number;
  backplaneGbps: number;
  poePolicy: 'class-max' | 'lldp-dynamic' | 'hybrid';
  officialDatasheetNote: string;
}

export const SWITCH_SERIES_MODELS: SwitchSeriesModel[] = [
  // Cisco Catalyst & Meraki
  {
    id: 'cisco-cat-9300-48u',
    vendorId: 'cisco',
    vendorName: 'Cisco Catalyst',
    seriesName: 'Cisco Catalyst 9300 Series (C9300-48U)',
    modelCode: 'C9300-48U (48-Port UPOE 60W)',
    portsCount: 48,
    poeBudgetWatts: 822,
    hasSecondaryPsuOption: true,
    poeBudgetWithSecondaryPsuWatts: 1440,
    secondaryPsuNote: 'Dual 1100W AC PSUs boost available PoE allocation to full 1440W',
    maxPortWatts: 60,
    supportedStandards: ['802.3af', '802.3at', '802.3bt-type3'],
    defaultPoEVoltageV: 54.0,
    backplaneGbps: 128,
    poePolicy: 'lldp-dynamic',
    officialDatasheetNote: 'Cisco UPOE 60W per port with dynamic CDP/LLDP-MED power negotiation and StackPower supply sharing.',
  },
  {
    id: 'cisco-cat-9300x-48h',
    vendorId: 'cisco',
    vendorName: 'Cisco Catalyst',
    seriesName: 'Cisco Catalyst 9300X Series (C9300X-48H)',
    modelCode: 'C9300X-48H (48-Port UPOE+ 90W)',
    portsCount: 48,
    poeBudgetWatts: 900,
    hasSecondaryPsuOption: true,
    poeBudgetWithSecondaryPsuWatts: 1440,
    secondaryPsuNote: 'Dual 1900W AC PSUs deliver 1440W budget across high-density 90W ports',
    maxPortWatts: 90,
    supportedStandards: ['802.3af', '802.3at', '802.3bt-type3', '802.3bt-type4'],
    defaultPoEVoltageV: 54.0,
    backplaneGbps: 256,
    poePolicy: 'lldp-dynamic',
    officialDatasheetNote: 'IEEE 802.3bt Type 4 90W UPOE+ with line-rate multi-gigabit uplinks and perpetual PoE.',
  },
  {
    id: 'cisco-cat-9200-24p',
    vendorId: 'cisco',
    vendorName: 'Cisco Catalyst',
    seriesName: 'Cisco Catalyst 9200 Series (C9200-24P)',
    modelCode: 'C9200-24P (24-Port PoE+ 30W)',
    portsCount: 24,
    poeBudgetWatts: 370,
    hasSecondaryPsuOption: false,
    maxPortWatts: 30,
    supportedStandards: ['802.3af', '802.3at'],
    defaultPoEVoltageV: 54.0,
    backplaneGbps: 56,
    poePolicy: 'lldp-dynamic',
    officialDatasheetNote: 'Enterprise branch access switch delivering 370W full PoE+ across 24 1G ports.',
  },
  {
    id: 'cisco-meraki-ms225-24p',
    vendorId: 'cisco',
    vendorName: 'Cisco Meraki',
    seriesName: 'Cisco Meraki MS225 Series (MS225-24P)',
    modelCode: 'MS225-24P (24-Port Cloud PoE+)',
    portsCount: 24,
    poeBudgetWatts: 370,
    hasSecondaryPsuOption: false,
    maxPortWatts: 30,
    supportedStandards: ['802.3af', '802.3at'],
    defaultPoEVoltageV: 54.0,
    backplaneGbps: 56,
    poePolicy: 'lldp-dynamic',
    officialDatasheetNote: 'Cloud-managed 24-port PoE+ access switch with 370W dedicated power budget.',
  },

  // Aruba / HPE
  {
    id: 'aruba-cx-6300m-48p',
    vendorId: 'aruba',
    vendorName: 'Aruba / HPE Networking CX',
    seriesName: 'Aruba CX 6300M Series (JL659A)',
    modelCode: 'JL659A (48-Port SmartRate Class 8 90W)',
    portsCount: 48,
    poeBudgetWatts: 740,
    hasSecondaryPsuOption: true,
    poeBudgetWithSecondaryPsuWatts: 1440,
    secondaryPsuNote: 'Dual 1050W PSUs unlock 1440W Class 8 PoE++ capacity',
    maxPortWatts: 90,
    supportedStandards: ['802.3af', '802.3at', '802.3bt-type3', '802.3bt-type4'],
    defaultPoEVoltageV: 54.0,
    backplaneGbps: 176,
    poePolicy: 'lldp-dynamic',
    officialDatasheetNote: 'SmartRate multi-gigabit (1G/2.5G/5G) with IEEE 802.3bt Class 8 90W PoE allocation.',
  },
  {
    id: 'aruba-cx-6200f-24p',
    vendorId: 'aruba',
    vendorName: 'Aruba / HPE Networking CX',
    seriesName: 'Aruba CX 6200F Series (JL725A)',
    modelCode: 'JL725A (24-Port Class 4 PoE+ 30W)',
    portsCount: 24,
    poeBudgetWatts: 370,
    hasSecondaryPsuOption: false,
    maxPortWatts: 30,
    supportedStandards: ['802.3af', '802.3at'],
    defaultPoEVoltageV: 54.0,
    backplaneGbps: 128,
    poePolicy: 'lldp-dynamic',
    officialDatasheetNote: 'Fixed configuration 24-port Class 4 PoE+ access switch with 370W total budget.',
  },

  // Ubiquiti Networks
  {
    id: 'ubiquiti-pro-max-48',
    vendorId: 'ubiquiti',
    vendorName: 'Ubiquiti UniFi',
    seriesName: 'Ubiquiti UniFi Pro Max 48 PoE',
    modelCode: 'USW-Pro-Max-48-PoE (16x PoE++ 60W + 32x PoE+)',
    portsCount: 48,
    poeBudgetWatts: 720,
    hasSecondaryPsuOption: false,
    maxPortWatts: 60,
    supportedStandards: ['802.3af', '802.3at', '802.3bt-type3'],
    defaultPoEVoltageV: 50.0,
    backplaneGbps: 224,
    poePolicy: 'class-max',
    officialDatasheetNote: '48-port switch with 16 2.5G PoE++ 60W ports, Etherlighting visualizers, and 720W total budget.',
  },
  {
    id: 'ubiquiti-ent-24-poe',
    vendorId: 'ubiquiti',
    vendorName: 'Ubiquiti UniFi',
    seriesName: 'Ubiquiti UniFi Enterprise 24 PoE',
    modelCode: 'SWITCH-ENTERPRISE-24-POE (12x 2.5G PoE+ + 12x 1G PoE+)',
    portsCount: 24,
    poeBudgetWatts: 400,
    hasSecondaryPsuOption: false,
    maxPortWatts: 30,
    supportedStandards: ['802.3af', '802.3at'],
    defaultPoEVoltageV: 50.0,
    backplaneGbps: 124,
    poePolicy: 'class-max',
    officialDatasheetNote: 'Layer 3 switch with 12 2.5G ports, 12 1G ports, and 400W total PoE availability.',
  },

  // Netgear ProAV / Business
  {
    id: 'netgear-m4300-52g',
    vendorId: 'netgear',
    vendorName: 'Netgear ProAV',
    seriesName: 'Netgear ProAV M4300 Series (GSM4352PB)',
    modelCode: 'GSM4352PB (48-Port PoE+ 30W)',
    portsCount: 48,
    poeBudgetWatts: 860,
    hasSecondaryPsuOption: true,
    poeBudgetWithSecondaryPsuWatts: 1440,
    secondaryPsuNote: 'External Power Supply (EPS) expands total PoE budget to 1440W for AV over IP',
    maxPortWatts: 30,
    supportedStandards: ['802.3af', '802.3at'],
    defaultPoEVoltageV: 52.0,
    backplaneGbps: 104,
    poePolicy: 'class-max',
    officialDatasheetNote: 'Full wire-speed stackable switch optimized for Dante, NDI, and SDVoE AV over IP streaming.',
  },
  {
    id: 'netgear-m4250-12m2xf',
    vendorId: 'netgear',
    vendorName: 'Netgear ProAV',
    seriesName: 'Netgear AV Line M4250 Series (GSM4212UX)',
    modelCode: 'GSM4212UX (8x Ultra90 802.3bt 90W + 2x PoE+)',
    portsCount: 12,
    poeBudgetWatts: 720,
    hasSecondaryPsuOption: false,
    maxPortWatts: 90,
    supportedStandards: ['802.3af', '802.3at', '802.3bt-type3', '802.3bt-type4'],
    defaultPoEVoltageV: 52.0,
    backplaneGbps: 80,
    poePolicy: 'class-max',
    officialDatasheetNote: 'AV Line 8x 2.5G Ultra90 90W PoE++ ports with 720W power budget for high-power PTZ cameras.',
  },

  // MikroTik
  {
    id: 'mikrotik-crs328-24p',
    vendorId: 'mikrotik',
    vendorName: 'MikroTik',
    seriesName: 'MikroTik CRS328 Series (CRS328-24P-4S+RM)',
    modelCode: 'CRS328-24P-4S+RM (24-Port Active/Passive PoE)',
    portsCount: 24,
    poeBudgetWatts: 450,
    hasSecondaryPsuOption: false,
    maxPortWatts: 30,
    supportedStandards: ['802.3af', '802.3at'],
    defaultPoEVoltageV: 48.0,
    backplaneGbps: 128,
    poePolicy: 'hybrid',
    officialDatasheetNote: '24 Independent 802.3af/at & 24V Passive PoE output ports with 450W power supply.',
  },

  // Generic / Custom
  {
    id: 'generic-custom',
    vendorId: 'generic',
    vendorName: 'Custom / Generic',
    seriesName: 'Custom Enterprise Switch Model',
    modelCode: 'Custom User Configured',
    portsCount: 16,
    poeBudgetWatts: 240,
    hasSecondaryPsuOption: false,
    maxPortWatts: 30,
    supportedStandards: ['802.3af', '802.3at'],
    defaultPoEVoltageV: 48.0,
    backplaneGbps: 32,
    poePolicy: 'class-max',
    officialDatasheetNote: 'Standard unmanaged or managed switch with manual budget and port inputs.',
  },
];

// -------------------------------------------------------------
// CONDUCTOR MATERIAL & TEMPERATURE DEGRADATION SPECS
// -------------------------------------------------------------
export type ConductorType = 'solid-copper' | 'cca' | 'stranded-copper';

export interface ConductorSpec {
  id: ConductorType;
  name: string;
  shortName: string;
  material: string;
  resistanceMultiplier: number;
  attenuationMultiplier: number;
  baseReturnLossDb: number;
  typicalImpedanceShiftOhms: number;
  tiaCompliant: boolean;
  poeFireRiskLevel: 'none' | 'moderate' | 'extreme';
  description: string;
  badgeBg: string;
  badgeColor: string;
}

export const CONDUCTOR_SPECS: Record<ConductorType, ConductorSpec> = {
  'solid-copper': {
    id: 'solid-copper',
    name: 'Solid Bare Copper (100% Pure)',
    shortName: 'Solid Copper',
    material: 'Pure Annealed Copper Wire',
    resistanceMultiplier: 1.0,
    attenuationMultiplier: 1.0,
    baseReturnLossDb: 25.0,
    typicalImpedanceShiftOhms: 0,
    tiaCompliant: true,
    poeFireRiskLevel: 'none',
    description: 'Fully compliant with ANSI/TIA-568.2-D and ISO/IEC 11801. Lowest DC loop resistance, optimal for PoE+ and PoE++ high-power delivery.',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    badgeColor: '#10b981',
  },
  'cca': {
    id: 'cca',
    name: 'CCA (Copper-Clad Aluminum)',
    shortName: 'CCA (Aluminum)',
    material: 'Aluminum Core with Thin Copper Cladding (~10% Cu)',
    resistanceMultiplier: 1.65,
    attenuationMultiplier: 1.18,
    baseReturnLossDb: 15.2,
    typicalImpedanceShiftOhms: 14.5,
    tiaCompliant: false,
    poeFireRiskLevel: 'extreme',
    description: 'NON-TIA COMPLIANT. Aluminum core causes ~65% higher DC loop resistance, dangerous I²R cable heating under PoE, and high bit-error rate.',
    badgeBg: 'rgba(244, 63, 94, 0.15)',
    badgeColor: '#f43f5e',
  },
  'stranded-copper': {
    id: 'stranded-copper',
    name: 'Stranded Copper Patch Wire',
    shortName: 'Stranded Patch',
    material: 'Multi-strand Flexible Copper',
    resistanceMultiplier: 1.15,
    attenuationMultiplier: 1.20,
    baseReturnLossDb: 21.0,
    typicalImpedanceShiftOhms: 4.0,
    tiaCompliant: true,
    poeFireRiskLevel: 'moderate',
    description: 'High-flexibility wire designed strictly for short patch cords (<10 m). High attenuation rate makes it unsuitable for long wall runs.',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeColor: '#f59e0b',
  },
};

export const TEMP_PRESETS = [
  { label: 'Server Room', tempC: 18, desc: '64°F · Air Conditioned' },
  { label: 'Indoor Office', tempC: 20, desc: '68°F · Standard TIA Ref' },
  { label: 'Factory / Warehouse', tempC: 35, desc: '95°F · Industrial Ambient' },
  { label: 'Hot Attic / Conduit', tempC: 50, desc: '122°F · Elevated Thermal' },
  { label: 'Extreme Roof / Boiler', tempC: 65, desc: '149°F · Severe Heat' },
];

// -------------------------------------------------------------
// ETHERNET CABLE STANDARDS COMPARISON GUIDES
// -------------------------------------------------------------
export interface CableTypeGuide {
  category: CableCategory;
  title: string;
  classStandard: string;
  maxFreqMHz: number;
  max100mSpeed: string;
  tenGDistanceLimit: string;
  awgGauge: string;
  shieldingType: string;
  internalConstruction: string;
  alienCrosstalkRating: 'Poor' | 'Moderate' | 'Excellent' | 'Maximum Shielded';
  poeSuitability: string;
  recommendedFor: string;
  avgCostPerMeter: string;
  keyAdvantages: string[];
  limitations: string[];
}

export const CABLE_TYPE_GUIDES: Record<CableCategory, CableTypeGuide> = {
  Cat5e: {
    category: 'Cat5e',
    title: 'Category 5 Enhanced',
    classStandard: 'ANSI/TIA-568-C.2 Class D',
    maxFreqMHz: 100,
    max100mSpeed: '1 Gbps (or 2.5 Gbps NBASE-T)',
    tenGDistanceLimit: 'Not Supported (0 m)',
    awgGauge: '24 AWG Solid / Stranded',
    shieldingType: 'UTP (Unshielded Twisted Pair)',
    internalConstruction: '4 unshielded twisted pairs without internal spline',
    alienCrosstalkRating: 'Poor',
    poeSuitability: 'Suitable for basic PoE (15.4W) & PoE+ (30W) on short runs',
    recommendedFor: 'Legacy VoIP phones, basic IP dome cameras, desktop PCs',
    avgCostPerMeter: '$0.25 - $0.35 / m',
    keyAdvantages: [
      'Lowest cable material cost & thinnest outer diameter',
      'Extremely flexible, easy to pull through tight wall conduits',
      'Supports 1 Gbps up to 100 meters full channel',
    ],
    limitations: [
      'Unrated for 10GBASE-T or 5GBASE-T speeds',
      'Higher DC resistance causes greater PoE voltage drop on long runs',
      'No internal separator leads to pair-to-pair crosstalk at higher MHz',
    ],
  },
  Cat6: {
    category: 'Cat6',
    title: 'Category 6',
    classStandard: 'ANSI/TIA-568-C.2 Class E',
    maxFreqMHz: 250,
    max100mSpeed: '1 Gbps / 2.5 Gbps / 5 Gbps',
    tenGDistanceLimit: 'Up to 55 m (37 m in dense bundles)',
    awgGauge: '23 AWG Solid Copper',
    shieldingType: 'UTP / F/UTP (Unshielded or Foil)',
    internalConstruction: '4 twisted pairs separated by internal plastic cross-web (spline)',
    alienCrosstalkRating: 'Moderate',
    poeSuitability: 'Optimal for PoE (15.4W) & PoE+ (30W); suitable for 60W PoE++',
    recommendedFor: 'Commercial offices, 4K CCTV networks, Wi-Fi 6 access points',
    avgCostPerMeter: '$0.45 - $0.60 / m',
    keyAdvantages: [
      '2.5x higher bandwidth (250 MHz) than Cat5e',
      'Internal plastic spline minimizes pair crosstalk and jitter',
      'Supports 10 Gbps up to 55 meters in clean installations',
    ],
    limitations: [
      '10 Gbps distance drops to 37 m in tight cable bundles due to Alien Crosstalk',
      'Slightly stiffer cable jacket due to internal spline',
    ],
  },
  Cat6a: {
    category: 'Cat6a',
    title: 'Category 6 Augmented',
    classStandard: 'ANSI/TIA-568-C.2-10 Class EA',
    maxFreqMHz: 500,
    max100mSpeed: '10 Gbps Full 100m Channel',
    tenGDistanceLimit: '100 m Full Channel',
    awgGauge: '23 AWG Heavy Solid Copper',
    shieldingType: 'F/UTP or S/FTP (Shielded)',
    internalConstruction: 'Thicker jacket with augmented spline & individual/overall foil shield',
    alienCrosstalkRating: 'Excellent',
    poeSuitability: 'Excellent for High-Power 60W & 90W PoE++ (IEEE 802.3bt)',
    recommendedFor: 'Enterprise backbones, Wi-Fi 6E/7 APs, multi-sensor 4K PTZ cameras',
    avgCostPerMeter: '$0.75 - $1.10 / m',
    keyAdvantages: [
      'Guarantees full 10 Gbps throughput up to 100 meters channel length',
      'Superior Alien Crosstalk (AXT) isolation for dense cable trays & conduits',
      'Thicker 23 AWG copper reduces I²R heating under high-power 90W PoE++',
    ],
    limitations: [
      'Thicker outer diameter (~7.5mm) increases conduit fill space',
      'Requires proper grounding if using shielded connectors',
    ],
  },
  Cat7: {
    category: 'Cat7',
    title: 'Category 7',
    classStandard: 'ISO/IEC 11801 Class F',
    maxFreqMHz: 600,
    max100mSpeed: '10 Gbps Full Channel',
    tenGDistanceLimit: '100 m Full Channel',
    awgGauge: '23 AWG Shielded Solid Copper',
    shieldingType: 'S/FTP (Individually Foil Shielded Pairs + Braided Mesh)',
    internalConstruction: 'Individual pair foil shielding plus outer braided mesh',
    alienCrosstalkRating: 'Maximum Shielded',
    poeSuitability: 'Very high thermal dissipation for continuous 90W PoE++',
    recommendedFor: 'Industrial environments, EMI-heavy factories, broadcast AV',
    avgCostPerMeter: '$1.20 - $1.75 / m',
    keyAdvantages: [
      'Individual pair foil shielding eliminates internal & alien crosstalk',
      'High noise immunity in heavy industrial EMI environments',
    ],
    limitations: [
      'ISO Class F standard is not recognized for 25G/40GBASE-T by ANSI/TIA',
      'Requires strict grounding at patch panel and shielded RJ45/GG45 connectors',
    ],
  },
  Cat8: {
    category: 'Cat8',
    title: 'Category 8',
    classStandard: 'ANSI/TIA-568-C.2-1 Class I/II',
    maxFreqMHz: 2000,
    max100mSpeed: '25 Gbps / 40 Gbps (up to 30m)',
    tenGDistanceLimit: '100 m (Designed for 25G/40G @ 30m)',
    awgGauge: '22 AWG Heavy Solid Copper',
    shieldingType: 'S/FTP Heavy Shielded',
    internalConstruction: 'Heavy gauge 22 AWG pairs with individual foil & overall braid',
    alienCrosstalkRating: 'Maximum Shielded',
    poeSuitability: 'Maximum PoE capacity with lowest copper DC loop resistance',
    recommendedFor: 'Data center top-of-rack switch-to-server interconnects (≤30m)',
    avgCostPerMeter: '$2.10 - $3.50 / m',
    keyAdvantages: [
      'Massive 2000 MHz bandwidth supporting 25 Gbps and 40 Gbps copper links',
      'Designed specifically for short data center server interconnects up to 30m',
    ],
    limitations: [
      'Limited to 30 meters total channel length for 25G/40GBASE-T',
      'Thickest diameter and highest cable material cost',
    ],
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

/**
 * Returns specific standards guidance when a cable category does not support the chosen link speed.
 */
export const getCableStandardRecommendation = (cat: CableCategory, speed: LinkSpeed): string => {
  if (cat === 'Cat5e') {
    if (speed === '10G') {
      return 'Cat5e bandwidth is limited to 100 MHz and is unrated for 10GBASE-T. For 10 Gbps, deploy Cat6 (up to 55 m) or Cat6a (up to 100 m full channel).';
    }
    if (speed === '5G') {
      return 'Cat5e only supports up to 2.5 Gbps under IEEE 802.3bz (NBASE-T). Speeds of 5 Gbps require at least Cat6 (250 MHz) or Cat6a (500 MHz).';
    }
    if (speed === '25G' || speed === '40G') {
      return 'Cat5e cannot support multi-gigabit data center speeds. Speeds of 25 Gbps / 40 Gbps require Cat8 shielded copper (up to 30 m) or fiber optic transceivers.';
    }
  }
  if (cat === 'Cat6') {
    if (speed === '25G' || speed === '40G') {
      return 'Cat6 bandwidth (250 MHz) maxes out at 10 Gbps (up to 55 m). Speeds of 25 Gbps or 40 Gbps require Cat8 shielded cabling (up to 30 m) or SFP28/QSFP+ optical fiber.';
    }
  }
  if (cat === 'Cat6a') {
    if (speed === '25G' || speed === '40G') {
      return 'Cat6a bandwidth (500 MHz) is certified for 10 Gbps up to 100 m. Speeds of 25 Gbps or 40 Gbps require Cat8 (2000 MHz, up to 30 m) or optical transceivers.';
    }
  }
  if (cat === 'Cat7') {
    if (speed === '25G' || speed === '40G') {
      return 'Cat7 (ISO Class F) is not recognized for 25GBASE-T or 40GBASE-T by ANSI/TIA-568. Upgrade to Cat8 (ANSI/TIA-568-C.2-1) or fiber optics.';
    }
  }
  return 'Please select a cable category certified for this throughput under ANSI/TIA-568 and IEEE 802.3 standards.';
};

// -------------------------------------------------------------
// DYNAMIC VISUAL DIAGRAM: SIGNAL ATTENUATION & VOLTAGE DROP
// -------------------------------------------------------------
export const CableDiagram: React.FC<{
  cableResult: any;
  lengthMeters: number;
  lengthUnit: LengthUnit;
}> = ({ cableResult, lengthMeters }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverMeters, setHoverMeters] = useState<number | null>(null);

  const activeMeters = hoverMeters !== null ? hoverMeters : lengthMeters;
  const maxAxisM = Math.max(120, Math.ceil((cableResult.maxDistM || 100) * 1.15));

  const activeAttenDb = (activeMeters / 100) * (cableResult.effectiveAttenDbPer100m || cableResult.attenuationDbPer100m);
  const currentA = cableResult.avgWattsPerRun / (cableResult.pseVoltageV || 50);
  const activeLoopR = (activeMeters / 100) * (cableResult.effectiveLoopResPer100m || cableResult.spec.loopResistancePer100m);
  const activeVolt = Math.max(30, (cableResult.pseVoltageV || 50) - (currentA * activeLoopR));

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 740;
    const height = 230;
    const margin = { top: 30, right: 55, bottom: 40, left: 55 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // D3 Scales
    const xScale = d3.scaleLinear()
      .domain([0, maxAxisM])
      .range([0, innerWidth]);

    const yScaleAtten = d3.scaleLinear()
      .domain([0, 50])
      .range([0, innerHeight]); // Attenuation increases downward

    const yScaleVolt = d3.scaleLinear()
      .domain([32, 56])
      .range([innerHeight, 0]); // Voltage decreases downward

    // Defs & Gradients
    const defs = svg.append('defs');

    // Attenuation Gradient
    const attenGrad = defs.append('linearGradient')
      .attr('id', 'atten-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    attenGrad.append('stop').attr('offset', '0%').attr('stop-color', '#38bdf8').attr('stop-opacity', 0.25);
    attenGrad.append('stop').attr('offset', '100%').attr('stop-color', '#38bdf8').attr('stop-opacity', 0.0);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Gridlines
    const yGrid = d3.axisLeft(yScaleAtten)
      .ticks(5)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'grid')
      .call(yGrid)
      .selectAll('line')
      .attr('stroke', '#334155')
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-opacity', 0.4);

    // Generate Points Data
    const stepM = 2;
    const pointsData: Array<{ m: number; attenDb: number; voltV: number }> = [];
    for (let m = 0; m <= maxAxisM; m += stepM) {
      const attenDb = (m / 100) * (cableResult.effectiveAttenDbPer100m || cableResult.attenuationDbPer100m);
      const currentA = cableResult.avgWattsPerRun / (cableResult.pseVoltageV || 50);
      const loopR = (m / 100) * (cableResult.effectiveLoopResPer100m || cableResult.spec.loopResistancePer100m);
      const vAtM = Math.max(30, (cableResult.pseVoltageV || 50) - (currentA * loopR));
      pointsData.push({ m, attenDb, voltV: vAtM });
    }

    // Line Generators
    const attenLine = d3.line<{ m: number; attenDb: number; voltV: number }>()
      .x(d => xScale(d.m))
      .y(d => yScaleAtten(d.attenDb))
      .curve(d3.curveMonotoneX);

    const voltLine = d3.line<{ m: number; attenDb: number; voltV: number }>()
      .x(d => xScale(d.m))
      .y(d => yScaleVolt(d.voltV))
      .curve(d3.curveMonotoneX);

    // Area Generators
    const attenArea = d3.area<{ m: number; attenDb: number; voltV: number }>()
      .x(d => xScale(d.m))
      .y0(0)
      .y1(d => yScaleAtten(d.attenDb))
      .curve(d3.curveMonotoneX);

    // Render Area Fill
    g.append('path')
      .datum(pointsData)
      .attr('fill', 'url(#atten-gradient)')
      .attr('d', attenArea);

    // 37V IEEE Minimum Threshold Line
    g.append('line')
      .attr('x1', 0)
      .attr('y1', yScaleVolt(37.0))
      .attr('x2', innerWidth)
      .attr('y2', yScaleVolt(37.0))
      .attr('stroke', '#ef4444')
      .attr('stroke-dasharray', '4,4')
      .attr('stroke-width', 1.5);

    g.append('text')
      .attr('x', innerWidth - 6)
      .attr('y', yScaleVolt(37.0) - 4)
      .attr('fill', '#ef4444')
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .attr('text-anchor', 'end')
      .text('37V IEEE Min Threshold');

    // Certified Max Distance Boundary Line
    if (cableResult.maxDistM && cableResult.maxDistM <= maxAxisM) {
      const xBoundary = xScale(cableResult.maxDistM);
      g.append('line')
        .attr('x1', xBoundary)
        .attr('y1', 0)
        .attr('x2', xBoundary)
        .attr('y2', innerHeight)
        .attr('stroke', '#10b981')
        .attr('stroke-dasharray', '3,3')
        .attr('stroke-width', 1.5);

      g.append('text')
        .attr('x', xBoundary)
        .attr('y', -6)
        .attr('fill', '#10b981')
        .attr('font-size', '9px')
        .attr('font-weight', 'bold')
        .attr('text-anchor', 'middle')
        .text(`Max ${cableResult.maxDistM}m Boundary`);
    }

    // Render Curves
    g.append('path')
      .datum(pointsData)
      .attr('fill', 'none')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 2.5)
      .attr('d', attenLine);

    g.append('path')
      .datum(pointsData)
      .attr('fill', 'none')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,2')
      .attr('d', voltLine);

    // Cursor Line
    const xPos = xScale(activeMeters);
    g.append('line')
      .attr('x1', xPos)
      .attr('y1', 0)
      .attr('x2', xPos)
      .attr('y2', innerHeight)
      .attr('stroke', cableResult.isWithinLimit ? '#38bdf8' : '#ef4444')
      .attr('stroke-width', 2);

    // Active Cursor Circles
    const activeAttenY = yScaleAtten(activeAttenDb);
    const activeVoltY = yScaleVolt(activeVolt);

    g.append('circle')
      .attr('cx', xPos)
      .attr('cy', activeAttenY)
      .attr('r', 5)
      .attr('fill', '#38bdf8')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);

    g.append('circle')
      .attr('cx', xPos)
      .attr('cy', activeVoltY)
      .attr('r', 5)
      .attr('fill', '#f59e0b')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);

    // X Axis
    const xAxis = d3.axisBottom(xScale)
      .tickValues([0, 30, 55, 75, 90, 100, 120].filter(m => m <= maxAxisM))
      .tickFormat(d => `${d}m`);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '9px');

    // Left Y Axis (Attenuation)
    const yAxisLeft = d3.axisLeft(yScaleAtten)
      .ticks(5)
      .tickFormat(d => `-${d}dB`);

    g.append('g')
      .call(yAxisLeft)
      .selectAll('text')
      .attr('fill', '#38bdf8')
      .attr('font-size', '9px');

    // Right Y Axis (Voltage)
    const yAxisRight = d3.axisRight(yScaleVolt)
      .ticks(5)
      .tickFormat(d => `${d}V`);

    g.append('g')
      .attr('transform', `translate(${innerWidth},0)`)
      .call(yAxisRight)
      .selectAll('text')
      .attr('fill', '#f59e0b')
      .attr('font-size', '9px');

  }, [cableResult, activeMeters, maxAxisM, activeAttenDb, activeVolt]);

  return (
    <div style={{ padding: '18px', borderRadius: '12px', background: 'var(--bg)', border: '1px solid var(--border)', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity className="w-5 h-5 text-sky-400" />
            Dynamic Signal Attenuation &amp; DC Voltage Drop Diagram (D3.js)
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Transmission characteristics curve for {cableResult.spec.category} ({cableResult.condSpec ? cableResult.condSpec.shortName : 'Solid Copper'} @ {cableResult.ambientTempC !== undefined ? `${cableResult.ambientTempC}°C` : '20°C'}, {cableResult.nominalFreqMHz} MHz)
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.8rem' }}>
          <div style={{ background: 'var(--surface)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Position: </span>
            <strong style={{ color: 'var(--text-heading)' }}>{activeMeters.toFixed(1)} m</strong>
          </div>
          <div style={{ background: 'var(--surface)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Signal Attenuation: </span>
            <strong style={{ color: '#38bdf8' }}>-{activeAttenDb.toFixed(1)} dB</strong>
          </div>
          <div style={{ background: 'var(--surface)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-muted)' }}>PD Voltage: </span>
            <strong style={{ color: activeVolt >= 42.5 ? 'var(--emerald)' : activeVolt >= 37.0 ? 'var(--amber)' : 'var(--rose)' }}>
              {activeVolt.toFixed(1)} V DC
            </strong>
          </div>
        </div>
      </div>

      <div ref={containerRef} style={{ overflowX: 'auto' }}>
        <svg
          ref={svgRef}
          style={{ width: '100%', height: 'auto', minWidth: '520px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px', cursor: 'crosshair' }}
          onMouseMove={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const width = 740;
            const margin = { left: 55, right: 55 };
            const innerWidth = width - margin.left - margin.right;
            const normalizedX = (mouseX / rect.width) * width;
            if (normalizedX >= margin.left && normalizedX <= width - margin.right) {
              const m = ((normalizedX - margin.left) / innerWidth) * maxAxisM;
              setHoverMeters(Math.max(0, Math.min(maxAxisM, m)));
            }
          }}
          onMouseLeave={() => setHoverMeters(null)}
        />
      </div>

      <div style={{ display: 'flex', gap: '18px', alignItems: 'center', justifyContent: 'center', marginTop: '10px', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '14px', height: '3px', background: '#38bdf8', borderRadius: '2px' }} />
          <span>Signal Attenuation (dB)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '14px', height: '2px', background: '#f59e0b', borderTop: '2px dashed #f59e0b' }} />
          <span>DC Voltage Delivery (V)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '14px', height: '2px', background: '#10b981', borderTop: '2px dashed #10b981' }} />
          <span>Certified {cableResult.maxDistM}m Boundary</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '14px', height: '2px', background: '#ef4444', borderTop: '2px dashed #ef4444' }} />
          <span>37V IEEE Minimum</span>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// MULTI-RUN CABLE BUNDLE HEATMAP SIMULATOR (TIA-TSB-184-A)
// -------------------------------------------------------------
export interface HoveredBundleCable {
  id: number;
  layer: number;
  rNorm: number;
  tempC: number;
  tempRiseC: number;
  attenuationDeratingPct: number;
  deratedLengthM: number;
  x: number;
  y: number;
}

export const MultiRunHeatmapSimulator: React.FC<{
  bundleSize: number;
  ambientTempC: number;
  conductorType: ConductorType;
  cableCategory: CableCategory;
  avgWattsPerRun: number;
  onChangeBundleSize: (newSize: number) => void;
  onChangeAmbientTemp: (newTemp: number) => void;
}> = ({
  bundleSize,
  ambientTempC,
  conductorType,
  cableCategory,
  avgWattsPerRun,
  onChangeBundleSize,
  onChangeAmbientTemp,
}) => {
  const [selectedPoEWatts, setSelectedPoEWatts] = useState<number>(avgWattsPerRun || 30.0);
  const [hoveredCable, setHoveredCable] = useState<HoveredBundleCable | null>(null);

  useEffect(() => {
    if (avgWattsPerRun > 0 && avgWattsPerRun !== selectedPoEWatts) {
      setSelectedPoEWatts(avgWattsPerRun);
    }
  }, [avgWattsPerRun]);

  // 1. Thermal Calculations according to TIA-TSB-184-A / ISO 29125
  const thermalAnalysis = useMemo(() => {
    const spec = CABLE_SPECS[cableCategory] || CABLE_SPECS['Cat6'];
    const condSpec = CONDUCTOR_SPECS[conductorType] || CONDUCTOR_SPECS['solid-copper'];

    // Current in amperes per pair (assuming 4-pair 50V DC)
    const currentAmps = selectedPoEWatts / 50.0;
    const baseLoopRes = spec.loopResistancePer100m * condSpec.resistanceMultiplier;
    const heatLossWattsPer100m = Math.pow(currentAmps, 2) * baseLoopRes;

    // Shielding thermal dissipation multiplier
    const isShielded = spec.shielding.includes('FTP') || spec.shielding.includes('STP');
    const shieldCoeff = isShielded ? 0.78 : 1.0;

    // Conductor material thermal multiplier
    const materialCoeff = condSpec.id === 'cca' ? 1.65 : condSpec.id === 'stranded-copper' ? 1.15 : 1.0;

    // Core temperature rise calculation based on bundle size
    const baseRise = 12.5; // °C for standard 24-cable bundle at 15.4W
    const bundleExponent = 0.65;
    const powerExponent = 0.85;

    const coreTempRiseC = Math.min(
      45.0,
      baseRise *
        shieldCoeff *
        materialCoeff *
        Math.pow(bundleSize / 24.0, bundleExponent) *
        Math.pow(selectedPoEWatts / 15.4, powerExponent)
    );

    const bundleCoreTempC = ambientTempC + coreTempRiseC;

    // TIA-568 Length Derating Formula based on Core Temperature
    let deratedLengthM = 100.0;
    let tempDeratingFactor = 1.0;

    if (bundleCoreTempC > 20) {
      const excessTemp = bundleCoreTempC - 20;
      const derateCoeff = isShielded ? 0.003 : 0.005;
      tempDeratingFactor = 1.0 + excessTemp * derateCoeff;
      deratedLengthM = Math.max(15.0, Math.round(100.0 / tempDeratingFactor));
    }

    // TIA Compliance Status
    let complianceStatus: 'ok' | 'warning' | 'danger' = 'ok';
    let statusLabel = 'TIA-TSB-184-A Compliant';
    let statusMessage = 'Bundle thermal dissipation is within normal operating limits (<15°C rise).';

    if (bundleCoreTempC > 60 || coreTempRiseC > 25) {
      complianceStatus = 'danger';
      statusLabel = 'NON-COMPLIANT / THERMAL HAZARD';
      statusMessage = 'Core temperature exceeds 60°C jacket rating! Severe insulation degradation expected.';
    } else if (bundleCoreTempC > 45 || coreTempRiseC > 15) {
      complianceStatus = 'warning';
      statusLabel = 'ELEVATED THERMAL WARNING';
      statusMessage = 'Elevated bundle heating. Maximum recommended channel length must be derated.';
    }

    return {
      heatLossWattsPer100m,
      coreTempRiseC,
      bundleCoreTempC,
      deratedLengthM,
      tempDeratingFactor,
      complianceStatus,
      statusLabel,
      statusMessage,
      isShielded,
    };
  }, [bundleSize, ambientTempC, conductorType, cableCategory, selectedPoEWatts]);

  // 2. Generate Concentric Geometry Layout
  const bundleCables = useMemo(() => {
    const cables: HoveredBundleCable[] = [];
    const spacing = 25; // SVG spacing

    let cableId = 1;
    let layer = 0;

    // Center cable (Layer 0)
    cables.push({
      id: cableId++,
      layer: 0,
      rNorm: 0,
      tempC: thermalAnalysis.bundleCoreTempC,
      tempRiseC: thermalAnalysis.coreTempRiseC,
      attenuationDeratingPct: (thermalAnalysis.tempDeratingFactor - 1) * 100,
      deratedLengthM: thermalAnalysis.deratedLengthM,
      x: 0,
      y: 0,
    });

    // Fill concentric rings until bundleSize is reached
    while (cables.length < bundleSize) {
      layer++;
      const countInLayer = layer * 6;
      const layerRadius = layer * spacing;

      for (let i = 0; i < countInLayer; i++) {
        if (cables.length >= bundleSize) break;

        const angleRad = (i * 2 * Math.PI) / countInLayer;
        const x = layerRadius * Math.cos(angleRad);
        const y = layerRadius * Math.sin(angleRad);

        const maxEstimatedLayers = Math.max(1, Math.ceil((Math.sqrt(1 + (4 * (bundleSize - 1)) / 3) - 1) / 2));
        const rNorm = Math.min(1.0, layer / maxEstimatedLayers);

        const localTempRise = thermalAnalysis.coreTempRiseC * (1 - Math.pow(rNorm, 1.3));
        const localTemp = ambientTempC + localTempRise;
        const localDerateCoeff = thermalAnalysis.isShielded ? 0.003 : 0.005;
        const localFactor = localTemp > 20 ? 1.0 + (localTemp - 20) * localDerateCoeff : 1.0;
        const localLength = Math.max(15.0, Math.round(100.0 / localFactor));

        cables.push({
          id: cableId++,
          layer,
          rNorm,
          tempC: localTemp,
          tempRiseC: localTempRise,
          attenuationDeratingPct: (localFactor - 1) * 100,
          deratedLengthM: localLength,
          x,
          y,
        });
      }
    }

    return cables;
  }, [bundleSize, ambientTempC, thermalAnalysis]);

  const getHeatColor = (tempC: number) => {
    if (tempC <= 25) return '#38bdf8';
    if (tempC <= 35) return '#10b981';
    if (tempC <= 45) return '#f59e0b';
    if (tempC <= 58) return '#f97316';
    return '#f43f5e';
  };

  return (
    <div
      style={{
        padding: '20px',
        borderRadius: '16px',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        marginTop: '20px',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sun className="w-5 h-5 text-amber-400" />
            Multi-Run Cable Bundle Heatmap &amp; Thermal Length Derating Simulator
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Simulates internal thermal gradient ($\Delta T$) across packed cable bundles according to <strong>TIA-TSB-184-A</strong> and <strong>ISO/IEC TR 29125</strong>.
          </p>
        </div>

        <span
          style={{
            padding: '5px 14px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 800,
            background:
              thermalAnalysis.complianceStatus === 'ok'
                ? 'rgba(16, 185, 129, 0.15)'
                : thermalAnalysis.complianceStatus === 'warning'
                ? 'rgba(245, 158, 11, 0.15)'
                : 'rgba(244, 63, 94, 0.15)',
            color:
              thermalAnalysis.complianceStatus === 'ok'
                ? '#10b981'
                : thermalAnalysis.complianceStatus === 'warning'
                ? '#f59e0b'
                : 'var(--rose)',
            border: `1px solid ${
              thermalAnalysis.complianceStatus === 'ok'
                ? 'rgba(16, 185, 129, 0.4)'
                : thermalAnalysis.complianceStatus === 'warning'
                ? 'rgba(245, 158, 11, 0.4)'
                : 'rgba(244, 63, 94, 0.4)'
            }`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {thermalAnalysis.complianceStatus === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          {thermalAnalysis.statusLabel}
        </span>
      </div>

      {/* Interactive Controls & Presets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5" style={{ background: 'var(--surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>
              Bundle Size (Cable Count):
            </label>
            <strong style={{ fontSize: '0.95rem', color: '#38bdf8' }}>{bundleSize} Cables</strong>
          </div>
          <input
            type="range"
            min="6"
            max="96"
            step="6"
            value={bundleSize}
            onChange={e => onChangeBundleSize(parseInt(e.target.value, 10) || 24)}
            style={{ width: '100%', accentColor: '#38bdf8' }}
          />
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
            {[12, 24, 48, 72, 96].map(sz => (
              <button
                key={sz}
                type="button"
                onClick={() => onChangeBundleSize(sz)}
                style={{
                  padding: '2px 7px',
                  fontSize: '0.7rem',
                  borderRadius: '6px',
                  fontWeight: bundleSize === sz ? 800 : 500,
                  background: bundleSize === sz ? '#38bdf8' : 'var(--bg)',
                  color: bundleSize === sz ? '#0f172a' : 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                {sz} Runs
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>
              Ambient Temperature:
            </label>
            <strong style={{ fontSize: '0.95rem', color: ambientTempC > 30 ? 'var(--amber)' : 'var(--text-heading)' }}>
              {ambientTempC}°C ({Math.round(ambientTempC * 1.8 + 32)}°F)
            </strong>
          </div>
          <input
            type="range"
            min="10"
            max="65"
            step="1"
            value={ambientTempC}
            onChange={e => onChangeAmbientTemp(parseInt(e.target.value, 10) || 20)}
            style={{ width: '100%', accentColor: 'var(--amber)' }}
          />
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            TIA Reference Ambient is 20°C (68°F)
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>
              PoE Power Load per Run:
            </label>
            <strong style={{ fontSize: '0.95rem', color: 'var(--emerald)' }}>{selectedPoEWatts} W</strong>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[15.4, 30.0, 60.0, 90.0].map(w => (
              <button
                key={w}
                type="button"
                onClick={() => setSelectedPoEWatts(w)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  fontSize: '0.74rem',
                  borderRadius: '6px',
                  fontWeight: selectedPoEWatts === w ? 800 : 500,
                  background: selectedPoEWatts === w ? 'var(--emerald)' : 'var(--bg)',
                  color: selectedPoEWatts === w ? '#0f172a' : 'var(--text-heading)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                {w}W {w === 15.4 ? '(PoE)' : w === 30 ? '(PoE+)' : w === 60 ? '(60W)' : '(90W)'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Thermal Metrics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block' }}>BUNDLE CORE TEMP</span>
          <strong style={{ fontSize: '1.25rem', color: thermalAnalysis.bundleCoreTempC > 50 ? 'var(--rose)' : thermalAnalysis.bundleCoreTempC > 35 ? 'var(--amber)' : 'var(--text-heading)' }}>
            {thermalAnalysis.bundleCoreTempC.toFixed(1)}°C
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
            ({Math.round(thermalAnalysis.bundleCoreTempC * 1.8 + 32)}°F)
          </span>
        </div>

        <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block' }}>CORE THERMAL RISE (ΔT)</span>
          <strong style={{ fontSize: '1.25rem', color: 'var(--amber)' }}>
            +{thermalAnalysis.coreTempRiseC.toFixed(1)}°C
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
            Above {ambientTempC}°C ambient
          </span>
        </div>

        <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface)', border: '1px solid #10b981' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981', display: 'block' }}>DERATED MAX LENGTH</span>
          <strong style={{ fontSize: '1.25rem', color: '#10b981' }}>
            {thermalAnalysis.deratedLengthM} Meters
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
            ({Math.round(thermalAnalysis.deratedLengthM * 3.28084)} ft limit)
          </span>
        </div>

        <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block' }}>HEAT LOSS / 100M</span>
          <strong style={{ fontSize: '1.25rem', color: '#38bdf8' }}>
            {thermalAnalysis.heatLossWattsPer100m.toFixed(1)} W
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
            $I^2R$ loss per run
          </span>
        </div>
      </div>

      {/* SVG Canvas Visualizer */}
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', textAlign: 'center' }}>
          Bundle Cross-Section Visualizer · Outer Ambient Ring vs. Inner Hot Core
        </div>

        <div style={{ width: '100%', maxWidth: '380px', aspectRatio: '1 / 1', position: 'relative' }}>
          <svg viewBox="-160 -160 320 320" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <circle
              cx="0"
              cy="0"
              r="145"
              fill="none"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />
            <text x="0" y="-148" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontWeight="600">
              Conduit / Tray Outer Wall ({ambientTempC}°C)
            </text>

            {bundleCables.map(c => {
              const isHovered = hoveredCable?.id === c.id;
              const heatColor = getHeatColor(c.tempC);
              return (
                <g
                  key={c.id}
                  transform={`translate(${c.x}, ${c.y})`}
                  onMouseEnter={() => setHoveredCable(c)}
                  onMouseLeave={() => setHoveredCable(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    r="11"
                    fill={heatColor}
                    stroke={isHovered ? '#ffffff' : 'rgba(0, 0, 0, 0.4)'}
                    strokeWidth={isHovered ? 2.5 : 1}
                    opacity={isHovered ? 1 : 0.9}
                  />
                  <circle r="4" fill="#1e293b" opacity="0.8" />
                  <circle r="2" fill={conductorType === 'cca' ? '#f43f5e' : '#f59e0b'} />
                  {bundleSize <= 48 && (
                    <text x="0" y="2.5" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="800" pointerEvents="none">
                      {c.id}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hovered Cable Info */}
        {hoveredCable ? (
          <div
            style={{
              marginTop: '14px',
              padding: '10px 16px',
              borderRadius: '10px',
              background: 'var(--bg)',
              border: '1px solid #38bdf8',
              fontSize: '0.8rem',
              width: '100%',
              maxWidth: '480px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <strong style={{ color: '#38bdf8' }}>Cable #{hoveredCable.id}</strong> (Layer {hoveredCable.layer})
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Temp Rise: +{hoveredCable.tempRiseC.toFixed(1)}°C · Attenuation Derating: +{hoveredCable.attenuationDeratingPct.toFixed(1)}%
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: getHeatColor(hoveredCable.tempC) }}>
                {hoveredCable.tempC.toFixed(1)}°C
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--emerald)', fontWeight: 700 }}>
                Max Length: {hoveredCable.deratedLengthM}m
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '12px', fontSize: '0.76rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            💡 Hover over any cable in the bundle cross-section above to inspect localized core temperature and thermal length limits.
          </div>
        )}

        {/* Color Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#38bdf8' }} />
            <span>&le;25°C Cool</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
            <span>25-35°C Normal</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
            <span>35-45°C Warm</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f97316' }} />
            <span>45-58°C Hot</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f43f5e' }} />
            <span>&gt;58°C Thermal Limit</span>
          </div>
        </div>
      </div>

      {/* Field Recommendation Note */}
      <div
        style={{
          marginTop: '14px',
          padding: '12px 14px',
          borderRadius: '10px',
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          fontSize: '0.8rem',
          color: 'var(--text-heading)',
          lineHeight: 1.5,
        }}
      >
        <div style={{ fontWeight: 800, color: '#38bdf8', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Info className="w-4 h-4" /> TIA-TSB-184-A Field Recommendation:
        </div>
        {thermalAnalysis.bundleCoreTempC > 45 ? (
          <span>
            To maintain full 100m channel lengths without thermal derating penalties, split large cable bundles of <strong>{bundleSize} cables</strong> into smaller sub-bundles of <strong>24 cables or fewer</strong>, maintain air gaps between conduits, or upgrade to <strong>Cat6a F/UTP / Cat7 S/FTP shielded cabling</strong> for superior radial heat dissipation.
          </span>
        ) : (
          <span>
            Current bundle size ({bundleSize} cables) under {ambientTempC}°C ambient maintains acceptable thermal dissipation for full {thermalAnalysis.deratedLengthM}m channel runs under {selectedPoEWatts}W PoE load.
          </span>
        )}
      </div>
    </div>
  );
};
export interface PoePortInfo {
  portNum: number;
  deviceName: string | null;
  watts: number;
  classKey: string;
  isHotspot: boolean;
  thermalCategory: 'cold' | 'optimal' | 'high' | 'hotspot';
  tempEstC: number;
  row: 1 | 2;
  col: number;
}

export const PoePortHeatmap: React.FC<{
  switchPortsCount: number;
  switchBudgetWatts: number;
  deviceRows: DeviceRow[];
  vendor: VendorProfile;
}> = ({ switchPortsCount, deviceRows, vendor }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [allocationStrategy, setAllocationStrategy] = useState<'bank-balanced' | 'staggered' | 'isolated' | 'sequential'>('bank-balanced');
  const [hoveredPort, setHoveredPort] = useState<PoePortInfo | null>(null);
  const [showPortScheduleTable, setShowPortScheduleTable] = useState<boolean>(false);

  const ports = useMemo(() => {
    const activeInstances: Array<{ name: string; watts: number; classKey: string }> = [];
    deviceRows.forEach(row => {
      const classInfo = POE_CLASSES[row.classKey] || POE_CLASSES['Class 3 (15.4 W)'];
      const effectiveW = row.wattsEach > 0 ? row.wattsEach : classInfo.watts;
      for (let i = 0; i < row.qty; i++) {
        activeInstances.push({
          name: row.name,
          watts: effectiveW,
          classKey: row.classKey,
        });
      }
    });

    const portList: PoePortInfo[] = [];
    const totalPorts = Math.max(8, switchPortsCount);
    const assignedMap: Record<number, { name: string; watts: number; classKey: string }> = {};

    if (allocationStrategy === 'sequential') {
      // 1. Sequential Standard IDF
      activeInstances.forEach((inst, idx) => {
        if (idx < totalPorts) {
          assignedMap[idx + 1] = inst;
        }
      });
    } else if (allocationStrategy === 'bank-balanced') {
      // 2. Optimal ASIC Bank Load Balancing (Greedy Power Distribution)
      const totalBanks = Math.ceil(totalPorts / 8);
      const bankLoads: number[] = new Array(totalBanks).fill(0);
      const bankPorts: number[][] = Array.from({ length: totalBanks }, (_, b) => {
        const pArr: number[] = [];
        for (let p = b * 8 + 1; p <= Math.min((b + 1) * 8, totalPorts); p++) {
          pArr.push(p);
        }
        return pArr;
      });
      const bankNextPortIdx: number[] = new Array(totalBanks).fill(0);

      // Sort active instances descending by power requirement
      const sorted = [...activeInstances].sort((a, b) => b.watts - a.watts);

      sorted.forEach(inst => {
        let bestBank = -1;
        let minLoad = Infinity;

        for (let b = 0; b < totalBanks; b++) {
          if (bankNextPortIdx[b] < bankPorts[b].length) {
            if (bankLoads[b] < minLoad) {
              minLoad = bankLoads[b];
              bestBank = b;
            }
          }
        }

        if (bestBank !== -1) {
          const pNum = bankPorts[bestBank][bankNextPortIdx[bestBank]];
          assignedMap[pNum] = inst;
          bankLoads[bestBank] += inst.watts;
          bankNextPortIdx[bestBank]++;
        }
      });
    } else if (allocationStrategy === 'isolated') {
      // 3. High-Power PoE++ Isolation Buffer (>30W separated)
      const highPower = activeInstances.filter(i => i.watts > 30);
      const lowPower = activeInstances.filter(i => i.watts <= 30);

      let hpPort = 1;
      highPower.forEach(inst => {
        while (hpPort <= totalPorts && assignedMap[hpPort]) {
          hpPort += 2;
        }
        if (hpPort <= totalPorts) {
          assignedMap[hpPort] = inst;
          hpPort += 4;
          if (hpPort > totalPorts && hpPort % 2 !== 0) hpPort = 3;
        }
      });

      let lpPort = 1;
      lowPower.forEach(inst => {
        while (lpPort <= totalPorts && assignedMap[lpPort]) {
          lpPort++;
        }
        if (lpPort <= totalPorts) {
          assignedMap[lpPort] = inst;
        }
      });
    } else {
      // 4. Staggered Interleaved Spreading
      let oddPort = 1;
      let evenPort = 2;
      activeInstances.forEach((inst, idx) => {
        let pNum = 1;
        if (idx % 2 === 0 && oddPort <= totalPorts) {
          pNum = oddPort;
          oddPort += 2;
        } else if (evenPort <= totalPorts) {
          pNum = evenPort;
          evenPort += 2;
        } else if (oddPort <= totalPorts) {
          pNum = oddPort;
          oddPort += 2;
        }
        if (pNum <= totalPorts) {
          assignedMap[pNum] = inst;
        }
      });
    }

    for (let pNum = 1; pNum <= totalPorts; pNum++) {
      const assigned = assignedMap[pNum];
      const watts = assigned ? assigned.watts : 0;
      const deviceName = assigned ? assigned.name : null;
      const classKey = assigned ? assigned.classKey : 'Unused Port';

      const adjLeftWatts = pNum > 1 && assignedMap[pNum - 1] ? assignedMap[pNum - 1].watts : 0;
      const adjRightWatts = pNum < totalPorts && assignedMap[pNum + 1] ? assignedMap[pNum + 1].watts : 0;
      const clusterWatts = watts + (adjLeftWatts + adjRightWatts) * 0.4;

      const isHotspot = watts > 30 || clusterWatts > 55;
      const tempEstC = Math.round(25 + (watts * 0.42) + (clusterWatts * 0.15));

      let thermalCategory: 'cold' | 'optimal' | 'high' | 'hotspot' = 'cold';
      if (watts === 0) {
        thermalCategory = 'cold';
      } else if (watts <= 15.4 && !isHotspot) {
        thermalCategory = 'optimal';
      } else if (watts <= 30.0 && !isHotspot) {
        thermalCategory = 'high';
      } else {
        thermalCategory = 'hotspot';
      }

      const isOdd = pNum % 2 !== 0;
      const col = isOdd ? Math.ceil(pNum / 2) : pNum / 2;
      const row = isOdd ? 1 : 2;

      portList.push({
        portNum: pNum,
        deviceName,
        watts,
        classKey,
        isHotspot,
        thermalCategory,
        tempEstC,
        row,
        col,
      });
    }

    return portList;
  }, [switchPortsCount, deviceRows, allocationStrategy]);

  // Bank & Thermal Optimization Metrics
  const bankMetrics = useMemo(() => {
    const totalBanks = Math.ceil(switchPortsCount / 8);
    const loads: number[] = new Array(totalBanks).fill(0);

    ports.forEach(p => {
      const bIdx = Math.floor((p.portNum - 1) / 8);
      if (bIdx < totalBanks) {
        loads[bIdx] += p.watts;
      }
    });

    const maxBankLoadWatts = Math.max(...loads, 0);
    const minBankLoadWatts = Math.min(...loads, 0);
    const imbalanceDeltaWatts = maxBankLoadWatts - minBankLoadWatts;

    const hotspotsCount = ports.filter(p => p.isHotspot).length;
    const balanceScore = Math.max(50, Math.min(100, Math.round(100 - (hotspotsCount * 12) - (imbalanceDeltaWatts * 0.35))));

    return {
      loads,
      maxBankLoadWatts,
      minBankLoadWatts,
      imbalanceDeltaWatts,
      balanceScore,
      hotspotsCount,
    };
  }, [ports, switchPortsCount]);

  const activePortsCount = ports.filter(p => p.watts > 0).length;
  const hotspotPortsCount = ports.filter(p => p.isHotspot).length;

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const totalPorts = Math.max(8, switchPortsCount);
    const colsCount = Math.ceil(totalPorts / 2);

    const portWidth = 42;
    const portHeight = 42;
    const gapX = 12;
    const gapY = 16;
    const groupGapX = 22;

    const startX = 65;
    const startY = 60;

    const calculateX = (col: number) => {
      const bankIndex = Math.floor((col - 1) / 4);
      return startX + (col - 1) * (portWidth + gapX) + bankIndex * groupGapX;
    };

    const calculateY = (row: number) => startY + (row - 1) * (portHeight + gapY);

    const totalWidth = calculateX(colsCount) + portWidth + 60;
    const totalHeight = 220;

    svg.attr('viewBox', `0 0 ${Math.max(760, totalWidth)} ${totalHeight}`);

    const d3ColorScale = d3.scaleSequential()
      .domain([0, 60])
      .interpolator(d3.interpolateRgbBasis(['#1e293b', '#10b981', '#f59e0b', '#f43f5e', '#be123c']));

    const switchGroup = svg.append('g').attr('class', 'switch-enclosure');

    switchGroup.append('rect')
      .attr('x', 15)
      .attr('y', 20)
      .attr('width', Math.max(730, totalWidth - 30))
      .attr('height', 170)
      .attr('rx', 10)
      .attr('fill', '#0f172a')
      .attr('stroke', 'var(--border)')
      .attr('stroke-width', 2);

    [35, 165].forEach(y => {
      [28, Math.max(712, totalWidth - 42)].forEach(x => {
        switchGroup.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 4)
          .attr('fill', '#334155')
          .attr('stroke', '#475569');
      });
    });

    switchGroup.append('text')
      .attr('x', startX)
      .attr('y', 42)
      .attr('fill', vendor.badgeColor)
      .attr('font-size', '11px')
      .attr('font-weight', '900')
      .attr('font-family', 'helvetica, sans-serif')
      .text(`${vendor.name.toUpperCase()} · ${switchPortsCount}-PORT POE OPTIMIZED FRONT PANEL`);

    const portGroups = svg.selectAll('.port-node')
      .data(ports, (d: any) => d.portNum)
      .enter()
      .append('g')
      .attr('class', 'port-node')
      .attr('transform', d => `translate(${calculateX(d.col)}, ${calculateY(d.row)})`)
      .style('cursor', 'pointer');

    portGroups.append('rect')
      .attr('width', portWidth)
      .attr('height', portHeight)
      .attr('rx', 6)
      .attr('fill', d => d3ColorScale(d.watts))
      .attr('stroke', d => d.isHotspot ? '#f43f5e' : d.watts > 0 ? '#38bdf8' : '#334155')
      .attr('stroke-width', d => d.isHotspot ? 2.5 : 1.5);

    portGroups.filter(d => d.isHotspot)
      .append('rect')
      .attr('width', portWidth + 8)
      .attr('height', portHeight + 8)
      .attr('x', -4)
      .attr('y', -4)
      .attr('rx', 8)
      .attr('fill', 'none')
      .attr('stroke', '#f43f5e')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,2')
      .attr('opacity', 0.85);

    portGroups.append('rect')
      .attr('x', 8)
      .attr('y', 8)
      .attr('width', portWidth - 16)
      .attr('height', 10)
      .attr('rx', 2)
      .attr('fill', '#020617')
      .attr('opacity', 0.6);

    portGroups.append('circle')
      .attr('cx', 8)
      .attr('cy', portHeight - 8)
      .attr('r', 3)
      .attr('fill', d => d.watts > 30 ? '#f43f5e' : d.watts > 0 ? '#10b981' : '#334155');

    portGroups.append('text')
      .attr('x', portWidth / 2)
      .attr('y', portHeight - 6)
      .attr('fill', '#ffffff')
      .attr('font-size', '10px')
      .attr('font-weight', '800')
      .attr('text-anchor', 'middle')
      .text(d => d.portNum);

    portGroups.filter(d => d.watts > 0)
      .append('text')
      .attr('x', portWidth / 2)
      .attr('y', 22)
      .attr('fill', '#ffffff')
      .attr('font-size', '9px')
      .attr('font-weight', '900')
      .attr('text-anchor', 'middle')
      .text(d => `${d.watts.toFixed(0)}W`);

    portGroups
      .on('mouseenter', (event: any, d) => {
        setHoveredPort(d);
        d3.select(event.currentTarget as SVGGElement).select('rect').attr('stroke', '#ffffff').attr('stroke-width', 3);
      })
      .on('mouseleave', (event: any, d) => {
        setHoveredPort(null);
        d3.select(event.currentTarget as SVGGElement).select('rect')
          .attr('stroke', d.isHotspot ? '#f43f5e' : d.watts > 0 ? '#38bdf8' : '#334155')
          .attr('stroke-width', d.isHotspot ? 2.5 : 1.5);
      });

  }, [ports, switchPortsCount, vendor]);

  return (
    <div
      style={{
        padding: '20px',
        borderRadius: '14px',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles className="w-5 h-5 text-amber-400" />
            Switch Port PoE Load &amp; Thermal Density Heatmap (D3.js)
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Real-time port wattage distribution &amp; thermal cluster analysis for {vendor.name} ({activePortsCount} / {switchPortsCount} Active Ports)
          </div>
        </div>

        {/* Strategy Buttons */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setAllocationStrategy('bank-balanced')}
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              borderRadius: '8px',
              background: allocationStrategy === 'bank-balanced' ? 'var(--emerald)' : 'var(--surface)',
              color: allocationStrategy === 'bank-balanced' ? '#0f172a' : 'var(--text-heading)',
              border: `1px solid ${allocationStrategy === 'bank-balanced' ? 'var(--emerald)' : 'var(--border)'}`,
              cursor: 'pointer',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Auto-balance load across 8-port switch banks / ASIC power planes to prevent localized overheating"
          >
            <Zap className="w-3.5 h-3.5" /> ASIC Bank Balanced (Recommended)
          </button>

          <button
            type="button"
            onClick={() => setAllocationStrategy('staggered')}
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              borderRadius: '8px',
              background: allocationStrategy === 'staggered' ? 'var(--accent)' : 'var(--surface)',
              color: allocationStrategy === 'staggered' ? '#ffffff' : 'var(--text-heading)',
              border: `1px solid ${allocationStrategy === 'staggered' ? 'var(--accent)' : 'var(--border)'}`,
              cursor: 'pointer',
              fontWeight: 800,
            }}
            title="Alternate high-power devices between top and bottom port rows"
          >
            Interleaved Rows
          </button>

          <button
            type="button"
            onClick={() => setAllocationStrategy('isolated')}
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              borderRadius: '8px',
              background: allocationStrategy === 'isolated' ? '#818cf8' : 'var(--surface)',
              color: allocationStrategy === 'isolated' ? '#0f172a' : 'var(--text-heading)',
              border: `1px solid ${allocationStrategy === 'isolated' ? '#818cf8' : 'var(--border)'}`,
              cursor: 'pointer',
              fontWeight: 800,
            }}
            title="Separate 60W/90W PoE++ devices with empty buffer ports"
          >
            PoE++ Isolation
          </button>

          <button
            type="button"
            onClick={() => setAllocationStrategy('sequential')}
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              borderRadius: '8px',
              background: allocationStrategy === 'sequential' ? 'var(--surface)' : 'var(--surface)',
              color: allocationStrategy === 'sequential' ? 'var(--text-heading)' : 'var(--text-muted)',
              border: `1px solid ${allocationStrategy === 'sequential' ? 'var(--text-heading)' : 'var(--border)'}`,
              cursor: 'pointer',
              fontWeight: 600,
            }}
            title="Sequential ports 1..N"
          >
            Sequential
          </button>
        </div>
      </div>

      {/* Optimization Dashboard Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4" style={{ background: 'var(--surface)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700 }}>THERMAL BALANCE SCORE</span>
          <strong style={{ fontSize: '1.15rem', color: bankMetrics.balanceScore >= 85 ? 'var(--emerald)' : 'var(--amber)' }}>
            {bankMetrics.balanceScore}% Optimal
          </strong>
        </div>
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700 }}>MAX 8-PORT BANK LOAD</span>
          <strong style={{ fontSize: '1.15rem', color: 'var(--text-heading)' }}>
            {bankMetrics.maxBankLoadWatts.toFixed(1)} W
          </strong>
        </div>
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700 }}>BANK LOAD IMBALANCE</span>
          <strong style={{ fontSize: '1.15rem', color: bankMetrics.imbalanceDeltaWatts <= 20 ? 'var(--emerald)' : 'var(--amber)' }}>
            Δ {bankMetrics.imbalanceDeltaWatts.toFixed(1)} W
          </strong>
        </div>
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700 }}>THERMAL HOTSPOTS</span>
          <strong style={{ fontSize: '1.15rem', color: hotspotPortsCount === 0 ? 'var(--emerald)' : 'var(--rose)' }}>
            {hotspotPortsCount} Hotspots
          </strong>
        </div>
      </div>

      {/* D3 SVG Front Panel */}
      <div ref={containerRef} style={{ width: '100%', overflowX: 'auto' }}>
        <svg ref={svgRef} style={{ width: '100%', height: 'auto', minWidth: '600px' }} />
      </div>

      {/* Hovered Port Telemetry Card */}
      {hoveredPort ? (
        <div
          style={{
            marginTop: '12px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'var(--surface)',
            border: `1px solid ${hoveredPort.isHotspot ? 'var(--rose)' : 'var(--border)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '0.84rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: hoveredPort.isHotspot ? 'rgba(244, 63, 94, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                color: hoveredPort.isHotspot ? 'var(--rose)' : 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
              }}
            >
              P{hoveredPort.portNum}
            </span>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--text-heading)' }}>
                {hoveredPort.deviceName ? hoveredPort.deviceName : 'Unused / Inactive Port'}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Bank {Math.ceil(hoveredPort.portNum / 8)} · {hoveredPort.classKey} · Estimated Thermal Temp: ~{hoveredPort.tempEstC}°C
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>PORT LOAD</span>
              <strong style={{ fontSize: '1rem', color: hoveredPort.watts > 30 ? 'var(--rose)' : hoveredPort.watts > 0 ? 'var(--emerald)' : 'var(--text-muted)' }}>
                {hoveredPort.watts.toFixed(1)} W
              </strong>
            </div>

            {hoveredPort.isHotspot && (
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: 'rgba(244, 63, 94, 0.2)',
                  color: 'var(--rose)',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  border: '1px solid rgba(244, 63, 94, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Thermal Hotspot Warning
              </span>
            )}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '10px', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          💡 Hover over any RJ45 port on the switch faceplate above to inspect real-time wattage draw, device assignment, and thermal cluster status.
        </div>
      )}

      {/* Toggle Recommended Port Assignment Schedule Table */}
      <div style={{ marginTop: '14px', textAlign: 'center' }}>
        <button
          type="button"
          onClick={() => setShowPortScheduleTable(!showPortScheduleTable)}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 800,
            background: 'var(--surface)',
            color: '#38bdf8',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Layers className="w-3.5 h-3.5" />
          {showPortScheduleTable ? 'Hide Optimal Port Patching Schedule' : 'View Recommended Port Patching Schedule'}
        </button>
      </div>

      {showPortScheduleTable && (
        <div style={{ marginTop: '14px', background: 'var(--surface)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)', overflowX: 'auto' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Optimal Switch Port Patching Schedule ({allocationStrategy.toUpperCase()} STRATEGY):
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '6px 8px' }}>PORT #</th>
                <th style={{ padding: '6px 8px' }}>ASIC BANK</th>
                <th style={{ padding: '6px 8px' }}>CONNECTED DEVICE</th>
                <th style={{ padding: '6px 8px' }}>POE CLASS / WATTAGE</th>
                <th style={{ padding: '6px 8px' }}>THERMAL STATUS</th>
              </tr>
            </thead>
            <tbody>
              {ports.filter(p => p.watts > 0).map(p => (
                <tr key={p.portNum} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 800, color: '#38bdf8' }}>Port {p.portNum}</td>
                  <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>Bank {Math.ceil(p.portNum / 8)}</td>
                  <td style={{ padding: '6px 8px', fontWeight: 700, color: 'var(--text-heading)' }}>{p.deviceName}</td>
                  <td style={{ padding: '6px 8px', color: 'var(--emerald)', fontWeight: 700 }}>{p.watts.toFixed(1)} W ({p.classKey})</td>
                  <td style={{ padding: '6px 8px' }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        background: p.isHotspot ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: p.isHotspot ? 'var(--rose)' : 'var(--emerald)',
                      }}
                    >
                      {p.isHotspot ? 'Hotspot' : 'Optimal'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// DEDICATED CABLE SELECTION REFERENCE & STANDARDS MATRIX
// -------------------------------------------------------------
export const CableSelectionReference: React.FC<{
  activeCategory: CableCategory;
  activeLinkSpeed: LinkSpeed;
  activeChannelLength: number;
  lengthUnit: LengthUnit;
  conductorType: ConductorType;
  ambientTempC: number;
  bundleSize: number;
  onSelectCategory: (category: CableCategory) => void;
}> = ({
  activeCategory,
  activeLinkSpeed,
  activeChannelLength,
  lengthUnit,
  conductorType,
  ambientTempC,
  bundleSize,
  onSelectCategory,
}) => {
  const activeLengthMeters = lengthUnit === 'ft' ? activeChannelLength * 0.3048 : activeChannelLength;
  const categoriesToCompare: CableCategory[] = ['Cat5e', 'Cat6', 'Cat6a', 'Cat7', 'Cat8'];

  return (
    <div
      style={{
        padding: '20px',
        borderRadius: '16px',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        marginTop: '20px',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cable className="w-5 h-5 text-sky-400" />
            Cable Selection Reference &amp; Performance Matrix
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Real-time maximum supported distances and speed capabilities dynamically adjusted for your environmental conditions ({ambientTempC}°C ambient, {bundleSize} bundled runs, {CONDUCTOR_SPECS[conductorType].shortName}).
          </p>
        </div>

        <span
          style={{
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '0.78rem',
            fontWeight: 800,
            background: 'rgba(56, 189, 248, 0.12)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.3)',
          }}
        >
          Selected: {activeCategory} ({activeLinkSpeed} @ {activeChannelLength}{lengthUnit})
        </span>
      </div>

      {/* Side-by-Side Category Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-5">
        {categoriesToCompare.map(cat => {
          const isSelected = activeCategory === cat;
          const spec = CABLE_SPECS[cat];
          const guide = CABLE_TYPE_GUIDES[cat];

          // Compute derated 10G limit for this category under current bundle conditions
          let tenGLimitM = spec.speedLimits['10G'];
          if (cat === 'Cat6' && tenGLimitM > 0) {
            tenGLimitM = bundleSize <= 6 ? 55 : bundleSize <= 24 ? 45 : 37;
          }

          // Compute thermal derated 100m channel limit for this category
          const isShielded = spec.shielding.includes('FTP') || spec.shielding.includes('STP');
          const derateCoeff = isShielded ? 0.003 : 0.005;
          const tempFactor = ambientTempC > 20 ? 1.0 + (ambientTempC - 20) * derateCoeff : 1.0;
          const derated100mChannelM = Math.max(15, Math.round(100.0 / tempFactor));

          // Check if user's requested activeLinkSpeed is supported by this category
          const isSpeedSupported = spec.speedLimits[activeLinkSpeed] > 0;
          const maxDistForSpeed = spec.speedLimits[activeLinkSpeed];
          const isDistanceFeasible = isSpeedSupported && activeLengthMeters <= Math.min(maxDistForSpeed, derated100mChannelM);

          return (
            <div
              key={cat}
              style={{
                padding: '14px',
                borderRadius: '12px',
                background: isSelected ? 'rgba(56, 189, 248, 0.08)' : 'var(--surface)',
                border: `2px solid ${isSelected ? '#38bdf8' : 'var(--border)'}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 0 16px rgba(56, 189, 248, 0.18)' : 'none',
              }}
            >
              <div>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 900, fontSize: '1.05rem', color: isSelected ? '#38bdf8' : 'var(--text-heading)' }}>
                    {cat}
                  </span>
                  {isSelected ? (
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '10px', background: '#38bdf8', color: '#0f172a' }}>
                      Active
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {spec.maxFreqMHz} MHz
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '10px', minHeight: '32px' }}>
                  {guide ? guide.classStandard : spec.standard}
                </div>

                {/* Speed & Max Distance Matrix breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', marginBottom: '12px' }}>
                  {/* 1 Gbps */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', borderRadius: '6px', background: 'var(--bg)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>1G Speed:</span>
                    <strong style={{ color: 'var(--emerald)' }}>100 m ({derated100mChannelM}m derated)</strong>
                  </div>

                  {/* 2.5G NBASE-T */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', borderRadius: '6px', background: 'var(--bg)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>2.5G Speed:</span>
                    <strong style={{ color: spec.speedLimits['2.5G'] > 0 ? 'var(--emerald)' : 'var(--rose)' }}>
                      {spec.speedLimits['2.5G'] > 0 ? `${Math.min(spec.speedLimits['2.5G'], derated100mChannelM)} m` : 'Unrated'}
                    </strong>
                  </div>

                  {/* 5G NBASE-T */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', borderRadius: '6px', background: 'var(--bg)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>5G Speed:</span>
                    <strong style={{ color: spec.speedLimits['5G'] > 0 ? 'var(--emerald)' : 'var(--rose)' }}>
                      {spec.speedLimits['5G'] > 0 ? `${Math.min(spec.speedLimits['5G'], derated100mChannelM)} m` : 'Unsupported'}
                    </strong>
                  </div>

                  {/* 10GBASE-T */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', borderRadius: '6px', background: 'var(--bg)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>10G Speed:</span>
                    <strong style={{ color: tenGLimitM >= 100 ? 'var(--emerald)' : tenGLimitM > 0 ? '#f59e0b' : 'var(--rose)' }}>
                      {tenGLimitM > 0 ? `${tenGLimitM} m` : 'Unsupported'}
                    </strong>
                  </div>
                </div>

                {/* Environmental Feasibility Badge */}
                <div
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    marginBottom: '10px',
                    background: isDistanceFeasible
                      ? 'rgba(16, 185, 129, 0.12)'
                      : 'rgba(239, 68, 68, 0.12)',
                    color: isDistanceFeasible ? '#10b981' : 'var(--rose)',
                    border: `1px solid ${isDistanceFeasible ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isDistanceFeasible ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  <span>
                    {isDistanceFeasible
                      ? `Feasible for ${activeLinkSpeed} @ ${activeChannelLength}${lengthUnit}`
                      : isSpeedSupported
                      ? `Exceeds max limit for ${activeLinkSpeed}`
                      : `${cat} unsupported for ${activeLinkSpeed}`}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => onSelectCategory(cat)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: isSelected ? '#38bdf8' : 'var(--surface)',
                  color: isSelected ? '#0f172a' : 'var(--text-heading)',
                  border: isSelected ? 'none' : '1px solid var(--border)',
                  transition: 'all 0.15s ease',
                }}
              >
                {isSelected ? '✓ Currently Selected' : `Select ${cat}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Field Engineering Quick Reference Summary */}
      <div style={{ background: 'var(--surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
        <div style={{ fontWeight: 800, color: 'var(--text-heading)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Info className="w-4 h-4 text-sky-400" />
          Field Engineering Standard Guidelines (ANSI/TIA-568.2-D &amp; IEEE 802.3):
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div>
            <strong style={{ color: 'var(--text-heading)' }}>Category 5e (Cat5e):</strong>
            <div>Rated up to 100 MHz. Designed for 1 Gbps up to 100m. Unrated for 10GBASE-T. Higher loop resistance causes increased $I^2R$ PoE voltage drop on long runs.</div>
          </div>
          <div>
            <strong style={{ color: 'var(--text-heading)' }}>Category 6 (Cat6):</strong>
            <div>Rated up to 250 MHz. Includes internal cross-web spline. Supports 10 Gbps up to 55m in clean runs, but Alien Crosstalk drops limit to 37m in tight bundles.</div>
          </div>
          <div>
            <strong style={{ color: 'var(--text-heading)' }}>Category 6a (Cat6a):</strong>
            <div>Rated up to 500 MHz. Full 10 Gbps support up to 100m full channel length. Superior Alien Crosstalk isolation and thicker copper for 90W PoE++.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CableLengthPoeChecker: React.FC = () => {
  // PWA Offline Status & Install Hooks
  const isOnline = useOnlineStatus();
  const { isInstallable, install } = usePWAInstall();

  // Standards comparison modal state
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);

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
  const [bundleSize, setBundleSize] = useState<number>(24); // Number of cables in bundle/tray
  const [permanentLinkPct, setPermanentLinkPct] = useState<number>(90); // 90% in wall, 10% patch cord

  // -------------------------------------------------------------
  // CABLE CONDUCTOR QUALITY & THERMAL DEGRADATION STATE
  // -------------------------------------------------------------
  const [conductorType, setConductorType] = useState<ConductorType>('solid-copper');
  const [ambientTempC, setAmbientTempC] = useState<number>(20); // Default 20°C / 68°F

  // -------------------------------------------------------------
  // POE BUDGET CHECKER STATE
  // -------------------------------------------------------------
  const [selectedSwitchSeriesId, setSelectedSwitchSeriesId] = useState<string>('cisco-cat-9300-48u');
  const [useSecondaryPsu, setUseSecondaryPsu] = useState<boolean>(false);
  const [switchBudgetWatts, setSwitchBudgetWatts] = useState<number>(822);
  const [switchPortsCount, setSwitchPortsCount] = useState<number>(48);
  const [selectedVendor, setSelectedVendor] = useState<NetworkVendor>('cisco');
  const [deviceRows, setDeviceRows] = useState<DeviceRow[]>([
    { id: 'dev-1', name: 'IP Dome Cameras', qty: 8, classKey: 'Class 3 (15.4 W)', wattsEach: 15.4, estCableLengthM: 50 },
    { id: 'dev-2', name: 'Wi-Fi 6 Access Points', qty: 2, classKey: 'Class 4 (30.0 W)', wattsEach: 30.0, estCableLengthM: 40 },
    { id: 'dev-3', name: 'Outdoor PTZ Camera (Heater)', qty: 1, classKey: 'Class 6 (60.0 W)', wattsEach: 60.0, estCableLengthM: 80 },
  ]);

  const activeSwitchSeries = useMemo(() => {
    return SWITCH_SERIES_MODELS.find(m => m.id === selectedSwitchSeriesId) || SWITCH_SERIES_MODELS[0];
  }, [selectedSwitchSeriesId]);

  const handleSelectSwitchSeries = (seriesId: string) => {
    setSelectedSwitchSeriesId(seriesId);
    const model = SWITCH_SERIES_MODELS.find(m => m.id === seriesId);
    if (model) {
      setSelectedVendor(model.vendorId);
      setSwitchPortsCount(model.portsCount);
      setUseSecondaryPsu(false);
      setSwitchBudgetWatts(model.poeBudgetWatts);
    }
  };

  const handleToggleSecondaryPsu = (enabled: boolean) => {
    setUseSecondaryPsu(enabled);
    if (activeSwitchSeries) {
      if (enabled && activeSwitchSeries.hasSecondaryPsuOption && activeSwitchSeries.poeBudgetWithSecondaryPsuWatts) {
        setSwitchBudgetWatts(activeSwitchSeries.poeBudgetWithSecondaryPsuWatts);
      } else {
        setSwitchBudgetWatts(activeSwitchSeries.poeBudgetWatts);
      }
    }
  };

  const overloadedDevicesList = useMemo(() => {
    if (!activeSwitchSeries) return [];
    return deviceRows.filter(row => row.wattsEach > activeSwitchSeries.maxPortWatts);
  }, [deviceRows, activeSwitchSeries]);

  // -------------------------------------------------------------
  // CABLE MATERIAL COST ESTIMATION STATE (OPTIONAL)
  // -------------------------------------------------------------
  const [costPerMeter, setCostPerMeter] = useState<number | ''>(0.48); // default $0.48/m for Cat6 solid copper
  const [costCurrency, setCostCurrency] = useState<string>('$');
  const [includeSlackBuffer, setIncludeSlackBuffer] = useState<boolean>(true); // 10% pull slack & service loops

  // Action status indicators
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [exportedPdf, setExportedPdf] = useState(false);
  const [exportedCsv, setExportedCsv] = useState(false);
  const [exportedJson, setExportedJson] = useState(false);
  const [importedJson, setImportedJson] = useState(false);
  const [jsonImportError, setJsonImportError] = useState<string | null>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------
  // CABLE LENGTH CALCULATIONS
  // -------------------------------------------------------------
  const lengthMeters = useMemo(() => {
    return lengthUnit === 'ft' ? channelLength * 0.3048 : channelLength;
  }, [channelLength, lengthUnit]);

  const lengthFeet = useMemo(() => {
    return lengthUnit === 'm' ? channelLength * 3.28084 : channelLength;
  }, [channelLength, lengthUnit]);

  // Automatic Two-Way Unit Converter Handler
  const handleToggleLengthUnit = (newUnit: LengthUnit) => {
    if (newUnit === lengthUnit) return;

    if (newUnit === 'ft') {
      // Automatically convert current channel length from meters to feet
      const convertedFt = parseFloat((channelLength * 3.28084).toFixed(1));
      setLengthUnit('ft');
      setChannelLength(convertedFt);

      // Automatically convert device row run lengths from meters to feet
      setDeviceRows(prev =>
        prev.map(row => ({
          ...row,
          estCableLengthM: Math.round(row.estCableLengthM * 3.28084),
        }))
      );
    } else {
      // Automatically convert current channel length from feet to meters
      const convertedM = parseFloat((channelLength * 0.3048).toFixed(1));
      setLengthUnit('m');
      setChannelLength(convertedM);

      // Automatically convert device row run lengths from feet to meters
      setDeviceRows(prev =>
        prev.map(row => ({
          ...row,
          estCableLengthM: Math.round(row.estCableLengthM * 0.3048),
        }))
      );
    }
  };

  const cableResult = useMemo(() => {
    const spec = CABLE_SPECS[cableCategory];
    const baseMaxDist = spec.speedLimits[linkSpeed] || 0;

    // 1. Alien Crosstalk (AXT) Bundle Derating
    let bundleDeratedMaxDist = baseMaxDist;
    if (cableCategory === 'Cat6' && linkSpeed === '10G') {
      if (bundleSize <= 6) {
        bundleDeratedMaxDist = 55;
      } else if (bundleSize <= 24) {
        bundleDeratedMaxDist = 45;
      } else {
        bundleDeratedMaxDist = 37; // Heavy bundle AXT limit
      }
    } else if (isBundledCrosstalk && baseMaxDist > 0) {
      bundleDeratedMaxDist = Math.max(20, Math.round(baseMaxDist * 0.85));
    }

    // 2. TIA-TSB-184-A PoE Bundle Thermal Rise (°C)
    const totalDevicesCount = deviceRows.reduce((acc, r) => acc + r.qty, 0);
    const avgWattsPerRun = totalDevicesCount > 0
      ? deviceRows.reduce((acc, r) => acc + (r.wattsEach * r.qty), 0) / totalDevicesCount
      : 15.4;

    const bundleTempRiseC = Math.min(30, (bundleSize * 0.22 * (avgWattsPerRun / 15.4)));

    // ANSI/TIA-568-D Annex D length reduction for elevated temperature above 20°C
    let thermalDeratedMaxDist = bundleDeratedMaxDist;
    if (bundleTempRiseC > 10 && bundleDeratedMaxDist > 0) {
      const excessTempC = bundleTempRiseC - 10;
      thermalDeratedMaxDist = Math.max(15, Math.round(bundleDeratedMaxDist * (1 - excessTempC * 0.004)));
    }

    const maxDist = thermalDeratedMaxDist;
    const isSupported = baseMaxDist > 0;
    const isWithinLimit = isSupported && lengthMeters <= maxDist;
    const deltaMeters = isSupported ? maxDist - lengthMeters : -lengthMeters;
    const overMeters = Math.max(0, lengthMeters - maxDist);
    const headroomPct = isSupported && maxDist > 0 ? ((maxDist - lengthMeters) / maxDist) * 100 : 0;

    // Check permanent link vs patch cord balance
    const estPermanentLinkM = lengthMeters * (permanentLinkPct / 100);
    const estPatchCordM = lengthMeters - estPermanentLinkM;
    const isPermanentLinkWarning = estPermanentLinkM > 90;
    const isPatchCordWarning = estPatchCordM > 10;

    // Conductor Material & Operating Temperature Math
    const condSpec = CONDUCTOR_SPECS[conductorType];
    const tempDeltaC = ambientTempC - 20;

    const tempCoeff = conductorType === 'cca' ? 0.0041 : 0.00393;
    const tempResistanceFactor = 1 + tempCoeff * tempDeltaC;
    const effectiveLoopResPer100m = spec.loopResistancePer100m * condSpec.resistanceMultiplier * tempResistanceFactor;
    const effectiveLoopRes = (lengthMeters / 100) * effectiveLoopResPer100m;

    let tempAttenDeratingPct = 0;
    if (tempDeltaC > 0) {
      const isShielded = spec.shielding.includes('FTP') || spec.shielding.includes('STP');
      if (tempDeltaC <= 20) {
        tempAttenDeratingPct = tempDeltaC * (isShielded ? 0.002 : 0.004);
      } else {
        tempAttenDeratingPct = (20 * (isShielded ? 0.002 : 0.004)) + ((tempDeltaC - 20) * (isShielded ? 0.003 : 0.006));
      }
      if (conductorType === 'cca') {
        tempAttenDeratingPct += tempDeltaC * 0.003;
      }
    }

    // Electrical & Signal Attenuation Calculations
    const loopRes = (lengthMeters / 100) * spec.loopResistancePer100m;
    const oneWayLatencyNs = (lengthMeters / 200000000) * 1e9;

    const nominalFreqMHz = linkSpeed === '100M' ? 31.25 : linkSpeed === '1G' ? 62.5 : linkSpeed === '2.5G' ? 100 : linkSpeed === '5G' ? 200 : linkSpeed === '10G' ? 400 : linkSpeed === '25G' ? 1250 : 2000;
    
    const freqFactor = Math.sqrt(nominalFreqMHz);
    const attenuationDbPer100m = (1.967 * freqFactor) + (0.023 * nominalFreqMHz) + (0.05 / Math.max(1, freqFactor));
    const effectiveAttenDbPer100m = attenuationDbPer100m * condSpec.attenuationMultiplier * (1 + tempAttenDeratingPct);
    const currentRunAttenuationDb = (lengthMeters / 100) * attenuationDbPer100m;
    const effectiveRunAttenDb = (lengthMeters / 100) * effectiveAttenDbPer100m;
    const maxCertifiedAttenuationDb = (maxDist / 100) * attenuationDbPer100m;

    // Characteristic Impedance Shift (Z0 = 100 Ohms)
    const impedanceShiftOhms = condSpec.typicalImpedanceShiftOhms + (tempDeltaC * 0.06);
    const effectiveZ0 = 100 + impedanceShiftOhms;
    const gamma = Math.abs((effectiveZ0 - 100) / (effectiveZ0 + 100));
    
    // Return Loss (RL in dB)
    let returnLossDb = condSpec.baseReturnLossDb - (20 * Math.log10(1 + gamma * 2.5)) - (Math.max(0, tempDeltaC) * 0.04);
    returnLossDb = Math.max(10, Math.min(32, returnLossDb));
    const signalReflectionPct = Math.min(100, Math.pow(10, -returnLossDb / 10) * 100);

    let returnLossStatus: 'excellent' | 'acceptable' | 'marginal' | 'severe' = 'excellent';
    if (returnLossDb < 14 || conductorType === 'cca') {
      returnLossStatus = 'severe';
    } else if (returnLossDb < 18) {
      returnLossStatus = 'marginal';
    } else if (returnLossDb < 22) {
      returnLossStatus = 'acceptable';
    }

    // DC Voltage Drop with effective loop resistance
    const pseVoltageV = VENDOR_PROFILES[selectedVendor].defaultPoeVoltageV;
    const currentAmps = avgWattsPerRun / pseVoltageV;
    const voltageDropV = currentAmps * loopRes;
    const effectiveVoltageDropV = currentAmps * effectiveLoopRes;
    const pdDeliveredVoltageV = Math.max(0, pseVoltageV - effectiveVoltageDropV);
    const voltageDropPct = (voltageDropV / pseVoltageV) * 100;
    const effectiveVoltageDropPct = (effectiveVoltageDropV / pseVoltageV) * 100;

    // Cable Heat Dissipation (I^2 * R)
    const cableI2RHeatWatts = Math.pow(currentAmps, 2) * effectiveLoopRes;

    // Status classification
    let status: 'ok' | 'marginal' | 'over' | 'unsupported' = 'ok';
    if (!isSupported) {
      status = 'unsupported';
    } else if (!isWithinLimit || conductorType === 'cca') {
      status = 'over';
    } else if (headroomPct <= 10 || isPermanentLinkWarning || (cableCategory === 'Cat6' && linkSpeed === '10G' && bundleSize > 12 && lengthMeters > 40) || ambientTempC > 45) {
      status = 'marginal';
    }

    return {
      spec,
      condSpec,
      conductorType,
      ambientTempC,
      tempDeltaC,
      tempResistanceFactor,
      tempAttenDeratingPct,
      effectiveLoopResPer100m,
      effectiveLoopRes,
      effectiveAttenDbPer100m,
      effectiveRunAttenDb,
      impedanceShiftOhms,
      effectiveZ0,
      gamma,
      returnLossDb,
      signalReflectionPct,
      returnLossStatus,
      effectiveVoltageDropV,
      effectiveVoltageDropPct,
      cableI2RHeatWatts,
      baseMaxDistM: baseMaxDist,
      bundleDeratedMaxDistM: bundleDeratedMaxDist,
      thermalDeratedMaxDistM: thermalDeratedMaxDist,
      maxDistM: maxDist,
      maxDistFt: maxDist * 3.28084,
      bundleTempRiseC,
      avgWattsPerRun,
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
      nominalFreqMHz,
      attenuationDbPer100m,
      currentRunAttenuationDb,
      maxCertifiedAttenuationDb,
      pseVoltageV,
      voltageDropV,
      pdDeliveredVoltageV,
      voltageDropPct,
      status,
    };
  }, [cableCategory, linkSpeed, lengthMeters, isBundledCrosstalk, permanentLinkPct, bundleSize, deviceRows, selectedVendor, conductorType, ambientTempC]);

  // -------------------------------------------------------------
  // POE BUDGET CALCULATIONS
  // -------------------------------------------------------------
  const poeResult = useMemo(() => {
    let totalRequestedWatts = 0;
    let totalPortsUsed = 0;
    let maxSinglePortWatts = 0;
    let highestStandard: PoeStandardId = '802.3af';
    let totalCopperCableHeatLossWatts = 0;

    const vendor = VENDOR_PROFILES[selectedVendor];

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
      const currentAmps = effectiveWattsEach / vendor.defaultPoeVoltageV;
      const spec = CABLE_SPECS[cableCategory];
      const condSpec = CONDUCTOR_SPECS[conductorType];
      const tempDeltaC = ambientTempC - 20;
      const tempCoeff = conductorType === 'cca' ? 0.0041 : 0.00393;
      const tempResistanceFactor = 1 + tempCoeff * tempDeltaC;
      const effectiveLoopResPer100m = spec.loopResistancePer100m * condSpec.resistanceMultiplier * tempResistanceFactor;

      const rowLengthInMeters = lengthUnit === 'ft' ? row.estCableLengthM * 0.3048 : row.estCableLengthM;
      const runResistance = (rowLengthInMeters / 100) * effectiveLoopResPer100m;
      const is4Pair = classInfo.standard === '802.3bt-type3' || classInfo.standard === '802.3bt-type4';
      const effectiveResistance = is4Pair ? runResistance / 2 : runResistance;
      const singleCableLossWatts = Math.min(effectiveWattsEach * 0.35, Math.pow(currentAmps, 2) * effectiveResistance);
      const totalRowCableLoss = singleCableLossWatts * row.qty;
      totalCopperCableHeatLossWatts += totalRowCableLoss;

      const rowTotalLengthM = rowLengthInMeters * row.qty;

      return {
        ...row,
        classInfo,
        effectiveWattsEach,
        subtotalWatts,
        singleCableLossWatts,
        totalRowCableLoss,
        rowTotalLengthM,
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

    // Vendor dynamic power negotiation vs class max reservation
    const reservedWatts = vendor.poeReservationPolicy === 'lldp-dynamic'
      ? totalRequestedWatts * 0.85
      : totalRequestedWatts;

    const remainingBudgetWatts = switchBudgetWatts - reservedWatts;
    const utilizationPct = switchBudgetWatts > 0 ? (reservedWatts / switchBudgetWatts) * 100 : 0;
    const recommendedBudgetWithHeadroomWatts = Math.ceil(reservedWatts * 1.25);
    const availablePortsRemaining = switchPortsCount - totalPortsUsed;
    const isPortExceeded = totalPortsUsed > switchPortsCount;

    // Backplane Switching Capacity Check
    const speedGbps = linkSpeed === '100M' ? 0.1 : linkSpeed === '1G' ? 1 : linkSpeed === '2.5G' ? 2.5 : linkSpeed === '5G' ? 5 : linkSpeed === '10G' ? 10 : linkSpeed === '25G' ? 25 : 40;
    const requiredBackplaneGbps = totalPortsUsed * speedGbps * vendor.backplaneMultiplierGbps;

    let status: 'ok' | 'tight' | 'over' | 'nobudget' = 'ok';
    if (!(switchBudgetWatts > 0)) {
      status = 'nobudget';
    } else if (reservedWatts > switchBudgetWatts || isPortExceeded) {
      status = 'over';
    } else if (utilizationPct > 80) {
      status = 'tight';
    }

    return {
      totalRequestedWatts,
      reservedWatts,
      totalPortsUsed,
      maxSinglePortWatts,
      highestStandard,
      remainingBudgetWatts,
      utilizationPct,
      recommendedBudgetWithHeadroomWatts,
      availablePortsRemaining,
      isPortExceeded,
      totalCopperCableHeatLossWatts,
      requiredBackplaneGbps,
      vendor,
      status,
      deviceBreakdowns,
    };
  }, [deviceRows, switchBudgetWatts, switchPortsCount, cableCategory, selectedVendor, linkSpeed, conductorType, ambientTempC, lengthUnit]);

  // -------------------------------------------------------------
  // CABLE MATERIAL COST CALCULATIONS
  // -------------------------------------------------------------
  const materialCostResult = useMemo(() => {
    // Total cable length across all runs in deviceRows
    const totalCableMeters = deviceRows.reduce((acc, row) => acc + (row.qty * (lengthUnit === 'ft' ? row.estCableLengthM * 0.3048 : row.estCableLengthM)), 0);
    const totalCableFeet = totalCableMeters * 3.28084;
    const totalRunsCount = deviceRows.reduce((acc, row) => acc + row.qty, 0);

    const unitCost = typeof costPerMeter === 'number' && !isNaN(costPerMeter) && costPerMeter >= 0 ? costPerMeter : 0;
    const isCostConfigured = typeof costPerMeter === 'number' && !isNaN(costPerMeter) && costPerMeter > 0;

    // Direct run material cost across all runs
    const baseCost = totalCableMeters * unitCost;

    // 10% standard installation slack (service loops, wall drops, patch panel dressing)
    const slackMeters = totalCableMeters * 0.10;
    const totalWithSlackMeters = totalCableMeters * 1.10;
    const totalWithSlackCost = baseCost * 1.10;

    // Standard commercial pull boxes: 305 meters (1,000 feet) per spool box
    const effectiveMeters = includeSlackBuffer ? totalWithSlackMeters : totalCableMeters;
    const standard305mBoxes = Math.ceil(effectiveMeters / 305);
    const spoolsCost = standard305mBoxes > 0 && isCostConfigured ? standard305mBoxes * 305 * unitCost : 0;

    // Single run material cost (from Module 1 channel length)
    const singleRunCost = lengthMeters * unitCost;

    return {
      totalCableMeters,
      totalCableFeet,
      totalRunsCount,
      unitCost,
      isCostConfigured,
      baseCost,
      slackMeters,
      totalWithSlackMeters,
      totalWithSlackCost,
      effectiveMeters,
      standard305mBoxes,
      spoolsCost,
      singleRunCost,
    };
  }, [deviceRows, costPerMeter, includeSlackBuffer, lengthMeters]);

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
    setCostPerMeter(0.48);
    setCostCurrency('$');
    setIncludeSlackBuffer(true);
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
• Conductor Material: ${cableResult.condSpec.name} [${cableResult.condSpec.tiaCompliant ? 'TIA Compliant' : 'NON-TIA COMPLIANT'}]
• Operating Ambient Temp: ${ambientTempC}°C (${Math.round(ambientTempC * 1.8 + 32)}°F)
• Target Link Speed: ${linkSpeed}
• Channel Run Length: ${lengthMeters.toFixed(1)} m (${lengthFeet.toFixed(0)} ft)
• Maximum Certified Distance: ${cableResult.maxDistM > 0 ? `${cableResult.maxDistM} m (${cableResult.maxDistFt.toFixed(0)} ft)` : 'Not Rated'}
• Compliance Status: ${cableResult.isSupported ? (cableResult.status === 'ok' ? 'PASS (Within certified limits)' : cableResult.status === 'marginal' ? 'MARGINAL (Close to channel limits)' : `FAIL (${conductorType === 'cca' ? 'CCA Non-Compliant' : `Too long by ${cableResult.overMeters.toFixed(1)} m`})`) : `CHECK CABLE STANDARD (Speed not supported: ${cableCategory} cannot carry ${linkSpeed})`}
• Channel Architecture: ~${cableResult.estPermanentLinkM.toFixed(1)} m permanent solid link + ~${cableResult.estPatchCordM.toFixed(1)} m stranded patch cords
• Effective Loop DC Resistance: ~${cableResult.effectiveLoopRes.toFixed(1)} Ω (Base: ${cableResult.loopResistanceOhms.toFixed(1)} Ω)
• Insertion Loss Derating: +${(cableResult.tempAttenDeratingPct * 100).toFixed(1)}% thermal penalty (-${cableResult.effectiveRunAttenDb.toFixed(1)} dB total)
• Characteristic Impedance (Z0): ~${cableResult.effectiveZ0.toFixed(1)} Ω (Shift: +${cableResult.impedanceShiftOhms.toFixed(1)} Ω)
• Return Loss (RL): ${cableResult.returnLossDb.toFixed(1)} dB (Reflection: ${cableResult.signalReflectionPct.toFixed(2)}%) [${cableResult.returnLossStatus.toUpperCase()}]

2. SWITCH POE POWER BUDGET AUDIT:
• Switch Total PoE Budget: ${switchBudgetWatts} Watts
• Switch Total Ports: ${switchPortsCount} Ports
• Total Requested PoE Power: ${poeResult.totalRequestedWatts.toFixed(1)} Watts
• Total Active PoE Ports: ${poeResult.totalPortsUsed} / ${switchPortsCount} Ports (${poeResult.availablePortsRemaining >= 0 ? `${poeResult.availablePortsRemaining} ports available` : `${Math.abs(poeResult.availablePortsRemaining)} ports exceeded`})
• Remaining PoE Budget: ${poeResult.remainingBudgetWatts.toFixed(1)} Watts
• Power Utilization: ${poeResult.utilizationPct.toFixed(1)}% (${poeResult.status === 'ok' ? 'Optimal Headroom (<80%)' : poeResult.status === 'tight' ? 'Tight Headroom (>80%)' : 'OVER BUDGET'})
• Minimum Required Switch Capability: ${POE_STANDARDS[poeResult.highestStandard].name} (${POE_STANDARDS[poeResult.highestStandard].commonName})
• Recommended Switch Sizing (w/ 20% Headroom): ${poeResult.recommendedBudgetWithHeadroomWatts} Watts
• Estimated Total Copper Cable Heat Dissipation: ~${poeResult.totalCopperCableHeatLossWatts.toFixed(1)} Watts (${cableResult.cableI2RHeatWatts.toFixed(2)} W per active run)

3. CABLE MATERIAL COST & BULK SPOOL ESTIMATE:
• Total Horizontal Cable (All Runs): ${materialCostResult.totalCableMeters.toFixed(1)} m (~${materialCostResult.totalCableFeet.toFixed(0)} ft) across ${materialCostResult.totalRunsCount} physical runs
• Unit Material Rate: ${materialCostResult.isCostConfigured ? `${costCurrency}${materialCostResult.unitCost.toFixed(2)} / meter` : 'Optional / Not configured'}
• Base Raw Material Cost: ${materialCostResult.isCostConfigured ? `${costCurrency}${materialCostResult.baseCost.toFixed(2)}` : 'N/A'}
• Total Cost (+10% Service Loop Slack): ${materialCostResult.isCostConfigured ? `${costCurrency}${materialCostResult.totalWithSlackCost.toFixed(2)} (${materialCostResult.totalWithSlackMeters.toFixed(1)} m total)` : 'N/A'}
• Standard 305m (1,000 ft) Pull Boxes Needed: ${materialCostResult.standard305mBoxes} ${materialCostResult.standard305mBoxes === 1 ? 'Box' : 'Boxes'} (~${materialCostResult.standard305mBoxes * 305} m spool stock)

4. CONNECTED DEVICE INVENTORY:
${deviceRows.map((d, i) => `  ${i + 1}. ${d.name}: ${d.qty}x @ ${d.wattsEach}W (${d.classKey}) = ${(d.qty * d.wattsEach).toFixed(1)}W [Run: ${d.estCableLengthM}m | Total: ${d.qty * d.estCableLengthM}m${materialCostResult.isCostConfigured ? ` | Cost: ${costCurrency}${(d.qty * d.estCableLengthM * materialCostResult.unitCost).toFixed(2)}` : ''}]`).join('\n')}
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
      ['Conductor Material Quality', cableResult.condSpec.name, cableResult.condSpec.tiaCompliant ? 'TIA Compliant' : 'NON-TIA COMPLIANT (CCA Fire Risk)'],
      ['Operating Ambient Temperature', `${ambientTempC} °C`, `${Math.round(ambientTempC * 1.8 + 32)} °F (TIA Ref: 20 °C)`],
      ['Target Link Speed', linkSpeed, 'Ethernet signaling speed'],
      ['Configured Channel Run Length', `${lengthMeters.toFixed(1)} m`, `${lengthFeet.toFixed(1)} ft`],
      ['Maximum Certified Limit', cableResult.maxDistM > 0 ? `${cableResult.maxDistM} m` : 'Not Rated', `${cableResult.maxDistFt.toFixed(1)} ft`],
      ['Compliance Status', cableResult.status.toUpperCase(), cableResult.isWithinLimit ? 'Within standard limit' : `Exceeds by ${cableResult.overMeters.toFixed(1)} m`],
      ['Permanent Link (In-Wall/Solid)', `${cableResult.estPermanentLinkM.toFixed(1)} m`, 'Standard max limit is 90 m'],
      ['Patch Cords Total (Stranded)', `${cableResult.estPatchCordM.toFixed(1)} m`, 'Standard max limit is 10 m combined'],
      ['Effective Copper DC Loop Resistance', `${cableResult.effectiveLoopRes.toFixed(1)} Ohms`, `Base 20°C: ${cableResult.loopResistanceOhms.toFixed(1)} Ohms`],
      ['Thermal Attenuation Derating Penalty', `+${(cableResult.tempAttenDeratingPct * 100).toFixed(1)}%`, `Effective Run Attenuation: -${cableResult.effectiveRunAttenDb.toFixed(1)} dB`],
      ['Characteristic Impedance Shift (Z0)', `${cableResult.effectiveZ0.toFixed(1)} Ohms`, `Nominal 100 Ohms (Shift +${cableResult.impedanceShiftOhms.toFixed(1)} Ohms)`],
      ['Return Loss (RL) & Signal Reflection', `${cableResult.returnLossDb.toFixed(1)} dB`, `Reflection: ${cableResult.signalReflectionPct.toFixed(2)}% [Status: ${cableResult.returnLossStatus.toUpperCase()}]`],
      ['Estimated One-Way Propagation Delay', `${cableResult.oneWayLatencyNs.toFixed(1)} ns`, 'Nominal velocity of propagation ~0.67c'],
      ['Bundle Alien Crosstalk Warning', isBundledCrosstalk ? 'Active (Derated to 37m for Cat6 10G)' : 'Standard / Low risk', ''],
      [],
      ['2. SWITCH POE POWER BUDGET & MATERIAL EXPENDITURE AUDIT'],
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
      ['Total Horizontal Cable (All Runs)', `${materialCostResult.totalCableMeters.toFixed(1)} m`, `~${materialCostResult.totalCableFeet.toFixed(0)} ft across ${materialCostResult.totalRunsCount} physical runs`],
      ['Cable Material Cost per Meter', materialCostResult.isCostConfigured ? `${costCurrency}${materialCostResult.unitCost.toFixed(2)} / m` : 'Optional / Not configured', 'Direct unit purchase price'],
      ['Total Cable Material Cost', materialCostResult.isCostConfigured ? `${costCurrency}${materialCostResult.baseCost.toFixed(2)}` : 'N/A', 'Base raw length material cost'],
      ['Total Cost (+10% Slack Buffer)', materialCostResult.isCostConfigured ? `${costCurrency}${materialCostResult.totalWithSlackCost.toFixed(2)}` : 'N/A', `Includes 10% service loop buffer (${materialCostResult.totalWithSlackMeters.toFixed(1)}m total)`],
      ['Standard 305m (1000 ft) Pull Boxes', `${materialCostResult.standard305mBoxes} Boxes`, `Commercial 305m pull-box stock (~${materialCostResult.standard305mBoxes * 305}m)`],
      [],
      ['3. CONNECTED POE DEVICE INVENTORY & CABLE USAGE'],
      ['Device Description', 'Quantity', 'PoE Class', 'Port Output (W)', 'Total Load (W)', 'Run Dist (m)', 'Total Cable (m)', 'Run Compliance', 'Cable Material Cost', 'Est. Cable Heat Loss (W)', 'Power at Device (W)'],
      ...poeResult.deviceBreakdowns.map(dev => [
        dev.name,
        dev.qty,
        dev.classKey,
        dev.effectiveWattsEach.toFixed(1),
        dev.subtotalWatts.toFixed(1),
        `${dev.estCableLengthM} m`,
        `${dev.rowTotalLengthM} m`,
        dev.estCableLengthM <= 90 ? 'Compliant (<=90m)' : dev.estCableLengthM <= 100 ? 'Marginal (90-100m)' : 'Non-Compliant (>100m)',
        materialCostResult.isCostConfigured ? `${costCurrency}${(dev.rowTotalLengthM * materialCostResult.unitCost).toFixed(2)}` : '—',
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
        `${materialCostResult.totalCableMeters.toFixed(1)} m`,
        deviceRows.some(d => d.estCableLengthM > 100) ? 'NON-COMPLIANT' : deviceRows.some(d => d.estCableLengthM > 90) ? 'MARGINAL' : 'COMPLIANT',
        materialCostResult.isCostConfigured ? `${costCurrency}${materialCostResult.baseCost.toFixed(2)}` : '—',
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
  // PDF Export Engine - Professional Engineering Specification
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
      // PAGE 1: ENGINEERING AUDIT SPECIFICATION
      // ==========================================

      // Top Navy Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.roundedRect(14, 10, 182, 22, 2.5, 2.5, 'F');

      // Accent Left Sky Stripe
      doc.setFillColor(56, 189, 248); // sky-400
      doc.roundedRect(14, 10, 3.5, 22, 1.5, 1.5, 'F');

      // Title & Subtitle
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.text('ETHERNET CABLE & POE POWER AUDIT SPECIFICATION', 21, 18);

      doc.setTextColor(203, 213, 225);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Certified Cabling Distance, PoE Power Budget & Material Expenditure Engineering Report', 21, 24);

      // Meta Header
      doc.setFontSize(7.2);
      doc.text(`Generated: ${dateStr}`, 192, 17, { align: 'right' });
      doc.setTextColor(56, 189, 248);
      doc.text('jawed.co.in/tools', 192, 23, { align: 'right' });

      // Highlight KPI Cards (3 boxes across)
      const cardY = 35;
      const cardH = 20;
      const cardW = 58;

      // Card 1: Cable Run Status
      const isCablePass = cableResult.isWithinLimit;
      const isCableMarginal = cableResult.status === 'marginal';
      doc.setFillColor(isCablePass && !isCableMarginal ? 240 : isCableMarginal ? 255 : 254, isCablePass && !isCableMarginal ? 253 : isCableMarginal ? 251 : 242, isCablePass && !isCableMarginal ? 244 : isCableMarginal ? 235 : 242);
      doc.setDrawColor(isCablePass && !isCableMarginal ? 187 : isCableMarginal ? 253 : 254, isCablePass && !isCableMarginal ? 247 : isCableMarginal ? 230 : 202, isCablePass && !isCableMarginal ? 208 : isCableMarginal ? 138 : 202);
      doc.roundedRect(14, cardY, cardW, cardH, 2, 2, 'FD');

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text('CABLE RUN CERTIFICATION', 18, cardY + 5);

      doc.setTextColor(isCablePass && !isCableMarginal ? 5 : isCableMarginal ? 217 : 225, isCablePass && !isCableMarginal ? 150 : isCableMarginal ? 119 : 29, isCablePass && !isCableMarginal ? 105 : isCableMarginal ? 6 : 72);
      doc.setFontSize(11.5);
      doc.text(
        cableResult.isSupported
          ? cableResult.isWithinLimit
            ? isCableMarginal
              ? 'MARGINAL RUN'
              : 'PASS - CERTIFIED'
            : 'FAIL - TOO LONG'
          : 'CHECK CABLE STANDARD',
        18,
        cardY + 12
      );

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.text(
        cableResult.isSupported
          ? `${lengthMeters.toFixed(1)}m of ${cableResult.maxDistM}m limit (${cableCategory} @ ${linkSpeed})`
          : `Speed Unrated (${cableCategory} cannot carry ${linkSpeed})`,
        18,
        cardY + 17
      );

      // Card 2: PoE Budget Utilization
      const isPoeOk = poeResult.status === 'ok';
      const isPoeTight = poeResult.status === 'tight';
      doc.setFillColor(isPoeOk ? 240 : isPoeTight ? 255 : 254, isPoeOk ? 253 : isPoeTight ? 251 : 242, isPoeOk ? 244 : isPoeTight ? 235 : 242);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(76, cardY, cardW, cardH, 2, 2, 'FD');

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text('SWITCH POE UTILIZATION', 80, cardY + 5);

      doc.setTextColor(isPoeOk ? 5 : isPoeTight ? 217 : 225, isPoeOk ? 150 : isPoeTight ? 119 : 29, isPoeOk ? 105 : isPoeTight ? 6 : 72);
      doc.setFontSize(11.5);
      doc.text(`${poeResult.totalRequestedWatts.toFixed(1)} W / ${switchBudgetWatts} W`, 80, cardY + 12);

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.text(`${poeResult.utilizationPct.toFixed(0)}% Load · ${poeResult.remainingBudgetWatts >= 0 ? `+${poeResult.remainingBudgetWatts.toFixed(1)}W Surplus` : `${poeResult.remainingBudgetWatts.toFixed(1)}W Deficit`}`, 80, cardY + 17);

      // Card 3: Switch Ports & Material Summary
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(138, cardY, cardW, cardH, 2, 2, 'FD');

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text('POE PORTS & CABLE RUNS', 142, cardY + 5);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11.5);
      doc.text(`${poeResult.totalPortsUsed} / ${switchPortsCount} Ports`, 142, cardY + 12);

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.text(`Total Cable: ${materialCostResult.totalCableMeters.toFixed(0)}m${materialCostResult.isCostConfigured ? ` · ${costCurrency}${materialCostResult.baseCost.toFixed(0)}` : ''}`, 142, cardY + 17);

      // SECTION 1: Cable Channel Verification Table
      let curY = 59;
      const rowH = 5.3;

      doc.setFillColor(15, 23, 42);
      doc.rect(14, curY, 182, 5.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('1. STRUCTURED CABLING & CHANNEL LENGTH SPECIFICATION', 17, curY + 3.8);

      const cableItems = [
        ['Cable Category & Standard', `${cableCategory} (${cableResult.spec.standard})`, `Bandwidth: ${cableResult.spec.maxFreqMHz} MHz · Shielding: ${cableResult.spec.shielding}`],
        ['Target Ethernet Link Speed', `${linkSpeed}`, 'Physical layer signaling throughput'],
        ['Total Channel Length Tested', `${lengthMeters.toFixed(1)} m (${lengthFeet.toFixed(1)} ft)`, 'Combined permanent horizontal run + patch cords total'],
        ['Certified Standard Limit', cableResult.maxDistM > 0 ? `${cableResult.maxDistM} m (${cableResult.maxDistFt.toFixed(1)} ft)` : 'Not Supported', cableResult.isSupported ? `${cableResult.headroomPct >= 0 ? `${cableResult.headroomPct.toFixed(1)}% Headroom remaining` : `${cableResult.overMeters.toFixed(1)}m Exceeds standard limit`}` : 'Speed unrated on category'],
        ['Permanent In-Wall Solid Run', `${cableResult.estPermanentLinkM.toFixed(1)} m`, cableResult.isPermanentLinkWarning ? 'EXCEEDS 90m PERMANENT LINK STANDARD' : 'Complies with 90m solid horizontal run limit'],
        ['Patch Cords Combined (Both Ends)', `${cableResult.estPatchCordM.toFixed(1)} m`, cableResult.isPatchCordWarning ? 'EXCEEDS 10m COMBINED PATCH CORD ALLOWANCE' : 'Within 10m stranded patch cord allowance'],
        ['Loop DC Resistance & Delay', `~${cableResult.loopResistanceOhms.toFixed(1)} Ohms`, `One-way latency: ~${cableResult.oneWayLatencyNs.toFixed(1)} ns · Pure copper conductors`],
      ];

      curY += 5.5;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
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
        doc.setFontSize(6.8);
        doc.setTextColor(71, 85, 105);
        doc.text(item[0], 17, itemY + 3.8);

        doc.setTextColor(15, 23, 42);
        doc.text(item[1], 75, itemY + 3.8);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(item[2], 122, itemY + 3.8);
      });

      // SECTION 2: Switch PoE Power Budget Table
      curY += cableItems.length * rowH + 5;
      doc.setFillColor(15, 23, 42);
      doc.rect(14, curY, 182, 5.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('2. SWITCH POE POWER BUDGET & HEADROOM ALLOCATION', 17, curY + 3.8);

      const poeItems = [
        ['Switch Total PoE Budget', `${switchBudgetWatts} Watts`, 'Datasheet rated power supply capacity'],
        ['Total Requested Device Load', `${poeResult.totalRequestedWatts.toFixed(1)} Watts`, 'Sum of class power reserved by all connected devices'],
        ['Remaining Switch Power Reserve', `${poeResult.remainingBudgetWatts >= 0 ? `+${poeResult.remainingBudgetWatts.toFixed(1)} W` : `${poeResult.remainingBudgetWatts.toFixed(1)} W`}`, poeResult.remainingBudgetWatts >= 0 ? 'Surplus buffer available for future expansion' : 'CRITICAL DEFICIT - EXCEEDS SWITCH POWER CAPACITY'],
        ['Power Budget Utilization', `${poeResult.utilizationPct.toFixed(1)}%`, poeResult.utilizationPct <= 80 ? 'Optimal (Maintains recommended 80% planning habit)' : 'Warning (Continuous load exceeds 80% threshold)'],
        ['Switch PoE Port Allocation', `${poeResult.totalPortsUsed} of ${switchPortsCount} Ports`, `${poeResult.availablePortsRemaining >= 0 ? `${poeResult.availablePortsRemaining} unused PoE switch ports remaining` : `Exceeds port capacity by ${Math.abs(poeResult.availablePortsRemaining)} ports`}`],
        ['Required Switch Port Standard', POE_STANDARDS[poeResult.highestStandard].name, `Minimum ${POE_STANDARDS[poeResult.highestStandard].commonName} (${POE_STANDARDS[poeResult.highestStandard].maxPseWatts}W port power required)`],
        ['Recommended Sized Switch Budget', `${poeResult.recommendedBudgetWithHeadroomWatts} Watts`, 'Calculated with 20% safety headroom for IR/motor startup spikes'],
      ];

      curY += 5.5;
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
        doc.setFontSize(6.8);
        doc.setTextColor(71, 85, 105);
        doc.text(item[0], 17, itemY + 3.8);

        doc.setTextColor(15, 23, 42);
        doc.text(item[1], 75, itemY + 3.8);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(item[2], 122, itemY + 3.8);
      });

      // SECTION 3: Device Inventory Table
      curY += poeItems.length * rowH + 5;
      doc.setFillColor(15, 23, 42);
      doc.rect(14, curY, 182, 5.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('3. CONNECTED POE DEVICE INVENTORY & CABLE USAGE AUDIT', 17, curY + 3.8);

      curY += 5.5;
      const devH = 5.2;
      // Header row
      doc.setFillColor(241, 245, 249);
      doc.rect(14, curY, 182, 5.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.4);
      doc.setTextColor(71, 85, 105);
      doc.text('DEVICE DESCRIPTION', 17, curY + 3.8);
      doc.text('QTY', 70, curY + 3.8);
      doc.text('POE CLASS', 82, curY + 3.8);
      doc.text('WATTS EA', 105, curY + 3.8);
      doc.text('TOTAL W', 123, curY + 3.8);
      doc.text('RUN (M)', 141, curY + 3.8);
      doc.text('TOTAL RUN', 157, curY + 3.8);
      doc.text('STATUS', 178, curY + 3.8);

      curY += 5.5;
      poeResult.deviceBreakdowns.forEach((dev, idx) => {
        const itemY = curY + idx * devH;
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, itemY, 182, devH, 'F');
        }
        doc.setDrawColor(241, 245, 249);
        doc.line(14, itemY + devH, 196, itemY + devH);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.4);
        doc.setTextColor(15, 23, 42);
        const nameTrunc = dev.name.length > 32 ? dev.name.substring(0, 30) + '...' : dev.name;
        doc.text(nameTrunc, 17, itemY + 3.6);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(String(dev.qty), 72, itemY + 3.6);
        doc.text(dev.classKey.split(' ')[0] + ' ' + dev.classKey.split(' ')[1], 82, itemY + 3.6);
        doc.text(`${dev.effectiveWattsEach.toFixed(1)}W`, 105, itemY + 3.6);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 132, 199);
        doc.text(`${dev.subtotalWatts.toFixed(1)}W`, 123, itemY + 3.6);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(`${dev.estCableLengthM}m`, 142, itemY + 3.6);
        doc.text(`${dev.rowTotalLengthM}m`, 158, itemY + 3.6);

        // Status Tag
        const isPass = dev.estCableLengthM <= 90;
        const isMarg = dev.estCableLengthM > 90 && dev.estCableLengthM <= 100;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(isPass ? 5 : isMarg ? 217 : 225, isPass ? 150 : isMarg ? 119 : 29, isPass ? 105 : isMarg ? 6 : 72);
        doc.text(isPass ? 'COMPLIANT' : isMarg ? 'MARGINAL' : 'FAIL (>100m)', 178, itemY + 3.6);
      });

      // Summary Totals Row
      curY += poeResult.deviceBreakdowns.length * devH;
      doc.setFillColor(240, 249, 255);
      doc.rect(14, curY, 182, 5.5, 'F');
      doc.setDrawColor(56, 189, 248);
      doc.line(14, curY, 196, curY);
      doc.line(14, curY + 5.5, 196, curY + 5.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.4);
      doc.setTextColor(15, 23, 42);
      doc.text('TOTAL ALL DEVICES', 17, curY + 3.8);
      doc.text(`${poeResult.totalPortsUsed}`, 72, curY + 3.8);
      doc.text(POE_STANDARDS[poeResult.highestStandard].commonName, 82, curY + 3.8);
      doc.text('—', 105, curY + 3.8);
      doc.setTextColor(2, 132, 199);
      doc.text(`${poeResult.totalRequestedWatts.toFixed(1)}W`, 123, curY + 3.8);
      doc.setTextColor(15, 23, 42);
      doc.text('—', 142, curY + 3.8);
      doc.text(`${materialCostResult.totalCableMeters.toFixed(0)}m`, 158, curY + 3.8);
      const anyOver = deviceRows.some(d => d.estCableLengthM > 100);
      const anyMarg = deviceRows.some(d => d.estCableLengthM > 90);
      doc.setTextColor(anyOver ? 225 : anyMarg ? 217 : 5, anyOver ? 29 : anyMarg ? 119 : 150, anyOver ? 72 : anyMarg ? 6 : 105);
      doc.text(anyOver ? 'FAIL' : anyMarg ? 'MARGINAL' : 'ALL PASS', 178, curY + 3.8);

      // SECTION 4: Project Material Cost & Bulk Spool Sizing
      curY += 9;
      doc.setFillColor(15, 23, 42);
      doc.rect(14, curY, 182, 5.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('4. PROJECT CABLE MATERIAL ESTIMATE & BULK SPOOL REQUIREMENTS', 17, curY + 3.8);

      const matItems = [
        ['Total Horizontal Cable Length', `${materialCostResult.totalCableMeters.toFixed(1)} m (${materialCostResult.totalCableFeet.toFixed(0)} ft)`, `Across ${materialCostResult.totalRunsCount} physical camera and equipment runs`],
        ['Material Cost Rate per Meter', materialCostResult.isCostConfigured ? `${costCurrency}${materialCostResult.unitCost.toFixed(2)} / meter` : 'Optional / Not configured', 'Direct unit purchase rate for bulk solid copper cable'],
        ['Total Raw Material Cost', materialCostResult.isCostConfigured ? `${costCurrency}${materialCostResult.baseCost.toFixed(2)}` : 'N/A', 'Base raw length material expenditure'],
        ['Total Cost (+10% Slack Buffer)', materialCostResult.isCostConfigured ? `${costCurrency}${materialCostResult.totalWithSlackCost.toFixed(2)}` : 'N/A', `Includes 10% service loop and termination buffer (${materialCostResult.totalWithSlackMeters.toFixed(0)}m total)`],
        ['Commercial 305m (1000 ft) Pull Boxes', `${materialCostResult.standard305mBoxes} ${materialCostResult.standard305mBoxes === 1 ? 'Box' : 'Boxes'} (~${materialCostResult.standard305mBoxes * 305} m spool stock)`, 'Standard commercial spool box packaging requirements'],
      ];

      curY += 5.5;
      doc.setFillColor(255, 255, 255);
      doc.rect(14, curY, 182, matItems.length * rowH, 'FD');

      matItems.forEach((item, idx) => {
        const itemY = curY + idx * rowH;
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, itemY, 182, rowH, 'F');
        }
        doc.setDrawColor(241, 245, 249);
        doc.line(14, itemY + rowH, 196, itemY + rowH);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(71, 85, 105);
        doc.text(item[0], 17, itemY + 3.8);

        doc.setTextColor(15, 23, 42);
        doc.text(item[1], 75, itemY + 3.8);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(item[2], 122, itemY + 3.8);
      });

      // SECTION 5: Engineering Verdict & Installation Best Practices
      curY += matItems.length * rowH + 5;
      const isOverallPass = cableResult.isWithinLimit && poeResult.status === 'ok' && !deviceRows.some(d => d.estCableLengthM > 100);
      const isOverallTight = !isOverallPass && poeResult.status === 'tight' && cableResult.isWithinLimit && !deviceRows.some(d => d.estCableLengthM > 100);

      doc.setFillColor(isOverallPass ? 240 : isOverallTight ? 255 : 254, isOverallPass ? 253 : isOverallTight ? 251 : 242, isOverallPass ? 244 : isOverallTight ? 235 : 242);
      doc.setDrawColor(isOverallPass ? 16 : isOverallTight ? 245 : 244, isOverallPass ? 185 : isOverallTight ? 158 : 63, isOverallPass ? 129 : isOverallTight ? 11 : 94);
      doc.roundedRect(14, curY, 182, 22, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(isOverallPass ? 5 : isOverallTight ? 217 : 225, isOverallPass ? 150 : isOverallTight ? 119 : 29, isOverallPass ? 105 : isOverallTight ? 6 : 72);
      doc.text(
        !cableResult.isSupported
          ? `SYSTEM ENGINEERING VERDICT: CHECK CABLE STANDARD - ${cableCategory.toUpperCase()} CANNOT CARRY ${linkSpeed}`
          : isOverallPass
          ? 'SYSTEM ENGINEERING VERDICT: FULLY COMPLIANT WITH TIA-568-D & IEEE 802.3'
          : isOverallTight
          ? 'SYSTEM ENGINEERING VERDICT: MARGINAL / HIGH UTILIZATION NOTICE (>80%)'
          : 'SYSTEM ENGINEERING VERDICT: NON-COMPLIANT SPECIFICATION (ACTION REQUIRED)',
        18,
        curY + 5
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.4);
      doc.setTextColor(71, 85, 105);
      doc.text('• Cable Distance Limit: TIA/ISO channel maximum is 100m total (<=90m permanent solid horizontal + <=10m patch cords).', 18, curY + 9.5);
      doc.text('• PoE Power Budgeting: Maintain continuous load <=80% of switch capacity to absorb night IR illuminator and PTZ motor spikes.', 18, curY + 13.5);
      doc.text('• Pure Copper Conductor Standard: Never use Copper-Clad Aluminium (CCA) for PoE; CCA causes severe thermal rise and voltage drop.', 18, curY + 17.5);

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

  // -------------------------------------------------------------
  // JSON CONFIGURATION BACKUP EXPORT & IMPORT ENGINE
  // -------------------------------------------------------------
  const handleExportJson = () => {
    const timestamp = new Date().toISOString();
    const dateStamp = timestamp.split('T')[0];

    const backupData = {
      schemaVersion: '1.0',
      exportedAt: timestamp,
      appName: 'Cable Length & PoE Budget Checker',
      cableConfig: {
        cableCategory,
        linkSpeed,
        channelLength,
        lengthUnit,
        isBundledCrosstalk,
        bundleSize,
        permanentLinkPct,
        conductorType,
        ambientTempC,
        costPerMeter: typeof costPerMeter === 'number' ? costPerMeter : 0,
        costCurrency,
        includeSlackBuffer,
      },
      poeConfig: {
        selectedSwitchSeriesId,
        selectedVendor,
        useSecondaryPsu,
        switchBudgetWatts,
        switchPortsCount,
        deviceRows,
      },
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `poe-cable-config-backup-${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportedJson(true);
    setTimeout(() => setExportedJson(false), 2500);
  };

  const handleTriggerImportJson = () => {
    setJsonImportError(null);
    if (jsonFileInputRef.current) {
      jsonFileInputRef.current.click();
    }
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON structure. File must be a JSON object.');
        }

        const cableConfig = parsed.cableConfig || parsed;
        const poeConfig = parsed.poeConfig || parsed;

        // Restore Cable Config
        if (cableConfig.cableCategory && CABLE_SPECS[cableConfig.cableCategory as CableCategory]) {
          setCableCategory(cableConfig.cableCategory as CableCategory);
        }
        if (cableConfig.linkSpeed) {
          setLinkSpeed(cableConfig.linkSpeed as LinkSpeed);
        }
        if (typeof cableConfig.channelLength === 'number' && cableConfig.channelLength > 0) {
          setChannelLength(cableConfig.channelLength);
        }
        if (cableConfig.lengthUnit === 'm' || cableConfig.lengthUnit === 'ft') {
          setLengthUnit(cableConfig.lengthUnit);
        }
        if (typeof cableConfig.isBundledCrosstalk === 'boolean') {
          setIsBundledCrosstalk(cableConfig.isBundledCrosstalk);
        }
        if (typeof cableConfig.bundleSize === 'number' && cableConfig.bundleSize > 0) {
          setBundleSize(cableConfig.bundleSize);
        }
        if (typeof cableConfig.permanentLinkPct === 'number') {
          setPermanentLinkPct(cableConfig.permanentLinkPct);
        }
        if (cableConfig.conductorType && CONDUCTOR_SPECS[cableConfig.conductorType as ConductorType]) {
          setConductorType(cableConfig.conductorType as ConductorType);
        }
        if (typeof cableConfig.ambientTempC === 'number') {
          setAmbientTempC(cableConfig.ambientTempC);
        }
        if (typeof cableConfig.costPerMeter === 'number') {
          setCostPerMeter(cableConfig.costPerMeter);
        }
        if (typeof cableConfig.costCurrency === 'string') {
          setCostCurrency(cableConfig.costCurrency);
        }
        if (typeof cableConfig.includeSlackBuffer === 'boolean') {
          setIncludeSlackBuffer(cableConfig.includeSlackBuffer);
        }

        // Restore PoE Config
        if (poeConfig.selectedSwitchSeriesId) {
          const matchedModel = SWITCH_SERIES_MODELS.find(m => m.id === poeConfig.selectedSwitchSeriesId);
          if (matchedModel) {
            setSelectedSwitchSeriesId(poeConfig.selectedSwitchSeriesId);
            setSelectedVendor(matchedModel.vendorId);
          }
        }
        if (typeof poeConfig.useSecondaryPsu === 'boolean') {
          setUseSecondaryPsu(poeConfig.useSecondaryPsu);
        }
        if (typeof poeConfig.switchBudgetWatts === 'number' && poeConfig.switchBudgetWatts > 0) {
          setSwitchBudgetWatts(poeConfig.switchBudgetWatts);
        }
        if (typeof poeConfig.switchPortsCount === 'number' && poeConfig.switchPortsCount > 0) {
          setSwitchPortsCount(poeConfig.switchPortsCount);
        }
        if (Array.isArray(poeConfig.deviceRows) && poeConfig.deviceRows.length > 0) {
          setDeviceRows(
            poeConfig.deviceRows.map((d: any, idx: number) => ({
              id: d.id || `imported-dev-${idx}-${Date.now()}`,
              name: d.name || `Device ${idx + 1}`,
              qty: typeof d.qty === 'number' && d.qty > 0 ? d.qty : 1,
              classKey: d.classKey || 'Class 3 (15.4 W)',
              wattsEach: typeof d.wattsEach === 'number' && d.wattsEach >= 0 ? d.wattsEach : 15.4,
              estCableLengthM: typeof d.estCableLengthM === 'number' && d.estCableLengthM >= 0 ? d.estCableLengthM : 50,
            }))
          );
        }

        setJsonImportError(null);
        setImportedJson(true);
        setTimeout(() => setImportedJson(false), 2500);
      } catch (err: any) {
        setJsonImportError(err.message || 'Failed to parse JSON backup file.');
      } finally {
        e.target.value = '';
      }
    };

    reader.readAsText(file);
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {!isOnline && (
              <span
                className="no-print"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: 'var(--amber)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                }}
                title="Operating offline from Service Worker cache"
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--amber)' }} />
                Offline Mode Active
              </span>
            )}

            {isInstallable && (
              <button
                type="button"
                className="no-print"
                onClick={install}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '8px',
                  background: 'var(--emerald)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                }}
                title="Install app locally for offline data center access"
              >
                <Download className="w-3.5 h-3.5" />
                Install Offline App
              </button>
            )}

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
        </div>

        <h1 style={{ margin: '6px 0 10px', fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontWeight: 800 }}>
          Cable Length &amp; PoE Budget Checker
        </h1>

        {/* Remote Data Center Offline Banner */}
        {!isOnline && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              marginTop: '10px',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              fontSize: '0.84rem',
              color: 'var(--amber)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>Remote Data Center Offline Mode Active:</strong> Operating without internet access. All cable calculations, D3.js heatmaps, PDF generation, and CSV exports execute 100% locally from service worker precache.
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
              100% Offline Ready
            </span>
          </div>
        )}

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
        {/* Global Length Unit Selector & Preset Scenarios */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg)', padding: '3px 6px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-heading)', paddingRight: '4px' }}>
              Length Unit:
            </span>
            <button
              type="button"
              onClick={() => handleToggleLengthUnit('m')}
              style={{
                padding: '3px 10px',
                fontSize: '0.78rem',
                borderRadius: '6px',
                background: lengthUnit === 'm' ? 'var(--accent)' : 'transparent',
                color: lengthUnit === 'm' ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: lengthUnit === 'm' ? 800 : 500,
                transition: 'all 0.15s ease',
              }}
              title="Toggle all channel length inputs and calculations to Meters (m)"
            >
              Meters (m)
            </button>
            <button
              type="button"
              onClick={() => handleToggleLengthUnit('ft')}
              style={{
                padding: '3px 10px',
                fontSize: '0.78rem',
                borderRadius: '6px',
                background: lengthUnit === 'ft' ? 'var(--accent)' : 'transparent',
                color: lengthUnit === 'ft' ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: lengthUnit === 'ft' ? 800 : 500,
                transition: 'all 0.15s ease',
              }}
              title="Toggle all channel length inputs and calculations to Feet (ft)"
            >
              Feet (ft)
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
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
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="button button-secondary"
            onClick={handleExportJson}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            title="Export current PoE load configuration and cable analysis to a JSON backup file"
          >
            {exportedJson ? <Check className="w-4 h-4 text-emerald-400" /> : <Package className="w-4 h-4 text-amber-400" />}
            {exportedJson ? 'Exported JSON!' : 'Export JSON'}
          </button>

          <button
            type="button"
            className="button button-secondary"
            onClick={handleTriggerImportJson}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            title="Import PoE load configuration and cable settings from a backup JSON file"
          >
            {importedJson ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4 text-sky-400" />}
            {importedJson ? 'Imported JSON!' : 'Import JSON'}
          </button>

          <input
            ref={jsonFileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportJsonFile}
            style={{ display: 'none' }}
          />

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
            className="button button-primary"
            onClick={handleExportPdf}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700 }}
            title="Generate and download formatted PDF engineering specification report"
          >
            {exportedPdf ? <Check className="w-4 h-4 text-emerald-200" /> : <FileText className="w-4 h-4 text-rose-200" />}
            {exportedPdf ? 'PDF Downloaded!' : 'Download PDF Summary'}
          </button>
          <button
            type="button"
            className="button button-secondary no-print"
            onClick={handlePrint}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            title="Download or Print calculation report as PDF"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            Download as PDF
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

      {/* JSON Import Notification Alerts */}
      {jsonImportError && (
        <div
          className="no-print"
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            color: 'var(--rose)',
            fontSize: '0.82rem',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span><strong>JSON Backup Import Error:</strong> {jsonImportError}</span>
          </div>
          <button
            type="button"
            onClick={() => setJsonImportError(null)}
            style={{ background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {importedJson && (
        <div
          className="no-print"
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: 'var(--emerald)',
            fontSize: '0.82rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span><strong>Configuration Successfully Restored:</strong> Imported PoE devices, switch hardware, cable category, and thermal parameters from JSON backup.</span>
        </div>
      )}

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
          {/* Interactive Cable Type Selector Section */}
          <div
            style={{
              marginBottom: '20px',
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-heading)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Cable className="w-4 h-4 text-sky-400" />
                  Cable Standard &amp; Category Selector
                </span>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                  Select Ethernet standard to verify speed &amp; distance limits
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCompareModal(true)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
              >
                <Scale className="w-3.5 h-3.5" /> Compare Standards Matrix (Cat5e - Cat8)
              </button>
            </div>

            {/* Selector Card Buttons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mb-4">
              {(['Cat5e', 'Cat6', 'Cat6a', 'Cat7', 'Cat8'] as CableCategory[]).map(cat => {
                const isActive = cableCategory === cat;
                const spec = CABLE_SPECS[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCableCategory(cat)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: isActive ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg)',
                      border: isActive ? '2px solid #38bdf8' : '1px solid var(--border)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isActive ? '0 0 12px rgba(56, 189, 248, 0.2)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: isActive ? '#38bdf8' : 'var(--text-heading)' }}>
                        {cat}
                      </span>
                      {isActive && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>
                      {spec.maxFreqMHz} MHz
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Cable Guide Tooltip Card */}
            {CABLE_TYPE_GUIDES[cableCategory] && (
              <div
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'var(--bg)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  fontSize: '0.8rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Info className="w-4 h-4" />
                      {CABLE_TYPE_GUIDES[cableCategory].title} ({CABLE_TYPE_GUIDES[cableCategory].classStandard})
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {CABLE_TYPE_GUIDES[cableCategory].internalConstruction}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    AXT Rating: {CABLE_TYPE_GUIDES[cableCategory].alienCrosstalkRating}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 my-3" style={{ background: 'var(--surface)', padding: '10px', borderRadius: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>100m MAX SPEED</span>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--text-heading)' }}>
                      {CABLE_TYPE_GUIDES[cableCategory].max100mSpeed}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>10G DISTANCE LIMIT</span>
                    <strong style={{ fontSize: '0.82rem', color: CABLE_SPECS[cableCategory].speedLimits['10G'] > 0 ? 'var(--emerald)' : 'var(--rose)' }}>
                      {CABLE_TYPE_GUIDES[cableCategory].tenGDistanceLimit}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>AWG GAUGE &amp; SHIELD</span>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--text-heading)' }}>
                      {CABLE_TYPE_GUIDES[cableCategory].awgGauge} · {CABLE_TYPE_GUIDES[cableCategory].shieldingType}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>EST. MATERIAL COST</span>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--emerald)' }}>
                      {CABLE_TYPE_GUIDES[cableCategory].avgCostPerMeter}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  <div>
                    <strong style={{ color: 'var(--text-heading)' }}>PoE Suitability:</strong> {CABLE_TYPE_GUIDES[cableCategory].poeSuitability}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-heading)' }}>Recommended Deployment:</strong> {CABLE_TYPE_GUIDES[cableCategory].recommendedFor}
                  </div>
                </div>
              </div>
            )}
          </div>

            {/* Link Speed */}
            <div>
              <label htmlFor="link-spd" style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Ethernet Link Speed</span>
                {!cableResult.isSupported && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--rose)', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <AlertTriangle className="w-3.5 h-3.5" /> Check standard
                  </span>
                )}
              </label>
              <select
                id="link-spd"
                value={linkSpeed}
                onChange={e => setLinkSpeed(e.target.value as LinkSpeed)}
                style={{
                  fontSize: '0.88rem',
                  borderColor: !cableResult.isSupported ? 'var(--rose)' : undefined,
                  background: !cableResult.isSupported ? 'rgba(239, 68, 68, 0.05)' : undefined,
                }}
              >
                <option value="100M">100 Mbps (Fast Ethernet)</option>
                <option value="1G">1 Gbps (1000BASE-T)</option>
                <option value="2.5G">2.5 Gbps (2.5GBASE-T / 802.3bz)</option>
                <option value="5G">
                  5 Gbps (5GBASE-T / 802.3bz){CABLE_SPECS[cableCategory].speedLimits['5G'] === 0 ? ' [Unsupported]' : ''}
                </option>
                <option value="10G">
                  10 Gbps (10GBASE-T){CABLE_SPECS[cableCategory].speedLimits['10G'] === 0 ? ' [Unsupported]' : ''}
                </option>
                <option value="25G">
                  25 Gbps (25GBASE-T Cat8){CABLE_SPECS[cableCategory].speedLimits['25G'] === 0 ? ' [Unsupported]' : ''}
                </option>
                <option value="40G">
                  40 Gbps (40GBASE-T Cat8){CABLE_SPECS[cableCategory].speedLimits['40G'] === 0 ? ' [Unsupported]' : ''}
                </option>
              </select>
              <div style={{ fontSize: '0.74rem', color: !cableResult.isSupported ? 'var(--rose)' : 'var(--text-muted)', marginTop: '4px', fontWeight: !cableResult.isSupported ? 600 : 400 }}>
                {!cableResult.isSupported ? '⚠️ Check cable standard: Speed unsupported' : 'Target switch-to-device interface throughput'}
              </div>
            </div>

            {/* Total Channel Length & Automatic Unit Converter */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="channel-len" style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Total Channel Length ({lengthUnit === 'm' ? 'Meters' : 'Feet'})
                </label>
                {/* Automatic Unit Toggle */}
                <div style={{ display: 'flex', gap: '2px', background: 'var(--bg)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleLengthUnit('m')}
                    style={{
                      padding: '2px 8px',
                      fontSize: '0.72rem',
                      borderRadius: '4px',
                      background: lengthUnit === 'm' ? 'var(--accent)' : 'transparent',
                      color: lengthUnit === 'm' ? '#ffffff' : 'var(--text-muted)',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: lengthUnit === 'm' ? 800 : 500,
                      transition: 'all 0.15s ease',
                    }}
                    title="Toggle to Meters (m) - Converts current input automatically"
                  >
                    Meters (m)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleLengthUnit('ft')}
                    style={{
                      padding: '2px 8px',
                      fontSize: '0.72rem',
                      borderRadius: '4px',
                      background: lengthUnit === 'ft' ? 'var(--accent)' : 'transparent',
                      color: lengthUnit === 'ft' ? '#ffffff' : 'var(--text-muted)',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: lengthUnit === 'ft' ? 800 : 500,
                      transition: 'all 0.15s ease',
                    }}
                    title="Toggle to Feet (ft) - Converts current input automatically"
                  >
                    Feet (ft)
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  id="channel-len"
                  type="number"
                  step={lengthUnit === 'm' ? '0.5' : '1'}
                  min="1"
                  max={lengthUnit === 'm' ? '500' : '1640'}
                  value={channelLength}
                  onChange={e => setChannelLength(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                  style={{ fontSize: '0.88rem', flex: 1 }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent)', minWidth: '24px' }}>
                  {lengthUnit}
                </span>
              </div>

              {/* Automatic Unit Conversion Readout */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                <span>
                  Exact equivalent: <strong style={{ color: 'var(--text-heading)' }}>{lengthUnit === 'm' ? `${lengthFeet.toFixed(1)} ft` : `${lengthMeters.toFixed(1)} m`}</strong>
                </span>
                <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>
                  1 {lengthUnit === 'm' ? 'm = 3.28084 ft' : 'ft = 0.3048 m'}
                </span>
              </div>

              {/* Quick Distance Presets for Active Unit */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px', marginTop: '6px' }}>
                {lengthUnit === 'm' ? [
                  { label: '15m Short', val: 15 },
                  { label: '55m 10G', val: 55 },
                  { label: '90m Perm', val: 90 },
                  { label: '100m Max', val: 100 },
                ].map(p => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setChannelLength(p.val)}
                    style={{
                      padding: '3px 2px',
                      fontSize: '0.68rem',
                      fontWeight: Math.abs(channelLength - p.val) < 0.5 ? 800 : 500,
                      borderRadius: '4px',
                      background: Math.abs(channelLength - p.val) < 0.5 ? 'var(--accent)' : 'var(--bg)',
                      color: Math.abs(channelLength - p.val) < 0.5 ? '#ffffff' : 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {p.label}
                  </button>
                )) : [
                  { label: '50ft Short', val: 50 },
                  { label: '180ft 10G', val: 180 },
                  { label: '295ft Perm', val: 295 },
                  { label: '328ft Max', val: 328 },
                ].map(p => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setChannelLength(p.val)}
                    style={{
                      padding: '3px 2px',
                      fontSize: '0.68rem',
                      fontWeight: Math.abs(channelLength - p.val) < 1 ? 800 : 500,
                      borderRadius: '4px',
                      background: Math.abs(channelLength - p.val) < 1 ? 'var(--accent)' : 'var(--bg)',
                      color: Math.abs(channelLength - p.val) < 1 ? '#ffffff' : 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cable Bundle Size & Pathways */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="bundle-size" style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>
                  Bundle Size (Cables)
                </label>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: bundleSize >= 25 ? 'rgba(244, 63, 94, 0.2)' : bundleSize >= 12 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: bundleSize >= 25 ? 'var(--rose)' : bundleSize >= 12 ? 'var(--amber)' : 'var(--emerald)',
                    border: `1px solid ${bundleSize >= 25 ? 'rgba(244, 63, 94, 0.4)' : bundleSize >= 12 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                  }}
                  title="Estimated self-heating temperature rise inside cable bundle under PoE current"
                >
                  +{cableResult.bundleTempRiseC.toFixed(1)}°C Heat Rise
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  id="bundle-size"
                  type="number"
                  min="1"
                  max="100"
                  value={bundleSize}
                  onChange={e => setBundleSize(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ fontSize: '0.88rem', width: '65px', flexShrink: 0 }}
                />
                <input
                  type="range"
                  min="1"
                  max="96"
                  value={bundleSize}
                  onChange={e => setBundleSize(parseInt(e.target.value) || 1)}
                  style={{ flex: 1, accentColor: 'var(--accent)' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px', marginTop: '6px' }}>
                {[
                  { label: 'Single', val: 6 },
                  { label: 'Tray', val: 12 },
                  { label: 'Dense', val: 24 },
                  { label: 'Conduit', val: 48 },
                ].map(p => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setBundleSize(p.val)}
                    style={{
                      padding: '3px 2px',
                      fontSize: '0.7rem',
                      fontWeight: bundleSize === p.val ? 800 : 500,
                      borderRadius: '4px',
                      background: bundleSize === p.val ? 'var(--accent)' : 'var(--bg)',
                      color: bundleSize === p.val ? '#ffffff' : 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cable Conductor Quality (Copper vs CCA) & Environmental Thermal Degradation Calculator Panel */}
          <div
            style={{
              padding: '20px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)' }}>
                    Cable Conductor Quality (Solid Copper vs CCA) &amp; Thermal Impedance Calculator:
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Estimate signal degradation, insertion loss derating, characteristic impedance mismatch ($Z_0$), return loss ($RL$), and $I^2R$ PoE cable heating.
                </p>
              </div>

              {conductorType === 'cca' && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    background: 'rgba(244, 63, 94, 0.2)',
                    color: 'var(--rose)',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    border: '1px solid rgba(244, 63, 94, 0.4)',
                  }}
                >
                  <AlertTriangle className="w-4 h-4" /> NON-TIA COMPLIANT (CCA FIRE RISK)
                </span>
              )}
            </div>

            {/* 1. Conductor Material Selection */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)', display: 'block', marginBottom: '8px' }}>
                1. Select Cable Conductor Material Quality:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
                {(Object.keys(CONDUCTOR_SPECS) as ConductorType[]).map(cKey => {
                  const cSpec = CONDUCTOR_SPECS[cKey];
                  const isSelected = conductorType === cKey;
                  return (
                    <button
                      key={cKey}
                      type="button"
                      onClick={() => setConductorType(cKey)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: isSelected ? 'var(--surface)' : 'var(--bg)',
                        border: `2px solid ${isSelected ? (cKey === 'cca' ? 'var(--rose)' : cKey === 'stranded-copper' ? 'var(--amber)' : 'var(--emerald)') : 'var(--border)'}`,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: isSelected ? 'var(--text-heading)' : 'var(--text-muted)' }}>
                          {cSpec.shortName}
                        </span>
                        <span
                          style={{
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '10px',
                            background: cSpec.badgeBg,
                            color: cSpec.badgeColor,
                          }}
                        >
                          {cSpec.tiaCompliant ? 'TIA Compliant' : 'NON-COMPLIANT'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        {cSpec.material}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Loop Resistance: <strong>{(cSpec.resistanceMultiplier * 100).toFixed(0)}%</strong> vs Pure Cu
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Ambient Operating Temperature Controls & Presets */}
            <div style={{ marginBottom: '18px', padding: '14px', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sun className="w-4 h-4 text-amber-400" />
                  2. Ambient Operating Temperature (°C / °F):
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 900, color: ambientTempC > 40 ? 'var(--rose)' : ambientTempC > 25 ? 'var(--amber)' : 'var(--emerald)' }}>
                    {ambientTempC}°C
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    ({Math.round(ambientTempC * 1.8 + 32)}°F)
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>-20°C</span>
                <input
                  type="range"
                  min="-20"
                  max="70"
                  value={ambientTempC}
                  onChange={e => setAmbientTempC(parseInt(e.target.value) || 20)}
                  style={{ flex: 1, accentColor: ambientTempC > 40 ? 'var(--rose)' : 'var(--accent)' }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>+70°C</span>
              </div>

              {/* Temperature Preset Chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, alignSelf: 'center', marginRight: '4px' }}>
                  Quick Environment Presets:
                </span>
                {TEMP_PRESETS.map(p => (
                  <button
                    key={p.tempC}
                    type="button"
                    onClick={() => setAmbientTempC(p.tempC)}
                    style={{
                      padding: '3px 10px',
                      fontSize: '0.72rem',
                      fontWeight: ambientTempC === p.tempC ? 800 : 500,
                      borderRadius: '12px',
                      background: ambientTempC === p.tempC ? 'var(--accent)' : 'var(--bg)',
                      color: ambientTempC === p.tempC ? '#ffffff' : 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                    title={p.desc}
                  >
                    {p.label} ({p.tempC}°C)
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Real-Time Signal Degradation & Mismatch Results Dashboard */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '14px' }}>
              {/* Card A: DC Loop Resistance & Voltage Shift */}
              <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  EFFECTIVE LOOP DC RESISTANCE
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: conductorType === 'cca' ? 'var(--rose)' : 'var(--text-heading)' }}>
                  {cableResult.effectiveLoopRes.toFixed(1)} Ω
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Base 20°C: {cableResult.loopResistanceOhms.toFixed(1)} Ω · Shift: <strong style={{ color: conductorType === 'cca' ? 'var(--rose)' : 'var(--text-heading)' }}>+{(cableResult.effectiveLoopRes - cableResult.loopResistanceOhms).toFixed(1)} Ω</strong>
                </div>
              </div>

              {/* Card B: Insertion Loss & Thermal Derating */}
              <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  ATTENUATION &amp; THERMAL DERATING
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent)' }}>
                  -{cableResult.effectiveRunAttenDb.toFixed(1)} dB
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Derating: <strong style={{ color: 'var(--amber)' }}>+{(cableResult.tempAttenDeratingPct * 100).toFixed(1)}%</strong> thermal penalty
                </div>
              </div>

              {/* Card C: Impedance Mismatch & Return Loss */}
              <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  IMPEDANCE &amp; RETURN LOSS (RL)
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: cableResult.returnLossStatus === 'excellent' ? 'var(--emerald)' : cableResult.returnLossStatus === 'acceptable' ? 'var(--accent)' : cableResult.returnLossStatus === 'marginal' ? 'var(--amber)' : 'var(--rose)' }}>
                  {cableResult.returnLossDb.toFixed(1)} dB
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Z0: <strong>~{cableResult.effectiveZ0.toFixed(1)} Ω</strong> · Reflection: <strong>{cableResult.signalReflectionPct.toFixed(2)}%</strong>
                </div>
              </div>

              {/* Card D: PoE Cable Power Dissipation (I^2 R) */}
              <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  POE CABLE HEAT LOSS (I²R)
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: cableResult.cableI2RHeatWatts > 3.0 || conductorType === 'cca' ? 'var(--rose)' : 'var(--emerald)' }}>
                  ~{cableResult.cableI2RHeatWatts.toFixed(2)} W
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Voltage drop: <strong style={{ color: cableResult.effectiveVoltageDropPct > 10 ? 'var(--rose)' : 'var(--text-heading)' }}>-{cableResult.effectiveVoltageDropV.toFixed(1)} V ({cableResult.effectiveVoltageDropPct.toFixed(1)}%)</strong>
                </div>
              </div>
            </div>

            {/* CCA Detailed Warning Banner */}
            {conductorType === 'cca' && (
              <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', fontSize: '0.8rem', color: 'var(--rose)', lineHeight: 1.5 }}>
                <strong>⚠️ Warning: Copper-Clad Aluminum (CCA) Hazard Alert:</strong> CCA cable uses an aluminum core coated in a thin layer of copper. Under PoE currents (especially PoE+ 30W and PoE++ 60W/90W), CCA produces extreme I²R resistance heating, melts PVC insulation inside conduits, drops excessive DC voltage, and causes high packet error rates. CCA is explicitly prohibited under ANSI/TIA-568.2-D and National Electrical Code (NEC) building codes.
              </div>
            )}

            {/* High Temperature Warning Banner */}
            {ambientTempC > 40 && conductorType !== 'cca' && (
              <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '0.8rem', color: 'var(--amber)', lineHeight: 1.5 }}>
                <strong>☀️ Elevated Temperature Derating Notice:</strong> Operating at {ambientTempC}°C ({Math.round(ambientTempC * 1.8 + 32)}°F) increases copper conductor loop resistance by +{((cableResult.tempResistanceFactor - 1) * 100).toFixed(1)}% and insertion loss by +{(cableResult.tempAttenDeratingPct * 100).toFixed(1)}%. Under ANSI/TIA-568.2-D Annex D, maximum channel length must be derated accordingly to prevent packet retransmissions.
              </div>
            )}
          </div>

          {/* Check cable standard warning banner if selected category does not support link speed */}
          {!cableResult.isSupported && (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1.5px solid rgba(239, 68, 68, 0.5)',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                }}
              >
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--rose)' }}>
                    Check cable standard
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: 'rgba(239, 68, 68, 0.25)',
                      color: 'var(--rose)',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                    }}
                  >
                    Speed Incompatibility
                  </span>
                </div>
                <div style={{ fontSize: '0.86rem', color: 'var(--text-heading)', lineHeight: 1.5 }}>
                  The selected cable category <strong>{cableCategory}</strong> does not support <strong>{linkSpeed}</strong> under IEEE 802.3 and ANSI/TIA-568 standards. {getCableStandardRecommendation(cableCategory, linkSpeed)}
                </div>
              </div>
            </div>
          )}

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

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <span>Permanent link breakdown:</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: cableResult.isPermanentLinkWarning ? 'var(--rose)' : 'var(--emerald)' }}>
                {cableResult.isPermanentLinkWarning ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                ~{cableResult.estPermanentLinkM.toFixed(1)}m in-wall solid
              </span>
              <span>+</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: cableResult.isPatchCordWarning ? 'var(--rose)' : 'var(--emerald)' }}>
                {cableResult.isPatchCordWarning ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
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
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {cableResult.status === 'ok' && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
                  {cableResult.status === 'marginal' && <AlertTriangle className="w-6 h-6 text-amber-400" />}
                  {cableResult.status === 'over' && <XCircle className="w-6 h-6 text-rose-400" />}
                  {cableResult.status === 'unsupported' && <AlertTriangle className="w-6 h-6 text-rose-400" />}

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
                    {cableResult.status === 'unsupported' && 'Check Cable Standard'}
                  </span>

                  {/* Explicit Visual Status Pill */}
                  {cableResult.status === 'ok' ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: 'var(--emerald)',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                      }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Compliant
                    </span>
                  ) : cableResult.status === 'marginal' ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        background: 'rgba(245, 158, 11, 0.2)',
                        color: 'var(--amber)',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                      }}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" /> Marginal
                    </span>
                  ) : cableResult.status === 'unsupported' ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        background: 'rgba(244, 63, 94, 0.2)',
                        color: 'var(--rose)',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        border: '1px solid rgba(244, 63, 94, 0.4)',
                      }}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" /> Check cable standard
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        background: 'rgba(244, 63, 94, 0.2)',
                        color: 'var(--rose)',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        border: '1px solid rgba(244, 63, 94, 0.4)',
                      }}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Non-Compliant
                    </span>
                  )}
                </div>

                <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-muted)' }}>
                  {cableResult.isSupported ? (
                    <>
                      Testing <strong>{lengthMeters.toFixed(1)} m</strong> ({lengthFeet.toFixed(0)} ft) against the <strong>{cableResult.maxDistM} m</strong> ({cableResult.maxDistFt.toFixed(0)} ft) certified standard limit for <strong>{cableCategory}</strong> at <strong>{linkSpeed}</strong>.
                      {cableResult.isWithinLimit ? (
                        <span style={{ color: 'var(--emerald)', fontWeight: 700, marginLeft: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 className="w-3.5 h-3.5 inline" /> {cableResult.deltaMeters.toFixed(1)} m headroom remaining
                        </span>
                      ) : (
                        <span style={{ color: 'var(--rose)', fontWeight: 700, marginLeft: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <XCircle className="w-3.5 h-3.5 inline" /> Exceeds limit by {cableResult.overMeters.toFixed(1)} m / {cableResult.overFeet.toFixed(0)} ft
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <strong style={{ color: 'var(--rose)' }}>Check cable standard: </strong>
                      <strong>{cableCategory}</strong> is not rated or certified for <strong>{linkSpeed}</strong> speeds under ANSI/TIA-568 standards. {getCableStandardRecommendation(cableCategory, linkSpeed)}
                    </>
                  )}
                </p>
              </div>

              {/* Quick Metrics Badges with Visual Compliance Icons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ background: 'var(--surface)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>HEADROOM STATUS</div>
                  <strong style={{ fontSize: '0.88rem', color: cableResult.isSupported ? (cableResult.isWithinLimit ? 'var(--emerald)' : 'var(--rose)') : 'var(--rose)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {cableResult.isSupported ? (
                      cableResult.isWithinLimit ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    {cableResult.isSupported
                      ? cableResult.isWithinLimit
                        ? `${cableResult.deltaMeters.toFixed(1)}m Headroom`
                        : `${cableResult.overMeters.toFixed(1)}m Over`
                      : 'Check cable standard'}
                  </strong>
                </div>
                <div style={{ background: 'var(--surface)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>DC LOOP RESISTANCE</div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-heading)' }}>~{cableResult.loopResistanceOhms.toFixed(1)} Ω</strong>
                </div>
                <div style={{ background: 'var(--surface)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>ONE-WAY LATENCY</div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-heading)' }}>~{cableResult.oneWayLatencyNs.toFixed(0)} ns</strong>
                </div>
                {materialCostResult.isCostConfigured && (
                  <div style={{ background: 'var(--surface)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>RUN MATERIAL COST</div>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--emerald)' }}>
                      {costCurrency}{materialCostResult.singleRunCost.toFixed(2)}
                    </strong>
                  </div>
                )}
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
              {!cableResult.isSupported && (
                <div
                  style={{
                    color: 'var(--rose)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    background: 'rgba(244, 63, 94, 0.08)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                  }}
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Check cable standard:</strong> {cableCategory} does not support {linkSpeed} Ethernet under IEEE 802.3 standards. {getCableStandardRecommendation(cableCategory, linkSpeed)}
                  </span>
                </div>
              )}

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

            {/* Quick Action Export Buttons for Cable Run Calculation */}
            <div
              style={{
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Save calculations &amp; specifications:</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={handleExportPdf}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 14px', fontWeight: 700 }}
                  title="Generate and download formatted PDF engineering specification report"
                >
                  {exportedPdf ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Download className="w-3.5 h-3.5" />}
                  {exportedPdf ? 'PDF Downloaded!' : 'Download PDF Summary'}
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={handleExportCsv}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 12px' }}
                  title="Download raw data as CSV spreadsheet"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  Download CSV
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Visual Diagram: Signal Attenuation & DC Voltage Drop */}
          <CableDiagram cableResult={cableResult} lengthMeters={lengthMeters} lengthUnit={lengthUnit} />

          {/* Multi-Run Bundle Heatmap & Thermal Length Derating Simulator */}
          <MultiRunHeatmapSimulator
            bundleSize={bundleSize}
            ambientTempC={ambientTempC}
            conductorType={conductorType}
            cableCategory={cableCategory}
            avgWattsPerRun={
              deviceRows.length > 0
                ? deviceRows.reduce((acc, r) => acc + (r.wattsEach * r.qty), 0) / Math.max(1, deviceRows.reduce((acc, r) => acc + r.qty, 0))
                : 30.0
            }
            onChangeBundleSize={sz => setBundleSize(sz)}
            onChangeAmbientTemp={t => setAmbientTempC(t)}
          />

          {/* Dedicated Cable Selection Reference & Standards Performance Matrix */}
          <CableSelectionReference
            activeCategory={cableCategory}
            activeLinkSpeed={linkSpeed}
            activeChannelLength={channelLength}
            lengthUnit={lengthUnit}
            conductorType={conductorType}
            ambientTempC={ambientTempC}
            bundleSize={bundleSize}
            onSelectCategory={cat => setCableCategory(cat)}
          />
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

          {/* Enterprise Network Switch Series Selector Section */}
          <div
            style={{
              padding: '18px',
              borderRadius: '14px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Server className="w-4.5 h-4.5 text-sky-400" />
                  Enterprise Network Switch Series &amp; Manufacturer Selector
                </label>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Dynamically configures total power budget, port count, and per-port IEEE 802.3 standards from official datasheets.
                </div>
              </div>

              {/* Vendor Quick Filter Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(Object.keys(VENDOR_PROFILES) as NetworkVendor[]).map(vKey => {
                  const v = VENDOR_PROFILES[vKey];
                  const isSel = selectedVendor === vKey;
                  return (
                    <button
                      key={vKey}
                      type="button"
                      onClick={() => {
                        const firstForVendor = SWITCH_SERIES_MODELS.find(m => m.vendorId === vKey);
                        if (firstForVendor) {
                          handleSelectSwitchSeries(firstForVendor.id);
                        } else {
                          setSelectedVendor(vKey);
                        }
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: isSel ? 800 : 600,
                        cursor: 'pointer',
                        border: `1.5px solid ${isSel ? v.badgeColor : 'var(--border)'}`,
                        background: isSel ? 'rgba(56, 189, 248, 0.12)' : 'var(--surface)',
                        color: isSel ? 'var(--text-heading)' : 'var(--text-muted)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: v.badgeColor }} />
                      {v.shortName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Switch Series Dropdown Select */}
            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="switch-series-select" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '6px', display: 'block' }}>
                Select Enterprise Switch Series / Datasheet Model:
              </label>
              <select
                id="switch-series-select"
                value={selectedSwitchSeriesId}
                onChange={e => handleSelectSwitchSeries(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  padding: '10px 12px',
                  background: 'var(--surface)',
                  border: '1px solid #38bdf8',
                  borderRadius: '10px',
                  color: 'var(--text-heading)',
                }}
              >
                {SWITCH_SERIES_MODELS.map(m => (
                  <option key={m.id} value={m.id}>
                    [{m.vendorName}] {m.seriesName} - {m.portsCount} Ports · {m.poeBudgetWatts}W Base Budget (Max {m.maxPortWatts}W/port)
                  </option>
                ))}
              </select>
            </div>

            {/* Active Switch Series Official Datasheet Card */}
            {activeSwitchSeries && (
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: 'var(--surface)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Server className="w-4 h-4 text-sky-400" />
                      {activeSwitchSeries.seriesName}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Datasheet Model: <strong>{activeSwitchSeries.modelCode}</strong> · Switching Fabric: <strong>{activeSwitchSeries.backplaneGbps} Gbps</strong>
                    </div>
                  </div>

                  {/* Dual PSU Expansion Module Toggle */}
                  {activeSwitchSeries.hasSecondaryPsuOption && activeSwitchSeries.poeBudgetWithSecondaryPsuWatts && (
                    <button
                      type="button"
                      onClick={() => handleToggleSecondaryPsu(!useSecondaryPsu)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: useSecondaryPsu ? 'rgba(16, 185, 129, 0.18)' : 'var(--bg)',
                        color: useSecondaryPsu ? '#10b981' : 'var(--text-muted)',
                        border: `1.5px solid ${useSecondaryPsu ? '#10b981' : 'var(--border)'}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease',
                      }}
                      title={activeSwitchSeries.secondaryPsuNote}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      {useSecondaryPsu
                        ? `Dual PSU Active (${activeSwitchSeries.poeBudgetWithSecondaryPsuWatts}W)`
                        : `Expand PSU (+Secondary Module to ${activeSwitchSeries.poeBudgetWithSecondaryPsuWatts}W)`}
                    </button>
                  )}
                </div>

                {/* Specs Pill Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 my-2" style={{ background: 'var(--bg)', padding: '10px', borderRadius: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>TOTAL POE BUDGET</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--amber)' }}>
                      {switchBudgetWatts} Watts {useSecondaryPsu ? '(Dual PSU)' : ''}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>POE PORT DENSITY</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-heading)' }}>
                      {switchPortsCount} RJ45 Ports
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>MAX WATT / PORT</span>
                    <strong style={{ fontSize: '0.95rem', color: activeSwitchSeries.maxPortWatts >= 60 ? 'var(--emerald)' : '#f59e0b' }}>
                      {activeSwitchSeries.maxPortWatts}W Max ({activeSwitchSeries.maxPortWatts >= 90 ? 'Type 4 UPOE+' : activeSwitchSeries.maxPortWatts >= 60 ? 'Type 3 UPOE' : 'PoE+'})
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>POE MANAGEMENT POLICY</span>
                    <strong style={{ fontSize: '0.78rem', color: '#38bdf8' }}>
                      {activeSwitchSeries.poePolicy === 'lldp-dynamic' ? 'LLDP-MED Dynamic Negotiation' : 'Class-Max Static Reservation'}
                    </strong>
                  </div>
                </div>

                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
                  💡 <strong>Official Datasheet Spec:</strong> {activeSwitchSeries.officialDatasheetNote}
                </div>
              </div>
            )}

            {/* Overload Warnings if any connected device exceeds maxPortWatts */}
            {overloadedDevicesList.length > 0 && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: 'var(--rose)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <div>
                  <strong>Switch Model Port Capability Constraint Warning:</strong>
                  {overloadedDevicesList.map(d => (
                    <div key={d.id} style={{ marginTop: '2px' }}>
                      • Device "{d.name}" requires {d.wattsEach}W per port, but {activeSwitchSeries.seriesName} supports a maximum of {activeSwitchSeries.maxPortWatts}W per port!
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  TOTAL REQUESTED POWER
                </span>
                {poeResult.status === 'ok' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: 800, color: 'var(--emerald)' }}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Normal
                  </span>
                ) : poeResult.status === 'tight' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: 800, color: 'var(--amber)' }}>
                    <AlertTriangle className="w-3.5 h-3.5" /> High Load
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: 800, color: 'var(--rose)' }}>
                    <XCircle className="w-3.5 h-3.5" /> Overload
                  </span>
                )}
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8', margin: '4px 0 2px' }}>
                {poeResult.totalRequestedWatts.toFixed(1)} W
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Across {poeResult.totalPortsUsed} PoE device ports
              </div>
            </div>

            <div style={{ padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  REMAINING BUDGET
                </span>
                {poeResult.remainingBudgetWatts >= 0 ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: 'var(--emerald)',
                      background: 'rgba(16, 185, 129, 0.12)',
                      padding: '2px 6px',
                      borderRadius: '10px',
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Surplus
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: 'var(--rose)',
                      background: 'rgba(244, 63, 94, 0.12)',
                      padding: '2px 6px',
                      borderRadius: '10px',
                    }}
                  >
                    <XCircle className="w-3.5 h-3.5" /> Deficit
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  color: poeResult.remainingBudgetWatts >= 0 ? 'var(--emerald)' : 'var(--rose)',
                  margin: '4px 0 2px',
                }}
              >
                {poeResult.remainingBudgetWatts >= 0 ? `+${poeResult.remainingBudgetWatts.toFixed(1)} W` : `${poeResult.remainingBudgetWatts.toFixed(1)} W`}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {poeResult.remainingBudgetWatts >= 0 ? 'Available surplus wattage' : 'Deficit power shortfall'}
              </div>
            </div>

            <div style={{ padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  BUDGET UTILIZATION
                </span>
                {poeResult.utilizationPct <= 80 ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: 'var(--emerald)',
                      background: 'rgba(16, 185, 129, 0.12)',
                      padding: '2px 6px',
                      borderRadius: '10px',
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Compliant
                  </span>
                ) : poeResult.utilizationPct <= 100 ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: 'var(--amber)',
                      background: 'rgba(245, 158, 11, 0.12)',
                      padding: '2px 6px',
                      borderRadius: '10px',
                    }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Marginal
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: 'var(--rose)',
                      background: 'rgba(244, 63, 94, 0.12)',
                      padding: '2px 6px',
                      borderRadius: '10px',
                    }}
                  >
                    <XCircle className="w-3.5 h-3.5" /> Over Budget
                  </span>
                )}
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
                {poeResult.utilizationPct <= 80 ? 'Optimal planning headroom (≤80%)' : poeResult.utilizationPct <= 100 ? 'Warning: Tight headroom (>80%)' : 'CRITICAL OVER-BUDGET (>100%)'}
              </div>
            </div>

            <div style={{ padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  PORT ALLOCATION
                </span>
                {!poeResult.isPortExceeded ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: 'var(--emerald)',
                      background: 'rgba(16, 185, 129, 0.12)',
                      padding: '2px 6px',
                      borderRadius: '10px',
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Pass
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: 'var(--rose)',
                      background: 'rgba(244, 63, 94, 0.12)',
                      padding: '2px 6px',
                      borderRadius: '10px',
                    }}
                  >
                    <XCircle className="w-3.5 h-3.5" /> Exceeded
                  </span>
                )}
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: !poeResult.isPortExceeded ? 'var(--text-heading)' : 'var(--rose)', margin: '4px 0 2px' }}>
                {poeResult.totalPortsUsed} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>/ {switchPortsCount}</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Min standard: <strong>{POE_STANDARDS[poeResult.highestStandard].commonName}</strong> ({POE_STANDARDS[poeResult.highestStandard].maxPseWatts}W)
              </div>
            </div>
          </div>

          {/* D3.js PoE Load Heatmap & Switch Front Panel Thermal Density */}
          <PoePortHeatmap
            switchPortsCount={switchPortsCount}
            switchBudgetWatts={switchBudgetWatts}
            deviceRows={deviceRows}
            vendor={VENDOR_PROFILES[selectedVendor]}
          />

          {/* Cable Material Cost & Bulk Spool Estimation Panel */}
          <div
            style={{
              padding: '18px 20px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)' }}>
                    Cable Material Cost &amp; Spool Estimator (Optional):
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Calculate total physical copper required across all camera/device runs, projected material cost, and 305m (1,000 ft) bulk spool box requirements.
                </p>
              </div>

              {/* Currency Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Currency:</span>
                {['$', '€', '£', '₹'].map(curr => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setCostCurrency(curr)}
                    style={{
                      padding: '2px 8px',
                      fontSize: '0.75rem',
                      borderRadius: '4px',
                      background: costCurrency === curr ? 'var(--emerald)' : 'var(--surface)',
                      color: costCurrency === curr ? '#ffffff' : 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      fontWeight: costCurrency === curr ? 800 : 500,
                    }}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Controls Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '14px',
                alignItems: 'flex-end',
                marginBottom: '16px',
                padding: '12px 14px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
              }}
            >
              {/* Cost per meter input */}
              <div>
                <label htmlFor="cost-per-meter" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '5px' }}>
                  Cable Cost per Meter ({costCurrency}/m)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                    {costCurrency}
                  </span>
                  <input
                    id="cost-per-meter"
                    type="number"
                    step="0.01"
                    min="0"
                    max="50"
                    value={costPerMeter}
                    onChange={e => {
                      const val = e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value));
                      setCostPerMeter(val);
                    }}
                    placeholder="e.g. 0.48"
                    style={{ padding: '6px 10px', fontSize: '0.88rem', width: '130px' }}
                  />
                  {costPerMeter !== '' && (
                    <button
                      type="button"
                      onClick={() => setCostPerMeter('')}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                      title="Clear cost per meter"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Category Price Presets */}
              <div>
                <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '5px' }}>
                  Typical Category Presets ({costCurrency}/m):
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Cat5e', price: 0.32 },
                    { label: 'Cat6', price: 0.48 },
                    { label: 'Cat6a', price: 0.78 },
                    { label: 'Cat7/8', price: 1.25 },
                  ].map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setCostPerMeter(p.price)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.74rem',
                        borderRadius: '6px',
                        background: costPerMeter === p.price ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg)',
                        border: `1px solid ${costPerMeter === p.price ? 'var(--emerald)' : 'var(--border)'}`,
                        color: costPerMeter === p.price ? 'var(--emerald)' : 'var(--text-heading)',
                        fontWeight: costPerMeter === p.price ? 800 : 500,
                        cursor: 'pointer',
                      }}
                      title={`Set ${p.label} typical bulk price (${costCurrency}${p.price.toFixed(2)}/m)`}
                    >
                      {p.label} ({costCurrency}{p.price.toFixed(2)})
                    </button>
                  ))}
                </div>
              </div>

              {/* 10% Service Loop / Pull Slack Option */}
              <div>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: includeSlackBuffer ? 'var(--text-heading)' : 'var(--text-muted)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={includeSlackBuffer}
                    onChange={e => setIncludeSlackBuffer(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--emerald)' }}
                  />
                  Include +10% service loop &amp; termination slack
                </label>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', paddingLeft: '24px' }}>
                  Recommended industry buffer for vertical risers &amp; drops
                </div>
              </div>
            </div>

            {/* Real-time Material Cost & Spool Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  TOTAL CABLE (ALL RUNS)
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8', margin: '3px 0 1px' }}>
                  {materialCostResult.totalCableMeters.toFixed(1)} m
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  ~{materialCostResult.totalCableFeet.toFixed(0)} ft across {materialCostResult.totalRunsCount} device runs
                </div>
              </div>

              <div style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  TOTAL MATERIAL COST
                </div>
                <div
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    color: materialCostResult.isCostConfigured ? 'var(--emerald)' : 'var(--text-muted)',
                    margin: '3px 0 1px',
                  }}
                >
                  {materialCostResult.isCostConfigured ? `${costCurrency}${materialCostResult.baseCost.toFixed(2)}` : '—'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {materialCostResult.isCostConfigured ? `Direct runs @ ${costCurrency}${materialCostResult.unitCost.toFixed(2)}/m` : 'Enter unit cost above'}
                </div>
              </div>

              <div style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  WITH 10% SLACK BUFFER
                </div>
                <div
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    color: materialCostResult.isCostConfigured ? 'var(--emerald)' : 'var(--text-muted)',
                    margin: '3px 0 1px',
                  }}
                >
                  {materialCostResult.isCostConfigured ? `${costCurrency}${materialCostResult.totalWithSlackCost.toFixed(2)}` : '—'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {materialCostResult.totalWithSlackMeters.toFixed(0)} m required pull length (+{materialCostResult.slackMeters.toFixed(0)}m)
                </div>
              </div>

              <div style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Package className="w-3.5 h-3.5 text-sky-400" />
                  305m (1000 FT) PULL BOXES
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#818cf8', margin: '3px 0 1px' }}>
                  {materialCostResult.standard305mBoxes} {materialCostResult.standard305mBoxes === 1 ? 'Box' : 'Boxes'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Standard commercial 305m spool stock
                </div>
              </div>
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
                    <th style={{ padding: '10px 12px', width: '80px' }}>Quantity</th>
                    <th style={{ padding: '10px 12px', minWidth: '150px' }}>PoE Class Standard</th>
                    <th style={{ padding: '10px 12px', width: '90px' }}>Watts Each</th>
                    <th style={{ padding: '10px 12px', width: '95px' }}>Power (W)</th>
                    <th style={{ padding: '10px 12px' }}>Device Description</th>
                    <th style={{ padding: '10px 12px', width: '80px' }}>Quantity</th>
                    <th style={{ padding: '10px 12px', minWidth: '150px' }}>PoE Class Standard</th>
                    <th style={{ padding: '10px 12px', width: '90px' }}>Watts Each</th>
                    <th style={{ padding: '10px 12px', width: '95px' }}>Power (W)</th>
                    <th style={{ padding: '10px 12px', width: '95px' }}>Run ({lengthUnit})</th>
                    <th style={{ padding: '10px 12px', width: '95px' }}>Total Cable</th>
                    <th style={{ padding: '10px 12px', width: '95px' }}>Cable Cost</th>
                    <th style={{ padding: '10px 12px', minWidth: '150px' }}>Run Compliance</th>
                    <th style={{ padding: '10px 12px', width: '80px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deviceRows.map((dev, idx) => {
                    const rowMetrics = poeResult.deviceBreakdowns[idx];
                    const rowLengthM = rowMetrics ? rowMetrics.rowTotalLengthM : (dev.qty * (lengthUnit === 'ft' ? dev.estCableLengthM * 0.3048 : dev.estCableLengthM));
                    const rowLengthDisplay = lengthUnit === 'ft' ? rowLengthM * 3.28084 : rowLengthM;
                    const rowCost = rowLengthM * materialCostResult.unitCost;
                    const devLengthM = lengthUnit === 'ft' ? dev.estCableLengthM * 0.3048 : dev.estCableLengthM;

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

                        {/* Run Distance (m/ft) */}
                        <td style={{ padding: '8px 12px' }}>
                          <input
                            type="number"
                            step={lengthUnit === 'm' ? '5' : '15'}
                            min="1"
                            max={lengthUnit === 'm' ? '150' : '500'}
                            value={dev.estCableLengthM}
                            onChange={e => handleUpdateDevice(dev.id, { estCableLengthM: Math.max(1, parseFloat(e.target.value) || 1) })}
                            style={{ padding: '4px 8px', fontSize: '0.82rem', width: '100%' }}
                            title={`Cable run distance in ${lengthUnit} for DC loop heat loss calculation`}
                          />
                        </td>

                        {/* Total Cable for Device Group */}
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#38bdf8' }}>
                          {rowLengthDisplay.toFixed(0)} {lengthUnit}
                        </td>

                        {/* Cable Material Cost for Device Group */}
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: materialCostResult.isCostConfigured ? 'var(--emerald)' : 'var(--text-muted)' }}>
                          {materialCostResult.isCostConfigured ? `${costCurrency}${rowCost.toFixed(2)}` : '—'}
                        </td>

                        {/* Run Compliance Status with Visual Indicators */}
                        <td style={{ padding: '8px 12px' }}>
                          {devLengthM <= 90 ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                background: 'rgba(16, 185, 129, 0.14)',
                                color: 'var(--emerald)',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                              }}
                              title="Within solid permanent horizontal link standard"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> Compliant (&le;{lengthUnit === 'ft' ? '295ft' : '90m'})
                            </span>
                          ) : devLengthM <= 100 ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                background: 'rgba(245, 158, 11, 0.14)',
                                color: 'var(--amber)',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                              }}
                              title="Exceeds permanent link; near total channel limit"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> Marginal ({lengthUnit === 'ft' ? '295-328ft' : '90-100m'})
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                background: 'rgba(244, 63, 94, 0.14)',
                                color: 'var(--rose)',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                              }}
                              title="Exceeds 100m maximum Ethernet channel distance limit"
                            >
                              <XCircle className="w-3.5 h-3.5 flex-shrink-0" /> Non-Compliant (&gt;100m)
                            </span>
                          )}
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
                    <td style={{ padding: '10px 12px', color: '#38bdf8', fontSize: '0.92rem' }}>
                      {materialCostResult.totalCableMeters.toFixed(1)} m
                    </td>
                    <td style={{ padding: '10px 12px', color: materialCostResult.isCostConfigured ? 'var(--emerald)' : 'var(--text-muted)', fontSize: '0.92rem' }}>
                      {materialCostResult.isCostConfigured ? `${costCurrency}${materialCostResult.baseCost.toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {deviceRows.some(d => d.estCableLengthM > 100) ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: 'rgba(244, 63, 94, 0.18)',
                            color: 'var(--rose)',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <XCircle className="w-3.5 h-3.5 flex-shrink-0" /> Non-Compliant Runs
                        </span>
                      ) : deviceRows.some(d => d.estCableLengthM > 90) ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: 'rgba(245, 158, 11, 0.18)',
                            color: 'var(--amber)',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> Marginal Runs
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: 'rgba(16, 185, 129, 0.18)',
                            color: 'var(--emerald)',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> All Runs Compliant
                        </span>
                      )}
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

          {/* Dedicated Download PDF & CSV Action Banner */}
          <div
            style={{
              marginTop: '18px',
              padding: '16px 20px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.85) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(244, 63, 94, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  flexShrink: 0,
                }}
              >
                <FileText className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-heading)' }}>
                  Download Professional Engineering Specification PDF
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Formatted specification sheet with cable pass/fail verification, PoE budget breakdown, connected device inventory, and material estimates.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="button button-primary"
                onClick={handleExportPdf}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.86rem',
                  padding: '9px 18px',
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(56, 189, 248, 0.25)',
                }}
                title="Generate and download formatted PDF engineering specification report"
              >
                {exportedPdf ? <Check className="w-4 h-4 text-emerald-200" /> : <Download className="w-4 h-4" />}
                {exportedPdf ? 'PDF Downloaded!' : 'Download PDF Summary'}
              </button>
              <button
                type="button"
                className="button button-secondary no-print"
                onClick={handlePrint}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', padding: '9px 16px' }}
                title="Download or Print clean calculation report as PDF via browser print dialog"
              >
                <Printer className="w-4 h-4 text-sky-400" />
                Download as PDF
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={handleExportCsv}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', padding: '9px 16px' }}
                title="Download calculations as CSV spreadsheet"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Download CSV
              </button>
            </div>
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

          <details
            style={{
              padding: '12px 16px',
              background: 'var(--bg)',
              borderRadius: '10px',
              border: '1px solid var(--border)',
            }}
          >
            <summary style={{ fontWeight: 700, cursor: 'pointer', color: 'var(--text-heading)', fontSize: '0.92rem' }}>
              What does the 'Check cable standard' warning mean?
            </summary>
            <p style={{ margin: '8px 0 0', fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              This warning appears when the selected cable category is not certified to support the target Ethernet link speed under ANSI/TIA-568 and IEEE 802.3 standards. For example, <strong>Cat5e</strong> is certified up to 100 MHz (supporting 1 Gbps and 2.5 Gbps NBASE-T) but cannot reliably transmit <strong>10 Gbps (10GBASE-T)</strong>. Attempting to run 10 Gbps over Cat5e causes severe packet loss, link flap, or interface down-negotiation to 1 Gbps. To achieve 10 Gbps throughput, upgrade to <strong>Cat6</strong> (up to 55 m) or <strong>Cat6a</strong> (full 100 m channel).
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

      {/* Ethernet Standards Comparison Matrix Modal */}
      {showCompareModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            overflowY: 'auto',
          }}
          onClick={() => setShowCompareModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '1100px',
              maxHeight: '90vh',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color: 'var(--text-heading)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Scale className="w-5 h-5 text-sky-400" />
                  Ethernet Cable Standards Comparison Matrix
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  ANSI/TIA-568 &amp; ISO/IEC 11801 Twisted-Pair Cable Category Specifications
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content - Comparison Table */}
            <div style={{ padding: '24px', overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '12px 14px', borderBottom: '2px solid var(--border)', minWidth: '160px', color: 'var(--text-muted)', fontWeight: 700 }}>
                      SPECIFICATION
                    </th>
                    {(['Cat5e', 'Cat6', 'Cat6a', 'Cat7', 'Cat8'] as CableCategory[]).map(cat => {
                      const isSelected = cableCategory === cat;
                      return (
                        <th
                          key={cat}
                          style={{
                            padding: '12px 14px',
                            borderBottom: '2px solid var(--border)',
                            minWidth: '170px',
                            background: isSelected ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: isSelected ? '#38bdf8' : 'var(--text-heading)' }}>
                            {cat}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px' }}>
                            {CABLE_SPECS[cat].maxFreqMHz} MHz
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCableCategory(cat);
                              setShowCompareModal(false);
                            }}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.05)',
                              color: isSelected ? '#0f172a' : 'var(--text-heading)',
                              border: isSelected ? 'none' : '1px solid var(--border)',
                              cursor: 'pointer',
                              width: '100%',
                            }}
                          >
                            {isSelected ? '✓ Selected' : `Select ${cat}`}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'var(--text-heading)' }}>
                      TIA / ISO Class
                    </td>
                    {(['Cat5e', 'Cat6', 'Cat6a', 'Cat7', 'Cat8'] as CableCategory[]).map(cat => (
                      <td key={cat} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'center' }}>
                        {CABLE_TYPE_GUIDES[cat].classStandard}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'var(--text-heading)' }}>
                      Max 100m Speed
                    </td>
                    {(['Cat5e', 'Cat6', 'Cat6a', 'Cat7', 'Cat8'] as CableCategory[]).map(cat => (
                      <td key={cat} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-heading)', textAlign: 'center' }}>
                        {CABLE_TYPE_GUIDES[cat].max100mSpeed}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'var(--text-heading)' }}>
                      10GBASE-T Distance
                    </td>
                    {(['Cat5e', 'Cat6', 'Cat6a', 'Cat7', 'Cat8'] as CableCategory[]).map(cat => {
                      const limit = CABLE_SPECS[cat].speedLimits['10G'];
                      return (
                        <td
                          key={cat}
                          style={{
                            padding: '12px 14px',
                            borderBottom: '1px solid var(--border)',
                            fontWeight: 700,
                            color: limit === 100 ? 'var(--emerald)' : limit > 0 ? '#f59e0b' : 'var(--rose)',
                            textAlign: 'center',
                          }}
                        >
                          {CABLE_TYPE_GUIDES[cat].tenGDistanceLimit}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'var(--text-heading)' }}>
                      Wire Gauge &amp; Shielding
                    </td>
                    {(['Cat5e', 'Cat6', 'Cat6a', 'Cat7', 'Cat8'] as CableCategory[]).map(cat => (
                      <td key={cat} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'center' }}>
                        <div>{CABLE_TYPE_GUIDES[cat].awgGauge}</div>
                        <div style={{ fontSize: '0.74rem', color: '#38bdf8' }}>{CABLE_TYPE_GUIDES[cat].shieldingType}</div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'var(--text-heading)' }}>
                      Alien Crosstalk Isolation
                    </td>
                    {(['Cat5e', 'Cat6', 'Cat6a', 'Cat7', 'Cat8'] as CableCategory[]).map(cat => (
                      <td key={cat} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background:
                              cat === 'Cat5e'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : cat === 'Cat6'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(16, 185, 129, 0.15)',
                            color:
                              cat === 'Cat5e'
                                ? 'var(--rose)'
                                : cat === 'Cat6'
                                ? '#f59e0b'
                                : '#10b981',
                          }}
                        >
                          {CABLE_TYPE_GUIDES[cat].alienCrosstalkRating}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'var(--text-heading)' }}>
                      PoE Capacity
                    </td>
                    {(['Cat5e', 'Cat6', 'Cat6a', 'Cat7', 'Cat8'] as CableCategory[]).map(cat => (
                      <td key={cat} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.76rem', textAlign: 'center' }}>
                        {CABLE_TYPE_GUIDES[cat].poeSuitability}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'var(--text-heading)' }}>
                      Est. Cable Cost
                    </td>
                    {(['Cat5e', 'Cat6', 'Cat6a', 'Cat7', 'Cat8'] as CableCategory[]).map(cat => (
                      <td key={cat} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'var(--emerald)', textAlign: 'center' }}>
                        {CABLE_TYPE_GUIDES[cat].avgCostPerMeter}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-heading)' }}>
                      Primary Scenarios
                    </td>
                    {(['Cat5e', 'Cat6', 'Cat6a', 'Cat7', 'Cat8'] as CableCategory[]).map(cat => (
                      <td key={cat} style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '0.76rem', textAlign: 'center' }}>
                        {CABLE_TYPE_GUIDES[cat].recommendedFor}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info className="w-4 h-4 text-sky-400" />
                Note: 10GBASE-T distance on Cat6 is bundle-dependent. For dense cable trays, Cat6a or higher is recommended.
              </div>
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-heading)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Close Matrix
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
