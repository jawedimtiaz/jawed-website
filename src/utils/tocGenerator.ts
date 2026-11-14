export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * Heading count threshold for automatic Table of Contents expansion:
 * - Pages with fewer than 5 headings (`< 5`) automatically expand the TOC.
 * - Pages with 5 or more headings (`>= 5`) default to collapsed for a cleaner layout.
 */
export const TOC_AUTO_COLLAPSE_HEADING_THRESHOLD = 5;

/**
 * Returns true if the Table of Contents should automatically expand on initial load
 * (when the page has fewer than 5 H2/H3 headings).
 */
export function shouldAutoExpandToc(
  headingsOrCount: number | TocItem[] | null | undefined,
  threshold: number = TOC_AUTO_COLLAPSE_HEADING_THRESHOLD
): boolean {
  const count =
    typeof headingsOrCount === 'number'
      ? headingsOrCount
      : Array.isArray(headingsOrCount)
        ? headingsOrCount.length
        : 0;
  return count > 0 && count < threshold;
}

/**
 * Returns true if the Table of Contents should default to collapsed on initial load
 * (when the page has 5 or more H2/H3 headings, or 0 headings).
 * Pages with fewer than 5 headings return `false` (expanded).
 */
export function shouldDefaultCollapseToc(
  headingsOrCount: number | TocItem[] | null | undefined,
  threshold: number = TOC_AUTO_COLLAPSE_HEADING_THRESHOLD
): boolean {
  const count =
    typeof headingsOrCount === 'number'
      ? headingsOrCount
      : Array.isArray(headingsOrCount)
        ? headingsOrCount.length
        : 0;
  if (count <= 0) return true;
  return count >= threshold;
}

export interface TocGeneratorOptions {
  /**
   * Minimum number of H2/H3 headings required to display the Table of Contents.
   * Defaults to 2 so multi-section guides automatically display the TOC.
   */
  minHeadings?: number;
  /**
   * Heading count threshold at or above which the Table of Contents defaults to collapsed.
   * Defaults to 5 (fewer than 5 headings automatically expands; 5+ defaults to collapsed).
   */
  collapseThreshold?: number;
}

export interface GeneratedTocResult {
  /**
   * HTML content with unique `id` attributes guaranteed on every H2 and H3 tag.
   */
  htmlWithIds: string;
  /**
   * Ordered list of extracted H2 and H3 headings for rendering the Table of Contents.
   */
  tocItems: TocItem[];
  /**
   * Whether the guide has enough headings to display the Table of Contents navigation.
   */
  shouldShowToc: boolean;
  /**
   * Whether the TOC should default to collapsed (`true` when 5+ headings, `false` when < 5 headings).
   */
  defaultCollapsed: boolean;
  /**
   * Whether the TOC should automatically expand (`true` when 1..4 headings, `false` when 5+ headings).
   */
  shouldAutoExpand: boolean;
}

const NAMED_HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&ndash;': '–',
  '&mdash;': '—',
  '&rarr;': '→',
  '&larr;': '←',
};

/**
 * Strips HTML tags and decodes common named and numeric HTML entities into plain text.
 */
export function decodeHtmlEntities(rawHtml: string): string {
  if (!rawHtml) return '';

  const withoutTags = rawHtml
    .replace(/<[^>]+>/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1');

  return withoutTags
    .replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp|ndash|mdash|rarr|larr);/gi, (match) => {
      const lower = match.toLowerCase();
      return NAMED_HTML_ENTITIES[lower] ?? match;
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converts a heading text string into a URL-safe, lowercase kebab-case anchor ID.
 */
export function slugifyHeading(text: string): string {
  const clean = decodeHtmlEntities(text)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return clean || 'section';
}

/**
 * Converts Markdown H2 (`## `) and H3 (`### `) lines into HTML `<h2>` and `<h3>` tags
 * while preserving fenced/HTML `<pre>` code blocks so both Markdown and HTML notes are supported.
 */
export function convertMarkdownHeadingsToHtml(content: string): string {
  if (!content || typeof content !== 'string') return '';

  const preBlocks: string[] = [];
  const masked = content
    .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, (match) => {
      const token = `__TOC_PRE_BLOCK_${preBlocks.length}__`;
      preBlocks.push(match);
      return token;
    })
    .replace(/```[\s\S]*?```/g, (match) => {
      const token = `__TOC_PRE_BLOCK_${preBlocks.length}__`;
      preBlocks.push(match);
      return token;
    });

  const converted = masked.replace(
    /^[ \t]*(#{2,3})[ \t]+([^\r\n#]+?)[ \t]*#*[ \t]*$/gm,
    (_, hashes: string, headingText: string) => {
      const tag = hashes.length === 2 ? 'h2' : 'h3';
      return `<${tag}>${headingText.trim()}</${tag}>`;
    }
  );

  return converted.replace(/__TOC_PRE_BLOCK_(\d+)__/g, (_, idx) => preBlocks[Number(idx)] ?? '');
}

/**
 * Extracts all H2 and H3 headings from raw HTML or Markdown content, ensures each heading tag
 * has a unique `id` attribute in the returned HTML, and returns the structured TOC list.
 */
export function generateTableOfContents(
  htmlContent: string,
  options: TocGeneratorOptions = {}
): GeneratedTocResult {
  const minHeadings = options.minHeadings ?? 2;
  const collapseThreshold = options.collapseThreshold ?? TOC_AUTO_COLLAPSE_HEADING_THRESHOLD;

  if (!htmlContent || typeof htmlContent !== 'string') {
    return {
      htmlWithIds: '',
      tocItems: [],
      shouldShowToc: false,
      defaultCollapsed: true,
      shouldAutoExpand: false,
    };
  }

  const normalizedContent = convertMarkdownHeadingsToHtml(htmlContent);
  const tocItems: TocItem[] = [];
  const usedIds = new Set<string>();

  const ensureUniqueId = (baseId: string): string => {
    const normalizedBase = baseId.trim() || 'section';
    if (!usedIds.has(normalizedBase)) {
      usedIds.add(normalizedBase);
      return normalizedBase;
    }
    let counter = 2;
    while (usedIds.has(`${normalizedBase}-${counter}`)) {
      counter += 1;
    }
    const unique = `${normalizedBase}-${counter}`;
    usedIds.add(unique);
    return unique;
  };

  const headingRegex = /<(h[23])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;

  const htmlWithIds = normalizedContent.replace(
    headingRegex,
    (fullMatch, tagName: string, rawAttrs: string | undefined, innerHtml: string) => {
      const level: 2 | 3 = tagName.toLowerCase() === 'h2' ? 2 : 3;
      const text = decodeHtmlEntities(innerHtml);

      if (!text) {
        return fullMatch;
      }

      const attrs = rawAttrs || '';
      const existingIdMatch = attrs.match(/\bid\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
      const rawExistingId = existingIdMatch
        ? (existingIdMatch[1] || existingIdMatch[2] || existingIdMatch[3] || '').trim()
        : '';

      const baseId = rawExistingId || slugifyHeading(text);
      const finalId = ensureUniqueId(baseId);

      tocItems.push({
        id: finalId,
        text,
        level,
      });

      if (existingIdMatch) {
        if (rawExistingId === finalId) {
          return fullMatch;
        }
        const updatedAttrs = attrs.replace(
          /\bid\s*=\s*(?:"[^"]+"|'[^']+'|[^\s>]+)/i,
          `id="${finalId}"`
        );
        return `<${tagName}${updatedAttrs}>${innerHtml}</${tagName}>`;
      }

      return `<${tagName} id="${finalId}"${attrs}>${innerHtml}</${tagName}>`;
    }
  );

  return {
    htmlWithIds,
    tocItems,
    shouldShowToc: tocItems.length >= minHeadings,
    defaultCollapsed: shouldDefaultCollapseToc(tocItems.length, collapseThreshold),
    shouldAutoExpand: shouldAutoExpandToc(tocItems.length, collapseThreshold),
  };
}

/**
 * Parses rendered H2 and H3 DOM elements inside a container element, ensuring each
 * heading has a unique `id` attribute and returning the ordered `TocItem[]` list.
 */
export function parseRenderedHeadingsFromDom(
  container: {
    querySelectorAll?: (selector: string) => Iterable<any> | ArrayLike<any>;
  } | null
): TocItem[] {
  if (!container || typeof container.querySelectorAll !== 'function') {
    return [];
  }

  const elements = Array.from(container.querySelectorAll('h2, h3') as ArrayLike<any>);
  const items: TocItem[] = [];
  const usedIds = new Set<string>();

  for (const el of elements) {
    const tagName = String(el?.tagName || '').toLowerCase();
    if (tagName !== 'h2' && tagName !== 'h3') continue;

    const textSource =
      el?.querySelector?.('.note-heading-text')?.textContent ??
      el?.textContent ??
      '';
    const cleanText = String(textSource)
      .replace(/Copy Link to Heading|Copy Link|Link copied!?|Copied!?|✓/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) continue;

    let headingId = String(el?.id || '').trim() || slugifyHeading(cleanText);
    if (usedIds.has(headingId)) {
      let counter = 2;
      while (usedIds.has(`${headingId}-${counter}`)) {
        counter += 1;
      }
      headingId = `${headingId}-${counter}`;
    }
    usedIds.add(headingId);

    if (!el.id) {
      el.id = headingId;
    }

    items.push({
      id: headingId,
      text: cleanText,
      level: tagName === 'h2' ? 2 : 3,
    });
  }

  return items;
}

/**
 * Automatically extracts all H2 and H3 headings from either raw HTML/Markdown content
 * or a rendered DOM container element, returning ordered TocItem entries with unique IDs.
 */
export function extractTocHeadings(
  source:
    | string
    | { querySelectorAll?: (selector: string) => ArrayLike<any> }
    | HTMLElement
    | null
    | undefined
): TocItem[] {
  if (!source) return [];
  if (typeof source === 'string') {
    return generateTableOfContents(source).tocItems;
  }
  if (typeof source === 'object' && typeof source.querySelectorAll === 'function') {
    return parseRenderedHeadingsFromDom(source);
  }
  return [];
}

export interface GroupedTocSection {
  section: TocItem;
  subsections: TocItem[];
}

/**
 * Groups flat H2 and H3 TOC items into hierarchical H2 parent sections with nested H3 subsections.
 */
export function groupTocItemsByH2(items: TocItem[]): GroupedTocSection[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  const groups: GroupedTocSection[] = [];
  for (const item of items) {
    if (item.level === 2 || groups.length === 0) {
      groups.push({ section: item, subsections: [] });
    } else {
      groups[groups.length - 1].subsections.push(item);
    }
  }
  return groups;
}

export interface SmoothScrollTocResult {
  scrolled: boolean;
  headingId: string;
  hash: string;
}

/**
 * Smoothly scrolls to a target H2/H3 heading element by ID (`behavior: 'smooth'`)
 * and updates the browser URL hash without triggering a page reload.
 */
export function smoothScrollToHeading(
  headingId: string,
  docOverride?: { getElementById?: (id: string) => { scrollIntoView?: (opts: any) => void } | null },
  winOverride?: { history?: { replaceState?: (data: any, unused: string, url?: string | null) => void } }
): SmoothScrollTocResult {
  const cleanId = (headingId || '').replace(/^#+/, '').trim();
  if (!cleanId) {
    return { scrolled: false, headingId: '', hash: '' };
  }

  const scrolled = jumpToHeadingSection(cleanId, docOverride, winOverride);
  return {
    scrolled,
    headingId: cleanId,
    hash: `#${cleanId}`,
  };
}

/**
 * Smoothly scrolls to a heading section by ID and updates the URL hash fragment without page reload.
 */
export function jumpToHeadingSection(
  headingId: string,
  docOverride?: { getElementById?: (id: string) => { scrollIntoView?: (opts: any) => void } | null },
  winOverride?: { history?: { replaceState?: (data: any, unused: string, url?: string | null) => void } }
): boolean {
  const cleanId = headingId.replace(/^#+/, '').trim();
  if (!cleanId) return false;

  const doc = docOverride ?? (typeof document !== 'undefined' ? document : undefined);
  const win = winOverride ?? (typeof window !== 'undefined' ? window : undefined);

  let scrolled = false;
  if (doc && typeof doc.getElementById === 'function') {
    const targetElement = doc.getElementById(cleanId);
    if (targetElement && typeof targetElement.scrollIntoView === 'function') {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      scrolled = true;
    }
  }

  if (win?.history && typeof win.history.replaceState === 'function') {
    win.history.replaceState(null, '', `#${cleanId}`);
  }

  return scrolled;
}

/**
 * Parses a URL hash fragment (e.g. `#checking-client-logs-events`) and smoothly scrolls
 * directly to the matching H2 or H3 section heading on page load or hash navigation.
 */
export function navigateToHashHeadingOnLoad(
  hash?: string,
  docOverride?: { getElementById?: (id: string) => { scrollIntoView?: (opts: any) => void } | null },
  winOverride?: {
    location?: { hash?: string };
    history?: { replaceState?: (data: any, unused: string, url?: string | null) => void };
  }
): string {
  const win = winOverride ?? (typeof window !== 'undefined' ? window : undefined);
  const rawHash = hash !== undefined ? hash : win?.location?.hash || '';
  const decodedHash = (() => {
    try {
      return decodeURIComponent(rawHash);
    } catch {
      return rawHash;
    }
  })();
  const cleanId = decodedHash.replace(/^#+/, '').trim();
  if (!cleanId) return '';

  const didScroll = jumpToHeadingSection(cleanId, docOverride, win);
  return didScroll ? cleanId : '';
}


/**
 * Builds a full shareable URL with the section `#anchor` fragment, stripping any prior hash.
 */
export function buildTocAnchorUrl(baseUrl: string, headingId: string): string {
  const cleanId = headingId.replace(/^#+/, '').trim();
  const baseWithoutHash = (baseUrl || '').split('#')[0] || '';
  if (!cleanId) {
    return baseWithoutHash;
  }
  return `${baseWithoutHash}#${cleanId}`;
}

export interface ClipboardWriterLike {
  writeText?: (text: string) => Promise<void>;
}

export const HEADING_COPY_BUTTON_LABEL = 'Copy Link';
export const HEADING_COPY_TOAST_MESSAGE = 'Link copied';

export interface CopySectionAnchorResult {
  ok: boolean;
  headingId: string;
  anchorUrl: string;
  toastMessage: string;
}

/**
 * Copies a section anchor URL to the system clipboard using the Clipboard API
 * with a safe DOM fallback when available.
 */
export async function copyTocAnchorToClipboard(
  anchorUrl: string,
  clipboardOverride?: ClipboardWriterLike
): Promise<boolean> {
  if (!anchorUrl) return false;

  const clipboard =
    clipboardOverride ??
    (typeof navigator !== 'undefined' ? navigator.clipboard : undefined);

  if (clipboard && typeof clipboard.writeText === 'function') {
    try {
      await clipboard.writeText(anchorUrl);
      return true;
    } catch {
      // Fall through to legacy textarea copy fallback if available
    }
  }

  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = anchorUrl;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = typeof document.execCommand === 'function' ? document.execCommand('copy') : false;
      document.body.removeChild(textarea);
      return Boolean(copied);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Copies the direct section anchor link (`https://...#section-id`) for an H2/H3 guide section
 * to the user's clipboard, appends `#section-id` to the browser URL hash, and returns the
 * anchor URL and toast notification message ('Link copied').
 */
export async function copySectionAnchorLink(
  headingId: string,
  baseUrl?: string,
  clipboardOverride?: ClipboardWriterLike,
  winOverride?: {
    location?: { href?: string };
    history?: { replaceState?: (data: any, unused: string, url?: string | null) => void };
  }
): Promise<CopySectionAnchorResult> {
  const cleanId = headingId.replace(/^#+/, '').trim();
  const win = winOverride ?? (typeof window !== 'undefined' ? window : undefined);
  const effectiveBaseUrl =
    baseUrl ??
    (win?.location?.href
      ? win.location.href
      : 'https://jawed.co.in/notes');
  const anchorUrl = buildTocAnchorUrl(effectiveBaseUrl, cleanId);

  if (cleanId && win?.history && typeof win.history.replaceState === 'function') {
    win.history.replaceState(null, '', `#${cleanId}`);
  }

  const ok = cleanId ? await copyTocAnchorToClipboard(anchorUrl, clipboardOverride) : false;

  return {
    ok,
    headingId: cleanId,
    anchorUrl,
    toastMessage: HEADING_COPY_TOAST_MESSAGE,
  };
}

/**
 * Ensures every rendered `<h2>` and `<h3>` element inside a live DOM container has an
 * automatically generated unique `id` attribute for deep-linking and an interactive
 * `'Copy Link'` button (`class="note-heading-copy-btn"`) that appends `#heading-id` to the URL.
 */
export function ensureHeadingIdsAndCopyButtonsInDom(
  container: { querySelectorAll?: (selector: string) => ArrayLike<any> } | HTMLElement | null,
  copiedHeadingId: string = ''
): TocItem[] {
  if (!container || typeof container.querySelectorAll !== 'function') {
    return [];
  }

  const headings = Array.from(container.querySelectorAll('h2, h3')) as HTMLElement[];
  const usedIds = new Set<string>();
  const items: TocItem[] = [];

  headings.forEach((heading) => {
    const existingBtn =
      typeof heading.querySelector === 'function'
        ? heading.querySelector<HTMLButtonElement>('.note-heading-copy-btn')
        : null;
    const rawText = (
      (typeof heading.querySelector === 'function'
        ? heading.querySelector('.note-heading-text')?.textContent
        : '') ||
      heading.textContent ||
      ''
    )
      .replace(/Copy Link to Heading|Copy Link|Link copied!?|Copied!?|✓/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!rawText) return;

    let headingId = (heading.id || heading.getAttribute?.('id') || '').trim() || slugifyHeading(rawText);
    if (usedIds.has(headingId)) {
      let count = 2;
      while (usedIds.has(`${headingId}-${count}`)) count += 1;
      headingId = `${headingId}-${count}`;
    }
    usedIds.add(headingId);
    if (heading.id !== headingId) {
      heading.id = headingId;
    }
    if (typeof heading.setAttribute === 'function') {
      heading.setAttribute('id', headingId);
    }

    heading.classList?.add?.('note-heading-with-copy');
    const isCopied = Boolean(copiedHeadingId && copiedHeadingId === headingId);
    const btnTitle = isCopied ? HEADING_COPY_TOAST_MESSAGE : 'Copy Link to Heading';
    const btnAria = isCopied
      ? `Link copied for section: ${rawText}`
      : `Copy Link to Heading: ${rawText}`;

    const btnHtml = isCopied
      ? `<span class="note-heading-copy-feedback" aria-hidden="true">✓</span><span class="note-heading-copy-text">${HEADING_COPY_TOAST_MESSAGE}</span>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg><span class="note-heading-copy-text">${HEADING_COPY_BUTTON_LABEL}</span>`;

    const doc =
      heading.ownerDocument || (typeof document !== 'undefined' ? document : undefined);

    if (existingBtn) {
      existingBtn.className = `note-heading-copy-btn${isCopied ? ' is-copied' : ''}`;
      existingBtn.setAttribute('data-copy-heading-id', headingId);
      existingBtn.setAttribute('data-testid', `copy-heading-link-${headingId}`);
      existingBtn.setAttribute('data-heading-anchor', `#${headingId}`);
      existingBtn.setAttribute('title', btnTitle);
      existingBtn.setAttribute('aria-label', btnAria);
      existingBtn.innerHTML = btnHtml;
    } else if (doc && typeof doc.createElement === 'function' && typeof heading.appendChild === 'function') {
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = `note-heading-copy-btn${isCopied ? ' is-copied' : ''}`;
      btn.setAttribute('data-copy-heading-id', headingId);
      btn.setAttribute('data-testid', `copy-heading-link-${headingId}`);
      btn.setAttribute('data-heading-anchor', `#${headingId}`);
      btn.setAttribute('title', btnTitle);
      btn.setAttribute('aria-label', btnAria);
      btn.innerHTML = btnHtml;
      heading.appendChild(btn);
    }

    items.push({
      id: headingId,
      text: rawText,
      level: heading.tagName.toLowerCase() === 'h3' ? 3 : 2,
    });
  });

  return items;
}

/**
 * Injects an interactive "Copy Link" button into every H2 and H3 guide section heading
 * so users can copy the direct anchor link to their clipboard and trigger the 'Link copied' toast.
 */
export function injectHeadingCopyButtons(
  htmlContent: string,
  copiedHeadingId: string = ''
): string {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return '';
  }

  const { htmlWithIds } = generateTableOfContents(htmlContent);
  const headingRegex = /<(h[23])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;

  return htmlWithIds.replace(
    headingRegex,
    (fullMatch, tagName: string, rawAttrs: string | undefined, innerHtml: string) => {
      const attrs = rawAttrs || '';
      const idMatch = attrs.match(/\bid\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
      const headingId = idMatch
        ? (idMatch[1] || idMatch[2] || idMatch[3] || '').trim()
        : '';

      if (!headingId) {
        return fullMatch;
      }

      // Avoid double-injection if already processed
      if (innerHtml.includes('data-copy-heading-id=')) {
        return fullMatch;
      }

      const plainText = decodeHtmlEntities(innerHtml).replace(/"/g, '&quot;');
      const isCopied = Boolean(copiedHeadingId && copiedHeadingId === headingId);
      const buttonLabel = isCopied ? 'Link copied' : 'Copy Link to Heading';
      const ariaLabel = isCopied
        ? `Link copied for section: ${plainText}`
        : `Copy Link to Heading: ${plainText}`;

      const classAttrMatch = attrs.match(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
      let updatedAttrs = attrs;
      if (classAttrMatch) {
        const existingClasses = classAttrMatch[1] ?? classAttrMatch[2] ?? '';
        if (!existingClasses.includes('note-heading-with-copy')) {
          updatedAttrs = attrs.replace(
            /\bclass\s*=\s*(?:"[^"]*"|'[^']*')/i,
            `class="${`${existingClasses} note-heading-with-copy`.trim()}"`
          );
        }
      } else {
        updatedAttrs = `${attrs} class="note-heading-with-copy"`;
      }

      const iconSvg = isCopied
        ? `<span class="note-heading-copy-feedback" aria-hidden="true">✓</span><span class="note-heading-copy-text">${HEADING_COPY_TOAST_MESSAGE}</span>`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg><span class="note-heading-copy-text">${HEADING_COPY_BUTTON_LABEL}</span>`;

      const copyButtonHtml = `<button type="button" class="note-heading-copy-btn${
        isCopied ? ' is-copied' : ''
      }" data-copy-heading-id="${headingId}" data-testid="copy-heading-link-${headingId}" data-heading-anchor="#${headingId}" title="${buttonLabel}" aria-label="${ariaLabel}">${iconSvg}</button>`;

      return `<${tagName}${updatedAttrs}><span class="note-heading-text">${innerHtml}</span>${copyButtonHtml}</${tagName}>`;
    }
  );
}

export interface AccessibleTableOptions {
  /**
   * Optional note or guide title used as fallback context when deriving screen reader captions.
   */
  noteTitle?: string;
  /**
   * Optional default caption prefix when no heading or column header context is available.
   */
  defaultCaption?: string;
}

/**
 * Derives an accessible screen reader caption for a `<table>` element by inspecting:
 * 1. An existing `<caption>` inside the table
 * 2. `aria-label`, `data-caption`, or `title` attributes on the `<table>`
 * 3. The nearest preceding H2/H3/H1 section heading and the table's `<th>` column headers
 * 4. Fallback note title or table index
 */
export function deriveTableCaptionText(
  tableHtml: string,
  precedingHtml: string = '',
  tableIndex: number = 1,
  options: AccessibleTableOptions = {}
): string {
  if (!tableHtml || typeof tableHtml !== 'string') {
    return options.defaultCaption || `Reference data table ${tableIndex}`;
  }

  // 1. Check for an existing <caption>...</caption>
  const existingCaptionMatch = tableHtml.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i);
  if (existingCaptionMatch?.[1]) {
    const cleanedExisting = decodeHtmlEntities(existingCaptionMatch[1]);
    if (cleanedExisting) {
      return cleanedExisting;
    }
  }

  // 2. Check for aria-label, data-caption, or title on the opening <table> tag
  const openTagMatch = tableHtml.match(/^<table(\s[^>]*)?>/i);
  const openTagAttrs = openTagMatch?.[1] || '';
  const attrCaptionMatch =
    openTagAttrs.match(/\b(?:aria-label|data-caption|title)\s*=\s*"([^"]+)"/i) ||
    openTagAttrs.match(/\b(?:aria-label|data-caption|title)\s*=\s*'([^']+)'/i);
  if (attrCaptionMatch?.[1]) {
    const cleanedAttr = decodeHtmlEntities(attrCaptionMatch[1]);
    if (cleanedAttr) {
      return cleanedAttr;
    }
  }

  // 3. Find nearest preceding heading (h2, h3, or h1) in precedingHtml
  let nearestHeading = '';
  if (precedingHtml) {
    const headingRegex = /<(h[123])(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
    let match: RegExpExecArray | null = null;
    while ((match = headingRegex.exec(precedingHtml)) !== null) {
      const rawHeadingInner = match[2] || '';
      const withoutCopyBtn = rawHeadingInner.replace(
        /<button\b[^>]*class="[^"]*note-heading-copy-btn[^"]*"[^>]*>[\s\S]*?<\/button>/gi,
        ''
      );
      const decodedHeading = decodeHtmlEntities(withoutCopyBtn);
      if (decodedHeading) {
        nearestHeading = decodedHeading;
      }
    }
  }

  // 4. Extract <th> column headers from <thead> or the first header row
  const headerSourceMatch = tableHtml.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i);
  const firstRowMatch = tableHtml.match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i);
  const headerSearchScope = headerSourceMatch?.[1] || firstRowMatch?.[1] || '';
  const thHeaders: string[] = [];
  if (headerSearchScope) {
    const thRegex = /<th\b[^>]*>([\s\S]*?)<\/th>/gi;
    let thMatch: RegExpExecArray | null = null;
    while ((thMatch = thRegex.exec(headerSearchScope)) !== null && thHeaders.length < 6) {
      const headerText = decodeHtmlEntities(thMatch[1] || '');
      if (headerText && headerText !== '—' && headerText !== '-') {
        thHeaders.push(headerText);
      }
    }
  }

  if (nearestHeading && thHeaders.length > 0) {
    return `${nearestHeading} — Table columns: ${thHeaders.join(', ')}`;
  }
  if (nearestHeading) {
    return `${nearestHeading} — Data table`;
  }
  if (thHeaders.length > 0) {
    const prefix = options.noteTitle ? `${options.noteTitle.trim()} — ` : '';
    return `${prefix}Table columns: ${thHeaders.join(', ')}`;
  }
  if (options.defaultCaption) {
    return options.defaultCaption;
  }
  if (options.noteTitle) {
    return `${options.noteTitle.trim()} — Reference table ${tableIndex}`;
  }
  return `Reference data table ${tableIndex}`;
}

/**
 * Wraps all `<table>` elements in rendered note HTML inside an accessible scroll container
 * (`.table-wrap.note-accessible-table-container`) that explicitly enables horizontal scrolling
 * on touch devices (`overflow-x: auto; -webkit-overflow-scrolling: touch; touch-action: pan-x pan-y;`)
 * and injects a screen reader `<caption>` (`.sr-only.note-table-caption`) into every table.
 */
export function wrapTablesInAccessibleContainers(
  htmlContent: string,
  options: AccessibleTableOptions = {}
): string {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return '';
  }

  // Mask <pre> blocks so code examples containing literal <table> strings are untouched
  const preBlocks: string[] = [];
  const maskedContent = htmlContent.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, (match) => {
    const token = `__TOC_TABLE_PRE_BLOCK_${preBlocks.length}__`;
    preBlocks.push(match);
    return token;
  });

  // Unwrap any pre-existing .table-wrap wrapper around a single <table> to avoid double-wrapping
  const unwrappedContent = maskedContent.replace(
    /<div\b[^>]*class=(?:"[^"]*\b(?:table-wrap|note-accessible-table-container)\b[^"]*"|'[^']*\b(?:table-wrap|note-accessible-table-container)\b[^']*')[^>]*>\s*(<table\b[\s\S]*?<\/table>)\s*<\/div>/gi,
    '$1'
  );

  let tableCount = 0;
  const tableRegex = /<table(\s[^>]*)?>([\s\S]*?)<\/table>/gi;

  const wrappedContent = unwrappedContent.replace(
    tableRegex,
    (fullTableMatch, rawTableAttrs: string | undefined, innerTableHtml: string, offset: number) => {
      tableCount += 1;
      const captionId = `note-table-caption-${tableCount}`;
      const precedingSlice = unwrappedContent.slice(0, offset);
      const captionText = deriveTableCaptionText(
        fullTableMatch,
        precedingSlice,
        tableCount,
        options
      );

      const escapedAttrCaption = captionText
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;');
      const escapedCaptionHtml = captionText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      let updatedInnerHtml = innerTableHtml;
      if (/<caption\b[^>]*>[\s\S]*?<\/caption>/i.test(innerTableHtml)) {
        updatedInnerHtml = innerTableHtml.replace(
          /<caption(\s[^>]*)?>([\s\S]*?)<\/caption>/i,
          (_capMatch, rawCapAttrs: string | undefined, capBody: string) => {
            let capAttrs = rawCapAttrs || '';
            if (!/\bid\s*=/i.test(capAttrs)) {
              capAttrs += ` id="${captionId}"`;
            }
            if (!/\bdata-testid\s*=/i.test(capAttrs)) {
              capAttrs += ' data-testid="note-table-sr-caption"';
            }
            if (/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i.test(capAttrs)) {
              capAttrs = capAttrs.replace(
                /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i,
                (_m, c1, c2) => {
                  const existing = (c1 ?? c2 ?? '').trim();
                  const merged = Array.from(
                    new Set([...existing.split(/\s+/), 'sr-only', 'note-table-caption'].filter(Boolean))
                  ).join(' ');
                  return `class="${merged}"`;
                }
              );
            } else {
              capAttrs += ' class="sr-only note-table-caption"';
            }
            return `<caption${capAttrs}>${capBody}</caption>`;
          }
        );
      } else {
        updatedInnerHtml = `<caption id="${captionId}" class="sr-only note-table-caption" data-testid="note-table-sr-caption">${escapedCaptionHtml}</caption>${innerTableHtml}`;
      }

      let tableAttrs = rawTableAttrs || '';
      if (/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i.test(tableAttrs)) {
        tableAttrs = tableAttrs.replace(
          /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i,
          (_m, c1, c2) => {
            const existing = (c1 ?? c2 ?? '').trim();
            if (existing.includes('note-data-table')) return `class="${existing}"`;
            return `class="${`${existing} note-data-table`.trim()}"`;
          }
        );
      } else {
        tableAttrs += ' class="note-data-table"';
      }

      if (!/\baria-describedby\s*=/i.test(tableAttrs)) {
        tableAttrs += ` aria-describedby="${captionId}"`;
      }

      return `<div class="table-wrap note-accessible-table-container" role="region" aria-labelledby="${captionId}" aria-label="${escapedAttrCaption}" tabindex="0" data-testid="note-accessible-table-container" data-touch-scroll="horizontal" style="overflow-x: auto; -webkit-overflow-scrolling: touch; touch-action: pan-x pan-y; max-width: 100%;"><table${tableAttrs}>${updatedInnerHtml}</table></div>`;
    }
  );

  return wrappedContent.replace(
    /__TOC_TABLE_PRE_BLOCK_(\d+)__/g,
    (_, idx) => preBlocks[Number(idx)] ?? ''
  );
}

/**
 * Enhances any live DOM `<table>` elements inside a container element so that every table
 * is wrapped in `.table-wrap.note-accessible-table-container` with explicit touch horizontal
 * scrolling and contains an accessible screen reader `<caption>`.
 */
export function ensureAccessibleTablesInDom(
  container: HTMLElement | null,
  options: AccessibleTableOptions = {}
): number {
  if (!container || typeof container.querySelectorAll !== 'function' || typeof document === 'undefined') {
    return 0;
  }

  const tables = Array.from(container.querySelectorAll<HTMLTableElement>('table'));
  tables.forEach((table, idx) => {
    const tableNum = idx + 1;
    const captionId = `note-table-caption-${tableNum}`;

    // Ensure <caption> exists inside the table for screen readers
    let captionEl = table.querySelector('caption');
    let captionText = captionEl?.textContent?.trim() || '';

    if (!captionText) {
      const thTexts = Array.from(table.querySelectorAll('th'))
        .map((th) => (th.textContent || '').trim())
        .filter((t) => Boolean(t) && t !== '—' && t !== '-')
        .slice(0, 6);

      captionText =
        thTexts.length > 0
          ? `${options.noteTitle ? `${options.noteTitle} — ` : ''}Table columns: ${thTexts.join(', ')}`
          : options.defaultCaption ||
            (options.noteTitle
              ? `${options.noteTitle} — Reference table ${tableNum}`
              : `Reference data table ${tableNum}`);
    }

    if (!captionEl) {
      captionEl = document.createElement('caption');
      captionEl.textContent = captionText;
      table.insertBefore(captionEl, table.firstChild);
    }

    if (!captionEl.id) {
      captionEl.id = captionId;
    }
    captionEl.classList.add('sr-only', 'note-table-caption');
    captionEl.setAttribute('data-testid', 'note-table-sr-caption');

    table.classList.add('note-data-table');
    if (!table.getAttribute('aria-describedby')) {
      table.setAttribute('aria-describedby', captionEl.id);
    }

    // Check if parent is already a .table-wrap or .note-accessible-table-container
    const parentEl = table.parentElement;
    const isAlreadyWrapped =
      parentEl &&
      (parentEl.classList.contains('table-wrap') ||
        parentEl.classList.contains('note-accessible-table-container'));

    const wrapper = isAlreadyWrapped ? parentEl : document.createElement('div');
    wrapper.classList.add('table-wrap', 'note-accessible-table-container');
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-labelledby', captionEl.id);
    wrapper.setAttribute('aria-label', captionText);
    wrapper.setAttribute('tabindex', '0');
    wrapper.setAttribute('data-testid', 'note-accessible-table-container');
    wrapper.setAttribute('data-touch-scroll', 'horizontal');
    wrapper.style.overflowX = 'auto';
    wrapper.style.setProperty('-webkit-overflow-scrolling', 'touch');
    wrapper.style.touchAction = 'pan-x pan-y';
    wrapper.style.maxWidth = '100%';

    if (!isAlreadyWrapped && parentEl) {
      parentEl.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  });

  return tables.length;
}

export const CODE_MARKDOWN_BUTTON_LABEL = 'Copy as Markdown';
export const CODE_MARKDOWN_COPIED_LABEL = 'Copied as Markdown';

export interface FormatCodeMarkdownOptions {
  /**
   * Optional syntax language identifier for the fenced Markdown block (e.g., 'bash', 'powershell', 'json', 'csv').
   */
  language?: string;
  /**
   * Optional descriptive label rendered as a bold Markdown heading above the fenced code block.
   */
  label?: string;
  /**
   * Optional CLI prompt symbol (e.g., '#', '$', 'Switch#') to prefix the command.
   */
  promptSymbol?: string;
  /**
   * Optional sample CLI output included inside the Markdown block.
   */
  output?: string;
}

export interface CopyCodeMarkdownResult {
  ok: boolean;
  blockId: string;
  markdown: string;
  code: string;
  language: string;
  toastMessage: string;
}

/**
 * Strips HTML tags inside `<pre>` / `<code>` blocks and decodes HTML entities
 * while preserving line breaks (`\n`) and indentation.
 */
export function decodeCodeBlockEntities(rawCodeHtml: string): string {
  if (!rawCodeHtml || typeof rawCodeHtml !== 'string') return '';

  return rawCodeHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp|ndash|mdash|rarr|larr);/gi, (match) => {
      const lower = match.toLowerCase();
      return NAMED_HTML_ENTITIES[lower] ?? match;
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/\r\n/g, '\n')
    .replace(/^\n+|\n+$/g, '');
}

/**
 * Formats raw code or HTML `<pre>` content into a fenced Markdown code block (` ```...``` `)
 * ready to be pasted into technical documentation or support tickets.
 */
export function formatCodeBlockAsMarkdown(
  rawCode: string,
  options: FormatCodeMarkdownOptions = {}
): string {
  const cleanCode = decodeCodeBlockEntities(rawCode);
  const lang = (options.language ?? '').trim();
  const prompt = (options.promptSymbol ?? '').trim();

  const codeWithPrompt =
    prompt && cleanCode && !cleanCode.startsWith(prompt)
      ? `${prompt} ${cleanCode}`
      : cleanCode;

  const cleanOutput = options.output ? decodeCodeBlockEntities(options.output) : '';
  const fullBody = cleanOutput
    ? `${codeWithPrompt}\n\n# Output:\n${cleanOutput}`
    : codeWithPrompt;

  const fenced = `\`\`\`${lang}\n${fullBody}\n\`\`\``;
  if (options.label?.trim()) {
    return `**${options.label.trim()}**\n${fenced}`;
  }
  return fenced;
}

/**
 * Formats a technical code block as Markdown and copies it to the user's clipboard.
 */
export async function copyCodeBlockAsMarkdown(
  rawCode: string,
  options: FormatCodeMarkdownOptions & { blockId?: string } = {},
  clipboardOverride?: ClipboardWriterLike
): Promise<CopyCodeMarkdownResult> {
  const cleanCode = decodeCodeBlockEntities(rawCode);
  const language = (options.language ?? '').trim();
  const markdown = formatCodeBlockAsMarkdown(rawCode, options);
  const ok = cleanCode ? await copyTocAnchorToClipboard(markdown, clipboardOverride) : false;

  return {
    ok,
    blockId: options.blockId || 'note-code-block-1',
    markdown,
    code: cleanCode,
    language,
    toastMessage: CODE_MARKDOWN_COPIED_LABEL,
  };
}

/**
 * Wraps every `<pre>` technical code block in rendered note HTML inside a container
 * with a "Copy as Markdown" action button (`data-testid="copy-code-markdown-btn"`) so
 * field technicians can copy formatted Markdown code blocks for documentation or tickets.
 */
export function injectCodeBlockMarkdownCopyButtons(
  htmlContent: string,
  copiedBlockId: string = ''
): string {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return '';
  }

  // Unwrap any pre-existing .note-code-block-wrapper around a <pre> so re-renders with copiedBlockId update cleanly
  const unwrapped = htmlContent.replace(
    /<div\b[^>]*class="[^"]*\bnote-code-block-wrapper\b[^"]*"[^>]*>\s*<div\b[^>]*class="[^"]*\bnote-code-block-toolbar\b[^"]*"[^>]*>[\s\S]*?<\/div>\s*(<pre\b[\s\S]*?<\/pre>)\s*<\/div>/gi,
    '$1'
  );

  let blockIndex = 0;
  const preRegex = /<pre(\s[^>]*)?>([\s\S]*?)<\/pre>/gi;

  return unwrapped.replace(
    preRegex,
    (_fullMatch, rawPreAttrs: string | undefined, innerPreHtml: string) => {
      blockIndex += 1;
      const blockId = `note-code-block-${blockIndex}`;
      const preAttrs = rawPreAttrs || '';

      // Detect language from <pre> or inner <code> attributes if present
      const combinedMarkup = `${preAttrs} ${innerPreHtml.slice(0, 160)}`;
      const langMatch =
        combinedMarkup.match(/\b(?:language|lang)-([a-z0-9_+-]+)/i) ||
        combinedMarkup.match(/\bdata-lang\s*=\s*["']([^"']+)["']/i);
      const detectedLang = (langMatch?.[1] || '').trim().toLowerCase();

      const markdownText = formatCodeBlockAsMarkdown(innerPreHtml, {
        language: detectedLang,
      });
      const escapedMarkdownAttr = markdownText
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '&#10;');

      const isCopied = Boolean(copiedBlockId && copiedBlockId === blockId);
      const buttonLabel = isCopied ? CODE_MARKDOWN_COPIED_LABEL : CODE_MARKDOWN_BUTTON_LABEL;
      const buttonIcon = isCopied
        ? `<span class="note-code-copy-feedback" aria-hidden="true">✓</span><span class="note-code-copy-text">${CODE_MARKDOWN_COPIED_LABEL}</span>`
        : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span class="note-code-copy-text">${CODE_MARKDOWN_BUTTON_LABEL}</span>`;

      const toolbarHtml = `<div class="note-code-block-toolbar no-print"><span class="note-code-block-lang">${
        detectedLang || 'markdown'
      }</span><button type="button" class="note-code-copy-markdown-btn${
        isCopied ? ' is-copied' : ''
      }" data-testid="copy-code-markdown-btn" data-copy-code-markdown-id="${blockId}" data-code-lang="${detectedLang}" data-markdown-content="${escapedMarkdownAttr}" title="${buttonLabel}" aria-label="${buttonLabel}">${buttonIcon}</button></div>`;

      return `<div class="note-code-block-wrapper" data-testid="note-code-block-wrapper" data-code-block-id="${blockId}">${toolbarHtml}<pre${preAttrs}>${innerPreHtml}</pre></div>`;
    }
  );
}

export interface WebShareNavigatorLike {
  share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
  canShare?: (data: { title?: string; text?: string; url?: string }) => boolean;
  clipboard?: {
    writeText?: (text: string) => Promise<void>;
  };
}

export interface ShareNoteResult {
  ok: boolean;
  method: 'web-share' | 'clipboard' | 'aborted' | 'failed';
  url: string;
  title: string;
}

/**
 * Shares a technical guide or note's URL and title using the native Web Share API (`navigator.share`),
 * falling back gracefully to copying the URL to the clipboard (`navigator.clipboard.writeText` / DOM fallback)
 * when `navigator.share` is unavailable, unsupported, or fails with a non-abort error.
 */
export async function shareNoteUrlAndTitle(
  payload: {
    title: string;
    url: string;
    text?: string;
  },
  navOverride?: WebShareNavigatorLike
): Promise<ShareNoteResult> {
  const cleanTitle = (payload.title || 'Technical Note').trim();
  const cleanUrl = (payload.url || '').trim();
  const cleanText = payload.text?.trim() || undefined;
  const shareData = {
    title: cleanTitle,
    ...(cleanText ? { text: cleanText } : {}),
    url: cleanUrl,
  };

  const nav: WebShareNavigatorLike | undefined =
    navOverride ??
    (typeof navigator !== 'undefined' ? (navigator as unknown as WebShareNavigatorLike) : undefined);

  if (nav && typeof nav.share === 'function') {
    const canShareData = typeof nav.canShare === 'function' ? nav.canShare(shareData) : true;
    if (canShareData) {
      try {
        await nav.share(shareData);
        return {
          ok: true,
          method: 'web-share',
          url: cleanUrl,
          title: cleanTitle,
        };
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          return {
            ok: false,
            method: 'aborted',
            url: cleanUrl,
            title: cleanTitle,
          };
        }
        // Fall through to clipboard copy fallback on non-abort errors
      }
    }
  }

  // Fallback: copy URL to clipboard when Web Share API is unavailable or unsupported
  const copied = await copyTocAnchorToClipboard(cleanUrl, nav?.clipboard);
  return {
    ok: copied,
    method: copied ? 'clipboard' : 'failed',
    url: cleanUrl,
    title: cleanTitle,
  };
}
