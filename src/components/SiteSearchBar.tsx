import React from 'react';
import {
  CommandPalette,
  CommandPaletteProps,
  SEARCH_CATEGORY_PILL_FILTERS,
  normalizeCategoryPillFilter,
  toggleSearchCategoryPill,
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
  normalizeCategoryPillFilter,
  toggleSearchCategoryPill,
  getSearchCategoryPillCounts,
  filterSearchResultsByCategoryPill,
  filterDynamicSearchByCategoryPill,
  groupSearchResultsByCategory,
  type SearchCategoryPillId,
  type SearchCategoryPillFilter,
};
export default SiteSearchBar;

