import React, {memo, useState, useCallback} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import Dialog from '@jetbrains/ring-ui-built/components/dialog/dialog';
import {Header, Content} from '@jetbrains/ring-ui-built/components/island/island';
import Input from '@jetbrains/ring-ui-built/components/input/input';
import Select from '@jetbrains/ring-ui-built/components/select/select';
import Toggle from '@jetbrains/ring-ui-built/components/toggle/toggle';
import Loader from '@jetbrains/ring-ui-built/components/loader/loader';
import {IntegrationCard} from './IntegrationCard';
import {useIntegrations, Integration, IntegrationConfig} from '../../hooks/useIntegrations';

interface IntegrationsViewProps {
  projectId?: string;
}

const INTEGRATION_TYPES = [
  {key: 'GITLAB', label: 'GitLab CI'},
  {key: 'GITHUB', label: 'GitHub Actions'},
  {key: 'JENKINS', label: 'Jenkins'},
  {key: 'MANUAL', label: 'Manual Execution'},
] as const;

export const IntegrationsView = memo<IntegrationsViewProps>(({projectId}) => {
  const {
    integrations,
    loading,
    error,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    isCreating,
    isUpdating,
  } = useIntegrations({projectId});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    type: Integration['type'];
    enabled: boolean;
    config: IntegrationConfig;
  }>({
    name: '',
    type: 'MANUAL',
    enabled: true,
    config: {},
  });
  const [formError, setFormError] = useState<string | null>(null);

  const openCreateDialog = useCallback(() => {
    setEditingIntegration(null);
    setFormData({
      name: '',
      type: 'MANUAL',
      enabled: true,
      config: {},
    });
    setFormError(null);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((integration: Integration) => {
    setEditingIntegration(integration);
    setFormData({
      name: integration.name,
      type: integration.type,
      enabled: integration.enabled,
      config: integration.config || {},
    });
    setFormError(null);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingIntegration(null);
    setFormError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      setFormError('Integration name is required');
      return;
    }

    try {
      if (editingIntegration) {
        await updateIntegration(editingIntegration.id, formData);
      } else {
        await createIntegration(formData);
      }
      closeDialog();
    } catch (e: any) {
      setFormError(e.message || 'Failed to save integration');
    }
  }, [formData, editingIntegration, updateIntegration, createIntegration, closeDialog]);

  const handleToggleEnabled = useCallback(async (integration: Integration) => {
    try {
      await updateIntegration(integration.id, {enabled: !integration.enabled});
    } catch (e: any) {
      console.error('Failed to toggle integration:', e);
    }
  }, [updateIntegration]);

  const handleDelete = useCallback(async (integration: Integration) => {
    if (confirm(`Are you sure you want to delete "${integration.name}"?`)) {
      try {
        await deleteIntegration(integration.id);
      } catch (e: any) {
        console.error('Failed to delete integration:', e);
      }
    }
  }, [deleteIntegration]);

  const selectedType = INTEGRATION_TYPES.find(t => t.key === formData.type);

  if (loading) {
    return (
      <div className="integrations-view">
        <Loader message="Loading integrations..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="integrations-view">
        <div className="error-message">Error loading integrations: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="integrations-view">
      <div className="view-header">
        <h2>CI Integrations</h2>
        <p>Configure and manage CI/CD integrations for test execution</p>
        <Button primary onClick={openCreateDialog}>Add Integration</Button>
      </div>
      
      <div className="integrations-grid">
        {integrations.length === 0 ? (
          <div className="empty-state">
            <p>No integrations configured yet.</p>
            <p>Add an integration to run tests via GitLab CI, GitHub Actions, or manually.</p>
          </div>
        ) : (
          integrations.map(integration => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              projectId={projectId}
              onEdit={() => openEditDialog(integration)}
              onToggle={() => handleToggleEnabled(integration)}
              onDelete={() => handleDelete(integration)}
            />
          ))
        )}
      </div>

      <Dialog
        show={dialogOpen}
        onCloseAttempt={closeDialog}
        trapFocus
      >
        <Header>
          {editingIntegration ? 'Edit Integration' : 'Add Integration'}
        </Header>
        <Content>
          <form className="integration-form" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            {formError && (
              <div className="error-message" style={{marginBottom: '16px'}}>
                {formError}
              </div>
            )}
            
            <div className="form-field">
              <label>Name</label>
              <Input
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, name: e.target.value})}
                placeholder="Integration name"
              />
            </div>

            <div className="form-field">
              <label>Type</label>
              <Select
                data={INTEGRATION_TYPES}
                selected={selectedType}
                onChange={(item: typeof INTEGRATION_TYPES[number] | null) => {
                  if (item) {
                    setFormData({...formData, type: item.key});
                  }
                }}
              />
            </div>

            <div className="form-field">
              <label>Enabled</label>
              <Toggle
                checked={formData.enabled}
                onChange={() => setFormData({...formData, enabled: !formData.enabled})}
              />
            </div>

            {(formData.type === 'GITLAB' || formData.type === 'GITHUB') && (
              <>
                <div className="form-field">
                  <label>Project URL</label>
                  <Input
                    value={formData.config.projectUrl || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                      ...formData, 
                      config: {...formData.config, projectUrl: e.target.value}
                    })}
                    placeholder="https://gitlab.com/org/project"
                  />
                </div>

                <div className="form-field">
                  <label>Pipeline/Workflow Ref</label>
                  <Input
                    value={formData.config.pipelineRef || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                      ...formData, 
                      config: {...formData.config, pipelineRef: e.target.value}
                    })}
                    placeholder="main"
                  />
                </div>

                <div className="form-field">
                  <label>Token (optional)</label>
                  <Input
                    value={formData.config.token || ''}
                    type="password"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                      ...formData, 
                      config: {...formData.config, token: e.target.value}
                    })}
                    placeholder="API token for triggering pipelines"
                  />
                </div>
              </>
            )}

            <div className="form-actions" style={{marginTop: '24px', display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
              <Button onClick={closeDialog}>Cancel</Button>
              <Button 
                primary 
                onClick={handleSave}
                disabled={isCreating || isUpdating}
              >
                {isCreating || isUpdating ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </Content>
      </Dialog>
    </div>
  );
});

IntegrationsView.displayName = 'IntegrationsView';
