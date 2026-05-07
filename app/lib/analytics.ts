import { track } from "@vercel/analytics";
import { get } from "idb-keyval";

export async function trackEvent(
  eventName: string,
  metadata: Record<string, string | number | boolean> = {}
): Promise<void> {
  let isDemo = false;
  try {
    const profile = await get("rolescout_candidate_profile");
    if (profile) {
      const parsed =
        typeof profile === "string" ? JSON.parse(profile) : profile;
      isDemo = parsed?.name === "Alex Rivera";
    }
  } catch {
    isDemo = false;
  }
  track(eventName, { ...metadata, is_demo: isDemo });
}
