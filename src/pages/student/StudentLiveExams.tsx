import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Play, Radio, Sparkles, Trophy, Unlock, X, Medal } from "lucide-react";
import { usePremiumAccess } from "@/hooks/usePremiumAccess";
import { getLabel } from "@/lib/labels";

interface LiveExam {
  id: string;
  title: string;
  description: string;
  exam_id: string;
  start_time: string;
  end_time: string;
  duration: number;
  access_mode: string;
  status: string;
  show_leaderboard?: boolean;
}

interface FinishedParticipant {
  id: string;
  user_id: string;
  score: number;
  max_score: number;
  percentage: number;
  status: string;
  submitted_at: string | null;
  time_taken_seconds: number;
}

interface ProfileLite { user_id: string; full_name: string | null; avatar_url: string | null; batch_name: string | null; }

function useTick() {
  const [, set] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => set((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, []);
}

function formatCountdown(target: Date) {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return null;
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (days > 0) return `${days}দিন ${hours}ঘ ${minutes}মি`;
  if (hours > 0) return `${hours}ঘ ${minutes}মি ${secs}সে`;
  return `${minutes}মি ${String(secs).padStart(2, "0")}সে`;
}

const StudentLiveExams = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canAccess, loading: accessLoading } = usePremiumAccess();
  const [exams, setExams] = useState<LiveExam[]>([]);
  const [finishedExams, setFinishedExams] = useState<LiveExam[]>([]);
  const [mySubmittedIds, setMySubmittedIds] = useState<Set<string>>(new Set());
  const [boardExam, setBoardExam] = useState<LiveExam | null>(null);
  const [boardParts, setBoardParts] = useState<FinishedParticipant[]>([]);
  const [boardProfiles, setBoardProfiles] = useState<Record<string, ProfileLite>>({});
  const [boardLoading, setBoardLoading] = useState(false);
  const [joiningExamId, setJoiningExamId] = useState<string | null>(null);
  useTick();

  const load = async () => {
    const { data: live } = await supabase
      .from("live_exams")
      .select("*")
      .in("status", ["scheduled", "live"])
      .order("start_time", { ascending: true });
    if (live) setExams(live as LiveExam[]);

    const { data: ended } = await supabase
      .from("live_exams")
      .select("*")
      .eq("status", "ended")
      .order("end_time", { ascending: false })
      .limit(30);
    if (ended) setFinishedExams(ended as LiveExam[]);

    if (user) {
      const { data: mine } = await supabase
        .from("live_exam_participants")
        .select("live_exam_id,status")
        .eq("user_id", user.id);
      const ids = new Set<string>();
      (mine || []).forEach((m: any) => { if (m.status === "submitted") ids.add(m.live_exam_id); });
      setMySubmittedIds(ids);
    }
  };

  useEffect(() => {
    void load();
  }, [user]);

  const openBoard = async (exam: LiveExam) => {
    setBoardExam(exam);
    setBoardLoading(true);
    setBoardParts([]);
    setBoardProfiles({});
    const { data } = await supabase
      .from("live_exam_participants")
      .select("id,user_id,score,max_score,percentage,status,submitted_at,time_taken_seconds")
      .eq("live_exam_id", exam.id)
      .order("score", { ascending: false });
    const list = (data || []) as FinishedParticipant[];
    list.sort((a, b) => b.score - a.score || a.time_taken_seconds - b.time_taken_seconds);
    setBoardParts(list);
    const ids = Array.from(new Set(list.map((p) => p.user_id)));
    if (ids.length) {
      const { data: pr } = await supabase.from("profiles")
        .select("user_id,full_name,avatar_url,batch_name").in("user_id", ids);
      const map: Record<string, ProfileLite> = {};
      (pr || []).forEach((x: any) => { map[x.user_id] = x; });
      setBoardProfiles(map);
    }
    setBoardLoading(false);
  };

  const accessibleExams = accessLoading ? [] : exams.filter((exam) => canAccess(exam.exam_id));
  const liveNow = accessibleExams.filter((exam) => exam.status === "live");
  const upcoming = accessibleExams.filter((exam) => exam.status === "scheduled");

  // Show finished boards for: ended exams the user can access, OR live exams already submitted by user.
  const finishedBoards = [
    ...finishedExams.filter((e) => !accessLoading && canAccess(e.exam_id)),
    ...exams.filter((e) => mySubmittedIds.has(e.id) && !finishedExams.find((f) => f.id === e.id)),
  ];

  const joinExam = async (exam: LiveExam) => {
    if (!user) return;
    if (exam.status !== "live") {
      return toast({ title: "পরীক্ষা এখনও শুরু হয়নি", variant: "destructive" });
    }
    if (!canAccess(exam.exam_id)) {
      return toast({ title: "এই পরীক্ষার অ্যাক্সেস নেই", description: "এডমিন প্রিমিয়াম ব্যাচে অ্যাক্সেস দিলে পরীক্ষা দেখা/দেয়া যাবে।", variant: "destructive" });
    }

    setJoiningExamId(exam.id);
    try {
      const { error } = await supabase.from("live_exam_participants").insert({
        live_exam_id: exam.id,
        user_id: user.id,
        status: "joined",
      });

      if (error && !error.message.toLowerCase().includes("duplicate") && !error.message.toLowerCase().includes("unique")) {
        return toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
      }

      navigate(`/live-exam/${exam.id}`);
    } catch (error: any) {
      toast({ title: "যোগ দেওয়া যায়নি", description: error.message, variant: "destructive" });
    } finally {
      setJoiningExamId(null);
    }
  };

  return (
    <div className="pt-24 pb-10 px-4 max-w-6xl mx-auto animate-fade-in space-y-6">
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20">
        <div className="relative space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Sparkles size={14} /> {getLabel("liveExamBadge")}
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-extrabold">{getLabel("liveExamHeroTitle")}</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">{getLabel("liveExamHeroSubtitle")}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <div className="glass-card-static p-3 text-center">
              <p className="text-xl font-bold">{liveNow.length}</p>
              <p className="text-[11px] text-muted-foreground">{getLabel("liveExamStatNow")}</p>
            </div>
            <div className="glass-card-static p-3 text-center">
              <p className="text-xl font-bold">{upcoming.length}</p>
              <p className="text-[11px] text-muted-foreground">{getLabel("liveExamStatUpcoming")}</p>
            </div>
          </div>
        </div>
      </div>

      {liveNow.length > 0 && (
        <div>
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
            </span>
            {getLabel("liveExamSectionLive")} ({liveNow.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {liveNow.map((exam) => (
              <ExamCardLive key={exam.id} exam={exam} joining={joiningExamId === exam.id} onJoin={() => joinExam(exam)} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
          <Calendar size={16} className="text-primary" /> {getLabel("liveExamSectionUpcoming")} ({upcoming.length})
        </h2>
        {accessLoading ? (
          <div className="glass-card-static p-10 text-center text-sm text-muted-foreground">লোড হচ্ছে...</div>
        ) : upcoming.length === 0 && liveNow.length === 0 ? (
          <div className="glass-card-static p-10 text-center">
            <Trophy className="mx-auto text-muted-foreground/40 mb-3" size={40} />
            <p className="text-sm font-medium mb-1">{getLabel("liveExamEmptyTitle")}</p>
            <p className="text-xs text-muted-foreground">{getLabel("liveExamEmptySubtitle")}</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {upcoming.map((exam) => (
              <ExamCardLive key={exam.id} exam={exam} joining={joiningExamId === exam.id} onJoin={() => joinExam(exam)} />
            ))}
          </div>
        )}
      </div>

      {finishedBoards.length > 0 && (
        <div>
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            <Trophy size={16} className="text-warning" /> ফলাফল ও র‍্যাঙ্কিং ({finishedBoards.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {finishedBoards.map((exam) => (
              <button key={exam.id} onClick={() => openBoard(exam)}
                className="glass-card-static p-4 text-left hover:scale-[1.01] transition-transform flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
                  <Medal size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{exam.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(exam.end_time).toLocaleDateString("bn-BD")} • {exam.status === "ended" ? "সম্পন্ন" : "আপনি জমা দিয়েছেন"}
                  </p>
                </div>
                <span className="text-xs text-primary font-semibold shrink-0">র‍্যাঙ্কিং →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {boardExam && (
        <LeaderboardModal
          exam={boardExam}
          parts={boardParts}
          profiles={boardProfiles}
          loading={boardLoading}
          currentUserId={user?.id}
          onClose={() => setBoardExam(null)}
        />
      )}
    </div>
  );
};

function ExamCardLive({
  exam,
  joining,
  onJoin,
}: {
  exam: LiveExam;
  joining: boolean;
  onJoin: () => void;
}) {
  const isLive = exam.status === "live";
  const startCountdown = formatCountdown(new Date(exam.start_time));

  return (
    <div className="glass-card-static p-4 flex flex-col gap-3 hover:scale-[1.01] transition-transform">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Radio size={14} className="text-primary" />
            <h3 className="font-bold text-sm leading-tight truncate">{exam.title}</h3>
          </div>
          {exam.description && <p className="text-xs text-muted-foreground line-clamp-2">{exam.description}</p>}
        </div>
        <span
          className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${
            isLive ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
          }`}
        >
          {isLive ? "🔴 লাইভ" : "নির্ধারিত"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-muted/40 rounded-lg px-2.5 py-2 flex items-center gap-1.5">
          <Clock size={12} className="text-primary" /> {exam.duration} মিনিট
        </div>
        <div className="rounded-lg px-2.5 py-2 flex items-center gap-1.5 bg-primary/10 text-primary">
          <Unlock size={12} /> অনুমোদিত
        </div>
      </div>

      {!isLive && startCountdown && (
        <div className="text-[11px] text-center bg-primary/5 text-primary rounded-lg py-1.5 font-mono">
          ⏳ শুরু হবে: {startCountdown}
        </div>
      )}

      <button
        onClick={onJoin}
        disabled={!isLive || joining}
        className={`mt-auto w-full px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
          isLive ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
      >
        <Play size={14} />
        {joining ? getLabel("liveExamJoining") : !isLive ? getLabel("liveExamWait") : getLabel("liveExamJoinNow")}
      </button>
    </div>
  );
}

export default StudentLiveExams;
