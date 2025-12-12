# Copilot instructions (Social Media Automation)

## Big picture
- Next.js 14 **App Router** app: UI pages live under `app/**/page.tsx`, API endpoints under `app/api/**/route.ts`.
- Supabase is the single backend data store + auth. Most data access is via `lib/db.ts` (`db.*` helpers) and `lib/auth.ts` (client auth helpers).
- AI calls go through OpenRouter using the OpenAI SDK configured with `baseURL: https://openrouter.ai/api/v1` in `lib/ai/openrouter.ts`.
- Scheduled automation runs via Vercel Cron hitting `GET /api/cron` (see `vercel.json` + `app/api/cron/route.ts`).

## Auth/session conventions (important)
- App-wide auth state is provided by the client `AuthProvider` in `lib/AuthProvider.tsx`, mounted in `app/layout.tsx`.
- Middleware protects most routes and expects an **httpOnly cookie** named `sb-access-token` (see `middleware.ts`).
- Client login/registration uses `lib/auth.ts` and then syncs cookies via `POST /api/auth/session` using `lib/sessionCookie.ts`.
- When adding any new protected API route, follow the server-side pattern used in `app/api/posts/route.ts`:
  - `createServerComponentClient({ cookies })` → `auth.getUser()` → return 401 if missing
  - apply `eq('user_id', user.id)` (even if RLS exists) for user-scoped tables.

## Database conventions
- Prefer `db.*` helpers in `lib/db.ts` for CRUD + settings (e.g. `db.getSetting`, `db.updateSetting`, `db.getEnabledAutomationProfiles`).
- Use `handleSupabaseError` from `lib/db.ts` for consistent API error messages (see `app/api/posts/route.ts`).
- Admin vs public clients:
  - `supabase` is the anon client.
  - `supabaseAdmin` uses `SUPABASE_SERVICE_ROLE_KEY` when present; otherwise falls back to the anon client.

## AI/OpenRouter conventions
- Model selection is configurable via DB settings (e.g. `openrouter_model_content`, `openrouter_model_analysis`) in `lib/ai/openrouter.ts`.
- Content generation expects JSON responses; see `lib/ai/content.ts` `generateContent()` (JSON parsing with a fallback to raw text).
- Integration settings (enabled/key) are stored in `app_settings` and managed via `app/api/settings/integrations/openrouter/route.ts`.

## Cron/automation
- Cron auth: `app/api/cron/route.ts` checks `CRON_SECRET` (header `Authorization: Bearer …` or `?secret=`). If missing, it may fall back to DB setting `cron_secret`; in dev it can allow unauthenticated calls.
- Automation pipeline in cron route: profiles → account/niche → trend research (`lib/ai/trends`) → viral patterns (`db.getViralPatterns`) → generate content → predict score (`lib/utils/scoring`) → create post.

## Local dev & test workflows
- Common commands (from `package.json`):
  - `npm run dev` (Next dev server)
  - `npm test` / `npm run test:watch` / `npm run test:coverage`
- Jest uses `ts-jest` + `jsdom` and polyfills/mocks in `jest.setup.ts` (Supabase is mocked; Request/Response provided by `node-fetch`).
- Coverage intentionally excludes `lib/db.ts` and some SDK-bound modules (see `jest.config.js`). Don’t “fix” that unless the task requires it.

## Environment & integration points
- Canonical env var list is in `.env.example` (Supabase + OpenRouter + platform OAuth creds + `CRON_SECRET`).
- MCP tooling is configured in `mcp-settings.json` (Supabase/Vercel/GitHub) when available.

## PR-style expectations for changes
- Keep changes consistent with existing patterns: API routes return `{ success: boolean, data?/error? }` JSON and use `NextResponse.json`.
- Don’t introduce new auth flows: reuse `AuthProvider` + `/api/auth/session` cookie sync + `middleware.ts` behavior.
