import React, { memo, useState, useCallback, useMemo } from 'react';
import Input from '@jetbrains/ring-ui-built/components/input/input';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import './hierarchical-search.css';

interface HierarchicalSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

/**
 * HierarchicalSearch Component
 * Provides search functionality with tree-aware filtering
 * Keeps parent suites visible when child cases match
 */
export const HierarchicalSearch: React.FC<HierarchicalSearchProps> = memo(({
  onSearch,
  placeholder = 'Search test suites and cases...',
  debounceMs = 300,
}) => {
  const [query, setQuery] = useState('');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Handle input change with debouncing
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      onSearch(value);
    }, debounceMs);

    setDebounceTimer(timer);
  }, [debounceTimer, debounceMs, onSearch]);

  // Handle clear
  const handleClear = useCallback(() => {
    setQuery('');
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    onSearch('');
  }, [debounceTimer, onSearch]);

  // Show clear button if there's a query
  const showClear = query.length > 0;

  return (
    <div className="hierarchical-search">
      <div className="search-icon-wrapper">
        <svg 
          className="search-icon" 
          width="16" 
          height="16" 
          viewBox="0 0 16 16" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            fillRule="evenodd" 
            clipRule="evenodd" 
            d="M10.5 6.5C10.5 8.70914 8.70914 10.5 6.5 10.5C4.29086 10.5 2.5 8.70914 2.5 6.5C2.5 4.29086 4.29086 2.5 6.5 2.5C8.70914 2.5 10.5 4.29086 10.5 6.5ZM9.78033 10.8407C8.93906 11.5684 7.86928 12 6.5 12C3.46243 12 1 9.53757 1 6.5C1 3.46243 3.46243 1 6.5 1C9.53757 1 12 3.46243 12 6.5C12 7.86928 11.5684 8.93906 10.8407 9.78033L14.7803 13.7197L13.7197 14.7803L9.78033 10.8407Z" 
            fill="currentColor"
          />
        </svg>
        <Input
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          className="search-input"
          autoComplete="off"
        />
      </div>
      {showClear && (
        <Button
          onClick={handleClear}
          className="search-clear-button"
          text
          aria-label="Clear search"
        >
          Clear
        </Button>
      )}
    </div>
  );
});

HierarchicalSearch.displayName = 'HierarchicalSearch';

/**
 * Utility function for filtering suites with tree-aware logic
 * Keeps parent suites visible when child test cases match the filter
 */
export interface TestCase {
  id: string;
  summary: string;
  description: string;
}

export interface Suite {
  id: string;
  name: string;
  description: string;
  cases: TestCase[];
}

export function filterSuitesTreeAware(
  suites: Suite[],
  query: string
): Suite[] {
  if (!query || query.trim().length === 0) {
    return suites;
  }

  const lowerQuery = query.toLowerCase();

  return suites
    .map(suite => {
      // Check if suite matches
      const suiteMatches =
        suite.name.toLowerCase().includes(lowerQuery) ||
        suite.description.toLowerCase().includes(lowerQuery);

      // Filter matching cases
      const matchingCases = suite.cases.filter(testCase =>
        testCase.summary.toLowerCase().includes(lowerQuery) ||
        testCase.description.toLowerCase().includes(lowerQuery)
      );

      // Keep suite if:
      // 1. Suite itself matches, OR
      // 2. At least one case matches (tree-aware filtering)
      if (suiteMatches || matchingCases.length > 0) {
        return {
          ...suite,
          // If suite matches, keep all cases; otherwise, only keep matching cases
          cases: suiteMatches ? suite.cases : matchingCases,
          // Mark suite as "grayed out" if it doesn't match but has matching children
          _grayedOut: !suiteMatches && matchingCases.length > 0,
        };
      }

      return null;
    })
    .filter((suite): suite is Suite => suite !== null);
}

/**
 * Highlight matching text in a string
 */
export function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || query.trim().length === 0) {
    return text;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return text;
  }

  const before = text.substring(0, index);
  const match = text.substring(index, index + query.length);
  const after = text.substring(index + query.length);

  return (
    <>
      {before}
      <mark style={{ background: 'yellow', padding: '0 2px' }}>{match}</mark>
      {after}
    </>
  );
}

