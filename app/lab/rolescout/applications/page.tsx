import type { Metadata } from "next";
import RoleScoutClient from "../rolescout-client";

export const metadata: Metadata = {
  title: "RoleScout — Applications",
  description: "Track your job applications and pipeline.",
};

export default function RoleScoutApplicationsPage() {
  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Applications
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Track your application pipeline and monitor progress.
        </p>
      </div>
      <RoleScoutClient />
    </div>
  );
}
