import {memo, useMemo} from 'react';
import SimpleTable from '@jetbrains/ring-ui-built/components/table/simple-table';
import type {Column} from '@jetbrains/ring-ui-built/components/table/header-cell';

interface TestRun {
  id: string;
  testCaseIDs: string[];
  testSuiteID: string;
  testSuiteName: string;
  status: string;
  executionTarget: {
    id: string;
    name: string;
    type: string;
    ref: string;
  };
}

interface TestRunListProps {
  testRuns: TestRun[];
}

export const TestRunList = memo<TestRunListProps>(({testRuns}) => {
  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'PASSED':
        return 'status-passed';
      case 'FAILED':
        return 'status-failed';
      case 'RUNNING':
        return 'status-running';
      case 'PENDING':
        return 'status-pending';
      case 'AWAITING_EXTERNAL_RESULTS':
        return 'status-awaiting';
      default:
        return 'status-default';
    }
  };

  const data = useMemo(() => testRuns.map(testRun => ({
    id: testRun.id,
    testSuiteName: testRun.testSuiteName || testRun.testSuiteID,
    testCaseCount: testRun.testCaseIDs.length,
    status: testRun.status,
    executionTarget: `${testRun.executionTarget.type}: ${testRun.executionTarget.name}`
  })), [testRuns]);

  const columns: Column<typeof data[0]>[] = useMemo(() => [
    {id: 'id', title: 'Run ID'},
    {id: 'testSuiteName', title: 'Test Suite'},
    {id: 'testCaseCount', title: 'Test Cases'},
    {
      id: 'status',
      title: 'Status',
      getValue: (item) => (
        <span className={`status-badge ${getStatusClass(item.status)}`}>
          {item.status}
        </span>
      )
    },
    {id: 'executionTarget', title: 'Execution Target'}
  ], []);

  return (
    <SimpleTable
      data={data}
      columns={columns}
      getItemKey={(item) => item.id}
    />
  );
});

TestRunList.displayName = 'TestRunList';
