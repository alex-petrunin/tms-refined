import {memo} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';

interface Integration {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
}

interface IntegrationCardProps {
  integration: Integration;
  projectId?: string;
}

export const IntegrationCard = memo<IntegrationCardProps>(({integration}) => {
  return (
    <div className="integration-card">
      <div className="integration-header">
        <h3>{integration.name}</h3>
        <span className={`status-badge ${integration.enabled ? 'status-passed' : 'status-default'}`}>
          {integration.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>
      <p>Type: {integration.type}</p>
      <div className="integration-actions">
        <Button>{integration.enabled ? 'Configure' : 'Enable'}</Button>
      </div>
    </div>
  );
});

IntegrationCard.displayName = 'IntegrationCard';
