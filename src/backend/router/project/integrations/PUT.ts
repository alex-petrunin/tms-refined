/**
 * @zod-to-schema
 */
export type UpdateIntegrationReq = {
    projectId: string;
    id: string;
    name?: string;
    type?: 'GITLAB' | 'GITHUB' | 'JENKINS' | 'MANUAL';
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
    type: 'GITLAB' | 'GITHUB' | 'JENKINS' | 'MANUAL';
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
        const updated: UpdateIntegrationRes = {
            id: existing.id,
            name: body.name !== undefined ? body.name : existing.name,
            type: body.type !== undefined ? body.type : existing.type,
            enabled: body.enabled !== undefined ? body.enabled : existing.enabled,
            config: body.config !== undefined ? { ...existing.config, ...body.config } : existing.config
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

