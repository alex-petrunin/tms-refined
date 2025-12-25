import React, {memo} from 'react';
import Alert from '@jetbrains/ring-ui-built/components/alert/alert';

interface ErrorStateProps {
  error: string | Error;
  onRetry?: () => void;
}

export const ErrorState = memo<ErrorStateProps>(({error, onRetry}) => {
  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <div className="error-state">
      <Alert type={Alert.Type.ERROR}>
        <div>
          <strong>Error:</strong> {errorMessage}
          {onRetry && (
            <button
              className="retry-button"
              onClick={onRetry}
              style={{marginLeft: '12px', padding: '4px 8px'}}
            >
              Retry
            </button>
          )}
        </div>
      </Alert>
    </div>
  );
});

ErrorState.displayName = 'ErrorState';

