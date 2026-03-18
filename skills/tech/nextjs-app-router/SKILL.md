---
name: nextjs-app-router
description: Next.js 14 App Router patterns, Server/Client components, data fetching, and state management with Zustand
tags:
  - nextjs
  - react
  - typescript
  - frontend
  - app-router
license: MIT
compatibility: opencode
metadata:
  audience: frontend-developers
  category: patterns
---

# Next.js App Router Skill

## What I Do

I help you build consistent Next.js 14 applications using the App Router, with proper patterns for Server Components, Client Components, data fetching, and state management.

## When to Use Me

Use this skill when:
- Creating new pages or components
- Deciding between Server vs Client Components
- Setting up data fetching
- Managing global state with Zustand
- Generating API types from backend

## Architecture Overview

### Pattern: Page → Component → Service → Store

```
Page (app/workshop/page.tsx)
    ↓
Components (components/workshop/WorkshopCard.tsx)
    ↓
Services (services/workshopService.ts)
    ↓
Store (store/workshopStore.ts) - if needed
```

### Layer Responsibilities

#### 1. Pages (`app/`)
- Next.js App Router pages
- Server Components by default
- Handle data fetching
- Compose UI from components

#### 2. Components (`components/`)
- Reusable UI components
- Can be Server or Client
- Receive data via props
- Add `data-testid` for testing

#### 3. Services (`services/`)
- API communication layer
- Import types from `types/api.ts`
- Use shared `apiClient`

#### 4. Store (`store/`)
- Zustand state management
- Persist auth tokens
- Minimal state (derive when possible)

## Server vs Client Components

### Server Components (Default)

**Use when:**
- Fetching data on server
- Accessing backend resources directly
- Keeping bundle size small
- SEO-sensitive content

```tsx
// app/workshop/page.tsx
// Server Component by default

import { WorkshopCard } from '@/components/workshop/WorkshopCard';
import { workshopService } from '@/services/workshopService';

export default async function WorkshopPage({ params }: { params: { id: string } }) {
  // ✅ Fetch data on server
  const workshop = await workshopService.getWorkshop(params.id);
  
  if (!workshop) {
    return <div>Workshop not found</div>;
  }
  
  return (
    <div>
      <h1>{workshop.name}</h1>
      <WorkshopCard workshop={workshop} />
    </div>
  );
}
```

### Client Components

**Use when:**
- Using browser APIs (window, document)
- Using React hooks (useState, useEffect)
- Handling user interactions
- Using context

```tsx
// components/workshop/WorkshopForm.tsx
'use client'; // Required directive

import { useState } from 'react';
import { workshopService } from '@/services/workshopService';

export function WorkshopForm() {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await workshopService.create({ name });
      // Handle success
    } catch (error) {
      // Handle error
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={name} 
        onChange={(e) => setName(e.target.value)}
        data-testid="workshop-name-input"
      />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

### Decision Tree

```
Need to use useState/useEffect?
    ↓ YES → Client Component ('use client')
    ↓ NO
Need to use browser APIs?
    ↓ YES → Client Component ('use client')
    ↓ NO
Need to handle user events?
    ↓ YES → Client Component ('use client')
    ↓ NO
→ Server Component (default)
```

## Adding a New Page

### Step-by-Step Process

```
1. Create page        → app/<route>/page.tsx
2. Create components  → components/<feature>/
3. Create service     → services/<feature>Service.ts
4. Add types          → Import from types/api.ts
5. Update store       → store/ (if shared state needed)
6. Write tests        → __tests__/<feature>/
```

### Step 1: Create Page

```tsx
// app/workshops/[id]/page.tsx
import { Metadata } from 'next';
import { WorkshopDetail } from '@/components/workshop/WorkshopDetail';
import { workshopService } from '@/services/workshopService';

// Metadata for SEO
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const workshop = await workshopService.getWorkshop(params.id);
  return {
    title: workshop?.name || 'Workshop Not Found',
    description: workshop?.description,
  };
}

export default async function WorkshopPage({ params }: { params: { id: string } }) {
  const workshop = await workshopService.getWorkshop(params.id);
  
  if (!workshop) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold">Workshop not found</h1>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <WorkshopDetail workshop={workshop} />
    </div>
  );
}
```

### Step 2: Create Components

```tsx
// components/workshop/WorkshopDetail.tsx
import { Workshop } from '@/types/api';
import { RatingStars } from './RatingStars';

interface WorkshopDetailProps {
  workshop: Workshop;
}

export function WorkshopDetail({ workshop }: WorkshopDetailProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6" data-testid="workshop-detail">
      <h1 className="text-3xl font-bold mb-4">{workshop.name}</h1>
      
      <div className="flex items-center mb-4">
        <RatingStars rating={workshop.rating} />
        <span className="ml-2 text-gray-600">({workshop.reviewCount} reviews)</span>
      </div>
      
      <p className="text-gray-700 mb-4">{workshop.description}</p>
      
      <address className="not-italic text-gray-600">
        {workshop.address}<br />
        {workshop.city}, {workshop.postalCode}
      </address>
    </div>
  );
}
```

### Step 3: Create Service

```typescript
// services/workshopService.ts
import { apiClient } from '@/lib/api';
import { Workshop, CreateWorkshopInput } from '@/types/api';

export const workshopService = {
  async getWorkshop(id: string): Promise<Workshop | null> {
    try {
      const response = await apiClient.get(`/workshops/${id}`);
      return response.data.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
  
  async create(input: CreateWorkshopInput): Promise<Workshop> {
    const response = await apiClient.post('/workshops', input);
    return response.data.data;
  },
  
  async update(id: string, input: Partial<CreateWorkshopInput>): Promise<Workshop> {
    const response = await apiClient.put(`/workshops/${id}`, input);
    return response.data.data;
  },
  
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/workshops/${id}`);
  },
};
```

### Step 4-6: Types, Store, Tests

See Type Generation and State Management sections below.

## Type Generation

### API Types Flow

```
Backend Swagger Annotations
         ↓
make swagger (generates swagger.json)
         ↓
make generate-api-types (openapi-typescript)
         ↓
types/api.generated.ts
         ↓
types/api.ts (exports + aliases)
         ↓
Frontend imports
```

### Importing Types

```typescript
// ✅ CORRECT - Import from generated types
import { Workshop, CreateWorkshopInput, APIResponse } from '@/types/api';

// ❌ WRONG - Never manually define API types
interface Workshop {
  id: number;
  name: string;
  // ...
}
```

### Regenerating Types

```bash
# After backend API changes
make generate-api-types

# Or full regeneration including swagger
make swagger && make generate-api-types
```

## State Management with Zustand

### Store Pattern

```typescript
// store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'user-auth-storage', // localStorage key
    }
  )
);
```

### Using Stores

```tsx
// components/layout/Header.tsx
'use client';

import { useAuthStore } from '@/store/authStore';

export function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();
  
  return (
    <header>
      {isAuthenticated ? (
        <>
          <span>Welcome, {user?.name}</span>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <a href="/login">Login</a>
      )}
    </header>
  );
}
```

### Store Best Practices

✅ **DO:**
- Keep stores minimal
- Persist only necessary data
- Use selectors for performance
- Separate concerns (auth, workshop, etc.)

❌ **DON'T:**
- Store everything in global state
- Persist sensitive data (passwords)
- Derive state that can be computed

## Data Fetching Patterns

### Server Component Fetching

```tsx
// ✅ Server Component - Fetch on server
export default async function WorkshopsPage() {
  const workshops = await workshopService.getAll();
  
  return (
    <div>
      {workshops.map(workshop => (
        <WorkshopCard key={workshop.id} workshop={workshop} />
      ))}
    </div>
  );
}
```

### Client Component Fetching

```tsx
// ✅ Client Component - Use SWR or React Query
'use client';

import useSWR from 'swr';
import { workshopService } from '@/services/workshopService';

export function WorkshopList() {
  const { data: workshops, error, isLoading } = useSWR(
    '/workshops',
    () => workshopService.getAll()
  );
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading workshops</div>;
  
  return (
    <div>
      {workshops?.map(workshop => (
        <WorkshopCard key={workshop.id} workshop={workshop} />
      ))}
    </div>
  );
}
```

### Loading States

```tsx
// app/workshops/loading.tsx
export default function Loading() {
  return (
    <div className="container mx-auto p-4">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Error Handling

```tsx
// app/workshops/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="container mx-auto p-4">
      <h2 className="text-xl font-bold text-red-600">Something went wrong!</h2>
      <p className="text-gray-600">{error.message}</p>
      <button onClick={reset} className="mt-4 btn-primary">
        Try again
      </button>
    </div>
  );
}
```

## Styling with Tailwind CSS

### Utility Classes

```tsx
// ✅ Use Tailwind utility classes
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  <h1 className="text-2xl font-bold text-gray-900">Workshop Name</h1>
  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
    Book Now
  </button>
</div>
```

### Responsive Design

```tsx
// Mobile-first responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>
```

### Custom Components

```tsx
// components/ui/Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  const baseStyles = 'px-4 py-2 rounded font-medium transition-colors';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  
  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
```

## Prettier Configuration

Follow project Prettier rules (`.prettierrc`):

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": false,
  "printWidth": 80,
  "tabWidth": 2,
  "arrowParens": "always",
  "bracketSpacing": true
}
```

### Key Rules

- **Double quotes** — `"string"` not `'string'`
- **Trailing commas** — `,` at end of lists
- **80 character width** — Wrap long lines
- **Arrow parens** — `(x) => x` not `x => x`
- **Semicolons** — Always use them

## Quick Reference

```tsx
// Server Component (default)
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}

// Client Component
'use client';
export function Component() {
  const [state, setState] = useState();
  return <div onClick={() => setState()}>Click</div>;
}

// Data fetching
const { data } = useSWR('/api/data', fetcher);

// API types
import { Workshop } from '@/types/api';

// Store usage
const { user } = useAuthStore();
```
