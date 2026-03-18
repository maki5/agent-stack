---
name: go-backend-patterns
description: Go backend architecture patterns - Handler, Service, Repository layers with error handling and testing
tags:
  - go
  - backend
  - architecture
license: MIT
compatibility: opencode
metadata:
  audience: backend-developers
  category: patterns
---

# Go Backend Patterns Skill

## What I Do

I help you implement consistent Go backend code following the Handler → Service → Repository pattern with proper error handling, testing, and swagger documentation.

## When to Use Me

Use this skill when:
- Adding a new API endpoint
- Implementing business logic
- Creating data access layers
- Writing backend tests
- Handling errors consistently

## Architecture Overview

### Three-Layer Pattern

```
HTTP Request → Handler → Service → Repository → Database
                    ↑
              Business Logic
                    ↓
HTTP Response ← Handler ← Service ← Repository ← Database
```

### Layer Responsibilities

#### 1. Handler (`internal/handlers/`)
- HTTP layer - handles request/response
- Extract auth from context
- Parse and validate input
- Call service methods
- Return formatted responses

#### 2. Service (`internal/services/`)
- Business logic layer
- Orchestrate repository calls
- Apply business rules
- Return typed results or errors

#### 3. Repository (`internal/repository/`)
- Data access layer
- SQL queries with pgx
- Return domain models
- Handle database errors

## Adding a New Endpoint

### Step-by-Step Process

```
1. Model       → internal/models/
2. Repository  → internal/repository/
3. Service     → internal/services/
4. Handler     → internal/handlers/
5. Routes      → cmd/server/main.go
6. Mocks       → make generate-mocks
7. Tests       → *_test.go
8. Swagger     → make swagger
```

### Step 1: Define Model

```go
// internal/models/rating.go
package models

import "time"

type Rating struct {
    ID          int       `json:"id"`
    WorkshopID  int       `json:"workshop_id"`
    UserID      int       `json:"user_id"`
    Score       int       `json:"score"`
    Comment     string    `json:"comment"`
    CreatedAt   time.Time `json:"created_at"`
}

type CreateRatingInput struct {
    WorkshopID int    `json:"workshop_id" validate:"required"`
    Score      int    `json:"score" validate:"required,min=1,max=5"`
    Comment    string `json:"comment" validate:"max=500"`
}
```

### Step 2: Create Repository

```go
// internal/repository/rating_repository.go
package repository

import (
    "context"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/smartgarage/backend/internal/models"
    apperrors "github.com/smartgarage/backend/internal/errors"
)

type RatingRepository interface {
    Create(ctx context.Context, rating *models.Rating) error
    GetByWorkshopID(ctx context.Context, workshopID int) ([]models.Rating, error)
    GetAverageScore(ctx context.Context, workshopID int) (float64, error)
}

type ratingRepository struct {
    db *pgxpool.Pool
}

func NewRatingRepository(db *pgxpool.Pool) RatingRepository {
    return &ratingRepository{db: db}
}

func (r *ratingRepository) Create(ctx context.Context, rating *models.Rating) error {
    query := `
        INSERT INTO ratings (workshop_id, user_id, score, comment, created_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
    `
    // Use parameterized queries - NEVER string interpolation
    err := r.db.QueryRow(ctx, query,
        rating.WorkshopID,
        rating.UserID,
        rating.Score,
        rating.Comment,
        rating.CreatedAt,
    ).Scan(&rating.ID)
    
    if err != nil {
        return apperrors.DatabaseError(err, "create rating")
    }
    return nil
}
```

### Step 3: Create Service

```go
// internal/services/rating_service.go
package services

import (
    "context"
    "time"
    "github.com/smartgarage/backend/internal/models"
    "github.com/smartgarage/backend/internal/repository"
    apperrors "github.com/smartgarage/backend/internal/errors"
)

type RatingService interface {
    Create(ctx context.Context, userID int, input *models.CreateRatingInput) (*models.Rating, error)
    GetWorkshopRatings(ctx context.Context, workshopID int) ([]models.Rating, error)
}

type ratingService struct {
    repo repository.RatingRepository
}

func NewRatingService(repo repository.RatingRepository) RatingService {
    return &ratingService{repo: repo}
}

func (s *ratingService) Create(ctx context.Context, userID int, input *models.CreateRatingInput) (*models.Rating, error) {
    // Business logic: Check if user has completed booking with workshop
    // (omitted for brevity)
    
    rating := &models.Rating{
        WorkshopID: input.WorkshopID,
        UserID:     userID,
        Score:      input.Score,
        Comment:    input.Comment,
        CreatedAt:  time.Now(),
    }
    
    if err := s.repo.Create(ctx, rating); err != nil {
        return nil, err // Pass through repository errors
    }
    
    return rating, nil
}
```

### Step 4: Create Handler

```go
// internal/handlers/rating_handler.go
package handlers

import (
    "encoding/json"
    "net/http"
    "github.com/go-chi/chi/v5"
    "github.com/go-playground/validator/v10"
    "github.com/smartgarage/backend/internal/middleware"
    "github.com/smartgarage/backend/internal/models"
    "github.com/smartgarage/backend/internal/response"
    "github.com/smartgarage/backend/internal/services"
)

type RatingHandler struct {
    service   services.RatingService
    validate  *validator.Validate
}

func NewRatingHandler(service services.RatingService) *RatingHandler {
    return &RatingHandler{
        service:  service,
        validate: validator.New(),
    }
}

// @Summary     Create rating
// @Description Create a new rating for a workshop
// @Tags        ratings
// @Accept      json
// @Produce     json
// @Param       input body models.CreateRatingInput true "Rating data"
// @Success     201 {object} response.APIResponse{data=models.Rating}
// @Failure     400 {object} response.APIResponse
// @Failure     401 {object} response.APIResponse
// @Router      /ratings [post]
// @Security    BearerAuth
func (h *RatingHandler) Create(w http.ResponseWriter, r *http.Request) {
    // 1. Extract user ID from context
    userID, err := middleware.GetUserID(r)
    if err != nil {
        response.Error(w, apperrors.Unauthorized("unauthorized"), "Create")
        return
    }
    
    // 2. Parse input
    var input models.CreateRatingInput
    if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
        response.SafeBadRequest(w, "invalid JSON")
        return
    }
    
    // 3. Validate input
    if err := h.validate.Struct(input); err != nil {
        response.SafeBadRequest(w, err.Error())
        return
    }
    
    // 4. Call service
    rating, err := h.service.Create(r.Context(), userID, &input)
    if err != nil {
        response.Error(w, err, "Create")
        return
    }
    
    // 5. Return response
    response.Created(w, rating)
}
```

### Step 5: Register Routes

```go
// cmd/server/main.go
func setupRoutes(r *chi.Mux, db *pgxpool.Pool) {
    // ... other routes
    
    ratingRepo := repository.NewRatingRepository(db)
    ratingService := services.NewRatingService(ratingRepo)
    ratingHandler := handlers.NewRatingHandler(ratingService)
    
    r.Route("/api/v1", func(r chi.Router) {
        r.Route("/ratings", func(r chi.Router) {
            r.Use(middleware.AuthMiddleware)
            r.Post("/", ratingHandler.Create)
            r.Get("/workshop/{id}", ratingHandler.GetByWorkshop)
        })
    })
}
```

### Step 6-8: Generate Mocks, Tests, Swagger

```bash
# 6. Generate mocks
make generate-mocks

# 7. Write tests (see Testing section below)
# internal/handlers/rating_handler_test.go

# 8. Generate swagger docs
make swagger
```

## Error Handling

### Using apperrors Package

Always use the `apperrors` package for service-layer errors:

```go
import apperrors "github.com/smartgarage/backend/internal/errors"

// Not found
return nil, apperrors.NotFound("workshop not found")

// Bad request
return nil, apperrors.BadRequest("invalid date range")

// Unauthorized
return nil, apperrors.Unauthorized("invalid credentials")

// Forbidden
return nil, apperrors.Forbidden("not your resource")

// Conflict
return nil, apperrors.Conflict("email already registered")

// Validation
return nil, apperrors.Validation("field X is required")

// Internal with cause
return nil, apperrors.InternalWithCause(err, "failed to process payment")

// Database error (from repository)
return nil, apperrors.DatabaseError(err, "query failed")
```

### Handler Response Patterns

```go
// Success
response.Success(w, data)
response.Created(w, createdData)
response.Paginated(w, data, total)

// Errors (never expose raw errors)
response.Error(w, err, "OperationName")
response.SafeBadRequest(w, "user-friendly message")
```

### Error Response Format

```json
{
  "success": false,
  "error": "workshop not found",
  "code": "NOT_FOUND"
}
```

## Testing Patterns

### Table-Driven Tests with Mockery

```go
// internal/handlers/rating_handler_test.go
package handlers

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    "github.com/smartgarage/backend/internal/mocks"
    "github.com/smartgarage/backend/internal/models"
    apperrors "github.com/smartgarage/backend/internal/errors"
)

func TestRatingHandler_Create(t *testing.T) {
    tests := []struct {
        name       string
        input      string
        setupMocks func(*mocks.MockRatingService)
        wantStatus int
        wantError  string
    }{
        {
            name:  "success",
            input: `{"workshop_id": 1, "score": 5, "comment": "Great service"}`,
            setupMocks: func(m *mocks.MockRatingService) {
                m.On("Create", mock.Anything, 123, mock.AnythingOfType("*models.CreateRatingInput")).
                    Return(&models.Rating{ID: 1, Score: 5}, nil)
            },
            wantStatus: http.StatusCreated,
        },
        {
            name:       "invalid JSON",
            input:      `{"invalid json`,
            setupMocks: func(m *mocks.MockRatingService) {},
            wantStatus: http.StatusBadRequest,
        },
        {
            name:       "validation error - missing score",
            input:      `{"workshop_id": 1}`,
            setupMocks: func(m *mocks.MockRatingService) {},
            wantStatus: http.StatusBadRequest,
        },
        {
            name:  "workshop not found",
            input: `{"workshop_id": 999, "score": 5}`,
            setupMocks: func(m *mocks.MockRatingService) {
                m.On("Create", mock.Anything, 123, mock.AnythingOfType("*models.CreateRatingInput")).
                    Return(nil, apperrors.NotFound("workshop not found"))
            },
            wantStatus: http.StatusNotFound,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Setup
            mockService := mocks.NewMockRatingService(t)
            tt.setupMocks(mockService)
            
            handler := NewRatingHandler(mockService)
            
            // Create request
            req := httptest.NewRequest(http.MethodPost, "/ratings", bytes.NewBufferString(tt.input))
            req.Header.Set("Content-Type", "application/json")
            rr := httptest.NewRecorder()
            
            // Execute (note: auth middleware would set userID in real test)
            handler.Create(rr, req)
            
            // Assert
            assert.Equal(t, tt.wantStatus, rr.Code)
            mockService.AssertExpectations(t)
        })
    }
}
```

### Test Requirements

Every handler test must include:
- ✅ 1+ success cases
- ✅ Validation error cases
- ✅ Not found / unauthorized cases
- ✅ Database error cases
- **Minimum: 4 test cases per handler**

## Swagger Annotations

### Required Annotations

```go
// @Summary     Short title (max 5 words)
// @Description Longer description
// @Tags        Group name (ratings, workshops, users, etc.)
// @Accept      json (or multipart/form-data for uploads)
// @Produce     json
// @Param       name type location description required
// @Success     code {object} responseType "Description"
// @Failure     code {object} response.APIResponse "Description"
// @Router      /path [method]
// @Security    BearerAuth (if authenticated)
```

### Parameter Types

```go
// Path parameter
// @Param       id path int true "Workshop ID"

// Body parameter
// @Param       input body models.CreateWorkshopInput true "Workshop data"

// Query parameter
// @Param       page query int false "Page number" default(1)
// @Param       limit query int false "Items per page" default(20)

// Form data (file uploads)
// @Param       photo formData file true "Profile photo"
```

## SQL Safety

### Parameterized Queries (MANDATORY)

```go
// ✅ CORRECT - Use parameterized queries
query := "SELECT * FROM workshops WHERE id = $1 AND status = $2"
rows, err := db.Query(ctx, query, workshopID, "active")

// ❌ WRONG - Never interpolate strings
query := fmt.Sprintf("SELECT * FROM workshops WHERE id = %d", workshopID) // SQL INJECTION!
```

### Common Query Patterns

```go
// Select with JOIN
query := `
    SELECT w.id, w.name, u.email as owner_email
    FROM workshops w
    JOIN users u ON w.user_id = u.id
    WHERE w.id = $1
`

// Insert with RETURNING
query := `
    INSERT INTO workshops (name, user_id, created_at)
    VALUES ($1, $2, $3)
    RETURNING id, created_at
`

// Update
query := `
    UPDATE workshops
    SET name = $1, updated_at = $2
    WHERE id = $3
`

// Delete
query := "DELETE FROM workshops WHERE id = $1"

// Transactions
err := pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
    _, err := tx.Exec(ctx, query1, args...)
    if err != nil {
        return err
    }
    _, err = tx.Exec(ctx, query2, args...)
    return err
})
```

## Quick Reference

```go
// Handler template
func (h *Handler) Method(w http.ResponseWriter, r *http.Request) {
    // 1. Get auth context
    userID, _ := middleware.GetUserID(r)
    
    // 2. Parse input
    var input models.Input
    json.NewDecoder(r.Body).Decode(&input)
    
    // 3. Validate
    if err := h.validate.Struct(input); err != nil {
        response.SafeBadRequest(w, err.Error())
        return
    }
    
    // 4. Call service
    result, err := h.service.Method(r.Context(), userID, &input)
    if err != nil {
        response.Error(w, err, "Method")
        return
    }
    
    // 5. Respond
    response.Success(w, result)
}
```
