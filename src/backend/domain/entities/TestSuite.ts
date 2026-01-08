export type TestSuiteID = string;
import { TestCaseID } from "./TestCase";
import { ExecutionTargetSnapshot } from "../valueObjects/ExecutionTarget";

export class TestSuite {
    constructor(
        public readonly id: TestSuiteID,
        public name: string,
        public description: string,
        public testCaseIDs: TestCaseID[],
        public issueId?: string,  // YouTrack issue ID when stored as Issue
        public defaultExecutionTarget?: ExecutionTargetSnapshot,  // Default execution target for test cases in this suite
    ){}

    addTestCase(testCaseId: TestCaseID) {
        if (!this.testCaseIDs.includes(testCaseId)) {
            this.testCaseIDs.push(testCaseId);
        }
    }

    removeTestCase(testCaseId: string) {
        this.testCaseIDs = this.testCaseIDs.filter(id => id !== testCaseId);
    }

    getTestCaseIds(): string[] {
        return [...this.testCaseIDs];
    }
}