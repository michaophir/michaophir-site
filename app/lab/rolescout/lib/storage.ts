import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";

export type ApiProvider = "anthropic" | "openai" | "gemini";

export const TRACKING_UPDATED_EVENT = "rolescout-tracking-updated";

export const STORAGE_KEYS = {
  anthropicKey: "rolescout_api_key_anthropic",
  openaiKey: "rolescout_api_key_openai",
  geminiKey: "rolescout_api_key_gemini",
  apiProvider: "rolescout_api_provider",
  anthropicModel: "rolescout_model_anthropic",
  openaiModel: "rolescout_model_openai",
  geminiModel: "rolescout_model_gemini",
  candidateProfile: "rolescout_candidate_profile",
  candidateProfileSavedAt: "rolescout_candidate_profile_saved_at",
  resumeFilename: "rolescout_resume_filename",
  lastRunSummary: "rolescout_last_run_summary",
  openRolesCsv: "rolescout_open_roles_csv",
  trackingCsv: "rolescout_tracking_csv",
  targetCompaniesCsv: "rolescout_target_companies",
  roleFiltersCsv: "rolescout_role_filters",
} as const;

// Large data keys — backed by IndexedDB via idb-keyval.
const IDB_KEYS = new Set<string>([
  STORAGE_KEYS.candidateProfile,
  STORAGE_KEYS.lastRunSummary,
  STORAGE_KEYS.openRolesCsv,
  STORAGE_KEYS.trackingCsv,
  STORAGE_KEYS.targetCompaniesCsv,
  STORAGE_KEYS.roleFiltersCsv,
]);

// Small preference keys — backed by localStorage.
const LS_PREFERENCE_KEYS: string[] = [
  STORAGE_KEYS.anthropicKey,
  STORAGE_KEYS.openaiKey,
  STORAGE_KEYS.geminiKey,
  STORAGE_KEYS.apiProvider,
  STORAGE_KEYS.anthropicModel,
  STORAGE_KEYS.openaiModel,
  STORAGE_KEYS.geminiModel,
  STORAGE_KEYS.candidateProfileSavedAt,
  STORAGE_KEYS.resumeFilename,
  "rolescout_sidebar_collapsed",
];

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

// Sync helpers for localStorage-only keys.
function getString(key: string): string {
  if (!isBrowser()) return "";
  return window.localStorage.getItem(key) ?? "";
}

function setString(key: string, value: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, value);
}

function removeKey(key: string): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(key);
}

// Hybrid async helpers — route IDB_KEYS through idb-keyval, others through localStorage.
export async function getStorageItem(key: string): Promise<string> {
  if (!isBrowser()) return "";
  if (IDB_KEYS.has(key)) {
    const v = await idbGet<string>(key);
    return v ?? "";
  }
  return window.localStorage.getItem(key) ?? "";
}

export async function setStorageItem(key: string, value: string): Promise<void> {
  if (!isBrowser()) return;
  if (IDB_KEYS.has(key)) {
    await idbSet(key, value);
    return;
  }
  window.localStorage.setItem(key, value);
}

export async function removeStorageItem(key: string): Promise<void> {
  if (!isBrowser()) return;
  if (IDB_KEYS.has(key)) {
    await idbDel(key);
    return;
  }
  window.localStorage.removeItem(key);
}

// ---------- Small (sync, localStorage-backed) helpers ----------

export function getAnthropicKey(): string {
  return getString(STORAGE_KEYS.anthropicKey);
}
export function setAnthropicKey(value: string): void {
  setString(STORAGE_KEYS.anthropicKey, value);
}
export function removeAnthropicKey(): void {
  removeKey(STORAGE_KEYS.anthropicKey);
}

export function getOpenAIKey(): string {
  return getString(STORAGE_KEYS.openaiKey);
}
export function setOpenAIKey(value: string): void {
  setString(STORAGE_KEYS.openaiKey, value);
}
export function removeOpenAIKey(): void {
  removeKey(STORAGE_KEYS.openaiKey);
}

export function getGeminiKey(): string {
  return getString(STORAGE_KEYS.geminiKey);
}
export function setGeminiKey(value: string): void {
  setString(STORAGE_KEYS.geminiKey, value);
}
export function removeGeminiKey(): void {
  removeKey(STORAGE_KEYS.geminiKey);
}

export function getApiProvider(): ApiProvider {
  const v = getString(STORAGE_KEYS.apiProvider);
  if (v === "openai" || v === "gemini" || v === "anthropic") return v;
  return "anthropic";
}
export function setApiProvider(value: ApiProvider): void {
  setString(STORAGE_KEYS.apiProvider, value);
}
export function removeApiProvider(): void {
  removeKey(STORAGE_KEYS.apiProvider);
}

export function getAnthropicModel(): string {
  return getString(STORAGE_KEYS.anthropicModel);
}
export function setAnthropicModel(value: string): void {
  setString(STORAGE_KEYS.anthropicModel, value);
}
export function removeAnthropicModel(): void {
  removeKey(STORAGE_KEYS.anthropicModel);
}

export function getOpenAIModel(): string {
  return getString(STORAGE_KEYS.openaiModel);
}
export function setOpenAIModel(value: string): void {
  setString(STORAGE_KEYS.openaiModel, value);
}
export function removeOpenAIModel(): void {
  removeKey(STORAGE_KEYS.openaiModel);
}

export function getGeminiModel(): string {
  return getString(STORAGE_KEYS.geminiModel);
}
export function setGeminiModel(value: string): void {
  setString(STORAGE_KEYS.geminiModel, value);
}
export function removeGeminiModel(): void {
  removeKey(STORAGE_KEYS.geminiModel);
}

export function getResumeFilename(): string {
  return getString(STORAGE_KEYS.resumeFilename);
}
export function setResumeFilename(value: string): void {
  setString(STORAGE_KEYS.resumeFilename, value);
}
export function removeResumeFilename(): void {
  removeKey(STORAGE_KEYS.resumeFilename);
}

// ---------- Large (async, IndexedDB-backed) helpers ----------

export async function getCandidateProfile(): Promise<string> {
  return getStorageItem(STORAGE_KEYS.candidateProfile);
}
export async function setCandidateProfile(json: string): Promise<void> {
  await setStorageItem(STORAGE_KEYS.candidateProfile, json);
  setString(STORAGE_KEYS.candidateProfileSavedAt, new Date().toISOString());
}
export async function removeCandidateProfile(): Promise<void> {
  await removeStorageItem(STORAGE_KEYS.candidateProfile);
  removeKey(STORAGE_KEYS.candidateProfileSavedAt);
}

export function getCandidateProfileSavedAt(): string {
  return getString(STORAGE_KEYS.candidateProfileSavedAt);
}

export async function getLastRunSummary(): Promise<string> {
  return getStorageItem(STORAGE_KEYS.lastRunSummary);
}
export async function setLastRunSummary(json: string): Promise<void> {
  return setStorageItem(STORAGE_KEYS.lastRunSummary, json);
}
export async function removeLastRunSummary(): Promise<void> {
  return removeStorageItem(STORAGE_KEYS.lastRunSummary);
}

export async function getOpenRolesCsv(): Promise<string> {
  return getStorageItem(STORAGE_KEYS.openRolesCsv);
}
export async function setOpenRolesCsv(csv: string): Promise<void> {
  return setStorageItem(STORAGE_KEYS.openRolesCsv, csv);
}
export async function removeOpenRolesCsv(): Promise<void> {
  return removeStorageItem(STORAGE_KEYS.openRolesCsv);
}

export async function getTrackingCsv(): Promise<string> {
  return getStorageItem(STORAGE_KEYS.trackingCsv);
}
export async function setTrackingCsv(csv: string): Promise<void> {
  return setStorageItem(STORAGE_KEYS.trackingCsv, csv);
}
export async function removeTrackingCsv(): Promise<void> {
  return removeStorageItem(STORAGE_KEYS.trackingCsv);
}

export async function getTargetCompaniesCsv(): Promise<string> {
  return getStorageItem(STORAGE_KEYS.targetCompaniesCsv);
}
export async function setTargetCompaniesCsv(csv: string): Promise<void> {
  return setStorageItem(STORAGE_KEYS.targetCompaniesCsv, csv);
}
export async function removeTargetCompaniesCsv(): Promise<void> {
  return removeStorageItem(STORAGE_KEYS.targetCompaniesCsv);
}

export async function getRoleFiltersCsv(): Promise<string> {
  return getStorageItem(STORAGE_KEYS.roleFiltersCsv);
}
export async function setRoleFiltersCsv(csv: string): Promise<void> {
  return setStorageItem(STORAGE_KEYS.roleFiltersCsv, csv);
}
export async function removeRoleFiltersCsv(): Promise<void> {
  return removeStorageItem(STORAGE_KEYS.roleFiltersCsv);
}

export async function clearAllRolescout(): Promise<void> {
  if (!isBrowser()) return;
  await Promise.all([...IDB_KEYS].map((k) => idbDel(k)));
  for (const k of LS_PREFERENCE_KEYS) {
    window.localStorage.removeItem(k);
  }
}
