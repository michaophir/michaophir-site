"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { trackEvent } from "@/app/lib/analytics";
import { getLastRunSummary, getOpenRolesCsv } from "../lib/storage";

const DEMO_CSV_URL =
  "https://raw.githubusercontent.com/michaophir/rolescout-scraper/main/open_roles.csv";

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
type DatePill = "week";

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

const WORKPLACE_PILLS: { value: WorkplacePill; label: string }[] = [
  { value: "Remote", label: "Remote" },
  { value: "Hybrid", label: "Hybrid" },
  { value: "Onsite", label: "Onsite" },
];
const DATE_PILLS: { value: DatePill; label: string }[] = [
  { value: "week", label: "New This Week" },
];

// ---------- Components ----------

function FilterBar({
  activeWorkplace,
  activeDates,
  searchInput,
  setSearchInput,
  activeTerms,
  addTerm,
  removeTerm,
  clearTerms,
  toggle,
  clearAll,
}: {
  activeWorkplace: Set<WorkplacePill>;
  activeDates: Set<DatePill>;
  searchInput: string;
  setSearchInput: (v: string) => void;
  activeTerms: string[];
  addTerm: (term: string) => void;
  removeTerm: (index: number) => void;
  clearTerms: () => void;
  toggle: (pill: WorkplacePill | DatePill) => void;
  clearAll: () => void;
}) {
  const [searchFocused, setSearchFocused] = useState(false);

  const commitInput = () => {
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    addTerm(trimmed);
    setSearchInput("");
  };

  const noneActive =
    activeWorkplace.size === 0 &&
    activeDates.size === 0 &&
    activeTerms.length === 0;

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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {pill("All", noneActive, clearAll)}
        {DATE_PILLS.map((p) =>
          pill(p.label, activeDates.has(p.value), () => toggle(p.value))
        )}
        {WORKPLACE_PILLS.map((p) =>
          pill(p.label, activeWorkplace.has(p.value), () => toggle(p.value))
        )}
        <div className="relative ml-3">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                commitInput();
              }
            }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Filter roles..."
            className="w-48 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm text-slate-700 placeholder-gray-400 focus:border-slate-400 focus:outline-none"
          />
          {searchFocused && (
            <p className="absolute mt-1 text-xs text-gray-400 bg-white rounded-lg px-3 py-1.5 shadow-sm border border-gray-100 z-10 max-w-xs">
              Enter one or more terms — press Enter or comma to add. Prefix with - to exclude. Searches title, company, and location.
            </p>
          )}
        </div>
      </div>
      {activeTerms.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeTerms.map((term, i) => {
            const isExclude = term.startsWith("-");
            const label = isExclude ? term.slice(1) : term;
            return (
              <span
                key={`${term}-${i}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${
                  isExclude
                    ? "bg-red-50 text-red-700"
                    : "border border-gray-200 bg-white text-slate-700"
                }`}
              >
                {isExclude && <span aria-hidden>−</span>}
                <span>{label}</span>
                <button
                  type="button"
                  onClick={() => removeTerm(i)}
                  aria-label={`Remove filter ${label}`}
                  className={`-mr-0.5 leading-none transition ${
                    isExclude
                      ? "text-red-400 hover:text-red-700"
                      : "text-gray-400 hover:text-slate-700"
                  }`}
                >
                  ×
                </button>
              </span>
            );
          })}
          {activeTerms.length >= 2 && (
            <button
              type="button"
              onClick={clearTerms}
              className="text-xs text-gray-500 underline underline-offset-2 hover:text-slate-700"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
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

function SaveBookmarkButton({
  jobId,
  savedIds,
  onToggle,
}: {
  jobId: string;
  savedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const saved = savedIds.has(jobId);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle(jobId);
      }}
      className={`transition ${
        saved ? "text-blue-600" : "text-gray-300 hover:text-blue-600"
      }`}
      title={saved ? "Saved" : "Save role"}
    >
      <BookmarkIcon filled={saved} />
    </button>
  );
}

function JobCard({
  job,
  savedIds,
  onToggle,
  showMatchScore,
}: {
  job: Job;
  savedIds: Set<string>;
  onToggle: (id: string) => void;
  showMatchScore?: boolean;
}) {
  const isSaved = savedIds.has(job.job_id);

  return (
    <div
      id={`job-${job.job_id}`}
      className={`scroll-mt-24 flex flex-col justify-between rounded-xl border p-5 shadow-sm transition hover:shadow-md target:ring-2 target:ring-blue-400 target:ring-offset-2 ${
        isSaved ? "border-blue-200 bg-blue-50/30" : "border-gray-100 bg-white"
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
          <SaveBookmarkButton
            jobId={job.job_id}
            savedIds={savedIds}
            onToggle={onToggle}
          />
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
            onClick={() =>
              void trackEvent("external_link_clicked", {
                company: job.company,
                job_url: job.job_url.slice(0, 256),
              })
            }
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
  savedIds,
  onToggle,
  showMatchScore,
}: {
  title: string;
  jobs: Job[];
  savedIds: Set<string>;
  onToggle: (id: string) => void;
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
            savedIds={savedIds}
            onToggle={onToggle}
            showMatchScore={showMatchScore}
          />
        ))}
      </div>
    </section>
  );
}

function LocationCell({ location }: { location: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const hasLocation = location.trim().length > 0;

  return (
    <td ref={ref} className="relative px-5 py-3 text-gray-500">
      <button
        type="button"
        onClick={() => hasLocation && setOpen((o) => !o)}
        disabled={!hasLocation}
        title={location || undefined}
        className="block w-full cursor-pointer truncate text-left hover:text-slate-700 disabled:cursor-default disabled:hover:text-gray-500"
      >
        {location || "—"}
      </button>
      {open && hasLocation && (
        <div className="absolute left-5 z-20 mt-1 max-w-xs rounded-lg border border-gray-100 bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm">
          {location}
        </div>
      )}
    </td>
  );
}

function DescriptionTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const hasText = text.trim().length > 0;
  return (
    <td className="px-5 py-3 text-gray-500">
      <button
        type="button"
        onClick={() => hasText && setOpen(true)}
        disabled={!hasText}
        className="line-clamp-2 w-full cursor-pointer text-left hover:text-slate-700 disabled:cursor-default disabled:hover:text-gray-500"
      >
        {text || "—"}
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[60vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 text-gray-400 transition hover:text-slate-900"
            >
              ✕
            </button>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {text}
            </p>
          </div>
        </div>
      )}
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
  savedIds,
  onToggle,
}: {
  jobs: Job[];
  savedIds: Set<string>;
  onToggle: (id: string) => void;
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
        <table className="w-full table-fixed text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wider text-gray-400">
              <th className="px-5 py-3 w-10" aria-label="Save">
                <svg
                  className="h-4 w-4 text-gray-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z"
                  />
                </svg>
              </th>
              <SortableHeader
                label="Company"
                columnKey="company"
                activeKey={sortKey}
                activeDir={sortDir}
                onClick={handleSort}
                className="w-32"
              />
              <SortableHeader
                label="Role"
                columnKey="role"
                activeKey={sortKey}
                activeDir={sortDir}
                onClick={handleSort}
                className="w-72"
              />
              <SortableHeader
                label="Match"
                columnKey="match_score"
                activeKey={sortKey}
                activeDir={sortDir}
                onClick={handleSort}
                className="w-24 whitespace-nowrap"
              />
              <th className="px-5 py-3 w-20">URL</th>
              <SortableHeader
                label="Comp Range"
                columnKey="compensation"
                activeKey={sortKey}
                activeDir={sortDir}
                onClick={handleSort}
                className="w-32 whitespace-nowrap"
              />
              <th className="px-5 py-3 w-52">Location</th>
              <th className="px-5 py-3">Description</th>
            </tr>
          </thead>
          <tbody>
            {sortedJobs.map((job) => {
              const isSaved = savedIds.has(job.job_id);
              return (
              <tr
                key={job.job_id}
                className={`border-b border-gray-50 transition ${
                  isSaved ? "bg-blue-50/40" : "hover:bg-gray-50/50"
                }`}
              >
                <td className="px-5 py-3">
                  <SaveBookmarkButton
                    jobId={job.job_id}
                    savedIds={savedIds}
                    onToggle={onToggle}
                  />
                </td>
                <td className="truncate px-5 py-3 font-medium text-slate-900" title={job.company || undefined}>
                  {job.company}
                </td>
                <td
                  className="px-5 py-3 text-slate-700"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                  title={job.job_title || undefined}
                >
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
                      onClick={() =>
                        void trackEvent("external_link_clicked", {
                          company: job.company,
                          job_url: job.job_url.slice(0, 256),
                        })
                      }
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
                <LocationCell location={job.location} />
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

function downloadSavedCsv(jobs: Job[], savedIds: Set<string>) {
  const saved = jobs.filter((j) => savedIds.has(j.job_id));
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
  const [searchInput, setSearchInput] = useState("");
  const [activeTerms, setActiveTerms] = useState<string[]>([]);
  const [lastScrapedDate, setLastScrapedDate] = useState<string | null>(null);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(6);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const savedCount = savedIds.size;

  useEffect(() => {
    let cancelled = false;

    const loadLastScrapedDate = async () => {
      const json = await getLastRunSummary();
      if (cancelled || !json) return;
      try {
        const parsed = JSON.parse(json) as { run_date?: string };
        if (!parsed.run_date) return;
        const d = new Date(parsed.run_date);
        if (isNaN(d.getTime())) return;
        const dateStr = d.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        const timeStr = d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        if (!cancelled) setLastScrapedDate(`${dateStr} at ${timeStr}`);
      } catch {
        // ignore
      }
    };

    void loadLastScrapedDate();

    const onDataUpdated = () => {
      void loadLastScrapedDate();
    };
    const onVisible = () => {
      if (!document.hidden) void loadLastScrapedDate();
    };
    window.addEventListener("rolescout-data-updated", onDataUpdated);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("rolescout-data-updated", onDataUpdated);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const applyCsv = (text: string) => {
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      const parsed = (result.data as Record<string, unknown>[]).map(parseRow);
      if (cancelled) return;
      setJobs(
        parsed.filter(
          (j) => j.job_id && j.accepting_applications !== "false"
        )
      );
    };

    const loadOpenRoles = async (): Promise<boolean> => {
      const saved = await getOpenRolesCsv();
      if (cancelled || !saved) return false;
      applyCsv(saved);
      setIsDemo(false);
      return true;
    };

    (async () => {
      const loaded = await loadOpenRoles();
      if (cancelled) return;
      if (loaded) {
        setLoading(false);
        return;
      }

      setIsDemo(true);
      try {
        const res = await fetch(DEMO_CSV_URL);
        if (!res.ok) throw new Error("Failed to fetch data");
        const text = await res.text();
        if (cancelled) return;
        applyCsv(text);
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const onDataUpdated = () => {
      void loadOpenRoles();
    };
    const onVisible = () => {
      if (!document.hidden) void loadOpenRoles();
    };
    window.addEventListener("rolescout-data-updated", onDataUpdated);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("rolescout-data-updated", onDataUpdated);
      document.removeEventListener("visibilitychange", onVisible);
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
    setSearchInput("");
    setActiveTerms([]);
  };

  const addTerm = (term: string) => {
    setActiveTerms((prev) => [...prev, term]);
  };

  const removeTerm = (index: number) => {
    setActiveTerms((prev) => prev.filter((_, i) => i !== index));
  };

  const clearTerms = () => setActiveTerms([]);

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      const wasSaved = next.has(id);
      if (wasSaved) next.delete(id);
      else next.add(id);
      const job = jobs.find((j) => j.job_id === id);
      if (job) {
        void trackEvent(wasSaved ? "role_passed" : "role_saved", {
          company: job.company,
          match_score: job.match_score ?? 0,
        });
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    let result = jobs.filter((j) => {
      if (activeWorkplace.size > 0) {
        const wt = j.workplace_type.toLowerCase();
        const match =
          (activeWorkplace.has("Remote") && wt === "remote") ||
          (activeWorkplace.has("Hybrid") && wt === "hybrid") ||
          (activeWorkplace.has("Onsite") && ["onsite", "on-site", "in-office"].includes(wt));
        if (!match) return false;
      }
      if (activeDates.has("week") && !isWithinLastWeek(j.date_posted)) {
        return false;
      }
      return true;
    });

    for (const term of activeTerms) {
      if (term.startsWith("-")) {
        const keyword = term.slice(1).toLowerCase();
        if (!keyword) continue;
        result = result.filter(
          (role) =>
            !role.job_title.toLowerCase().includes(keyword) &&
            !role.company.toLowerCase().includes(keyword) &&
            !role.location.toLowerCase().includes(keyword)
        );
      } else {
        const keyword = term.toLowerCase();
        result = result.filter(
          (role) =>
            role.job_title.toLowerCase().includes(keyword) ||
            role.location.toLowerCase().includes(keyword) ||
            role.company.toLowerCase().includes(keyword)
        );
      }
    }

    return result;
  }, [jobs, activeWorkplace, activeDates, activeTerms]);

  const allRolesByMatch = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aHas = a.match_score !== null;
      const bHas = b.match_score !== null;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      if (!aHas && !bHas) return 0;
      return (b.match_score as number) - (a.match_score as number);
    });
  }, [filtered]);

  useEffect(() => {
    setMobileVisibleCount(6);
  }, [filtered]);

  const mobileVisibleRoles = allRolesByMatch.slice(0, mobileVisibleCount);

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
      {lastScrapedDate && (
        <p className="text-xs text-gray-400 mt-1 mb-4">
          Last scraped: {lastScrapedDate}
        </p>
      )}

      {savedCount > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => downloadSavedCsv(jobs, savedIds)}
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
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            activeTerms={activeTerms}
            addTerm={addTerm}
            removeTerm={removeTerm}
            clearTerms={clearTerms}
            toggle={togglePill}
            clearAll={clearAll}
          />
          {!loading && (
            <p className="mt-3 text-sm text-gray-400">
              Showing {filtered.length} roles matching your criteria
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
              savedIds={savedIds}
              onToggle={toggleSave}
              showMatchScore
            />
            <CardGrid
              title="Top Paying"
              jobs={topPaying}
              savedIds={savedIds}
              onToggle={toggleSave}
            />
            <CardGrid
              title="New This Week"
              jobs={newThisWeek}
              savedIds={savedIds}
              onToggle={toggleSave}
            />
            <div className="hidden [@media(min-width:1280px)_and_(pointer:fine)]:block mt-8">
              <ListingsTable
                jobs={filtered}
                savedIds={savedIds}
                onToggle={toggleSave}
              />
            </div>
            {allRolesByMatch.length > 0 && (
              <section className="block [@media(min-width:1280px)_and_(pointer:fine)]:hidden mb-10">
                <SectionHeader title="All Roles" />
                <div className="grid gap-4 sm:grid-cols-2">
                  {mobileVisibleRoles.map((job) => (
                    <JobCard
                      key={job.job_id}
                      job={job}
                      savedIds={savedIds}
                      onToggle={toggleSave}
                      showMatchScore
                    />
                  ))}
                </div>
                {mobileVisibleCount < allRolesByMatch.length && (
                  <button
                    type="button"
                    onClick={() =>
                      setMobileVisibleCount((c) => c + 6)
                    }
                    className="mt-6 w-full rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50 transition"
                  >
                    Load more
                  </button>
                )}
                <p className="mt-2 text-sm text-gray-400 text-center">
                  Showing {mobileVisibleRoles.length} of{" "}
                  {allRolesByMatch.length} roles
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}

