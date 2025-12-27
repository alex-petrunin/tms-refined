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
    const entities = require('@jetbrains/youtrack-scripting-api/entities');
    const project = ctx.project;
    
    // Get test suite ID from query parameters
    const query = ctx.request.query || {};
    const testSuiteId = ctx.request.getParameter ? ctx.request.getParameter('id') : query.id;

    if (!testSuiteId) {
        ctx.response.code = 400;
        ctx.response.json({ success: false, message: 'Test suite ID is required' });
        return;
    }

    try {
        // Find the YouTrack project entity for writing
        const ytProject = entities.Project.findByKey(project.shortName || project.key);
        if (!ytProject) {
            ctx.response.code = 404;
            ctx.response.json({ success: false, message: 'Project not found' });
            return;
        }

        // Load existing test suites from project extension properties
        let suites: Array<{id: string; name: string; description: string; testCaseIDs: string[]}> = [];
        const extProps = ytProject.extensionProperties || {};
        const suitesJson = extProps.testSuites;
        
        if (suitesJson && typeof suitesJson === 'string') {
            try {
                suites = JSON.parse(suitesJson);
            } catch (e) {
                console.error("Failed to parse existing suites:", e);
            }
        }

        // Find the test suite to delete (to get its name for custom field cleanup)
        const suiteToDelete = suites.find(s => s.id === testSuiteId);
        
        if (!suiteToDelete) {
            ctx.response.code = 404;
            ctx.response.json({ success: false, message: 'Test suite not found' });
            return;
        }

        // Remove the test suite from the array
        suites = suites.filter(s => s.id !== testSuiteId);

        // Save updated test suites to project extension properties
        ytProject.extensionProperties.testSuites = JSON.stringify(suites);

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
            // Custom field cleanup is optional - don't fail the whole operation
            console.error("Failed to archive Test Suite custom field value:", fieldError);
        }

        ctx.response.json({ success: true, message: 'Test suite deleted successfully' });
    } catch (error: any) {
        ctx.response.code = 500;
        ctx.response.json({ success: false, message: error.message || 'Failed to delete test suite' });
    }
}

export type Handle = typeof handle;
