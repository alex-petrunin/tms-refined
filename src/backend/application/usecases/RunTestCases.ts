import { TestCaseID } from "../../domain/entities/TestCase";
import { TestRun, TestRunID } from "../../domain/entities/TestRun";
import { TestSuiteID } from "../../domain/entities/TestSuite";
import { ExecutionTriggerPort } from "../ports/ExecutionTriggerPort";
import { TestRunRepository } from "../ports/TestRunRepository";
import {ExecutionTargetSnapshot} from "@backend/domain/valueObjects/ExecutionTarget.ts";

export interface RunTestCasesInput {
    suiteID: TestSuiteID;
    testCaseIDs: TestCaseID[];
    executionTarget: ExecutionTargetSnapshot;
    executionMode?: "MANAGED" | "OBSERVED"; // default: MANAGED
}

export class RunTestCasesUseCase {
    constructor(
        private testRunRepo: TestRunRepository,
        private triggerPort: ExecutionTriggerPort
    ) {}

    async execute(input: RunTestCasesInput): Promise<TestRunID[]> {
//       - Load Test Case Aggregates → group by Execution Target
//       - For each Execution Target group, create Test Run Aggregate, snapshot Execution Target, fix Test Cases list → persist
//       - Depending on Execution Mode (park for later):
//          - If "we manage" → trigger Test Execution Service (infrastructure) with Test Run ID
//          - If "we observe" → skip invocation, mark Test Run as "AwaitingExternalResults"
//       - Output: Test Run ID(s)

        const testRunIDs: TestRunID[] = [];
    
        // For simplicity, assuming all test cases use different execution target, no grouping yet
        // later: resolveExecutionTarget(testCaseID), group by target, etc.
        for (const testCaseID of input.testCaseIDs) {
            const runId = crypto.randomUUID();
            const testRun = new TestRun(
                runId,
                [testCaseID],
                input.suiteID,
                input.executionTarget
            );

            const mode = input.executionMode ?? "MANAGED";
            if (mode === "MANAGED"){
                testRun.start(); // "PENDING"
                await this.testRunRepo.save(testRun);
                await this.triggerPort.trigger(testRun);
            } else {
                testRun.markAwaiting();
                await this.testRunRepo.save(testRun);
            }
            
            

            testRunIDs.push(runId);
        }
        return testRunIDs;
        
    }
}