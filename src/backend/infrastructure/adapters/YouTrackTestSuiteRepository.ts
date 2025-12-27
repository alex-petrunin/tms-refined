import { TestSuiteRepository } from "../../application/ports/TestSuiteRepository";
import { TestSuite, TestSuiteID } from "../../domain/entities/TestSuite";

/**
 * YouTrack implementation of TestSuiteRepository.
 * Stores test suites in project extension properties as JSON.
 * 
 * Note: Unlike TestCases and TestRuns, TestSuites are NOT stored as issues.
 * They are stored as JSON in project.extensionProperties.testSuites because:
 * 1. The scripting API doesn't support persisting Issue drafts without REST API
 * 2. Test suites are lightweight metadata containers for grouping test cases
 * 3. This approach is simpler and works reliably in HTTP handlers
 * 
 * IMPORTANT: All methods are SYNCHRONOUS because YouTrack's scripting
 * environment runs in a V8 isolate that doesn't support async/await.
 */
export class YouTrackTestSuiteRepository implements TestSuiteRepository {
    private projectKey: string;

    constructor(project: { shortName?: string; key?: string }) {
        this.projectKey = project.shortName || project.key || '';
    }

    /**
     * Save a test suite to project extension properties.
     */
    save(testSuite: TestSuite): void {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        const project = entities.Project.findByKey(this.projectKey);
        
        if (!project) {
            throw new Error(`Project not found: ${this.projectKey}`);
        }

        const suites = this.loadSuites(project);
        
        // Update or add the test suite
        const index = suites.findIndex(s => s.id === testSuite.id);
        const suiteData = {
            id: testSuite.id,
            name: testSuite.name,
            description: testSuite.description,
            testCaseIDs: testSuite.testCaseIDs
        };
        
        if (index >= 0) {
            suites[index] = suiteData;
        } else {
            suites.push(suiteData);
        }

        this.saveSuites(project, suites);
    }

    /**
     * Find a test suite by its ID.
     */
    findByID(id: TestSuiteID): TestSuite | null {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        const project = entities.Project.findByKey(this.projectKey);
        
        if (!project) {
            return null;
        }

        const suites = this.loadSuites(project);
        const suiteData = suites.find(s => s.id === id);
        
        if (!suiteData) {
            return null;
        }

        return new TestSuite(
            suiteData.id,
            suiteData.name,
            suiteData.description,
            suiteData.testCaseIDs
        );
    }

    /**
     * Find all test suites in the project.
     */
    findAll(): TestSuite[] {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        const project = entities.Project.findByKey(this.projectKey);
        
        if (!project) {
            return [];
        }

        const suites = this.loadSuites(project);
        return suites.map(data => new TestSuite(
            data.id,
            data.name,
            data.description,
            data.testCaseIDs
        ));
    }

    /**
     * Delete a test suite.
     */
    delete(id: TestSuiteID): boolean {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        const project = entities.Project.findByKey(this.projectKey);
        
        if (!project) {
            return false;
        }

        const suites = this.loadSuites(project);
        const initialLength = suites.length;
        const filtered = suites.filter(s => s.id !== id);
        
        if (filtered.length === initialLength) {
            return false; // Not found
        }
        
        this.saveSuites(project, filtered);
        return true;
    }

    /**
     * Load suites from project extension properties.
     */
    private loadSuites(project: any): Array<{id: string; name: string; description: string; testCaseIDs: string[]}> {
        try {
            const extProps = project.extensionProperties || {};
            const suitesJson = extProps.testSuites;

            if (suitesJson && typeof suitesJson === 'string') {
                return JSON.parse(suitesJson);
            }
        } catch (error) {
            console.error("Failed to parse test suites:", error);
        }
        return [];
    }

    /**
     * Save suites to project extension properties.
     */
    private saveSuites(project: any, suites: Array<{id: string; name: string; description: string; testCaseIDs: string[]}>): void {
        project.extensionProperties.testSuites = JSON.stringify(suites);
    }
}
