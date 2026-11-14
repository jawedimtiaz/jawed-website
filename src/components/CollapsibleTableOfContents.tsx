import {
  TableOfContents,
  CollapsibleTableOfContents,
  generateTableOfContents,
  extractTocHeadings,
  groupTocItemsByH2,
  smoothScrollToHeading,
  jumpToHeadingSection,
  parseRenderedHeadingsFromDom,
  TOC_AUTO_COLLAPSE_HEADING_THRESHOLD,
  shouldAutoExpandToc,
  shouldDefaultCollapseToc,
  type TableOfContentsProps,
  type TocItem,
  type GroupedTocSection,
  type SmoothScrollTocResult,
} from './TableOfContents';

export {
  TableOfContents,
  CollapsibleTableOfContents,
  generateTableOfContents,
  extractTocHeadings,
  groupTocItemsByH2,
  smoothScrollToHeading,
  jumpToHeadingSection,
  parseRenderedHeadingsFromDom,
  TOC_AUTO_COLLAPSE_HEADING_THRESHOLD,
  shouldAutoExpandToc,
  shouldDefaultCollapseToc,
  type TableOfContentsProps,
  type TocItem,
  type GroupedTocSection,
  type SmoothScrollTocResult,
};

export default CollapsibleTableOfContents;
