import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Download, X, Image as ImageIcon, Loader2, Link as LinkIcon } from "lucide-react";
import type { Exam, Question } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { resolveCorrectOptionText } from "@/lib/answerUtils";
import MathText from "@/components/MathText";

interface Slot {
  text: string;
  link: string;
}

interface PdfConfig {
  title: string;
  subtitle: string;
  logoDataUrl: string;
  showAnswers: boolean;
  showExplanations: boolean;
  twoColumn: boolean;
  primaryColor: string;
  setLabel: string;
  marksOverride: string;
  header: { left: Slot; center: Slot; right: Slot };
  footer: { left: Slot; center: Slot; right: Slot };
}

const emptySlot = (): Slot => ({ text: "", link: "" });

const DEFAULT_CFG: PdfConfig = {
  title: "",
  subtitle: "",
  logoDataUrl: "",
  showAnswers: true,
  showExplanations: true,
  twoColumn: true,
  primaryColor: "#1e3a8a",
  setLabel: "A",
  marksOverride: "",
  header: { left: emptySlot(), center: emptySlot(), right: emptySlot() },
  footer: {
    left: emptySlot(),
    center: { text: "✈ আমাদের টেলিগ্রাম চ্যানেল", link: "" },
    right: emptySlot(),
  },
};

// A4 at 96dpi
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const PAGE_PADDING_X = 36;
const PAGE_PADDING_Y = 28;
const HEADER_RESERVE = 110;
const FOOTER_RESERVE = 38;
const COLUMN_GAP = 22;
const QUESTION_GAP = 10;

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => BN_DIGITS[+d]);
const BN_OPTION_LABELS = ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ"];

function normalizeUrl(u: string) {
  const t = (u || "").trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function safeFileName(name: string) {
  return (name || "exam").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80);
}

const Exporter = ({ exam, open, onClose }: { exam: Exam; open: boolean; onClose: () => void }) => {
  const { toast } = useToast();
  const [cfg, setCfg] = useState<PdfConfig>({
    ...DEFAULT_CFG,
    title: exam.title,
    subtitle: exam.subject || "",
  });
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const measureRef = useRef<HTMLDivElement>(null);
  const [pagedQuestions, setPagedQuestions] = useState<Question[][]>([[]]);

  useEffect(() => {
    if (!open) return;
    setCfg((c) => ({ ...c, title: exam.title, subtitle: exam.subject || c.subtitle }));
  }, [open, exam.id, exam.title, exam.subject]);

  const updateSlot = (
    section: "header" | "footer",
    pos: "left" | "center" | "right",
    field: keyof Slot,
    value: string,
  ) => setCfg((c) => ({
    ...c,
    [section]: { ...c[section], [pos]: { ...c[section][pos], [field]: value } },
  }));

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1024 * 1024) {
      return toast({ title: "লোগো ১MB এর মধ্যে হতে হবে", variant: "destructive" });
    }
    const r = new FileReader();
    r.onload = () => setCfg((c) => ({ ...c, logoDataUrl: String(r.result || "") }));
    r.readAsDataURL(f);
  };

  // -------- Measurement pass: pack questions into pages/columns --------
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => {
      const root = measureRef.current;
      if (!root) return;
      const blocks = Array.from(root.querySelectorAll<HTMLElement>("[data-q-block]"));
      if (!blocks.length) { setPagedQuestions([[]]); return; }
      const heights = blocks.map((b) => b.getBoundingClientRect().height);

      const contentH = PAGE_HEIGHT - PAGE_PADDING_Y * 2 - HEADER_RESERVE - FOOTER_RESERVE;
      const columns = cfg.twoColumn ? 2 : 1;
      const pages: Question[][] = [];
      let current: Question[] = [];
      let colUsed = 0;
      let colIdx = 0;
      const pushPage = () => { pages.push(current); current = []; colUsed = 0; colIdx = 0; };

      for (let i = 0; i < exam.questions.length; i++) {
        const h = heights[i] + QUESTION_GAP;
        if (colUsed + h > contentH) {
          if (colIdx + 1 < columns) { colIdx++; colUsed = 0; }
          else { pushPage(); }
        }
        current.push(exam.questions[i]);
        colUsed += h;
      }
      if (current.length) pushPage();
      setPagedQuestions(pages.length ? pages : [[]]);
    }));
    return () => cancelAnimationFrame(0);
  }, [exam.questions, cfg.twoColumn, cfg.showAnswers, cfg.showExplanations, cfg.primaryColor, cfg.title, cfg.subtitle, cfg.logoDataUrl, cfg.setLabel, cfg.marksOverride]);

  const totalPages = pagedQuestions.length;

  // -------- Generate PDF: render one page off-screen at a time --------
  const generate = async () => {
    if (!pagedQuestions.length || !pagedQuestions[0].length) {
      toast({ title: "প্রশ্ন নেই", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setProgress({ current: 0, total: totalPages });
    try {
      // Make sure all fonts (Bengali + KaTeX) are ready
      try { await (document as any).fonts?.ready; } catch { /* ignore */ }

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // off-screen mount container
      const host = document.createElement("div");
      host.style.cssText = "position:fixed;left:-20000px;top:0;pointer-events:none;z-index:-1;";
      document.body.appendChild(host);
      const root: Root = createRoot(host);
      const renderPage = (pageIndex: number, startIdx: number) => new Promise<HTMLElement>((resolve) => {
        root.render(
          <SinglePage
            exam={exam}
            cfg={cfg}
            questions={pagedQuestions[pageIndex]}
            pageIndex={pageIndex}
            totalPages={totalPages}
            startIdx={startIdx}
          />
        );
        // wait two RAFs for layout + KaTeX
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const node = host.querySelector<HTMLElement>("[data-pdf-page]");
          if (node) resolve(node);
        }));
      });

      const scale = totalPages > 25 ? 1.6 : totalPages > 12 ? 1.85 : 2;
      let runningIdx = 0;
      for (let i = 0; i < totalPages; i++) {
        const startIdx = runningIdx;
        runningIdx += pagedQuestions[i].length;
        const node = await renderPage(i, startIdx);
        const canvas = await html2canvas(node, {
          scale,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          windowWidth: PAGE_WIDTH,
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          imageTimeout: 0,
          removeContainer: true,
        } as any);
        const img = canvas.toDataURL("image/jpeg", 0.85);
        if (i > 0) pdf.addPage();
        pdf.addImage(img, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");

        // clickable links (pdf coords)
        const pageBox = node.getBoundingClientRect();
        node.querySelectorAll<HTMLElement>("[data-pdf-link]").forEach((linkNode) => {
          const href = normalizeUrl(linkNode.dataset.pdfLink || "");
          if (!href) return;
          const box = linkNode.getBoundingClientRect();
          pdf.link(
            ((box.left - pageBox.left) / pageBox.width) * pageW,
            ((box.top - pageBox.top) / pageBox.height) * pageH,
            (box.width / pageBox.width) * pageW,
            (box.height / pageBox.height) * pageH,
            { url: href },
          );
        });

        canvas.width = 0; canvas.height = 0;
        setProgress({ current: i + 1, total: totalPages });
        await new Promise((r) => setTimeout(r, 0));
      }

      root.unmount();
      host.remove();

      pdf.save(`${safeFileName(cfg.title)}.pdf`);
      toast({ title: "PDF তৈরি হয়েছে ✅" });
    } catch (err: any) {
      console.error("PDF gen error", err);
      toast({ title: "PDF তৈরিতে ত্রুটি", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setGenerating(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  if (!open) return null;

  const measureColW = cfg.twoColumn
    ? (PAGE_WIDTH - PAGE_PADDING_X * 2 - COLUMN_GAP) / 2
    : PAGE_WIDTH - PAGE_PADDING_X * 2;

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm overflow-y-auto p-2 md:p-6">
      <div className="min-h-[calc(100vh-1rem)] flex items-start justify-center">
        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden my-2 border border-border">
          <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
            <div>
              <h2 className="font-bold text-lg">PDF এক্সপোর্ট</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">সুন্দর বাংলা typography • LaTeX + ⚗ mhchem • দ্রুত ও নির্ভুল</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg"><X size={16} /></button>
          </div>

          <div className="p-5 space-y-5 max-h-[calc(100vh-9rem)] overflow-y-auto overscroll-contain">
            <section className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">শিরোনাম</label>
                <input value={cfg.title} onChange={(e) => setCfg({ ...cfg, title: e.target.value })} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">সাবটাইটেল</label>
                <input value={cfg.subtitle} onChange={(e) => setCfg({ ...cfg, subtitle: e.target.value })} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">সেট</label>
                <input value={cfg.setLabel} onChange={(e) => setCfg({ ...cfg, setLabel: e.target.value })} placeholder="A" className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">পূর্ণমান (ঐচ্ছিক)</label>
                <input value={cfg.marksOverride} onChange={(e) => setCfg({ ...cfg, marksOverride: e.target.value })} placeholder={`${exam.questions.length}`} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">প্রাইমারি রঙ</label>
                <input type="color" value={cfg.primaryColor} onChange={(e) => setCfg({ ...cfg, primaryColor: e.target.value })} className="w-full h-10 mt-1 rounded-lg cursor-pointer" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">লোগো</label>
                <label className="flex items-center gap-2 mt-1 px-3 py-2 rounded-lg border border-border cursor-pointer text-xs">
                  <ImageIcon size={14} /> {cfg.logoDataUrl ? "লোগো পরিবর্তন" : "লোগো আপলোড"}
                  <input type="file" accept="image/png,image/jpeg" onChange={onLogo} className="hidden" />
                </label>
                {cfg.logoDataUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={cfg.logoDataUrl} alt="" className="w-10 h-10 object-contain rounded border" />
                    <button onClick={() => setCfg({ ...cfg, logoDataUrl: "" })} className="text-xs text-destructive">সরাও</button>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold mb-2">ফুটার (বাম / মাঝ / ডান)</h3>
              <div className="grid sm:grid-cols-3 gap-2">
                {(["left", "center", "right"] as const).map((p) => (
                  <SlotEditor key={`f-${p}`} slot={cfg.footer[p]}
                    onText={(v) => updateSlot("footer", p, "text", v)}
                    onLink={(v) => updateSlot("footer", p, "link", v)}
                    label={p === "left" ? "বাম" : p === "center" ? "মাঝ" : "ডান"} />
                ))}
              </div>
            </section>

            <section className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={cfg.twoColumn} onChange={(e) => setCfg({ ...cfg, twoColumn: e.target.checked })} />
                দুই-কলাম
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={cfg.showAnswers} onChange={(e) => setCfg({ ...cfg, showAnswers: e.target.checked })} />
                সঠিক উত্তর দেখাও
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={cfg.showExplanations} onChange={(e) => setCfg({ ...cfg, showExplanations: e.target.checked })} />
                ব্যাখ্যা যোগ
              </label>
            </section>

            <div className="rounded-xl border border-border bg-muted/20 p-3 overflow-auto">
              <div className="text-[11px] text-muted-foreground mb-2">প্রিভিউ — পেজ ১</div>
              <div className="origin-top-left scale-[0.42] sm:scale-[0.58] md:scale-[0.72] h-[480px] sm:h-[660px] md:h-[820px] w-[794px] pointer-events-none" style={{ willChange: "transform", transform: "translateZ(0)" }}>
                <SinglePage exam={exam} cfg={cfg} questions={pagedQuestions[0] || []} pageIndex={0} totalPages={totalPages} startIdx={0} />
              </div>
            </div>

            {/* Hidden measurement pass: each question rendered at real column width */}
            <div ref={measureRef} className="fixed -left-[20000px] top-0 pointer-events-none" aria-hidden="true"
              style={{ width: measureColW, fontFamily: "'Hind Siliguri','Noto Sans Bengali',Inter,sans-serif", color: "#111827" }}>
              {exam.questions.map((question, idx) => (
                <QuestionBlock key={`m-${question.id || idx}`} question={question} index={idx} cfg={cfg} measure />
              ))}
            </div>

            <button onClick={generate} disabled={generating} className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              {generating ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              {generating
                ? `তৈরি হচ্ছে... ${toBn(progress.current)}/${toBn(progress.total)}`
                : `PDF ডাউনলোড  •  ${toBn(totalPages)} পেজ`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

// -------- Single page renderer (used both for preview and capture) --------
interface SinglePageProps {
  exam: Exam;
  cfg: PdfConfig;
  questions: Question[];
  pageIndex: number;
  totalPages: number;
  startIdx: number;
}

const SinglePage = ({ exam, cfg, questions, pageIndex, totalPages, startIdx }: SinglePageProps) => {
  return (
    <div
      data-pdf-page
      style={{
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        background: "#ffffff",
        padding: `${PAGE_PADDING_Y}px ${PAGE_PADDING_X}px`,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Hind Siliguri','Noto Sans Bengali',Inter,sans-serif",
        color: "#111827",
        overflow: "hidden",
      }}
    >
      <PdfHeader cfg={cfg} exam={exam} />
      <div style={{ flex: 1, minHeight: 0, position: "relative", marginTop: 10 }}>
        <div
          style={{
            height: "100%",
            boxSizing: "border-box",
            columnCount: cfg.twoColumn ? 2 : 1,
            columnGap: cfg.twoColumn ? COLUMN_GAP : 0,
            columnFill: "auto" as any,
            columnRule: cfg.twoColumn ? "1px solid #e2e8f0" : undefined,
          }}
        >
          {questions.map((q, idx) => (
            <QuestionBlock key={q.id || `${pageIndex}-${idx}`} question={q} index={startIdx + idx} cfg={cfg} />
          ))}
        </div>
      </div>
      <PdfFooter cfg={cfg} page={pageIndex + 1} total={totalPages} />
    </div>
  );
};

// -------- Header / Footer --------
const PdfHeader = ({ cfg, exam }: { cfg: PdfConfig; exam: Exam }) => {
  const marks = cfg.marksOverride.trim() || String(exam.questions.length);
  return (
    <div>
      <div style={{ textAlign: "center", paddingBottom: 4 }}>
        {cfg.logoDataUrl && (
          <img src={cfg.logoDataUrl} alt="" style={{ height: 36, objectFit: "contain", marginBottom: 4 }} />
        )}
        <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", lineHeight: "30px" }}>
          {cfg.title || exam.title}
        </div>
        {cfg.subtitle && (
          <div style={{ fontSize: 12.5, color: "#475569", lineHeight: "18px", marginTop: 1 }}>
            {cfg.subtitle}
          </div>
        )}
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        alignItems: "center",
        padding: "6px 4px",
        borderTop: "1.5px solid #0f172a",
        borderBottom: "1.5px solid #0f172a",
        marginTop: 6,
        fontSize: 11.5,
        color: "#0f172a",
        fontWeight: 600,
      }}>
        <div style={{ textAlign: "left" }}>পূর্ণমান: {toBn(marks)}</div>
        <div style={{ textAlign: "center" }}>সেট: {cfg.setLabel || "—"}</div>
        <div style={{ textAlign: "right" }}>সময়: {toBn(exam.duration)} মিনিট</div>
      </div>
    </div>
  );
};

const PdfFooter = ({ cfg, page, total }: { cfg: PdfConfig; page: number; total: number }) => {
  const SlotItem = ({ slot, align }: { slot: Slot; align: "left" | "center" | "right" }) => (
    <div
      data-pdf-link={slot.link || undefined}
      style={{
        textAlign: align,
        color: "#1e3a8a",
        fontSize: 10.5,
        textDecoration: slot.link ? "underline" : "none",
        overflowWrap: "anywhere",
      }}
    >
      {slot.text}
    </div>
  );
  return (
    <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: 6, marginTop: 8, display: "grid", gridTemplateColumns: "1fr 2fr 1fr", alignItems: "center", gap: 8 }}>
      <SlotItem slot={cfg.footer.left} align="left" />
      <SlotItem slot={cfg.footer.center} align="center" />
      <div style={{ textAlign: "right", color: "#64748b", fontSize: 10 }}>
        পৃষ্ঠা {toBn(page)} / {toBn(total)}
      </div>
    </div>
  );
};

// -------- Question block (reference-style 2x2 options + tinted answer/explanation box) --------
const QuestionBlock = ({ question, index, cfg, measure }: { question: Question; index: number; cfg: PdfConfig; measure?: boolean }) => {
  const correct = resolveCorrectOptionText(question);
  const correctIdx = question.options.findIndex((o) => o === correct);
  const correctLabel = correctIdx >= 0 ? BN_OPTION_LABELS[correctIdx] || `${correctIdx + 1}` : "";

  return (
    <div
      data-q-block={measure ? "" : undefined}
      style={{
        breakInside: "avoid",
        pageBreakInside: "avoid",
        marginBottom: QUESTION_GAP,
        display: "block",
        width: "100%",
        WebkitColumnBreakInside: "avoid",
      } as any}
    >
      {/* Question line */}
      <div style={{ display: "flex", gap: 5, alignItems: "baseline", marginBottom: 4 }}>
        <div style={{ color: "#0f172a", fontWeight: 800, fontSize: 11.5, lineHeight: "18px", whiteSpace: "nowrap" }}>{toBn(index + 1)}.</div>
        <div style={{ fontWeight: 700, fontSize: 11.5, lineHeight: "18px", color: "#0f172a", wordBreak: "break-word", flex: 1 }}>
          <MathText text={question.question} />
        </div>
      </div>

      {/* 2-column option grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        columnGap: 10,
        rowGap: 2,
        paddingLeft: 18,
      }}>
        {question.options.map((opt, optionIndex) => (
          <div key={`${question.id}-${optionIndex}`} style={{ display: "flex", gap: 4, alignItems: "baseline", fontSize: 11, lineHeight: "17px", color: "#1f2937" }}>
            <span style={{ fontWeight: 600, color: "#334155", whiteSpace: "nowrap" }}>{BN_OPTION_LABELS[optionIndex] || optionIndex + 1})</span>
            <span style={{ wordBreak: "break-word", minWidth: 0 }}><MathText text={opt} /></span>
          </div>
        ))}
      </div>

      {/* Tinted answer + explanation box */}
      {(cfg.showAnswers || cfg.showExplanations) && (cfg.showAnswers || question.explanation) && (
        <div style={{
          marginTop: 5,
          padding: "5px 8px",
          background: "#eaf3fb",
          border: "1px solid #bcd4e6",
          borderRadius: 6,
          fontSize: 10.5,
          lineHeight: "15px",
          color: "#1e3a8a",
        }}>
          {cfg.showAnswers && (
            <div style={{ fontWeight: 700 }}>
              সঠিক উত্তর: <span style={{ fontWeight: 600 }}>
                {correctLabel ? `${correctLabel}) ` : ""}
                <MathText text={correct || "—"} />
              </span>
            </div>
          )}
          {cfg.showExplanations && question.explanation && (
            <div style={{ fontWeight: 500, color: "#334155", marginTop: cfg.showAnswers ? 1 : 0 }}>
              <span style={{ fontWeight: 700, color: "#1e3a8a" }}>ব্যাখ্যা:</span>{" "}
              <MathText text={question.explanation} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function SlotEditor({ slot, label, onText, onLink }: { slot: Slot; label: string; onText: (v: string) => void; onLink: (v: string) => void }) {
  return (
    <div className="rounded-xl border border-border p-2 space-y-1.5">
      <p className="text-[10px] font-semibold text-muted-foreground">{label}</p>
      <input value={slot.text} onChange={(e) => onText(e.target.value)} placeholder="লেখা" className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
      <div className="relative">
        <LinkIcon size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={slot.link} onChange={(e) => onLink(e.target.value)} placeholder="লিংক (ঐচ্ছিক)" className="w-full rounded-md border border-border bg-background pl-7 pr-2 py-1.5 text-xs" />
      </div>
    </div>
  );
}

export default Exporter;
