import { useMemo } from 'react';
import { type FieldGuide } from '../data/fieldGuidesData';
import { CATEGORIES, type NoteCategory, type BaseCategory, determineCategory } from './categoryHelper';

export interface NoteItem {
  slug: string;
  title: string;
  description: string;
  category?: string;
  content?: string;
}

export interface SearchableGuide extends FieldGuide {
  resolvedCategory: BaseCategory;
  searchString: string;
}

export interface SearchableNote extends NoteItem {
  resolvedCategory: BaseCategory;
  searchString: string;
}

export interface UseGuideFilterCountsParams {
  guides: FieldGuide[];
  notes: NoteItem[];
  searchTerm: string;
  activeTab: 'all' | 'field-guides' | 'notes';
  activeCategory: NoteCategory;
}

export interface UseGuideFilterCountsResult {
  categoryCounts: Record<NoteCategory, number>;
  filteredGuides: SearchableGuide[];
  filteredNotes: SearchableNote[];
  totalFilteredCount: number;
}

/**
 * High-performance memoized hook for calculating real-time category counts
 * and filtered content lists in a single O(N) pass.
 *
 * Pre-computes search strings once, avoiding redundant string allocations
 * and repeated lowercasing during typing.
 */
export function useGuideFilterCounts({
  guides,
  notes,
  searchTerm,
  activeTab,
  activeCategory,
}: UseGuideFilterCountsParams): UseGuideFilterCountsResult {
  // Pre-index guides with resolved category and search strings once
  const indexedGuides: SearchableGuide[] = useMemo(() => {
    return guides.map(guide => {
      const resolvedCategory = determineCategory(guide);
      const cleanContent = guide.contentHtml ? guide.contentHtml.replace(/<[^>]+>/g, ' ') : '';
      const searchString = `${guide.title} ${guide.description} ${resolvedCategory} ${guide.keywords.join(' ')} ${guide.slug || ''} ${cleanContent}`.toLowerCase();
      return {
        ...guide,
        resolvedCategory,
        searchString,
      };
    });
  }, [guides]);

  // Pre-index notes with resolved category and search strings once
  const indexedNotes: SearchableNote[] = useMemo(() => {
    return notes.map(note => {
      const resolvedCategory = determineCategory(note);
      const cleanContent = note.content ? note.content.replace(/<[^>]+>/g, ' ') : '';
      const searchString = `${note.title} ${note.description} ${resolvedCategory} ${note.slug || ''} ${cleanContent}`.toLowerCase();
      return {
        ...note,
        resolvedCategory,
        searchString,
      };
    });
  }, [notes]);

  // Memoized single-pass evaluation for counts and filtered lists
  return useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const includeGuides = activeTab === 'all' || activeTab === 'field-guides';
    const includeNotes = activeTab === 'all' || activeTab === 'notes';

    const counts: Record<NoteCategory, number> = {
      'All': 0,
      'Network & Cabling': 0,
      'Server & Hardware': 0,
      'Apple Devices': 0,
      'Microsoft / Windows': 0,
      'Service Desk & ITSM': 0,
    };

    const matchedGuides: SearchableGuide[] = [];
    const matchedNotes: SearchableNote[] = [];

    // Single-pass processing for guides
    if (includeGuides) {
      for (let i = 0; i < indexedGuides.length; i++) {
        const guide = indexedGuides[i];
        const matchesQuery = !q || guide.searchString.includes(q);

        if (matchesQuery) {
          counts['All']++;
          counts[guide.resolvedCategory] = (counts[guide.resolvedCategory] || 0) + 1;

          if (activeCategory === 'All' || guide.resolvedCategory === activeCategory) {
            matchedGuides.push(guide);
          }
        }
      }
    }

    // Single-pass processing for notes
    if (includeNotes) {
      for (let i = 0; i < indexedNotes.length; i++) {
        const note = indexedNotes[i];
        const matchesQuery = !q || note.searchString.includes(q);

        if (matchesQuery) {
          counts['All']++;
          counts[note.resolvedCategory] = (counts[note.resolvedCategory] || 0) + 1;

          if (activeCategory === 'All' || note.resolvedCategory === activeCategory) {
            matchedNotes.push(note);
          }
        }
      }
    }

    return {
      categoryCounts: counts,
      filteredGuides: matchedGuides,
      filteredNotes: matchedNotes,
      totalFilteredCount: matchedGuides.length + matchedNotes.length,
    };
  }, [indexedGuides, indexedNotes, searchTerm, activeTab, activeCategory]);
}
