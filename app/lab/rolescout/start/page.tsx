import type { Metadata } from "next";
import StartClient from "./start-client";

export const metadata: Metadata = {
  title: "Quick start · RoleScout",
  description:
    "Upload your resume and get your first ranked roles in about a minute.",
};

export default function StartPage() {
  return <StartClient />;
}
