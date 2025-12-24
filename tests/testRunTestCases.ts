import { TestSuite } from "../domain/entities/TestSuite";
import { ExecutionTargetSnapshot } from "../domain/entities/ExecutionTarget";

import { RunTestCasesUseCase } from "../application/usecases/RunTestCases";
import { InMemoryTestRunRepository } from "../infrastructure/inMemory/InMemoryTestRunRepository";
import { ManualExecutionAdapter } from "../infrastructure/adapters/ManualExecutionAdapter";

(
    async () => {
        // prepare domain
    const suite = new TestSuite("suite-1", "Smoke Suite", "", []);
    const createdSuiteID = suite.id;

    // prepare execution target
    const target = new ExecutionTargetSnapshot("target-1", "Manual Env", "Manual");

    // setup application
    const repo = new InMemoryTestRunRepository();
    const adapter = new ManualExecutionAdapter();
    const runUseCase = new RunTestCasesUseCase(repo, adapter);

    // execute
    const testCaseIDs = ["tc-1", "tc-2", "tc-3"];
    const testRunIDs = await runUseCase.execute({
        suiteID: createdSuiteID,
        testCaseIDs: testCaseIDs,
        executionTarget: target
    });

    console.log("Test Cases:", testCaseIDs);
    console.log("Execution Target:", target);
    testRunIDs.forEach(id => console.log("Created TestRun ID:", id));
    
    }
)()