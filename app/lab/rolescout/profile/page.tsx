import type { Metadata } from "next";
import ProfileClient from "./profile-client";

export const metadata: Metadata = {
  title: "RoleScout — Profile & Skills",
  description: "Upload your resume. We'll extract your skills, build your candidate profile, and generate your target companies.",
};

export default function ProfilePage() {
  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Profile &amp; Skills
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Upload your resume. We&apos;ll extract your skills, build your candidate profile, and generate your target companies.
        </p>
      </div>
      <ProfileClient />
    </div>
  );
}
