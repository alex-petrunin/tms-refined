import test from "node:test";
import { ExecutionTriggerPort } from "../../application/ports/ExecutionTriggerPort";
import { TestRun } from "../../domain/entities/TestRun";

export class ManualExecutionAdapter implements ExecutionTriggerPort {
    async trigger(testRun: TestRun): Promise<void> {
        console.log(`ManualExecutionAdapter: Triggering execution for TestRun ID: ${testRun.id}`);
        console.log(testRun.status);
        // testRun.start(); -- controlled in use case 
        console.log(`TestRun ID: ${testRun.id} status updated to ${testRun.status}`);
        testRun.complete(true);
        console.log(`TestRun ID: ${testRun.id} status updated to ${testRun.status}`);
        // Here you would implement the logic to notify the manual testers,
        // e.g., sending an email, updating a dashboard, etc.
    }
}