# CLAUDE.md

This file contains instructions for Claude when working in this repository.

## Project Overview

**HomeBase** — a nutrition and food logging dashboard with AI-powered food parsing, macro tracking, biodiversity metrics, meal planning, and pantry management.

**Stack:**
- Next.js (App Router) + TypeScript + Tailwind CSS v4
- Supabase (PostgreSQL) for data persistence
- OpenAI API (GPT-4o-mini) for food parsing
- USDA Food Database integration
- Recharts for data visualization
- npm as the package manager

**Key env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`

## Priorities

- **Meet the requirements** — focus on delivering what is asked. Don't add unrequested features, abstractions, or refactors.
- **Keep it simple** — prefer the simplest solution that works. Avoid over-engineering.
- **Match existing patterns** — read relevant files before making changes and follow the conventions already in place.

## Code Style

- **Always add clear, meaningful comments** throughout all code — functions, logic blocks, API routes, hooks, and components. Comments should explain *why*, not just *what*.
- Use TypeScript types throughout; avoid `any`.
- Follow the existing file/folder structure under `app/` and `lib/`.

### Example comment style

```typescript
// Fetch macro data for a given food item from the USDA database,
// falling back to the OpenAI-parsed estimate if no USDA match is found.
async function getFoodMacros(foodName: string): Promise<Macros> {
  // ...
}
```

## Agents

Use subagents (Task tool) proactively to:
- Explore unfamiliar parts of the codebase before making changes
- Run parallel searches when looking for patterns across multiple files
- Isolate research from implementation to keep the main context clean

Prefer the `Explore` subagent for codebase research and the `Plan` subagent for multi-step implementation planning.

## Workflow

After completing changes, always run in order:

```bash
npm run lint   # Must pass with no errors
npm run build  # Must pass with no errors
```

Fix any lint or build errors before considering a task done.

## Git

Commits can be made freely after completing a task. Use clear, descriptive commit messages that explain the purpose of the change. Stage specific files rather than `git add -A`.

## Project Structure

```
app/
  api/              # Next.js API routes (serverless)
  components/       # Shared UI components
  wellbeing/        # Main feature routes
    dashboard/      # Food log dashboard
    fuel/           # Nutrition tracking (food-log, provisions)
    goals/          # Health goals
    body/           # Body metrics & progress photos
  debug/            # Debug utilities
lib/
  supabase.ts       # Supabase client
  openai.ts         # OpenAI client + shared types (FoodItem, MealGroup, ParsedFood)
public/             # Static assets + PWA manifest
```
