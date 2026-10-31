import React from 'react';
import { CommandPalette, CommandPaletteProps } from './CommandPalette';

export type SiteSearchBarProps = CommandPaletteProps;

export const SiteSearchBar: React.FC<SiteSearchBarProps> = (props) => {
  return <CommandPalette {...props} />;
};

export { CommandPalette };
export default SiteSearchBar;
