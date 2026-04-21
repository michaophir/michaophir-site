import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import RoleScoutSidebar from "@/components/rolescout-sidebar";
import DashboardClient from "./dashboard-client";

export const metadata: Metadata = {
  title: "RoleScout — Dashboard",
  description: "AI-powered job search OS.",
};

export default function RoleScoutDashboard() {
  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <Navbar />
      <div className="flex">
        <RoleScoutSidebar activeHref="/lab/rolescout" />
        <main className="flex-1 px-10 py-10">
          <div className="max-w-6xl">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Welcome back, Micha
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Here&apos;s your job search at a glance.
              </p>
            </div>
            <DashboardClient />
          </div>
        </main>
      </div>
    </div>
  );
}
