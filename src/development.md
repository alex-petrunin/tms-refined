## Formula
- Architecture first.
- Vertical slice second - finished end-to-end user flow within all layers.
- Infrastructure last.

## Realistic roadmap
1. Design Domain Model + Application Services + Ports
2. Implement core domain logic + application services + in-memory ports
3. Implement persistence adapters (YouTrack)
4. Implement CI integration adapters (GitLab CI first)
5. Implement incoming results adapters (Webhook first)
6. Implement UI (Test Suite management + Run Trigger + Results view)

## Development principles
- Follow the architecture.
- Write tests for domain logic and application services.
- Mock ports in application service tests.
- Use in-memory implementations of ports for manual end-to-end testing.
- Use feature branches and pull requests for code reviews.
- Continuously integrate and deploy to staging environment.
- Document architecture decisions and code usage.

## Vertical slices
### Template:
**User story:** As a user, I want to ___ so that ___.

Flow:
1. User action
1. Application use case
1. Domain change
1. Infrastructure interaction
1. Observable result

Out of scope:
- X
- Y
- Z

### Slice 1: Create Test Suite
### Slice 2: Update Test Suite composition
### Slice 3: Create Test Case
### Slice 4: Run selected Test Cases
### Slice 5: Handle execution results callback
TBU