# Test management system

A test management system is a software application designed to help teams plan, execute, and track testing activities throughout the software development lifecycle. It provides a centralized platform for managing test cases, test suits, test runs, and reporting.

# Domain

### Language
1. Test Case - Entity
2. Test Suite - Entity
3. Test Run - Entity
---
4. Execution Target - Value Object -- execution details
5. Execution Mode - Value Object   -- who controls the execution (we manage or we only observe)
6. Test Status - Value Object
---
### Aggregates
1. Test Suite Aggregate
   - Root: Test Suite
   - References: Test Case IDs
2. Test Case Aggregate
   - Root: Test Case
   - VO: Execution Target
   - VO: Execution Mode (keep in application?)
3. Test Run Aggregate
   - Root: Test Run
   - References: Test Case IDs
   - VO: Execution Target (snapshot of Test Case Execution Target at the time of the run)
   - VO: Test Status


# Application
## Commands (write side)
**Mental model:** User action → App use case → Load Aggregate(s) → Invoke Domain Logic → Persist Aggregate(s) → Call Infrastructure Services (if needed) → Return result to User

1. Create Test Case
   - Input: Test Case details
   - Process: Create Test Case Aggregate → persist
   - Output: Test Case reference (ID, opaque domain reference)
1. Create Test Suite
   - Input: Test Suite details, list of Test Case IDs
   - Process: Create/Update Test Suite Aggregate → persist
   - Output: Test Suite ID
1. Update Test Suite metadata
   - Input: Test Suite ID, updated details
   - Process: Load Test Suite Aggregate → update metadata → persist
   - Output: Success/Failure
2. Update Test Suite composition
   - Input: Test Suite ID, list of Test Case IDs
   - Process: Load Test Suite Aggregate → update Test Case references → persist
   - Output: Success/Failure
3. Select 1 or more Test Cases and click "Run" ⭐️
   - Input: list of Test Case IDs
   - Process: 
      - Load Test Case Aggregates → group by Execution Target
      - For each Execution Target group, create Test Run Aggregate, snapshot Execution Target, fix Test Cases list → persist
      - Depending on Execution Mode:
         - If "we manage" → trigger Test Execution Service (infrastructure) with Test Run ID
         - If "we observe" → skip invocation, mark Test Run as "AwaitingExternalResults"
   - Output: Test Run ID(s)


5. Handle execution results callback (from Test Execution Service) ⭐️
   - Input: External signal(Webhook payload / manual / polling) with Test Run ID and results
   - Process: Load relevant Aggregates → compile status/history report
   - Output: Status/History report

## Queries (read side)
6. Get Test Run status 
7. Get Test Suite history
8. TBU

## Transaction / Unit of Work Boundaries
Persist domain facts inside the Unit of Work, trigger side effects outside of it.
1. Create Test Case
1. Create Test Suite
1. Update Test Suite metadata
1. Update Test Suite composition
1. Run Test Cases (per Execution Target group)
1. Handle execution results callback

**Important:** CI call is outside of transaction boundary.

## Error handling strategy
Errors should move the system to a known state,
not crash it out of consistency.
### Domain errors (expected, store as status/cause)
- Errors: invariant violations, not found, invalid input, etc.

- Strategy: UI feedback, no retries
### Application errors (expected, store as log/audit)
- Errors: idempotency violation, not able to call infrastructure, etc.

- Strategy: safe fail, log as INFO or WARN
### Infrastructure errors (unexpected)
- Errors: CI timeout, network issues, DB down, etc.

- Strategy: isolate, turn into domain state, retry or compensate
## Idempotency strategy (application concern)
Doubled calls of a use case should not lead to inconsistent state of domain facts.

1. Run Test Cases
   - Create Test Run(s) only once per unique combination (hash) of sorted Test Case IDs + Execution Target + timestamp
   - If called again with the same parameters, return existing Test Run ID(s)
2. Handle execution results callback
   - Every incoming result has unique external ID
   - If called again with the same external ID, ignore processing


## Ports to infrastructure (contracts, what system needs)
1. TestCaseRepository
1. TestSuiteRepository
1. TestRunRepository
1. ExecutionTriggerPort
1. ExecutionResultPort

# Infrastructure
## Adapters = implementations of ports
### Persistence adapters (for Repositories)
1. TestCaseRepository  → YouTrack Issue
2. TestSuiteRepository → YouTrack Custom Fields
3. TestRunRepository   → YouTrack Issue + links + Custom Fields
### CI Integration adapters (for ExecutionTriggerPort)
**Mental model:** accept a Test Run → trigger execution in external CI system → return acknowledgment(execution id)
1. GitLab CI Adapter
1. GitHub Actions Adapter
1. TeamCity Adapter
1. Manual Adapter
### Incoming results adapters (for ExecutionResultPort)
**Mental model:** accept external signal → parse and map to Domain → call Application service to handle results
1. Webhook Adapter
1. Polling Adapter
1. Manual Result Adapter (UI)

```sql
User clicks "Run"
   ↓
Application Use Case
   ↓
ExecutionTriggerPort
   ↓
CI Adapter (GitLab / GH / Manual)
   ↓
External CI

External CI finishes
   ↓
Webhook Adapter
   ↓
ExecutionResultPort
   ↓
Application Use Case
   ↓
Test Run updated

```

### Configuration/Registry adapter
- what CI systems are available
- mapping of Execution Target to CI system and details
- which adapters are enabled

### Secrets/credentials adapter
- store and retrieve credentials/tokens for CI systems

### Mapping layer -- lives inside adapters
- Map Domain entities/VOs to Infrastructure representations (e.g., YouTrack Issue, GitLab Pipeline, etc.)
- Make actual mapper classes per entity/VO and infrastructure type
  - persistence mappers
  - CI mappers
  - error mappers

Parked for future:
- YouTrackPersistenceAdapter
- GitLabExecutionAdapter
- GitHubExecutionAdapter
- ManualExecutionAdapter
- WebhookResultAdapter