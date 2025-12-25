import {useState, useCallback} from 'react';
import {type ApiRouter} from '@/api/api';

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

interface UseTMSQueryResult {
  results: QueryResult[];
  total: number;
  loading: boolean;
  error: Error | null;
  executeQuery: (query: string, entityType: 'testCase' | 'testRun' | 'testSuite') => Promise<void>;
}

export function useTMSQuery(
  api: ReturnType<typeof import('@/api').createApi<ApiRouter>>,
  projectId?: string
): UseTMSQueryResult {
  const [results, setResults] = useState<QueryResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executeQuery = useCallback(async (
    query: string,
    entityType: 'testCase' | 'testRun' | 'testSuite'
  ) => {
    setLoading(true);
    setError(null);
    try {
      // The API client will be generated after backend build
      // For now, use type assertion
      const response = await (api.project as any).tms?.query?.POST({
        projectId,
        query,
        entityType
      });
      
      if (!response) {
        throw new Error('Query endpoint not available. Please rebuild backend.');
      }
      
      setResults(response.items);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to execute query'));
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [api, projectId]);

  return {
    results,
    total,
    loading,
    error,
    executeQuery
  };
}

// Hook for search assist API
interface SearchSuggestion {
  option: string;
  description: string;
  caret: number;
}

interface UseSearchAssistResult {
  suggestions: SearchSuggestion[];
  loading: boolean;
  error: Error | null;
  getSuggestions: (query: string, caret: number) => Promise<void>;
}

export function useSearchAssist(
  host: any
): UseSearchAssistResult {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getSuggestions = useCallback(async (query: string, caret: number) => {
    setLoading(true);
    setError(null);
    try {
      // Call YouTrack search assist API
      const response = await host.fetchYouTrack('search/assist', {
        method: 'POST',
        body: JSON.stringify({query, caret}),
        headers: {'Content-Type': 'application/json'}
      });

      if (response && response.suggestions) {
        setSuggestions(response.suggestions.map((s: any) => ({
          option: s.option,
          description: s.description,
          caret: s.caret
        })));
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get search suggestions'));
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [host]);

  return {
    suggestions,
    loading,
    error,
    getSuggestions
  };
}

