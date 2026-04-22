import type { Metadata } from "next";
import SettingsClient from "./settings-client";

export const metadata: Metadata = {
  title: "RoleScout — Settings",
  description: "Manage your API keys and local data.",
};

export default function SettingsPage() {
  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Settings
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your API keys and local data.
        </p>
      </div>
      <SettingsClient />
    </div>
  );
}
