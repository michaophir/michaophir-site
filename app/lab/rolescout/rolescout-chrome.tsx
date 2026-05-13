"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import RoleScoutSidebar, {
  MobileSidebarTrigger,
} from "@/components/rolescout-sidebar";
import OnboardingRedirect, {
  ONBOARDED_CHANGED_EVENT,
  ONBOARDED_KEY,
} from "./onboarding-redirect";

export default function RolescoutChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isOnboarding = pathname?.startsWith("/lab/rolescout/start") ?? false;
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        setOnboarded(window.localStorage.getItem(ONBOARDED_KEY) === "true");
      } catch {
        setOnboarded(false);
      }
    };
    read();
    window.addEventListener(ONBOARDED_CHANGED_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(ONBOARDED_CHANGED_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  const locked = isOnboarding && !onboarded;

  return (
    <>
      <OnboardingRedirect />
      <div className="flex">
        <RoleScoutSidebar locked={locked} />
        <main className="flex-1 min-w-0 px-10 py-10">
          <MobileSidebarTrigger locked={locked} />
          {children}
        </main>
      </div>
    </>
  );
}
