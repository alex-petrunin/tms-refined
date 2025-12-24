import { TestSuite, TestSuiteID } from "../../domain/entities/TestSuite";
import { TestSuiteRepository } from "../ports/TestSuiteRepository";


export interface CreateTestSuiteInput{
    name: string;
    description?: string;
}

export class CreateTestSuiteUseCase{
    constructor(private repo: TestSuiteRepository){}

    async execute(input: CreateTestSuiteInput): Promise<TestSuiteID>{
        const id = crypto.randomUUID();
        const testSuite = new TestSuite(
            id,
            input.name,
            input.description || "",
            []
        );
        await this.repo.save(testSuite);
        return id;
    }
}
