export const CATEGORIES = [
  'All',
  'Network & Cabling',
  'Server & Hardware',
  'macOS & Endpoints',
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

const ENDPOINT_KEYWORDS = [
  'macos',
  'apple',
  'jamf',
  'mdm',
  'windows',
  'bitlocker',
  'entra',
  'laptop',
  'endpoint',
  'm365',
  'macbook',
  'intune',
  'provisioning',
  'workstation',
];

/**
 * Determines the category of a guide or note.
 * If an explicit category is set and valid, it is preserved.
 * If category is missing, empty, or 'auto', it auto-detects based on keywords
 * in title, description, keywords array, slug, and content.
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

  // 1. Network & Cabling
  if (NETWORK_KEYWORDS.some(kw => textToScan.includes(kw))) {
    return 'Network & Cabling';
  }

  // 2. Server & Hardware
  if (SERVER_KEYWORDS.some(kw => textToScan.includes(kw))) {
    return 'Server & Hardware';
  }

  // 3. macOS & Endpoints
  if (ENDPOINT_KEYWORDS.some(kw => textToScan.includes(kw))) {
    return 'macOS & Endpoints';
  }

  // 4. Fallback: Service Desk & ITSM
  return 'Service Desk & ITSM';
}
