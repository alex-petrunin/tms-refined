import { YouTrackTestSuiteRepository } from "../../../infrastructure/adapters/YouTrackTestSuiteRepository";

/**
 * @zod-to-schema
 */
export type DeleteTestSuiteReq = {
    projectId: string;
    id: string;
};

/**
 * @zod-to-schema
 */
export type DeleteTestSuiteRes = {
    success: boolean;
    message?: string;
};

export default function handle(ctx: CtxDelete<DeleteTestSuiteRes, DeleteTestSuiteReq>): void {
    // Get test suite ID from query parameters
    const query = ctx.request.query || {};
    const testSuiteId = ctx.request.getParameter ? ctx.request.getParameter('id') : query.id;

    if (!testSuiteId) {
        ctx.response.code = 400;
        ctx.response.json({ success: false, message: 'Test suite ID is required' });
        return;
    }

    try {
        // Verify project exists
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        const ytProject = entities.Project.findByKey(ctx.project.shortName || ctx.project.key);
        if (!ytProject) {
            ctx.response.code = 404;
            ctx.response.json({ success: false, message: 'Project not found' });
            return;
        }

        // Initialize repository
        const repository = new YouTrackTestSuiteRepository(ctx.project);

        // Get suite before deleting (for custom field cleanup)
        const suiteToDelete = repository.findByID(testSuiteId);
        if (!suiteToDelete) {
            ctx.response.code = 404;
            ctx.response.json({ success: false, message: 'Test suite not found' });
            return;
        }

        // Delete using repository
        const deleted = repository.delete(testSuiteId);
        if (!deleted) {
            ctx.response.code = 404;
            ctx.response.json({ success: false, message: 'Test suite not found' });
            return;
        }

        // Archive the custom field value (don't delete - other items might reference it)
        try {
            const testSuiteField = ytProject.findFieldByName('Test Suite');
            if (testSuiteField) {
                const fieldValue = testSuiteField.findValueByName(suiteToDelete.name);
                if (fieldValue && fieldValue.isArchived !== undefined) {
                    fieldValue.isArchived = true;
                }
            }
        } catch (fieldError) {
            console.error("Failed to archive Test Suite custom field value:", fieldError);
        }

        ctx.response.json({ success: true, message: 'Test suite deleted successfully' });
    } catch (error: any) {
        ctx.response.code = 500;
        ctx.response.json({ success: false, message: error.message || 'Failed to delete test suite' });
    }
}

export type Handle = typeof handle;
