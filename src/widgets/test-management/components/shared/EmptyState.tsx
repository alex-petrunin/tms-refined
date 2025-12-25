import React, {memo} from 'react';

interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = memo<EmptyStateProps>(({message, actionLabel, onAction}) => {
  return (
    <div className="empty-state">
      <div className="empty-state-content">
        <p>{message}</p>
        {actionLabel && onAction && (
          <button
            className="empty-state-action"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

