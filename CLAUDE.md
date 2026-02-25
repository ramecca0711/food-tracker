# CLAUDE.md

This file contains instructions for Claude when working in this repository.

## Project Overview

**HomeBase** — a personal life dashboard with AI-powered food parsing, macro/biodiversity tracking, meal planning, goal setting, journaling, and more. Currently focused on the Wellbeing (nutrition) slice.

**Stack:**
- Next.js (App Router) + TypeScript + Tailwind CSS v4
- Supabase (PostgreSQL) for data persistence
- OpenAI API (GPT-4o-mini) for food parsing and ingredient extraction
- USDA Food Database integration (via Cheerio scraping)
- Recharts for data visualization
- npm as the package manager

**Environment variables:**
```
NEXT_PUBLIC_SUPABASE_URL        # Supabase project URL (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Supabase anon key (public)
OPENAI_API_KEY                  # OpenAI API key (server only)
USDA_API_KEY                    # USDA FDC API key (server only)
SUPABASE_SERVICE_ROLE_KEY       # Service role key for backfill routes (server only)
NEXT_PUBLIC_APP_URL             # App URL, defaults to http://localhost:3000
```

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

## MCP

MCP servers can be configured in `.mcp.json` at the project root. When adding MCP integrations, document them here with the server name, purpose, and any required credentials.

---

## Architecture & Patterns

### Project Structure

```
app/
  api/                  # Next.js API routes (serverless, all use route.ts)
    parse-food/         # GPT parses meal description → FoodItem[]
    parse-meal-ingredients/ # Extracts ingredients from text or URL
    get-food-macros/    # Macro lookup: DB cache → USDA → AI fallback
    usda-food-search/   # USDA FDC API search (returns per-100g macros)
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
  categories: string[];           // e.g. ['protein', 'dairy']
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

**Key tables:** `food_items`, `user_goals`, `saved_meals`

**Query conventions:**
- Always scope to user: `.eq('user_id', userId)`
- Date range queries: `.gte('logged_at', dateStart)`
- Default sort: `.order('logged_at', { ascending: false })`
- Backfill routes use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)

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
