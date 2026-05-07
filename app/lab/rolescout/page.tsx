import type { Metadata } from "next";
import DashboardClient from "./dashboard-client";

export const metadata: Metadata = {
  title: "RoleScout — Dashboard",
  description: "AI-powered job search OS.",
};

export default function RoleScoutDashboard() {
  return (
    <div className="max-w-6xl">
      <DashboardClient />
    </div>
  );
}
