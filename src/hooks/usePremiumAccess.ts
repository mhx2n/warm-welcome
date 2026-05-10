import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Returns a filter function that decides whether the current user can access
 * a given exam based on premium batch restrictions.
 *
 * Rule: If an exam has one or more rows in `exam_premium_batches`, only users
 * whose `user_id` exists in `premium_batch_members` for one of those batches
 * can access it. Exams with no restrictions are open to everyone.
 * Admins always see all exams.
 */
export function usePremiumAccess() {
  const { user, isAdmin } = useAuth();
  const [examBatches, setExamBatches] = useState<Record<string, string[]>>({});
  const [myBatches, setMyBatches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: epb }, { data: mine }] = await Promise.all([
        supabase.from("exam_premium_batches").select("exam_id,premium_batch_id"),
        user
          ? supabase.from("premium_batch_members").select("premium_batch_id").eq("user_id", user.id)
          : Promise.resolve({ data: [] as { premium_batch_id: string }[] }),
      ]);
      if (cancelled) return;
      const map: Record<string, string[]> = {};
      (epb || []).forEach((row: any) => {
        map[row.exam_id] = [...(map[row.exam_id] || []), row.premium_batch_id];
      });
      setExamBatches(map);
      setMyBatches((mine || []).map((x: any) => x.premium_batch_id));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const canAccess = (examId: string) => {
    if (isAdmin) return true;
    const required = examBatches[examId];
    if (!required || required.length === 0) return true;
    return required.some((b) => myBatches.includes(b));
  };

  return { canAccess, loading };
}