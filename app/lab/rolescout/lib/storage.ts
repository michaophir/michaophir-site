export type ApiProvider = "anthropic" | "openai" | "gemini";

export const STORAGE_KEYS = {
  anthropicKey: "rolescout_api_key_anthropic",
  openaiKey: "rolescout_api_key_openai",
  geminiKey: "rolescout_api_key_gemini",
  apiProvider: "rolescout_api_provider",
  anthropicModel: "rolescout_model_anthropic",
  openaiModel: "rolescout_model_openai",
  geminiModel: "rolescout_model_gemini",
  candidateProfile: "rolescout_candidate_profile",
  resumeFilename: "rolescout_resume_filename",
  lastRunSummary: "rolescout_last_run_summary",
  openRolesCsv: "rolescout_open_roles_csv",
  trackingCsv: "rolescout_tracking_csv",
} as const;

const ALL_KEYS: string[] = Object.values(STORAGE_KEYS);

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

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

export function getCandidateProfile(): string {
  return getString(STORAGE_KEYS.candidateProfile);
}
export function setCandidateProfile(json: string): void {
  setString(STORAGE_KEYS.candidateProfile, json);
}
export function removeCandidateProfile(): void {
  removeKey(STORAGE_KEYS.candidateProfile);
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

export function getLastRunSummary(): string {
  return getString(STORAGE_KEYS.lastRunSummary);
}
export function setLastRunSummary(json: string): void {
  setString(STORAGE_KEYS.lastRunSummary, json);
}
export function removeLastRunSummary(): void {
  removeKey(STORAGE_KEYS.lastRunSummary);
}

export function getOpenRolesCsv(): string {
  return getString(STORAGE_KEYS.openRolesCsv);
}
export function setOpenRolesCsv(csv: string): void {
  setString(STORAGE_KEYS.openRolesCsv, csv);
}
export function removeOpenRolesCsv(): void {
  removeKey(STORAGE_KEYS.openRolesCsv);
}

export function getTrackingCsv(): string {
  return getString(STORAGE_KEYS.trackingCsv);
}
export function setTrackingCsv(csv: string): void {
  setString(STORAGE_KEYS.trackingCsv, csv);
}
export function removeTrackingCsv(): void {
  removeKey(STORAGE_KEYS.trackingCsv);
}

export function clearAllRolescout(): void {
  if (!isBrowser()) return;
  for (const key of ALL_KEYS) {
    window.localStorage.removeItem(key);
  }
}
