import React, { memo, useState } from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import './active-runs-panel.css';

interface TestRun {
  id: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';
  progress?: number;
  testCaseId?: string;
  testCaseSummary?: string;
  suiteId?: string;
  suiteName?: string;
  startedAt: Date;
  completedAt?: Date;
  externalUrl?: string;
  logs?: string[];
}

interface ActiveRunsPanelProps {
  runs: TestRun[];
  onClose: () => void;
  onViewDetails?: (runId: string) => void;
  maxHeight?: number;
}

/**
 * ActiveRunsPanel Component
 * Collapsible bottom panel showing real-time test run status
 * Similar to IDE "Run" tool window
 */
export const ActiveRunsPanel: React.FC<ActiveRunsPanelProps> = memo(({
  runs,
  onClose,
  onViewDetails,
  maxHeight = 300,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Don't render if no runs
  if (runs.length === 0) {
    return null;
  }

  // Count runs by status
  const statusCounts = runs.reduce((acc, run) => {
    acc[run.status] = (acc[run.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Render status icon
  const renderStatusIcon = (status: TestRun['status']) => {
    switch (status) {
      case 'pending':
        return (
          <div className="status-badge status-pending">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="8" r="6" />
            </svg>
          </div>
        );
      case 'running':
        return (
          <div className="status-badge status-running">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="spinner">
              <circle cx="8" cy="8" r="6" strokeWidth="2" stroke="currentColor" fill="none" />
            </svg>
          </div>
        );
      case 'passed':
        return (
          <div className="status-badge status-passed">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13 4L6 11 3 8" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </div>
        );
      case 'failed':
        return (
          <div className="status-badge status-failed">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
        );
      case 'cancelled':
        return (
          <div className="status-badge status-cancelled">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M5 8h6" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
        );
    }
  };

  // Format duration
  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const durationMs = endTime.getTime() - start.getTime();
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className={`active-runs-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="panel-header">
        <div className="panel-header-left">
          <button
            className="collapse-button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="currentColor"
              className={isCollapsed ? 'collapsed' : ''}
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>
          <h3 className="panel-title">
            Active Test Runs
            <span className="panel-count">({runs.length})</span>
          </h3>
          <div className="status-summary">
            {statusCounts.running > 0 && (
              <span className="status-chip running">
                Running: {statusCounts.running}
              </span>
            )}
            {statusCounts.passed > 0 && (
              <span className="status-chip passed">
                Passed: {statusCounts.passed}
              </span>
            )}
            {statusCounts.failed > 0 && (
              <span className="status-chip failed">
                Failed: {statusCounts.failed}
              </span>
            )}
          </div>
        </div>
        <Button onClick={onClose} icon="close" aria-label="Close panel">
          Close
        </Button>
      </div>

      {!isCollapsed && (
        <div
          className="panel-content"
          style={{ maxHeight: `${maxHeight}px` }}
        >
          <div className="runs-list">
            {runs.map(run => (
              <div key={run.id} className="run-item">
                <div className="run-item-header">
                  {renderStatusIcon(run.status)}
                  <div className="run-item-info">
                    <div className="run-item-title">
                      {run.testCaseSummary || run.suiteName || `Run #${run.id}`}
                    </div>
                    <div className="run-item-meta">
                      <span>{formatDuration(run.startedAt, run.completedAt)}</span>
                      {run.externalUrl && (
                        <>
                          <span className="meta-separator">•</span>
                          <a
                            href={run.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="external-link"
                          >
                            View in CI
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  {run.progress !== undefined && run.status === 'running' && (
                    <div className="run-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${run.progress}%` }}
                        />
                      </div>
                      <span className="progress-text">{run.progress}%</span>
                    </div>
                  )}
                </div>
                {run.logs && run.logs.length > 0 && (
                  <div className="run-logs">
                    {run.logs.slice(-3).map((log, index) => (
                      <div key={index} className="log-line">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

ActiveRunsPanel.displayName = 'ActiveRunsPanel';

