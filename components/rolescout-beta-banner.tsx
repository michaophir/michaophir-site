"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "rolescout_beta_banner_dismissed";

export default function RolescoutBetaBanner() {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed !== false) return null;

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  return (
    <div className="relative bg-[#ECECEE] px-4 py-2 text-center text-xs text-gray-700">
      <span>
        🚧 Public beta — bugs expected, data stored locally in your browser.
        Feedback →{" "}
        <a
          href="mailto:info@michaophir.com"
          className="underline hover:text-slate-900"
        >
          info@michaophir.com
        </a>
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-slate-900"
      >
        ✕
      </button>
    </div>
  );
}
