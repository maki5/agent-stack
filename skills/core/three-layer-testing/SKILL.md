---
name: three-layer-testing
description: Testing patterns for all three layers - Go backend, React frontend, and Playwright E2E
tags:
  - testing
  - go
  - jest
  - playwright
  - quality
license: MIT
compatibility: opencode
metadata:
  audience: all-developers
  category: testing
---

# Three-Layer Testing Skill

## What I Do

I help you write comprehensive tests across all three layers: Go backend unit tests, React frontend tests, and Playwright E2E tests. Every test must include success, error, and edge cases — happy-path-only is unacceptable.

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
| Go Handler | 4+ | Success + Validation + Not Found + Error |
| Go Service | 4+ | Success + Validation + Database Error + Business Rule |
| React Component | 5+ | Render + Interaction + Success API + Error API + Edge |
| E2E Flow | 2+ | Success Journey + Error/Edge Journey |

## Layer 1: Backend Testing (Go)

### Test File Location

```
backend/internal/
├── handlers/
│   ├── rating_handler.go
│   └── rating_handler_test.go     # Same package
├── services/
│   ├── rating_service.go
│   └── rating_service_test.go
└── repository/
    ├── rating_repository.go
    └── rating_repository_test.go
```

### Table-Driven Test Pattern

```go
func TestRatingHandler_Create(t *testing.T) {
    tests := []struct {
        name       string
        input      string
        userID     int
        setupMocks func(*mocks.MockRatingService)
        wantStatus int
        wantBody   string
    }{
        {
            name:   "success - valid rating",
            input:  `{"workshop_id": 1, "score": 5, "comment": "Great service"}`,
            userID: 123,
            setupMocks: func(m *mocks.MockRatingService) {
                m.On("Create", mock.Anything, 123, mock.AnythingOfType("*models.CreateRatingInput")).
                    Return(&models.Rating{
                        ID: 1, WorkshopID: 1, UserID: 123, Score: 5, Comment: "Great service",
                    }, nil)
            },
            wantStatus: http.StatusCreated,
            wantBody:   `"score":5`,
        },
        {
            name:       "validation error - missing score",
            input:      `{"workshop_id": 1}`,
            userID:     123,
            setupMocks: func(m *mocks.MockRatingService) {},
            wantStatus: http.StatusBadRequest,
            wantBody:   `"error"`,
        },
        {
            name:       "validation error - score out of range",
            input:      `{"workshop_id": 1, "score": 10}`,
            userID:     123,
            setupMocks: func(m *mocks.MockRatingService) {},
            wantStatus: http.StatusBadRequest,
        },
        {
            name:   "workshop not found",
            input:  `{"workshop_id": 999, "score": 5}`,
            userID: 123,
            setupMocks: func(m *mocks.MockRatingService) {
                m.On("Create", mock.Anything, 123, mock.AnythingOfType("*models.CreateRatingInput")).
                    Return(nil, apperrors.NotFound("workshop not found"))
            },
            wantStatus: http.StatusNotFound,
        },
        {
            name:   "unauthorized - no user context",
            input:  `{"workshop_id": 1, "score": 5}`,
            userID: 0, // No user in context
            setupMocks: func(m *mocks.MockRatingService) {},
            wantStatus: http.StatusUnauthorized,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Arrange
            mockService := mocks.NewMockRatingService(t)
            tt.setupMocks(mockService)
            handler := NewRatingHandler(mockService)
            
            req := httptest.NewRequest(http.MethodPost, "/ratings", 
                bytes.NewBufferString(tt.input))
            req.Header.Set("Content-Type", "application/json")
            
            // Add user to context if needed
            if tt.userID > 0 {
                ctx := context.WithValue(req.Context(), middleware.UserIDKey, tt.userID)
                req = req.WithContext(ctx)
            }
            
            rr := httptest.NewRecorder()
            
            // Act
            handler.Create(rr, req)
            
            // Assert
            assert.Equal(t, tt.wantStatus, rr.Code)
            if tt.wantBody != "" {
                assert.Contains(t, rr.Body.String(), tt.wantBody)
            }
            mockService.AssertExpectations(t)
        })
    }
}
```

### Mock Setup with Mockery

```bash
# Generate mocks
make generate-mocks

# Use in tests
mockService := mocks.NewMockRatingService(t)
mockService.On("Create", mock.Anything, userID, mock.Anything).
    Return(&models.Rating{ID: 1}, nil)
```

### Service Test Pattern

```go
func TestRatingService_Create(t *testing.T) {
    tests := []struct {
        name    string
        userID  int
        input   *models.CreateRatingInput
        mockSetup func(*mocks.MockRatingRepository)
        wantErr error
    }{
        {
            name:   "success",
            userID: 123,
            input:  &models.CreateRatingInput{WorkshopID: 1, Score: 5},
            mockSetup: func(m *mocks.MockRatingRepository) {
                m.On("Create", mock.Anything, mock.AnythingOfType("*models.Rating")).
                    Return(nil)
            },
            wantErr: nil,
        },
        {
            name:   "database error",
            userID: 123,
            input:  &models.CreateRatingInput{WorkshopID: 1, Score: 5},
            mockSetup: func(m *mocks.MockRatingRepository) {
                m.On("Create", mock.Anything, mock.Anything).
                    Return(errors.New("connection refused"))
            },
            wantErr: apperrors.DatabaseError(errors.New("connection refused"), "create rating"),
        },
    }
    // ... test implementation
}
```

### Test Commands

```bash
# Run all backend tests
make test-backend

# Run with coverage
make test-coverage

# Run specific test
make test-backend -- -run TestRatingHandler_Create

# Run with verbose output
cd backend && go test -v ./...
```

## Layer 2: Frontend Testing (Jest + React Testing Library)

### Test File Location

```
web-frontend/
├── components/
│   ├── RatingCard.tsx
│   └── __tests__/
│       └── RatingCard.test.tsx   # Mirror structure
├── app/
│   └── workshop/
│       └── __tests__/
│           └── page.test.tsx
└── __tests__/                     # Or flat structure
    └── components/
        └── RatingCard.test.tsx
```

### Component Test Pattern

```typescript
// components/__tests__/RatingCard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RatingCard } from '../RatingCard';
import * as api from '../../services/api';

// Mock the API module
jest.mock('../../services/api');

describe('RatingCard', () => {
    const mockRating = {
        id: 1,
        score: 5,
        comment: 'Great service!',
        userName: 'John Doe',
        createdAt: '2024-01-15T10:00:00Z',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders rating information correctly', () => {
        // Success: Component displays data
        render(<RatingCard rating={mockRating} />);
        
        expect(screen.getByText('Great service!')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('★★★★★')).toBeInTheDocument(); // 5 stars
    });

    it('renders without comment', () => {
        // Edge: Missing optional data
        const ratingWithoutComment = { ...mockRating, comment: '' };
        render(<RatingCard rating={ratingWithoutComment} />);
        
        expect(screen.queryByTestId('comment')).not.toBeInTheDocument();
    });

    it('handles user interaction - hover effect', async () => {
        // Interaction: User hovers over card
        render(<RatingCard rating={mockRating} />);
        
        const card = screen.getByTestId('rating-card');
        await userEvent.hover(card);
        
        expect(card).toHaveClass('hover:shadow-lg');
    });

    it('renders loading state', () => {
        // Edge: Loading state
        render(<RatingCard rating={null} isLoading={true} />);
        
        expect(screen.getByTestId('rating-skeleton')).toBeInTheDocument();
    });

    it('renders error state', () => {
        // Error: Failed to load
        render(<RatingCard rating={null} error="Failed to load rating" />);
        
        expect(screen.getByText('Failed to load rating')).toBeInTheDocument();
    });

    it('calls onDelete when delete button clicked', async () => {
        // Interaction: User action
        const onDelete = jest.fn();
        render(<RatingCard rating={mockRating} onDelete={onDelete} />);
        
        const deleteBtn = screen.getByTestId('delete-rating-btn');
        await userEvent.click(deleteBtn);
        
        expect(onDelete).toHaveBeenCalledWith(1);
    });
});
```

### Page/Integration Test Pattern

```typescript
// app/workshop/__tests__/page.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import WorkshopPage from '../page';
import * as workshopService from '../../../services/workshopService';

jest.mock('../../../services/workshopService');

describe('WorkshopPage', () => {
    it('displays workshop details on successful load', async () => {
        // Success: API returns data
        const mockWorkshop = {
            id: 1,
            name: 'Best Auto Shop',
            rating: 4.5,
        };
        (workshopService.getWorkshop as jest.Mock).mockResolvedValue({
            data: mockWorkshop,
        });

        render(<WorkshopPage params={{ id: '1' }} />);

        await waitFor(() => {
            expect(screen.getByText('Best Auto Shop')).toBeInTheDocument();
        });
    });

    it('displays error message on API failure', async () => {
        // Error: API fails
        (workshopService.getWorkshop as jest.Mock).mockRejectedValue({
            message: 'Workshop not found',
        });

        render(<WorkshopPage params={{ id: '999' }} />);

        await waitFor(() => {
            expect(screen.getByText(/error/i)).toBeInTheDocument();
        });
    });

    it('displays loading state initially', () => {
        // Loading state
        (workshopService.getWorkshop as jest.Mock).mockImplementation(
            () => new Promise(() => {}) // Never resolves
        );

        render(<WorkshopPage params={{ id: '1' }} />);

        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
});
```

### Test Utilities

```typescript
// __tests__/utils/test-utils.tsx
import { render as rtlRender } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock query client for tests
const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    });

export function render(ui: React.ReactElement, options = {}) {
    const testQueryClient = createTestQueryClient();
    
    return rtlRender(
        <QueryClientProvider client={testQueryClient}>
            {ui}
        </QueryClientProvider>,
        options
    );
}
```

### Test Commands

```bash
# Run all frontend tests
make frontend-test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- RatingCard.test.tsx
```

## Layer 3: E2E Testing (Playwright)

### Test File Location

```
web-frontend/e2e/
├── booking-flow.spec.ts           # Feature-based
├── auth/
│   ├── login.spec.ts
│   └── registration.spec.ts
├── helpers/
│   ├── test-data.ts              # Test data factories
│   └── workflow.helpers.ts       # Reusable workflows
└── fixtures/
    └── users.json                # Test user data
```

### E2E Test Pattern

```typescript
// e2e/booking-flow.spec.ts
import { test, expect } from '@playwright/test';
import { createTestWorkshop, createTestUser } from './helpers/test-data';

test.describe('Booking Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Setup: Seed test data
        await page.goto('/');
    });

    test('user can create and complete a booking', async ({ page }) => {
        // Success Journey: Complete booking flow
        
        // 1. Login
        await page.goto('/login');
        await page.fill('[data-testid="email-input"]', 'user1@test.com');
        await page.fill('[data-testid="password-input"]', 'Bf109g6a/s');
        await page.click('[data-testid="login-button"]');
        
        await expect(page).toHaveURL('/dashboard');
        
        // 2. Create service request
        await page.click('[data-testid="new-request-btn"]');
        await page.selectOption('[data-testid="vehicle-select"]', '1');
        await page.fill('[data-testid="description-input"]', 'Engine noise');
        await page.click('[data-testid="submit-request-btn"]');
        
        await expect(page.locator('[data-testid="success-message"]')).
            toContainText('Request created');
        
        // 3. View request details
        const requestId = await page.locator('[data-testid="request-id"]').textContent();
        await page.goto(`/requests/${requestId}`);
        
        await expect(page.locator('[data-testid="request-status"]')).
            toContainText('pending');
    });

    test('shows error when submitting invalid request', async ({ page }) => {
        // Error Journey: Validation errors
        
        await page.goto('/login');
        await page.fill('[data-testid="email-input"]', 'user1@test.com');
        await page.fill('[data-testid="password-input"]', 'Bf109g6a/s');
        await page.click('[data-testid="login-button"]');
        
        // Try to submit without required fields
        await page.click('[data-testid="new-request-btn"]');
        await page.click('[data-testid="submit-request-btn"]');
        
        await expect(page.locator('[data-testid="vehicle-error"]')).
            toContainText('Vehicle is required');
        await expect(page.locator('[data-testid="description-error"]')).
            toContainText('Description is required');
    });

    test('handles concurrent booking attempts', async ({ browser }) => {
        // Edge Case: Concurrent operations
        
        const user1Context = await browser.newContext();
        const user2Context = await browser.newContext();
        
        const page1 = await user1Context.newPage();
        const page2 = await user2Context.newPage();
        
        // Both users try to book same slot
        // ... implementation
    });
});
```

### Serial Test Pattern (Lifecycle Tests)

```typescript
// e2e/workshop-lifecycle.spec.ts
import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Workshop Lifecycle', () => {
    let workshopId: string;

    test('create workshop', async ({ page }) => {
        // Step 1: Create
        await page.goto('/workshops/new');
        await page.fill('[data-testid="name-input"]', 'Test Auto Shop');
        await page.fill('[data-testid="address-input"]', '123 Main St');
        await page.click('[data-testid="submit-btn"]');
        
        workshopId = await page.locator('[data-testid="workshop-id"]').textContent();
        await expect(page).toHaveURL(`/workshops/${workshopId}`);
    });

    test('update workshop', async ({ page }) => {
        // Step 2: Update (depends on create)
        await page.goto(`/workshops/${workshopId}/edit`);
        await page.fill('[data-testid="name-input"]', 'Updated Auto Shop');
        await page.click('[data-testid="save-btn"]');
        
        await expect(page.locator('[data-testid="workshop-name"]')).
            toContainText('Updated Auto Shop');
    });

    test('delete workshop', async ({ page }) => {
        // Step 3: Delete (depends on create)
        await page.goto(`/workshops/${workshopId}`);
        await page.click('[data-testid="delete-btn"]');
        await page.click('[data-testid="confirm-delete-btn"]');
        
        await expect(page).toHaveURL('/workshops');
        await expect(page.locator(`[data-testid="workshop-${workshopId}"]`)).
            not.toBeVisible();
    });
});
```

### Test Helpers

```typescript
// e2e/helpers/test-data.ts
export const TEST_CREDENTIALS = {
    user: {
        email: 'user1@test.com',
        password: 'Bf109g6a/s',
    },
    workshop: {
        email: 'testws@test.com',
        password: 'Test123!',
    },
};

export async function loginAsUser(page: Page) {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.user.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.user.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
}

export async function createTestWorkshop(page: Page, name: string) {
    await page.goto('/workshops/new');
    await page.fill('[data-testid="name-input"]', name);
    // ... fill other fields
    await page.click('[data-testid="submit-btn"]');
    return page.locator('[data-testid="workshop-id"]').textContent();
}
```

### Test Commands

```bash
# Run all E2E tests
make e2e

# Run in headed mode (visible browser)
make e2e-headed

# Open Playwright UI
make e2e-ui

# Run smoke tests only
make e2e-smoke

# View test report
make e2e-report

# Seed test data
make e2e-seed
```

### E2E Best Practices

✅ **DO:**
- Use `data-testid` attributes for selectors
- Test complete user journeys
- Clean up test data after tests
- Use helper functions for common operations
- Test both success and error paths

❌ **DON'T:**
- Use CSS class selectors (brittle)
- Hardcode wait times (use `waitFor` instead)
- Test implementation details
- Share state between parallel tests

## Smoke Checks (CI/CD)

After deployment, run smoke checks:

```bash
# CI runs these automatically
bash scripts/smoke/run.sh

# Manual smoke check
curl -sf http://localhost:3000/health
curl -sf http://localhost:3001/api/v1/health
```

**Update endpoint list when adding public GET endpoints:**
`scripts/smoke/get_endpoints.json`

## Quick Reference

```bash
# Backend
make test-backend                    # Run Go tests
cd backend && go test -v ./...       # Verbose

# Frontend
make frontend-test                   # Run Jest tests
npm test -- --watch                  # Watch mode

# E2E
make e2e                             # Run Playwright
make e2e-headed                      # Visible browser
make dev-suite && make e2e           # Full local run

# All layers
make test                            # Backend + Frontend unit tests
make validate-full                   # All tests + E2E
```
