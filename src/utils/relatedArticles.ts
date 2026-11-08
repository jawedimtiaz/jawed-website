import notesData from '../data/notesData.json';
import blogData from '../data/blogData.json';
import { FIELD_GUIDES } from '../data/fieldGuidesData';
import { calculateReadTime } from './readTimeHelper';

export interface ArticleCandidate {
  slug: string;
  title: string;
  description: string;
  category?: string;
  tags?: string[];
  topics?: string[];
  keywords?: string[];
  content?: string;
  readTime?: string;
  sourceType?: 'note' | 'blog' | 'guide';
  href?: string;
}

export interface RelatedArticleSuggestion {
  slug: string;
  title: string;
  description: string;
  category: string;
  href: string;
  readTime: string;
  matchedTopics: string[];
  score: number;
  sourceType: 'note' | 'blog' | 'guide';
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'that',
  'this',
  'into',
  'your',
  'how',
  'what',
  'when',
  'where',
  'why',
  'who',
  'are',
  'was',
  'were',
  'been',
  'have',
  'has',
  'had',
  'not',
  'but',
  'can',
  'use',
  'using',
  'used',
  'practical',
  'simple',
  'starting',
  'point',
  'guide',
  'notes',
  'note',
  'blog',
  'post',
  'work',
  'look',
  'modern',
  'better',
  'basic',
  'common',
  'before',
  'after',
  'without',
  'while',
  'about',
  'more',
  'other',
  'some',
  'than',
  'then',
  'them',
  'they',
  'their',
]);

function normalizeTopicToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&amp;/g, 'and')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts normalized tags, topics, categories, and domain keywords from an article or post.
 */
export function extractArticleTopicsAndTags(item: ArticleCandidate): string[] {
  const tagsSet = new Set<string>();

  const addPhraseAndTokens = (value?: string, includePhrase = true) => {
    if (!value) return;
    const normalized = normalizeTopicToken(value);
    if (!normalized) return;

    if (includePhrase && normalized.length >= 2 && !STOP_WORDS.has(normalized)) {
      tagsSet.add(normalized);
    }

    for (const word of normalized.split(/[\s-]+/)) {
      if (word.length >= 3 && !STOP_WORDS.has(word)) {
        tagsSet.add(word);
      }
    }
  };

  if (item.category) {
    addPhraseAndTokens(item.category, true);
  }

  for (const list of [item.tags, item.topics, item.keywords]) {
    if (Array.isArray(list)) {
      for (const entry of list) {
        addPhraseAndTokens(entry, true);
      }
    }
  }

  if (item.content) {
    // Extract eyebrow topic: <p class="eyebrow">Notes · AI &amp; Productivity</p>
    const eyebrowMatch = item.content.match(/<p\s+class=["']eyebrow["'][^>]*>([\s\S]*?)<\/p>/i);
    if (eyebrowMatch?.[1]) {
      const parts = eyebrowMatch[1].replace(/<[^>]+>/g, '').split('·');
      for (const part of parts) {
        addPhraseAndTokens(part, true);
      }
    }

    // Extract Subject / Task from <p class="meta">Subject: ... · Task: ...</p>
    const subjectMatch = item.content.match(/Subject:\s*([^·<\r\n]+)/i);
    if (subjectMatch?.[1]) {
      addPhraseAndTokens(subjectMatch[1], true);
    }

    const taskMatch = item.content.match(/Task:\s*([^·<\r\n]+)/i);
    if (taskMatch?.[1]) {
      addPhraseAndTokens(taskMatch[1], true);
    }
  }

  addPhraseAndTokens(item.title, false);
  addPhraseAndTokens(item.description, false);

  return Array.from(tagsSet);
}

/**
 * Builds the default unified pool of articles from notesData, blogData, and FIELD_GUIDES.
 */
export function getDefaultArticlePool(): ArticleCandidate[] {
  const pool: ArticleCandidate[] = [];
  const seenSlugs = new Set<string>();

  for (const post of blogData as Array<{
    slug: string;
    title: string;
    description: string;
    category?: string;
    tags?: string[];
    topics?: string[];
    content?: string;
  }>) {
    if (!post?.slug || seenSlugs.has(post.slug)) continue;
    seenSlugs.add(post.slug);
    pool.push({
      slug: post.slug,
      title: post.title,
      description: post.description,
      category: post.category || 'Blog Post',
      tags: post.tags,
      topics: post.topics,
      content: post.content,
      readTime: calculateReadTime(post.content || post.description),
      sourceType: 'blog',
      href: `/blog/${post.slug}`,
    });
  }

  for (const guide of FIELD_GUIDES) {
    if (!guide?.slug || seenSlugs.has(guide.slug)) continue;
    seenSlugs.add(guide.slug);
    pool.push({
      slug: guide.slug,
      title: guide.title,
      description: guide.description,
      category: guide.category || 'Field Guide',
      keywords: guide.keywords,
      readTime: guide.readTime || calculateReadTime(guide.description),
      sourceType: 'guide',
      href: `/field-guides/${guide.slug}`,
    });
  }

  for (const note of notesData as Array<{
    slug: string;
    title: string;
    description: string;
    category?: string;
    tags?: string[];
    topics?: string[];
    content?: string;
  }>) {
    if (!note?.slug || seenSlugs.has(note.slug)) continue;
    seenSlugs.add(note.slug);
    pool.push({
      slug: note.slug,
      title: note.title,
      description: note.description,
      category: note.category || 'Quick Note',
      tags: note.tags,
      topics: note.topics,
      content: note.content,
      readTime: calculateReadTime(note.content || note.description),
      sourceType: 'note',
      href: `/notes/${note.slug}`,
    });
  }

  return pool;
}

/**
 * Computes the top N (default 3) related articles for a given note or blog post
 * based on matching tags, topics, categories, and cross-references.
 */
export function getRelatedArticles(
  current: ArticleCandidate,
  candidates: ArticleCandidate[] = getDefaultArticlePool(),
  count: number = 3
): RelatedArticleSuggestion[] {
  if (!current?.slug || count <= 0) return [];

  const currentTopics = new Set(extractArticleTopicsAndTags(current));
  const currentCategory = normalizeTopicToken(current.category || '');
  const currentContent = current.content || '';

  const scored = candidates
    .filter((item) => item && item.slug && item.slug !== current.slug)
    .map((candidate) => {
      const candidateTopics = extractArticleTopicsAndTags(candidate);
      const matchedTopics: string[] = [];

      let score = 0;

      for (const topic of candidateTopics) {
        if (currentTopics.has(topic)) {
          matchedTopics.push(topic);
          // Multi-word topic matches carry stronger semantic weight
          score += topic.includes(' ') ? 5 : 2;
        }
      }

      const candidateCategory = normalizeTopicToken(candidate.category || '');
      if (currentCategory && candidateCategory && currentCategory === candidateCategory) {
        score += 4;
        if (candidate.category && !matchedTopics.includes(candidateCategory)) {
          matchedTopics.unshift(candidateCategory);
        }
      }

      // Boost if explicitly linked inside the current article's HTML content
      if (
        currentContent &&
        (currentContent.includes(`/${candidate.slug}`) ||
          currentContent.includes(`"${candidate.slug}"`))
      ) {
        score += 6;
      }

      // Slight preference for same content type when relevance scores are close
      if (current.sourceType && candidate.sourceType === current.sourceType) {
        score += 1;
      }

      const sourceType: 'note' | 'blog' | 'guide' =
        candidate.sourceType ||
        (candidate.href?.startsWith('/blog/')
          ? 'blog'
          : candidate.href?.startsWith('/field-guides/')
          ? 'guide'
          : 'note');

      const href =
        candidate.href ||
        (sourceType === 'blog'
          ? `/blog/${candidate.slug}`
          : sourceType === 'guide'
          ? `/field-guides/${candidate.slug}`
          : `/notes/${candidate.slug}`);

      const readTime =
        candidate.readTime || calculateReadTime(candidate.content || candidate.description || '');

      return {
        slug: candidate.slug,
        title: candidate.title,
        description: candidate.description,
        category:
          candidate.category ||
          (sourceType === 'blog' ? 'Blog Post' : sourceType === 'guide' ? 'Field Guide' : 'Technical Note'),
        href,
        readTime,
        matchedTopics: matchedTopics.slice(0, 3),
        score,
        sourceType,
      };
    });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.title.localeCompare(b.title);
  });

  return scored.slice(0, count);
}
