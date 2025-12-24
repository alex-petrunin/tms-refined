// update test suite composition -- test cases inside
import { UpdateTestSuiteCompositionUseCase } from "../application/usecases/UpdateTestSuiteComposition";
import { InMemoryTestSuiteRepository } from "../infrastructure/inMemory/InMemoryTestSuiteRepository"
import { CreateTestSuiteUseCase } from "../application/usecases/CreateTestSuite";
import { TestCase } from "../domain/entities/TestCase";

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

    
    const updateTestSuiteComposition = new UpdateTestSuiteCompositionUseCase(repo);

    // create some test cases to add
    const testCases: TestCase[] = [
        new TestCase(crypto.randomUUID(), "Test Case 1", "Description 1"),
        new TestCase(crypto.randomUUID(), "Test Case 2", "Description 2"),
        new TestCase(crypto.randomUUID(), "Test Case 3", "Description 3"),
    ];

    // update suite with new Test Cases
    await updateTestSuiteComposition.execute({
        testSuiteID: suiteID,
        testCaseIDs: testCases.map(tc => tc.id)
    });

    const updated = await repo.findByID(suiteID);
    console.log("Updated Test Suite with Test Cases:", updated);

    // remove some test cases
    await updateTestSuiteComposition.execute({
        testSuiteID: suiteID,
        testCaseIDs: [testCases[0].id] // keep only the first test case
    });

    const modified = await repo.findByID(suiteID);
    console.log("Modified Test Suite after removing some Test Cases:", modified);
})()