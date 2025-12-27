/**
 * @zod-to-schema
 */
export type GetIntegrationsReq = {
    projectId?: string;
    id?: string;
    type?: 'GITLAB' | 'GITHUB' | 'JENKINS' | 'MANUAL';
    enabled?: boolean;
};

/**
 * @zod-to-schema
 */
export type IntegrationConfig = {
    projectUrl?: string;
    pipelineRef?: string;
    token?: string;
    webhookSecret?: string;
};

/**
 * @zod-to-schema
 */
export type IntegrationItem = {
    id: string;
    name: string;
    type: 'GITLAB' | 'GITHUB' | 'JENKINS' | 'MANUAL';
    enabled: boolean;
    config: IntegrationConfig;
};

/**
 * @zod-to-schema
 */
export type ListIntegrationsRes = {
    items: IntegrationItem[];
    total: number;
};

export default function handle(ctx: CtxGet<ListIntegrationsRes, GetIntegrationsReq>): void {
    const entities = require('@jetbrains/youtrack-scripting-api/entities');
    const project = ctx.project;

    // Get query params using getParameter
    const getParam = (name: string): string | undefined => {
        if (ctx.request.getParameter) {
            const val = ctx.request.getParameter(name);
            return val || undefined;
        }
        return undefined;
    };

    const query = {
        id: getParam('id'),
        type: getParam('type') as GetIntegrationsReq['type'],
        enabled: getParam('enabled') === 'true' ? true : getParam('enabled') === 'false' ? false : undefined
    };

    console.log('[GET integrations] Query params - id:', query.id, 'type:', query.type, 'enabled:', query.enabled);

    try {
        // Find the YouTrack project entity
        const ytProject = entities.Project.findByKey(project.shortName || project.key);
        if (!ytProject) {
            ctx.response.code = 404;
            ctx.response.json({ error: 'Project not found' } as any);
            return;
        }

        // Load integrations from extension properties
        let integrations: IntegrationItem[] = [];
        try {
            const integrationsJson = ytProject.extensionProperties.integrations;
            if (integrationsJson && typeof integrationsJson === 'string') {
                integrations = JSON.parse(integrationsJson);
            }
        } catch (e) {
            console.warn('[GET integrations] Failed to parse integrations:', e);
        }

        // Apply filters
        let filtered = integrations;

        if (query.id) {
            filtered = filtered.filter(i => i.id === query.id);
        }

        if (query.type) {
            filtered = filtered.filter(i => i.type === query.type);
        }

        if (query.enabled !== undefined) {
            filtered = filtered.filter(i => i.enabled === query.enabled);
        }

        const response: ListIntegrationsRes = {
            items: filtered,
            total: filtered.length
        };

        ctx.response.json(response);
    } catch (error: any) {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || `Failed to fetch integrations: ${error}` } as any);
    }
}

export type Handle = typeof handle;

