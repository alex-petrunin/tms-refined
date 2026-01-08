import { describe, it, expect } from 'vitest';
import {
    ExecutionTargetSnapshot,
    GitLabExecutionConfig,
    GitHubExecutionConfig,
    ManualExecutionConfig
} from '../../src/backend/domain/valueObjects/ExecutionTarget';
import { ExecutionTargetType } from '../../src/backend/domain/enums/ExecutionTargetType';

describe('ExecutionTargetSnapshot', () => {
    describe('fingerprint', () => {
        it('should generate deterministic fingerprint based on content', () => {
            const config: GitLabExecutionConfig = { ref: 'main' };
            const target1 = new ExecutionTargetSnapshot(
                'integration-1',
                'GitLab Main',
                ExecutionTargetType.GITLAB,
                config
            );
            const target2 = new ExecutionTargetSnapshot(
                'integration-1',
                'GitLab Main',
                ExecutionTargetType.GITLAB,
                config
            );

            expect(target1.fingerprint()).toBe(target2.fingerprint());
        });

        it('should generate different fingerprints for different configs', () => {
            const target1 = new ExecutionTargetSnapshot(
                'integration-1',
                'GitLab Main',
                ExecutionTargetType.GITLAB,
                { ref: 'main' } as GitLabExecutionConfig
            );
            const target2 = new ExecutionTargetSnapshot(
                'integration-1',
                'GitLab Develop',
                ExecutionTargetType.GITLAB,
                { ref: 'develop' } as GitLabExecutionConfig
            );

            expect(target1.fingerprint()).not.toBe(target2.fingerprint());
        });

        it('should generate different fingerprints for different integrations', () => {
            const config: GitLabExecutionConfig = { ref: 'main' };
            const target1 = new ExecutionTargetSnapshot(
                'integration-1',
                'GitLab 1',
                ExecutionTargetType.GITLAB,
                config
            );
            const target2 = new ExecutionTargetSnapshot(
                'integration-2',
                'GitLab 2',
                ExecutionTargetType.GITLAB,
                config
            );

            expect(target1.fingerprint()).not.toBe(target2.fingerprint());
        });
    });

    describe('asGitLabConfig', () => {
        it('should return GitLab config for GitLab targets', () => {
            const config: GitLabExecutionConfig = { ref: 'main' };
            const target = new ExecutionTargetSnapshot(
                'integration-1',
                'GitLab Main',
                ExecutionTargetType.GITLAB,
                config
            );

            const gitlabConfig = target.asGitLabConfig();
            expect(gitlabConfig).toEqual({ ref: 'main' });
        });

        it('should return null for non-GitLab targets', () => {
            const config: GitHubExecutionConfig = { workflowFile: 'ci.yml' };
            const target = new ExecutionTargetSnapshot(
                'integration-1',
                'GitHub CI',
                ExecutionTargetType.GITHUB,
                config
            );

            expect(target.asGitLabConfig()).toBeNull();
        });

        it('should handle legacy ref field', () => {
            const target = new ExecutionTargetSnapshot(
                'integration-1',
                'GitLab Main',
                ExecutionTargetType.GITLAB,
                {} as any, // No config
                'main' // Legacy ref
            );

            const gitlabConfig = target.asGitLabConfig();
            expect(gitlabConfig).toEqual({ ref: 'main' });
        });
    });

    describe('asGitHubConfig', () => {
        it('should return GitHub config for GitHub targets', () => {
            const config: GitHubExecutionConfig = { 
                workflowFile: 'ci.yml',
                ref: 'main'
            };
            const target = new ExecutionTargetSnapshot(
                'integration-1',
                'GitHub CI',
                ExecutionTargetType.GITHUB,
                config
            );

            const githubConfig = target.asGitHubConfig();
            expect(githubConfig).toEqual({ workflowFile: 'ci.yml', ref: 'main' });
        });

        it('should return null for non-GitHub targets', () => {
            const config: GitLabExecutionConfig = { ref: 'main' };
            const target = new ExecutionTargetSnapshot(
                'integration-1',
                'GitLab Main',
                ExecutionTargetType.GITLAB,
                config
            );

            expect(target.asGitHubConfig()).toBeNull();
        });

        it('should handle legacy ref field with workflow:branch format', () => {
            const target = new ExecutionTargetSnapshot(
                'integration-1',
                'GitHub CI',
                ExecutionTargetType.GITHUB,
                {} as any, // No config
                'ci.yml:main' // Legacy ref
            );

            const githubConfig = target.asGitHubConfig();
            expect(githubConfig).toEqual({ workflowFile: 'ci.yml', ref: 'main' });
        });
    });

    describe('asManualConfig', () => {
        it('should return empty config for manual targets', () => {
            const config: ManualExecutionConfig = {};
            const target = new ExecutionTargetSnapshot(
                'integration-1',
                'Manual',
                ExecutionTargetType.MANUAL,
                config
            );

            const manualConfig = target.asManualConfig();
            expect(manualConfig).toEqual({});
        });

        it('should return null for non-manual targets', () => {
            const config: GitLabExecutionConfig = { ref: 'main' };
            const target = new ExecutionTargetSnapshot(
                'integration-1',
                'GitLab Main',
                ExecutionTargetType.GITLAB,
                config
            );

            expect(target.asManualConfig()).toBeNull();
        });
    });
});

