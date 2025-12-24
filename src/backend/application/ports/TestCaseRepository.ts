import { TestCase, TestCaseID } from "../../domain/entities/TestCase";

export interface TestCaseRepository {
    save(testCase: TestCase): Promise<void>;
    findByID(id: TestCaseID): Promise<TestCase|null>;
}