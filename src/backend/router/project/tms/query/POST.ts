import {Project, Issue} from "@/api/youtrack-types";

/**
 * @zod-to-schema
 */
export type TMSQueryReq = {
    query: string;
    entityType: 'testCase' | 'testRun' | 'testSuite';
    extensionPropertiesQuery?: Record<string, unknown>;
};

/**
 * @zod-to-schema
 */
export type TMSQueryRes = {
    items: Array<{
        id: string;
        idReadable?: string;
        summary: string;
        description?: string;
        project?: {
            id: string;
            name: string;
        };
        tmsMetadata: {
            entityType: string;
            [key: string]: unknown;
        };
    }>;
    total: number;
};

export default function handle(ctx: CtxPost<TMSQueryReq, TMSQueryRes>): void {
    const project = ctx.project as Project;
    const body = ctx.request.json();

    // Validate required fields
    if (!body.query || typeof body.query !== 'string') {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Query string is required' } as any);
        return;
    }

    if (!body.entityType || !['testCase', 'testRun', 'testSuite'].includes(body.entityType)) {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Entity type must be testCase, testRun, or testSuite' } as any);
        return;
    }

    // Determine extension property name based on entity type
    const extensionPropertyMap: Record<string, string> = {
        testCase: 'testCaseId',
        testRun: 'testRunId',
        testSuite: 'testSuiteId'
    };

    const extensionPropertyName = extensionPropertyMap[body.entityType];

    // Build extension properties query
    const extensionPropertiesQuery: Record<string, unknown> = {
        [extensionPropertyName]: { $exists: true },
        ...(body.extensionPropertiesQuery || {})
    };

    // Combine YouTrack query with extension properties filter
    // Use YouTrack scripting API search
    try {
        const search = require('@jetbrains/youtrack-scripting-api/search');
        const queryObject = {
            query: body.query,
            extensionPropertiesQuery: extensionPropertiesQuery
        };

        // Search issues matching the query
        const issues = search.search(project, queryObject, ctx.currentUser);

        // Convert to array and map to response format
        const issuesArray = issues && issues.size > 0 ? Array.from(issues) : [];
        
        const items = issuesArray.map((issue: any) => {
            const extProps = issue.extensionProperties || {};
            
            // Extract TMS metadata from extension properties
            const tmsMetadata: Record<string, unknown> = {
                entityType: body.entityType
            };

            // Add entity-specific metadata
            if (body.entityType === 'testCase') {
                tmsMetadata.testCaseId = extProps.testCaseId;
                tmsMetadata.executionTargetId = extProps.executionTargetId;
                tmsMetadata.executionTargetName = extProps.executionTargetName;
                tmsMetadata.executionTargetType = extProps.executionTargetType;
                tmsMetadata.executionTargetRef = extProps.executionTargetRef;
            } else if (body.entityType === 'testRun') {
                tmsMetadata.testRunId = extProps.testRunId;
                tmsMetadata.testSuiteId = extProps.testSuiteId;
                tmsMetadata.testRunStatus = extProps.testRunStatus;
                tmsMetadata.testCaseIds = extProps.testCaseIds;
                tmsMetadata.executionTargetId = extProps.executionTargetId;
                tmsMetadata.executionTargetName = extProps.executionTargetName;
                tmsMetadata.executionTargetType = extProps.executionTargetType;
                tmsMetadata.executionTargetRef = extProps.executionTargetRef;
            } else if (body.entityType === 'testSuite') {
                tmsMetadata.testSuiteId = extProps.testSuiteId;
            }

            return {
                id: issue.id,
                idReadable: issue.idReadable,
                summary: issue.summary || '',
                description: issue.description,
                project: issue.project ? {
                    id: issue.project.id || '',
                    name: issue.project.name || ''
                } : undefined,
                tmsMetadata
            };
        });

        const response: TMSQueryRes = {
            items,
            total: items.length
        };

        ctx.response.json(response);
    } catch (error) {
        // Fallback: Try using REST API if scripting API is not available
        // For now, return error - in production would use ctx.ytApi or appHost
        ctx.response.code = 500;
        ctx.response.json({ 
            error: error instanceof Error ? error.message : 'Failed to execute query',
            details: 'YouTrack scripting API may not be available. REST API fallback not implemented.'
        } as any);
    }
}

export type Handle = typeof handle;

