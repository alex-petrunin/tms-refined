import {memo} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import type {Integration} from '../../hooks/useIntegrations';

interface IntegrationCardProps {
  integration: Integration;
  projectId?: string;
  onEdit?: () => void;
  onToggle?: () => void;
  onDelete?: () => void;
}

// SVG Icons
const GitLabIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.955 13.587l-1.342-4.135-2.664-8.189a.455.455 0 0 0-.867 0L16.418 9.45H7.582L4.918 1.263a.455.455 0 0 0-.867 0L1.386 9.452.044 13.587a.924.924 0 0 0 .331 1.023L12 23.054l11.625-8.443a.92.92 0 0 0 .33-1.024"/>
  </svg>
);

const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const ManualIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

const TYPE_ICONS: Record<string, React.ReactNode> = {
  GITLAB: <GitLabIcon />,
  GITHUB: <GitHubIcon />,
  MANUAL: <ManualIcon />,
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  GITLAB: 'Run tests via GitLab CI pipelines',
  GITHUB: 'Run tests via GitHub Actions workflows',
  MANUAL: 'Track tests manually without CI',
};

export const IntegrationCard = memo<IntegrationCardProps>(({
  integration,
  onEdit,
  onToggle,
  onDelete,
}) => {
  const icon = TYPE_ICONS[integration.type] || <ManualIcon />;
  const description = TYPE_DESCRIPTIONS[integration.type] || '';

  return (
    <div className={`integration-card ${integration.enabled ? 'enabled' : 'disabled'}`}>
      <div className="integration-header">
        <div className="integration-title">
          <span className="integration-icon">{icon}</span>
          <h3>{integration.name}</h3>
        </div>
        <span className={`status-badge ${integration.enabled ? 'status-passed' : 'status-default'}`}>
          {integration.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>
      
      <p className="integration-description">{description}</p>
      
      {integration.config.projectId && (
        <div className="integration-config">
          <span className="config-label">Project ID:</span>
          <code>{integration.config.projectId}</code>
        </div>
      )}
      
      {integration.config.projectUrl && (
        <div className="integration-config">
          <span className="config-label">URL:</span>
          <span className="config-value">{integration.config.projectUrl}</span>
        </div>
      )}

      {integration.config.baseUrl && (
        <div className="integration-config">
          <span className="config-label">Base URL:</span>
          <code>{integration.config.baseUrl}</code>
        </div>
      )}
      
      {integration.config.pipelineRef && (
        <div className="integration-config">
          <span className="config-label">Ref:</span>
          <code>{integration.config.pipelineRef}</code>
        </div>
      )}
      
      <div className="integration-actions">
        {onEdit && (
          <Button onClick={onEdit}>Configure</Button>
        )}
        {onToggle && (
          <Button onClick={onToggle}>
            {integration.enabled ? 'Disable' : 'Enable'}
          </Button>
        )}
        {onDelete && integration.type !== 'MANUAL' && (
          <Button danger onClick={onDelete}>Delete</Button>
        )}
      </div>
    </div>
  );
});

IntegrationCard.displayName = 'IntegrationCard';
