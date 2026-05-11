import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Radio, Trash2, Download, Trophy, X, Crown, ImageDown } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import notoBengaliUrl from "@/assets/NotoSansBengali-Regular.ttf";
import { useSiteSettings } from "@/hooks/useSupabaseData";
import { resolveReportTheme, hexToRgb, defaultReportSettings } from "@/lib/reportThemePresets";

interface ExamRow { id: string; title: string; question_count: number; duration: number; published: boolean; }
interface ExamDetailRow { id: string; title: string; question_count: number; duration: number; negative_marking: number; }
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
  const [selectedExamDetail, setSelectedExamDetail] = useState<ExamDetailRow | null>(null);

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
    const [{ data }, { data: examDetail }] = await Promise.all([
      supabase.from("live_exam_participants").select("*").eq("live_exam_id", le.id).order("score", { ascending: false }),
      supabase.from("exams").select("id,title,question_count,duration,negative_marking").eq("id", le.exam_id).maybeSingle(),
    ]);
    setSelectedExamDetail((examDetail as ExamDetailRow | null) || null);
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
      const sorted = [...parts].sort((a, b) => b.score - a.score || a.time_taken_seconds - b.time_taken_seconds);
      const submitted = parts.filter((p) => p.status === "submitted" || p.submitted_at);
      const fmt = (d: string) => new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
      const timeText = (seconds = 0) => {
        const mm = Math.floor(seconds / 60);
        const ss = seconds % 60;
        return `${mm}:${String(ss).padStart(2, "0")}`;
      };
      const esc = (s: any) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

      const reportCfg = siteSettings?.reportSettings || defaultReportSettings;
      const theme = resolveReportTheme(reportCfg);
      const examDetail = selectedExamDetail || exams.find((e) => e.id === selected.exam_id);

      // Pre-fetch avatars as data URLs so html2canvas can render without CORS issues
      const avatarMap: Record<string, string> = {};
      await Promise.all(sorted.slice(0, 200).map(async (p) => {
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

      // Inject @font-face once so the offscreen DOM uses Noto Sans Bengali
      const FONT_STYLE_ID = "__noto_bengali_pdf_font";
      if (!document.getElementById(FONT_STYLE_ID)) {
        const styleEl = document.createElement("style");
        styleEl.id = FONT_STYLE_ID;
        styleEl.textContent = `@font-face{font-family:'NotoBengaliPDF';src:url('${notoBengaliUrl}') format('truetype');font-display:block;}`;
        document.head.appendChild(styleEl);
        // small wait to ensure font is loaded
        try { await (document as any).fonts?.load("16px 'NotoBengaliPDF'"); } catch { /* noop */ }
      }

      const rows = sorted.map((p, i) => {
        const pr = profiles[p.user_id];
        const av = avatarMap[p.user_id];
        const initial = esc((pr?.full_name || "U")[0].toUpperCase());
        const avatarCell = av
          ? `<img src="${av}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;display:block;margin:0 auto;" />`
          : `<div style="width:28px;height:28px;border-radius:50%;background:${theme.accent};color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;margin:0 auto;">${initial}</div>`;
        const rank = i + 1;
        const rankBadge =
          rank === 1 ? `background:#FEF3C7;color:#92400E;` :
          rank === 2 ? `background:#E5E7EB;color:#374151;` :
          rank === 3 ? `background:#FED7AA;color:#9A3412;` :
          `background:#F1F5F9;color:#334155;`;
        return `
          <tr>
            <td style="text-align:center;"><span style="display:inline-block;min-width:26px;padding:3px 8px;border-radius:999px;font-weight:700;font-size:12px;${rankBadge}">${rank}</span></td>
            <td>${avatarCell}</td>
            <td style="font-weight:600;color:#0F172A;">${esc(pr?.full_name || "Unknown")}</td>
            <td style="text-align:center;font-weight:700;color:${theme.header};">${esc(p.score)}/${esc(p.max_score)}</td>
            <td style="text-align:center;color:#16A34A;font-weight:600;">${esc(p.correct)}</td>
            <td style="text-align:center;color:#DC2626;font-weight:600;">${esc(p.wrong)}</td>
            <td style="text-align:center;color:#64748B;">${esc(p.skipped ?? 0)}</td>
            <td style="text-align:center;font-weight:600;">${p.percentage.toFixed(1)}%</td>
            <td style="text-align:center;color:#475569;">${timeText(p.time_taken_seconds || 0)}</td>
            <td style="text-align:center;font-size:11px;color:#475569;text-transform:capitalize;">${esc(p.status || (p.submitted_at ? "submitted" : "started"))}</td>
          </tr>
        `;
      }).join("");

      const negMark = examDetail && "negative_marking" in examDetail ? Number((examDetail as any).negative_marking) : null;
      const infoBlock = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px 18px;padding:14px 18px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:14px 0 16px;font-size:12px;">
          ${[
            ["Exam", examDetail?.title || selected.title || "—"],
            ["Live Title", selected.title || "—"],
            ["Duration", `${selected.duration || examDetail?.duration || 0} min`],
            ["Questions", `${examDetail?.question_count ?? "—"}`],
            ["Negative Mark", negMark === null ? "—" : String(negMark)],
            ["Participants", String(parts.length)],
            ["Submitted", String(submitted.length)],
            ["Window", `${fmt(selected.start_time)} → ${fmt(selected.end_time)}`],
          ].map(([k, v]) => `
            <div>
              <div style="font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#64748B;font-weight:600;">${esc(k)}</div>
              <div style="font-size:12.5px;color:#0F172A;font-weight:600;margin-top:2px;">${esc(v)}</div>
            </div>
          `).join("")}
        </div>
      `;

      const footerLinks = (reportCfg.footerLinks || [])
        .filter((l) => l.label && l.url)
        .map((l) => `<a href="${esc(l.url)}" style="color:${theme.accent};text-decoration:none;margin:0 6px;">${esc(l.label || l.url)}</a>`)
        .join('<span style="color:#CBD5E1;">•</span>');

      // Build offscreen container
      const container = document.createElement("div");
      container.style.cssText = `position:fixed;left:-99999px;top:0;width:1280px;background:#fff;font-family:'NotoBengaliPDF','Noto Sans Bengali','Hind Siliguri',system-ui,-apple-system,'Segoe UI',sans-serif;color:#0F172A;`;
      container.innerHTML = `
        <div style="padding:0;">
          <div style="background:linear-gradient(135deg, ${theme.header}, ${theme.accent});color:#fff;padding:24px 28px;">
            <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;opacity:.85;font-weight:600;">Final Result Report</div>
            <div style="font-size:24px;font-weight:800;margin-top:4px;line-height:1.2;">${esc(selected.title || "Live Exam Report")}</div>
            <div style="font-size:11.5px;margin-top:6px;opacity:.9;">Generated: ${esc(new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }))}</div>
          </div>
          <div style="padding:18px 24px 28px;">
            ${infoBlock}
            <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:12px;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;">
              <thead>
                <tr style="background:${theme.header};color:#fff;">
                  ${["#","Photo","Name","Score","Correct","Wrong","Skipped","%","Time","Status"]
                    .map((h, idx) => `<th style="padding:10px 8px;text-align:${idx===2?'left':'center'};font-weight:600;font-size:11.5px;letter-spacing:.03em;">${h}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${rows || `<tr><td colspan="10" style="text-align:center;padding:30px;color:#94A3B8;">No participants yet</td></tr>`}
              </tbody>
            </table>
            <div style="margin-top:22px;padding-top:14px;border-top:2px solid ${theme.header};display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#475569;">
              <div style="font-weight:700;color:${theme.header};">${esc(reportCfg.footerText || "")}</div>
              <div>${footerLinks}</div>
            </div>
          </div>
        </div>
      `;
      // Apply consistent cell styling
      container.querySelectorAll("tbody td").forEach((td) => {
        (td as HTMLElement).style.padding = "9px 8px";
        (td as HTMLElement).style.borderBottom = "1px solid #F1F5F9";
        (td as HTMLElement).style.fontSize = "12px";
      });
      container.querySelectorAll("tbody tr:nth-child(even)").forEach((tr) => {
        (tr as HTMLElement).style.background = "#F8FAFC";
      });
      document.body.appendChild(container);

      try {
        // Wait one paint cycle so fonts/images settle
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          windowWidth: 1280,
        });

        const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const imgW = pageW;
        const imgH = (canvas.height * imgW) / canvas.width;

        if (imgH <= pageH) {
          doc.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, imgW, imgH);
        } else {
          // Slice the canvas vertically across multiple pages
          const pageHeightPx = (pageH * canvas.width) / pageW;
          let renderedY = 0;
          let pageIndex = 0;
          while (renderedY < canvas.height) {
            const sliceH = Math.min(pageHeightPx, canvas.height - renderedY);
            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = sliceH;
            const ctx = sliceCanvas.getContext("2d")!;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
            ctx.drawImage(canvas, 0, renderedY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
            const sliceImgH = (sliceH * imgW) / canvas.width;
            if (pageIndex > 0) doc.addPage();
            doc.addImage(sliceCanvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, imgW, sliceImgH);
            renderedY += sliceH;
            pageIndex++;
          }
        }

        // Page numbers
        const total = doc.getNumberOfPages();
        for (let pn = 1; pn <= total; pn++) {
          doc.setPage(pn);
          doc.setFontSize(8.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`Page ${pn} / ${total}`, pageW - 8, pageH - 4, { align: "right" });
        }

        doc.save(`report-${selected.title.replace(/[\\/:*?"<>|]+/g, "_")}.pdf`);
      } finally {
        document.body.removeChild(container);
      }
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
