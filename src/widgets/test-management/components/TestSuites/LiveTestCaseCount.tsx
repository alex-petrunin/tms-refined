import {memo} from 'react';
import {useSuiteTestCasesCount} from '../../hooks/useSuiteTestCasesCount';

interface LiveTestCaseCountProps {
  projectId: string;
  suiteId: string;
}

/**
 * Component that displays live test case count for a suite
 * Automatically refreshes to show real-time data
 */
export const LiveTestCaseCount = memo<LiveTestCaseCountProps>(({projectId, suiteId}) => {
  const {count, loading, error} = useSuiteTestCasesCount({
    projectId,
    suiteId,
  });

  if (error) {
    return <span style={{color: 'var(--ring-error-color)'}}>Error</span>;
  }

  if (loading) {
    return <span style={{opacity: 0.5}}>...</span>;
  }

  return <span>{count}</span>;
});

LiveTestCaseCount.displayName = 'LiveTestCaseCount';

