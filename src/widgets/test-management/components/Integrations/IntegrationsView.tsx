import React, {memo, useState, useCallback, useMemo} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import Dialog from '@jetbrains/ring-ui-built/components/dialog/dialog';
import {Header, Content} from '@jetbrains/ring-ui-built/components/island/island';
import Panel from '@jetbrains/ring-ui-built/components/panel/panel';
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
  {key: 'MANUAL', label: 'Manual Execution'},
] as const;

type IntegrationType = 'GITLAB' | 'GITHUB' | 'MANUAL';

// SVG Icons
const GitLabIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.955 13.587l-1.342-4.135-2.664-8.189a.455.455 0 0 0-.867 0L16.418 9.45H7.582L4.918 1.263a.455.455 0 0 0-.867 0L1.386 9.452.044 13.587a.924.924 0 0 0 .331 1.023L12 23.054l11.625-8.443a.92.92 0 0 0 .33-1.024"/>
  </svg>
);

const GitHubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const ManualIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

const TYPE_CONFIGS: Record<IntegrationType, {
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}> = {
  GITLAB: {
    label: 'GitLab CI',
    icon: <GitLabIcon />,
    description: 'Trigger tests via GitLab CI pipelines',
    color: '#fc6d26',
  },
  GITHUB: {
    label: 'GitHub Actions',
    icon: <GitHubIcon />,
    description: 'Trigger tests via GitHub Actions workflows',
    color: '#238636',
  },
  MANUAL: {
    label: 'Manual Execution',
    icon: <ManualIcon />,
    description: 'Track test results without external CI',
    color: '#6b7280',
  },
};

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
  const [dialogType, setDialogType] = useState<IntegrationType>('MANUAL');
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Integration | null>(null);
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

  // Group integrations by type
  const integrationsByType = useMemo(() => {
    const grouped: Record<IntegrationType, Integration[]> = {
      GITLAB: [],
      GITHUB: [],
      MANUAL: [],
    };
    
    integrations.forEach(integration => {
      const type = integration.type as IntegrationType;
      if (grouped[type]) {
        grouped[type].push(integration);
      }
    });
    
    return grouped;
  }, [integrations]);

  const openCreateDialog = useCallback((type: IntegrationType) => {
    setEditingIntegration(null);
    setDialogType(type);
    setFormData({
      name: '',
      type,
      enabled: true,
      config: {},
    });
    setFormError(null);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((integration: Integration) => {
    setEditingIntegration(integration);
    setDialogType(integration.type as IntegrationType);
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

  const handleDeleteClick = useCallback((integration: Integration) => {
    setConfirmDelete(integration);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setConfirmDelete(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDelete) return;
    
    try {
      await deleteIntegration(confirmDelete.id);
      setConfirmDelete(null);
    } catch (e: any) {
      console.error('Failed to delete integration:', e);
    }
  }, [confirmDelete, deleteIntegration]);

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
        <div>
          {/*<h2>CI Integrations</h2>*/}
          <p>Configure execution targets for your test runs</p>
        </div>
      </div>
      
      {/* Swimlanes per type */}
      <div className="integrations-swimlanes">
        {(['GITLAB', 'GITHUB', 'MANUAL'] as IntegrationType[]).map(type => {
          const config = TYPE_CONFIGS[type];
          const typeIntegrations = integrationsByType[type];
          
          return (
            <div key={type} className="integration-swimlane">
              <div className="swimlane-header" style={{borderLeftColor: config.color}}>
                <div className="swimlane-title">
                  <span className="swimlane-icon">{config.icon}</span>
                  <h3>{config.label}</h3>
                  <span className="swimlane-count">{typeIntegrations.length}</span>
                </div>
                <p className="swimlane-description">{config.description}</p>
                <Button onClick={() => openCreateDialog(type)}>
                  + Add {type === 'MANUAL' ? 'Target' : 'Integration'}
                </Button>
              </div>
              
              <div className="swimlane-content">
                {typeIntegrations.length === 0 ? (
                  <div className="swimlane-empty">
                    <p>No {config.label.toLowerCase()} configured</p>
                  </div>
                ) : (
                  typeIntegrations.map(integration => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      projectId={projectId}
                      onEdit={() => openEditDialog(integration)}
                      onToggle={() => handleToggleEnabled(integration)}
                      onDelete={() => handleDeleteClick(integration)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        show={dialogOpen}
        onCloseAttempt={closeDialog}
        trapFocus
        autoFocusFirst
      >
        <Header>
          {editingIntegration ? `Edit ${TYPE_CONFIGS[dialogType].label}` : `Add ${TYPE_CONFIGS[dialogType].label}`}
        </Header>
        <Content>
          <div className="">
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
                placeholder={dialogType === 'MANUAL' ? 'e.g., QA Team, Dev Testing' : 'e.g., Main Pipeline'}
              />
            </div>

            {!editingIntegration && (
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
            )}

            <div className="form-field form-field-toggle">
              <label>Enabled</label>
              <div className="">
                <Toggle
                  checked={formData.enabled}
                  onChange={() => setFormData({...formData, enabled: !formData.enabled})}
                />
              </div>
            </div>

            {formData.type === 'GITLAB' && (
              <>
                <div className="form-field">
                  <label>Base URL</label>
                  <Input
                    value={formData.config.baseUrl || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                      ...formData, 
                      config: {...formData.config, baseUrl: e.target.value}
                    })}
                    placeholder="https://gitlab.com"
                  />
                </div>

                <div className="form-field">
                  <label>Project ID</label>
                  <Input
                    value={formData.config.projectId || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                      ...formData, 
                      config: {...formData.config, projectId: e.target.value}
                    })}
                    placeholder="75214400 or namespace/project"
                  />
                </div>

                <div className="form-field">
                  <label>Pipeline Trigger Token</label>
                  <Input
                    value={formData.config.token || ''}
                    type="password"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                      ...formData, 
                      config: {...formData.config, token: e.target.value}
                    })}
                    placeholder="glptt-xxxxx (from Settings → CI/CD → Pipeline triggers)"
                  />
                </div>
              </>
            )}

            {formData.type === 'GITHUB' && (
              <>
                <div className="form-field">
                  <label>Project URL</label>
                  <Input
                    value={formData.config.projectUrl || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                      ...formData, 
                      config: {...formData.config, projectUrl: e.target.value}
                    })}
                    placeholder="https://github.com/org/repo"
                  />
                </div>

                <div className="form-field">
                  <label>Workflow Ref</label>
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
                  <label>API Token (optional)</label>
                  <Input
                    value={formData.config.token || ''}
                    type="password"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                      ...formData, 
                      config: {...formData.config, token: e.target.value}
                    })}
                    placeholder="For triggering workflows"
                  />
                </div>
              </>
            )}

            {formData.type === 'MANUAL' && (
              <div className="form-hint" style={{marginTop: '8px', fontSize: '13px', color: '#666'}}>
                Manual execution targets don't require additional configuration.
                Use them to track test results entered directly in YouTrack.
              </div>
            )}
          </div>
        </Content>
        <Panel>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button 
            primary 
            onClick={handleSave}
            disabled={isCreating || isUpdating}
          >
            {isCreating || isUpdating ? 'Saving...' : 'Save'}
          </Button>
        </Panel>
      </Dialog>

      {confirmDelete && (
        <Dialog
          show={true}
          onCloseAttempt={handleCancelDelete}
          trapFocus
          autoFocusFirst
        >
          <Header>Delete Integration</Header>
          <Content>
            <p>Are you sure you want to delete "{confirmDelete.name}"?</p>
            <p>This action cannot be undone.</p>
          </Content>
          <Panel>
            <Button onClick={handleCancelDelete}>Cancel</Button>
            <Button danger onClick={handleConfirmDelete}>
              Delete
            </Button>
          </Panel>
        </Dialog>
      )}
    </div>
  );
});

IntegrationsView.displayName = 'IntegrationsView';
