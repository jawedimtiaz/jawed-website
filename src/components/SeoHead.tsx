import React, { useEffect } from 'react';

interface SeoHeadProps {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  ogImage?: string;
  canonicalUrl?: string;
  robots?: string;
}

const DEFAULT_TITLE = 'Jawed Imtiaz | Guides, Tools & Services';
const DEFAULT_DESC = 'Technical guides, subnet calculators, server rack power calculators, and interactive diagnostic tools by Jawed Imtiaz.';

export const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description,
  ogTitle,
  ogDescription,
  ogType = 'article',
  ogImage = 'https://jawed.co.in/assets/images/social-preview.png',
  canonicalUrl,
  robots = 'index, follow',
}) => {
  useEffect(() => {
    const fullTitle = title ? (title.includes('Jawed Imtiaz') ? title : `${title} | Jawed Imtiaz`) : DEFAULT_TITLE;
    const fullDesc = description || DEFAULT_DESC;
    const resolvedOgTitle = ogTitle
      ? (ogTitle.includes('Jawed Imtiaz') ? ogTitle : `${ogTitle} | Jawed Imtiaz`)
      : fullTitle;
    const resolvedOgDesc = ogDescription || fullDesc;

    // Update document title
    document.title = fullTitle;

    // Helper to update meta property or name
    const updateMeta = (selector: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        if (selector.startsWith('meta[name=')) {
          const name = selector.match(/name="([^"]+)"/)?.[1];
          if (name) el.setAttribute('name', name);
        } else if (selector.startsWith('meta[property=')) {
          const prop = selector.match(/property="([^"]+)"/)?.[1];
          if (prop) el.setAttribute('property', prop);
        }
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    updateMeta('meta[name="description"]', fullDesc);
    updateMeta('meta[name="robots"]', robots);
    updateMeta('meta[property="og:site_name"]', 'Jawed Imtiaz');
    updateMeta('meta[property="og:title"]', resolvedOgTitle);
    updateMeta('meta[property="og:description"]', resolvedOgDesc);
    updateMeta('meta[property="og:type"]', ogType);
    updateMeta('meta[property="og:image"]', ogImage);
    updateMeta('meta[property="og:image:width"]', '1200');
    updateMeta('meta[property="og:image:height"]', '630');
    updateMeta('meta[name="twitter:card"]', 'summary_large_image');
    updateMeta('meta[name="twitter:title"]', resolvedOgTitle);
    updateMeta('meta[name="twitter:description"]', resolvedOgDesc);
    updateMeta('meta[name="twitter:image"]', ogImage);

    const resolvedCanonical = canonicalUrl || (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://jawed.co.in/');
    updateMeta('meta[property="og:url"]', resolvedCanonical);

    let linkEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!linkEl) {
      linkEl = document.createElement('link');
      linkEl.setAttribute('rel', 'canonical');
      document.head.appendChild(linkEl);
    }
    linkEl.setAttribute('href', resolvedCanonical);
  }, [title, description, ogTitle, ogDescription, ogType, ogImage, canonicalUrl, robots]);

  return null;
};
