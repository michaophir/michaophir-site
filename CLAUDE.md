# michaophir.com

Personal site + Lab index. RoleScout has been extracted to its own repo — see below.

## RoleScout — pending cleanup

RoleScout is now live and independent at [getrolescout.com](https://www.getrolescout.com) (repo: `github.com/michaophir/rolescout`, local: `~/dev/projects/rolescout`).

The following files still exist in this repo but are scheduled for removal in an upcoming cleanup PR:

- `app/lab/rolescout/*`
- `app/api/parse-resume`, `app/api/generate-config`, `app/api/run-scraper`
- `components/rolescout-sidebar.tsx`, `components/rolescout-beta-banner.tsx`

The cleanup PR will also:

- Add 301 redirects from `/lab/rolescout` and `/lab/rolescout/:path*` → `https://www.getrolescout.com/...` in `next.config.mjs`
- Drop `@anthropic-ai/sdk`, `@upstash/redis`, `idb-keyval`, `papaparse` from `package.json` (plus their `@types/*`)
- Remove RoleScout-related env vars from the Vercel project (`ANTHROPIC_API_KEY`, `RAILWAY_SCRAPER_URL`, Upstash `KV_*` if unused elsewhere)

Full context of the extraction lives in `~/dev/projects/rolescout/MIGRATION.md` §13.

**Until that PR lands, don't edit the files listed above** — no point, they're going away.

## Structure

- `app/page.tsx` — homepage (uses `components/hero.tsx`, `components/lab.tsx`, `components/footer.tsx`)
- `app/lab/page.tsx` — dedicated Lab index page
- `components/navbar.tsx` — shared nav
- Project cards data is duplicated in **two places** — `components/lab.tsx` (homepage) AND `app/lab/page.tsx` (dedicated /lab page). Keep both in sync when adding or updating projects.

## Deploy

Vercel auto-deploys `main` to production. No staging branch convention.
