import { describe, it, expect, beforeEach } from 'vitest';
import { CIAdapterFactory, CIAdapterConfig } from '@infra/adapters/CIAdapterFactory';
import { ExecutionTargetSnapshot } from '@domain/valueObjects/ExecutionTarget';
import { ExecutionTargetType } from '@domain/enums/ExecutionTargetType';
import { GitLabExecutionAdapter } from '@infra/adapters/GitLabExecutionAdapter';
import { GitHubExecutionAdapter } from '@infra/adapters/GitHubExecutionAdapter';
import { ManualExecutionAdapter } from '@infra/adapters/ManualExecutionAdapter';
import { ExecutionTriggerPort } from '@app/ports/ExecutionTriggerPort';
import { createExecutionTargetSnapshot } from '../utils/test-factories';

describe('CIAdapterFactory', () => {
    let config: CIAdapterConfig;
    let factory: CIAdapterFactory;

    beforeEach(() => {
        config = {
            gitlab: {
                baseUrl: 'https://gitlab.com',
                apiToken: 'gitlab-token',
                projectId: '12345',
            },
            github: {
                apiToken: 'github-token',
                owner: 'test-owner',
                repo: 'test-repo',
            },
        };
        factory = new CIAdapterFactory(config);
    });

    describe('createAdapter', () => {
        it('should create GitLab adapter for GITLAB execution target', () => {
            const executionTarget = createExecutionTargetSnapshot({
                type: ExecutionTargetType.GITLAB,
            });

            const adapter = factory.createAdapter(executionTarget);

            expect(adapter).toBeInstanceOf(GitLabExecutionAdapter);
        });

        it('should create GitHub adapter for GITHUB execution target', () => {
            const executionTarget = createExecutionTargetSnapshot({
                type: ExecutionTargetType.GITHUB,
            });

            const adapter = factory.createAdapter(executionTarget);

            expect(adapter).toBeInstanceOf(GitHubExecutionAdapter);
        });

        it('should create Manual adapter for MANUAL execution target', () => {
            const executionTarget = createExecutionTargetSnapshot({
                type: ExecutionTargetType.MANUAL,
            });

            const adapter = factory.createAdapter(executionTarget);

            expect(adapter).toBeInstanceOf(ManualExecutionAdapter);
        });

        it('should throw error if GitLab config is missing for GITLAB target', () => {
            const factoryWithoutGitLab = new CIAdapterFactory({
                github: config.github,
            });

            const executionTarget = createExecutionTargetSnapshot({
                type: ExecutionTargetType.GITLAB,
            });

            expect(() => {
                factoryWithoutGitLab.createAdapter(executionTarget);
            }).toThrow('GitLab configuration is required');
        });

        it('should throw error if GitHub config is missing for GITHUB target', () => {
            const factoryWithoutGitHub = new CIAdapterFactory({
                gitlab: config.gitlab,
            });

            const executionTarget = createExecutionTargetSnapshot({
                type: ExecutionTargetType.GITHUB,
            });

            expect(() => {
                factoryWithoutGitHub.createAdapter(executionTarget);
            }).toThrow('GitHub configuration is required');
        });

        it('should throw error for unsupported execution target type', () => {
            const executionTarget = createExecutionTargetSnapshot({
                type: 'UNSUPPORTED' as ExecutionTargetType,
            });

            expect(() => {
                factory.createAdapter(executionTarget);
            }).toThrow('Unsupported execution target type');
        });
    });

    describe('canCreateAdapter', () => {
        it('should return true for GITLAB when config exists', () => {
            expect(factory.canCreateAdapter(ExecutionTargetType.GITLAB)).toBe(true);
        });

        it('should return false for GITLAB when config is missing', () => {
            const factoryWithoutGitLab = new CIAdapterFactory({
                github: config.github,
            });
            expect(factoryWithoutGitLab.canCreateAdapter(ExecutionTargetType.GITLAB)).toBe(false);
        });

        it('should return true for GITHUB when config exists', () => {
            expect(factory.canCreateAdapter(ExecutionTargetType.GITHUB)).toBe(true);
        });

        it('should return false for GITHUB when config is missing', () => {
            const factoryWithoutGitHub = new CIAdapterFactory({
                gitlab: config.gitlab,
            });
            expect(factoryWithoutGitHub.canCreateAdapter(ExecutionTargetType.GITHUB)).toBe(false);
        });

        it('should return true for MANUAL (always available)', () => {
            const emptyFactory = new CIAdapterFactory({});
            expect(emptyFactory.canCreateAdapter(ExecutionTargetType.MANUAL)).toBe(true);
        });

        it('should return false for unsupported types', () => {
            expect(factory.canCreateAdapter('UNSUPPORTED' as ExecutionTargetType)).toBe(false);
        });
    });
});

