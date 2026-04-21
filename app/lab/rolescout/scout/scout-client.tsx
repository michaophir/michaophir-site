"use client";

import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { getLastRunSummary, setLastRunSummary } from "../lib/storage";

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

type AtsRow = { name: string; count: number };

type LastRunSummary = {
  runDate: string;
  companiesSucceeded: number;
  companiesFailed: number;
  rolesFetched: number;
  atsBreakdown: AtsRow[];
};

// ---------- Demo data ----------

const DEMO_COMPANIES: TargetCompany[] = [
  { name: "Anthropic", website: "anthropic.com", tier: "1", excluded: false },
  { name: "Stripe", website: "stripe.com", tier: "1", excluded: false },
  { name: "Figma", website: "figma.com", tier: "2", excluded: false },
  { name: "Notion", website: "notion.so", tier: "2", excluded: false },
  { name: "Linear", website: "linear.app", tier: "2", excluded: false },
  { name: "Retool", website: "retool.com", tier: "3", excluded: true },
];

const DEMO_FILTERS: RoleFilter[] = [
  { field: "Title contains", value: "Senior" },
  { field: "Title contains", value: "Staff" },
  { field: "Title contains", value: "Principal" },
  { field: "Location", value: "Remote" },
  { field: "Location", value: "San Francisco" },
  { field: "Department", value: "Engineering" },
];

const DEMO_LAST_RUN: LastRunSummary = {
  runDate: "2026-04-14",
  companiesSucceeded: 21,
  companiesFailed: 1,
  rolesFetched: 151,
  atsBreakdown: [
    { name: "Greenhouse", count: 101 },
    { name: "Ashby", count: 30 },
    { name: "Lever", count: 20 },
  ],
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

function UploadButton({
  label,
  onUpload,
}: {
  label: string;
  onUpload: (text: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => onUpload(ev.target?.result as string);
          reader.readAsText(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
      >
        {label}
      </button>
    </>
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

// ---------- Target Companies ----------

function TargetCompaniesSection() {
  const [rows, setRows] = useState<TargetCompany[]>(DEMO_COMPANIES);

  const handleUpload = (text: string) => {
    const next = parseCsv(text, (r) => ({
      name: (r["Company Name"] ?? r["name"] ?? "").trim(),
      website: (r["Website"] ?? r["website"] ?? "").trim(),
      tier: (r["Tier"] ?? r["tier"] ?? "").trim(),
      excluded: false,
    })).filter((c) => c.name);
    if (next.length > 0) setRows(next);
  };

  const toggleExcluded = (idx: number) =>
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, excluded: !r.excluded } : r))
    );

  const handleDownload = () => {
    downloadCsv(
      "target_company_list.csv",
      ["Company Name", "Website", "Tier", "Excluded"],
      rows.map((r) => [r.name, r.website, r.tier, r.excluded ? "true" : "false"])
    );
  };

  return (
    <SectionCard
      title="Target Companies"
      subtitle="Companies the scraper will poll for open roles."
      actions={
        <>
          <UploadButton label="Upload CSV" onUpload={handleUpload} />
          <DownloadButton onClick={handleDownload} />
        </>
      }
    >
      <div className="overflow-hidden rounded-lg border border-gray-100">
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
                  No companies yet — upload a CSV
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
  const [rows, setRows] = useState<RoleFilter[]>(DEMO_FILTERS);
  const [draftField, setDraftField] = useState("");
  const [draftValue, setDraftValue] = useState("");

  const handleUpload = (text: string) => {
    const next = parseCsv(text, (r) => ({
      field: (r["Field"] ?? r["field"] ?? "").trim(),
      value: (r["Value"] ?? r["value"] ?? "").trim(),
    })).filter((f) => f.field && f.value);
    if (next.length > 0) setRows(next);
  };

  const handleDownload = () => {
    downloadCsv(
      "role_filters.csv",
      ["Field", "Value"],
      rows.map((r) => [r.field, r.value])
    );
  };

  const addRow = () => {
    if (!draftField.trim() || !draftValue.trim()) return;
    setRows((prev) => [...prev, { field: draftField.trim(), value: draftValue.trim() }]);
    setDraftField("");
    setDraftValue("");
  };

  const removeRow = (i: number) =>
    setRows((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <SectionCard
      title="Role Filters"
      subtitle="Keywords and constraints applied after scraping to narrow the role list."
      actions={
        <>
          <UploadButton label="Upload CSV" onUpload={handleUpload} />
          <DownloadButton onClick={handleDownload} />
        </>
      }
    >
      <div className="overflow-hidden rounded-lg border border-gray-100">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-xs font-medium uppercase tracking-wider text-gray-400">
              <th className="px-4 py-2.5">Field</th>
              <th className="px-4 py-2.5">Value</th>
              <th className="w-[60px] px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 text-slate-900">
                <td className="px-4 py-2.5 font-medium">{r.field}</td>
                <td className="px-4 py-2.5 text-gray-600">{r.value}</td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="text-xs text-gray-300 hover:text-red-500"
                    title="Remove"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50/40">
              <td className="px-4 py-2">
                <input
                  type="text"
                  value={draftField}
                  onChange={(e) => setDraftField(e.target.value)}
                  placeholder="Field (e.g. Title contains)"
                  className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="text"
                  value={draftValue}
                  onChange={(e) => setDraftValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addRow()}
                  placeholder="Value"
                  className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </td>
              <td className="px-4 py-2 text-right">
                <button
                  type="button"
                  onClick={addRow}
                  disabled={!draftField.trim() || !draftValue.trim()}
                  className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ---------- Run Scraper ----------

function RunScraperSection() {
  const [toast, setToast] = useState<string | null>(null);

  const handleRun = () => {
    setToast("Coming soon");
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <SectionCard title="Run Scraper" subtitle="Kick off a fresh search for open roles.">
      <div className="flex flex-col items-start gap-3">
        <button
          type="button"
          onClick={handleRun}
          className="rounded-full bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
        >
          Run Scraper
        </button>
        <p className="text-xs text-gray-500">
          Runs against your target company list and role filters.
        </p>
        {toast && (
          <div className="mt-1 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">
            {toast}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ---------- Last Run Summary ----------

function normalizeSummary(raw: unknown): LastRunSummary {
  const o = (raw ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" ? v : 0);
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const companiesSucceeded = num(o.companiesSucceeded ?? o.companies_succeeded);
  const companiesTotalRaw = o.companies_total;
  const companiesFailed =
    typeof o.companiesFailed === "number"
      ? o.companiesFailed
      : typeof o.companies_failed === "number"
      ? o.companies_failed
      : typeof companiesTotalRaw === "number"
      ? companiesTotalRaw - companiesSucceeded
      : 0;
  const rolesFetched = num(
    o.rolesFetched ?? o.roles_fetched ?? o.roles_fetched_post_filter
  );
  const atsRaw = Array.isArray(o.atsBreakdown)
    ? o.atsBreakdown
    : Array.isArray(o.ats_breakdown)
    ? o.ats_breakdown
    : [];
  const atsBreakdown: AtsRow[] = atsRaw
    .map((r) => {
      const row = (r ?? {}) as Record<string, unknown>;
      return { name: str(row.name), count: num(row.count) };
    })
    .filter((r) => r.name !== "");
  return {
    runDate: str(o.runDate ?? o.run_date),
    companiesSucceeded,
    companiesFailed,
    rolesFetched,
    atsBreakdown,
  };
}

function LastRunSummarySection() {
  const [data, setData] = useState<LastRunSummary>(DEMO_LAST_RUN);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const saved = getLastRunSummary();
    if (!saved) return;
    try {
      setData(normalizeSummary(JSON.parse(saved)));
    } catch {
      // leave demo in place
    }
  }, []);

  function onUploadClick() {
    setUploadError(null);
    fileInputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result ?? "");
      try {
        const parsed = JSON.parse(text);
        setData(normalizeSummary(parsed));
        setLastRunSummary(text);
        setUploadError(null);
      } catch {
        setUploadError("Invalid JSON file.");
      }
    };
    reader.onerror = () => setUploadError("Invalid JSON file.");
    reader.readAsText(file);
  }

  return (
    <SectionCard
      title="Last Run Summary"
      subtitle={data.runDate ? `Completed ${data.runDate}` : "No run yet"}
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatTile
          value={data.companiesSucceeded}
          label="Companies succeeded"
          color="text-emerald-600"
        />
        <StatTile
          value={data.companiesFailed}
          label="Companies failed"
          color="text-red-500"
        />
        <StatTile
          value={data.rolesFetched}
          label="Roles fetched (post-filter)"
          color="text-slate-900"
        />
      </div>

      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Per-ATS breakdown
        </p>
        <ul className="space-y-2">
          {data.atsBreakdown.map((a) => {
            const total = data.atsBreakdown.reduce((s, r) => s + r.count, 0);
            const pct = total > 0 ? (a.count / total) * 100 : 0;
            return (
              <li key={a.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900">{a.name}</span>
                  <span className="text-gray-500">{a.count}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-6 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onUploadClick}
          className="rounded-full bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 transition"
        >
          Upload last_run_summary.json
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={onFileChange}
          className="hidden"
        />
        {uploadError && (
          <p className="text-xs text-red-500 mt-2">{uploadError}</p>
        )}
      </div>
    </SectionCard>
  );
}

function StatTile({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3">
      <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </div>
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
