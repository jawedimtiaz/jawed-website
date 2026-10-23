import { useEffect } from 'react';

export interface SeoFrontmatter {
  title?: string;
  description?: string;
}

const DEFAULT_TITLE = 'Jawed Imtiaz | Guides, Tools & Services';
const DEFAULT_DESCRIPTION = 'Technical guides, subnet calculators, server rack power calculators, and interactive diagnostic tools by Jawed Imtiaz.';

/**
 * Custom hook: useSeoMetadata
 * Dynamically updates document.title and injects/updates <meta name="description">
 * whenever the frontmatter or active guide changes, with proper cleanup on unmount.
 */
export const useSeoMetadata = (frontmatter: SeoFrontmatter, slug?: string) => {
  useEffect(() => {
    const originalTitle = document.title;
    let metaDescElement = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    let createdMetaTag = false;

    if (!metaDescElement) {
      metaDescElement = document.createElement('meta');
      metaDescElement.setAttribute('name', 'description');
      document.head.appendChild(metaDescElement);
      createdMetaTag = true;
    }

    const previousDescription = metaDescElement.getAttribute('content') || DEFAULT_DESCRIPTION;

    // Set dynamic title
    if (frontmatter.title) {
      const formattedTitle = frontmatter.title.includes('Jawed Imtiaz')
        ? frontmatter.title
        : `${frontmatter.title} | Jawed Imtiaz`;
      document.title = formattedTitle;
    } else {
      document.title = DEFAULT_TITLE;
    }

    // Set dynamic meta description
    if (frontmatter.description) {
      metaDescElement.setAttribute('content', frontmatter.description);
    } else {
      metaDescElement.setAttribute('content', DEFAULT_DESCRIPTION);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      document.title = originalTitle || DEFAULT_TITLE;
      if (metaDescElement) {
        if (createdMetaTag && metaDescElement.parentNode) {
          metaDescElement.parentNode.removeChild(metaDescElement);
        } else {
          metaDescElement.setAttribute('content', previousDescription);
        }
      }
    };
  }, [slug, frontmatter.title, frontmatter.description]);
};
