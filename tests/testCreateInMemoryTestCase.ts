import {InMemoryTestCaseRepository} from "../src/backend/infrastructure/inMemory/InMemoryTestCaseRepository";
import {CreateTestCaseUseCase} from "../src/backend/application/usecases/CreateTestCase";

(async () => {
    const repo = new InMemoryTestCaseRepository();
    const createTestCase = new CreateTestCaseUseCase(repo);

    const caseID = await createTestCase.execute({
        summary: "My In-Memory Test Case",
        description: "A test case created in memory for testing purposes"
    })
    console.log("Created test case id:", caseID);

    const saved = await repo.findByID(caseID);
    console.log("Saved Test Case:", saved);
}
)()