# RoleScout migration in progress — DO NOT MODIFY

`app/lab/rolescout/*` and the related API routes (`app/api/parse-resume`, `app/api/generate-config`, `app/api/run-scraper`) are being migrated to a standalone repo at `~/dev/projects/rolescout` (live at getrolescout.com).

**Until migration is verified and the cleanup PR is approved:**
- Do NOT modify any files under `app/lab/rolescout/`
- Do NOT modify the three API routes listed above
- Do NOT modify `components/rolescout-sidebar.tsx` or `components/rolescout-beta-banner.tsx`
- Do NOT touch RoleScout-related env vars on Vercel

The full migration plan and decommissioning steps live in `~/dev/projects/rolescout/MIGRATION.md` (specifically §13 for the cleanup PR scope).

Other parts of michaophir-site are fine to work on normally.
