import React, {memo} from 'react';
import {type ApiRouter} from '@/api/api';
import {IntegrationCard} from './IntegrationCard';

interface IntegrationsViewProps {
  api: ReturnType<typeof import('@/api').createApi<ApiRouter>>;
  projectId?: string;
}

export const IntegrationsView = memo<IntegrationsViewProps>(({api, projectId}) => {
  const integrations = [
    {id: 'gitlab', name: 'GitLab CI', type: 'GITLAB', enabled: false},
    {id: 'github', name: 'GitHub Actions', type: 'GITHUB', enabled: false},
    {id: 'manual', name: 'Manual Execution', type: 'MANUAL', enabled: true}
  ];

  return (
    <div className="integrations-view">
      <div className="view-header">
        <h2>CI Integrations</h2>
        <p>Configure and manage CI/CD integrations for test execution</p>
      </div>
      <div className="integrations-grid">
        {integrations.map(integration => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            api={api}
          />
        ))}
      </div>
    </div>
  );
});

IntegrationsView.displayName = 'IntegrationsView';

