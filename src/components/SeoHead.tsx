import React, { useEffect } from 'react';

interface SeoHeadProps {
  title?: string;
  description?: string;
  ogType?: string;
  ogImage?: string;
  canonicalUrl?: string;
}

const DEFAULT_TITLE = 'Jawed Imtiaz — IT Support & Workplace Technology';
const DEFAULT_DESC = 'Practical IT field guides, subnet calculators, server rack power calculators, and interactive IT service desk diagnostic tools.';

export const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description,
  ogType = 'article',
  ogImage = 'https://jawed.co.in/assets/images/social-preview.png',
  canonicalUrl,
}) => {
  useEffect(() => {
    const fullTitle = title ? `${title} | Jawed Imtiaz` : DEFAULT_TITLE;
    const fullDesc = description || DEFAULT_DESC;

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
    updateMeta('meta[property="og:title"]', fullTitle);
    updateMeta('meta[property="og:description"]', fullDesc);
    updateMeta('meta[property="og:type"]', ogType);
    updateMeta('meta[property="og:image"]', ogImage);
    updateMeta('meta[name="twitter:title"]', fullTitle);
    updateMeta('meta[name="twitter:description"]', fullDesc);

    if (canonicalUrl) {
      let linkEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!linkEl) {
        linkEl = document.createElement('link');
        linkEl.setAttribute('rel', 'canonical');
        document.head.appendChild(linkEl);
      }
      linkEl.setAttribute('href', canonicalUrl);
    }
  }, [title, description, ogType, ogImage, canonicalUrl]);

  return null;
};
