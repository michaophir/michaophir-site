"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import {
  getLastRunSummary,
  getOpenRolesCsv,
  getTrackingCsv,
  TRACKING_UPDATED_EVENT,
} from "./lib/storage";

// ---------- Types ----------

type LastRunSummary = {
  per_company?: Array<{ roles_total?: number }>;
  roles_fetched_post_filter?: number;
  match_score_stats?: { high_matches?: number; avg_score?: number };
  run_date?: string;
  companies_succeeded?: number;
  companies_total?: number;
};

type TrackingRow = {
  jobId: string;
  company: string;
  role: string;
  date: string;
  stage: string;
  state: string;
  nextAction: string;
  nextActionDate: string;
};

type AggregatedJob = {
  jobId: string;
  company: string;
  role: string;
  currentStage: string;
  state: string;
  nextAction: string;
  nextActionDate: string;
};

type OpenRole = {
  company: string;
  job_title: string;
  match_score: number | null;
  accepting_applications: string;
};

type DisplayMatch = { role: string; company: string; match: number };

type DisplayAction = {
  role: string;
  company: string;
  stage: string;
  action: string;
  date: string | null;
};

// ---------- Constants ----------

const DEMO_SOURCES = {
  openRolesCsv:
    "https://raw.githubusercontent.com/michaophir/rolescout-scraper/main/open_roles.csv",
  trackingCsv:
    "https://raw.githubusercontent.com/michaophir/rolescout-scraper/main/tracking_sheet.csv",
  lastRunSummary:
    "https://raw.githubusercontent.com/michaophir/rolescout-scraper/main/last_run_summary.json",
};

const STAGES = [
  "Saved",
  "Applied",
  "Recruiter Screen",
  "Hiring Manager",
  "Interview Loop",
  "Final Round",
  "Offer",
] as const;

// ---------- Parsing ----------

function parseTrackingCsv(csv: string): TrackingRow[] {
  const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
  const rows = result.data as Record<string, unknown>[];
  return rows.map((raw) => {
    const g = (k: string) => String(raw[k] ?? "").trim();
    const normalizeStage = (v: string) => (v === "Pre-Applied" ? "Saved" : v);
    return {
      jobId: g("Job ID"),
      company: g("Company"),
      role: g("Role"),
      date: g("Date"),
      stage: normalizeStage(g("Stage")),
      state: g("State"),
      nextAction: g("Next Action"),
      nextActionDate: g("Next Action Date"),
    };
  });
}

function aggregateJobs(rows: TrackingRow[]): AggregatedJob[] {
  const byJob = new Map<string, TrackingRow[]>();
  for (const row of rows) {
    if (!row.jobId) continue;
    const arr = byJob.get(row.jobId) ?? [];
    arr.push(row);
    byJob.set(row.jobId, arr);
  }
  const jobs: AggregatedJob[] = [];
  for (const events of byJob.values()) {
    const sorted = [...events].sort(
      (a, b) => toTime(a.date) - toTime(b.date)
    );
    let highestStageIdx = -1;
    let highestStage = "";
    for (const r of sorted) {
      if (r.stage === "Accepted") continue;
      const idx = STAGES.indexOf(r.stage as (typeof STAGES)[number]);
      if (idx > highestStageIdx) {
        highestStageIdx = idx;
        highestStage = r.stage;
      }
    }
    const latest = sorted[sorted.length - 1];
    let nextAction = "";
    let nextActionDate = "";
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].nextAction) {
        nextAction = sorted[i].nextAction;
        nextActionDate = sorted[i].nextActionDate;
        break;
      }
    }
    jobs.push({
      jobId: latest.jobId,
      company: latest.company,
      role: latest.role,
      currentStage: highestStage,
      state: latest.state ?? "",
      nextAction,
      nextActionDate,
    });
  }
  return jobs;
}

function toTime(date: string): number {
  const t = new Date(date).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function parseOpenRolesCsv(csv: string): OpenRole[] {
  const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
  const rows = result.data as Record<string, unknown>[];
  return rows.map((raw) => {
    const g = (k: string) => String(raw[k] ?? "").trim();
    const rawScore = g("match_score");
    const n = rawScore === "" ? null : Number(rawScore);
    return {
      company: g("company"),
      job_title: g("job_title"),
      match_score: n !== null && Number.isFinite(n) ? n : null,
      accepting_applications: g("accepting_applications"),
    };
  });
}

function parseSummary(json: string): LastRunSummary | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as LastRunSummary;
  } catch {
    return null;
  }
}

// ---------- Date formatting ----------

function parseLocalDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function formatShortDate(iso: string): string {
  const d = parseLocalDate(iso);
  if (!d) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatLongDate(iso: string): string {
  const d = parseLocalDate(iso);
  if (!d) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------- UI pieces ----------

function StatCard({
  icon,
  iconBg,
  iconColor,
  value,
  label,
  subValue,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  value: string | number;
  label: string;
  subValue?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div
        className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}
      >
        {icon}
      </div>
      <p className="text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
      {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
    </div>
  );
}

function IconSearch() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
    </svg>
  );
}

function IconFunnel() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  );
}

function IconStar() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.363 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.196-1.539-1.118l1.287-3.957a1 1 0 00-.363-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"
      />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="5" width="18" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7h18v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"
      />
    </svg>
  );
}

function IconPlayCircle() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 8l6 4-6 4V8z" />
    </svg>
  );
}

function IconCalendarCheck() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="5" width="18" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 3v4M8 3v4M3 10h18M9 15l2 2 4-4" />
    </svg>
  );
}

function IconBookmark() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" />
    </svg>
  );
}

function StarBadgeIcon() {
  return (
    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.363 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.196-1.539-1.118l1.287-3.957a1 1 0 00-.363-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
    </svg>
  );
}

// ---------- Component ----------

export default function DashboardClient() {
  const [summaryRaw, setSummaryRaw] = useState<string>("");
  const [trackingRaw, setTrackingRaw] = useState<string>("");
  const [openRolesRaw, setOpenRolesRaw] = useState<string>("");
  const [summaryIsDemo, setSummaryIsDemo] = useState<boolean>(false);
  const [trackingIsDemo, setTrackingIsDemo] = useState<boolean>(false);
  const [openRolesIsDemo, setOpenRolesIsDemo] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    const fetchDemo = (
      url: string,
      setRaw: (text: string) => void,
      setIsDemo: (v: boolean) => void
    ) => {
      setIsDemo(true);
      fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.text();
        })
        .then((text) => {
          if (cancelled) return;
          setRaw(text);
        })
        .catch(() => {
          // Fetch failed; panel renders its empty state.
        });
    };

    (async () => {
      const [savedSummary, savedTracking, savedOpenRoles] = await Promise.all([
        getLastRunSummary(),
        getTrackingCsv(),
        getOpenRolesCsv(),
      ]);
      if (cancelled) return;

      if (savedSummary) setSummaryRaw(savedSummary);
      if (savedTracking) setTrackingRaw(savedTracking);
      if (savedOpenRoles) setOpenRolesRaw(savedOpenRoles);

      if (!savedSummary) {
        fetchDemo(DEMO_SOURCES.lastRunSummary, setSummaryRaw, setSummaryIsDemo);
      }
      if (!savedTracking) {
        fetchDemo(DEMO_SOURCES.trackingCsv, setTrackingRaw, setTrackingIsDemo);
      }
      if (!savedOpenRoles) {
        fetchDemo(DEMO_SOURCES.openRolesCsv, setOpenRolesRaw, setOpenRolesIsDemo);
      }
    })();

    const refreshAll = async () => {
      if (cancelled) return;
      const [latestSummary, latestTracking, latestOpenRoles] =
        await Promise.all([
          getLastRunSummary(),
          getTrackingCsv(),
          getOpenRolesCsv(),
        ]);
      if (cancelled) return;
      if (latestSummary) {
        setSummaryRaw(latestSummary);
        setSummaryIsDemo(false);
      }
      if (latestTracking) {
        setTrackingRaw(latestTracking);
        setTrackingIsDemo(false);
      }
      if (latestOpenRoles) {
        setOpenRolesRaw(latestOpenRoles);
        setOpenRolesIsDemo(false);
      }
    };
    const onVisible = () => {
      if (!document.hidden) void refreshAll();
    };
    window.addEventListener(TRACKING_UPDATED_EVENT, refreshAll);
    window.addEventListener("rolescout-data-updated", refreshAll);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.removeEventListener(TRACKING_UPDATED_EVENT, refreshAll);
      window.removeEventListener("rolescout-data-updated", refreshAll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const summary = useMemo(() => parseSummary(summaryRaw), [summaryRaw]);
  const aggregatedJobs = useMemo(
    () => (trackingRaw ? aggregateJobs(parseTrackingCsv(trackingRaw)) : []),
    [trackingRaw]
  );
  const openRoles = useMemo(
    () => (openRolesRaw ? parseOpenRolesCsv(openRolesRaw) : []),
    [openRolesRaw]
  );

  const totalRolesScraped = useMemo(() => {
    if (!summary?.per_company) return null;
    return summary.per_company.reduce(
      (sum, c) => sum + (typeof c.roles_total === "number" ? c.roles_total : 0),
      0
    );
  }, [summary]);

  const hasSummary = summary !== null;
  const hasTracking = trackingRaw !== "";
  const hasOpenRoles = openRolesRaw !== "";
  const showDemoBanner = summaryIsDemo || trackingIsDemo || openRolesIsDemo;

  const totalApplications = aggregatedJobs.length;
  const activeCount = aggregatedJobs.filter((j) => j.state === "Active").length;
  const interviewCount = aggregatedJobs.filter(
    (j) => j.state === "Active" && j.currentStage.toLowerCase().includes("interview")
  ).length;
  const savedCount = aggregatedJobs.filter((j) => j.currentStage === "Saved").length;

  const topMatches: DisplayMatch[] = useMemo(() => {
    if (!hasOpenRoles) return [];
    return openRoles
      .filter((r) => r.accepting_applications !== "false")
      .filter((r) => r.match_score !== null)
      .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))
      .slice(0, 3)
      .map((r) => ({
        role: r.job_title,
        company: r.company,
        match: r.match_score ?? 0,
      }));
  }, [openRoles, hasOpenRoles]);

  const upcomingActions: DisplayAction[] = useMemo(() => {
    if (!hasTracking) return [];
    return aggregatedJobs
      .filter((j) => j.state === "Active" && j.nextAction)
      .sort((a, b) => {
        if (!a.nextActionDate) return 1;
        if (!b.nextActionDate) return -1;
        return a.nextActionDate.localeCompare(b.nextActionDate);
      })
      .slice(0, 4)
      .map((j) => ({
        role: j.role,
        company: j.company,
        stage: j.currentStage,
        action: j.nextAction,
        date: j.nextActionDate ? formatShortDate(j.nextActionDate) : null,
      }));
  }, [aggregatedJobs, hasTracking]);

  const runDateText = summary?.run_date
    ? `Last run: ${formatLongDate(summary.run_date)}`
    : "From your last scraper run";
  const topMatchesSubtitle = openRolesIsDemo
    ? `Demo data · ${runDateText}`
    : runDateText;

  const runDate = summary?.run_date ? new Date(summary.run_date) : null;
  const validRunDate = runDate && !isNaN(runDate.getTime()) ? runDate : null;
  const lastRunDateStr = validRunDate
    ? validRunDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "—";
  const lastRunTimeStr = validRunDate
    ? validRunDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  const sectionLabelClass =
    "text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3";

  return (
    <>
      {showDemoBanner && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>
            Viewing demo data —{" "}
            <a
              href="/lab/rolescout/settings"
              className="font-medium underline decoration-amber-400 underline-offset-2 hover:text-amber-700"
            >
              go to Settings
            </a>
            {" "}to upload your own files.
          </span>
        </div>
      )}

      {/* Row 1 — Scraper Stats */}
      <p className={sectionLabelClass}>Scraper — Last Run</p>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        <StatCard
          icon={<IconSearch />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          value={
            hasSummary && typeof totalRolesScraped === "number"
              ? totalRolesScraped.toLocaleString()
              : "—"
          }
          subValue={
            hasSummary &&
            typeof summary?.companies_succeeded === "number"
              ? `across ${summary.companies_succeeded} target companies`
              : undefined
          }
          label="Roles Found"
        />
        <StatCard
          icon={<IconFunnel />}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
          value={
            hasSummary && typeof summary?.roles_fetched_post_filter === "number"
              ? summary.roles_fetched_post_filter
              : "—"
          }
          label="After Filters"
        />
        <StatCard
          icon={<IconStar />}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          value={
            hasSummary && typeof summary?.match_score_stats?.high_matches === "number"
              ? summary.match_score_stats.high_matches
              : "—"
          }
          subValue={
            hasSummary &&
            typeof summary?.match_score_stats?.avg_score === "number"
              ? `avg score ${summary.match_score_stats.avg_score}`
              : undefined
          }
          label="High Matches"
        />
        <StatCard
          icon={<IconCalendar />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          value={lastRunDateStr}
          subValue={
            hasSummary
              ? `${lastRunTimeStr} · ${summary?.companies_succeeded ?? 0}/${summary?.companies_total ?? 0} companies`
              : undefined
          }
          label="Last Run"
        />
      </div>

      {/* Row 2 — Applications */}
      <p className={sectionLabelClass}>Applications</p>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        <StatCard
          icon={<IconBriefcase />}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
          value={hasTracking ? totalApplications : 0}
          label="Total Applications"
        />
        <StatCard
          icon={<IconPlayCircle />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          value={hasTracking ? activeCount : 0}
          label="Active"
        />
        <StatCard
          icon={<IconCalendarCheck />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          value={hasTracking ? interviewCount : 0}
          label="Interviews"
        />
        <StatCard
          icon={<IconBookmark />}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          value={hasTracking ? savedCount : 0}
          label="Saved"
        />
      </div>

      {/* Two panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-1 flex items-start justify-between">
            <h3 className="text-base font-semibold text-slate-900">Top Matches</h3>
            <a
              href="/lab/rolescout/review"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all &rarr;
            </a>
          </div>
          <p className="mb-5 text-xs text-gray-400">{topMatchesSubtitle}</p>
          <ul className="space-y-3">
            {topMatches.map((m) => (
              <li
                key={`${m.company}-${m.role}`}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{m.role}</p>
                  <p className="text-xs text-gray-500">{m.company}</p>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">
                  <StarBadgeIcon />
                  {m.match}%
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between">
            <h3 className="text-base font-semibold text-slate-900">Upcoming Actions</h3>
            <a
              href="/lab/rolescout/applications"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all &rarr;
            </a>
          </div>
          <ul className="space-y-4">
            {upcomingActions.map((a, i) => (
              <li
                key={`${a.company}-${a.role}-${i}`}
                className="flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{a.role}</p>
                  <p className="truncate text-xs text-gray-500">
                    {a.company} &middot; {a.stage}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-700">{a.action}</p>
                  {a.date && (
                    <p className="mt-0.5 flex items-center justify-end gap-1 text-xs text-gray-400">
                      <ClockIcon />
                      {a.date}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
