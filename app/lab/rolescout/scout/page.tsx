import type { Metadata } from "next";
import ScoutClient from "./scout-client";

export const metadata: Metadata = {
  title: "RoleScout — Scout",
  description: "Run the scout and review your last run.",
};

export default function ScoutPage() {
  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Scout
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Run the scout and review your last run.
        </p>
      </div>
      <ScoutClient />
    </div>
  );
}
