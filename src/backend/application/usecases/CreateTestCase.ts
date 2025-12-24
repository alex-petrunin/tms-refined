import { TestCaseRepository } from "../ports/TestCaseRepository";
import { TestCase, TestCaseID } from "../../domain/entities/TestCase";

export interface CreateTestCaseInput{
    summary: string;
    description?: string;
}

export class CreateTestCaseUseCase{
    constructor(private repo: TestCaseRepository){}

    async execute(input: CreateTestCaseInput): Promise<TestCaseID>{
        const id = crypto.randomUUID();
        const testCase = new TestCase(
            id,
            input.summary,
            input.description || "",
        );
        await this.repo.save(testCase);
        return id;
    }
}
