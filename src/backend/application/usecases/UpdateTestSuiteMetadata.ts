import { TestSuiteID } from "../../domain/entities/TestSuite";
import { TestSuiteRepository } from "../ports/TestSuiteRepository";

export interface UpdateTestSuiteMetadataInput{
    testSuiteID: TestSuiteID;
    name?: string;
    description?: string;
}

export class UpdateTestSuiteMetadataUseCase{
    constructor(private repo: TestSuiteRepository){}

    async execute(input: UpdateTestSuiteMetadataInput): Promise<void>{
        const testSuite = await this.repo.findByID(input.testSuiteID);
        if(!testSuite){
            throw new Error("Test Suite not found");
        }
        
        testSuite.name = input.name || testSuite.name;
        testSuite.description = input.description || testSuite.description;
        await this.repo.save(testSuite);
    }
}