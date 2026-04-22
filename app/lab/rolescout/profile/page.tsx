import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import RoleScoutSidebar, { MobileSidebarTrigger } from "@/components/rolescout-sidebar";
import ProfileClient from "./profile-client";

export const metadata: Metadata = {
  title: "RoleScout — Profile & Skills",
  description: "Resume, skills, and story bank for smarter job matching.",
};

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <Navbar />
      <div className="flex">
        <RoleScoutSidebar activeHref="/lab/rolescout/profile" />
        <main className="flex-1 px-10 py-10">
          <MobileSidebarTrigger />
          <div className="max-w-6xl">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Profile &amp; Skills
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Upload your Resume to build your candidate profile. The AI extracts your skills, experience, and story bank.
              </p>
            </div>
            <ProfileClient />
          </div>
        </main>
      </div>
    </div>
  );
}
