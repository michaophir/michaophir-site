"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCandidateProfile } from "./lib/storage";

export const ONBOARDED_KEY = "rolescout_user_onboarded";
export const ONBOARDED_CHANGED_EVENT = "rolescout-onboarded-changed";

export default function OnboardingRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname || !pathname.startsWith("/lab/rolescout")) return;
    if (pathname.startsWith("/lab/rolescout/start")) return;

    let cancelled = false;
    (async () => {
      const onboarded =
        window.localStorage.getItem(ONBOARDED_KEY) === "true";
      if (onboarded) return;
      const profile = await getCandidateProfile();
      if (cancelled) return;
      if (!profile) {
        router.replace("/lab/rolescout/start");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
