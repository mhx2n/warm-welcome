import { useEffect, useMemo, useRef, useState } from "react";
import { useResults } from "@/hooks/useSupabaseData";
import { BarChart3, Award, BookOpen, Camera, Save, Trophy, Target, TrendingUp, Radio, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";

interface LiveStat { id: string; score: number; max_score: number; correct: number; wrong: number; skipped: number; percentage: number; status: string; submitted_at: string | null; live_exam_id: string; }
interface LiveExamRow { id: string; title: string; }

const StudentProfile = () => {
  const { data: results = [] } = useResults();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [liveStats, setLiveStats] = useState<LiveStat[]>([]);
  const [liveExamMap, setLiveExamMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  // Fetch live exam participations
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("live_exam_participants").select("*")
        .eq("user_id", user.id).order("submitted_at", { ascending: false });
      setLiveStats((data || []) as LiveStat[]);
      const ids = Array.from(new Set((data || []).map((p: any) => p.live_exam_id)));
      if (ids.length) {
        const { data: les } = await supabase.from("live_exams").select("id,title").in("id", ids);
        const m: Record<string, string> = {};
        (les || []).forEach((x: any) => { m[x.id] = x.title; });
        setLiveExamMap(m);
      }
    })();
  }, [user?.id]);

  const totalAttempts = results.length;
  const validResults = results.filter((r) => typeof r.percentage === "number" && !isNaN(r.percentage));
  const avgScore = validResults.length > 0 ? Math.round(validResults.reduce((s, r) => s + r.percentage, 0) / validResults.length) : 0;
  const bestScore = validResults.length > 0 ? Math.max(...validResults.map((r) => r.percentage)) : 0;
  const uniqueExams = new Set(results.map((r) => r.examId)).size;

  const totals = useMemo(() => {
    let correct = 0, wrong = 0, skipped = 0;
    results.forEach((r: any) => { correct += r.correct || 0; wrong += r.wrong || 0; skipped += r.skipped || 0; });
    liveStats.forEach((p) => { correct += p.correct || 0; wrong += p.wrong || 0; skipped += p.skipped || 0; });
    return { correct, wrong, skipped };
  }, [results, liveStats]);

  const trendData = useMemo(() => {
    return [...validResults].slice(0, 15).reverse().map((r: any, i) => ({
      idx: i + 1,
      pct: Math.round(r.percentage),
      label: r.examTitle?.slice(0, 12) || `#${i + 1}`,
    }));
  }, [validResults]);

  const pieData = [
    { name: "সঠিক", value: totals.correct, color: "hsl(var(--success))" },
    { name: "ভুল", value: totals.wrong, color: "hsl(var(--destructive))" },
    { name: "ছাড়া", value: totals.skipped, color: "hsl(var(--muted-foreground))" },
  ].filter((x) => x.value > 0);

  const submittedLive = liveStats.filter((p) => p.status === "submitted");
  const liveAvg = submittedLive.length ? Math.round(submittedLive.reduce((s, p) => s + (p.percentage || 0), 0) / submittedLive.length) : 0;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: "সংরক্ষিত হয়েছে ✅" });
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "ছবি ৫MB এর মধ্যে হতে হবে", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
      if (updateError) throw updateError;
      await refreshProfile();
      toast({ title: "ছবি আপডেট হয়েছে ✅" });
    } catch (err: any) {
      toast({ title: "আপলোড ব্যর্থ", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const initial = (fullName[0] || user?.email?.[0] || "U").toUpperCase();

  return (
    <div className="pt-24 pb-10 container max-w-4xl mx-auto animate-fade-in px-4">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 mb-6 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-5">
          <div className="relative w-24 h-24 md:w-28 md:h-28 shrink-0">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={fullName} className="w-full h-full rounded-full object-cover ring-4 ring-primary/20" />
          ) : (
            <div className="w-full h-full rounded-full bg-primary/15 text-primary flex items-center justify-center text-3xl font-bold ring-4 ring-primary/20">
              {initial}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
          >
            <Camera size={14} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-2xl font-extrabold">{fullName || "অনুশীলনকারী"}</h1>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
              {profile?.batch_name && (
                <span className="text-xs px-3 py-1.5 rounded-full bg-muted">ব্যাচ: <span className="font-semibold">{profile.batch_name}</span></span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { icon: BookOpen, label: "মোট অনুশীলন", value: totalAttempts, color: "text-primary" },
          { icon: BarChart3, label: "গড় স্কোর", value: `${avgScore}%`, color: "text-blue-500" },
          { icon: Award, label: "সর্বোচ্চ", value: `${Math.round(bestScore)}%`, color: "text-warning" },
          { icon: Radio, label: "লাইভ গড়", value: submittedLive.length ? `${liveAvg}%` : "—", color: "text-success" },
        ].map((s, i) => (
          <div key={i} className="glass-card-static p-4 text-center">
            <s.icon className={`mx-auto mb-2 ${s.color}`} size={20} />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      {(trendData.length > 0 || pieData.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {trendData.length > 1 && (
            <div className="glass-card-static p-4">
              <h3 className="text-sm font-bold mb-2 flex items-center gap-2"><TrendingUp size={14} className="text-primary" /> পারফরম্যান্স ট্রেন্ড</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="idx" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="pct" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {pieData.length > 0 && (
            <div className="glass-card-static p-4">
              <h3 className="text-sm font-bold mb-2 flex items-center gap-2"><Target size={14} className="text-primary" /> উত্তর বিশ্লেষণ</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={{ fontSize: 10 }}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Edit info */}
      <div className="glass-card-static p-5 mb-6 space-y-3">
        <h2 className="text-sm font-bold mb-2">প্রোফাইল তথ্য</h2>
        <div>
          <label className="text-xs text-muted-foreground">পূর্ণ নাম</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full glass-strong rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">মোবাইল নাম্বার</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full glass-strong rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          <Save size={14} /> {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ"}
        </button>
      </div>

      {/* Live exam history */}
      {liveStats.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><Trophy size={14} className="text-warning" /> লাইভ পরীক্ষার ইতিহাস</h2>
          <div className="space-y-2">
            {liveStats.slice(0, 8).map((p) => (
              <div key={p.id} className="glass-card-static p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{liveExamMap[p.live_exam_id] || "—"}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    <span className="text-success flex items-center gap-0.5"><CheckCircle2 size={10} />{p.correct}</span>
                    <span className="text-destructive flex items-center gap-0.5"><XCircle size={10} />{p.wrong}</span>
                    <span>•</span>
                    <span>{p.status === "submitted" ? "জমা" : p.status}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${p.percentage >= 60 ? "text-success" : p.percentage >= 40 ? "text-warning" : "text-destructive"}`}>
                    {Math.round(p.percentage)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">{p.score}/{p.max_score}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><BarChart3 size={14} className="text-primary" /> সাম্প্রতিক অনুশীলন</h2>
          <div className="space-y-2">
            {results.slice(0, 10).map((r, i) => (
              <div key={i} className="glass-card-static p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{r.examTitle}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.timestamp).toLocaleDateString("bn-BD")}</p>
                </div>
                <span className={`font-bold ${r.percentage >= 60 ? "text-success" : "text-destructive"}`}>{Math.round(r.percentage)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;
