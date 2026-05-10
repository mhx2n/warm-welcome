import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Download, X, Image as ImageIcon, Loader2, Link as LinkIcon } from "lucide-react";
import type { Exam } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { resolveCorrectOptionText } from "@/lib/answerUtils";
import MathText from "@/components/MathText";
import { registerBengaliFont } from "@/lib/pdfFont";

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
  header: { left: Slot; center: Slot; right: Slot };
  footer: { left: Slot; center: Slot; right: Slot };
}

const emptySlot = (): Slot => ({ text: "", link: "" });

const DEFAULT_CFG: PdfConfig = {
  title: "",
  subtitle: "",
  logoDataUrl: "",
  showAnswers: false,
  showExplanations: false,
  twoColumn: false,
  primaryColor: "#2563eb",
  header: {
    left: { text: "Target — Smart Exam Platform", link: "" },
    center: emptySlot(),
    right: emptySlot(),
  },
  footer: {
    left: { text: "© Target", link: "" },
    center: emptySlot(),
    right: emptySlot(),
  },
};

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123; // exact A4 ratio at 96dpi
const PAGE_PADDING = 44;
const HEADER_RESERVE = 130; // header (title + meta + border) approx
const FOOTER_RESERVE = 70;  // footer band approx
const COLUMN_GAP = 22;
const QUESTION_GAP = 12;
const VECTOR_EXPORT_THRESHOLD = 60;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  const value = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean.padEnd(6, "0").slice(0, 6);
  const num = parseInt(value, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function pdfText(value?: string) {
  return (value || "—").replace(/\s+/g, " ").trim() || "—";
}

function normalizeUrl(u: string) {
  const t = u.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function safeFileName(name: string) {
  return (name || "exam").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80);
}

const Exporter = ({ exam, open, onClose }: { exam: Exam; open: boolean; onClose: () => void }) => {
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);
  const [cfg, setCfg] = useState<PdfConfig>({
    ...DEFAULT_CFG,
    title: exam.title,
    subtitle: exam.subject || "",
  });
  const [generating, setGenerating] = useState(false);

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

  const generate = async () => {
    if (!previewRef.current) return;
    setGenerating(true);
    try {
      if (exam.questions.length >= VECTOR_EXPORT_THRESHOLD) {
        await generateVectorPdf();
        return;
      }

      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const pages = Array.from(previewRef.current.querySelectorAll<HTMLElement>("[data-pdf-page]"));
      if (!pages.length) throw new Error("PDF preview তৈরি হয়নি");

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Balanced: sharp on zoom but small + fast.  scale=2 ≈ 192dpi which is
      // crisp on phones and avoids the very heavy 3x render.
      const scale = pages.length > 20 ? 1.6 : pages.length > 10 ? 1.85 : 2;
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();
        const canvas = await html2canvas(pages[i], ({
          scale,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          windowWidth: PAGE_WIDTH,
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          letterRendering: true,
          imageTimeout: 0,
        }) as any);
        const img = canvas.toDataURL("image/jpeg", 0.82);
        pdf.addImage(img, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
        // free memory between pages
        canvas.width = 0; canvas.height = 0;
        await new Promise((r) => setTimeout(r, 0));

        const pageLinks = pages[i].querySelectorAll<HTMLElement>("[data-pdf-link]");
        pageLinks.forEach((node) => {
          const href = normalizeUrl(node.dataset.pdfLink || "");
          if (!href) return;
          const pageBox = pages[i].getBoundingClientRect();
          const box = node.getBoundingClientRect();
          pdf.link(
            ((box.left - pageBox.left) / pageBox.width) * pageW,
            ((box.top - pageBox.top) / pageBox.height) * pageH,
            (box.width / pageBox.width) * pageW,
            (box.height / pageBox.height) * pageH,
            { url: href },
          );
        });
      }

      pdf.save(`${safeFileName(cfg.title)}.pdf`);
      toast({ title: "PDF তৈরি হয়েছে ✅" });
    } catch (err: any) {
      toast({ title: "PDF তৈরিতে ত্রুটি", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const generateVectorPdf = async () => {
    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait", compress: true });
    await registerBengaliFont(pdf);
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 34;
    const headerH = 88;
    const footerH = 34;
    const gap = cfg.twoColumn ? 18 : 0;
    const columns = cfg.twoColumn ? 2 : 1;
    const colW = (pageW - margin * 2 - gap) / columns;
    const primary = hexToRgb(cfg.primaryColor);
    const contentTop = margin + headerH;
    const contentBottom = pageH - margin - footerH;
    const maxY = contentBottom - 6;
    let page = 1;
    let col = 0;
    let y = contentTop;

    const setFont = (style: "normal" | "bold" = "normal", size = 9.5, color: [number, number, number] = [31, 41, 55]) => {
      pdf.setFont("NotoBn", style);
      pdf.setFontSize(size);
      pdf.setTextColor(color[0], color[1], color[2]);
    };

    const slotLine = (slots: PdfConfig["header"] | PdfConfig["footer"], yPos: number) => {
      setFont("normal", 8, [100, 116, 139]);
      const values = [slots.left.text, slots.center.text, slots.right.text].map(pdfText);
      pdf.text(values[0], margin, yPos, { maxWidth: (pageW - margin * 2) / 3 - 8 });
      pdf.text(values[1], pageW / 2, yPos, { align: "center", maxWidth: (pageW - margin * 2) / 3 - 8 });
      pdf.text(values[2], pageW - margin, yPos, { align: "right", maxWidth: (pageW - margin * 2) / 3 - 8 });
    };

    const drawChrome = () => {
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageW, pageH, "F");
      slotLine(cfg.header, margin + 9);
      pdf.setDrawColor(primary[0], primary[1], primary[2]);
      pdf.setLineWidth(2);
      pdf.line(margin, margin + 22, pageW - margin, margin + 22);
      setFont("bold", 18, primary);
      pdf.text(pdfText(cfg.title || exam.title), margin, margin + 45, { maxWidth: pageW - margin * 2 - 92 });
      setFont("normal", 9, [100, 116, 139]);
      if (cfg.subtitle) pdf.text(pdfText(cfg.subtitle), margin, margin + 61, { maxWidth: pageW - margin * 2 - 92 });
      pdf.text([`Time: ${exam.duration} min`, `Questions: ${exam.questions.length}`], pageW - margin, margin + 43, { align: "right" });
      if (cfg.twoColumn) {
        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.6);
        const x = margin + colW + gap / 2;
        pdf.line(x, contentTop - 6, x, contentBottom - 2);
      }
      pdf.setDrawColor(primary[0], primary[1], primary[2]);
      pdf.setLineWidth(0.8);
      pdf.line(margin, pageH - margin - 20, pageW - margin, pageH - margin - 20);
      slotLine(cfg.footer, pageH - margin - 7);
      setFont("normal", 7.5, [148, 163, 184]);
      pdf.text(`Page ${page}`, pageW / 2, pageH - margin + 7, { align: "center" });
    };

    const addPage = () => {
      pdf.addPage();
      page += 1;
      col = 0;
      y = contentTop;
      drawChrome();
    };

    const nextColumnOrPage = () => {
      if (cfg.twoColumn && col === 0) {
        col = 1;
        y = contentTop;
      } else {
        addPage();
      }
    };

    const getX = () => margin + col * (colW + gap);

    const split = (text: string, width: number, size: number, style: "normal" | "bold" = "normal") => {
      pdf.setFont("NotoBn", style);
      pdf.setFontSize(size);
      return pdf.splitTextToSize(pdfText(text), width) as string[];
    };

    const estimateQuestionHeight = (question: Exam["questions"][number]) => {
      let h = Math.max(15, split(question.question, colW - 22, 9.4, "bold").length * 12) + 7;
      question.options.forEach((opt) => { h += Math.max(20, split(opt, colW - 42, 8.7).length * 10 + 9) + 4; });
      if (cfg.showExplanations && question.explanation) h += split(question.explanation, colW - 18, 8).length * 10 + 14;
      return h + QUESTION_GAP;
    };

    const drawQuestion = (question: Exam["questions"][number], index: number) => {
      const x = getX();
      const qLines = split(question.question, colW - 22, 9.4, "bold");
      setFont("bold", 9.6, primary);
      pdf.text(`${index + 1}.`, x, y + 9);
      setFont("bold", 9.4, [17, 24, 39]);
      pdf.text(qLines, x + 22, y + 9, { maxWidth: colW - 22, lineHeightFactor: 1.25 });
      y += Math.max(15, qLines.length * 12) + 7;

      const correct = resolveCorrectOptionText(question);
      question.options.forEach((opt, optionIndex) => {
        const isCorrect = cfg.showAnswers && opt === correct;
        const lines = split(opt, colW - 42, 8.7);
        const boxH = Math.max(20, lines.length * 10 + 9);
        if (y + boxH > maxY) nextColumnOrPage();
        const bx = getX();
        pdf.setFillColor(isCorrect ? 220 : 248, isCorrect ? 252 : 250, isCorrect ? 231 : 252);
        pdf.setDrawColor(isCorrect ? 22 : 219, isCorrect ? 163 : 226, isCorrect ? 74 : 234);
        pdf.roundedRect(bx, y, colW, boxH, 4, 4, "FD");
        setFont("bold", 8.6, isCorrect ? [22, 101, 52] : [31, 41, 55]);
        pdf.text(`${String.fromCharCode(65 + optionIndex)}.`, bx + 7, y + 13);
        setFont(isCorrect ? "bold" : "normal", 8.7, isCorrect ? [22, 101, 52] : [31, 41, 55]);
        pdf.text(lines, bx + 28, y + 13, { maxWidth: colW - 42, lineHeightFactor: 1.18 });
        y += boxH + 4;
      });

      if (cfg.showExplanations && question.explanation) {
        const eLines = split(`Explanation: ${question.explanation}`, colW - 18, 8);
        const eH = eLines.length * 10 + 12;
        if (y + eH > maxY) nextColumnOrPage();
        const ex = getX();
        pdf.setFillColor(241, 245, 249);
        pdf.roundedRect(ex, y, colW, eH, 4, 4, "F");
        setFont("normal", 8, [71, 85, 105]);
        pdf.text(eLines, ex + 8, y + 12, { maxWidth: colW - 18, lineHeightFactor: 1.18 });
        y += eH + 5;
      }
      y += QUESTION_GAP;
    };

    drawChrome();
    for (let i = 0; i < exam.questions.length; i++) {
      const h = estimateQuestionHeight(exam.questions[i]);
      if (y + h > maxY) nextColumnOrPage();
      drawQuestion(exam.questions[i], i);
      await new Promise((r) => (i % 25 === 0 ? setTimeout(r, 0) : r(undefined)));
    }

    pdf.save(`${safeFileName(cfg.title)}.pdf`);
    toast({ title: "PDF তৈরি হয়েছে ✅" });
  };

  // Measured pagination: render hidden, measure each block, then pack into pages.
  const measureRef = useRef<HTMLDivElement>(null);
  const [pagedQuestions, setPagedQuestions] = useState<Exam["questions"][]>([[]]);

  useEffect(() => {
    // wait for layout & math render
    const id = requestAnimationFrame(() => requestAnimationFrame(() => {
      const root = measureRef.current;
      if (!root) return;
      const blocks = Array.from(root.querySelectorAll<HTMLElement>("[data-q-block]"));
      if (!blocks.length) { setPagedQuestions([[]]); return; }
      const heights = blocks.map((b) => b.getBoundingClientRect().height);

      const contentH = PAGE_HEIGHT - PAGE_PADDING * 2 - HEADER_RESERVE - FOOTER_RESERVE;
      const columns = cfg.twoColumn ? 2 : 1;
      const pages: Exam["questions"][] = [];
      let current: Exam["questions"] = [];
      let colUsed = 0; // height used in current column
      let colIdx = 0;  // current column index 0..columns-1

      const pushPage = () => { pages.push(current); current = []; colUsed = 0; colIdx = 0; };

      for (let i = 0; i < exam.questions.length; i++) {
        const h = heights[i] + QUESTION_GAP;
        if (colUsed + h > contentH) {
          // move to next column or page
          if (colIdx + 1 < columns) {
            colIdx++;
            colUsed = 0;
          } else {
            pushPage();
          }
        }
        // if a single block is taller than a column, still place it (will be clipped — but acceptable rare case)
        current.push(exam.questions[i]);
        colUsed += h;
      }
      if (current.length) pushPage();
      setPagedQuestions(pages.length ? pages : [[]]);
    }));
    return () => cancelAnimationFrame(id);
  }, [exam.questions, cfg.twoColumn, cfg.showAnswers, cfg.showExplanations, cfg.primaryColor, cfg.title, cfg.subtitle, cfg.logoDataUrl]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm overflow-y-auto p-2 md:p-6">
      <div className="min-h-[calc(100vh-1rem)] flex items-start justify-center">
        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden my-2 border border-border">
          <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
            <div>
              <h2 className="font-bold text-lg">PDF এক্সপোর্ট</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">আগের visual PDF style • alignment fixed • LaTeX render support</p>
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
              <h3 className="text-xs font-bold mb-2">হেডার (বাম / মাঝ / ডান)</h3>
              <div className="grid sm:grid-cols-3 gap-2">
                {(["left", "center", "right"] as const).map((p) => (
                  <SlotEditor key={`h-${p}`} slot={cfg.header[p]}
                    onText={(v) => updateSlot("header", p, "text", v)}
                    onLink={(v) => updateSlot("header", p, "link", v)}
                    label={p === "left" ? "বাম" : p === "center" ? "মাঝ" : "ডান"} />
                ))}
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
                সঠিক উত্তর হাইলাইট
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={cfg.showExplanations} onChange={(e) => setCfg({ ...cfg, showExplanations: e.target.checked })} />
                ব্যাখ্যা যোগ
              </label>
            </section>

            <div className="rounded-xl border border-border bg-muted/20 p-3 overflow-auto">
              <div className="text-[11px] text-muted-foreground mb-2">প্রিভিউ</div>
              <div className="origin-top-left scale-[0.42] sm:scale-[0.58] md:scale-[0.72] h-[480px] sm:h-[660px] md:h-[820px] w-[794px] pointer-events-none" style={{ willChange: "transform", transform: "translateZ(0)" } as any}>
                <PdfPreview exam={exam} cfg={cfg} pagedQuestions={pagedQuestions} />
              </div>
            </div>

            <div className="fixed -left-[10000px] top-0 pointer-events-none" aria-hidden="true">
              <PdfPreview ref={previewRef} exam={exam} cfg={cfg} pagedQuestions={pagedQuestions} />
            </div>

            {/* Hidden measurement pass: each question rendered at its real column width */}
            <div ref={measureRef} className="fixed -left-[20000px] top-0 pointer-events-none" aria-hidden="true"
              style={{ width: cfg.twoColumn ? (PAGE_WIDTH - PAGE_PADDING * 2 - COLUMN_GAP) / 2 : PAGE_WIDTH - PAGE_PADDING * 2, fontFamily: "Inter, Noto Sans Bengali, sans-serif", color: "#111827" }}>
              {exam.questions.map((question, idx) => (
                <QuestionBlock key={`m-${question.id || idx}`} question={question} index={idx} cfg={cfg} measure />
              ))}
            </div>

            <button onClick={generate} disabled={generating} className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              {generating ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              {generating ? "তৈরি হচ্ছে..." : "PDF ডাউনলোড"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

interface PdfPreviewProps {
  exam: Exam;
  cfg: PdfConfig;
  pagedQuestions: Exam["questions"][];
}

const PdfPreview = forwardRef<HTMLDivElement, PdfPreviewProps>(({ exam, cfg, pagedQuestions }, ref) => {
  let runningIndex = 0;
  return (
    <div ref={ref} className="pdf-export-preview" style={{ width: PAGE_WIDTH, color: "#111827", fontFamily: "Inter, Noto Sans Bengali, sans-serif" }}>
      {pagedQuestions.map((questions, pageIndex) => {
        const pageStartIdx = runningIndex;
        runningIndex += questions.length;
        return (
        <div
          key={pageIndex}
          data-pdf-page
          style={{
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT,
            overflow: "hidden",
            background: "#ffffff",
            padding: PAGE_PADDING,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            pageBreakAfter: "always",
          }}
        >
          <PdfHeader cfg={cfg} exam={exam} page={pageIndex + 1} total={pagedQuestions.length} />
          <div
            style={{
              flex: 1,
              minHeight: 0,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {cfg.twoColumn && (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 22,
                  bottom: 0,
                  left: "50%",
                  width: 1,
                  background: `${cfg.primaryColor}55`,
                  transform: "translateX(-0.5px)",
                  zIndex: 2,
                }}
              />
            )}
            <div
              style={{
              height: "100%",
              boxSizing: "border-box",
              display: cfg.twoColumn ? "block" : "grid",
              columnCount: cfg.twoColumn ? 2 : undefined,
              columnGap: cfg.twoColumn ? COLUMN_GAP : undefined,
              columnFill: cfg.twoColumn ? ("auto" as any) : undefined,
              columnRule: cfg.twoColumn ? `1px solid ${cfg.primaryColor}33` : undefined,
              gridTemplateColumns: cfg.twoColumn ? undefined : "1fr",
              alignContent: "start",
              paddingTop: 22,
              overflow: "hidden",
            }}
          >
            {questions.map((question, index) => {
              const absoluteIndex = pageStartIdx + index;
              return <QuestionBlock key={question.id || `${pageIndex}-${index}`} question={question} index={absoluteIndex} cfg={cfg} />;
            })}
            </div>
          </div>
          <PdfFooter cfg={cfg} page={pageIndex + 1} total={pagedQuestions.length} />
        </div>
        );
      })}
    </div>
  );
});

PdfPreview.displayName = "PdfPreview";

const QuestionBlock = ({ question, index, cfg, measure }: { question: Exam["questions"][number]; index: number; cfg: PdfConfig; measure?: boolean }) => {
  const correct = resolveCorrectOptionText(question);
  return (
    <div data-q-block={measure ? "" : undefined} style={{ breakInside: "avoid", pageBreakInside: "avoid", marginBottom: QUESTION_GAP, display: "inline-block", width: "100%" } as any}>
      <div style={{ display: "grid", gridTemplateColumns: "26px 1fr", gap: 6, alignItems: "start", marginBottom: 7 }}>
        <div style={{ color: cfg.primaryColor, fontWeight: 800, fontSize: 13.5, lineHeight: "20px" }}>{index + 1}.</div>
        <div style={{ fontWeight: 600, fontSize: 12.5, lineHeight: "20px", wordBreak: "break-word" }}><MathText text={question.question} /></div>
      </div>
      <div style={{ display: "grid", gap: 5, paddingLeft: cfg.twoColumn ? 0 : 32 }}>
        {question.options.map((opt, optionIndex) => {
          const isCorrect = cfg.showAnswers && opt === correct;
          return (
            <div
              key={`${question.id}-${optionIndex}`}
              style={{
                display: "grid",
                gridTemplateColumns: "22px minmax(0, 1fr) auto",
                gap: 6,
                alignItems: "start",
                border: isCorrect ? "1.2px solid #16a34a" : "1px solid #dbe2ea",
                background: isCorrect ? "#dcfce7" : "#f8fafc",
                color: isCorrect ? "#166534" : "#1f2937",
                borderRadius: 8,
                padding: "5px 8px",
                boxSizing: "border-box",
                minHeight: 28,
                lineHeight: "17px",
              }}
            >
              <span style={{ fontWeight: 800, fontSize: 11, lineHeight: "17px" }}>{String.fromCharCode(65 + optionIndex)}.</span>
              <span style={{ fontWeight: isCorrect ? 700 : 500, fontSize: 11.5, lineHeight: "17px", wordBreak: "break-word", minWidth: 0 }}><MathText text={opt} /></span>
              {isCorrect && <span style={{ fontWeight: 800, fontSize: 9.5, lineHeight: "17px", whiteSpace: "nowrap" }}>✓</span>}
            </div>
          );
        })}
      </div>
      {cfg.showExplanations && question.explanation && (
        <div style={{ marginTop: 6, marginLeft: cfg.twoColumn ? 0 : 32, padding: 7, borderRadius: 8, background: "#f1f5f9", color: "#475569", fontSize: 10.5, lineHeight: "16px" }}>
          <strong>ব্যাখ্যা: </strong><MathText text={question.explanation} />
        </div>
      )}
    </div>
  );
};

const PdfHeader = ({ cfg, exam, page, total }: { cfg: PdfConfig; exam: Exam; page: number; total: number }) => (
  <div style={{ borderBottom: `3px solid ${cfg.primaryColor}`, paddingBottom: 12 }}>
    <SlotRow slots={cfg.header} />
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
      {cfg.logoDataUrl && <img src={cfg.logoDataUrl} alt="" style={{ width: 54, height: 54, objectFit: "contain" }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: cfg.primaryColor, fontSize: 26, fontWeight: 900, lineHeight: "32px", wordBreak: "break-word" }}>{cfg.title || exam.title}</div>
        {cfg.subtitle && <div style={{ color: "#64748b", fontSize: 13, marginTop: 3 }}>{cfg.subtitle}</div>}
      </div>
      <div style={{ textAlign: "right", color: "#64748b", fontSize: 12, lineHeight: "20px", whiteSpace: "nowrap" }}>
        <div>সময়: {exam.duration} মিনিট</div>
        <div>মোট প্রশ্ন: {exam.questions.length}</div>
        <div>পেজ {page}/{total}</div>
      </div>
    </div>
  </div>
);

const PdfFooter = ({ cfg, page, total }: { cfg: PdfConfig; page: number; total: number }) => (
  <div style={{ borderTop: `1.5px solid ${cfg.primaryColor}`, paddingTop: 10, marginTop: 16 }}>
    <SlotRow slots={cfg.footer} />
    <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 10, marginTop: 5 }}>— {page} / {total} —</div>
  </div>
);

const SlotRow = ({ slots }: { slots: { left: Slot; center: Slot; right: Slot } }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, color: "#64748b", fontSize: 11, lineHeight: "16px" }}>
    {(["left", "center", "right"] as const).map((pos) => {
      const slot = slots[pos];
      return (
        <div
          key={pos}
          data-pdf-link={slot.link || undefined}
          style={{ textAlign: pos, minHeight: 16, overflowWrap: "anywhere", textDecoration: slot.link ? "underline" : "none" }}
        >
          {slot.text}
        </div>
      );
    })}
  </div>
);

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
