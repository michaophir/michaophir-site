import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import RoleScoutSidebar, { MobileSidebarTrigger } from "@/components/rolescout-sidebar";
import RoleScoutClient, { ApplicationsActions } from "../rolescout-client";

export const metadata: Metadata = {
  title: "RoleScout — Applications",
  description: "Track your job applications and pipeline.",
};

export default function RoleScoutApplicationsPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <Navbar />
      <div className="flex">
        <RoleScoutSidebar activeHref="/lab/rolescout/applications" />
        <main className="flex-1 min-w-0 px-10 py-10">
          <MobileSidebarTrigger />
          <div className="max-w-7xl">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  Applications
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Track your pipeline and monitor progress.
                </p>
              </div>
              <ApplicationsActions />
            </div>
            <RoleScoutClient />
          </div>
        </main>
      </div>
    </div>
  );
}
