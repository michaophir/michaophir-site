"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";
import {
  getCandidateProfile,
  getLastRunSummary,
  getRoleFiltersCsv,
  getTargetCompaniesCsv,
  setLastRunSummary,
  setOpenRolesCsv,
} from "../lib/storage";

// ---------- Types ----------

type TargetCompany = {
  name: string;
  website: string;
  tier: string;
};

type RoleFilter = {
  field: string;
  value: string;
};

type LastRunSummary = {
  runDate: string;
  companiesSucceeded: number;
  companiesFailed: number;
  companiesTotal: number;
  rolesFetched: number;
  perAts: Record<string, number>;
};

// ---------- Demo sources ----------

const DEMO_SOURCES = {
  lastRunSummary:
    "https://raw.githubusercontent.com/michaophir/rolescout-scraper/main/last_run_summary.json",
  targetCompanies:
    "https://raw.githubusercontent.com/michaophir/rolescout-scraper/main/target_company_list.csv",
  roleFilters:
    "https://raw.githubusercontent.com/michaophir/rolescout-scraper/main/role_filters.csv",
};

// ---------- Helpers ----------

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = Papa.unparse({ fields: headers, data: rows });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsv<T>(text: string, mapper: (row: Record<string, string>) => T): T[] {
  const result = Papa.parse(text, { header: true, skipEmptyLines: true });
  return (result.data as Record<string, string>[]).map(mapper);
}

async function readProfile(): Promise<Record<string, unknown> | null> {
  const profileJson = await getCandidateProfile();
  if (!profileJson) return null;
  try {
    return JSON.parse(profileJson) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ---------- Shared UI ----------

function SectionCard({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

function DownloadButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700"
    >
      Download
    </button>
  );
}

function SettingsNote() {
  return (
    <p className="text-xs text-gray-400 mt-1">
      Manage your data in{" "}
      <a href="/lab/rolescout/settings" className="underline hover:text-slate-600">
        Settings
      </a>
      .
    </p>
  );
}

function ProfileSourceNote() {
  return (
    <p className="text-xs text-gray-400 mt-1">
      From your candidate profile ·{" "}
      <a href="/lab/rolescout/profile" className="underline hover:text-slate-600">
        Edit in Profile
      </a>
    </p>
  );
}

// ---------- Target Companies ----------

function TargetCompaniesSection() {
  const [rows, setRows] = useState<TargetCompany[]>([]);
  const [fromProfile, setFromProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const apply = (text: string) => {
      const next = parseCsv(text, (r) => ({
        name: (r["company_name"] ?? r["Company Name"] ?? r["name"] ?? "").trim(),
        website: (r["website"] ?? r["Website"] ?? "").trim(),
        tier: (r["tier"] ?? r["Tier"] ?? "").trim(),
      })).filter((c) => c.name);
      if (!cancelled) setRows(next);
    };

    (async () => {
      const profile = await readProfile();
      if (cancelled) return;
      const profileCompanies = Array.isArray(profile?.target_companies)
        ? (profile?.target_companies as Array<{
            company_name?: string;
            website?: string;
            tier?: string | number;
          }>)
        : [];
      if (profileCompanies.length > 0) {
        const mapped: TargetCompany[] = profileCompanies
          .map((c) => ({
            name: (c.company_name ?? "").trim(),
            website: (c.website ?? "").trim(),
            tier: c.tier !== undefined ? String(c.tier) : "",
          }))
          .filter((c) => c.name);
        if (!cancelled) {
          setRows(mapped);
          setFromProfile(true);
        }
        return;
      }

      const saved = await getTargetCompaniesCsv();
      if (cancelled) return;
      if (saved) {
        apply(saved);
        return;
      }

      try {
        const r = await fetch(DEMO_SOURCES.targetCompanies);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const text = await r.text();
        if (cancelled) return;
        apply(text);
      } catch {
        // Leave rows empty on failure
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownload = () => {
    downloadCsv(
      "target_company_list.csv",
      ["company_name", "website", "tier"],
      rows.map((r) => [r.name, r.website, r.tier])
    );
  };

  const needsScroll = rows.length > 15;

  return (
    <SectionCard
      title="Target Companies"
      subtitle="Companies the scraper will poll for open roles."
      actions={<DownloadButton onClick={handleDownload} />}
    >
      {fromProfile ? <ProfileSourceNote /> : <SettingsNote />}
      <div
        className={`mt-4 rounded-lg border border-gray-100 ${
          needsScroll ? "max-h-[400px] overflow-y-auto" : "overflow-hidden"
        }`}
      >
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-xs font-medium uppercase tracking-wider text-gray-400">
              <th className="px-4 py-2.5">Company Name</th>
              <th className="px-4 py-2.5">Website</th>
              <th className="px-4 py-2.5">Tier</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  No companies yet.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr
                key={`${r.name}-${i}`}
                className="border-b border-gray-50 text-slate-900"
              >
                <td className="px-4 py-2.5 font-medium">{r.name}</td>
                <td className="px-4 py-2.5 text-gray-500">{r.website}</td>
                <td className="px-4 py-2.5 text-gray-500">{r.tier}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ---------- Role Filters ----------

function RoleFiltersSection() {
  const [rows, setRows] = useState<RoleFilter[]>([]);
  const [fromProfile, setFromProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const apply = (text: string) => {
      const next = parseCsv(text, (r) => ({
        field: (r["field"] ?? r["Field"] ?? "").trim(),
        value: (r["value"] ?? r["Value"] ?? "").trim(),
      })).filter((f) => f.field && f.value);
      if (!cancelled) setRows(next);
    };

    (async () => {
      const profile = await readProfile();
      if (cancelled) return;
      const profileFilters = Array.isArray(profile?.role_filters)
        ? (profile?.role_filters as Array<{ field?: string; value?: string }>)
        : [];
      if (profileFilters.length > 0) {
        const mapped: RoleFilter[] = profileFilters
          .map((f) => ({
            field: (f.field ?? "").trim(),
            value: (f.value ?? "").trim(),
          }))
          .filter((f) => f.field && f.value);
        if (!cancelled) {
          setRows(mapped);
          setFromProfile(true);
        }
        return;
      }

      const saved = await getRoleFiltersCsv();
      if (cancelled) return;
      if (saved) {
        apply(saved);
        return;
      }

      try {
        const r = await fetch(DEMO_SOURCES.roleFilters);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const text = await r.text();
        if (cancelled) return;
        apply(text);
      } catch {
        // Leave rows empty on failure
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownload = () => {
    downloadCsv(
      "role_filters.csv",
      ["field", "value"],
      rows.map((r) => [r.field, r.value])
    );
  };

  return (
    <SectionCard
      title="Role Filters"
      subtitle="Keywords and constraints applied after scraping to narrow the role list."
      actions={<DownloadButton onClick={handleDownload} />}
    >
      {fromProfile ? <ProfileSourceNote /> : <SettingsNote />}
      <div className="mt-4 overflow-hidden rounded-lg border border-gray-100">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-xs font-medium uppercase tracking-wider text-gray-400">
              <th className="px-4 py-2.5">Field</th>
              <th className="px-4 py-2.5">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-gray-400">
                  No filters yet.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 text-slate-900">
                <td className="px-4 py-2.5 font-medium">{r.field}</td>
                <td className="px-4 py-2.5 text-gray-600">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ---------- Skills ----------

function SkillsSection() {
  const [skills, setSkills] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const profile = await readProfile();
      if (cancelled || !profile) return;
      const raw = Array.isArray(profile.skills) ? profile.skills : [];
      const cleaned = raw
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter((s) => s.length > 0);
      if (!cancelled) setSkills(cleaned);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (skills.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 mt-6">
      <h3 className="text-base font-semibold text-slate-900 mb-1">Skills</h3>
      <p className="text-xs text-gray-400 mb-4">
        Used for match scoring against job descriptions ·{" "}
        <a href="/lab/rolescout/profile" className="underline hover:text-slate-600">
          Edit in Profile
        </a>
      </p>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span
            key={skill}
            className="rounded-full bg-gray-100 px-3 py-1 text-xs text-slate-700"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- Run Scraper ----------

function RunScraperSection() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [runError, setRunError] = useState<string | null>(null);
  const [runComplete, setRunComplete] = useState(false);

  useEffect(() => {
    try {
      const savedLog = window.localStorage.getItem("rolescout_last_run_log");
      const savedComplete = window.localStorage.getItem(
        "rolescout_last_run_complete"
      );
      if (savedLog) {
        const parsed = JSON.parse(savedLog);
        if (Array.isArray(parsed)) {
          setProgress(parsed);
          if (savedComplete === "true") {
            setRunComplete(true);
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  async function runScraper() {
    setIsRunning(true);
    setProgress([]);
    setRunError(null);
    setRunComplete(false);
    try {
      window.localStorage.removeItem("rolescout_last_run_complete");
    } catch {
      // ignore
    }

    const profileJson = await getCandidateProfile();
    if (!profileJson) {
      setRunError("No candidate profile found. Build your profile first.");
      setIsRunning(false);
      return;
    }

    let profile: unknown;
    try {
      profile = JSON.parse(profileJson);
    } catch {
      setRunError("Invalid candidate profile JSON.");
      setIsRunning(false);
      return;
    }

    try {
      const response = await fetch("/api/run-scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });

      if (!response.ok) {
        setRunError("Scraper service unavailable. Try again later.");
        setIsRunning(false);
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      const handleSseLine = async (line: string) => {
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
          // Non-JSON line, skip
          return;
        }

        if (event.type === "progress" && typeof event.message === "string") {
          const message = event.message;
          setProgress((prev) => [...prev, message]);
        }

        if (event.type === "done") {
          if (event.open_roles_csv) {
            await setOpenRolesCsv(event.open_roles_csv);
          }
          if (event.last_run_summary) {
            await setLastRunSummary(
              JSON.stringify(event.last_run_summary)
            );
          }
          setRunComplete(true);
          try {
            window.localStorage.setItem(
              "rolescout_last_run_complete",
              "true"
            );
          } catch {
            // ignore
          }
          setProgress((prev) => {
            const next = [
              ...prev,
              `✓ Done! ${event.roles} roles found.`,
            ];
            try {
              window.localStorage.setItem(
                "rolescout_last_run_log",
                JSON.stringify(next)
              );
            } catch {
              // ignore quota/serialization errors
            }
            return next;
          });
          window.dispatchEvent(
            new CustomEvent("rolescout-data-updated")
          );
        }

        if (event.type === "error" && typeof event.message === "string") {
          setRunError(event.message);
        }
      };

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          await handleSseLine(line);
        }
      }

      // Flush any final UTF-8 + trailing line.
      buffer += decoder.decode();
      if (buffer.length > 0) {
        await handleSseLine(buffer);
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="text-base font-semibold text-slate-900">Run Scraper</h3>
      <p className="mt-1 text-sm text-gray-500 mb-4">
        Scrape open roles from your target companies. Uses your candidate
        profile for companies and filters.
      </p>

      {!isRunning && !runComplete && (
        <button
          onClick={runScraper}
          className="rounded-full bg-slate-900 text-white px-5 py-2 text-sm font-medium hover:bg-slate-700 transition"
        >
          Run Scraper
        </button>
      )}

      {isRunning && (
        <button
          disabled
          className="rounded-full bg-gray-300 text-gray-500 px-5 py-2 text-sm font-medium cursor-not-allowed"
        >
          Running...
        </button>
      )}

      {runComplete && (
        <button
          onClick={runScraper}
          className="rounded-full border border-gray-200 text-slate-700 px-5 py-2 text-sm font-medium hover:bg-gray-50 transition"
        >
          Run Again
        </button>
      )}

      {progress.length > 0 && (
        <div className="mt-4 rounded-lg bg-gray-950 p-4 font-mono text-xs text-green-400 max-h-64 overflow-y-auto">
          {progress.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {runError && <p className="mt-3 text-xs text-red-500">{runError}</p>}

      {!isRunning && !runComplete && progress.length === 0 && (
        <p className="mt-3 text-xs text-gray-400">
          Runs against your target companies and role filters from your
          candidate profile.{" "}
          <a
            href="/lab/rolescout/profile"
            className="underline hover:text-slate-600"
          >
            Edit profile →
          </a>
        </p>
      )}
    </div>
  );
}

// ---------- Last Run Summary ----------

function normalizeSummary(raw: unknown): LastRunSummary {
  const data = (raw ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" ? v : 0);
  const str = (v: unknown) => (typeof v === "string" ? v : "");

  const companiesSucceeded = num(
    data.companies_succeeded ?? data.companiesSucceeded
  );
  const companiesTotal = num(data.companies_total ?? data.companiesTotal);
  const failedRaw = data.companies_failed ?? data.companiesFailed;
  const companiesFailed = Array.isArray(failedRaw)
    ? failedRaw.length
    : typeof failedRaw === "number"
    ? failedRaw
    : Math.max(0, companiesTotal - companiesSucceeded);
  const rolesFetched = num(
    data.roles_fetched_post_filter ?? data.rolesFetched ?? data.roles_fetched
  );

  const perAtsRaw = data.per_ats ?? data.perAts;
  const perAts: Record<string, number> = {};
  if (
    perAtsRaw &&
    typeof perAtsRaw === "object" &&
    !Array.isArray(perAtsRaw)
  ) {
    for (const [k, v] of Object.entries(
      perAtsRaw as Record<string, unknown>
    )) {
      if (k) perAts[k] = num(v);
    }
  }

  return {
    runDate: str(data.run_date ?? data.runDate),
    companiesSucceeded,
    companiesFailed,
    companiesTotal,
    rolesFetched,
    perAts,
  };
}

function LastRunSummarySection() {
  const [data, setData] = useState<LastRunSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    const apply = (text: string) => {
      try {
        const parsed = JSON.parse(text);
        if (!cancelled) setData(normalizeSummary(parsed));
      } catch {
        // Invalid JSON; leave empty
      }
    };

    const loadFromStorage = async (): Promise<boolean> => {
      const saved = await getLastRunSummary();
      if (cancelled || !saved) return false;
      apply(saved);
      return true;
    };

    (async () => {
      const loaded = await loadFromStorage();
      if (cancelled || loaded) return;
      try {
        const r = await fetch(DEMO_SOURCES.lastRunSummary);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const text = await r.text();
        if (cancelled) return;
        apply(text);
      } catch {
        // Leave empty on failure
      }
    })();

    const onDataUpdated = () => {
      void loadFromStorage();
    };
    const onVisible = () => {
      if (!document.hidden) void loadFromStorage();
    };
    window.addEventListener("rolescout-data-updated", onDataUpdated);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("rolescout-data-updated", onDataUpdated);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const companiesFailed = data?.companiesFailed ?? 0;

  const runDate = data?.runDate ? new Date(data.runDate) : null;
  const validRunDate = runDate && !isNaN(runDate.getTime()) ? runDate : null;
  const dateStr = validRunDate
    ? validRunDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "—";
  const timeStr = validRunDate
    ? validRunDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <section className="mb-6">
      <h3 className="text-base font-semibold text-slate-900">Last Run Summary</h3>
      <p className="text-sm text-gray-500 mb-4">
        {validRunDate ? `Completed ${dateStr} at ${timeStr}` : "No run yet"}
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        <StatCard
          icon={<IconCheckCircle />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          value={data?.companiesSucceeded ?? 0}
          label="Companies Succeeded"
        />
        <StatCard
          icon={<IconXCircle />}
          iconBg="bg-red-100"
          iconColor="text-red-600"
          value={companiesFailed}
          valueColor={companiesFailed > 0 ? "text-red-600" : "text-slate-900"}
          label="Companies Failed"
        />
        <StatCard
          icon={<IconFunnel />}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
          value={data?.rolesFetched ?? 0}
          label="Roles After Filters"
        />
        <StatCard
          icon={<IconCalendar />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          value={dateStr}
          subValue={
            data
              ? `${timeStr} · ${data.companiesSucceeded}/${data.companiesTotal} companies`
              : undefined
          }
          label="Last Run"
        />
      </div>

      {data && Object.keys(data.perAts).length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Per-ATS Breakdown
          </h3>
          {Object.entries(data.perAts).map(([ats, count]) => {
            const total = data.rolesFetched || 1;
            const pct = Math.round((Number(count) / Number(total)) * 100);
            return (
              <div key={ats} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-700 capitalize">
                    {ats}
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {String(count)}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-blue-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StatCard({
  icon,
  iconBg,
  iconColor,
  value,
  label,
  subValue,
  valueColor,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  value: string | number;
  label: string;
  subValue?: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div
        className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}
      >
        {icon}
      </div>
      <p
        className={`text-3xl font-bold tracking-tight ${
          valueColor ?? "text-slate-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
      {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
    </div>
  );
}

function IconCheckCircle() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconXCircle() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l6 6M15 9l-6 6" />
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

function IconCalendar() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="5" width="18" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

// ---------- Root ----------

export default function ScoutClient() {
  return (
    <div>
      <LastRunSummarySection />
      <RunScraperSection />
      <TargetCompaniesSection />
      <RoleFiltersSection />
      <SkillsSection />
    </div>
  );
}
