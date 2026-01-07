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

// SVG Icons for integration types
const GitLabIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{verticalAlign: 'middle'}}>
    <path d="M23.955 13.587l-1.342-4.135-2.664-8.189a.455.455 0 0 0-.867 0L16.418 9.45H7.582L4.918 1.263a.455.455 0 0 0-.867 0L1.386 9.452.044 13.587a.924.924 0 0 0 .331 1.023L12 23.054l11.625-8.443a.92.92 0 0 0 .33-1.024"/>
  </svg>
);

const GitHubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{verticalAlign: 'middle'}}>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const ManualIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{verticalAlign: 'middle'}}>
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

const getIntegrationIcon = (type: string) => {
  switch (type.toUpperCase()) {
    case 'GITLAB':
      return <GitLabIcon />;
    case 'GITHUB':
      return <GitHubIcon />;
    case 'MANUAL':
      return <ManualIcon />;
    default:
      return null;
  }
};

const getIntegrationLabel = (type: string) => {
  switch (type.toUpperCase()) {
    case 'GITLAB':
      return 'GitLab CI';
    case 'GITHUB':
      return 'GitHub Actions';
    case 'MANUAL':
      return 'Manual';
    default:
      return type;
  }
};

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
    executionTarget: testRun.executionTarget
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
    {
      id: 'executionTarget',
      title: 'Execution Target',
      getValue: (item) => {
        const target = item.executionTarget;
        const icon = getIntegrationIcon(target.type);
        const label = getIntegrationLabel(target.type);
        
        return (
          <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            {icon}
            <a 
              href="#"
              onClick={(e) => {
                e.preventDefault();
                // Navigate to integrations tab
                const event = new CustomEvent('navigate-to-integrations', {
                  detail: { integrationId: target.id }
                });
                window.dispatchEvent(event);
              }}
              style={{
                color: 'var(--ring-main-color, #0065ff)',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              {label}: {target.name}
            </a>
          </div>
        );
      }
    }
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
