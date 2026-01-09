import React, { memo } from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import './bulk-actions-toolbar.css';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onRunSelected: () => void;
  onBulkEditTarget?: () => void;
  onClearSelection: () => void;
  disabled?: boolean;
}

/**
 * BulkActionsToolbar Component
 * Appears below the header when test cases are selected
 * Provides bulk operations like running selected tests
 */
export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = memo(({
  selectedCount,
  onRunSelected,
  onBulkEditTarget,
  onClearSelection,
  disabled = false,
}) => {
  // Don't render if nothing is selected
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="bulk-actions-toolbar" role="toolbar" aria-label="Bulk Actions">
      <div className="bulk-actions-content">
        <div className="bulk-actions-info">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            style={{ marginRight: 8 }}
          >
            <path d="M12.5 3.5l-1-1L8 6 4.5 2.5l-1 1L7 7 3.5 10.5l1 1L8 8l3.5 3.5 1-1L9 7l3.5-3.5z" />
            <rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
          <span className="bulk-actions-count">
            <strong>{selectedCount}</strong> {selectedCount === 1 ? 'case' : 'cases'} selected
          </span>
        </div>

        <div className="bulk-actions-buttons">
          <Button
            primary
            onClick={onRunSelected}
            disabled={disabled}
            aria-label={`Run ${selectedCount} selected test cases`}
          >
            Run Selected ({selectedCount})
          </Button>

          {onBulkEditTarget && (
            <Button
              onClick={onBulkEditTarget}
              disabled={disabled}
              aria-label="Bulk edit execution target"
            >
              Edit Target
            </Button>
          )}

          <Button
            text
            onClick={onClearSelection}
            disabled={disabled}
            aria-label="Clear selection"
          >
            Clear Selection
          </Button>
        </div>
      </div>
    </div>
  );
});

BulkActionsToolbar.displayName = 'BulkActionsToolbar';

