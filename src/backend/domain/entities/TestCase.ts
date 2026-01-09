import { ExecutionTargetSnapshot } from "../valueObjects/ExecutionTarget";

export type TestCaseID = string;

export class TestCase {
    constructor(
        public readonly id: TestCaseID,
        public summary: string,
        public description: string,
        public executionTargetSnapshot?: ExecutionTargetSnapshot,
    ){}

    /**
     * Check if this test case has an execution target configured
     */
    hasExecutionTarget(): boolean {
        return this.executionTargetSnapshot !== undefined && this.executionTargetSnapshot !== null;
    }
}