import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Radio, Trash2, Download, Trophy, X, Crown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExamRow { id: string; title: string; question_count: number; duration: number; published: boolean; }
interface LiveExam {
  id: string; title: string; description: string; exam_id: string;
  start_time: string; end_time: string; duration: number;
  access_mode: string; status: string; show_leaderboard: boolean;
}
interface Participant {
  id: string; user_id: string; score: number; max_score: number; correct: number; wrong: number;
  skipped: number; percentage: number; time_taken_seconds: number; status: string; submitted_at: string | null;
}
interface Profile { user_id: string; full_name: string | null; email: string | null; batch_name: string | null; phone: string | null; }

const AdminLiveExams = () => {
  const { toast } = useToast();
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [liveExams, setLiveExams] = useState<LiveExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<LiveExam | null>(null);
  const [parts, setParts] = useState<Participant[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  const [form, setForm] = useState({
    title: "", description: "", exam_id: "", start_time: "", end_time: "",
    duration: 60, show_leaderboard: true,
  });

  const load = async () => {
    setLoading(true);
    const [e, l] = await Promise.all([
      supabase.from("exams").select("id,title,question_count,duration,published").order("created_at", { ascending: false }),
      supabase.from("live_exams").select("*").order("start_time", { ascending: false }),
    ]);
    if (e.data) setExams(e.data as ExamRow[]);
    if (l.data) setLiveExams(l.data as LiveExam[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const loadDetail = async (le: LiveExam) => {
    setSelected(le);
    const { data } = await supabase.from("live_exam_participants").select("*").eq("live_exam_id", le.id).order("score", { ascending: false });
    if (data) {
      setParts(data as Participant[]);
      const ids = Array.from(new Set((data as Participant[]).map((x) => x.user_id)));
      if (ids.length) {
        const { data: pr } = await supabase.from("profiles").select("user_id,full_name,email,batch_name,phone").in("user_id", ids);
        const map: Record<string, Profile> = {};
        (pr || []).forEach((x: any) => { map[x.user_id] = x; });
        setProfiles(map);
      } else {
        setProfiles({});
      }
    }
  };

  const createLiveExam = async () => {
    if (!form.title || !form.exam_id || !form.start_time || !form.end_time) {
      return toast({ title: "সব তথ্য পূরণ করুন", variant: "destructive" });
    }
    const { error } = await supabase.from("live_exams").insert({
      title: form.title,
      description: form.description,
      exam_id: form.exam_id,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      duration: Number(form.duration),
      access_mode: "open",
      show_leaderboard: form.show_leaderboard,
      status: "scheduled",
    });
    if (error) return toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    toast({ title: "লাইভ পরীক্ষা তৈরি হয়েছে ✅" });
    setShowForm(false);
    setForm({ title: "", description: "", exam_id: "", start_time: "", end_time: "", duration: 60, show_leaderboard: true });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("live_exams").update({ status }).eq("id", id);
    toast({ title: `স্ট্যাটাস: ${status}` });
    load();
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const deleteLiveExam = async (id: string) => {
    if (!confirm("লাইভ পরীক্ষা মুছবেন?")) return;
    await supabase.from("live_exams").delete().eq("id", id);
    setSelected(null);
    load();
  };

  const exportLeaderboardPDF = () => {
    if (!selected) return;
    (async () => {
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      const W = doc.internal.pageSize.getWidth();
      const sorted = [...parts].sort((a, b) => b.score - a.score || a.time_taken_seconds - b.time_taken_seconds);
      const submitted = parts.filter((p) => p.status === "submitted" || p.submitted_at);
      const fmt = (d: string) => new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
      const timeText = (seconds = 0) => {
        const mm = Math.floor(seconds / 60);
        const ss = seconds % 60;
        return `${mm}:${String(ss).padStart(2, "0")}`;
      };

      // Header band
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, W, 26, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(selected.title, 12, 11);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Final Result Report", 12, 18);
      doc.setTextColor(30, 41, 59);

      // Exam info block
      const infoLines = [
        `Exam: ${selected.title}`,
        `Start: ${fmt(selected.start_time)}    End: ${fmt(selected.end_time)}`,
        `Duration: ${selected.duration} min    Participants: ${parts.length}    Submitted: ${submitted.length}`,
      ];
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      let y = 33;
      infoLines.forEach((ln) => { doc.text(ln, 12, y); y += 5.2; });

      autoTable(doc, {
        startY: y + 3,
        head: [["Rank", "Name", "Score", "Correct", "Wrong", "Percent", "Time", "Status"]],
        body: sorted.map((p, i) => {
          const pr = profiles[p.user_id];
          return [
            String(i + 1),
            pr?.full_name || "Unknown",
            `${p.score}/${p.max_score}`,
            String(p.correct),
            String(p.wrong),
            `${p.percentage.toFixed(1)}%`,
            timeText(p.time_taken_seconds || 0),
            p.status || (p.submitted_at ? "submitted" : "started"),
          ];
        }),
        styles: { font: "helvetica", fontStyle: "normal", fontSize: 9.5, cellPadding: 3, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.2, overflow: "linebreak" },
        headStyles: { font: "helvetica", fontStyle: "bold", fillColor: [37, 99, 235], textColor: 255, halign: "center", valign: "middle" },
        bodyStyles: { font: "helvetica", fontStyle: "normal", halign: "center", valign: "middle", textColor: [30, 41, 59] },
        columnStyles: { 1: { halign: "left", cellWidth: 58 }, 7: { cellWidth: 22 } },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 10, right: 10 },
      });

      const pages = doc.getNumberOfPages();
      for (let p = 1; p <= pages; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Page ${p} / ${pages}`, W - 12, doc.internal.pageSize.getHeight() - 6, { align: "right" });
        doc.text("Target — Smart Exam Platform", 12, doc.internal.pageSize.getHeight() - 6);
      }

      doc.save(`report-${selected.title.replace(/[\\/:*?"<>|]+/g, "_")}.pdf`);
    })();
  };

  const sortedParts = [...parts].sort((a, b) => b.score - a.score || a.time_taken_seconds - b.time_taken_seconds);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2"><Radio size={22} /> লাইভ পরীক্ষা</h1>
          <p className="text-sm text-muted-foreground">লাইভ পরীক্ষা তৈরি ও ফলাফলের র‍্যাঙ্কিং ম্যানেজ করুন</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1 hover:bg-primary/90">
          <Plus size={14} /> নতুন
        </button>
      </div>

      {showForm && (
        <div className="glass-card-static p-5 space-y-3">
          <input className="w-full glass-strong rounded-lg px-3 py-2 text-sm" placeholder="টাইটেল"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="w-full glass-strong rounded-lg px-3 py-2 text-sm" placeholder="বিবরণ" rows={2}
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select className="w-full glass-strong rounded-lg px-3 py-2 text-sm"
            value={form.exam_id} onChange={(e) => setForm({ ...form, exam_id: e.target.value })}>
            <option value="">পরীক্ষা সিলেক্ট করুন</option>
            {exams.map((x) => <option key={x.id} value={x.id}>{x.title} ({x.question_count}টি) {x.published ? "✓" : "• অপ্রকাশিত"}</option>)}
          </select>
          <p className="text-[11px] text-muted-foreground -mt-1 flex items-center gap-1.5"><Crown size={12} /> অ্যাক্সেস দিতে Admin → পরীক্ষা ব্যবস্থাপনা থেকে এই পরীক্ষার প্রিমিয়াম ব্যাচ সিলেক্ট করুন। কোনো কোড লাগবে না।</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">শুরু</label>
              <input type="datetime-local" className="w-full glass-strong rounded-lg px-3 py-2 text-sm"
                value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">শেষ</label>
              <input type="datetime-local" className="w-full glass-strong rounded-lg px-3 py-2 text-sm"
                value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">সময়কাল (মিনিট)</label>
            <input type="number" className="w-full glass-strong rounded-lg px-3 py-2 text-sm"
              value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.show_leaderboard}
              onChange={(e) => setForm({ ...form, show_leaderboard: e.target.checked })} />
            জমা দেওয়ার পরে র‍্যাঙ্কিং দেখাও
          </label>
          <div className="flex gap-2">
            <button onClick={createLiveExam} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">তৈরি করো</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg glass-strong text-sm">বাতিল</button>
          </div>
        </div>
      )}

      <div className="glass-card-static p-5">
        <h2 className="text-sm font-bold mb-3">সব লাইভ পরীক্ষা ({liveExams.length})</h2>
        {loading ? <p className="text-sm text-muted-foreground">লোড হচ্ছে...</p> :
          liveExams.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">কোনো লাইভ পরীক্ষা নেই</p> :
          <div className="space-y-2">
            {liveExams.map((le) => (
              <div key={le.id} className="glass-strong rounded-lg p-3 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{le.title}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      le.status === "live" ? "bg-success/15 text-success" :
                      le.status === "ended" ? "bg-muted text-muted-foreground" :
                      "bg-warning/15 text-warning"
                    }`}>{le.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(le.start_time).toLocaleString()} → {new Date(le.end_time).toLocaleString()} • {le.duration} মিনিট
                  </p>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => loadDetail(le)} className="px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs">বিস্তারিত</button>
                  {le.status !== "live" && <button onClick={() => updateStatus(le.id, "live")} className="px-2.5 py-1.5 rounded-lg bg-success/10 text-success text-xs">শুরু</button>}
                  {le.status === "live" && <button onClick={() => updateStatus(le.id, "ended")} className="px-2.5 py-1.5 rounded-lg bg-warning/10 text-warning text-xs">শেষ</button>}
                  <button onClick={() => deleteLiveExam(le.id)} className="px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        }
      </div>

      {selected && (
        <div className="glass-card-static p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">{selected.title}</h2>
            <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-muted rounded-lg"><X size={16} /></button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold flex items-center gap-2"><Trophy size={14} /> লিডারবোর্ড ({parts.length})</h3>
              <button onClick={exportLeaderboardPDF} className="px-3 py-1.5 rounded-lg glass-strong text-xs flex items-center gap-1"><Download size={12} /> PDF</button>
            </div>
            <div className="overflow-auto max-h-96">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="text-left border-b border-border">
                    <th className="p-2">র‍্যাঙ্ক</th><th className="p-2">নাম</th><th className="p-2">ব্যাচ</th>
                    <th className="p-2">স্কোর</th><th className="p-2">সঠিক</th><th className="p-2">ভুল</th><th className="p-2">%</th><th className="p-2">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedParts.map((p, i) => {
                    const pr = profiles[p.user_id];
                    return (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="p-2 font-bold">{i + 1}</td>
                        <td className="p-2">{pr?.full_name || "—"}<br /><span className="text-muted-foreground">{pr?.email}</span></td>
                        <td className="p-2">{pr?.batch_name || "—"}</td>
                        <td className="p-2 font-semibold">{p.score}/{p.max_score}</td>
                        <td className="p-2 text-success">{p.correct}</td>
                        <td className="p-2 text-destructive">{p.wrong}</td>
                        <td className="p-2">{p.percentage.toFixed(1)}%</td>
                        <td className="p-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{p.status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLiveExams;
