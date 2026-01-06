import { TestCaseRepositorySync } from "../../application/ports/TestCaseRepositorySync";
import { TestCase, TestCaseID } from "../../domain/entities/TestCase";
import { ExecutionTargetSnapshot } from "../../domain/valueObjects/ExecutionTarget";
import { ExecutionTargetType } from "../../domain/enums/ExecutionTargetType";

/**
 * Synchronous YouTrack implementation of TestCaseRepository.
 * Uses YouTrack scripting API for HTTP handlers.
 * 
 * Note: This is a synchronous adapter designed for YouTrack HTTP handlers
 * where the scripting API operates synchronously.
 */
export class YouTrackTestCaseRepositorySync implements TestCaseRepositorySync {
    private lastCreatedIssue: any = null;
    
    constructor(
        private projectKey: string,
        private currentUser?: any
    ) {}

    save(testCase: TestCase): any {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        const project = entities.Project.findByKey(this.projectKey);
        
        if (!project) {
            throw new Error(`Project not found: ${this.projectKey}`);
        }

        // Find existing issue or create new
        // Try to find by issue ID first (e.g., "TEST-123"), then by extension property (legacy)
        let existingIssue = null;
        try {
            existingIssue = entities.Issue.findById(testCase.id);
        } catch (e) {
            // If not found by issue ID, try searching by extension property
            existingIssue = this.findIssueByTestCaseId(testCase.id);
        }
        
        if (existingIssue) {
            this.updateIssue(existingIssue, testCase);
            this.lastCreatedIssue = existingIssue;
            return existingIssue;
        } else {
            const newIssue = this.createIssue(project, testCase);
            this.lastCreatedIssue = newIssue;
            return newIssue;
        }
    }
    
    getLastCreatedIssue(): any {
        return this.lastCreatedIssue;
    }

    findByID(id: TestCaseID): TestCase | null {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        
        // Try to find by issue ID first (e.g., "TEST-123")
        let issue = null;
        try {
            issue = entities.Issue.findById(id);
        } catch (e) {
            // If not found by issue ID, try searching by extension property (legacy)
            issue = this.findIssueByTestCaseId(id);
        }
        
        if (!issue) {
            return null;
        }
        return this.mapIssueToTestCase(issue);
    }

    findAll(): TestCase[] {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        const search = require('@jetbrains/youtrack-scripting-api/search');
        const project = entities.Project.findByKey(this.projectKey);
        
        if (!project) {
            return [];
        }

        // Search for all issues in the project
        const allIssues = search.search(project, '') || [];
        
        // Convert to array
        const issuesArray: any[] = [];
        if (allIssues && typeof allIssues.forEach === 'function') {
            allIssues.forEach((issue: any) => {
                issuesArray.push(issue);
            });
        } else if (Array.isArray(allIssues)) {
            issuesArray.push(...allIssues);
        }

        // Filter to only test cases and map to domain entities
        const testCases: TestCase[] = [];
        for (const issue of issuesArray) {
            const extProps = issue.extensionProperties || {};
            if (extProps.testCaseId) {
                testCases.push(this.mapIssueToTestCase(issue));
            }
        }

        return testCases;
    }

    private findIssueByTestCaseId(testCaseId: string): any {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        
        try {
            const issues = entities.Issue.findByExtensionProperties({
                testCaseId: testCaseId
            });
            
            if (issues && issues.size > 0) {
                return Array.from(issues)[0];
            }
        } catch (e) {
            // Fallback: search manually
            const search = require('@jetbrains/youtrack-scripting-api/search');
            const project = entities.Project.findByKey(this.projectKey);
            if (project) {
                const allIssues = search.search(project, '') || [];
                const issuesArray: any[] = [];
                if (allIssues && typeof allIssues.forEach === 'function') {
                    allIssues.forEach((issue: any) => issuesArray.push(issue));
                }
                
                for (const issue of issuesArray) {
                    const extProps = issue.extensionProperties || {};
                    if (extProps.testCaseId === testCaseId) {
                        return issue;
                    }
                }
            }
        }
        
        return null;
    }

    private createIssue(project: any, testCase: TestCase): any {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        
        // Use current user from constructor, or fallback to finding admin/root
        let reporter = this.currentUser;
        if (!reporter) {
            try {
                reporter = entities.User.findByLogin('admin');
            } catch (e) {
                try {
                    reporter = entities.User.findByLogin('root');
                } catch (e2) {
                    // Last resort - try to get first available user
                    const users = entities.User.search('');
                    if (users && users.size > 0) {
                        reporter = Array.from(users)[0];
                    }
                }
            }
        }
        
        if (!reporter) {
            throw new Error('No user available to create issue. Please ensure at least one user exists in YouTrack.');
        }
        
        const issue = new entities.Issue(reporter, project, testCase.summary);
        
        issue.description = testCase.description;
        // Use the actual YouTrack issue ID as the test case ID for direct lookup
        const actualId = issue.idReadable || issue.id;
        issue.extensionProperties.testCaseId = actualId;
        issue.extensionProperties.testCaseSummary = testCase.summary;
        issue.extensionProperties.testCaseDescription = testCase.description;
        
        // Set execution target if provided
        if (testCase.executionTargetSnapshot) {
            issue.extensionProperties.executionTargetId = testCase.executionTargetSnapshot.id;
            issue.extensionProperties.executionTargetName = testCase.executionTargetSnapshot.name;
            issue.extensionProperties.executionTargetType = testCase.executionTargetSnapshot.type;
            issue.extensionProperties.executionTargetRef = testCase.executionTargetSnapshot.ref;
        }
        
        // Set custom fields
        this.setCustomFields(issue, testCase);
        
        return issue;
    }

    private updateIssue(issue: any, testCase: TestCase): void {
        issue.summary = testCase.summary;
        issue.description = testCase.description;
        issue.extensionProperties.testCaseSummary = testCase.summary;
        issue.extensionProperties.testCaseDescription = testCase.description;
        
        // Update execution target if provided
        if (testCase.executionTargetSnapshot) {
            issue.extensionProperties.executionTargetId = testCase.executionTargetSnapshot.id;
            issue.extensionProperties.executionTargetName = testCase.executionTargetSnapshot.name;
            issue.extensionProperties.executionTargetType = testCase.executionTargetSnapshot.type;
            issue.extensionProperties.executionTargetRef = testCase.executionTargetSnapshot.ref;
        }
        
        this.setCustomFields(issue, testCase);
    }

    private setCustomFields(issue: any, testCase: TestCase): void {
        try {
            // Set TMS Kind
            const kindField = issue.project.findFieldByName('TMS Kind');
            if (kindField) {
                const testCaseValue = kindField.findValueByName('Test Case');
                if (testCaseValue) {
                    issue.fields['TMS Kind'] = testCaseValue;
                }
            }

            // Set execution target fields if provided
            if (testCase.executionTargetSnapshot) {
                const targetTypeField = issue.project.findFieldByName('Execution Target Type');
                if (targetTypeField) {
                    const typeValue = targetTypeField.findValueByName(
                        this.mapExecutionTargetTypeToFieldValue(testCase.executionTargetSnapshot.type)
                    );
                    if (typeValue) {
                        issue.fields['Execution Target Type'] = typeValue;
                    }
                }

                const targetRefField = issue.project.findFieldByName('Execution Target Reference');
                if (targetRefField) {
                    issue.fields['Execution Target Reference'] = testCase.executionTargetSnapshot.ref;
                }
            }
        } catch (error) {
            console.warn('Failed to set custom fields:', error);
        }
    }

    private mapExecutionTargetTypeToFieldValue(type: ExecutionTargetType): string {
        switch (type) {
            case ExecutionTargetType.GITLAB:
                return 'GitLab';
            case ExecutionTargetType.GITHUB:
                return 'GitHub';
            case ExecutionTargetType.MANUAL:
                return 'Manual';
            default:
                return 'Manual';
        }
    }

    private mapFieldValueToExecutionTargetType(fieldValue: string): ExecutionTargetType {
        switch (fieldValue) {
            case 'GitLab':
                return ExecutionTargetType.GITLAB;
            case 'GitHub':
                return ExecutionTargetType.GITHUB;
            case 'Manual':
                return ExecutionTargetType.MANUAL;
            default:
                return ExecutionTargetType.MANUAL;
        }
    }

    private mapIssueToTestCase(issue: any): TestCase {
        const extProps = issue.extensionProperties || {};
        // Use the human-readable issue ID (e.g., "TEST-123") as the test case ID
        const testCaseId = extProps.testCaseId || issue.idReadable || issue.id;
        
        // Get execution target from extension properties
        let executionTargetSnapshot: ExecutionTargetSnapshot | undefined;
        if (extProps.executionTargetId) {
            executionTargetSnapshot = new ExecutionTargetSnapshot(
                extProps.executionTargetId,
                extProps.executionTargetName || '',
                extProps.executionTargetType as ExecutionTargetType,
                extProps.executionTargetRef || ''
            );
        }
        
        return new TestCase(
            testCaseId,
            issue.summary || '',
            issue.description || '',
            executionTargetSnapshot
        );
    }
}

