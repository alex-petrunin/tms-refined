import { TestSuite, TestSuiteID } from "../../domain/entities/TestSuite";

export interface TestSuiteRepository {
    save(testSuite: TestSuite): Promise<void>;
    findByID(id: TestSuiteID): Promise<TestSuite|null>;
}