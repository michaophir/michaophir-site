"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { trackEvent } from "@/app/lib/analytics";
import {
  generateConfig,
  mergeProfileWithConfig,
  parseResume,
} from "../lib/api";
import {
  getAnthropicKey,
  getCandidateProfile,
  getLastRunSummary,
  getOpenRolesCsv,
  getResumeFilename,
  removeCandidateProfile,
  removeLastRunSummary,
  removeOpenRolesCsv,
  removeResumeFilename,
  setCandidateProfile,
  setLastRunSummary,
  setOpenRolesCsv,
  setResumeFilename,
} from "../lib/storage";
import { ONBOARDED_CHANGED_EVENT, ONBOARDED_KEY } from "../onboarding-redirect";

type StepIndex = 1 | 2 | 3 | 4;
type StepStatus = "idle" | "running" | "done" | "failed";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function CloudUploadIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 16a4 4 0 01-.88-7.9 5 5 0 019.71-1.95 5.5 5.5 0 012.17 10.61M12 12v9m-3-6l3-3 3 3"
      />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg
      className="h-4 w-4 text-gray-400 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 10-5.656-5.656l-6.586 6.586a6 6 0 108.486 8.486L20 13"
      />
    </svg>
  );
}

function StepDot({ status }: { status: StepStatus }) {
  if (status === "running") {
    return (
      <span className="inline-flex h-4 w-4 items-center justify-center">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-slate-700" />
      </span>
    );
  }
  if (status === "done") {
    return <span className="text-green-600" aria-hidden>✓</span>;
  }
  if (status === "failed") {
    return <span className="text-red-500" aria-hidden>✕</span>;
  }
  return <span className="text-gray-300" aria-hidden>○</span>;
}

type CandidateProfile = {
  name?: string;
  title?: string;
  location?: string;
  skills?: unknown;
  experience?: Array<{ start?: string; end?: string } & Record<string, unknown>>;
  target_companies?: unknown;
  role_filters?: unknown;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function yearsFromExperience(
  experience: Array<{ start?: string }> | undefined
): number | null {
  if (!experience || experience.length === 0) return null;
  const starts = experience
    .map((e) => parseInt(String(e.start ?? ""), 10))
    .filter((n) => Number.isFinite(n) && n > 1950 && n < 2100);
  if (starts.length === 0) return null;
  const min = Math.min(...starts);
  const now = new Date().getFullYear();
  return Math.max(0, now - min);
}

function floorToBucket(years: number): string {
  if (years < 1) return "<1 year";
  if (years < 3) return `${years} year${years === 1 ? "" : "s"}`;
  const bucket = Math.floor(years / 5) * 5;
  if (bucket === 0) return `${years} years`;
  return `${bucket}+ years`;
}

function PillGroup({
  label,
  items,
  total,
  maxShown,
  onMoreClick,
}: {
  label: string;
  items: string[];
  total: number;
  maxShown: number;
  onMoreClick?: () => void;
}) {
  const overflow = Math.max(0, total - maxShown);
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">
        {label} ({total})
      </p>
      <div className="flex flex-wrap gap-2">
        {items.slice(0, maxShown).map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-slate-700"
          >
            {item}
          </span>
        ))}
        {overflow > 0 && (
          <button
            type="button"
            onClick={onMoreClick}
            className="rounded-full px-3 py-1 text-xs text-blue-600 hover:text-blue-700"
          >
            +{overflow} more
          </button>
        )}
      </div>
    </div>
  );
}

function ProfileSummaryStep({
  profile,
}: {
  profile: CandidateProfile | null;
}) {
  if (!profile) {
    return (
      <p className="text-sm text-gray-500">
        Loading your profile…
      </p>
    );
  }

  const name = profile.name ?? "Unnamed";
  const title = profile.title ?? "";
  const location = profile.location ?? "";
  const years = yearsFromExperience(profile.experience);
  const skills = Array.isArray(profile.skills)
    ? (profile.skills as unknown[]).filter(
        (s): s is string => typeof s === "string"
      )
    : [];
  const companies = Array.isArray(profile.target_companies)
    ? (profile.target_companies as Array<Record<string, unknown>>)
        .map((c) => String(c.company_name ?? ""))
        .filter(Boolean)
    : [];
  const titleFilters = Array.isArray(profile.role_filters)
    ? (profile.role_filters as Array<Record<string, unknown>>)
        .filter((f) => f.field === "title")
        .map((f) => String(f.value ?? ""))
        .filter(Boolean)
    : [];

  const metaParts = [
    title,
    years !== null ? floorToBucket(years) : null,
    location,
  ].filter(Boolean);

  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
          {getInitials(name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {name}
          </p>
          {metaParts.length > 0 && (
            <p className="truncate text-xs text-gray-500">
              {metaParts.join(" · ")}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <PillGroup
          label="Skills detected"
          items={skills}
          total={skills.length}
          maxShown={6}
          onMoreClick={() => window.open("/lab/rolescout/profile", "_blank")}
        />
        <PillGroup
          label="Target companies"
          items={companies}
          total={companies.length}
          maxShown={6}
          onMoreClick={() => window.open("/lab/rolescout/profile", "_blank")}
        />
        <PillGroup
          label="Role filters"
          items={titleFilters}
          total={titleFilters.length}
          maxShown={4}
          onMoreClick={() => window.open("/lab/rolescout/profile", "_blank")}
        />
      </div>

    </>
  );
}

type RoleRow = {
  job_id: string;
  company: string;
  job_title: string;
  location: string;
  job_url: string;
  description: string;
  compensation_raw: string;
  match_score: number | null;
};

function parseRoleRow(raw: Record<string, unknown>): RoleRow {
  const g = (k: string) => String(raw[k] ?? "").trim();
  const ms = g("match_score");
  return {
    job_id: g("job_id"),
    company: g("company"),
    job_title: g("job_title"),
    location: g("location"),
    job_url: g("job_url"),
    description: g("description"),
    compensation_raw: g("compensation_raw"),
    match_score: (() => {
      if (ms === "") return null;
      const n = Number(ms);
      return Number.isFinite(n) ? n : null;
    })(),
  };
}

function formatCompShort(comp: string): string {
  const nums = comp.match(/[\d,]+/g);
  if (!nums || nums.length === 0) return "—";
  const parsed = nums.map((n) => Number(n.replace(/,/g, "")));
  const fmt = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`);
  if (parsed.length >= 2) return `${fmt(parsed[0])} - ${fmt(parsed[1])}`;
  return fmt(parsed[0]);
}

function RoleMiniCard({
  role,
  saved,
  onToggleSave,
}: {
  role: RoleRow;
  saved: boolean;
  onToggleSave: () => void;
}) {
  return (
    <Link
      href={`/lab/rolescout/review#job-${role.job_id}`}
      className={`flex flex-col justify-between rounded-xl border p-4 shadow-sm transition hover:shadow-md ${
        saved ? "border-blue-200 bg-blue-50/30" : "border-gray-100 bg-white"
      }`}
    >
      <div>
        <div className="mb-1 flex items-start justify-between">
          <div className="flex items-center gap-2">
            {role.match_score !== null && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                {role.match_score}
              </span>
            )}
            <p className="text-xs font-medium text-gray-400">{role.company}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSave();
            }}
            aria-label={saved ? "Unsave" : "Save role"}
            className={`transition ${
              saved ? "text-blue-600" : "text-gray-300 hover:text-blue-600"
            }`}
          >
            <BookmarkIconOutline className="h-4 w-4" />
          </button>
        </div>
        <h4 className="mb-2 text-sm font-semibold leading-snug text-slate-900">
          {role.job_title}
        </h4>
        <p className="line-clamp-2 text-xs leading-relaxed text-gray-500">
          {role.description}
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <span className="truncate">{role.location || "—"}</span>
        <span>{formatCompShort(role.compensation_raw)}</span>
      </div>
    </Link>
  );
}

function MatchesStep({
  active,
  totalTargetCompanies,
  onFirstRender,
}: {
  active: boolean;
  totalTargetCompanies: number;
  onFirstRender: () => void;
}) {
  const [topRoles, setTopRoles] = useState<RoleRow[] | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const firstSaveFiredRef = useRef(false);
  const firstRenderFiredRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    if (firstRenderFiredRef.current) return;
    firstRenderFiredRef.current = true;
    onFirstRender();
  }, [active, onFirstRender]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      const csv = await getOpenRolesCsv();
      if (cancelled || !csv) {
        setTopRoles([]);
        return;
      }
      const result = Papa.parse<Record<string, unknown>>(csv, {
        header: true,
        skipEmptyLines: true,
      });
      const rows = (result.data ?? []).map(parseRoleRow).filter((r) => r.job_id);
      const sorted = [...rows].sort((a, b) => {
        const aHas = a.match_score !== null;
        const bHas = b.match_score !== null;
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        if (!aHas && !bHas) return 0;
        return (b.match_score as number) - (a.match_score as number);
      });
      if (!cancelled) setTopRoles(sorted.slice(0, 3));
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      const wasSaved = next.has(id);
      if (wasSaved) next.delete(id);
      else {
        next.add(id);
        if (!firstSaveFiredRef.current) {
          firstSaveFiredRef.current = true;
          void trackEvent("onboarding_first_role_saved", {});
        }
      }
      return next;
    });
  };

  if (topRoles === null) {
    return <p className="text-sm text-gray-500">Loading matches…</p>;
  }

  return (
    <>
      {topRoles.length > 0 ? (
        <>
          <div className="mb-4 rounded-lg border border-green-100 bg-green-50/60 px-4 py-2.5 text-sm text-slate-700">
            Save the ones you like. Skip the rest, in the Discover Roles section.
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {topRoles.map((role) => (
              <RoleMiniCard
                key={role.job_id}
                role={role}
                saved={savedIds.has(role.job_id)}
                onToggleSave={() => toggleSave(role.job_id)}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm text-slate-700">
          No matches in this quick scout — try the full scout across all{" "}
          {totalTargetCompanies} companies for wider coverage.
        </div>
      )}

      <div className="mt-5 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
        <p className="text-sm font-medium text-slate-900">Want more matches?</p>
        <Link
          href="/lab/rolescout/scout"
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          Run the full scout across all target companies →
        </Link>
      </div>
    </>
  );
}

function RadarIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <path strokeLinecap="round" d="M12 12L4.5 4.5" />
    </svg>
  );
}

function BookmarkIconOutline({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z"
      />
    </svg>
  );
}

function InfoBubble({
  icon,
  title,
  body,
  onDismiss,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onDismiss: () => void;
}) {
  return (
    <div
      className="relative rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-700"
      style={{ animation: "slideDown 400ms ease-out both" }}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 text-gray-400 hover:text-slate-700 transition"
      >
        ×
      </button>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 text-blue-600">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{body}</p>
        </div>
      </div>
    </div>
  );
}

type ScanStatus = "idle" | "running" | "done" | "failed";

function QuickScanStep({
  profile,
  onStatusChange,
  onComplete,
}: {
  profile: CandidateProfile | null;
  onStatusChange: (status: ScanStatus, stats?: { roles: number; matches: number }) => void;
  onComplete: (stats: { roles: number; matches: number }) => void;
}) {
  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [runError, setRunError] = useState<string | null>(null);
  const [doneStats, setDoneStats] = useState<{ roles: number; matches: number } | null>(null);
  const [bubble1Open, setBubble1Open] = useState(false);
  const [bubble2Open, setBubble2Open] = useState(false);
  const terminalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (progress.length === 0) return;
    const el = terminalRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [progress]);

  useEffect(() => {
    if (!started) return;
    const t1 = window.setTimeout(() => setBubble1Open(true), 400);
    const t2 = window.setTimeout(() => setBubble2Open(true), 2800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [started]);

  const handleStart = () => {
    if (started || !profile) return;
    setStarted(true);
    void trackEvent("onboarding_scout_started", {});
    const filterCount = Array.isArray(profile.role_filters)
      ? (profile.role_filters as unknown[]).length
      : 0;
    const companyCount = Array.isArray(profile.target_companies)
      ? Math.min((profile.target_companies as unknown[]).length, 10)
      : 0;
    void trackEvent("scout_initiated", {
      filter_count: filterCount,
      company_count: companyCount,
    });
    void runScraper();
  };

  async function runScraper() {
    setProgress([]);
    setRunError(null);
    setDoneStats(null);
    onStatusChange("running");

    const targetCompanies = Array.isArray(profile?.target_companies)
      ? ((profile?.target_companies as unknown[]).slice(0, 10) as unknown)
      : [];
    const limitedProfile = {
      ...(profile as Record<string, unknown>),
      target_companies: targetCompanies,
    };

    try {
      const response = await fetch("/api/run-scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: limitedProfile }),
      });

      if (!response.ok) {
        const msg = "Scraper service unavailable. Try again later.";
        setRunError(msg);
        onStatusChange("failed");
        void trackEvent("scout_failed", {
          error_type: `HTTP ${response.status}`.slice(0, 100),
        });
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      const handleLine = async (line: string) => {
        if (!line.startsWith("data: ")) return;
        const raw = line.slice(6).trim();
        if (!raw) return;
        let event: {
          type?: string;
          message?: string;
          roles?: number;
          open_roles_csv?: string;
          last_run_summary?: unknown;
        };
        try {
          event = JSON.parse(raw);
        } catch {
          return;
        }

        if (event.type === "progress" && typeof event.message === "string") {
          const msg = event.message;
          setProgress((prev) => [...prev, msg]);
        }

        if (event.type === "done") {
          if (event.open_roles_csv) {
            await setOpenRolesCsv(event.open_roles_csv);
          }
          const summary = (event.last_run_summary ?? {}) as Record<string, unknown>;
          const tagged = { ...summary, scan_type: "quick" };
          await setLastRunSummary(JSON.stringify(tagged));

          const perCompany = Array.isArray(summary.per_company)
            ? (summary.per_company as Array<Record<string, unknown>>)
            : [];
          const rolesReturned = perCompany.reduce(
            (acc, c) =>
              acc + (typeof c.roles_total === "number" ? c.roles_total : 0),
            0
          );
          const rolesPostFilter =
            typeof summary.roles_fetched_post_filter === "number"
              ? summary.roles_fetched_post_filter
              : 0;

          const stats = { roles: rolesReturned, matches: rolesPostFilter };
          setDoneStats(stats);
          setProgress((prev) => [
            ...prev,
            `✓ Done! ${event.roles ?? rolesReturned} roles found.`,
          ]);
          window.dispatchEvent(new CustomEvent("rolescout-data-updated"));
          void trackEvent("onboarding_scout_completed", {
            roles_returned: rolesReturned,
            roles_post_filter: rolesPostFilter,
          });
          void trackEvent("scout_completed", {
            roles_returned: rolesReturned,
            roles_post_filter: rolesPostFilter,
          });
          onStatusChange("done", stats);
          window.setTimeout(() => onComplete(stats), 800);
        }

        if (event.type === "error" && typeof event.message === "string") {
          setRunError(event.message);
          onStatusChange("failed");
          void trackEvent("scout_failed", {
            error_type: event.message.slice(0, 100),
          });
        }
      };

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) await handleLine(line);
      }
      buffer += decoder.decode();
      if (buffer.length > 0) await handleLine(buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setRunError(message);
      onStatusChange("failed");
      void trackEvent("scout_failed", { error_type: message.slice(0, 100) });
    }
  }

  if (!started) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-gray-600">
          We&apos;ll scout the top 10 companies from your target list and
          surface roles that match your skills. Takes about a minute.
        </p>
        <button
          type="button"
          onClick={handleStart}
          disabled={!profile}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 transition disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          Run quick scout
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <div
          ref={terminalRef}
          className="h-56 overflow-y-auto rounded-lg bg-gray-950 p-3 font-mono text-[11px] text-green-400"
        >
          {progress.length === 0 ? (
            <p className="text-gray-500">Initializing scout…</p>
          ) : (
            progress.map((line, i) => <div key={i}>{line}</div>)
          )}
        </div>
        {runError && (
          <p className="mt-2 text-xs text-red-600">Failed — {runError}</p>
        )}
      </div>

      <div className="space-y-3">
        {bubble1Open && (
          <InfoBubble
            icon={<RadarIcon className="h-4 w-4" />}
            title="Scout is running"
            body="Scouting target companies for open roles matching your profile."
            onDismiss={() => setBubble1Open(false)}
          />
        )}
        {bubble2Open && (
          <InfoBubble
            icon={<BookmarkIconOutline className="h-4 w-4" />}
            title="Up next"
            body="When done, review open roles. Partial list here, complete list in Discover Roles."
            onDismiss={() => setBubble2Open(false)}
          />
        )}
      </div>
    </div>
  );
}

function CompletedUploadView({ filename }: { filename: string }) {
  return (
    <>
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <PaperclipIcon />
          <span className="truncate text-sm text-slate-900">
            {filename || "Resume on file"}
          </span>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 space-y-2">
        <div className="flex items-center gap-3 text-sm">
          <StepDot status="done" />
          <span className="text-slate-700">Resume parsed</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <StepDot status="done" />
          <span className="text-slate-700">
            Target companies &amp; role filters generated
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <StepDot status="done" />
          <span className="text-slate-700">
            Done — review your profile below
          </span>
        </div>
      </div>
    </>
  );
}

function ResumeUploadStep({
  onComplete,
  filename,
  setFilename,
}: {
  onComplete: () => void;
  filename: string;
  setFilename: (name: string) => void;
}) {
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parseStatus, setParseStatus] = useState<StepStatus>("idle");
  const [configStatus, setConfigStatus] = useState<StepStatus>("idle");
  const [parseError, setParseError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [parseRemaining, setParseRemaining] = useState<number | null>(null);
  const [configRemaining, setConfigRemaining] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setParseError("Unsupported file type. Upload a PDF.");
      setParseStatus("failed");
      return;
    }
    if (file.size > MAX_RESUME_BYTES) {
      setParseError(
        `File is ${formatBytes(file.size)} — limit is 5 MB. Try a smaller PDF.`
      );
      setParseStatus("failed");
      return;
    }

    setFilename(file.name);
    setFileSize(file.size);
    setResumeFilename(file.name);
    setParseStatus("running");
    setConfigStatus("idle");
    setParseError(null);
    setConfigError(null);

    const apiKey = getAnthropicKey() || null;

    let parsed: unknown;
    try {
      const result = await parseResume(file, apiKey);
      parsed = result.profile;
      setParseRemaining(result.remaining);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setParseError(message);
      setParseStatus("failed");
      void trackEvent("resume_parse_failed", {
        error_type: message.slice(0, 100),
      });
      return;
    }

    setParseStatus("done");
    await setCandidateProfile(JSON.stringify(parsed));
    void trackEvent("onboarding_resume_uploaded", {});

    setConfigStatus("running");
    try {
      const { config, remaining } = await generateConfig(parsed, apiKey);
      setConfigRemaining(remaining);
      const merged = mergeProfileWithConfig(parsed, config);
      await setCandidateProfile(JSON.stringify(merged));
      setConfigStatus("done");
      void trackEvent("onboarding_config_generated", {});
      const skillsCount = Array.isArray(
        (merged as Record<string, unknown>).skills
      )
        ? ((merged as Record<string, unknown>).skills as unknown[]).length
        : 0;
      const companiesCount = Array.isArray(
        (merged as Record<string, unknown>).target_companies
      )
        ? (
            (merged as Record<string, unknown>).target_companies as unknown[]
          ).length
        : 0;
      void trackEvent("resume_uploaded", {
        skills_extracted: skillsCount,
        target_companies: companiesCount,
      });
      window.setTimeout(onComplete, 600);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setConfigError(message);
      setConfigStatus("failed");
      void trackEvent("config_generation_failed", {
        error_type: message.slice(0, 100),
      });
    }
  }

  async function retryConfig() {
    setConfigStatus("running");
    setConfigError(null);
    const apiKey = getAnthropicKey() || null;
    try {
      const stored = await (
        await import("../lib/storage")
      ).getCandidateProfile();
      const base = stored ? JSON.parse(stored) : {};
      const { config, remaining } = await generateConfig(base, apiKey);
      setConfigRemaining(remaining);
      const merged = mergeProfileWithConfig(base, config);
      await setCandidateProfile(JSON.stringify(merged));
      setConfigStatus("done");
      void trackEvent("onboarding_config_generated", {});
      const skillsCount = Array.isArray(
        (merged as Record<string, unknown>).skills
      )
        ? ((merged as Record<string, unknown>).skills as unknown[]).length
        : 0;
      const companiesCount = Array.isArray(
        (merged as Record<string, unknown>).target_companies
      )
        ? (
            (merged as Record<string, unknown>).target_companies as unknown[]
          ).length
        : 0;
      void trackEvent("resume_uploaded", {
        skills_extracted: skillsCount,
        target_companies: companiesCount,
      });
      window.setTimeout(onComplete, 600);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setConfigError(message);
      setConfigStatus("failed");
    }
  }

  function onBrowseClick() {
    fileInputRef.current?.click();
  }
  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
    e.target.value = "";
  }
  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  }
  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }
  function onDragLeave() {
    setIsDragging(false);
  }

  const hasFile = filename !== "" && parseStatus !== "idle";
  const rateLimitHit = parseRemaining === 0 || configRemaining === 0;
  const parseFailedRateLimit =
    parseStatus === "failed" &&
    (parseError ?? "").toLowerCase().includes("rate");

  return (
    <>
      {!hasFile ? (
        <>
          <p className="mb-4 text-sm text-gray-600">
            We&apos;ll extract your skills, build your candidate profile, and
            generate your target companies.
          </p>
          <div
            className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
              isDragging
                ? "border-slate-400 bg-gray-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <CloudUploadIcon className="h-5 w-5" />
            </div>
            <p className="text-sm text-slate-700">
              Drop your resume here, or{" "}
              <button
                type="button"
                onClick={onBrowseClick}
                className="font-medium text-blue-600 underline-offset-2 hover:underline"
              >
                click to browse
              </button>
            </p>
            <p className="mt-2 text-xs text-gray-400">PDF, up to 5MB</p>
          </div>
          <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-slate-600">
            No Resume handy? On LinkedIn, click{" "}
            <span className="font-medium">More → Save to PDF</span> from your
            profile and upload.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={onFileInputChange}
            className="hidden"
          />
        </>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <PaperclipIcon />
              <span className="truncate text-sm text-slate-900">
                {filename}
              </span>
              {fileSize !== null && (
                <span className="text-xs text-gray-400">
                  · {formatBytes(fileSize)}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <StepDot status={parseStatus} />
              <span className={parseStatus === "failed" ? "text-red-600" : "text-slate-700"}>
                {parseStatus === "running" && "Parsing resume…"}
                {parseStatus === "done" && "Resume parsed"}
                {parseStatus === "failed" &&
                  (parseError
                    ? `Resume parsing failed — ${parseError}`
                    : "Resume parsing failed")}
              </span>
            </div>
            <div
              className={`flex items-center gap-3 text-sm ${
                parseStatus === "failed" ? "opacity-40" : ""
              }`}
            >
              <StepDot
                status={parseStatus === "failed" ? "idle" : configStatus}
              />
              <span
                className={configStatus === "failed" ? "text-red-600" : "text-slate-700"}
              >
                {configStatus === "running" &&
                  "Generating target companies & role filters…"}
                {configStatus === "done" &&
                  "Target companies & role filters generated"}
                {configStatus === "failed" &&
                  "Config generation failed — your profile is saved"}
                {configStatus === "idle" &&
                  "Target companies & role filters generated"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <StepDot
                status={
                  parseStatus === "done" && configStatus === "done"
                    ? "done"
                    : "idle"
                }
              />
              <span className="text-slate-700">
                {parseStatus === "done" && configStatus === "done"
                  ? "Done — review your profile below"
                  : "Done"}
              </span>
            </div>
          </div>

          {(parseRemaining !== null || configRemaining !== null) && (
            <p
              className={`mt-2 text-xs ${
                rateLimitHit ? "text-amber-600" : "text-gray-400"
              }`}
            >
              {rateLimitHit
                ? "Free limit reached — add your Anthropic key in Settings for unlimited runs."
                : `${parseRemaining ?? "—"} free parse${
                    parseRemaining === 1 ? "" : "s"
                  } remaining · ${configRemaining ?? "—"} free config${
                    configRemaining === 1 ? "" : "s"
                  } remaining today.`}
            </p>
          )}

          {(parseStatus === "failed" || configStatus === "failed") && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  configStatus === "failed"
                    ? void retryConfig()
                    : fileInputRef.current?.click()
                }
                className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 transition"
              >
                {configStatus === "failed" ? "Retry" : "Try again"}
              </button>
              {(parseFailedRateLimit || rateLimitHit) && (
                <Link
                  href="/lab/rolescout/settings"
                  className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-gray-50 transition"
                >
                  Use BYOK key from Settings
                </Link>
              )}
              {configError && (
                <p className="w-full text-xs text-gray-500">{configError}</p>
              )}
            </div>
          )}

          {parseStatus === "failed" && (
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={onFileInputChange}
              className="hidden"
            />
          )}
        </>
      )}
    </>
  );
}

function StepHeader({ activeStep }: { activeStep: StepIndex }) {
  return (
    <div className="mb-6 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/60 px-5 py-3 text-sm text-slate-700">
      <span>
        <span className="font-medium text-slate-900">Quick start</span>
        <span className="mx-2 text-slate-300">·</span>
        About 1 minute to your first roles
      </span>
      <span className="text-slate-500">
        <span className="font-medium text-slate-900">
          Step {activeStep} of 4
        </span>
      </span>
    </div>
  );
}

function SectionShell({
  index,
  active,
  expanded,
  onToggle,
  title,
  icon,
  rightSlot,
  collapsedSummary,
  children,
}: {
  index: StepIndex;
  active: boolean;
  expanded: boolean;
  onToggle: () => void;
  title: string;
  icon: React.ReactNode;
  rightSlot?: React.ReactNode;
  collapsedSummary?: React.ReactNode;
  children: React.ReactNode;
}) {
  const anchorId = `onboarding-section-${index}`;

  if (!expanded) {
    return (
      <button
        id={anchorId}
        type="button"
        onClick={onToggle}
        className="mb-2.5 flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3 text-left text-xs text-gray-500 transition hover:border-gray-300"
      >
        <span className="flex items-center gap-2">
          <span className="text-gray-400">{index}.</span>
          <span className="font-medium text-slate-700">{title}</span>
        </span>
        {collapsedSummary && (
          <span className="font-mono text-[11px] text-gray-400 truncate ml-4">
            {collapsedSummary}
          </span>
        )}
      </button>
    );
  }

  return (
    <section
      id={anchorId}
      className={`mb-2.5 rounded-xl border bg-white px-6 py-5 transition ${
        active ? "border-gray-200 shadow-sm" : "border-gray-100"
      }`}
      style={{
        animation: active
          ? "slideDown 500ms ease-out both"
          : undefined,
      }}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <span className="text-gray-400">{icon}</span>
          <span>{title}</span>
        </div>
        {rightSlot && <div className="text-xs text-slate-600">{rightSlot}</div>}
      </div>
      {children}
    </section>
  );
}

export default function StartClient() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<StepIndex>(1);
  const [override, setOverride] = useState<Map<StepIndex, boolean>>(new Map());
  const [filename, setFilename] = useState<string>("");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scanStats, setScanStats] = useState<{ roles: number; matches: number } | null>(null);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);

  useEffect(() => {
    void trackEvent("onboarding_started", {});
  }, []);

  const prevStepRef = useRef<StepIndex>(1);
  useEffect(() => {
    if (prevStepRef.current === activeStep) return;
    prevStepRef.current = activeStep;
    const el = document.getElementById(`onboarding-section-${activeStep}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeStep]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fresh =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("fresh") === "1";

      if (fresh) {
        await Promise.all([
          removeCandidateProfile(),
          removeOpenRolesCsv(),
          removeLastRunSummary(),
        ]);
        removeResumeFilename();
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", "/lab/rolescout/start");
        }
        if (!cancelled) setRestoredFromStorage(true);
        return;
      }

      const storedFilename = getResumeFilename();
      if (!cancelled && storedFilename) setFilename(storedFilename);

      const profileJson = await getCandidateProfile();
      if (cancelled) return;

      if (!profileJson) {
        setRestoredFromStorage(true);
        return;
      }

      let parsedProfile: CandidateProfile | null = null;
      try {
        parsedProfile = JSON.parse(profileJson) as CandidateProfile;
      } catch {
        parsedProfile = null;
      }

      if (!parsedProfile) {
        setRestoredFromStorage(true);
        return;
      }

      setProfile(parsedProfile);

      const csv = await getOpenRolesCsv();
      if (cancelled) return;

      if (csv && csv.trim().length > 0) {
        const summaryJson = await getLastRunSummary();
        if (cancelled) return;
        if (summaryJson) {
          try {
            const summary = JSON.parse(summaryJson) as Record<string, unknown>;
            const perCompany = Array.isArray(summary.per_company)
              ? (summary.per_company as Array<Record<string, unknown>>)
              : [];
            const roles = perCompany.reduce(
              (acc, c) =>
                acc + (typeof c.roles_total === "number" ? c.roles_total : 0),
              0
            );
            const matches =
              typeof summary.roles_fetched_post_filter === "number"
                ? summary.roles_fetched_post_filter
                : 0;
            setScanStats({ roles, matches });
            setScanStatus("done");
          } catch {
            // ignore parse error
          }
        }
        setActiveStep(4);
      } else {
        setActiveStep(3);
      }

      setRestoredFromStorage(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeStep < 2 || profile !== null) return;
    let cancelled = false;
    (async () => {
      const stored = await getCandidateProfile();
      if (cancelled || !stored) return;
      try {
        setProfile(JSON.parse(stored) as CandidateProfile);
      } catch {
        setProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeStep, profile]);

  const autoAdvancedToScanRef = useRef(false);
  useEffect(() => {
    if (activeStep !== 2 || !profile || autoAdvancedToScanRef.current) return;
    autoAdvancedToScanRef.current = true;
    const t = window.setTimeout(() => setActiveStep(3), 1500);
    return () => window.clearTimeout(t);
  }, [activeStep, profile]);

  const handleSection4FirstRender = () => {
    if (typeof window === "undefined") return;
    const alreadyOnboarded =
      window.localStorage.getItem(ONBOARDED_KEY) === "true";
    window.localStorage.setItem(ONBOARDED_KEY, "true");
    window.dispatchEvent(new CustomEvent(ONBOARDED_CHANGED_EVENT));
    if (!alreadyOnboarded) {
      const matches = scanStats?.matches ?? 0;
      void trackEvent("onboarding_completed", { matches });
    }
  };

  const totalTargetCompanies = Array.isArray(profile?.target_companies)
    ? (profile?.target_companies as unknown[]).length
    : 0;

  const flowComplete = activeStep === 4;

  const defaultExpanded = (step: StepIndex): boolean =>
    step >= ((activeStep - 2) as StepIndex) && step <= activeStep;

  const isExpanded = (step: StepIndex): boolean =>
    override.get(step) ?? defaultExpanded(step);

  const toggle = (step: StepIndex) => {
    setOverride((prev) => {
      const next = new Map(prev);
      next.set(step, !isExpanded(step));
      return next;
    });
  };

  const handleSkip = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ONBOARDED_KEY, "true");
      window.dispatchEvent(new CustomEvent(ONBOARDED_CHANGED_EVENT));
    }
    void trackEvent("onboarding_skipped", {});
    router.replace("/lab/rolescout");
  };

  return (
    <div className="mx-auto max-w-3xl">
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={handleSkip}
          className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:border-gray-300 hover:bg-gray-50 transition"
        >
          Skip to dashboard
        </button>
      </div>

      <StepHeader activeStep={activeStep} />

      <SectionShell
        index={1}
        active={activeStep === 1}
        expanded={isExpanded(1)}
        onToggle={() => toggle(1)}
        title="Upload your resume"
        icon={<CloudUploadIcon />}
        rightSlot={
          flowComplete ? (
            <Link href="/lab/rolescout/profile" className="text-blue-600 hover:text-blue-700">
              Profile &amp; Skills →
            </Link>
          ) : undefined
        }
        collapsedSummary={filename ? `${filename} · parsed` : undefined}
      >
        {restoredFromStorage && profile ? (
          <CompletedUploadView filename={filename} />
        ) : (
          <ResumeUploadStep
            onComplete={() => setActiveStep(2)}
            filename={filename}
            setFilename={setFilename}
          />
        )}
      </SectionShell>

      <SectionShell
        index={2}
        active={activeStep === 2}
        expanded={isExpanded(2)}
        onToggle={() => toggle(2)}
        title="Your profile & Skills"
        icon={<span className="text-green-600">✓</span>}
        rightSlot={
          flowComplete ? (
            <Link href="/lab/rolescout/profile" className="text-blue-600 hover:text-blue-700">
              Edit in Profile &amp; Skills →
            </Link>
          ) : undefined
        }
        collapsedSummary={
          profile
            ? `${profile.name ?? "—"} · ${profile.title ?? "—"}${
                (() => {
                  const y = yearsFromExperience(profile.experience);
                  return y !== null ? ` · ${y}y` : "";
                })()
              } · ${
                Array.isArray(profile.target_companies)
                  ? (profile.target_companies as unknown[]).length
                  : 0
              } companies · ${
                Array.isArray(profile.role_filters)
                  ? (profile.role_filters as unknown[]).length
                  : 0
              } filters`
            : undefined
        }
      >
        <ProfileSummaryStep profile={profile} />
      </SectionShell>

      <SectionShell
        index={3}
        active={activeStep === 3}
        expanded={isExpanded(3)}
        onToggle={() => toggle(3)}
        title="Quick scout · top 10 companies"
        icon={<RadarIcon />}
        rightSlot={
          scanStatus === "running" ? (
            <span className="text-gray-500">Running…</span>
          ) : scanStatus === "done" && scanStats ? (
            <span className="text-slate-700">
              Done · {scanStats.roles} roles · {scanStats.matches} matches
            </span>
          ) : scanStatus === "failed" ? (
            <span className="text-red-600">Failed</span>
          ) : (
            <span className="text-gray-400">Pending</span>
          )
        }
        collapsedSummary={
          scanStats
            ? `10 companies scouted · ${scanStats.roles} roles found`
            : undefined
        }
      >
        <QuickScanStep
          profile={profile}
          onStatusChange={(status, stats) => {
            setScanStatus(status);
            if (stats) setScanStats(stats);
          }}
          onComplete={(stats) => {
            setScanStats(stats);
            setActiveStep(4);
          }}
        />
      </SectionShell>

      <SectionShell
        index={4}
        active={activeStep === 4}
        expanded={isExpanded(4)}
        onToggle={() => toggle(4)}
        title={`Found ${scanStats?.matches ?? 0} matches`}
        icon={<span className="text-green-600">✓</span>}
        rightSlot={
          <Link href="/lab/rolescout/review" className="text-blue-600 hover:text-blue-700">
            See all in Discover Roles →
          </Link>
        }
        collapsedSummary={
          scanStats ? `${scanStats.matches} matches surfaced` : undefined
        }
      >
        <MatchesStep
          active={activeStep === 4}
          totalTargetCompanies={totalTargetCompanies}
          onFirstRender={handleSection4FirstRender}
        />
      </SectionShell>
    </div>
  );
}
