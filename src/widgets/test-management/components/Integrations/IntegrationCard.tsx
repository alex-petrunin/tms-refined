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

const TYPE_ICONS: Record<string, string> = {
  GITLAB: '🦊',
  GITHUB: '🐙',
  JENKINS: '🔧',
  MANUAL: '👤',
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  GITLAB: 'Run tests via GitLab CI pipelines',
  GITHUB: 'Run tests via GitHub Actions workflows',
  JENKINS: 'Run tests via Jenkins jobs',
  MANUAL: 'Run tests manually without CI',
};

export const IntegrationCard = memo<IntegrationCardProps>(({
  integration,
  onEdit,
  onToggle,
  onDelete,
}) => {
  const icon = TYPE_ICONS[integration.type] || '⚙️';
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
      
      {integration.config.projectUrl && (
        <div className="integration-config">
          <span className="config-label">Project:</span>
          <a href={integration.config.projectUrl} target="_blank" rel="noopener noreferrer">
            {integration.config.projectUrl}
          </a>
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
