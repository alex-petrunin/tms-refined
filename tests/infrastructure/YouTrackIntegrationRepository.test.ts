import { describe, it, expect, beforeEach, vi } from 'vitest';
import { YouTrackIntegrationRepository } from '../../src/backend/infrastructure/adapters/YouTrackIntegrationRepository';
import { ExecutionTargetType } from '../../src/backend/domain/enums/ExecutionTargetType';

// Mock YouTrack scripting API
const mockProject = {
    extensionProperties: {
        integrations: ''
    }
};

const mockEntities = {
    Project: {
        findByKey: vi.fn(() => mockProject)
    }
};

vi.mock('@jetbrains/youtrack-scripting-api/entities', () => mockEntities);

describe('YouTrackIntegrationRepository', () => {
    let repository: YouTrackIntegrationRepository;

    beforeEach(() => {
        repository = new YouTrackIntegrationRepository();
        // Reset mock
        mockProject.extensionProperties.integrations = '';
        mockEntities.Project.findByKey = vi.fn(() => mockProject);
    });

    describe('findById', () => {
        it('should find integration by ID', async () => {
            const integrations = [
                {
                    id: 'int-1',
                    name: 'GitLab Main',
                    type: 'GITLAB',
                    enabled: true,
                    isDefault: true,
                    config: { baseUrl: 'https://gitlab.com', token: 'token123', projectId: 'project-1' }
                }
            ];
            mockProject.extensionProperties.integrations = JSON.stringify(integrations);

            const result = await repository.findById('int-1', 'TEST-PROJECT');

            expect(result).toBeDefined();
            expect(result?.id).toBe('int-1');
            expect(result?.name).toBe('GitLab Main');
            expect(result?.type).toBe(ExecutionTargetType.GITLAB);
        });

        it('should return null if integration not found', async () => {
            mockProject.extensionProperties.integrations = JSON.stringify([]);

            const result = await repository.findById('non-existent', 'TEST-PROJECT');

            expect(result).toBeNull();
        });

        it('should handle missing isDefault field (backward compatibility)', async () => {
            const integrations = [
                {
                    id: 'int-1',
                    name: 'GitLab Main',
                    type: 'GITLAB',
                    enabled: true,
                    // isDefault is missing
                    config: { baseUrl: 'https://gitlab.com', token: 'token123', projectId: 'project-1' }
                }
            ];
            mockProject.extensionProperties.integrations = JSON.stringify(integrations);

            const result = await repository.findById('int-1', 'TEST-PROJECT');

            expect(result).toBeDefined();
            expect(result?.isDefault).toBe(false); // Should default to false
        });
    });

    describe('findByType', () => {
        it('should find all integrations of a specific type', async () => {
            const integrations = [
                {
                    id: 'int-1',
                    name: 'GitLab Main',
                    type: 'GITLAB',
                    enabled: true,
                    isDefault: true,
                    config: {}
                },
                {
                    id: 'int-2',
                    name: 'GitHub Main',
                    type: 'GITHUB',
                    enabled: true,
                    isDefault: false,
                    config: {}
                },
                {
                    id: 'int-3',
                    name: 'GitLab Test',
                    type: 'GITLAB',
                    enabled: true,
                    isDefault: false,
                    config: {}
                }
            ];
            mockProject.extensionProperties.integrations = JSON.stringify(integrations);

            const result = await repository.findByType(ExecutionTargetType.GITLAB, 'TEST-PROJECT');

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('GitLab Main');
            expect(result[1].name).toBe('GitLab Test');
        });

        it('should return empty array if no integrations of type found', async () => {
            mockProject.extensionProperties.integrations = JSON.stringify([]);

            const result = await repository.findByType(ExecutionTargetType.GITLAB, 'TEST-PROJECT');

            expect(result).toEqual([]);
        });
    });

    describe('findDefaultByType', () => {
        it('should find the default integration for a type', async () => {
            const integrations = [
                {
                    id: 'int-1',
                    name: 'GitLab Main',
                    type: 'GITLAB',
                    enabled: true,
                    isDefault: true,
                    config: {}
                },
                {
                    id: 'int-2',
                    name: 'GitLab Test',
                    type: 'GITLAB',
                    enabled: true,
                    isDefault: false,
                    config: {}
                }
            ];
            mockProject.extensionProperties.integrations = JSON.stringify(integrations);

            const result = await repository.findDefaultByType(ExecutionTargetType.GITLAB, 'TEST-PROJECT');

            expect(result).toBeDefined();
            expect(result?.id).toBe('int-1');
            expect(result?.isDefault).toBe(true);
        });

        it('should return null if no default integration exists', async () => {
            const integrations = [
                {
                    id: 'int-1',
                    name: 'GitLab Main',
                    type: 'GITLAB',
                    enabled: true,
                    isDefault: false,
                    config: {}
                }
            ];
            mockProject.extensionProperties.integrations = JSON.stringify(integrations);

            const result = await repository.findDefaultByType(ExecutionTargetType.GITLAB, 'TEST-PROJECT');

            expect(result).toBeNull();
        });

        it('should ignore disabled integrations', async () => {
            const integrations = [
                {
                    id: 'int-1',
                    name: 'GitLab Main',
                    type: 'GITLAB',
                    enabled: false,
                    isDefault: true,
                    config: {}
                }
            ];
            mockProject.extensionProperties.integrations = JSON.stringify(integrations);

            const result = await repository.findDefaultByType(ExecutionTargetType.GITLAB, 'TEST-PROJECT');

            expect(result).toBeNull(); // Disabled integrations should be ignored
        });
    });

    describe('config mapping', () => {
        it('should map baseUrl from projectUrl (backward compatibility)', async () => {
            const integrations = [
                {
                    id: 'int-1',
                    name: 'GitLab Main',
                    type: 'GITLAB',
                    enabled: true,
                    isDefault: false,
                    config: {
                        projectUrl: 'https://gitlab.company.com' // Legacy field name
                    }
                }
            ];
            mockProject.extensionProperties.integrations = JSON.stringify(integrations);

            const result = await repository.findById('int-1', 'TEST-PROJECT');

            expect(result?.config.baseUrl).toBe('https://gitlab.company.com');
        });

        it('should map projectId from pipelineRef (backward compatibility)', async () => {
            const integrations = [
                {
                    id: 'int-1',
                    name: 'GitLab Main',
                    type: 'GITLAB',
                    enabled: true,
                    isDefault: false,
                    config: {
                        pipelineRef: 'project-123' // Legacy field name
                    }
                }
            ];
            mockProject.extensionProperties.integrations = JSON.stringify(integrations);

            const result = await repository.findById('int-1', 'TEST-PROJECT');

            expect(result?.config.projectId).toBe('project-123');
        });
    });
});

