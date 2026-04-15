import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import RoleScoutClient from "../rolescout-client";

export const metadata: Metadata = {
  title: "RoleScout — Applications",
  description: "Track your job applications and pipeline.",
};

export default function RoleScoutApplicationsPage() {
  return (
    <>
      <Navbar />
      <RoleScoutClient />
    </>
  );
}
