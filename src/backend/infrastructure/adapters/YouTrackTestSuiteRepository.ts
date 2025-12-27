import { TestSuiteRepository } from "../../application/ports/TestSuiteRepository";
import { TestSuite, TestSuiteID } from "../../domain/entities/TestSuite";

/**
 * YouTrack implementation of TestSuiteRepository.
 * Stores test suites in project extension properties as JSON.
 * 
 * IMPORTANT: All methods are SYNCHRONOUS because YouTrack's scripting
 * environment runs in a V8 isolate that doesn't support async/await.
 */
export class YouTrackTestSuiteRepository implements TestSuiteRepository {
    private projectId: string;
    private projectExtProps: any;

    constructor(project: { id?: string; extensionProperties?: any }) {
        this.projectId = project.id || '';
        this.projectExtProps = project.extensionProperties || {};
    }

    save(testSuite: TestSuite): void {
        const suites = this.findAll();
        
        // Update or add the test suite
        const index = suites.findIndex(s => s.id === testSuite.id);
        if (index >= 0) {
            suites[index] = testSuite;
        } else {
            suites.push(testSuite);
        }

        this.saveAll(suites);
    }

    findByID(id: TestSuiteID): TestSuite | null {
        const suites = this.findAll();
        return suites.find(s => s.id === id) || null;
    }

    findAll(): TestSuite[] {
        const suitesJson = this.projectExtProps.testSuites;

        if (!suitesJson || typeof suitesJson !== 'string') {
            return [];
        }

        try {
            const suitesData = JSON.parse(suitesJson);
            return suitesData.map((data: any) => new TestSuite(
                data.id,
                data.name,
                data.description || '',
                data.testCaseIDs || []
            ));
        } catch (error) {
            console.error("Failed to parse test suites:", error);
            return [];
        }
    }

    delete(id: TestSuiteID): boolean {
        const suites = this.findAll();
        const initialLength = suites.length;
        const filtered = suites.filter(s => s.id !== id);
        
        if (filtered.length === initialLength) {
            return false; // Not found
        }
        
        this.saveAll(filtered);
        return true;
    }

    private saveAll(suites: TestSuite[]): void {
        const suitesData = suites.map(suite => ({
            id: suite.id,
            name: suite.name,
            description: suite.description,
            testCaseIDs: suite.testCaseIDs
        }));

        const suitesJson = JSON.stringify(suitesData);

        // Use YouTrack scripting API to persist to project extension properties
        // This require is external and provided by YouTrack runtime
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        const project = entities.Project.findById(this.projectId);
        project.extensionProperties.testSuites = suitesJson;
    }
}

