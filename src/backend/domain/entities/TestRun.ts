import { TestCaseID } from "./TestCase";
import { TestSuiteID } from "./TestSuite";
import {ExecutionTargetSnapshot} from "@backend/domain/valueObjects/ExecutionTarget.ts";

export type TestRunID = string;

export enum TestStatus {
    PASSED = "PASSED",
    FAILED = "FAILED",
    RUNNING = "RUNNING",
    PENDING = "PENDING",
    AWAITING_EXTERNAL_RESULTS = "AWAITING_EXTERNAL_RESULTS",
}

export class TestRun{
    public status: TestStatus = TestStatus.PENDING;
    constructor(
        public readonly id: TestRunID,
        public testCaseIDs: TestCaseID[],
        public testSuiteID: TestSuiteID,
        public executionTarget: ExecutionTargetSnapshot,
    ){
        if (testCaseIDs.length === 0) {
            throw new Error("TestRun must have at least one TestCase.");
        }
        if (executionTarget === undefined) {
            throw new Error("TestRun must have an ExecutionTarget.");
        }
    }

    start(){
        if (this.status === TestStatus.PENDING) {
            this.status = TestStatus.RUNNING;
        } else {
             throw new Error(
                 `Cannot start TestRun '${this.id}' because it is in status '${this.status}' instead of '${TestStatus.PENDING}'.`
             );
        }
    }

    markAwaiting() {
        this.status = TestStatus.AWAITING_EXTERNAL_RESULTS;
    }

    complete(passed: boolean){
        if (
            this.status !== TestStatus.RUNNING &&
            this.status !== TestStatus.AWAITING_EXTERNAL_RESULTS
        ) {
            return;
        }
        this.status = passed ? TestStatus.PASSED : TestStatus.FAILED;
    }
}