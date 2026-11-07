import React from 'react';
import { Plus } from 'lucide-react';
import type { MoneyManagerTab } from './Header';
import { triggerMoneyManagerTransactionModal } from './TransactionModal';

export const QUICK_ADD_VISIBLE_TABS: ReadonlyArray<MoneyManagerTab> = ['daily', 'accounts'] as const;

export type QuickAddSupportedTab = 'daily' | 'accounts';

export interface QuickAddFloatingButtonProps {
  tab: QuickAddSupportedTab;
  defaultDate?: string;
  onOpenAddModal?: (defaultDate?: string) => void;
  label?: string;
}

/**
 * Determines whether the floating '+' Quick-Add button should be displayed for the active tab.
 * Enabled specifically on the 'Daily Ledger' ('daily') and 'Accounts' ('accounts') tabs.
 */
export function shouldRenderQuickAddFab(activeTab: MoneyManagerTab | string): boolean {
  return activeTab === 'daily' || activeTab === 'accounts';
}

/**
 * Triggers the Money Manager Transaction Modal from the floating '+' Quick-Add button
 * without navigating away from the current tab or route.
 */
export function triggerQuickAddTransactionModal(options: {
  tab: QuickAddSupportedTab;
  defaultDate?: string;
  onOpenAddModal?: (defaultDate?: string) => void;
}): {
  triggered: boolean;
  tab: QuickAddSupportedTab;
  defaultDate?: string;
  navigatedAway: false;
} {
  const { tab, defaultDate, onOpenAddModal } = options;

  if (typeof onOpenAddModal === 'function') {
    onOpenAddModal(defaultDate);
  } else {
    triggerMoneyManagerTransactionModal({
      defaultDate,
      source: `quick-add-${tab}`,
    });
  }

  return {
    triggered: true,
    tab,
    defaultDate,
    navigatedAway: false,
  };
}

/**
 * Floating '+' Quick-Add action button anchored to the bottom-right corner of the
 * Money Manager 'Daily Ledger' and 'Accounts' tabs. Opens the TransactionModal in-place
 * without navigating away from the active tab.
 */
export const QuickAddFloatingButton: React.FC<QuickAddFloatingButtonProps> = ({
  tab,
  defaultDate,
  onOpenAddModal,
  label = 'Quick-Add',
}) => {
  const tabTitle = tab === 'daily' ? 'Daily Ledger' : 'Accounts';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    triggerQuickAddTransactionModal({
      tab,
      defaultDate,
      onOpenAddModal,
    });
  };

  return (
    <button
      type="button"
      className="mm-fab mm-quick-add-fab"
      onClick={handleClick}
      aria-label={`Quick-Add transaction from ${tabTitle} tab`}
      aria-keyshortcuts="Alt+N"
      title={`+ Quick-Add Transaction in ${tabTitle} (Alt + N)`}
      data-testid="mm-fab-add-btn"
      data-quick-add="true"
      data-quick-add-tab={tab}
    >
      <span className="mm-quick-add-plus-badge" aria-hidden="true">
        <Plus size={22} strokeWidth={2.75} />
      </span>
      <span className="mm-fab-label">+ {label}</span>
    </button>
  );
};

export default QuickAddFloatingButton;
