---
name: database-migration-safety
description: Safe database migration procedures, pre-migration checklists, and rollback strategies
tags:
  - database
  - migrations
  - safety
  - postgresql
license: MIT
compatibility: opencode
metadata:
  audience: all-developers
  category: safety
  priority: critical
---

# Database Migration Safety Skill

⚠️ **CRITICAL:** Database migrations affect shared state. Always follow safety procedures.

## What I Do

I help you safely create, apply, and rollback database migrations while avoiding common pitfalls like data loss, downtime, and breaking existing code.

## When to Use Me

**STOP and consult this skill when:**
- Creating new migrations
- Modifying existing schema
- Adding/removing columns or tables
- Changing column types
- Planning production deployments

**Rule:** Ask the user before creating migrations — they affect shared database state.

## Pre-Migration Checklist

### Before Creating Any Migration

- [ ] **Understand the impact** — Will this break existing code?
- [ ] **Check current usage** — Search codebase for table/column references
- [ ] **Plan the order** — Schema changes before code changes, or vice versa?
- [ ] **Write DOWN migration** — Always provide rollback
- [ ] **Test locally** — Run UP and DOWN multiple times
- [ ] **Backup consideration** — Production deployments need backup plan

### Migration Safety Questions

Ask yourself:
1. **Does existing code read this column?** → Deploy code changes first
2. **Is this a destructive change?** (DROP, ALTER TYPE) → Requires careful planning
3. **Will this lock the table?** → Consider downtime or online migrations
4. **Can this be done in stages?** → Multi-step migrations are safer

## Creating Migrations

### Use Make Target

```bash
# Create migration file
make migrate-create

# You'll be prompted for name:
# > Enter migration name: add_ratings_table

# Creates: backend/migrations/YYYYMMDDHHMMSS_add_ratings_table.sql
```

### Naming Conventions

```
YYYYMMDDHHMMSS_descriptive_name.sql

Examples:
001_add_ratings_table.sql
002_add_user_profile_fields.sql
003_create_workshop_index.sql
004_remove_deprecated_column.sql
```

### Migration Template

```sql
-- +goose Up
-- Add migration here
CREATE TABLE ratings (
    id SERIAL PRIMARY KEY,
    workshop_id INTEGER NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ratings_workshop_id ON ratings(workshop_id);

-- +goose Down
-- Rollback migration here
DROP INDEX IF EXISTS idx_ratings_workshop_id;
DROP TABLE IF EXISTS ratings;
```

### Required Sections

Every migration MUST have:
- `-- +goose Up` — Forward migration
- `-- +goose Down` — Rollback migration

## Safe Migration Patterns

### ✅ Adding a New Table (Safe)

```sql
-- +goose Up
CREATE TABLE new_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- +goose Down
DROP TABLE IF EXISTS new_table;
```

**Risk:** Low — No existing code depends on it

### ✅ Adding a New Column (Safe if nullable)

```sql
-- +goose Up
ALTER TABLE workshops ADD COLUMN rating_average DECIMAL(3,2);

-- +goose Down
ALTER TABLE workshops DROP COLUMN IF EXISTS rating_average;
```

**Risk:** Low — Existing code will ignore the new column

### ⚠️ Adding a Non-Nullable Column (Careful)

```sql
-- BAD: Will fail if table has existing rows
ALTER TABLE workshops ADD COLUMN email VARCHAR(255) NOT NULL;

-- GOOD: Add as nullable, backfill, then add constraint
-- Migration 1
ALTER TABLE workshops ADD COLUMN email VARCHAR(255);
UPDATE workshops SET email = 'legacy@example.com' WHERE email IS NULL;

-- Migration 2 (separate deployment)
ALTER TABLE workshops ALTER COLUMN email SET NOT NULL;
```

**Risk:** Medium — Requires data backfill

### ⚠️ Modifying Column Type (Dangerous)

```sql
-- BAD: May truncate data
ALTER TABLE users ALTER COLUMN phone TYPE INTEGER;

-- GOOD: Create new column, migrate data, verify, drop old
-- Migration 1: Add new column
ALTER TABLE users ADD COLUMN phone_normalized VARCHAR(20);

-- Application code populates new column

-- Migration 2: After all data migrated
ALTER TABLE users DROP COLUMN phone;
ALTER TABLE users RENAME COLUMN phone_normalized TO phone;
```

**Risk:** High — Potential data loss

### 🔴 Dropping a Column (DANGEROUS)

```sql
-- NEVER do this in one step if code still reads the column

-- Step 1: Stop code from reading the column (deploy code first)
-- Step 2: Verify no code references the column
-- Step 3: Then drop

-- +goose Up
ALTER TABLE workshops DROP COLUMN IF EXISTS deprecated_field;

-- +goose Down
-- Cannot rollback dropped column without data loss!
-- Consider renaming instead:
-- ALTER TABLE workshops ADD COLUMN deprecated_field <type>;
```

**Risk:** Critical — Data loss, irreversible

**Better approach:** Rename first, drop later
```sql
-- Migration 1: Mark as deprecated
ALTER TABLE workshops RENAME COLUMN old_field TO z_deprecated_old_field;

-- Migration 2 (weeks later): Safe to drop
ALTER TABLE workshops DROP COLUMN z_deprecated_old_field;
```

### ✅ Creating Indexes (Safe)

```sql
-- +goose Up
CREATE INDEX CONCURRENTLY idx_workshops_status ON workshops(status);

-- +goose Down
DROP INDEX IF EXISTS idx_workshops_status;
```

**Tip:** Use `CONCURRENTLY` in production to avoid table locks

### ⚠️ Foreign Key Constraints

```sql
-- +goose Up
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_workshop
    FOREIGN KEY (workshop_id) REFERENCES workshops(id)
    ON DELETE CASCADE;

-- +goose Down
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS fk_bookings_workshop;
```

**Risk:** Medium — Check for orphaned data first

## Schema → Code Synchronization

When changing database schema, update ALL layers:

```
1. Database
   └── Write migration SQL (UP + DOWN)

2. Go Models
   └── Update backend/internal/models/

3. Repository
   └── Update queries in backend/internal/repository/

4. Service (if needed)
   └── Update business logic

5. API (if response changes)
   └── Update swagger annotations

6. Frontend Types
   └── Run: make generate-api-types

7. Validation
   └── Run: make validate
```

## Testing Migrations

### Local Testing Workflow

```bash
# 1. Check current state
make migrate

# 2. Create migration
make migrate-create
# Edit: backend/migrations/YYYYMMDDHHMMSS_name.sql

# 3. Test UP migration
make migrate
# Verify: Check schema is correct

# 4. Test application code
# Run: make dev-suite
# Test: Manual verification

# 5. Test DOWN migration
make migrate-down
# Verify: Schema rolled back correctly

# 6. Test UP again (idempotent check)
make migrate

# 7. Run full validation
make validate
```

### Migration Idempotency

Migrations should be idempotent — running twice produces same result:

```sql
-- GOOD: Idempotent
CREATE TABLE IF NOT EXISTS users (...);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
DROP INDEX IF EXISTS idx_users_email;

-- BAD: Not idempotent
CREATE TABLE users (...); -- Fails on second run
DROP TABLE users; -- Destroys data
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] Migration tested locally multiple times (UP and DOWN)
- [ ] DOWN migration tested and works
- [ ] Database backup completed
- [ ] Code changes deployed that handle new schema
- [ ] Rollback plan documented
- [ ] Maintenance window scheduled (if needed)

### Deployment Order

**Adding schema (non-breaking):**
```
1. Deploy migration (adds new table/column)
2. Deploy code (uses new table/column)
3. Verify
```

**Removing schema (breaking):**
```
1. Deploy code (stops using old table/column)
2. Verify code works without old schema
3. Deploy migration (removes old table/column)
```

### Rollback Procedure

If migration fails in production:

```bash
# 1. Identify last successful migration
migrate -path backend/migrations -database "$DATABASE_URL" version

# 2. Rollback one migration
make migrate-down

# 3. If multiple rollbacks needed
migrate -path backend/migrations -database "$DATABASE_URL" goto <version>

# 4. Verify rollback
psql $DATABASE_URL -c "\dt"  # List tables
psql $DATABASE_URL -c "\d table_name"  # Describe table
```

## Migration Commands

```bash
# Create new migration
make migrate-create

# Apply all pending migrations
make migrate

# Rollback last migration
make migrate-down

# Check migration status
migrate -path backend/migrations -database "$DATABASE_URL" status

# Jump to specific version
migrate -path backend/migrations -database "$DATABASE_URL" goto 42

# Force set version (emergency only!)
migrate -path backend/migrations -database "$DATABASE_URL" force 42
```

## Common Pitfalls

### ❌ Don't: Edit Applied Migrations

```bash
# BAD: Editing migration after it's applied
vim backend/migrations/001_add_table.sql  # DON'T DO THIS
make migrate  # Has no effect — already applied
```

**Fix:** Create a new migration to correct the issue.

### ❌ Don't: Skip DOWN Migrations

```sql
-- BAD: Empty DOWN section
-- +goose Up
CREATE TABLE users (...);

-- +goose Down
-- TODO: implement rollback
```

**Fix:** Always write DOWN migrations, even if you think you won't need them.

### ❌ Don't: Long-Running Migrations Without Warning

```sql
-- BAD: Locks table for long time
UPDATE huge_table SET column = expensive_calculation(column);
```

**Fix:** Break into batches or use background job.

### ❌ Don't: Assume Schema Matches Code

Always run `make generate-api-types` after schema changes that affect API responses.

## Emergency Contacts

If a migration goes wrong in production:

1. **Stop** — Don't panic or make rushed changes
2. **Assess** — Determine severity (data loss vs. downtime)
3. **Rollback** — Use `make migrate-down` if safe
4. **Communicate** — Notify team immediately
5. **Document** — Record what happened for post-mortem

## Quick Reference

```bash
# Create, test, apply migration
make migrate-create              # Create migration file
# Edit: backend/migrations/XXX_name.sql
make migrate                     # Apply migration
make migrate-down                # Rollback if needed
make validate                    # Full validation

# Check status
migrate -path backend/migrations -database "$DATABASE_URL" status
```
