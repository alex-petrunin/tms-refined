import { TestSuiteRepository } from "../../application/ports/TestSuiteRepository";
import { TestSuite, TestSuiteID } from "../../domain/entities/TestSuite";
import { Project } from "@/api/youtrack-types";

/**
 * YouTrack implementation of TestSuiteRepository.
 * Stores test suites in project extension properties as JSON.
 * 
 * Note: This adapter uses project extension properties directly.
 * For updating project properties, it uses the YouTrack scripting API if available,
 * or falls back to REST API calls via the app host.
 */
export class YouTrackTestSuiteRepository implements TestSuiteRepository {
    constructor(
        private project: Project,
        private settings: AppSettings,
        private appHost?: any // App host API for REST calls (host.fetchYouTrack)
    ) {}

    async save(testSuite: TestSuite): Promise<void> {
        // Load all test suites from project extension properties
        const suites = await this.loadAllTestSuites();
        
        // Update or add the test suite
        const index = suites.findIndex(s => s.id === testSuite.id);
        if (index >= 0) {
            suites[index] = testSuite;
        } else {
            suites.push(testSuite);
        }

        // Save back to project extension properties
        await this.saveAllTestSuites(suites);
    }

    async findByID(id: TestSuiteID): Promise<TestSuite | null> {
        // search all suites
        const suites = await this.loadAllTestSuites();
        return suites.find(s => s.id === id) || null;
    }

    private async loadAllTestSuites(): Promise<TestSuite[]> {
        // Access project extension properties
        const extProps = (this.project as any).extensionProperties || {};
        const suitesJson = extProps.testSuites;

        if (!suitesJson || typeof suitesJson !== 'string') {
            return [];
        }

        try {
            const suitesData = JSON.parse(suitesJson);
            return suitesData.map((data: any) => new TestSuite(
                data.id,
                data.name,
                data.description,
                data.testCaseIDs || []
            ));
        } catch (error) {
            console.error("Failed to parse test suites from extension properties:", error);
            return [];
        }
    }

    private async saveAllTestSuites(suites: TestSuite[]): Promise<void> {
        const suitesData = suites.map(suite => ({
            id: suite.id,
            name: suite.name,
            description: suite.description,
            testCaseIDs: suite.testCaseIDs
        }));

        const suitesJson = JSON.stringify(suitesData);

        // Try scripting API first
        try {
            const entities = require('@jetbrains/youtrack-scripting-api/entities');
            const project = entities.Project.findById(this.project.id!);
            project.extensionProperties.testSuites = suitesJson;
            return;
        } catch (e) {
            // Scripting API not available, use REST API
        }

        // Use REST API via app host
        if (this.appHost && this.appHost.fetchYouTrack) {
            const payload = {
                extensionProperties: {
                    testSuites: suitesJson
                }
            };

            await this.appHost.fetchYouTrack(`admin/projects/${this.project.id}`, {
                method: 'POST',
                body: payload,
                query: { fields: 'id,extensionProperties' }
            });
            return;
        }

        // Fallback: Direct access to extension properties (if available in context)
        (this.project as any).extensionProperties = {
            ...((this.project as any).extensionProperties || {}),
            testSuites: suitesJson
        };
    }

}

