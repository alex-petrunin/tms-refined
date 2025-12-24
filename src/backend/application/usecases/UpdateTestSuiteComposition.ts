import { TestSuite, TestSuiteID } from "../../domain/entities/TestSuite";
import { TestCase, TestCaseID } from "../../domain/entities/TestCase";
import { TestSuiteRepository } from "../ports/TestSuiteRepository";

export interface UpdateTestSuiteCompositionInput{
    testSuiteID: TestSuiteID;
    testCaseIDs: TestCaseID[];
}

export class UpdateTestSuiteCompositionUseCase{
    constructor(private repo: TestSuiteRepository){}

    async execute(input: UpdateTestSuiteCompositionInput): Promise<void>{
        const testSuite = await this.repo.findByID(input.testSuiteID);
        if(!testSuite){
            throw new Error("Test Suite not found");
        }
        
        testSuite.testCaseIDs = input.testCaseIDs;
        await this.repo.save(testSuite);
    }
}