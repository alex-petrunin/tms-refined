import { TestCaseRepository } from "../../application/ports/TestCaseRepository";
import { TestCaseID, TestCase } from "../../domain/entities/TestCase";


export class InMemoryTestCaseRepository implements TestCaseRepository{
    private store: Map<TestCaseID, TestCase> = new Map();


    save(testCase: TestCase): Promise<void>{
        this.store.set(testCase.id, testCase);
        return Promise.resolve();
    }

    findByID(id: TestCaseID): Promise<TestCase | null> {
        return Promise.resolve(this.store.get(id) ?? null);
    }
}