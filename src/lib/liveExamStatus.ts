import { supabase } from "@/integrations/supabase/client";

export type LiveStatus = "scheduled" | "live" | "ended";

/**
 * Compute the effective status of a live exam from its schedule.
 * Manual override: if admin explicitly set "ended", we never auto-revive it.
 * Returns the new status to apply (or null if no change is needed).
 */
export function computeLiveStatus(
  startTime: string | Date,
  endTime: string | Date,
  storedStatus: string,
  now: Date = new Date(),
): LiveStatus {
  const start = typeof startTime === "string" ? new Date(startTime) : startTime;
  const end = typeof endTime === "string" ? new Date(endTime) : endTime;

  // Manual end is sticky
  if (storedStatus === "ended") return "ended";

  if (now >= end) return "ended";
  if (now >= start) return "live";
  return "scheduled";
}

/**
 * Sync DB status to match the schedule for a list of live exams.
 * Fire-and-forget; errors are swallowed.
 */
export async function syncLiveStatuses(exams: Array<{ id: string; start_time: string; end_time: string; status: string }>) {
  const now = new Date();
  const updates: Array<{ id: string; status: LiveStatus }> = [];
  for (const e of exams) {
    const next = computeLiveStatus(e.start_time, e.end_time, e.status, now);
    if (next !== e.status) updates.push({ id: e.id, status: next });
  }
  await Promise.all(
    updates.map((u) =>
      supabase.from("live_exams").update({ status: u.status }).eq("id", u.id).then(() => undefined, () => undefined),
    ),
  );
  return updates;
}
