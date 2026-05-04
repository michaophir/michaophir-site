"use client";

import { useEffect, useRef, useState } from "react";
import type { ApiProvider } from "../lib/storage";
import {
  clearAllRolescout,
  getAnthropicKey,
  getAnthropicModel,
  getCandidateProfile,
  getGeminiKey,
  getGeminiModel,
  getLastRunSummary,
  getOpenAIKey,
  getOpenAIModel,
  getOpenRolesCsv,
  getRoleFiltersCsv,
  getTargetCompaniesCsv,
  getTrackingCsv,
  removeAnthropicKey,
  removeCandidateProfile,
  removeGeminiKey,
  removeLastRunSummary,
  removeOpenAIKey,
  removeOpenRolesCsv,
  removeRoleFiltersCsv,
  removeTargetCompaniesCsv,
  removeTrackingCsv,
  setAnthropicKey,
  setAnthropicModel,
  setCandidateProfile,
  setGeminiKey,
  setGeminiModel,
  setLastRunSummary,
  setOpenAIKey,
  setOpenAIModel,
  setOpenRolesCsv,
  setRoleFiltersCsv,
  setTargetCompaniesCsv,
  setTrackingCsv,
  TRACKING_UPDATED_EVENT,
} from "../lib/storage";

const DEMO_SOURCES = {
  candidateProfile:
    "https://raw.githubusercontent.com/michaophir/rolescout-scraper/main/candidate_profile.json",
  openRolesCsv:
    "https://raw.githubusercontent.com/michaophir/rolescout-scraper/main/open_roles.csv",
  trackingCsv:
    "https://raw.githubusercontent.com/michaophir/rolescout-scraper/main/tracking_sheet.csv",
  lastRunSummary:
    "https://raw.githubusercontent.com/michaophir/rolescout-scraper/main/last_run_summary.json",
  targetCompanies:
    "https://raw.githubusercontent.com/michaophir/rolescout-scraper/main/target_company_list.csv",
  roleFilters:
    "https://raw.githubusercontent.com/michaophir/rolescout-scraper/main/role_filters.csv",
};

type ModelOption = {
  value: string;
  label: string;
};

type ProviderMeta = {
  id: ApiProvider;
  label: string;
  dotClass: string;
  placeholder: string;
  consoleLabel: string;
  consoleHref: string;
  models: ModelOption[];
  defaultModel: string;
};

const PROVIDERS: ProviderMeta[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    dotClass: "bg-orange-400",
    placeholder: "sk-ant-...",
    consoleLabel: "console.anthropic.com",
    consoleHref: "https://console.anthropic.com",
    models: [
      { value: "claude-haiku-4-5-20251001", label: "Haiku 4.5 · fastest & cheapest" },
      { value: "claude-sonnet-4-6", label: "Sonnet 4.6 · balanced" },
      { value: "claude-opus-4-6", label: "Opus 4.6 · most capable" },
    ],
    defaultModel: "claude-haiku-4-5-20251001",
  },
  {
    id: "openai",
    label: "OpenAI",
    dotClass: "bg-green-500",
    placeholder: "sk-...",
    consoleLabel: "platform.openai.com",
    consoleHref: "https://platform.openai.com",
    models: [
      { value: "gpt-4o-mini", label: "GPT-4o mini · fastest & cheapest" },
      { value: "gpt-4o", label: "GPT-4o · balanced" },
    ],
    defaultModel: "gpt-4o-mini",
  },
  {
    id: "gemini",
    label: "Gemini",
    dotClass: "bg-blue-500",
    placeholder: "AI...",
    consoleLabel: "aistudio.google.com",
    consoleHref: "https://aistudio.google.com",
    models: [
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash · fastest & cheapest" },
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro · balanced" },
    ],
    defaultModel: "gemini-2.0-flash",
  },
];

type KeysState = Record<ApiProvider, string>;

const EMPTY_KEYS: KeysState = { anthropic: "", openai: "", gemini: "" };

function readAllKeys(): KeysState {
  return {
    anthropic: getAnthropicKey(),
    openai: getOpenAIKey(),
    gemini: getGeminiKey(),
  };
}

function defaultModels(): KeysState {
  return {
    anthropic: PROVIDERS[0].defaultModel,
    openai: PROVIDERS[1].defaultModel,
    gemini: PROVIDERS[2].defaultModel,
  };
}

function readAllModels(): KeysState {
  const d = defaultModels();
  return {
    anthropic: getAnthropicModel() || d.anthropic,
    openai: getOpenAIModel() || d.openai,
    gemini: getGeminiModel() || d.gemini,
  };
}

type DataRawState = {
  candidateProfile: string;
  openRolesCsv: string;
  trackingCsv: string;
  lastRunSummary: string;
  targetCompaniesCsv: string;
  roleFiltersCsv: string;
};

const EMPTY_DATA_RAW: DataRawState = {
  candidateProfile: "",
  openRolesCsv: "",
  trackingCsv: "",
  lastRunSummary: "",
  targetCompaniesCsv: "",
  roleFiltersCsv: "",
};

async function readAllDataRaw(): Promise<DataRawState> {
  const [
    candidateProfile,
    openRolesCsv,
    trackingCsv,
    lastRunSummary,
    targetCompaniesCsv,
    roleFiltersCsv,
  ] = await Promise.all([
    getCandidateProfile(),
    getOpenRolesCsv(),
    getTrackingCsv(),
    getLastRunSummary(),
    getTargetCompaniesCsv(),
    getRoleFiltersCsv(),
  ]);
  return {
    candidateProfile,
    openRolesCsv,
    trackingCsv,
    lastRunSummary,
    targetCompaniesCsv,
    roleFiltersCsv,
  };
}

function countCsvRows(text: string): number {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  return Math.max(0, lines.length - 1);
}

function parseLocalDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function formatRunDateFromSummary(json: string): string {
  if (!json) return "Saved";
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    const raw = (o.run_date ?? o.runDate) as unknown;
    if (typeof raw === "string") {
      const d = parseLocalDate(raw);
      if (d) {
        return d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    }
  } catch {
    // fall through
  }
  return "Saved";
}

function keysSummaryText(keys: KeysState): string {
  const parts: string[] = [];
  for (const p of PROVIDERS) {
    if (keys[p.id]) parts.push(p.label);
  }
  return parts.length === 0 ? "No keys saved" : parts.join(" · ");
}

export default function SettingsClient() {
  const [activeTab, setActiveTab] = useState<ApiProvider>("anthropic");
  const [savedKeys, setSavedKeys] = useState<KeysState>(EMPTY_KEYS);
  const [inputs, setInputs] = useState<KeysState>(EMPTY_KEYS);
  const [revealed, setRevealed] = useState<Record<ApiProvider, boolean>>({
    anthropic: false,
    openai: false,
    gemini: false,
  });
  const [clearedMessage, setClearedMessage] = useState(false);
  const [models, setModels] = useState<KeysState>(defaultModels());
  const [dataRaw, setDataRaw] = useState<DataRawState>(EMPTY_DATA_RAW);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoStatus, setDemoStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSavedKeys(readAllKeys());
    setModels(readAllModels());
    (async () => {
      const next = await readAllDataRaw();
      if (!cancelled) setDataRaw(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      void refreshData();
    };
    window.addEventListener("rolescout-data-updated", handler);
    return () => window.removeEventListener("rolescout-data-updated", handler);
  }, []);

  function refreshKeys() {
    setSavedKeys(readAllKeys());
  }

  async function refreshData() {
    const next = await readAllDataRaw();
    setDataRaw(next);
  }

  function handleModelChange(provider: ApiProvider, value: string) {
    if (provider === "anthropic") setAnthropicModel(value);
    if (provider === "openai") setOpenAIModel(value);
    if (provider === "gemini") setGeminiModel(value);
    setModels((prev) => ({ ...prev, [provider]: value }));
  }

  function handleSaveKey(provider: ApiProvider) {
    const value = inputs[provider].trim();
    if (!value) return;
    if (provider === "anthropic") setAnthropicKey(value);
    if (provider === "openai") setOpenAIKey(value);
    if (provider === "gemini") setGeminiKey(value);
    setInputs((prev) => ({ ...prev, [provider]: "" }));
    refreshKeys();
  }

  function handleRemoveKey(provider: ApiProvider) {
    if (provider === "anthropic") removeAnthropicKey();
    if (provider === "openai") removeOpenAIKey();
    if (provider === "gemini") removeGeminiKey();
    refreshKeys();
  }

  function handleClearAllKeys() {
    removeAnthropicKey();
    removeOpenAIKey();
    removeGeminiKey();
    refreshKeys();
  }

  async function handleLoadDemo() {
    setDemoLoading(true);
    setDemoStatus(null);
    try {
      const [candidate, openRoles, tracking, lastRun, companies, filters] =
        await Promise.all([
          fetch(DEMO_SOURCES.candidateProfile).then((r) => r.text()),
          fetch(DEMO_SOURCES.openRolesCsv).then((r) => r.text()),
          fetch(DEMO_SOURCES.trackingCsv).then((r) => r.text()),
          fetch(DEMO_SOURCES.lastRunSummary).then((r) => r.text()),
          fetch(DEMO_SOURCES.targetCompanies).then((r) => r.text()),
          fetch(DEMO_SOURCES.roleFilters).then((r) => r.text()),
        ]);

      JSON.parse(candidate);
      JSON.parse(lastRun);

      await Promise.all([
        setCandidateProfile(candidate),
        setOpenRolesCsv(openRoles),
        setTrackingCsv(tracking),
        setLastRunSummary(lastRun),
        setTargetCompaniesCsv(companies),
        setRoleFiltersCsv(filters),
      ]);

      window.dispatchEvent(new CustomEvent(TRACKING_UPDATED_EVENT));

      await refreshData();
      setDemoStatus("Demo data loaded successfully.");
      window.setTimeout(() => setDemoStatus(null), 3000);
    } catch {
      setDemoStatus("error");
    } finally {
      setDemoLoading(false);
    }
  }

  async function handleClearAll() {
    await clearAllRolescout();
    setSavedKeys(EMPTY_KEYS);
    setInputs(EMPTY_KEYS);
    setModels(defaultModels());
    setDataRaw(EMPTY_DATA_RAW);
    setClearedMessage(true);
    window.setTimeout(() => setClearedMessage(false), 2500);
  }

  const activeMeta = PROVIDERS.find((p) => p.id === activeTab)!;
  const activeSaved = savedKeys[activeTab];
  const activeInput = inputs[activeTab];
  const activeRevealed = revealed[activeTab];

  const anyKeySaved = Boolean(
    savedKeys.anthropic || savedKeys.openai || savedKeys.gemini
  );

  return (
    <div className="max-w-5xl grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      {/* Left column — API Key card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900">API Key</h3>
        <p className="text-sm text-gray-500 mt-1 mb-6">
          Used for resume parsing and AI features. Your key is saved locally in your browser and never sent anywhere except the provider&apos;s API.
        </p>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-5">
          {PROVIDERS.map((p) => {
            const active = p.id === activeTab;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveTab(p.id)}
                className={`-mb-px pb-2 text-sm transition ${
                  active
                    ? "border-b-2 border-slate-900 text-slate-900 font-semibold"
                    : "text-gray-400 hover:text-slate-700"
                }`}
              >
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${p.dotClass}`} />
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Tab panel */}
        <div>
          <label
            htmlFor={`key-input-${activeTab}`}
            className="text-sm font-medium text-slate-700 mb-1 block"
          >
            {activeMeta.label} API key
          </label>
          <div className="relative">
            <input
              id={`key-input-${activeTab}`}
              type={activeRevealed ? "text" : "password"}
              value={activeInput}
              onChange={(e) =>
                setInputs((prev) => ({ ...prev, [activeTab]: e.target.value }))
              }
              placeholder={activeMeta.placeholder}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:border-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() =>
                setRevealed((prev) => ({ ...prev, [activeTab]: !prev[activeTab] }))
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-slate-700"
            >
              {activeRevealed ? "Hide" : "Show"}
            </button>
          </div>

          {/* Status row */}
          <div className="mt-2 flex items-center text-xs text-gray-500">
            {activeSaved ? (
              <>
                <span className="w-2 h-2 rounded-full inline-block mr-1.5 bg-green-500" />
                Key saved
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full inline-block mr-1.5 bg-gray-300" />
                No key saved
              </>
            )}
          </div>

          <label
            htmlFor={`model-select-${activeTab}`}
            className="text-sm font-medium text-slate-700 mb-1 mt-3 block"
          >
            Model
          </label>
          <select
            id={`model-select-${activeTab}`}
            value={models[activeTab]}
            onChange={(e) => handleModelChange(activeTab, e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none mt-3"
          >
            {activeMeta.models.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => handleSaveKey(activeTab)}
            disabled={activeInput.trim() === ""}
            className={`w-full rounded-full text-sm font-medium py-2.5 mt-3 transition ${
              activeInput.trim() === ""
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-slate-900 text-white hover:bg-slate-700"
            }`}
          >
            Save key
          </button>

          {activeSaved && (
            <button
              type="button"
              onClick={() => handleRemoveKey(activeTab)}
              className="text-xs text-red-500 hover:text-red-700 underline cursor-pointer text-center block mt-2 w-full"
            >
              Remove
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Demo data button */}
        {/* TODO: wire up demo-data flow */}
        <button
          type="button"
          className="w-full rounded-full border border-gray-200 text-sm font-medium py-2.5 text-slate-700 hover:bg-gray-50 transition"
        >
          Continue with demo data
        </button>

        {/* Footer note */}
        <p className="text-xs text-gray-400 mt-4 flex items-start gap-1.5">
          <span aria-hidden="true">ⓘ</span>
          <span>
            Get your key at{" "}
            <a
              href={activeMeta.consoleHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 underline"
            >
              {activeMeta.consoleLabel}
            </a>
            . Your key is only used to make API calls directly from your browser — it is never logged or stored.
          </span>
        </p>
      </div>

      {/* Right column — Data & Storage card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900">Data &amp; Storage</h3>
        <p className="text-sm text-gray-500 mt-1 mb-6">
          All RoleScout data is stored locally in your browser. Clear individual items or wipe everything.
        </p>

        <div className="mb-6 pb-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Demo data</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Populate all fields with sample data from RoleScout
              </p>
            </div>
            <button
              onClick={handleLoadDemo}
              disabled={demoLoading}
              className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-gray-50 transition disabled:opacity-50"
            >
              {demoLoading ? "Loading..." : "Load demo data"}
            </button>
          </div>
          {demoStatus && (
            <p
              className={`text-xs mt-2 ${
                demoStatus === "error" ? "text-red-500" : "text-green-600"
              }`}
            >
              {demoStatus === "error"
                ? "Failed to load some demo data."
                : demoStatus}
            </p>
          )}
        </div>

        <div>
          <DataItem
            name="Candidate Profile"
            description="Skills, experience, and target roles"
            statusPresent={dataRaw.candidateProfile !== ""}
            statusText={dataRaw.candidateProfile !== "" ? "Saved" : "Empty"}
            upload={{
              label: "Upload JSON",
              accept: ".json",
              validateAsJson: true,
              onText: (text) => setCandidateProfile(text),
            }}
            onClear={async () => {
              await removeCandidateProfile();
              await refreshData();
            }}
            onAfterUpload={refreshData}
            sampleHref={DEMO_SOURCES.candidateProfile}
          />
          <DataItem
            name="Open Roles CSV"
            description="Last scraper output"
            statusPresent={dataRaw.openRolesCsv !== ""}
            statusText={
              dataRaw.openRolesCsv !== ""
                ? `${countCsvRows(dataRaw.openRolesCsv)} rows`
                : "Empty"
            }
            upload={{
              label: "Upload CSV",
              accept: ".csv",
              validateAsJson: false,
              onText: (text) => setOpenRolesCsv(text),
            }}
            onClear={async () => {
              await removeOpenRolesCsv();
              await refreshData();
            }}
            onAfterUpload={refreshData}
            sampleHref={DEMO_SOURCES.openRolesCsv}
          />
          <DataItem
            name="Tracking CSV"
            description="Your application history"
            statusPresent={dataRaw.trackingCsv !== ""}
            statusText={
              dataRaw.trackingCsv !== ""
                ? `${countCsvRows(dataRaw.trackingCsv)} rows`
                : "Empty"
            }
            upload={{
              label: "Upload CSV",
              accept: ".csv",
              validateAsJson: false,
              onText: async (text) => {
                await setTrackingCsv(text);
                window.dispatchEvent(new CustomEvent(TRACKING_UPDATED_EVENT));
              },
            }}
            onClear={async () => {
              await removeTrackingCsv();
              await refreshData();
            }}
            onAfterUpload={refreshData}
            sampleHref={DEMO_SOURCES.trackingCsv}
          />
          <DataItem
            name="Last Run Summary"
            description="Scraper run metadata"
            statusPresent={dataRaw.lastRunSummary !== ""}
            statusText={
              dataRaw.lastRunSummary !== ""
                ? formatRunDateFromSummary(dataRaw.lastRunSummary)
                : "Empty"
            }
            upload={{
              label: "Upload JSON",
              accept: ".json",
              validateAsJson: true,
              onText: (text) => setLastRunSummary(text),
            }}
            onClear={async () => {
              await removeLastRunSummary();
              await refreshData();
            }}
            onAfterUpload={refreshData}
            sampleHref={DEMO_SOURCES.lastRunSummary}
          />
          <DataItem
            name="Target Companies"
            description="Company list for the scraper"
            statusPresent={dataRaw.targetCompaniesCsv !== ""}
            statusText={
              dataRaw.targetCompaniesCsv !== ""
                ? `${countCsvRows(dataRaw.targetCompaniesCsv)} companies`
                : "Empty"
            }
            upload={{
              label: "Upload CSV",
              accept: ".csv",
              validateAsJson: false,
              onText: (text) => setTargetCompaniesCsv(text),
            }}
            onClear={async () => {
              await removeTargetCompaniesCsv();
              await refreshData();
            }}
            onAfterUpload={refreshData}
            sampleHref={DEMO_SOURCES.targetCompanies}
          />
          <DataItem
            name="Role Filters"
            description="Title, seniority, domain and skill filters"
            statusPresent={dataRaw.roleFiltersCsv !== ""}
            statusText={
              dataRaw.roleFiltersCsv !== ""
                ? `${countCsvRows(dataRaw.roleFiltersCsv)} filters`
                : "Empty"
            }
            upload={{
              label: "Upload CSV",
              accept: ".csv",
              validateAsJson: false,
              onText: (text) => setRoleFiltersCsv(text),
            }}
            onClear={async () => {
              await removeRoleFiltersCsv();
              await refreshData();
            }}
            onAfterUpload={refreshData}
            sampleHref={DEMO_SOURCES.roleFilters}
          />
          <DataItem
            name="API Keys"
            description="All saved provider keys"
            statusPresent={anyKeySaved}
            statusText={keysSummaryText(savedKeys)}
            onClear={handleClearAllKeys}
          />
        </div>

        <button
          type="button"
          onClick={handleClearAll}
          className="mt-6 w-full rounded-full border border-red-200 text-red-600 text-sm font-medium py-2.5 hover:bg-red-50 transition"
        >
          Clear all RoleScout data
        </button>
        {clearedMessage && (
          <p className="text-xs text-green-600 mt-2 text-center">All data cleared.</p>
        )}
      </div>
    </div>
  );
}

type UploadConfig = {
  label: string;
  accept: string;
  validateAsJson: boolean;
  onText: (text: string) => void | Promise<void>;
};

function DataItem({
  name,
  description,
  statusPresent,
  statusText,
  upload,
  onClear,
  onAfterUpload,
  sampleHref,
}: {
  name: string;
  description: string;
  statusPresent: boolean;
  statusText: string;
  upload?: UploadConfig;
  onClear?: () => void | Promise<void>;
  onAfterUpload?: () => void | Promise<void>;
  sampleHref?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function onUploadClick() {
    setError(null);
    inputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !upload) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = String(ev.target?.result ?? "");
      if (upload.validateAsJson) {
        try {
          JSON.parse(text);
        } catch {
          setError("Invalid file");
          return;
        }
      }
      await upload.onText(text);
      setError(null);
      await onAfterUpload?.();
    };
    reader.onerror = () => setError("Invalid file");
    reader.readAsText(file);
  }

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-900">{name}</div>
        <div className="text-xs text-gray-400 mt-0.5">{description}</div>
        <div className="mt-1 flex items-center text-xs text-gray-500">
          <span
            className={`w-2 h-2 rounded-full inline-block mr-1.5 ${
              statusPresent ? "bg-green-500" : "bg-gray-300"
            }`}
          />
          {statusText}
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
      <div className="flex items-center shrink-0">
        {upload && (
          <>
            <button
              type="button"
              onClick={onUploadClick}
              className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-gray-50 transition"
            >
              {upload.label}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={upload.accept}
              onChange={onFileChange}
              className="hidden"
            />
          </>
        )}
        {sampleHref && (
          <a
            href={sampleHref}
            download
            className="text-xs text-gray-400 hover:text-slate-700 underline ml-2"
          >
            Sample
          </a>
        )}
        {statusPresent && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-red-500 hover:text-red-700 underline cursor-pointer ml-3"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
