export const CATEGORIES = [
  'All',
  'Network & Cabling',
  'Server & Hardware',
  'Apple Devices',
  'Microsoft / Windows',
  'Service Desk & ITSM',
] as const;

export type NoteCategory = typeof CATEGORIES[number];
export type BaseCategory = Exclude<NoteCategory, 'All'>;

const NETWORK_KEYWORDS = [
  'rj45',
  'cabling',
  'switch',
  'vlan',
  'cisco',
  'port',
  'osi',
  'sfp',
  'transceiver',
  'fiber',
  'flapping',
  'subnet',
  'ethernet',
  'router',
  'wi-fi',
  'wifi',
  'dns',
  'dhcp',
  'ping',
  'traceroute',
];

const SERVER_KEYWORDS = [
  'server',
  'poweredge',
  'proliant',
  'idrac',
  'ilo',
  'rack',
  'led',
  'pdu',
  'btu',
  'hardware',
  'amber',
  'motherboard',
  'dimm',
  'raid',
  'hvac',
  'ups',
];

const APPLE_KEYWORDS = [
  'apple',
  'macos',
  'macbook',
  'iphone',
  'ipad',
  'ios',
  'ipados',
  'jamf',
  'airdrop',
  'filevault',
  'dfu',
  'continuity',
  'sidecar',
  'universal control',
  'abm',
  'awdl',
];

const MICROSOFT_KEYWORDS = [
  'windows',
  'entra',
  'azure',
  'active directory',
  'bitlocker',
  'm365',
  'powershell',
  'office',
  'intune',
  'sign-in',
  'signin',
];

/**
 * Determines the category of a guide or note.
 * If an explicit category is set and valid, it is preserved.
 * Maps legacy 'macOS & Endpoints' to 'Apple Devices'.
 * Auto-detects 'Apple Devices' and 'Microsoft / Windows' based on keyword rules.
 * Defaults to 'Service Desk & ITSM'.
 */
export function determineCategory(item: {
  category?: string | null;
  title?: string;
  description?: string;
  keywords?: string[];
  content?: string;
  slug?: string;
}): BaseCategory {
  if (item.category && item.category.trim() !== '' && item.category.toLowerCase() !== 'auto') {
    const trimmed = item.category.trim();
    if (trimmed === 'macOS & Endpoints') {
      return 'Apple Devices';
    }
    if (CATEGORIES.includes(trimmed as any) && trimmed !== 'All') {
      return trimmed as BaseCategory;
    }
  }

  const textToScan = [
    item.title || '',
    item.description || '',
    (item.keywords || []).join(' '),
    item.slug ? item.slug.replace(/[-_]/g, ' ') : '',
    item.content ? item.content.slice(0, 1000) : '',
  ]
    .join(' ')
    .toLowerCase();

  // 1. Apple Devices
  if (APPLE_KEYWORDS.some(kw => textToScan.includes(kw))) {
    return 'Apple Devices';
  }

  // 2. Microsoft / Windows
  if (MICROSOFT_KEYWORDS.some(kw => textToScan.includes(kw))) {
    return 'Microsoft / Windows';
  }

  // 3. Network & Cabling
  if (NETWORK_KEYWORDS.some(kw => textToScan.includes(kw))) {
    return 'Network & Cabling';
  }

  // 4. Server & Hardware
  if (SERVER_KEYWORDS.some(kw => textToScan.includes(kw))) {
    return 'Server & Hardware';
  }

  // 5. Fallback: Service Desk & ITSM
  return 'Service Desk & ITSM';
}
