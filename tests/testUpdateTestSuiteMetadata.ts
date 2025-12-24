// update test suite composition -- test cases inside
import { UpdateTestSuiteMetadataUseCase } from "../application/usecases/UpdateTestSuiteMetadata";
import { InMemoryTestSuiteRepository } from "../infrastructure/inMemory/InMemoryTestSuiteRepository"
import { CreateTestSuiteUseCase } from "../application/usecases/CreateTestSuite";

(async () => {
    const repo = new InMemoryTestSuiteRepository();
    const createTestSuite = new CreateTestSuiteUseCase(repo);

    // create suite
    const suiteID = await createTestSuite.execute({
        name: "My In-Memory Test Suite",
        description: "A test suite created in memory for testing purposes"
    })
    console.log("Created test suite id:", suiteID);
    const saved = await repo.findByID(suiteID);
    console.log("Saved Test Suite:", saved);

    const updateTestSuiteMetadata = new UpdateTestSuiteMetadataUseCase(repo);
    
    // update suite metadata
    await updateTestSuiteMetadata.execute({
        testSuiteID: suiteID,
        name: "Updated Test Suite Name",
        description: "Updated description for the test suite"
    });

    
    const updated = await repo.findByID(suiteID);
    console.log("Updated Test Suite with Test Cases:", updated);

})()