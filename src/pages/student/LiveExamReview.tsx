import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, XCircle, MinusCircle, Trophy } from "lucide-react";
import MathText from "@/components/MathText";
import { resolveCorrectOptionText, isAnswerMatch } from "@/lib/answerUtils";
import { computeLiveStatus } from "@/lib/liveExamStatus";

interface LiveExam {
  id: string; title: string; exam_id: string;
  start_time: string; end_time: string; status: string;
}
interface QRow {
  id: string; question: string; options: string[]; answer: string;
  explanation: string | null; section: string | null;
}
interface AnswerRow { question_id: string; selected_answer: string; }
interface Participant { id: string; score: number; max_score: number; correct: number; wrong: number; skipped: number; percentage: number; }

const LiveExamReview = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<LiveExam | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [questions, setQuestions] = useState<QRow[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "correct" | "wrong" | "skipped">("all");

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      setLoading(true);
      const { data: le } = await supabase.from("live_exams").select("*").eq("id", id).single();
      if (!le) { toast({ title: "পরীক্ষা পাওয়া যায়নি", variant: "destructive" }); navigate("/live-exams"); return; }
      const effective = computeLiveStatus(le.start_time, le.end_time, le.status);

      // Fetch participant — student must have submitted
      const { data: p } = await supabase.from("live_exam_participants")
        .select("id,score,max_score,correct,wrong,skipped,percentage,status")
        .eq("live_exam_id", id).eq("user_id", user.id).maybeSingle();

      if (!p || p.status !== "submitted") {
        toast({ title: "জমা দেওয়ার পরে পর্যালোচনা দেখা যাবে", variant: "destructive" });
        navigate("/live-exams");
        return;
      }
      // Strict: review available ONLY after the live exam has ended (anti-cheating)
      if (effective !== "ended") {
        toast({ title: "পরীক্ষা শেষ হওয়ার পর উত্তর পর্যালোচনা দেখা যাবে", variant: "destructive" });
        navigate("/live-exams");
        return;
      }

      setExam(le as LiveExam);
      setParticipant(p as Participant);

      const [{ data: q }, { data: a }] = await Promise.all([
        supabase.from("questions")
          .select("id,question,options,answer,explanation,section")
          .eq("exam_id", le.exam_id).order("sort_order"),
        supabase.from("live_exam_answers")
          .select("question_id,selected_answer")
          .eq("participant_id", p.id),
      ]);

      const parsed: QRow[] = (q || []).map((row: any) => {
        const opts = Array.isArray(row.options)
          ? row.options
          : (typeof row.options === "string" ? (() => { try { return JSON.parse(row.options); } catch { return []; } })() : []);
        return {
          id: row.id,
          question: row.question,
          options: opts,
          answer: row.answer,
          explanation: row.explanation || "",
          section: row.section,
        };
      });
      setQuestions(parsed);
      const map: Record<string, string> = {};
      (a as AnswerRow[] | null || []).forEach((row) => { map[row.question_id] = row.selected_answer; });
      setAnswers(map);
      setLoading(false);
    })();
  }, [id, user]);

  if (loading) return <div className="pt-32 text-center text-sm text-muted-foreground">লোড হচ্ছে...</div>;
  if (!exam || !participant) return null;

  const total = questions.length;
  const counted = questions.map((q) => {
    const sel = answers[q.id];
    if (!sel) return "skipped" as const;
    return isAnswerMatch(sel, resolveCorrectOptionText(q as any)) ? "correct" : "wrong";
  });
  const filtered = questions.filter((_, i) => filter === "all" || counted[i] === filter);

  const tabs: Array<{ key: typeof filter; label: string; count: number; cls: string }> = [
    { key: "all", label: "সব", count: total, cls: "bg-primary/15 text-primary" },
    { key: "correct", label: "সঠিক", count: counted.filter((x) => x === "correct").length, cls: "bg-success/15 text-success" },
    { key: "wrong", label: "ভুল", count: counted.filter((x) => x === "wrong").length, cls: "bg-destructive/15 text-destructive" },
    { key: "skipped", label: "স্কিপ", count: counted.filter((x) => x === "skipped").length, cls: "bg-muted text-muted-foreground" },
  ];

  return (
    <div className="min-h-screen pt-24 pb-10 px-4 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg glass-strong"><ArrowLeft size={16} /></button>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground">পর্যালোচনা</p>
          <h1 className="text-base font-bold truncate">{exam.title}</h1>
        </div>
        <Link to="/live-exams" className="text-xs text-primary font-semibold inline-flex items-center gap-1">
          <Trophy size={14} /> র‍্যাঙ্কিং
        </Link>
      </div>

      <div className="glass-card-static p-4 grid grid-cols-4 gap-2 text-center">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`p-2 rounded-xl ${filter === t.key ? "ring-2 ring-primary" : ""} ${t.cls}`}>
            <p className="text-xl font-extrabold tabular-nums">{t.count}</p>
            <p className="text-[10px] font-semibold">{t.label}</p>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="glass-card-static p-8 text-center text-sm text-muted-foreground">এই ক্যাটাগরিতে কোনো প্রশ্ন নেই</div>
        )}
        {filtered.map((q) => {
          const idx = questions.findIndex((x) => x.id === q.id);
          const state = counted[idx];
          const correctText = resolveCorrectOptionText(q as any);
          const selected = answers[q.id] || "";

          const stateMeta = state === "correct"
            ? { icon: <CheckCircle2 size={14} />, label: "সঠিক", cls: "bg-success/15 text-success border-success/30" }
            : state === "wrong"
            ? { icon: <XCircle size={14} />, label: "ভুল", cls: "bg-destructive/15 text-destructive border-destructive/30" }
            : { icon: <MinusCircle size={14} />, label: "স্কিপ", cls: "bg-muted text-muted-foreground border-border" };

          return (
            <div key={q.id} className="glass-card-static p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">প্রশ্ন {idx + 1} / {total}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border ${stateMeta.cls}`}>
                  {stateMeta.icon} {stateMeta.label}
                </span>
              </div>
              <div className="text-sm font-semibold leading-relaxed"><MathText text={q.question} /></div>
              <div className="space-y-1.5">
                {q.options.map((opt, i) => {
                  const isCorrect = isAnswerMatch(opt, correctText);
                  const isPicked = selected && isAnswerMatch(opt, selected);
                  let cls = "border-border bg-card";
                  if (isCorrect) cls = "border-success/50 bg-success/10";
                  else if (isPicked) cls = "border-destructive/50 bg-destructive/10";
                  return (
                    <div key={i} className={`p-2.5 rounded-lg border-2 text-sm flex items-start gap-2 ${cls}`}>
                      <span className="font-bold shrink-0">{String.fromCharCode(65 + i)}.</span>
                      <span className="flex-1 min-w-0"><MathText text={opt} /></span>
                      {isCorrect && <CheckCircle2 size={14} className="text-success shrink-0 mt-0.5" />}
                      {isPicked && !isCorrect && <XCircle size={14} className="text-destructive shrink-0 mt-0.5" />}
                    </div>
                  );
                })}
              </div>
              {q.explanation && (
                <div className="text-xs bg-primary/5 border border-primary/15 rounded-lg p-3">
                  <p className="font-bold text-primary mb-1">ব্যাখ্যা</p>
                  <div className="leading-relaxed text-foreground/85"><MathText text={q.explanation} /></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LiveExamReview;
