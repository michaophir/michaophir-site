import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import RoleScoutSidebar from "@/components/rolescout-sidebar";
import ScoutClient from "./scout-client";

export const metadata: Metadata = {
  title: "RoleScout — Scout",
  description: "Configure target companies and role filters for scraping.",
};

export default function ScoutPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <Navbar />
      <div className="flex">
        <RoleScoutSidebar activeHref="/lab/rolescout/scout" />
        <main className="flex-1 px-10 py-10">
          <div className="max-w-6xl">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Scout
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Configure target companies, role filters, and run the scraper.
              </p>
            </div>
            <ScoutClient />
          </div>
        </main>
      </div>
    </div>
  );
}
