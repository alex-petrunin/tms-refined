import React, {memo, useMemo} from 'react';
import SimpleTable from '@jetbrains/ring-ui-built/components/table/simple-table';
import type {Column} from '@jetbrains/ring-ui-built/components/table/header-cell';

interface QueryResult {
  id: string;
  idReadable?: string;
  summary: string;
  description?: string;
  project?: {
    id: string;
    name: string;
  };
  tmsMetadata: {
    entityType: string;
    [key: string]: unknown;
  };
}

interface QueryResultsProps {
  results: QueryResult[];
  total: number;
  entityType: 'testCase' | 'testRun' | 'testSuite';
}

export const QueryResults = memo<QueryResultsProps>(({results, total, entityType}) => {
  const data = results.map(result => ({
    id: result.id,
    idReadable: result.idReadable || result.id,
    summary: result.summary,
    project: result.project?.name || 'Unknown',
    ...result.tmsMetadata
  }));

  const columns: Column<typeof data[0]>[] = useMemo(() => {
    const baseColumns: Column<typeof data[0]>[] = [
      {id: 'idReadable', title: 'ID'},
      {id: 'summary', title: 'Summary'},
      {id: 'project', title: 'Project'}
    ];

    if (entityType === 'testCase') {
      return [
        ...baseColumns,
        {id: 'executionTargetType', title: 'Execution Target Type'},
        {id: 'executionTargetName', title: 'Execution Target'}
      ];
    } else if (entityType === 'testRun') {
      return [
        ...baseColumns,
        {id: 'testRunStatus', title: 'Status'},
        {id: 'testSuiteId', title: 'Test Suite'},
        {id: 'executionTargetName', title: 'Execution Target'}
      ];
    }

    return baseColumns;
  }, [entityType]);

  return (
    <div className="query-results">
      <div className="results-header">
        <h3>Results ({total})</h3>
      </div>
      <SimpleTable
        data={data}
        columns={columns}
        getItemKey={(item) => item.id}
      />
    </div>
  );
});

QueryResults.displayName = 'QueryResults';

