import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Radio, Trash2, Download, Trophy, X, Crown, ImageDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSiteSettings } from "@/hooks/useSupabaseData";
import { resolveReportTheme, hexToRgb, defaultReportSettings } from "@/lib/reportThemePresets";

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
interface Profile { user_id: string; full_name: string | null; email: string | null; batch_name: string | null; phone: string | null; avatar_url?: string | null; }

const AdminLiveExams = () => {
  const { toast } = useToast();
  const { data: siteSettings } = useSiteSettings();
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
        const { data: pr } = await supabase.from("profiles").select("user_id,full_name,email,batch_name,phone,avatar_url").in("user_id", ids);
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
      const H = doc.internal.pageSize.getHeight();
      const sorted = [...parts].sort((a, b) => b.score - a.score || a.time_taken_seconds - b.time_taken_seconds);
      const submitted = parts.filter((p) => p.status === "submitted" || p.submitted_at);
      const fmt = (d: string) => new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
      const timeText = (seconds = 0) => {
        const mm = Math.floor(seconds / 60);
        const ss = seconds % 60;
        return `${mm}:${String(ss).padStart(2, "0")}`;
      };

      // ===== Theme + footer config =====
      const reportCfg = siteSettings?.reportSettings || defaultReportSettings;
      const theme = resolveReportTheme(reportCfg);
      const headerRgb = hexToRgb(theme.header);
      const accentRgb = hexToRgb(theme.accent);
      const podium = reportCfg.podiumColors || { gold: "#eab308", silver: "#94a3b8", bronze: "#ca8a04" };
      const goldRgb = hexToRgb(podium.gold);
      const silverRgb = hexToRgb(podium.silver);
      const bronzeRgb = hexToRgb(podium.bronze);

      // ===== Avatar pre-fetch (top participants only — keep PDF light) =====
      const avatarMap: Record<string, string> = {};
      const avatarUsers = sorted.slice(0, 60); // limit
      await Promise.all(avatarUsers.map(async (p) => {
        const url = profiles[p.user_id]?.avatar_url;
        if (!url) return;
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const blob = await res.blob();
          const dataUrl: string = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.onerror = reject;
            r.readAsDataURL(blob);
          });
          avatarMap[p.user_id] = dataUrl;
        } catch { /* ignore */ }
      }));

      const drawAvatar = (uid: string, name: string, x: number, y: number, size: number) => {
        const dataUrl = avatarMap[uid];
        if (dataUrl) {
          try {
            const fmt = dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
            // jsPDF clipping: round mask via circle then addImage
            doc.saveGraphicsState?.();
            doc.addImage(dataUrl, fmt, x, y, size, size, undefined, "FAST");
            doc.restoreGraphicsState?.();
            return;
          } catch { /* fall through */ }
        }
        // Initial-circle fallback
        doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
        doc.circle(x + size / 2, y + size / 2, size / 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(size * 1.6);
        doc.text((name || "U")[0].toUpperCase(), x + size / 2, y + size / 2 + size * 0.18, { align: "center" });
      };

      // ===== Header band =====
      doc.setFillColor(headerRgb[0], headerRgb[1], headerRgb[2]);
      doc.rect(0, 0, W, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.text(selected.title, 12, 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Final Result Report", 12, 19);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`, W - 12, 19, { align: "right" });
      doc.setTextColor(30, 41, 59);

      // ===== Exam info block =====
      const infoLines = [
        `Start: ${fmt(selected.start_time)}    End: ${fmt(selected.end_time)}`,
        `Duration: ${selected.duration} min    Participants: ${parts.length}    Submitted: ${submitted.length}`,
      ];
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      let y = 35;
      infoLines.forEach((ln) => { doc.text(ln, 12, y); y += 4.8; });
      y += 3;

      // ===== Podium block (top 3) =====
      const top3 = sorted.slice(0, 3);
      if (top3.length > 0) {
        const podiumY = y;
        const podiumH = 56;
        // Background card
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(10, podiumY, W - 20, podiumH, 3, 3, "F");
        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(headerRgb[0], headerRgb[1], headerRgb[2]);
        doc.text("TOP PERFORMERS", W / 2, podiumY + 6.5, { align: "center" });

        const slots: { rank: number; idx: number; medal: string; medalRgb: [number, number, number]; tileH: number }[] = [
          { rank: 2, idx: 1, medal: "2nd", medalRgb: silverRgb, tileH: 22 },
          { rank: 1, idx: 0, medal: "1st", medalRgb: goldRgb, tileH: 30 },
          { rank: 3, idx: 2, medal: "3rd", medalRgb: bronzeRgb, tileH: 18 },
        ];
        const slotW = (W - 40) / 3;
        slots.forEach((s, sIdx) => {
          const p = top3[s.idx];
          if (!p) return;
          const cx = 20 + slotW * sIdx + slotW / 2;
          const tileBottom = podiumY + podiumH - 4;
          const tileTop = tileBottom - s.tileH;
          // Tile (podium bar)
          doc.setFillColor(s.medalRgb[0], s.medalRgb[1], s.medalRgb[2]);
          doc.roundedRect(cx - slotW / 2 + 6, tileTop, slotW - 12, s.tileH, 2, 2, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(s.medal === "1st" ? 14 : 11);
          doc.text(s.medal, cx, tileTop + s.tileH / 2 + 2, { align: "center" });

          // Avatar above tile
          const avSize = s.medal === "1st" ? 14 : 12;
          const avX = cx - avSize / 2;
          const avY = tileTop - avSize - 7;
          drawAvatar(p.user_id, profiles[p.user_id]?.full_name || "U", avX, avY, avSize);

          // Name + score
          doc.setTextColor(15, 23, 42);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          const name = (profiles[p.user_id]?.full_name || "Unknown").slice(0, 18);
          doc.text(name, cx, avY + avSize + 3.5, { align: "center" });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(71, 85, 105);
          doc.text(`${p.score}/${p.max_score} • ${p.percentage.toFixed(1)}%`, cx, avY + avSize + 6.8, { align: "center" });
        });
        y = podiumY + podiumH + 6;
      }

      // ===== Full leaderboard table =====
      autoTable(doc, {
        startY: y,
        head: [["#", "", "Name", "Score", "Correct", "Wrong", "Percent", "Time", "Status"]],
        body: sorted.map((p, i) => {
          const pr = profiles[p.user_id];
          return [
            String(i + 1),
            "", // avatar cell
            pr?.full_name || "Unknown",
            `${p.score}/${p.max_score}`,
            String(p.correct),
            String(p.wrong),
            `${p.percentage.toFixed(1)}%`,
            timeText(p.time_taken_seconds || 0),
            p.status || (p.submitted_at ? "submitted" : "started"),
          ];
        }),
        styles: { font: "helvetica", fontStyle: "normal", fontSize: 9, cellPadding: 2.4, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.2, overflow: "linebreak", minCellHeight: 9 },
        headStyles: { font: "helvetica", fontStyle: "bold", fillColor: [headerRgb[0], headerRgb[1], headerRgb[2]], textColor: 255, halign: "center", valign: "middle" },
        bodyStyles: { font: "helvetica", fontStyle: "normal", halign: "center", valign: "middle", textColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 10 },
          2: { halign: "left", cellWidth: 50 },
          8: { cellWidth: 20 },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 10, right: 10, bottom: 22 },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 1) {
            const p = sorted[data.row.index];
            if (!p) return;
            const size = Math.min(data.cell.height - 1.5, 7);
            const x = data.cell.x + (data.cell.width - size) / 2;
            const cy = data.cell.y + (data.cell.height - size) / 2;
            drawAvatar(p.user_id, profiles[p.user_id]?.full_name || "U", x, cy, size);
          }
        },
      });

      // ===== Footer (every page) =====
      const pages = doc.getNumberOfPages();
      for (let pn = 1; pn <= pages; pn++) {
        doc.setPage(pn);
        // Footer divider
        doc.setDrawColor(headerRgb[0], headerRgb[1], headerRgb[2]);
        doc.setLineWidth(0.4);
        doc.line(10, H - 14, W - 10, H - 14);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(headerRgb[0], headerRgb[1], headerRgb[2]);
        doc.text(reportCfg.footerText || "", 12, H - 9);

        // Links — center-spread
        if (reportCfg.footerLinks?.length) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
          let lx = 12;
          const ly = H - 4;
          reportCfg.footerLinks.forEach((lnk, idx) => {
            const text = lnk.label || lnk.url;
            if (!text || !lnk.url) return;
            const w = doc.getTextWidth(text);
            doc.textWithLink(text, lx, ly, { url: lnk.url });
            lx += w + 8;
            if (idx < reportCfg.footerLinks.length - 1) {
              doc.setTextColor(148, 163, 184);
              doc.text("•", lx - 4, ly);
              doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
            }
          });
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Page ${pn} / ${pages}`, W - 12, H - 9, { align: "right" });
      }

      doc.save(`report-${selected.title.replace(/[\\/:*?"<>|]+/g, "_")}.pdf`);
    })();
  };

  const sortedParts = [...parts].sort((a, b) => b.score - a.score || a.time_taken_seconds - b.time_taken_seconds);

  const downloadAvatar = async (uid: string) => {
    const pr = profiles[uid];
    if (!pr?.avatar_url) {
      toast({ title: "এই ইউজারের কোনো প্রোফাইল ছবি নেই", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(pr.avatar_url);
      if (!res.ok) throw new Error("ছবি ফেচ করা গেলো না");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ext = (blob.type.split("/")[1] || "jpg").split(";")[0];
      const safeName = (pr.full_name || uid).replace(/[\\/:*?"<>|]+/g, "_");
      a.href = url;
      a.download = `${safeName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: "ডাউনলোড ব্যর্থ", description: e.message, variant: "destructive" });
    }
  };

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
                    <th className="p-2">স্কোর</th><th className="p-2">সঠিক</th><th className="p-2">ভুল</th><th className="p-2">%</th><th className="p-2">স্ট্যাটাস</th><th className="p-2">ছবি</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedParts.map((p, i) => {
                    const pr = profiles[p.user_id];
                    return (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="p-2 font-bold">{i + 1}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {pr?.avatar_url ? (
                              <img src={pr.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                {(pr?.full_name || "U")[0].toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate">{pr?.full_name || "—"}</p>
                              <p className="text-muted-foreground truncate text-[10px]">{pr?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-2">{pr?.batch_name || "—"}</td>
                        <td className="p-2 font-semibold">{p.score}/{p.max_score}</td>
                        <td className="p-2 text-success">{p.correct}</td>
                        <td className="p-2 text-destructive">{p.wrong}</td>
                        <td className="p-2">{p.percentage.toFixed(1)}%</td>
                        <td className="p-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{p.status}</span></td>
                        <td className="p-2">
                          <button
                            onClick={() => downloadAvatar(p.user_id)}
                            disabled={!pr?.avatar_url}
                            title={pr?.avatar_url ? "প্রোফাইল ছবি ডাউনলোড" : "ছবি নেই"}
                            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed">
                            <ImageDown size={12} />
                          </button>
                        </td>
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
