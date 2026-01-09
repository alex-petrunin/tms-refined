/**
 * @zod-to-schema
 */
export type UpdateIntegrationReq = {
    projectId: string;
    id: string;
    name?: string;
    type?: 'GITLAB' | 'GITHUB' | 'MANUAL';
    enabled?: boolean;
    config?: {
        projectUrl?: string;
        pipelineRef?: string;
        token?: string;
        webhookSecret?: string;
    };
};

/**
 * @zod-to-schema
 */
export type UpdateIntegrationRes = {
    id: string;
    name: string;
    type: 'GITLAB' | 'GITHUB' | 'MANUAL';
    enabled: boolean;
    config: {
        projectUrl?: string;
        pipelineRef?: string;
        token?: string;
        webhookSecret?: string;
    };
};

export default function handle(ctx: CtxPut<UpdateIntegrationReq, UpdateIntegrationRes>): void {
    const entities = require('@jetbrains/youtrack-scripting-api/entities');
    const project = ctx.project;
    const body = ctx.request.json() as UpdateIntegrationReq;

    console.log('[PUT integrations] Updating integration:', body.id);

    try {
        // Find the YouTrack project entity
        const ytProject = entities.Project.findByKey(project.shortName || project.key);
        if (!ytProject) {
            ctx.response.code = 404;
            ctx.response.json({ error: 'Project not found' } as any);
            return;
        }

        // Load existing integrations
        let integrations: any[] = [];
        try {
            const integrationsJson = ytProject.extensionProperties.integrations;
            if (integrationsJson && typeof integrationsJson === 'string') {
                integrations = JSON.parse(integrationsJson);
            }
        } catch (e) {
            console.warn('[PUT integrations] Failed to parse existing integrations:', e);
        }

        // Find the integration to update
        const index = integrations.findIndex(i => i.id === body.id);
        if (index === -1) {
            ctx.response.code = 404;
            ctx.response.json({ error: `Integration not found: ${body.id}` } as any);
            return;
        }

        // Update the integration
        const existing = integrations[index];
        
        // Merge config and parse projectUrl for GitLab
        let updatedConfig = body.config !== undefined ? { ...existing.config, ...body.config } : existing.config;
        const integrationType = body.type !== undefined ? body.type : existing.type;
        
        if (integrationType === 'GITLAB' && updatedConfig.projectUrl) {
            try {
                const urlString = updatedConfig.projectUrl;
                const protocolEnd = urlString.indexOf('://');
                if (protocolEnd > -1) {
                    const afterProtocol = urlString.substring(protocolEnd + 3);
                    const firstSlash = afterProtocol.indexOf('/');
                    
                    if (firstSlash > -1) {
                        updatedConfig.baseUrl = urlString.substring(0, protocolEnd + 3 + firstSlash);
                        updatedConfig.projectId = afterProtocol.substring(firstSlash + 1);
                        console.log('[PUT integrations] Parsed projectUrl:', {
                            baseUrl: updatedConfig.baseUrl,
                            projectId: updatedConfig.projectId
                        });
                    }
                }
            } catch (e) {
                console.warn('[PUT integrations] Failed to parse projectUrl:', e);
            }
        }
        
        const updated: UpdateIntegrationRes = {
            id: existing.id,
            name: body.name !== undefined ? body.name : existing.name,
            type: integrationType,
            enabled: body.enabled !== undefined ? body.enabled : existing.enabled,
            config: updatedConfig
        };

        integrations[index] = updated;

        // Save back to extension properties
        ytProject.extensionProperties.integrations = JSON.stringify(integrations);

        console.log('[PUT integrations] Updated integration:', body.id);

        ctx.response.json(updated);
    } catch (error: any) {
        ctx.response.code = 500;
        ctx.response.json({ error: `Failed to update integration: ${error.message || error}` } as any);
    }
}

export type Handle = typeof handle;

