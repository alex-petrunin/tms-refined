import { UpdateTestSuiteMetadataUseCase } from "../../../application/usecases/UpdateTestSuiteMetadata";
import { UpdateTestSuiteCompositionUseCase } from "../../../application/usecases/UpdateTestSuiteComposition";
import { YouTrackTestSuiteRepository } from "../../../infrastructure/adapters/YouTrackTestSuiteRepository";

/**
 * @zod-to-schema
 */
export type UpdateTestSuiteReq = {
    projectId: string;
    id: string;
    name?: string;
    description?: string;
    testCaseIDs?: string[];
};

/**
 * @zod-to-schema
 */
export type UpdateTestSuiteRes = {
    id: string;
    name: string;
    description: string;
    testCaseIDs: string[];
};

export default function handle(ctx: CtxPut<UpdateTestSuiteReq, UpdateTestSuiteRes>): void {
    const body = ctx.request.json();

    if (!body.id) {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Test suite ID is required' } as any);
        return;
    }

    try {
        // Verify project exists
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        const ytProject = entities.Project.findByKey(ctx.project.shortName || ctx.project.key);
        if (!ytProject) {
            ctx.response.code = 404;
            ctx.response.json({ error: 'Project not found' } as any);
            return;
        }

        // Initialize repository
        const repository = new YouTrackTestSuiteRepository(ctx.project);

        // Get existing test suite to track name changes
        const existingSuite = repository.findByID(body.id);
        if (!existingSuite) {
            ctx.response.code = 404;
            ctx.response.json({ error: 'Test suite not found' } as any);
            return;
        }

        let updatedSuite = existingSuite;

        // Update metadata if name or description provided
        if (body.name !== undefined || body.description !== undefined) {
            const metadataUseCase = new UpdateTestSuiteMetadataUseCase(repository);
            updatedSuite = metadataUseCase.execute({
                testSuiteID: body.id,
                name: body.name,
                description: body.description
            });

            // Update custom field value if name changed
            if (body.name !== undefined && body.name !== existingSuite.name) {
                try {
                    const testSuiteField = ytProject.findFieldByName('Test Suite');
                    if (testSuiteField) {
                        const existingNewValue = testSuiteField.findValueByName(body.name);
                        if (!existingNewValue && testSuiteField.createValue) {
                            testSuiteField.createValue(body.name);
                        }
                    }
                } catch (fieldError) {
                    console.error("Failed to update Test Suite custom field value:", fieldError);
                }
            }
        }

        // Update composition if testCaseIDs provided
        if (body.testCaseIDs !== undefined) {
            const compositionUseCase = new UpdateTestSuiteCompositionUseCase(repository);
            updatedSuite = compositionUseCase.execute({
                testSuiteID: body.id,
                testCaseIDs: body.testCaseIDs
            });
        }

        // Map to response
        const response: UpdateTestSuiteRes = {
            id: updatedSuite.id,
            name: updatedSuite.name,
            description: updatedSuite.description,
            testCaseIDs: updatedSuite.testCaseIDs
        };

        ctx.response.json(response);
    } catch (error: any) {
        ctx.response.code = 500;
        ctx.response.json({ error: error.message || 'Failed to update test suite' } as any);
    }
}

export type Handle = typeof handle;
