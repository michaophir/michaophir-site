import type { Metadata } from "next";
import RoleScoutClient from "./rolescout-client";

export const metadata: Metadata = {
  title: "RoleScout — Job Hunt Monitoring",
  description: "AI-powered job hunt monitoring dashboard.",
};

export default function RoleScoutPage() {
  return <RoleScoutClient />;
}
