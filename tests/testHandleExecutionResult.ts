import { TestRun, TestStatus } from "../domain/entities/TestRun";
import { ExecutionTargetSnapshot } from "../domain/entities/ExecutionTarget";

import { HandleExecutionResultUseCase } from "../application/usecases/HandleExecutionResult";
import { InMemoryTestRunRepository } from "../infrastructure/inMemory/InMemoryTestRunRepository";
import { ManualResultAdapter } from "../infrastructure/adapters/ManualResultAdapter";

(
    async () => {
        console.log("=== Test: Handle Execution Result ===\n");

        // Setup repository and use case
        const repo = new InMemoryTestRunRepository();
        const handleResultUC = new HandleExecutionResultUseCase(repo);
        const adapter = new ManualResultAdapter(handleResultUC);

        // Prepare test data
        const target = new ExecutionTargetSnapshot("target-1", "Manual Env", "Manual");
        
        // Test Case 1: Handle PASSED result for a RUNNING test
        console.log("Test Case 1: Handle PASSED result for a RUNNING test");
        const testRun1 = new TestRun("run-1", ["tc-1"], "suite-1", target);
        testRun1.start(); // Set status to RUNNING
        await repo.save(testRun1);
        
        console.log("  Initial Status:", testRun1.status);
        await adapter.submit({ testRunID: "run-1", passed: true });
        
        const updatedRun1 = await repo.findById("run-1");
        console.log("  Final Status:", updatedRun1?.status);
        console.log("  Expected: PASSED, Got:", updatedRun1?.status === TestStatus.PASSED ? "✓ PASSED" : "✗ FAILED");
        console.log();

        // Test Case 2: Handle FAILED result for a RUNNING test
        console.log("Test Case 2: Handle FAILED result for a RUNNING test");
        const testRun2 = new TestRun("run-2", ["tc-2"], "suite-1", target);
        testRun2.start(); // Set status to RUNNING
        await repo.save(testRun2);
        
        console.log("  Initial Status:", testRun2.status);
        await adapter.submit({ testRunID: "run-2", passed: false });
        
        const updatedRun2 = await repo.findById("run-2");
        console.log("  Final Status:", updatedRun2?.status);
        console.log("  Expected: FAILED, Got:", updatedRun2?.status === TestStatus.FAILED ? "✓ PASSED" : "✗ FAILED");
        console.log();

        // Test Case 3: Handle result for AWAITING_EXTERNAL_RESULTS test
        console.log("Test Case 3: Handle result for AWAITING_EXTERNAL_RESULTS test");
        const testRun3 = new TestRun("run-3", ["tc-3"], "suite-1", target);
        testRun3.markAwaiting(); // Set status to AWAITING_EXTERNAL_RESULTS
        await repo.save(testRun3);
        
        console.log("  Initial Status:", testRun3.status);
        await adapter.submit({ testRunID: "run-3", passed: true });
        
        const updatedRun3 = await repo.findById("run-3");
        console.log("  Final Status:", updatedRun3?.status);
        console.log("  Expected: PASSED, Got:", updatedRun3?.status === TestStatus.PASSED ? "✓ PASSED" : "✗ FAILED");
        console.log();

        // Test Case 4: Handle result for non-existent test run
        console.log("Test Case 4: Handle result for non-existent test run");
        await adapter.submit({ testRunID: "non-existent-run", passed: true });
        console.log("  Expected: No error thrown - ✓ PASSED");
        console.log();

        // Test Case 5: Handle result for PENDING test (should not change status)
        console.log("Test Case 5: Handle result for PENDING test (should not change status)");
        const testRun5 = new TestRun("run-5", ["tc-5"], "suite-1", target);
        // Don't start it, leave it in PENDING state
        await repo.save(testRun5);
        
        console.log("  Initial Status:", testRun5.status);
        await adapter.submit({ testRunID: "run-5", passed: true });
        
        const updatedRun5 = await repo.findById("run-5");
        console.log("  Final Status:", updatedRun5?.status);
        console.log("  Expected: PENDING (unchanged), Got:", updatedRun5?.status === TestStatus.PENDING ? "✓ PASSED" : "✗ FAILED");
        console.log();

        console.log("=== All Tests Completed ===");
    }
)()
