"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";
import {
  getLastRunSummary,
  getRoleFiltersCsv,
  getTargetCompaniesCsv,
} from "../lib/storage";

// ---------- Types ----------

type TargetCompany = {
  name: string;
  website: string;
  tier: string;
  excluded: boolean;
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
    "https://raw.githubusercontent.com/michaophir/sandbox/main/last_run_summary.json",
  targetCompanies:
    "https://raw.githubusercontent.com/michaophir/sandbox/main/target_company_list.csv",
  roleFilters:
    "https://raw.githubusercontent.com/michaophir/sandbox/main/role_filters.csv",
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

function parseLocalDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function formatShortDate(iso: string): string {
  const d = parseLocalDate(iso);
  if (!d) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

// ---------- Target Companies ----------

function TargetCompaniesSection() {
  const [rows, setRows] = useState<TargetCompany[]>([]);

  useEffect(() => {
    let cancelled = false;

    const apply = (text: string) => {
      const next = parseCsv(text, (r) => ({
        name: (r["company_name"] ?? r["Company Name"] ?? r["name"] ?? "").trim(),
        website: (r["website"] ?? r["Website"] ?? "").trim(),
        tier: (r["tier"] ?? r["Tier"] ?? "").trim(),
        excluded: false,
      })).filter((c) => c.name);
      if (!cancelled) setRows(next);
    };

    const saved = getTargetCompaniesCsv();
    if (saved) {
      apply(saved);
      return;
    }

    fetch(DEMO_SOURCES.targetCompanies)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(apply)
      .catch(() => {
        // Leave rows empty on failure
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleExcluded = (idx: number) =>
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, excluded: !r.excluded } : r))
    );

  const handleDownload = () => {
    downloadCsv(
      "target_company_list.csv",
      ["company_name", "website", "tier", "excluded"],
      rows.map((r) => [r.name, r.website, r.tier, r.excluded ? "true" : "false"])
    );
  };

  const needsScroll = rows.length > 15;

  return (
    <SectionCard
      title="Target Companies"
      subtitle="Companies the scraper will poll for open roles."
      actions={<DownloadButton onClick={handleDownload} />}
    >
      <SettingsNote />
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
              <th className="w-[80px] px-4 py-2.5 text-right">Include</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No companies yet.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr
                key={`${r.name}-${i}`}
                className={`border-b border-gray-50 ${
                  r.excluded ? "text-gray-400 line-through" : "text-slate-900"
                }`}
              >
                <td className="px-4 py-2.5 font-medium">{r.name}</td>
                <td className="px-4 py-2.5 text-gray-500">{r.website}</td>
                <td className="px-4 py-2.5 text-gray-500">{r.tier}</td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => toggleExcluded(i)}
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition ${
                      r.excluded
                        ? "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    }`}
                    title={r.excluded ? "Click to include" : "Click to exclude"}
                  >
                    #
                  </button>
                </td>
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

  useEffect(() => {
    let cancelled = false;

    const apply = (text: string) => {
      const next = parseCsv(text, (r) => ({
        field: (r["field"] ?? r["Field"] ?? "").trim(),
        value: (r["value"] ?? r["Value"] ?? "").trim(),
      })).filter((f) => f.field && f.value);
      if (!cancelled) setRows(next);
    };

    const saved = getRoleFiltersCsv();
    if (saved) {
      apply(saved);
      return;
    }

    fetch(DEMO_SOURCES.roleFilters)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(apply)
      .catch(() => {
        // Leave rows empty on failure
      });

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
      <SettingsNote />
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

// ---------- Run Scraper ----------

function RunScraperSection() {
  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="text-base font-semibold text-slate-900">Run Scraper</h3>
      <p className="mt-1 text-sm text-gray-500 mb-4">
        The scraper runs locally via Python. Clone the repo and run it
        against your target companies and role filters.
      </p>
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 font-mono text-xs text-slate-700 mb-4">
        git clone https://github.com/michaophir/sandbox<br />
        cd sandbox<br />
        pip install -r requirements.txt<br />
        python scraper.py
      </div>
      <a
        href="https://github.com/michaophir/sandbox"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50 transition"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
        View on GitHub
      </a>
      <p className="mt-3 text-xs text-gray-400">
        Browser-based scraper coming in a future update.
      </p>
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

    const saved = getLastRunSummary();
    if (saved) {
      apply(saved);
      return;
    }

    fetch(DEMO_SOURCES.lastRunSummary)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(apply)
      .catch(() => {
        // Leave empty on failure
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const companiesFailed = data?.companiesFailed ?? 0;

  return (
    <section className="mb-6">
      <h3 className="text-base font-semibold text-slate-900">Last Run Summary</h3>
      <p className="text-sm text-gray-500 mb-4">
        {data?.runDate ? `Completed ${data.runDate}` : "No run yet"}
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
          value={data?.runDate ? formatShortDate(data.runDate) : "—"}
          subValue={
            data
              ? `${data.companiesSucceeded}/${data.companiesTotal} companies`
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
      {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
      <p className="mt-1 text-sm text-gray-500">{label}</p>
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
    </div>
  );
}
