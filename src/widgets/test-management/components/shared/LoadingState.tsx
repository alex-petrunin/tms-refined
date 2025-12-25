import React, {memo} from 'react';
import LoaderInline from '@jetbrains/ring-ui-built/components/loader-inline/loader-inline';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState = memo<LoadingStateProps>(({message = 'Loading...'}) => {
  return (
    <div className="loading-state">
      <LoaderInline />
      {message && <span className="loading-message">{message}</span>}
    </div>
  );
});

LoadingState.displayName = 'LoadingState';

