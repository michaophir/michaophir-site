"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { getOpenRolesCsv } from "../lib/storage";

const DEMO_CSV_URL =
  "https://raw.githubusercontent.com/michaophir/sandbox/main/open_roles.csv";

type Job = {
  job_id: string;
  company: string;
  job_title: string;
  location: string;
  remote: string;
  workplace_type: string;
  department: string;
  date_posted: string;
  accepting_applications: string;
  job_url: string;
  last_seen: string;
  description: string;
  compensation_raw: string;
  tier: number;
  match_score: number | null;
};

type WorkplacePill = "Remote" | "Hybrid" | "Onsite";
type DatePill = "today" | "week";
type Action = "save" | "pass";

function parseRow(raw: Record<string, unknown>): Job {
  const g = (k: string) => String(raw[k] ?? "").trim();
  return {
    job_id: g("job_id"),
    company: g("company"),
    job_title: g("job_title"),
    location: g("location"),
    remote: g("remote"),
    workplace_type: g("workplace_type"),
    department: g("department"),
    date_posted: g("date_posted"),
    accepting_applications: g("accepting_applications"),
    job_url: g("job_url"),
    last_seen: g("last_seen"),
    description: g("description"),
    compensation_raw: g("compensation_raw"),
    tier: Number(g("tier")) || 999,
    match_score: (() => {
      const raw = g("match_score");
      if (raw === "") return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    })(),
  };
}

function parseCompMidpoint(comp: string): number {
  const nums = comp.match(/[\d,]+/g);
  if (!nums || nums.length === 0) return 0;
  const parsed = nums.map((n) => Number(n.replace(/,/g, "")));
  if (parsed.length >= 2) return (parsed[0] + parsed[1]) / 2;
  return parsed[0];
}

function formatCompShort(comp: string): string {
  const nums = comp.match(/[\d,]+/g);
  if (!nums || nums.length === 0) return "—";
  const parsed = nums.map((n) => Number(n.replace(/,/g, "")));
  const fmt = (n: number) => {
    if (n >= 1000) return `$${Math.round(n / 1000)}K`;
    return `$${n}`;
  };
  if (parsed.length >= 2) return `${fmt(parsed[0])} - ${fmt(parsed[1])}`;
  return fmt(parsed[0]);
}

function isWithinLastWeek(dateStr: string): boolean {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return d >= weekAgo;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

const WORKPLACE_PILLS: { value: WorkplacePill; label: string }[] = [
  { value: "Remote", label: "Remote" },
  { value: "Hybrid", label: "Hybrid" },
  { value: "Onsite", label: "Onsite" },
];
const DATE_PILLS: { value: DatePill; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
];

// ---------- Components ----------

function FilterBar({
  activeWorkplace,
  activeDates,
  toggle,
  clearAll,
}: {
  activeWorkplace: Set<WorkplacePill>;
  activeDates: Set<DatePill>;
  toggle: (pill: WorkplacePill | DatePill) => void;
  clearAll: () => void;
}) {
  const noneActive = activeWorkplace.size === 0 && activeDates.size === 0;

  const pill = (
    label: string,
    active: boolean,
    onClick: () => void
  ) => (
    <button
      key={label}
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-slate-900 text-white"
          : "bg-white text-gray-600 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pill("All", noneActive, clearAll)}
      {WORKPLACE_PILLS.map((p) =>
        pill(p.label, activeWorkplace.has(p.value), () => toggle(p.value))
      )}
      {DATE_PILLS.map((p) =>
        pill(p.label, activeDates.has(p.value), () => toggle(p.value))
      )}
    </div>
  );
}

function ActionButtons({
  jobId,
  actions,
  onAction,
}: {
  jobId: string;
  actions: Record<string, Action>;
  onAction: (id: string, a: Action) => void;
}) {
  const current = actions[jobId];
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAction(jobId, "save");
        }}
        className={`text-sm font-semibold transition ${
          current === "save"
            ? "text-emerald-600 scale-110"
            : "text-emerald-500 opacity-60 hover:opacity-100"
        }`}
        title="Save"
      >
        ✓
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAction(jobId, "pass");
        }}
        className={`text-sm font-semibold transition ${
          current === "pass"
            ? "text-red-500 scale-110"
            : "text-red-400 opacity-60 hover:opacity-100"
        }`}
        title="Pass"
      >
        ✗
      </button>
    </div>
  );
}

function JobCard({
  job,
  actions,
  onAction,
  showMatchScore,
}: {
  job: Job;
  actions: Record<string, Action>;
  onAction: (id: string, a: Action) => void;
  showMatchScore?: boolean;
}) {
  const state = actions[job.job_id];
  const isSaved = state === "save";
  const isPassed = state === "pass";

  return (
    <div
      className={`flex flex-col justify-between rounded-xl border p-5 shadow-sm transition hover:shadow-md ${
        isSaved
          ? "border-emerald-300 bg-white"
          : isPassed
          ? "border-gray-200 bg-gray-50 opacity-50"
          : "border-gray-100 bg-white"
      }`}
    >
      <div>
        <div className="mb-1 flex items-start justify-between">
          <div className="flex items-center gap-2">
            {showMatchScore && job.match_score !== null && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                {job.match_score}
              </span>
            )}
            <p className="text-xs font-medium text-gray-400">{job.company}</p>
          </div>
          <ActionButtons jobId={job.job_id} actions={actions} onAction={onAction} />
        </div>
        <h3 className="mb-2 text-[15px] font-semibold leading-snug text-slate-900">
          {job.job_title}
        </h3>
        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-500">
          {job.description}
        </p>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {job.location || "—"}
          </span>
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            {formatCompShort(job.compensation_raw)}
          </span>
        </div>
        {job.job_url && (
          <a
            href={job.job_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            View&nbsp;↗
          </a>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500">
      {title}
    </h2>
  );
}

function CardGrid({
  title,
  jobs,
  actions,
  onAction,
  showMatchScore,
}: {
  title: string;
  jobs: Job[];
  actions: Record<string, Action>;
  onAction: (id: string, a: Action) => void;
  showMatchScore?: boolean;
}) {
  if (jobs.length === 0) return null;
  return (
    <section className="mb-10">
      <SectionHeader title={title} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <JobCard
            key={job.job_id}
            job={job}
            actions={actions}
            onAction={onAction}
            showMatchScore={showMatchScore}
          />
        ))}
      </div>
    </section>
  );
}

function DescriptionTooltip({ text }: { text: string }) {
  return (
    <td className="px-5 py-3 text-gray-500">
      <div className="line-clamp-2 cursor-default" title={text || undefined}>
        {text}
      </div>
    </td>
  );
}

type SortKey = "company" | "role" | "match_score" | "compensation";
type SortDir = "asc" | "desc";

function SortableHeader({
  label,
  columnKey,
  activeKey,
  activeDir,
  onClick,
  className = "",
}: {
  label: string;
  columnKey: SortKey;
  activeKey: SortKey | null;
  activeDir: SortDir;
  onClick: (k: SortKey) => void;
  className?: string;
}) {
  const isActive = activeKey === columnKey;
  const arrow = !isActive ? "" : activeDir === "asc" ? "↑" : "↓";
  return (
    <th className={`px-5 py-3 ${className}`}>
      <button
        type="button"
        onClick={() => onClick(columnKey)}
        className={`inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition ${
          isActive ? "text-slate-900" : "text-gray-400 hover:text-slate-700"
        }`}
      >
        {label}
        <span className={`text-[10px] ${isActive ? "opacity-100" : "opacity-30"}`}>
          {arrow || "⇅"}
        </span>
      </button>
    </th>
  );
}

function ListingsTable({
  jobs,
  actions,
  onAction,
}: {
  jobs: Job[];
  actions: Record<string, Action>;
  onAction: (id: string, a: Action) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const primaryDir = (k: SortKey): SortDir =>
    k === "match_score" || k === "compensation" ? "desc" : "asc";

  const handleSort = (k: SortKey) => {
    if (sortKey !== k) {
      setSortKey(k);
      setSortDir(primaryDir(k));
    } else if (sortDir === primaryDir(k)) {
      setSortDir(primaryDir(k) === "asc" ? "desc" : "asc");
    } else {
      setSortKey(null);
    }
  };

  const sortedJobs = useMemo(() => {
    if (sortKey === null) return jobs;
    const dir = sortDir === "asc" ? 1 : -1;
    const sortVal = (j: Job): { key: string | number; hasValue: boolean } => {
      switch (sortKey) {
        case "company":
          return { key: j.company.toLowerCase(), hasValue: !!j.company };
        case "role":
          return { key: j.job_title.toLowerCase(), hasValue: !!j.job_title };
        case "match_score":
          return {
            key: j.match_score ?? 0,
            hasValue: j.match_score !== null,
          };
        case "compensation": {
          const mid = parseCompMidpoint(j.compensation_raw);
          return { key: mid, hasValue: mid > 0 };
        }
      }
    };
    return [...jobs].sort((a, b) => {
      const va = sortVal(a);
      const vb = sortVal(b);
      if (va.hasValue && !vb.hasValue) return -1;
      if (!va.hasValue && vb.hasValue) return 1;
      if (!va.hasValue && !vb.hasValue) return 0;
      if (va.key < vb.key) return -1 * dir;
      if (va.key > vb.key) return 1 * dir;
      return 0;
    });
  }, [jobs, sortKey, sortDir]);

  if (jobs.length === 0) return null;
  return (
    <section>
      <SectionHeader title="All Listings" />
      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wider text-gray-400">
              <th className="whitespace-nowrap px-5 py-3 w-[80px]">Save</th>
              <SortableHeader
                label="Company"
                columnKey="company"
                activeKey={sortKey}
                activeDir={sortDir}
                onClick={handleSort}
              />
              <SortableHeader
                label="Role"
                columnKey="role"
                activeKey={sortKey}
                activeDir={sortDir}
                onClick={handleSort}
              />
              <SortableHeader
                label="Match Score"
                columnKey="match_score"
                activeKey={sortKey}
                activeDir={sortDir}
                onClick={handleSort}
                className="whitespace-nowrap"
              />
              <th className="whitespace-nowrap px-5 py-3">Job URL</th>
              <SortableHeader
                label="Comp Range"
                columnKey="compensation"
                activeKey={sortKey}
                activeDir={sortDir}
                onClick={handleSort}
                className="whitespace-nowrap"
              />
              <th className="px-5 py-3 w-[360px]">Location</th>
              <th className="px-5 py-3 w-[280px]">Description</th>
            </tr>
          </thead>
          <tbody>
            {sortedJobs.map((job) => {
              const rowState = actions[job.job_id];
              return (
              <tr
                key={job.job_id}
                className={`border-b border-gray-50 transition ${
                  rowState === "save"
                    ? "bg-emerald-50/40"
                    : rowState === "pass"
                    ? "opacity-40"
                    : "hover:bg-gray-50/50"
                }`}
              >
                <td className="px-5 py-3">
                  <ActionButtons
                    jobId={job.job_id}
                    actions={actions}
                    onAction={onAction}
                  />
                </td>
                <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-900">
                  {job.company}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-slate-700">
                  {job.job_title}
                </td>
                <td className="whitespace-nowrap px-5 py-3">
                  {job.match_score !== null ? (
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                      {job.match_score}
                    </span>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-5 py-3">
                  {job.job_url ? (
                    <a
                      href={job.job_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      View&nbsp;↗
                    </a>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-gray-500">
                  {formatCompShort(job.compensation_raw)}
                </td>
                <td className="px-5 py-3 text-gray-500">
                  <div
                    className="w-[360px] truncate"
                    title={job.location || undefined}
                  >
                    {job.location || "—"}
                  </div>
                </td>
                <DescriptionTooltip text={job.description} />
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function downloadSavedCsv(jobs: Job[], actions: Record<string, Action>) {
  const saved = jobs.filter((j) => actions[j.job_id] === "save");
  if (saved.length === 0) return;
  const today = new Date().toISOString().split("T")[0];
  const header = [
    "Job ID", "Company", "Role", "Person", "Date", "Event", "Source",
    "Stage", "State", "Compensation", "Location", "Next Action",
    "Next Action Date", "Notes", "Job URL",
  ];
  const rows = saved.map((j) => [
    j.job_id, j.company, j.job_title, "", today, "Saved", "Scraper",
    "Saved", "Active", j.compensation_raw, j.location, "", "", "", j.job_url,
  ]);
  const csv = Papa.unparse({ fields: header, data: rows });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rolescout-saved-${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Main ----------

export default function ReviewClient() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [activeWorkplace, setActiveWorkplace] = useState<Set<WorkplacePill>>(new Set());
  const [activeDates, setActiveDates] = useState<Set<DatePill>>(new Set());
  const [actions, setActions] = useState<Record<string, Action>>({});

  const savedCount = useMemo(
    () => Object.values(actions).filter((a) => a === "save").length,
    [actions]
  );

  useEffect(() => {
    let cancelled = false;

    const applyCsv = (text: string) => {
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      const parsed = (result.data as Record<string, unknown>[]).map(parseRow);
      if (cancelled) return;
      setJobs(parsed.filter((j) => j.job_id));
    };

    const saved = getOpenRolesCsv();
    if (saved) {
      applyCsv(saved);
      setIsDemo(false);
      setLoading(false);
      return;
    }

    setIsDemo(true);
    fetch(DEMO_CSV_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch data");
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        applyCsv(text);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const togglePill = (pill: WorkplacePill | DatePill) => {
    if (pill === "Remote" || pill === "Hybrid" || pill === "Onsite") {
      setActiveWorkplace((prev) => {
        const next = new Set(prev);
        if (next.has(pill)) next.delete(pill);
        else next.add(pill);
        return next;
      });
    } else {
      setActiveDates((prev) => {
        const next = new Set(prev);
        if (next.has(pill)) next.delete(pill);
        else next.add(pill);
        return next;
      });
    }
  };

  const clearAll = () => {
    setActiveWorkplace(new Set());
    setActiveDates(new Set());
  };

  const handleAction = (id: string, action: Action) => {
    setActions((prev) => {
      const next = { ...prev };
      if (next[id] === action) {
        delete next[id];
      } else {
        next[id] = action;
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (activeWorkplace.size > 0) {
        const wt = j.workplace_type.toLowerCase();
        const match =
          (activeWorkplace.has("Remote") && wt === "remote") ||
          (activeWorkplace.has("Hybrid") && wt === "hybrid") ||
          (activeWorkplace.has("Onsite") && ["onsite", "on-site", "in-office"].includes(wt));
        if (!match) return false;
      }
      if (activeDates.size > 0) {
        const match =
          (activeDates.has("today") && isToday(j.date_posted)) ||
          (activeDates.has("week") && isWithinLastWeek(j.date_posted));
        if (!match) return false;
      }
      return true;
    });
  }, [jobs, activeWorkplace, activeDates]);

  const { bestMatch, topPaying, newThisWeek } = useMemo(() => {
    const seen = new Set<string>();

    const best = [...filtered]
      .sort((a, b) => {
        const aHas = a.match_score !== null;
        const bHas = b.match_score !== null;
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        if (!aHas && !bHas) return 0;
        return (b.match_score as number) - (a.match_score as number);
      })
      .filter((j) => !seen.has(j.job_id))
      .slice(0, 3);
    best.forEach((j) => seen.add(j.job_id));

    const top = [...filtered]
      .sort(
        (a, b) =>
          parseCompMidpoint(b.compensation_raw) -
          parseCompMidpoint(a.compensation_raw)
      )
      .filter((j) => !seen.has(j.job_id))
      .slice(0, 3);
    top.forEach((j) => seen.add(j.job_id));

    const week = filtered
      .filter((j) => isWithinLastWeek(j.date_posted) && !seen.has(j.job_id))
      .slice(0, 3);

    return { bestMatch: best, topPaying: top, newThisWeek: week };
  }, [filtered]);

  return (
    <>
      {savedCount > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => downloadSavedCsv(jobs, actions)}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
          >
            Download Saved ({savedCount})
          </button>
        </div>
      )}

      <div>
        {/* Demo banner */}
        {isDemo && (
          <div className="mb-6 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>
              Viewing demo data —{" "}
              <a
                href="/lab/rolescout/settings"
                className="font-medium underline decoration-amber-400 underline-offset-2 hover:text-amber-700"
              >
                go to Settings
              </a>
              {" "}to upload your own scraper output.
            </span>
          </div>
        )}

        {/* Filter bar */}
        <div className="mb-8">
          <FilterBar
            activeWorkplace={activeWorkplace}
            activeDates={activeDates}
            toggle={togglePill}
            clearAll={clearAll}
          />
          {!loading && (
            <p className="mt-3 text-sm text-gray-400">
              Showing {filtered.length} opportunities matching your criteria
            </p>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-slate-900" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Failed to load data: {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <CardGrid
              title="Best Match"
              jobs={bestMatch}
              actions={actions}
              onAction={handleAction}
              showMatchScore
            />
            <CardGrid
              title="Top Paying"
              jobs={topPaying}
              actions={actions}
              onAction={handleAction}
            />
            <CardGrid
              title="New This Week"
              jobs={newThisWeek}
              actions={actions}
              onAction={handleAction}
            />
            <ListingsTable
              jobs={filtered}
              actions={actions}
              onAction={handleAction}
            />
          </>
        )}
      </div>
    </>
  );
}

