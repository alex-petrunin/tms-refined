import React, {memo} from 'react';
import {type ApiRouter} from '@/api/api';
import Tag from '@jetbrains/ring-ui-built/components/tag/tag';
import Button from '@jetbrains/ring-ui-built/components/button/button';

interface Integration {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
}

interface IntegrationCardProps {
  integration: Integration;
  api: ReturnType<typeof import('@/api').createApi<ApiRouter>>;
}

export const IntegrationCard = memo<IntegrationCardProps>(({integration}) => {
  return (
    <div className="integration-card">
      <div className="integration-header">
        <h3>{integration.name}</h3>
        <Tag color={integration.enabled ? Tag.Color.GREEN : Tag.Color.GRAY}>
          {integration.enabled ? 'Enabled' : 'Disabled'}
        </Tag>
      </div>
      <p>Type: {integration.type}</p>
      <div className="integration-actions">
        <Button>{integration.enabled ? 'Configure' : 'Enable'}</Button>
      </div>
    </div>
  );
});

IntegrationCard.displayName = 'IntegrationCard';

