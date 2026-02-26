# CLAUDE.md

This file contains instructions for Claude when working in this repository.

## Project Overview

**HomeBase** — a personal life dashboard with AI-powered food parsing, macro/biodiversity tracking, meal planning, goal setting, journaling, and more. Currently focused on the Wellbeing (nutrition) slice.

**Stack:**
- Next.js (App Router) + TypeScript + Tailwind CSS v4
- Supabase (PostgreSQL) for data persistence
- OpenAI API (GPT-4o-mini) for food parsing and ingredient extraction
- ~~USDA Food Database integration~~ (disabled/commented out — do not remove, may be re-enabled)
- Recharts for data visualization
- npm as the package manager

**Environment variables:**
```
NEXT_PUBLIC_SUPABASE_URL        # Supabase project URL (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Supabase anon key (public)
OPENAI_API_KEY                  # OpenAI API key (server only)
# USDA_API_KEY                  # Disabled — USDA integration currently not in use
SUPABASE_SERVICE_ROLE_KEY       # Service role key for backfill routes (server only)
NEXT_PUBLIC_APP_URL             # App URL, defaults to http://localhost:3000
```

## Priorities

- **Meet the requirements** — focus on delivering what is asked. Don't add unrequested features, abstractions, or refactors.
- **Keep it simple** — prefer the simplest solution that works. Avoid over-engineering.
- **Match existing patterns** — read relevant files before making changes and follow the conventions already in place.

## Code Style

- **Always add clear, meaningful comments** throughout all code — existing files touched during a task AND any new code written. Comments should explain *why*, not just *what*.
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

## MCP

MCP servers configured for this project (tokens stored in `.mcp.json`). The Supabase MCP is the source of truth for database schema — do not manually document table schemas in this file.

| Server | Purpose |
|---|---|
| Supabase MCP | Database introspection, schema reference, query assistance |
| Vercel MCP | Deployment management, environment variables, logs |
| GitHub MCP | Repository info, issues, pull requests |
| Playwright (TBD) | E2E testing — to be configured when test suite is set up |

**Supabase project:** `food-log-ai` (project ID: `kesrsbazwmnaxdqmvwuv`, region: `us-east-1`)

---

## Architecture & Patterns

### Project Structure

```
app/
  api/                  # Next.js API routes (serverless, all use route.ts)
    parse-food/         # GPT parses meal description → FoodItem[]
    parse-meal-ingredients/ # Extracts ingredients from text or URL
    get-food-macros/    # Macro lookup: DB cache → AI fallback (USDA disabled)
    backfill-*/         # One-off data processing (require service role key)
  components/           # Shared UI components
    PageLayout.tsx      # Wraps pages: auth check + Sidebar + layout
    Sidebar.tsx         # Navigation, user email, sign-out
  wellbeing/            # Main feature routes
    dashboard/          # Food log dashboard
    fuel/               # Nutrition tracking
      food-log/         # Daily food log (LogFoodView.tsx)
      provisions/       # Pantry, grocery, meal planning
    goals/              # Health goals
    body/               # Body metrics & progress photos
  debug/                # Debug utilities
lib/
  supabase.ts           # Supabase client (browser-safe)
  openai.ts             # OpenAI client + shared types
public/                 # Static assets + PWA manifest
```

### Shared Types (lib/openai.ts)

```typescript
interface FoodItem {
  food_name: string;
  quantity: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  sugar: number;
  sodium: number;
  categories: string[];             // e.g. ['protein', 'dairy']
  whole_food_ingredients: string[]; // used for biodiversity scoring
}

interface MealGroup {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: FoodItem[];
  confidence: number;
}

interface ParsedFood {
  meals: MealGroup[];
}
```

### Database (Supabase)

Schema is managed and introspected via the **Supabase MCP** — refer to it for current table definitions rather than hardcoding them here.

**Current tables (public schema):**
- `food_items` — individual logged food entries per user (58+ rows of real data — protect carefully)
- `food_logs` — parent log sessions (currently empty, mostly unused)
- `master_food_database` — shared macro cache: cache → Open Food Facts → AI (no RLS)
- `user_goals` — per-user macro targets and body metrics
- `goals_history` — historical snapshots of goal changes
- `saved_meals` — user-saved meal recipes / templates
- `meal_plans` — scheduled meal plans linked to saved meals
- `pantry_items` — user pantry inventory
- `grocery_list_items` — shopping list items
- `food_expiration_defaults` — lookup table for shelf life by food category

**Known schema notes:**
- `master_food_database` has two sodium columns: `sodium_per_100mg` (legacy, unused) and `sodium_mg_per_100g` (current). Routes use `sodium_mg_per_100g`. The legacy column should be cleaned up eventually.
- `master_food_database` has no RLS — it is a shared cache, not user-scoped.

**Query conventions:**
- Always scope to user: `.eq('user_id', userId)`
- Date range queries: `.gte('logged_at', dateStart)`
- Default sort: `.order('logged_at', { ascending: false })`
- Backfill routes use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)

**Schema change safety — always follow this before any destructive migration:**
1. If the table has data, snapshot it first:
   ```sql
   -- Option A: Copy data to a backup table (keeps original intact)
   CREATE TABLE tablename_snap_YYYYMMDD AS SELECT * FROM tablename;
   -- Option B: Rename original (then recreate from scratch)
   ALTER TABLE tablename RENAME TO tablename_bak_YYYYMMDD;
   ```
2. Use the Supabase MCP `apply_migration` tool for all DDL — this records the change in `supabase_migrations` for audit history.
3. Never DROP a table with user data without explicit confirmation.
4. Snapshots can be cleaned up after the migration is confirmed stable (usually next session).

### API Route Conventions

All routes follow this pattern:

```typescript
// POST /api/example
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    // ...business logic...
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'message' }, { status: 500 });
  }
}
```

**Important:** Never initialize Supabase or OpenAI clients at module level. Use lazy factory functions instead:
```typescript
// WRONG — throws at build time when env vars aren't available
const supabase = createClient(url!, key!);

// CORRECT — only runs at request time
function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
```

### OpenAI Usage

- **Model:** `gpt-4o-mini` (all calls)
- **Temperature:** `0.3` (low, for consistent structured output)
- **Response format:** Always `{ type: 'json_object' }` — parse with `JSON.parse()`
- **Client:** imported from `lib/openai.ts`

### Auth Pattern

- Supabase Auth; session checked via `supabase.auth.getSession()`
- Unauthenticated users are redirected to `/` (the landing/login page)
- Auth state changes handled via `supabase.auth.onAuthStateChange()`

### Key Gotchas

- **Quantity scaling:** When a user edits quantity, all macros must be recalculated proportionally. See `LogFoodView.tsx` for the pattern.
- **Biodiversity scoring:** Uses `whole_food_ingredients[]` (not `food_name`) to count unique whole foods across categories (fruit, vegetable, nut, legume, grain).
- **Date grouping:** Uses `new Date().toDateString()` as the grouping key — not ISO strings.
- **Meal type order:** Hardcoded display sort: breakfast → lunch → dinner → snack.
- **Cross-component refresh:** Uses a custom `window.dispatchEvent(new Event('foodLogged'))` pattern to trigger data refreshes across components.
- **State management:** No Redux/Zustand — all local `useState` + `useEffect`. Complex state uses `Map` and `Set`.
- **USDA disabled:** The USDA food search integration is commented out. Do not re-enable without discussion. The `get-food-macros` route lookup chain is: Supabase cache → Open Food Facts → AI.
- **Macro lookup chain:** `parse-food` first calls `parseFood()` (AI) for meal structure + initial macros, then calls `get-food-macros` **in parallel** for every item to enrich via cache → OpenFoodFacts → AI. Cache/OFF hits override the AI estimate; AI fallback results are discarded (parseFood macros kept — better context). The response includes `cache_candidates` for deferred DB write on save.
- **cache_candidate pattern:** `get-food-macros` returns a `cache_candidate` object for OFF/AI results. `parse-food` aggregates these and includes them in the response. `handleConfirm` in LogFoodView upserts them to `master_food_database` only after the user confirms — avoiding DB pollution from abandoned sessions.
- **Lazy client init:** All Supabase and OpenAI clients in API routes use factory functions (`getSupabase()`, `getOpenAI()`) rather than module-level constants — required so `next build` doesn't throw when env vars are absent during static analysis.
- **Mobile sidebar:** On mobile the sidebar is a slide-over drawer (fully off-screen when closed). On desktop it's a sticky panel that can collapse to an icon strip. State is tracked separately: `isMobileOpen` for mobile, `isCollapsed` for desktop.
