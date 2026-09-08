# NerdCode

NerdCode teaches data structures and algorithms through the real systems they
power. The closed-beta MVP contains 12 original Python problems, real-world
analogies, progressive hints, browser-based sample runs, hidden-test
submissions, submission history, and saved progress.

## Stack

- Next.js 16, React 19, TypeScript, Tailwind CSS, and Clerk
- Cloudflare Workers through OpenNext
- Cloudflare D1 for progress and submission metadata
- Pyodide in a dedicated Web Worker for unlimited local sample runs
- OneCompiler batch execution for server-verified hidden tests

Hidden inputs and expected values stay in server-only modules. Submitted Python
is never evaluated inside the Cloudflare Worker.

The browser runner handles only learner-authored code and public cases. It
removes Pyodide's JavaScript bridges and browser capabilities as defense in
depth, but it is not the judging trust boundary; hidden data and credentials
remain server-side.

## Theming

Routine palette, status, dark-mode, radius, shadow, Clerk, and code-editor
changes live in `src/app/globals.css`. Font sources are loaded once in
`src/app/layout.tsx`; keep the `--app-font-sans` and `--app-font-mono` aliases
stable when swapping fonts. A theme contract test rejects named Tailwind color
utilities in UI code so new components keep using the shared semantic tokens.

## Prerequisites

- Node.js 22 or newer and npm 11
- Chrome, Chromium, or Edge for the real-browser Pyodide release test
- A Clerk application configured for an invitation-only beta
- A Cloudflare account with Workers and D1
- A OneCompiler API or RapidAPI subscription

## Local setup

1. Install the locked dependency tree with `npm ci`.
2. Copy `.env.example` to `.env.local` and add both Clerk values. Next.js and
   the OpenNext build read the publishable key from `process.env`.
3. Copy `.dev.vars.example` to `.dev.vars`. Add the Clerk secret again plus the
   OneCompiler URL, API key, and optional RapidAPI host. These values are read
   from the local Cloudflare runtime bindings.
4. Create the database with `npx wrangler d1 create nerd-code` and replace the
   placeholder `database_id` in `wrangler.jsonc`.
5. Replace rate-limit namespace `1001` with a positive integer unique to your
   Cloudflare account.
6. Apply the local schema with `npm run db:migrate:local`.
7. Start the development server with `npm run dev`.

Use `npm run preview` when testing the production Worker runtime locally.
`next start` is intentionally not provided because it has no D1 or Cloudflare
rate-limit bindings.

The browser test detects common Chrome and Edge installations. Set
`CHROME_PATH` when the executable lives elsewhere.

## Production configuration

Before building, provide these build variables:

```text
NEXTJS_ENV=production
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
```

Configure `ONECOMPILER_API_URL` and, for RapidAPI,
`ONECOMPILER_API_HOST` as Worker text variables. Configure the credentials as
Worker secrets:

```text
npx wrangler secret put CLERK_SECRET_KEY
npx wrangler secret put ONECOMPILER_API_KEY
```

`keep_vars` is enabled so a Wrangler deploy does not erase text variables
managed in the Cloudflare dashboard. Then:

1. Apply the production schema with `npm run db:migrate:remote`.
2. Run `npm run verify`.
3. Deploy with `npm run deploy`.
4. In Clerk, add the deployed domain and callback URLs, enable only the OAuth
   providers shown in the UI, and keep public account creation restricted.
5. Smoke-test email and every OAuth provider, return-to-problem navigation,
   an accepted solution, a wrong solution, quota responses, and judge failure.
6. Inspect Worker observability for CPU-limit errors. The dry-run upload emitted
   by `npm run verify` must remain below Cloudflare's 64 MiB uncompressed Worker
   limit.

## Commands

```text
npm run dev                 Next.js development server
npm run lint                Biome formatting and lint checks
npm run typecheck           Strict TypeScript check
npm test                    Unit tests plus isolated D1 integration tests
npm run test:browser        Real-browser Pyodide runner and timeout smoke test
npm run check               Biome, TypeScript, and all local tests
npm run build               Next.js production build
npm run build:worker        Cloudflare/OpenNext build
npm run verify              Full local release gate and Worker dry run
npm run preview             Local Workers-runtime preview
npm run cf-typegen          Refresh tracked Cloudflare binding/runtime types
npm run db:migrate:local    Apply migrations to local D1
npm run db:migrate:remote   Apply migrations to remote D1
npm run deploy              Deploy to Cloudflare Workers
npm run test:judge:release  Opt-in real OneCompiler curriculum verification
```

The real-judge verification is deliberately excluded from `npm test` because
it consumes provider quota. Set `RUN_REAL_JUDGE=1`, `ONECOMPILER_API_URL`,
`ONECOMPILER_API_KEY`, and optionally `ONECOMPILER_API_HOST` in the shell before
running it. It sends every reference solution and a representative wrong
solution through all 12 hidden-test batches.

The MVP is Python-only. Browser sample runs are unlimited after sign-in; hidden
submissions have a three-per-minute fast limit and a hard five-per-user UTC-day
allowance. JDoodle is the documented next judge candidate, but provider
failover is intentionally deferred until beta usage justifies it.
