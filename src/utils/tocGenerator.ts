export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface TocGeneratorOptions {
  /**
   * Minimum number of H2/H3 headings required to display the Table of Contents.
   * Defaults to 2 so multi-section guides automatically display the TOC.
   */
  minHeadings?: number;
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

  const withoutTags = rawHtml.replace(/<[^>]+>/g, '');

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
  const masked = content.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, (match) => {
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

  if (!htmlContent || typeof htmlContent !== 'string') {
    return {
      htmlWithIds: '',
      tocItems: [],
      shouldShowToc: false,
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
      .replace(/Copy Link to Heading|Copied!?|✓/g, '')
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
 * Injects an interactive "Copy Link to Heading" button into every H2 and H3 tag
 * so hovering over any section heading in NoteDetailPage reveals a deep-link copy button.
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
      const buttonLabel = isCopied ? 'Copied!' : 'Copy Link to Heading';
      const ariaLabel = isCopied
        ? `Copied link to heading: ${plainText}`
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
        ? `<span class="note-heading-copy-feedback" aria-hidden="true">✓</span><span class="note-heading-copy-text">Copied</span>`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg><span class="note-heading-copy-text">Copy Link to Heading</span>`;

      const copyButtonHtml = `<button type="button" class="note-heading-copy-btn${
        isCopied ? ' is-copied' : ''
      }" data-copy-heading-id="${headingId}" data-testid="copy-heading-link-${headingId}" title="${buttonLabel}" aria-label="${ariaLabel}">${iconSvg}</button>`;

      return `<${tagName}${updatedAttrs}><span class="note-heading-text">${innerHtml}</span>${copyButtonHtml}</${tagName}>`;
    }
  );
}

