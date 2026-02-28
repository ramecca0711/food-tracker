-- Home Base RLS policy pack
-- -----------------------------------------------------------------------------
-- Purpose:
--   1) Keep personal data private per user (strict ownership checks)
--   2) Allow controlled cross-user access only for community features
--   3) Keep shared reference/cache tables readable but not client-writable
--
-- Run this in Supabase SQL editor.
-- Safe to re-run: policies are dropped/recreated where possible.
-- -----------------------------------------------------------------------------

-- =============================================================================
-- A) PRIVATE USER-OWNED TABLES
-- =============================================================================
-- Logic:
--   - Authenticated users can only read/write rows where row.user_id == auth.uid()
--   - This protects raw personal data from cross-user reads/writes
--
-- Tables included (if they exist):
--   food_items, saved_meals, user_goals, goals_history, food_log_day_flags,
--   grocery_list_items, pantry_items,
--   body_metrics, training_weeks, training_days, training_exercises,
--   user_values, user_affirmations, journal_entries, user_todos,
--   bingo_categories, bingo_goals, bingo_cards, bingo_card_cells,
--   vision_board_images, circle_people, research_entries, user_integrations

do $$
declare
  tbl text;
  tables text[] := array[
    'food_items',
    'saved_meals',
    'user_goals',
    'goals_history',
    'food_log_day_flags',
    'grocery_list_items',
    'pantry_items',
    'body_metrics',
    'training_weeks',
    'training_days',
    'training_exercises',
    'user_values',
    'user_affirmations',
    'journal_entries',
    'user_todos',
    'bingo_categories',
    'bingo_goals',
    'bingo_cards',
    'bingo_card_cells',
    'vision_board_images',
    'circle_people',
    'research_entries',
    'user_integrations'
  ];
begin
  foreach tbl in array tables loop
    if to_regclass(tbl) is null then
      raise notice 'Skipping %, table not found', tbl;
      continue;
    end if;

    execute format('alter table %I enable row level security', tbl);

    begin
      -- SELECT own rows
      execute format('drop policy if exists %L on %I', tbl || '_select_own', tbl);
      execute format(
        'create policy %I on %I for select to authenticated using (auth.uid() is not null and auth.uid()::text = user_id::text)',
        tbl || '_select_own', tbl
      );

      -- INSERT own rows only
      execute format('drop policy if exists %L on %I', tbl || '_insert_own', tbl);
      execute format(
        'create policy %I on %I for insert to authenticated with check (auth.uid() is not null and auth.uid()::text = user_id::text)',
        tbl || '_insert_own', tbl
      );

      -- UPDATE own rows only
      execute format('drop policy if exists %L on %I', tbl || '_update_own', tbl);
      execute format(
        'create policy %I on %I for update to authenticated using (auth.uid() is not null and auth.uid()::text = user_id::text) with check (auth.uid() is not null and auth.uid()::text = user_id::text)',
        tbl || '_update_own', tbl
      );

      -- DELETE own rows only
      execute format('drop policy if exists %L on %I', tbl || '_delete_own', tbl);
      execute format(
        'create policy %I on %I for delete to authenticated using (auth.uid() is not null and auth.uid()::text = user_id::text)',
        tbl || '_delete_own', tbl
      );
    exception
      when undefined_column then
        -- Some legacy tables may not include user_id yet; skip and log.
        raise notice 'Skipping %, missing user_id column for ownership policies', tbl;
    end;
  end loop;
end $$;

-- =============================================================================
-- B) SHARED COMMUNITY TABLES (CROSS-USER, CONTROLLED)
-- =============================================================================
-- Logic for food-sharing marketplace:
--   - Posts are readable if open OR owned by current user
--   - Only owner can update/delete post
--   - Requests are readable by requester and post owner
--   - Requester can create request
--   - Post owner can confirm/decline request (update)

-- ---------- food_share_posts ----------
do $$
begin
  if to_regclass('food_share_posts') is not null then
    execute 'alter table food_share_posts enable row level security';

    execute 'drop policy if exists food_share_posts_select_open_or_own on food_share_posts';
    execute $p$
      create policy food_share_posts_select_open_or_own
      on food_share_posts
      for select
      to authenticated
      using (
        status = 'open'
        or (auth.uid() is not null and auth.uid()::text = user_id::text)
      )
    $p$;

    execute 'drop policy if exists food_share_posts_insert_own on food_share_posts';
    execute $p$
      create policy food_share_posts_insert_own
      on food_share_posts
      for insert
      to authenticated
      with check (auth.uid() is not null and auth.uid()::text = user_id::text)
    $p$;

    execute 'drop policy if exists food_share_posts_update_own on food_share_posts';
    execute $p$
      create policy food_share_posts_update_own
      on food_share_posts
      for update
      to authenticated
      using (auth.uid() is not null and auth.uid()::text = user_id::text)
      with check (auth.uid() is not null and auth.uid()::text = user_id::text)
    $p$;

    execute 'drop policy if exists food_share_posts_delete_own on food_share_posts';
    execute $p$
      create policy food_share_posts_delete_own
      on food_share_posts
      for delete
      to authenticated
      using (auth.uid() is not null and auth.uid()::text = user_id::text)
    $p$;
  else
    raise notice 'Skipping food_share_posts, table not found';
  end if;
end $$;

-- ---------- food_share_requests ----------
do $$
begin
  if to_regclass('food_share_requests') is not null then
    execute 'alter table food_share_requests enable row level security';

    execute 'drop policy if exists food_share_requests_select_requester_or_post_owner on food_share_requests';
    execute $p$
      create policy food_share_requests_select_requester_or_post_owner
      on food_share_requests
      for select
      to authenticated
      using (
        -- requester can read own request
        (auth.uid() is not null and auth.uid()::text = requester_user_id::text)
        or
        -- post owner can read incoming requests
        exists (
          select 1
          from food_share_posts p
          where p.id = food_share_requests.post_id
            and auth.uid()::text = p.user_id::text
        )
      )
    $p$;

    execute 'drop policy if exists food_share_requests_insert_requester on food_share_requests';
    execute $p$
      create policy food_share_requests_insert_requester
      on food_share_requests
      for insert
      to authenticated
      with check (auth.uid() is not null and auth.uid()::text = requester_user_id::text)
    $p$;

    execute 'drop policy if exists food_share_requests_update_post_owner on food_share_requests';
    execute $p$
      create policy food_share_requests_update_post_owner
      on food_share_requests
      for update
      to authenticated
      using (
        exists (
          select 1
          from food_share_posts p
          where p.id = food_share_requests.post_id
            and auth.uid()::text = p.user_id::text
        )
      )
      with check (
        exists (
          select 1
          from food_share_posts p
          where p.id = food_share_requests.post_id
            and auth.uid()::text = p.user_id::text
        )
      )
    $p$;

    -- Optional: allow requester to cancel their own request before confirmation.
    execute 'drop policy if exists food_share_requests_delete_requester on food_share_requests';
    execute $p$
      create policy food_share_requests_delete_requester
      on food_share_requests
      for delete
      to authenticated
      using (auth.uid() is not null and auth.uid()::text = requester_user_id::text)
    $p$;
  else
    raise notice 'Skipping food_share_requests, table not found';
  end if;
end $$;

-- =============================================================================
-- C) SHARED CACHE / REFERENCE TABLES
-- =============================================================================
-- Logic:
--   - These are non-personal shared datasets.
--   - Readable by authenticated users.
--   - No client write policies (so writes are blocked for client JWTs).
--   - Backend/service-role can still write because service role bypasses RLS.

-- ---------- master_food_database ----------
do $$
begin
  if to_regclass('master_food_database') is not null then
    execute 'alter table master_food_database enable row level security';

    execute 'drop policy if exists master_food_database_select_authenticated on master_food_database';
    execute $p$
      create policy master_food_database_select_authenticated
      on master_food_database
      for select
      to authenticated
      using (true)
    $p$;

    -- Intentionally no INSERT/UPDATE/DELETE policies for authenticated users.
    -- This keeps global cache quality controlled by backend jobs/routes.
  else
    raise notice 'Skipping master_food_database, table not found';
  end if;
end $$;

-- ---------- food_expiration_defaults ----------
do $$
begin
  if to_regclass('food_expiration_defaults') is not null then
    execute 'alter table food_expiration_defaults enable row level security';

    execute 'drop policy if exists food_expiration_defaults_select_authenticated on food_expiration_defaults';
    execute $p$
      create policy food_expiration_defaults_select_authenticated
      on food_expiration_defaults
      for select
      to authenticated
      using (true)
    $p$;

    -- Intentionally no client write policies.
  else
    raise notice 'Skipping food_expiration_defaults, table not found';
  end if;
end $$;

-- =============================================================================
-- D) RECOMMENDED FOLLOW-UPS
-- =============================================================================
-- 1) Ensure every private table includes a user_id column.
-- 2) Ensure app INSERTs always set user_id from the authenticated session.
-- 3) Keep service-role keys only in server routes/functions.
-- 4) For analytics across all users, write aggregate tables via backend jobs,
--    then expose only aggregate/non-identifying results to clients.
-- =============================================================================
