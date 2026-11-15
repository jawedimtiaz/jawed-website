import React from 'react';
import {
  CommandPalette,
  CommandPaletteProps,
  SEARCH_CATEGORY_PILL_FILTERS,
  ACTIVE_SEARCH_CATEGORY_PILL_STORAGE_KEY,
  normalizeCategoryPillFilter,
  getPersistedSearchCategoryPill,
  savePersistedSearchCategoryPill,
  clearPersistedSearchCategoryPill,
  toggleSearchCategoryPill,
  toggleAndPersistSearchCategoryPill,
  getSearchCategoryPillCounts,
  filterSearchResultsByCategoryPill,
  filterDynamicSearchByCategoryPill,
  groupSearchResultsByCategory,
  type SearchCategoryPillId,
  type SearchCategoryPillFilter,
} from './CommandPalette';

export type SiteSearchBarProps = CommandPaletteProps;

export const SiteSearchBar: React.FC<SiteSearchBarProps> = (props) => {
  return <CommandPalette {...props} />;
};

export {
  CommandPalette,
  SEARCH_CATEGORY_PILL_FILTERS,
  ACTIVE_SEARCH_CATEGORY_PILL_STORAGE_KEY,
  normalizeCategoryPillFilter,
  getPersistedSearchCategoryPill,
  savePersistedSearchCategoryPill,
  clearPersistedSearchCategoryPill,
  toggleSearchCategoryPill,
  toggleAndPersistSearchCategoryPill,
  getSearchCategoryPillCounts,
  filterSearchResultsByCategoryPill,
  filterDynamicSearchByCategoryPill,
  groupSearchResultsByCategory,
  type SearchCategoryPillId,
  type SearchCategoryPillFilter,
};
export default SiteSearchBar;


