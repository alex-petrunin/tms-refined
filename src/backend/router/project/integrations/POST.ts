/**
 * @zod-to-schema
 */
export type CreateIntegrationReq = {
    projectId: string;
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

/**
 * @zod-to-schema
 */
export type CreateIntegrationRes = {
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

export default function handle(ctx: CtxPost<CreateIntegrationReq, CreateIntegrationRes>): void {
    const entities = require('@jetbrains/youtrack-scripting-api/entities');
    const project = ctx.project;
    const body = ctx.request.json() as CreateIntegrationReq;

    console.log('[POST integrations] Creating integration:', body.name, 'type:', body.type);

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
            console.warn('[POST integrations] Failed to parse existing integrations:', e);
        }

        // Generate unique ID
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        const newId = `int_${timestamp}_${random}`;

        // Create new integration
        const newIntegration: CreateIntegrationRes = {
            id: newId,
            name: body.name,
            type: body.type,
            enabled: body.enabled,
            config: body.config || {}
        };

        // Add to integrations array
        integrations.push(newIntegration);

        // Save back to extension properties
        ytProject.extensionProperties.integrations = JSON.stringify(integrations);

        console.log('[POST integrations] Created integration:', newId);

        ctx.response.json(newIntegration);
    } catch (error: any) {
        ctx.response.code = 500;
        ctx.response.json({ error: `Failed to create integration: ${error.message || error}` } as any);
    }
}

export type Handle = typeof handle;

