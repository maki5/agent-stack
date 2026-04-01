---
name: three-layer-testing
description: Universal testing patterns for any tech stack — unit, integration, and E2E tests
tags:
  - testing
  - quality
license: MIT
compatibility: opencode
metadata:
  audience: all-developers
  category: testing
---

# Three-Layer Testing Skill

## What I Do

I help you write comprehensive tests across all layers of any project: unit/integration tests for backend/mobile logic, component tests for frontend/mobile UI, and end-to-end tests for full user journeys. Every test must include success, error, and edge cases — happy-path-only is unacceptable.

## When to Use Me

Use this skill when:
- Writing new tests for any layer
- Reviewing test coverage
- Debugging test failures
- Setting up test data
- Understanding testing patterns

## Testing Philosophy

> **Tests are not optional and must never be only happy-path.** Every test file must include success cases, error/failure cases, and edge cases. The goal is to catch bugs before they reach production.

### Coverage Requirements

| Layer | Minimum Test Cases | Required Cases |
|-------|-------------------|----------------|
| Backend unit (handler/controller) | 4+ | Success + Validation + Not Found + Auth Error |
| Backend unit (service) | 4+ | Success + Validation + Data Error + Business Rule |
| Frontend/mobile component | 4+ | Render + Interaction + Error State + Edge |
| E2E Flow | 2+ | Success Journey + Error/Edge Journey |

## How to Read Existing Test Patterns

**Before writing any tests**, examine the project's existing test files to understand:
1. Which test framework is in use (e.g. Go's `testing`, Jest, Vitest, JUnit, XCTest, etc.)
2. How mocks/stubs are set up
3. What file naming and directory conventions are followed
4. What selector attributes are used in UI tests (`data-testid`, `testID`, accessibility IDs, etc.)

```bash
# Find existing test files
# Look for patterns like *_test.go, *.test.ts, *Spec.swift, *Test.kt, test_*.py, etc.
```

## Layer 1: Logic/Unit Tests (Backend / Business Logic)

### Test Structure Pattern

Structure tests with clear Arrange / Act / Assert sections and multiple cases:

```
Test: <ComponentName>.<MethodName>

Cases:
- success: valid input returns expected output
- validation error: invalid input is rejected with appropriate error
- not found: missing resource returns appropriate "not found" error
- unauthorized: unauthenticated/unauthorized request is rejected (if auth required)
- edge case: boundary/empty input handled correctly
```

### Key Principles

- **Isolate dependencies** with mocks/stubs — unit tests must not hit real databases or external services
- **Table-driven or parameterized** patterns are preferred for covering multiple cases cleanly
- **Assert both the happy path and the failure modes** — test what the function returns on error, not just on success
- **Mock setup must match the expected inputs** — loose mocks that match any input hide bugs

### What to Test per Component Type

| Component | What to test |
|-----------|-------------|
| Handler/Controller | HTTP status codes, response body shape, auth enforcement |
| Service/Use Case | Business rule enforcement, error propagation, edge cases |
| Repository/Data Access | Query correctness, error mapping, transaction handling |
| Utility/Helper | Pure function correctness, boundary inputs |

## Layer 2: Component/UI Tests (Frontend / Mobile)

### Test Structure Pattern

```
Test: <ComponentName>

Cases:
- renders correctly with valid data
- renders loading state when data is loading
- renders error state when data fetch fails
- renders empty state when list is empty
- handles user interaction correctly (clicks, inputs, gestures)
```

### Key Principles

- **Use the project's established selector attributes** — read existing test files first to learn which attributes are used (`data-testid` for web React, `testID` for React Native, accessibility identifiers for native iOS/Android, etc.)
- **Mock API/service calls** — component tests must not hit real services
- **Test every distinct state** — loading, error, empty, populated
- **Test user interactions** — simulate clicks, form submissions, gestures as appropriate

### Selector Attribute Conventions (by platform)

| Platform | Attribute | Example |
|----------|-----------|---------|
| React (web) | `data-testid` | `data-testid="submit-btn"` |
| React Native | `testID` | `testID="submit-btn"` |
| Native Android | content description or tag | `contentDescription="submit"` |
| Native iOS (XCTest) | `accessibilityIdentifier` | `.accessibilityIdentifier("submit")` |

Always use the convention already established in the project — check existing test files.

## Layer 3: End-to-End Tests

### Test Structure Pattern

```
Test: <Feature> — <Scenario>

Cases:
- success journey: user completes the full happy-path flow
- error journey: user encounters an expected error and sees correct feedback
- edge case: boundary condition or unusual but valid flow
```

### Key Principles

- **Test complete user journeys** — not isolated actions
- **Use the project's E2E framework** — read `commands.e2e` from `.opencode/profile.json` and check the project's E2E directory for patterns
- **Seed/reset test data** appropriately before each test
- **Do not hardcode wait times** — use the framework's built-in waiting mechanisms
- **Test both success and error paths**

### What NOT to do in E2E tests

- Do not test implementation details — test what the user sees and can do
- Do not share state between parallel tests
- Do not use brittle CSS class selectors (prefer the project's established test selectors)

## Running Tests

Always read `commands` from `.opencode/profile.json` for the correct commands:

```bash
# Unit/integration tests
<commands.test>

# E2E tests (if commands.e2e is set)
<commands.e2e>
```

Do not guess or assume command names — always read them from the profile.

## Test Data Management

- Use **factories or builders** for test data to avoid copy-paste fixtures
- Clean up test data after tests that create persistent state
- Never use real production data in tests

## Quick Reference

```
Before writing tests:
1. Read profile.commands for test commands
2. Find 2-3 existing test files and study patterns
3. Note the mock/stub framework in use
4. Note the selector convention for UI tests

When writing tests:
1. Arrange: set up mocks, inputs, expected outputs
2. Act: call the function or render the component
3. Assert: check result, errors, side effects

Required cases (minimum):
- 1 success case
- 1 validation/input error case
- 1 "not found" or empty case
- 1 edge case (null, empty list, boundary value, etc.)
```
