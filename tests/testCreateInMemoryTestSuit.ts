import { CreateTestSuiteUseCase } from "../application/usecases/CreateTestSuite";
import { InMemoryTestSuiteRepository } from "../infrastructure/inMemory/InMemoryTestSuiteRepository"


(async () => {
    const repo = new InMemoryTestSuiteRepository();
    const createTestSuite = new CreateTestSuiteUseCase(repo);

    const suiteID = await createTestSuite.execute({
        name: "My In-Memory Test Suite",
        description: "A test suite created in memory for testing purposes"
    })
    console.log("Created test suite id:", suiteID);

    const saved = await repo.findByID(suiteID);
    console.log("Saved Test Suite:", saved);
}
)()