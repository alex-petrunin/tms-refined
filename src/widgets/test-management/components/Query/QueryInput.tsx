import React, {memo, useState, useCallback, useEffect} from 'react';
import {Input, Size} from '@jetbrains/ring-ui-built/components/input/input';
import {useSearchAssist} from '../../hooks/useTMSQuery';

interface QueryInputProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  host?: any;
}

export const QueryInput = memo<QueryInputProps>(({value, onChange, onExecute, host}) => {
  const [caretPosition, setCaretPosition] = useState(0);
  const {suggestions, getSuggestions} = useSearchAssist(host || {});

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onExecute();
    }
  }, [onExecute]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const newCaret = e.target.selectionStart || 0;
    onChange(newValue);
    setCaretPosition(newCaret);
    
    // Get suggestions as user types
    if (host && newValue) {
      getSuggestions(newValue, newCaret);
    }
  }, [onChange, host, getSuggestions]);

  return (
    <div className="query-input-wrapper">
      <Input
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Enter YouTrack query (e.g., project: {My Project} and State: {Open})"
        size={Size.FULL}
      />
      {suggestions.length > 0 && (
        <div className="query-suggestions">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="suggestion-item"
              onClick={() => {
                const newValue = value.slice(0, suggestion.caret) + suggestion.option + value.slice(suggestion.caret);
                onChange(newValue);
              }}
            >
              <strong>{suggestion.option}</strong>
              {suggestion.description && <span> - {suggestion.description}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

QueryInput.displayName = 'QueryInput';

