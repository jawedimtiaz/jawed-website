import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Copy, Check, Download, Terminal } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-powershell';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import { copyToClipboard } from './CopyButton';

export const TOOL_OUTPUT_COPY_BUTTON_LABEL = 'Copy to Clipboard';
export const TOOL_OUTPUT_COPIED_LABEL = 'Copied to Clipboard!';
export const TOOL_OUTPUT_LIVE_REGION_MESSAGE = 'Tool output copied to clipboard.';

export const TOOL_OUTPUT_DOWNLOAD_BUTTON_LABEL = 'Download .txt';
export const TOOL_OUTPUT_DOWNLOADED_LABEL = 'Downloaded!';
export const TOOL_OUTPUT_DOWNLOAD_LIVE_REGION_MESSAGE = 'Tool output downloaded as text file.';

export type ToolOutputFontSize = 'small' | 'medium' | 'large';

export const TOOL_OUTPUT_FONT_SIZES: readonly ToolOutputFontSize[] = [
  'small',
  'medium',
  'large',
];

export interface ToolOutputFontSizeSetting {
  label: string;
  shortLabel: string;
  fontSize: string;
  lineHeight: string;
  next: ToolOutputFontSize;
}

export const TOOL_OUTPUT_FONT_SIZE_CONFIG: Record<
  ToolOutputFontSize,
  ToolOutputFontSizeSetting
> = {
  small: {
    label: 'Small',
    shortLabel: 'A-',
    fontSize: '0.78rem',
    lineHeight: '1.45',
    next: 'medium',
  },
  medium: {
    label: 'Medium',
    shortLabel: 'A',
    fontSize: '0.88rem',
    lineHeight: '1.6',
    next: 'large',
  },
  large: {
    label: 'Large',
    shortLabel: 'A+',
    fontSize: '1.02rem',
    lineHeight: '1.7',
    next: 'small',
  },
};

/**
 * Cycles the tool-output font size through small -> medium -> large -> small.
 */
export function getNextToolOutputFontSize(
  current?: ToolOutputFontSize | string | null
): ToolOutputFontSize {
  if (current === 'small') return 'medium';
  if (current === 'medium') return 'large';
  if (current === 'large') return 'small';
  return 'medium';
}

/**
 * Resolves the CSS font-size, line-height, and class name for a given ToolOutputFontSize.
 */
export function resolveToolOutputFontSizeStyle(
  size?: ToolOutputFontSize | string | null
): {
  size: ToolOutputFontSize;
  label: string;
  shortLabel: string;
  fontSize: string;
  lineHeight: string;
  sizeClass: string;
} {
  const normalized: ToolOutputFontSize =
    size === 'small' || size === 'medium' || size === 'large' ? size : 'medium';
  const cfg = TOOL_OUTPUT_FONT_SIZE_CONFIG[normalized];
  return {
    size: normalized,
    label: cfg.label,
    shortLabel: cfg.shortLabel,
    fontSize: cfg.fontSize,
    lineHeight: cfg.lineHeight,
    sizeClass: `tool-output-font-${normalized}`,
  };
}

export type ToolOutputFormat =
  | 'json'
  | 'bash'
  | 'powershell'
  | 'sql'
  | 'yaml'
  | 'log'
  | 'network'
  | 'markdown'
  | 'javascript'
  | 'text';

export const TOOL_OUTPUT_FORMAT_LABELS: Record<ToolOutputFormat, string> = {
  json: 'JSON',
  bash: 'BASH / CLI',
  powershell: 'POWERSHELL',
  sql: 'SQL',
  yaml: 'YAML',
  log: 'LOG / REPORT',
  network: 'NETWORK / CIDR',
  markdown: 'MARKDOWN',
  javascript: 'JAVASCRIPT',
  text: 'TEXT',
};

export interface HighlightToolOutputResult {
  format: ToolOutputFormat;
  prismLanguage: string;
  formatLabel: string;
  highlightedHtml: string;
  rawText: string;
  tokenCount: number;
}

/**
 * Registers custom Prism.js grammars for structured logs/reports, network/CIDR specifications,
 * and structured key-value text outputs so Prism.highlight colorizes them alongside standard languages.
 */
function ensureCustomPrismGrammars(): void {
  if (!Prism.languages.network) {
    Prism.languages.network = {
      divider: {
        pattern: /^[=-]{4,}\s*$/m,
        alias: 'punctuation',
      },
      title: {
        pattern: /^[A-Z0-9 &/()_-]{8,}$/m,
        alias: 'keyword',
      },
      binary: {
        pattern: /\b[01]{8}(?:\.[01]{8}){3}\b/,
        alias: 'regex',
      },
      cidr: {
        pattern: /\b(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?\b/,
        alias: 'constant',
      },
      mac: {
        pattern: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/,
        alias: 'constant',
      },
      property: {
        pattern: /(?:^[ \t]*[•*-]?[ \t]*)[A-Za-z][A-Za-z0-9 /()_-]*(?=:)/m,
        alias: 'property',
      },
      keyword: /\b(?:Class [A-E]|Private Network|Public Internet|Loopback|Link-Local|Multicast|VLAN|DMZ|BGP|OSPF|DNS|DHCP|MTU|NAT)\b/,
      number: /\b\d[\d,.]*(?:\s*(?:hosts|addresses|bits|Mbps|Gbps|ms|%))?\b/i,
      operator: /[•:=-]+/,
    };
  }

  if (!Prism.languages.log) {
    Prism.languages.log = {
      title: {
        pattern: /^(?:={3,}[^\r\n]+={3,}|-{3,}[^\r\n]+-{3,}|\[[^\]]+\])$/m,
        alias: 'keyword',
      },
      timestamp: {
        pattern: /\b\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?\b|\b\d{2}:\d{2}:\d{2}(?:\.\d+)?\b/,
        alias: 'number',
      },
      error: {
        pattern: /\b(?:ERROR|FATAL|CRITICAL|FAIL|FAILED|SEVERE|DENIED|TIMEOUT|POOR)\b/,
        alias: 'important',
      },
      warning: {
        pattern: /\b(?:WARN|WARNING|CAUTION|DEGRADED|RETRY|WEAK|PENDING)\b/,
        alias: 'builtin',
      },
      success: {
        pattern: /\b(?:INFO|OK|PASS|PASSED|RESOLVED|SUCCESS|ACTIVE|UP|STRONG|CONNECTED|SYNCED)\b/,
        alias: 'inserted',
      },
      debug: {
        pattern: /\b(?:DEBUG|TRACE|VERBOSE)\b/,
        alias: 'comment',
      },
      ticket: {
        pattern: /\b(?:INC|REQ|CHG|PRB|KB|CVE|VLAN|RFC)-?\d+(?:-\d+)?\b/,
        alias: 'constant',
      },
      ip: {
        pattern: /\b(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?\b/,
        alias: 'constant',
      },
      property: {
        pattern: /(?:^[ \t]*[•*-]?[ \t]*|\|[ \t]*)[A-Za-z][A-Za-z0-9 /()&#_-]{1,42}(?=:)/m,
        alias: 'property',
      },
      currency: {
        pattern: /(?:₹|\$|€|£)\s*\d[\d,.]*(?:\s*(?:lakh|crore|k|m|b))?/i,
        alias: 'number',
      },
      number: /\b\d[\d,.]*(?:\s*(?:%|Watts|kW|VA|Amps|BTU\/hr|Tons|years|months|min|ms|s|MB|GB|TB))?\b/,
      string: {
        pattern: /"(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*'/,
        greedy: true,
      },
      operator: /[|•→←≥≤±=+-]+/,
    };
  }
}

ensureCustomPrismGrammars();

function escapeHtmlPlain(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Automatically detects the syntax format of a tool output string (or normalizes an explicit language hint)
 * so Prism.js can highlight code snippets, CLI commands, logs, network specs, or structured reports.
 */
export function detectToolOutputFormat(
  content: string,
  explicitLanguage?: string
): ToolOutputFormat {
  const hint = (explicitLanguage ?? '').trim().toLowerCase();
  if (hint && hint !== 'auto') {
    if (hint === 'json' || hint === 'jsonl') return 'json';
    if (['bash', 'sh', 'shell', 'zsh', 'cli', 'console'].includes(hint)) return 'bash';
    if (['powershell', 'ps1', 'pwsh', 'cmd', 'batch'].includes(hint)) return 'powershell';
    if (['sql', 'postgres', 'mysql', 'sqlite'].includes(hint)) return 'sql';
    if (['yaml', 'yml'].includes(hint)) return 'yaml';
    if (['network', 'cidr', 'ipv4', 'subnet'].includes(hint)) return 'network';
    if (['log', 'logs', 'syslog', 'report', 'diagnostic'].includes(hint)) return 'log';
    if (['markdown', 'md'].includes(hint)) return 'markdown';
    if (['javascript', 'js', 'typescript', 'ts'].includes(hint)) return 'javascript';
    if (['text', 'txt', 'plaintext', 'plain'].includes(hint)) return 'text';
  }

  const trimmed = (content ?? '').trim();
  if (!trimmed) {
    return 'text';
  }

  // 1. JSON detection
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      if (/"[a-zA-Z0-9_-]+"\s*:\s*(?:"|true|false|null|-?\d|\{|\[)/.test(trimmed)) {
        return 'json';
      }
    }
  }

  // 2. PowerShell detection
  if (
    /\b(?:Get-[A-Z]\w+|Set-[A-Z]\w+|Invoke-[A-Z]\w+|Test-NetConnection|Resolve-DnsName|Clear-DnsClientCache|Restart-Service|New-Item|Write-Host|Select-Object|Where-Object)\b/.test(
      trimmed
    ) ||
    /^\s*PS\s+[A-Z]:\\>/m.test(trimmed) ||
    /\b(?:ipconfig\s+\/(?:all|flushdns|release|renew)|netsh\s+(?:int|wlan|advfirewall)|gpupdate\s+\/force)\b/i.test(
      trimmed
    )
  ) {
    return 'powershell';
  }

  // 3. SQL detection
  if (
    /\b(?:SELECT\s+[\s\S]+?\s+FROM|INSERT\s+INTO\s+\w+|UPDATE\s+\w+\s+SET|DELETE\s+FROM\s+\w+|CREATE\s+TABLE|ALTER\s+TABLE)\b/i.test(
      trimmed
    )
  ) {
    return 'sql';
  }

  // 4. Network / CIDR / Subnet specification detection
  if (
    /\b[01]{8}(?:\.[01]{8}){3}\b/.test(trimmed) ||
    (/\b(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?\b/.test(trimmed) &&
      /\b(?:Subnet Mask|Wildcard Mask|Broadcast Address|Network Address|Usable Host|CIDR)\b/i.test(
        trimmed
      ))
  ) {
    return 'network';
  }

  // 5. Bash / Shell CLI command output detection
  if (
    /^#!\s*\/bin\/(?:ba|z)?sh/m.test(trimmed) ||
    /^\s*(?:\$|#)\s+(?:sudo|apt|yum|dnf|systemctl|journalctl|ping|traceroute|dig|nslookup|curl|wget|grep|awk|sed|chmod|chown|ssh|scp|git|docker|kubectl|ip|ifconfig|netstat|ss)\b/m.test(
      trimmed
    ) ||
    /\b(?:systemctl\s+(?:status|restart|enable|stop)|journalctl\s+-u|ping\s+-c\s+\d+|traceroute\s+\S+|dig\s+@?\S+|curl\s+-[A-Za-z]+|chmod\s+[0-7]{3,4}|ssh\s+\S+@\S+|ip\s+(?:addr|route|link)\s+show)\b/.test(
      trimmed
    )
  ) {
    return 'bash';
  }

  // 6. Markdown detection (fenced code blocks or ATX headings)
  if (/^#{1,6}\s+\S+/m.test(trimmed) || /```[a-z0-9_-]*\n[\s\S]*?```/i.test(trimmed)) {
    return 'markdown';
  }

  // 7. JavaScript / TypeScript snippet detection
  if (
    /\b(?:const|let|function|export|import|async|await)\b/.test(trimmed) &&
    (/=>/.test(trimmed) || /\breturn\b/.test(trimmed) || /console\.log\(/.test(trimmed))
  ) {
    return 'javascript';
  }

  // 8. Structured Log / Diagnostic Report / Key-Value Summary detection
  if (
    /\b(?:INFO|WARN|WARNING|ERROR|CRITICAL|FATAL|DEBUG)\b/.test(trimmed) ||
    /\b(?:INC|REQ|CHG|PRB)-\d+\b/.test(trimmed) ||
    /^={3,}\s*[^=\r\n]+\s*={3,}/m.test(trimmed) ||
    /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}\b/.test(trimmed) ||
    /^(?:[ \t]*[•*-]?[ \t]*)[A-Za-z][A-Za-z0-9 /()_-]{1,36}:\s+\S+/m.test(trimmed)
  ) {
    return 'log';
  }

  // 9. YAML detection
  if (/^---\s*$/m.test(trimmed)) {
    return 'yaml';
  }

  return 'text';
}

/**
 * Highlights raw tool output content using Prism.js based on its detected or specified format.
 */
export function highlightToolOutputContent(
  content: string,
  options: { language?: string } = {}
): HighlightToolOutputResult {
  ensureCustomPrismGrammars();
  const rawText = typeof content === 'string' ? content : String(content ?? '');
  const format = detectToolOutputFormat(rawText, options.language);

  if (!rawText) {
    return {
      format,
      prismLanguage: format,
      formatLabel: TOOL_OUTPUT_FORMAT_LABELS[format],
      highlightedHtml: '',
      rawText: '',
      tokenCount: 0,
    };
  }

  const grammarMap: Record<ToolOutputFormat, Prism.Grammar | undefined> = {
    json: Prism.languages.json,
    bash: Prism.languages.bash,
    powershell: Prism.languages.powershell,
    sql: Prism.languages.sql,
    yaml: Prism.languages.yaml,
    network: Prism.languages.network,
    log: Prism.languages.log,
    markdown: Prism.languages.markdown,
    javascript: Prism.languages.javascript,
    text: Prism.languages.log,
  };

  const grammar = grammarMap[format] || Prism.languages.log;
  let highlightedHtml = '';

  try {
    if (grammar) {
      highlightedHtml = Prism.highlight(rawText, grammar, format);
    } else {
      highlightedHtml = escapeHtmlPlain(rawText);
    }
  } catch {
    highlightedHtml = escapeHtmlPlain(rawText);
  }

  const tokenMatches = highlightedHtml.match(/<span class="token [^"]+">/g);
  const tokenCount = tokenMatches ? tokenMatches.length : 0;

  return {
    format,
    prismLanguage: format,
    formatLabel: TOOL_OUTPUT_FORMAT_LABELS[format],
    highlightedHtml,
    rawText,
    tokenCount,
  };
}

export interface ClipboardWriterAdapter {
  writeText?: (text: string) => Promise<void>;
}

export interface CopyToolOutputResult {
  ok: boolean;
  copiedText: string;
  label: string;
  announcement: string;
}

export interface ToolOutputDownloadAdapter {
  triggerDownload?: (payload: {
    content: string;
    filename: string;
    mimeType: string;
  }) => void;
}

export interface DownloadToolOutputResult {
  ok: boolean;
  filename: string;
  downloadedText: string;
  mimeType: string;
  byteSize: number;
  label: string;
  announcement: string;
}

/**
 * Normalizes a tool output title or custom filename into a safe `.txt` filename.
 */
export function formatToolOutputFilename(
  titleOrFilename?: string,
  extension: string = '.txt'
): string {
  const normalizedExt = extension.startsWith('.') ? extension : `.${extension}`;
  const raw = (titleOrFilename ?? '').trim();
  if (!raw) {
    return `tool-output${normalizedExt}`;
  }

  // Strip any existing .txt/.text/.md/.log extension before slugifying
  const withoutExt = raw.replace(/\.(txt|text|md|log)$/i, '').trim();
  const slug = withoutExt
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${slug || 'tool-output'}${normalizedExt}`;
}

/**
 * Copies tool output text to the user's clipboard with support for dependency-injected
 * clipboard adapters (for unit testing) and fallback DOM copy in restricted environments.
 */
export async function copyToolOutputText(
  content: string,
  clipboardOverride?: ClipboardWriterAdapter
): Promise<CopyToolOutputResult> {
  const normalized = typeof content === 'string' ? content : String(content ?? '');
  if (!normalized.trim()) {
    return {
      ok: false,
      copiedText: '',
      label: TOOL_OUTPUT_COPY_BUTTON_LABEL,
      announcement: 'No tool output available to copy.',
    };
  }

  let ok = false;
  if (clipboardOverride && typeof clipboardOverride.writeText === 'function') {
    try {
      await clipboardOverride.writeText(normalized);
      ok = true;
    } catch {
      ok = false;
    }
  } else {
    ok = await copyToClipboard(normalized);
  }

  return {
    ok,
    copiedText: ok ? normalized : '',
    label: ok ? TOOL_OUTPUT_COPIED_LABEL : TOOL_OUTPUT_COPY_BUTTON_LABEL,
    announcement: ok ? TOOL_OUTPUT_LIVE_REGION_MESSAGE : 'Failed to copy tool output.',
  };
}

/**
 * Downloads tool output text as a UTF-8 `.txt` file, supporting dependency-injected
 * download adapters for unit testing and browser Blob / data-URI download triggers.
 */
export function downloadToolOutputText(
  content: string,
  options: { filename?: string; title?: string } = {},
  downloadAdapter?: ToolOutputDownloadAdapter
): DownloadToolOutputResult {
  const normalized = typeof content === 'string' ? content : String(content ?? '');
  const filename = formatToolOutputFilename(options.filename || options.title || 'tool-output');
  const mimeType = 'text/plain;charset=utf-8';

  if (!normalized.trim()) {
    return {
      ok: false,
      filename,
      downloadedText: '',
      mimeType,
      byteSize: 0,
      label: TOOL_OUTPUT_DOWNLOAD_BUTTON_LABEL,
      announcement: 'No tool output available to download.',
    };
  }

  const byteSize =
    typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(normalized).length
      : normalized.length;

  let ok = false;
  if (downloadAdapter && typeof downloadAdapter.triggerDownload === 'function') {
    try {
      downloadAdapter.triggerDownload({
        content: normalized,
        filename,
        mimeType,
      });
      ok = true;
    } catch {
      ok = false;
    }
  } else if (typeof document !== 'undefined') {
    try {
      let href = '';
      let shouldRevoke = false;

      if (
        typeof Blob !== 'undefined' &&
        typeof URL !== 'undefined' &&
        typeof URL.createObjectURL === 'function'
      ) {
        const blob = new Blob([normalized], { type: mimeType });
        href = URL.createObjectURL(blob);
        shouldRevoke = true;
      } else {
        href = `data:${mimeType},${encodeURIComponent(normalized)}`;
      }

      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = filename;
      anchor.rel = 'noopener';
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      if (shouldRevoke && typeof URL.revokeObjectURL === 'function') {
        setTimeout(() => {
          try {
            URL.revokeObjectURL(href);
          } catch {
            // ignore revoke errors
          }
        }, 250);
      }
      ok = true;
    } catch {
      ok = false;
    }
  } else {
    // Non-DOM fallback environment
    ok = true;
  }

  return {
    ok,
    filename,
    downloadedText: ok ? normalized : '',
    mimeType,
    byteSize: ok ? byteSize : 0,
    label: ok ? TOOL_OUTPUT_DOWNLOADED_LABEL : TOOL_OUTPUT_DOWNLOAD_BUTTON_LABEL,
    announcement: ok
      ? TOOL_OUTPUT_DOWNLOAD_LIVE_REGION_MESSAGE
      : 'Failed to download tool output.',
  };
}

export interface ToolOutputProps {
  /** Optional HTML id attribute for the .tool-output element */
  id?: string;
  /** Explicit text string or getter function to copy/download when actions are clicked */
  content?: string | (() => string);
  /** Rendered output content inside the .tool-output block */
  children?: React.ReactNode;
  /** Accessible title/label for the output region and toolbar */
  title?: string;
  /** Optional custom filename for downloading the output as a .txt file */
  filename?: string;
  /** Optional syntax language override (defaults to 'auto' format detection via Prism.js) */
  language?: string;
  /** Whether to enable automatic Prism.js syntax highlighting for code, logs, and CLI output (defaults to true) */
  enableSyntaxHighlighting?: boolean;
  /** Custom label for the copy button in idle state (defaults to 'Copy to Clipboard') */
  copyLabel?: string;
  /** Custom label for the copy button after copying (defaults to 'Copied to Clipboard!') */
  copiedLabel?: string;
  /** Custom label for the download button in idle state (defaults to 'Download .txt') */
  downloadLabel?: string;
  /** Custom label for the download button after downloading (defaults to 'Downloaded!') */
  downloadedLabel?: string;
  /** HTML element tag used for the .tool-output surface (defaults to 'pre') */
  as?: 'pre' | 'div';
  /** Whether to display the integrated header bar with the Copy & Download buttons */
  showToolbar?: boolean;
  /** Whether to display the inline Copy & Download buttons directly inside .tool-output */
  showInlineCopyButton?: boolean;
  /** Whether to display the 'Download .txt' button in the toolbar and inline actions */
  showDownloadButton?: boolean;
  /** Initial font size for the tool output (defaults to 'medium') */
  defaultFontSize?: ToolOutputFontSize;
  /** Controlled font size for the tool output ('small' | 'medium' | 'large') */
  fontSize?: ToolOutputFontSize;
  /** Whether to display the text size toggle button in the toolbar (defaults to true) */
  showTextSizeControl?: boolean;
  /** Additional CSS class names applied to the .tool-output element */
  className?: string;
  /** Inline styles applied to the .tool-output element */
  style?: React.CSSProperties;
  /** Test ID for the .tool-output element */
  testId?: string;
  /** Test ID for the 'Copy to Clipboard' button */
  copyButtonTestId?: string;
  /** Test ID for the 'Download .txt' button */
  downloadButtonTestId?: string;
  /** Test ID for the text size control button */
  textSizeButtonTestId?: string;
  /** Optional callback fired when the output is copied to the clipboard */
  onCopy?: (copiedText: string) => void;
  /** Optional callback fired when the output is downloaded as a text file */
  onDownload?: (downloadedText: string, filename: string) => void;
  /** Optional callback fired when the user toggles the text font size */
  onFontSizeChange?: (nextSize: ToolOutputFontSize) => void;
}

/**
 * Accessible ToolOutput component that wraps `.tool-output` content with Prism.js automatic
 * syntax highlighting, text size controls (small, medium, large), built-in 'Copy to Clipboard'
 * and 'Download .txt' buttons, keyboard focus support, and ARIA live-region announcements.
 */
export const ToolOutput: React.FC<ToolOutputProps> = ({
  id,
  content,
  children,
  title = 'Tool Output',
  filename,
  language = 'auto',
  enableSyntaxHighlighting = true,
  copyLabel = TOOL_OUTPUT_COPY_BUTTON_LABEL,
  copiedLabel = TOOL_OUTPUT_COPIED_LABEL,
  downloadLabel = TOOL_OUTPUT_DOWNLOAD_BUTTON_LABEL,
  downloadedLabel = TOOL_OUTPUT_DOWNLOADED_LABEL,
  as: ComponentTag = 'pre',
  showToolbar = true,
  showInlineCopyButton = true,
  showDownloadButton = true,
  defaultFontSize = 'medium',
  fontSize: controlledFontSize,
  showTextSizeControl = true,
  className = '',
  style,
  testId = 'tool-output',
  copyButtonTestId = 'tool-output-copy-btn',
  downloadButtonTestId = 'tool-output-download-btn',
  textSizeButtonTestId = 'tool-output-text-size-btn',
  onCopy,
  onDownload,
  onFontSizeChange,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [internalFontSize, setInternalFontSize] = useState<ToolOutputFontSize>(defaultFontSize);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const outputRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const downloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeFontSize = controlledFontSize ?? internalFontSize;
  const fontSizeStyle = resolveToolOutputFontSizeStyle(activeFontSize);
  const nextFontSize = getNextToolOutputFontSize(fontSizeStyle.size);
  const nextFontSizeConfig = TOOL_OUTPUT_FONT_SIZE_CONFIG[nextFontSize];

  const evaluatedContent = typeof content === 'function' ? content() : content;
  const resolvedFilename = formatToolOutputFilename(filename || title || 'tool-output');

  const rawStringForHighlight = useMemo((): string | null => {
    if (children !== undefined && children !== null) {
      if (typeof children === 'string') return children;
      if (typeof children === 'number') return String(children);
      // If children is a custom React element tree, render children as-is unless evaluatedContent is used
      return null;
    }
    if (typeof evaluatedContent === 'string') {
      return evaluatedContent;
    }
    return '';
  }, [children, evaluatedContent]);

  const highlightResult = useMemo<HighlightToolOutputResult>(() => {
    const sourceText =
      rawStringForHighlight !== null
        ? rawStringForHighlight
        : typeof evaluatedContent === 'string'
        ? evaluatedContent
        : '';
    return highlightToolOutputContent(sourceText, { language });
  }, [rawStringForHighlight, evaluatedContent, language]);

  const shouldRenderHighlightedHtml =
    enableSyntaxHighlighting && rawStringForHighlight !== null && rawStringForHighlight.length > 0;

  const resolveOutputText = useCallback((): string => {
    const resolvedProp = typeof content === 'function' ? content() : content;
    if (typeof resolvedProp === 'string' && resolvedProp.length > 0) {
      return resolvedProp;
    }
    if (typeof children === 'string') {
      return children;
    }
    if (typeof children === 'number') {
      return String(children);
    }
    if (outputRef.current?.textContent) {
      return outputRef.current.textContent;
    }
    return '';
  }, [content, children]);

  const handleCopyClick = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const textToCopy = resolveOutputText();
      const result = await copyToolOutputText(textToCopy);
      if (result.ok) {
        setIsCopied(true);
        setLiveAnnouncement(result.announcement);
        if (onCopy) {
          onCopy(result.copiedText);
        }
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
          setIsCopied(false);
          setLiveAnnouncement('');
        }, 2200);
      }
    },
    [resolveOutputText, onCopy]
  );

  const handleDownloadClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const textToDownload = resolveOutputText();
      const result = downloadToolOutputText(textToDownload, {
        filename,
        title,
      });
      if (result.ok) {
        setIsDownloaded(true);
        setLiveAnnouncement(result.announcement);
        if (onDownload) {
          onDownload(result.downloadedText, result.filename);
        }
        if (downloadTimerRef.current) {
          clearTimeout(downloadTimerRef.current);
        }
        downloadTimerRef.current = setTimeout(() => {
          setIsDownloaded(false);
          setLiveAnnouncement('');
        }, 2200);
      }
    },
    [resolveOutputText, filename, title, onDownload]
  );

  const handleToggleFontSize = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const next = getNextToolOutputFontSize(fontSizeStyle.size);
      if (controlledFontSize === undefined) {
        setInternalFontSize(next);
      }
      setLiveAnnouncement(
        `Tool output text size set to ${TOOL_OUTPUT_FONT_SIZE_CONFIG[next].label}.`
      );
      if (onFontSizeChange) {
        onFontSizeChange(next);
      }
    },
    [fontSizeStyle.size, controlledFontSize, onFontSizeChange]
  );

  return (
    <div
      className="tool-output-wrapper"
      data-testid="tool-output-wrapper"
      data-format={highlightResult.format}
      role="region"
      aria-label={title}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '10px',
      }}
    >
      {showToolbar && (
        <div
          className="tool-output-toolbar no-print"
          data-testid="tool-output-toolbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
            padding: '6px 12px',
            background: 'var(--surface-accent, rgba(15, 23, 42, 0.55))',
            border: '1px solid var(--border, rgba(148, 163, 184, 0.2))',
            borderBottom: 'none',
            borderTopLeftRadius: '10px',
            borderTopRightRadius: '10px',
          }}
        >
          <span
            className="tool-output-toolbar-label"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--muted, #94a3b8)',
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
            }}
          >
            <Terminal size={13} aria-hidden="true" style={{ color: 'var(--accent, #38bdf8)' }} />
            <span>{title}</span>
            <span
              className="tool-output-format-badge"
              data-testid="tool-output-format-badge"
              data-format={highlightResult.format}
              title={`Detected syntax format: ${highlightResult.formatLabel}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '1px 6px',
                borderRadius: '4px',
                fontSize: '0.66rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                background: 'rgba(56, 189, 248, 0.14)',
                color: 'var(--accent, #38bdf8)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}
            >
              {highlightResult.formatLabel}
            </span>
          </span>

          <span
            className="tool-output-toolbar-actions"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap',
            }}
          >
            {showTextSizeControl && (
              <button
                type="button"
                onClick={handleToggleFontSize}
                data-testid={textSizeButtonTestId}
                data-font-size={fontSizeStyle.size}
                className={`tool-output-text-size-btn tool-output-size-${fontSizeStyle.size}`}
                aria-label={`Toggle text size (current: ${fontSizeStyle.label}, switch to ${nextFontSizeConfig.label})`}
                title={`Text size: ${fontSizeStyle.label} (${fontSizeStyle.shortLabel}) — click for ${nextFontSizeConfig.label}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: 'var(--surface, rgba(30, 41, 59, 0.85))',
                  color: 'var(--text-heading, #f8fafc)',
                  border: '1px solid var(--border, rgba(148, 163, 184, 0.28))',
                  transition: 'all 0.16s ease',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    color: 'var(--accent, #38bdf8)',
                    fontWeight: 800,
                    fontSize: '0.74rem',
                  }}
                >
                  {fontSizeStyle.shortLabel}
                </span>
                <span data-testid={`${textSizeButtonTestId}-label`}>
                  Text: {fontSizeStyle.label}
                </span>
              </button>
            )}

            {showDownloadButton && (
              <button
                type="button"
                onClick={handleDownloadClick}
                data-testid={downloadButtonTestId}
                data-downloaded={isDownloaded}
                data-download-filename={resolvedFilename}
                className={`tool-output-download-btn ${isDownloaded ? 'is-downloaded downloaded' : ''}`}
                aria-label={
                  isDownloaded
                    ? `${downloadedLabel} (${resolvedFilename})`
                    : `${downloadLabel} (${resolvedFilename})`
                }
                title={
                  isDownloaded
                    ? `${downloadedLabel} (${resolvedFilename})`
                    : `Download output as ${resolvedFilename}`
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: isDownloaded
                    ? 'rgba(16, 185, 129, 0.16)'
                    : 'var(--surface, rgba(30, 41, 59, 0.85))',
                  color: isDownloaded
                    ? 'var(--emerald, #10b981)'
                    : 'var(--text-heading, #f8fafc)',
                  border: isDownloaded
                    ? '1px solid rgba(16, 185, 129, 0.45)'
                    : '1px solid var(--border, rgba(148, 163, 184, 0.28))',
                  transition: 'all 0.16s ease',
                }}
              >
                {isDownloaded ? (
                  <Check
                    size={13}
                    aria-hidden="true"
                    style={{ color: 'var(--emerald, #10b981)', flexShrink: 0 }}
                  />
                ) : (
                  <Download
                    size={13}
                    aria-hidden="true"
                    style={{ color: 'var(--accent, #38bdf8)', flexShrink: 0 }}
                  />
                )}
                <span data-testid={`${downloadButtonTestId}-label`}>
                  {isDownloaded ? downloadedLabel : downloadLabel}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyClick}
              data-testid={copyButtonTestId}
              data-copied={isCopied}
              className={`tool-output-copy-btn copy-button ${isCopied ? 'is-copied copied' : ''}`}
              aria-label={isCopied ? `${copiedLabel} (${title})` : `${copyLabel} (${title})`}
              title={isCopied ? copiedLabel : copyLabel}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: isCopied
                  ? 'rgba(16, 185, 129, 0.16)'
                  : 'var(--surface, rgba(30, 41, 59, 0.85))',
                color: isCopied ? 'var(--emerald, #10b981)' : 'var(--text-heading, #f8fafc)',
                border: isCopied
                  ? '1px solid rgba(16, 185, 129, 0.45)'
                  : '1px solid var(--border, rgba(148, 163, 184, 0.28))',
                transition: 'all 0.16s ease',
              }}
            >
              {isCopied ? (
                <Check size={13} aria-hidden="true" style={{ color: 'var(--emerald, #10b981)', flexShrink: 0 }} />
              ) : (
                <Copy size={13} aria-hidden="true" style={{ color: 'var(--accent, #38bdf8)', flexShrink: 0 }} />
              )}
              <span data-testid={`${copyButtonTestId}-label`}>
                {isCopied ? copiedLabel : copyLabel}
              </span>
            </button>
          </span>
        </div>
      )}

      {/* Screen-reader live region for clipboard copy & text file download confirmation */}
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="tool-output-copy-status"
      >
        {liveAnnouncement}
      </span>

      <ComponentTag
        id={id}
        className={`tool-output language-${highlightResult.format} ${fontSizeStyle.sizeClass} ${className}`.trim()}
        data-testid={testId}
        data-format={highlightResult.format}
        data-font-size={fontSizeStyle.size}
        data-highlighted={shouldRenderHighlightedHtml}
        tabIndex={0}
        aria-label={`${title} content`}
        style={{
          position: 'relative',
          marginTop: 0,
          fontSize: fontSizeStyle.fontSize,
          lineHeight: fontSizeStyle.lineHeight,
          ...(showToolbar
            ? {
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
              }
            : {}),
          ...style,
        }}
      >
        {showInlineCopyButton && (
          <span
            className="tool-output-inline-copy-wrap no-print"
            style={{
              float: 'right',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: '12px',
              marginBottom: '8px',
            }}
          >
            {showDownloadButton && (
              <button
                type="button"
                onClick={handleDownloadClick}
                data-testid={`${downloadButtonTestId}-inline`}
                data-downloaded={isDownloaded}
                data-download-filename={resolvedFilename}
                className={`tool-output-download-btn tool-output-inline-download-btn ${
                  isDownloaded ? 'is-downloaded downloaded' : ''
                }`}
                aria-label={
                  isDownloaded
                    ? `${downloadedLabel} (${resolvedFilename})`
                    : `${downloadLabel} (${resolvedFilename})`
                }
                title={
                  isDownloaded
                    ? `${downloadedLabel} (${resolvedFilename})`
                    : `Download output as ${resolvedFilename}`
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  cursor: 'pointer',
                  background: isDownloaded
                    ? 'rgba(16, 185, 129, 0.18)'
                    : 'rgba(15, 23, 42, 0.88)',
                  color: isDownloaded
                    ? 'var(--emerald, #10b981)'
                    : 'var(--text-heading, #f8fafc)',
                  border: isDownloaded
                    ? '1px solid rgba(16, 185, 129, 0.45)'
                    : '1px solid rgba(148, 163, 184, 0.3)',
                  transition: 'all 0.16s ease',
                }}
              >
                {isDownloaded ? (
                  <Check
                    size={12}
                    aria-hidden="true"
                    style={{ color: 'var(--emerald, #10b981)', flexShrink: 0 }}
                  />
                ) : (
                  <Download
                    size={12}
                    aria-hidden="true"
                    style={{ color: 'var(--accent, #38bdf8)', flexShrink: 0 }}
                  />
                )}
                <span data-testid={`${downloadButtonTestId}-inline-label`}>
                  {isDownloaded ? downloadedLabel : downloadLabel}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyClick}
              data-testid={`${copyButtonTestId}-inline`}
              data-copied={isCopied}
              className={`tool-output-copy-btn tool-output-inline-copy-btn copy-button ${
                isCopied ? 'is-copied copied' : ''
              }`}
              aria-label={isCopied ? `${copiedLabel} (${title})` : `${copyLabel} (${title})`}
              title={isCopied ? copiedLabel : copyLabel}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 9px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: 600,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                cursor: 'pointer',
                background: isCopied
                  ? 'rgba(16, 185, 129, 0.18)'
                  : 'rgba(15, 23, 42, 0.88)',
                color: isCopied ? 'var(--emerald, #10b981)' : 'var(--text-heading, #f8fafc)',
                border: isCopied
                  ? '1px solid rgba(16, 185, 129, 0.45)'
                  : '1px solid rgba(148, 163, 184, 0.3)',
                transition: 'all 0.16s ease',
              }}
            >
              {isCopied ? (
                <Check size={12} aria-hidden="true" style={{ color: 'var(--emerald, #10b981)', flexShrink: 0 }} />
              ) : (
                <Copy size={12} aria-hidden="true" style={{ color: 'var(--accent, #38bdf8)', flexShrink: 0 }} />
              )}
              <span data-testid={`${copyButtonTestId}-inline-label`}>
                {isCopied ? copiedLabel : copyLabel}
              </span>
            </button>
          </span>
        )}
        {shouldRenderHighlightedHtml ? (
          <code
            ref={outputRef as React.RefObject<HTMLElement>}
            className={`tool-output-content tool-output-code language-${highlightResult.format}`}
            data-testid={`${testId}-content`}
            data-format={highlightResult.format}
            dangerouslySetInnerHTML={{ __html: highlightResult.highlightedHtml }}
          />
        ) : (
          <span
            ref={outputRef as React.RefObject<HTMLSpanElement>}
            className="tool-output-content"
            data-testid={`${testId}-content`}
            data-format={highlightResult.format}
          >
            {children ?? evaluatedContent}
          </span>
        )}
      </ComponentTag>
    </div>
  );
};

export default ToolOutput;
