import { TestRunID } from "../../domain/entities/TestRun";
import { TestRunRepository } from "../ports/TestRunRepository";

export interface HandleExecutionResultInput {
    testRunID: TestRunID;
    passed: boolean;
}

export class HandleExecutionResultUseCase {
    constructor(
        private testRunRepo: TestRunRepository
    ) {}

    async execute(input: HandleExecutionResultInput): Promise<void> {
        const testRun = await this.testRunRepo.findById(input.testRunID);
        if (!testRun) {
            // throw new Error(`TestRun with ID '${input.testRunID}' not found.`);
            return;
        }

        testRun.complete(input.passed);
        await this.testRunRepo.save(testRun);
    }
}