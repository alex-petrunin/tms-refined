import { ExecutionTriggerPort } from "../../application/ports/ExecutionTriggerPort";
import { TestRun } from "../../domain/entities/TestRun";
import { CIAdapterFactory } from "./CIAdapterFactory";

/**
 * Dynamic execution trigger that wraps CIAdapterFactory
 * 
 * This adapter allows RunTestCasesUseCase to remain stable by implementing
 * the ExecutionTriggerPort interface while delegating to dynamically created
 * adapters from the factory.
 * 
 * Flow:
 * 1. Extract execution target from test run
 * 2. Create appropriate adapter via factory (loads integration config)
 * 3. Delegate trigger call to the adapter
 * 
 * Benefits:
 * - No changes needed to RunTestCasesUseCase
 * - Factory handles integration loading and adapter creation
 * - Clean separation of concerns
 */
export class DynamicExecutionTrigger implements ExecutionTriggerPort {
    constructor(private adapterFactory: CIAdapterFactory) {}

    /**
     * Triggers test execution by dynamically creating the appropriate adapter
     */
    async trigger(testRun: TestRun): Promise<void> {
        console.log('=== DynamicExecutionTrigger START ===');
        console.log('TestRun ID:', testRun.id);
        console.log('ExecutionTarget:', {
            integrationId: testRun.executionTarget.integrationId,
            type: testRun.executionTarget.type,
            config: testRun.executionTarget.config
        });
        
        // Create adapter based on test run's execution target
        const adapter = await this.adapterFactory.createAdapter(testRun.executionTarget);
        console.log('Adapter created:', adapter.constructor.name);
        
        // Delegate to the adapter
        await adapter.trigger(testRun);
        console.log('=== DynamicExecutionTrigger SUCCESS ===');
    }
}

