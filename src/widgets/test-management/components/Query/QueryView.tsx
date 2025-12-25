import React, {memo, useState, useCallback} from 'react';
import {type ApiRouter} from '@/api/api';
import {useTMSQuery} from '../../hooks/useTMSQuery';
import {QueryInput} from './QueryInput';
import {QueryResults} from './QueryResults';
import {LoadingState} from '../shared/LoadingState';
import {ErrorState} from '../shared/ErrorState';
import Button from '@jetbrains/ring-ui-built/components/button/button';

interface QueryViewProps {
  api: ReturnType<typeof import('@/api').createApi<ApiRouter>>;
}

export const QueryView = memo<QueryViewProps>(({api}) => {
  const [query, setQuery] = useState('');
  const [entityType, setEntityType] = useState<'testCase' | 'testRun' | 'testSuite'>('testCase');
  const {results, total, loading, error, executeQuery} = useTMSQuery(api);

  const handleExecute = useCallback(() => {
    if (query.trim()) {
      executeQuery(query, entityType);
    }
  }, [query, entityType, executeQuery]);

  return (
    <div className="query-view">
      <div className="view-header">
        <h2>YouTrack Query</h2>
        <p>Query TMS entities using YouTrack query syntax</p>
      </div>
      <div className="query-controls">
        <div className="query-input-section">
          <QueryInput
            value={query}
            onChange={setQuery}
            onExecute={handleExecute}
            host={(window as any).YTApp?.host}
          />
        </div>
        <div className="entity-type-selector">
          <label style={{display: 'block', marginBottom: '4px'}}>Entity Type:</label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as typeof entityType)}
            className="filter-select"
          >
            <option value="testCase">Test Cases</option>
            <option value="testRun">Test Runs</option>
            <option value="testSuite">Test Suites</option>
          </select>
        </div>
        <Button primary onClick={handleExecute} disabled={!query.trim() || loading}>
          Execute Query
        </Button>
      </div>
      {loading && <LoadingState message="Executing query..." />}
      {error && <ErrorState error={error} />}
      {!loading && !error && results.length > 0 && (
        <QueryResults results={results} total={total} entityType={entityType} />
      )}
      {!loading && !error && results.length === 0 && query && (
        <div className="no-results">No results found</div>
      )}
    </div>
  );
});

QueryView.displayName = 'QueryView';

