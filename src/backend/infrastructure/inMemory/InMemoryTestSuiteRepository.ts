import { TestSuiteRepository } from "../../application/ports/TestSuiteRepository";
import { TestSuiteID, TestSuite } from "../../domain/entities/TestSuite";


export class InMemoryTestSuiteRepository implements TestSuiteRepository{
    private store: Map<TestSuiteID, TestSuite> = new Map();


    save(testSuite: TestSuite): Promise<void>{
        this.store.set(testSuite.id, testSuite);
        return Promise.resolve();
    }

    findByID(id: TestSuiteID): Promise<TestSuite | null> {
        return Promise.resolve(this.store.get(id) ?? null);
    }
}