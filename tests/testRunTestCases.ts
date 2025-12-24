import { TestSuite } from "@domain/entities/TestSuite";
import { TestCase } from "@domain/entities/TestCase";
import { ExecutionTargetSnapshot } from "@domain/valueObjects/ExecutionTarget";
import { ExecutionTargetType } from "@domain/enums/ExecutionTargetType";

import { RunTestCasesUseCase } from "@app/usecases/RunTestCases";
import { InMemoryTestRunRepository } from "@infra/inMemory/InMemoryTestRunRepository";
import { InMemoryTestCaseRepository } from "@infra/inMemory/InMemoryTestCaseRepository";
import { InMemoryExecutionTargetResolver } from "@infra/inMemory/InMemoryExecutionTargetResolver";
import { ManualExecutionAdapter } from "@infra/adapters/ManualExecutionAdapter";

(
    async () => {
        // prepare domain
        const suite = new TestSuite("suite-1", "Smoke Suite", "", []);
        const createdSuiteID = suite.id;

        // prepare execution target
        const target = new ExecutionTargetSnapshot(
            "target-1",
            "Manual Env",
            ExecutionTargetType.MANUAL,
            "manual-ref-1"
        );

        // create test cases with execution targets
        const testCaseIDs = ["tc-1", "tc-2", "tc-3"];
        const testCases = testCaseIDs.map(id => 
            new TestCase(id, `Test Case ${id}`, `Description for ${id}`, target)
        );

        // setup infrastructure
        const testCaseRepo = new InMemoryTestCaseRepository();
        for (const testCase of testCases) {
            await testCaseRepo.save(testCase);
        }

        const testRunRepo = new InMemoryTestRunRepository();
        const executionTargetResolver = new InMemoryExecutionTargetResolver(testCaseRepo);
        const adapter = new ManualExecutionAdapter();
        
        // setup application
        const runUseCase = new RunTestCasesUseCase(
            testRunRepo,
            adapter,
            executionTargetResolver
        );

        // execute
        const testRunIDs = await runUseCase.execute({
            suiteID: createdSuiteID,
            testCaseIDs: testCaseIDs,
        });

        console.log("Test Cases:", testCaseIDs);
        console.log("Execution Target:", target);
        testRunIDs.forEach(id => console.log("Created TestRun ID:", id));
    }
)()