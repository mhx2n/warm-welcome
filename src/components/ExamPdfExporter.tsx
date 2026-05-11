import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import katex from "katex";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "katex/dist/katex.min.css";
import "katex/dist/contrib/mhchem.mjs";
import { Download, Eye, Image as ImageIcon, Loader2, Link as LinkIcon, RefreshCcw, Save, RotateCcw, Settings2, X } from "lucide-react";
import type { Exam, Question } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { resolveCorrectOptionText } from "@/lib/answerUtils";

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const BN_OPT = ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ"];
const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => BN_DIGITS[+d]);
const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

// A4 @ 96dpi
const A4_W = 794;
const A4_H = 1123;

const FONT_CSS_URL = "https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap";
let fontPromise: Promise<void> | null = null;
async function ensureFonts() {
  if (fontPromise) return fontPromise;
  fontPromise = (async () => {
    if (!document.querySelector(`link[data-pdf-fonts]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_CSS_URL;
      link.setAttribute("data-pdf-fonts", "1");
      document.head.appendChild(link);
    }
    const fontReady = (document as Document & { fonts?: { ready?: Promise<unknown>; load?: (s: string) => Promise<unknown> } }).fonts;
    try {
      if (fontReady?.load) {
        await Promise.all([
          fontReady.load('400 14px "Noto Sans Bengali"'),
          fontReady.load('700 14px "Noto Sans Bengali"'),
          fontReady.load('600 14px "Noto Sans Bengali"'),
        ]);
      }
      await fontReady?.ready;
    } catch { /* ignore */ }
  })();
  return fontPromise;
}

interface Slot { text: string; link: string }
interface PdfConfig {
  title: string;
  subtitle: string;
  logoDataUrl: string;
  logoHeight: number;
  showLogo: boolean;
  showMeta: boolean;
  showFooter: boolean;
  showPageNumbers: boolean;
  showAnswers: boolean;
  showExplanations: boolean;
  showQuestionImages: boolean;
  showOptionImages: boolean;
  twoColumn: boolean;
  primaryColor: string;
  answerBg: string;
  borderColor: string;
  setLabel: string;
  marksOverride: string;
  baseFontSize: number;
  questionFontSize: number;
  optionFontSize: number;
  lineHeight: number;
  pageMargin: number;
  columnGap: number;
  questionGap: number;
  optionGap: number;
  jpegQuality: number;
  renderScale: number;
  outputFormat: "png" | "jpeg";
  footer: { left: Slot; center: Slot; right: Slot };
}

// Render text with inline math (KaTeX) into an HTML string
function renderInline(text: string, mathImages: Map<string, string>): string {
  if (!text) return "";
  let s = String(text);
  // escape HTML first, but preserve math regions
  const tokens: { type: "text" | "math"; value: string; display?: boolean }[] = [];
  const re = /(\$\$([\s\S]+?)\$\$)|(\\\[([\s\S]+?)\\\])|(\\\(([\s\S]+?)\\\))|(\$([^$\n]+?)\$)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) tokens.push({ type: "text", value: s.slice(last, m.index) });
    if (m[2] != null) tokens.push({ type: "math", value: m[2], display: true });
    else if (m[4] != null) tokens.push({ type: "math", value: m[4], display: true });
    else if (m[6] != null) tokens.push({ type: "math", value: m[6], display: false });
    else if (m[8] != null) tokens.push({ type: "math", value: m[8], display: false });
    last = m.index + m[0].length;
  }
  if (last < s.length) tokens.push({ type: "text", value: s.slice(last) });

  const escape = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
  return tokens.map((t) => {
    if (t.type === "text") return escape(t.value);
    const key = (t.display ? "D|" : "I|") + t.value;
    const url = mathImages.get(key);
    if (url) {
      const cls = t.display ? "math-img math-d" : "math-img math-i";
      return `<img class="${cls}" src="${url}" alt="" data-math="1"/>`;
    }
    try {
      return katex.renderToString(t.value, { displayMode: !!t.display, throwOnError: false, output: "html", strict: false, trust: true });
    } catch {
      return escape(`$${t.value}$`);
    }
  }).join("");
}

function buildQuestionHTML(q: Question, idx: number, cfg: PdfConfig, mi: Map<string, string>): string {
  const correct = resolveCorrectOptionText(q);
  const correctIdx = q.options.findIndex((o) => o === correct);
  const correctLbl = correctIdx >= 0 ? (BN_OPT[correctIdx] || `${correctIdx + 1}`) : "";

  const optionsHtml = (q.options || []).map((opt, i) => `
    <div class="opt">
      <span class="opt-lbl">${BN_OPT[i] || toBn(i + 1)}.</span>
      <span class="opt-txt">${renderInline(opt, mi)}${cfg.showOptionImages && q.optionImages?.[i] ? `<img class="opt-img" src="${q.optionImages[i]}" alt=""/>` : ""}</span>
    </div>
  `).join("");

  const showAnsBlock = cfg.showAnswers || (cfg.showExplanations && q.explanation);
  const ansBlock = showAnsBlock ? `
    <div class="ans-box">
      ${cfg.showAnswers ? `<div class="ans-line"><b>সঠিক উত্তর:</b> ${correctLbl ? `<b>${correctLbl}.</b> ` : ""}<span>${renderInline(correct || "—", mi)}</span></div>` : ""}
      ${cfg.showExplanations && q.explanation ? `<div class="exp-line"><b>ব্যাখ্যা:</b> <span>${renderInline(q.explanation, mi)}</span></div>` : ""}
    </div>` : "";

  const qImg = cfg.showQuestionImages && q.questionImage ? `<img class="q-img" src="${q.questionImage}" alt=""/>` : "";

  return `
    <div class="q">
      <div class="q-head">
        <span class="q-num">${toBn(idx + 1)}.</span>
        <span class="q-text">${renderInline(q.question, mi)}</span>
      </div>
      ${qImg}
      <div class="opts">${optionsHtml}</div>
      ${ansBlock}
    </div>
  `;
}

function pageStyles(cfg: PdfConfig): string {
  return `
    .pdf-page{
      width:${A4_W}px;height:${A4_H}px;
      padding:${cfg.pageMargin}px;
      box-sizing:border-box;
      background:#ffffff;color:#0f172a;
      font-family:'Noto Sans Bengali','Inter','Hind Siliguri',sans-serif;
      font-size:${cfg.baseFontSize}px;line-height:${cfg.lineHeight};
      display:flex;flex-direction:column;
      position:relative;
      font-feature-settings:"liga","calt","kern","clig";
      text-rendering:optimizeLegibility;
      -webkit-font-smoothing:antialiased;
    }
    .pdf-header{margin-bottom:6px}
    .pdf-logo{display:block;margin:0 auto 4px;height:${cfg.logoHeight}px;object-fit:contain}
    .pdf-title{text-align:center;font-weight:800;font-size:${cfg.questionFontSize + 8}px;color:${cfg.primaryColor};margin:0;letter-spacing:.2px}
    .pdf-sub{text-align:center;font-size:${cfg.baseFontSize + 0.5}px;color:#475569;margin-top:2px}
    .pdf-meta{display:flex;justify-content:space-between;align-items:center;border-top:1.1px solid ${cfg.primaryColor};border-bottom:1.1px solid ${cfg.primaryColor};padding:5px 4px;margin-top:8px;font-size:${cfg.baseFontSize}px;color:${cfg.primaryColor};font-weight:600}
    .pdf-body{flex:1 1 auto;display:flex;gap:${cfg.columnGap}px;margin-top:8px;min-height:0;overflow:hidden}
    .pdf-col{flex:1 1 0;min-width:0;display:flex;flex-direction:column;overflow:hidden}
    .pdf-divider{width:0.7px;background:${cfg.borderColor};align-self:stretch}
    .q{margin-bottom:${cfg.questionGap}px;page-break-inside:avoid;break-inside:avoid}
    .q-head{display:flex;align-items:flex-start;gap:5px;font-size:${cfg.questionFontSize}px;font-weight:700;line-height:${cfg.lineHeight}}
    .q-num{color:${cfg.primaryColor};font-weight:800;flex:0 0 auto}
    .q-text{flex:1 1 auto;min-width:0;word-wrap:break-word}
    .q-img{display:block;margin:4px 0 0 18px;max-width:60%;max-height:90px;object-fit:contain}
    .opts{margin-top:3px;margin-left:18px;display:grid;grid-template-columns:1fr 1fr;column-gap:8px;row-gap:${cfg.optionGap}px;font-size:${cfg.optionFontSize}px;line-height:${cfg.lineHeight}}
    .opt{display:flex;align-items:flex-start;gap:4px;color:#1f2937}
    .opt-lbl{color:${cfg.primaryColor};font-weight:700;flex:0 0 auto}
    .opt-txt{flex:1 1 auto;min-width:0;word-wrap:break-word}
    .opt-img{display:block;margin-top:2px;max-width:100%;max-height:48px;object-fit:contain}
    .ans-box{margin:5px 0 0 18px;padding:6px 8px;border:0.7px solid ${cfg.borderColor};background:${cfg.answerBg};border-radius:5px;font-size:${cfg.optionFontSize}px;line-height:${cfg.lineHeight}}
    .ans-line{color:${cfg.primaryColor};font-weight:600}
    .ans-line span{font-weight:500;color:#0f172a}
    .exp-line{margin-top:2px;color:#334155}
    .exp-line b{color:${cfg.primaryColor}}
    .pdf-footer{position:absolute;left:${cfg.pageMargin}px;right:${cfg.pageMargin}px;bottom:${Math.max(8, cfg.pageMargin / 2)}px;display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:0.6px solid ${cfg.borderColor};padding-top:4px;font-size:${Math.max(7.5, cfg.baseFontSize - 0.8)}px;color:#475569}
    .pdf-footer .slot{flex:1;min-width:0;color:${cfg.primaryColor};font-weight:600}
    .pdf-footer .slot.center{text-align:center;flex:1.2}
    .pdf-footer .slot.right{text-align:right}
    .pdf-footer .pn{font-weight:500;color:#475569;margin-top:1px}
    /* KaTeX tweaks for inline pdf */
    .katex{font-size:1em !important;line-height:1.2 !important}
    .katex-display{margin:.25em 0 !important;text-align:left}
    .katex-display>.katex{text-align:left}
    .math-img{display:inline-block;vertical-align:-0.25em;max-width:100%}
    .math-img.math-d{display:block;margin:.25em 0;vertical-align:middle}
  `;
}

function buildPageHeaderHTML(exam: Exam, cfg: PdfConfig): string {
  const marks = cfg.marksOverride.trim() || String(exam.questions.length);
  return `
    <div class="pdf-header">
      ${cfg.showLogo && cfg.logoDataUrl ? `<img class="pdf-logo" src="${cfg.logoDataUrl}" alt=""/>` : ""}
      <h1 class="pdf-title">${escapeHtml(cfg.title || exam.title)}</h1>
      ${cfg.subtitle ? `<div class="pdf-sub">${escapeHtml(cfg.subtitle)}</div>` : ""}
      ${cfg.showMeta ? `
        <div class="pdf-meta">
          <span>পূর্ণমান: ${toBn(marks)}</span>
          <span>সেট: ${escapeHtml(cfg.setLabel || "—")}</span>
          <span>সময়: ${toBn(exam.duration)} মিনিট</span>
        </div>` : ""}
    </div>
  `;
}

function buildFooterHTML(cfg: PdfConfig, pageNum: number, totalPages: number): string {
  if (!cfg.showFooter) return "";
  const slot = (s: Slot, cls: string) => {
    if (!s.text) return `<div class="slot ${cls}"></div>`;
    if (s.link) return `<div class="slot ${cls}"><a href="${escapeAttr(s.link)}" style="color:inherit;text-decoration:none">${escapeHtml(s.text)}</a></div>`;
    return `<div class="slot ${cls}">${escapeHtml(s.text)}</div>`;
  };
  return `
    <div class="pdf-footer">
      ${slot(cfg.footer.left, "left")}
      ${slot(cfg.footer.center, "center")}
      <div class="slot right">
        ${cfg.footer.right.text ? (cfg.footer.right.link ? `<a href="${escapeAttr(cfg.footer.right.link)}" style="color:inherit;text-decoration:none">${escapeHtml(cfg.footer.right.text)}</a>` : escapeHtml(cfg.footer.right.text)) : ""}
        ${cfg.showPageNumbers ? `<div class="pn">পৃষ্ঠা ${toBn(pageNum)} / ${toBn(totalPages)}</div>` : ""}
      </div>
    </div>
  `;
}

function escapeHtml(s: string) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function escapeAttr(s: string) { return escapeHtml(s).replace(/"/g, "&quot;"); }

function collectMath(exam: Exam): { value: string; display: boolean }[] {
  const re = /(\$\$([\s\S]+?)\$\$)|(\\\[([\s\S]+?)\\\])|(\\\(([\s\S]+?)\\\))|(\$([^$\n]+?)\$)/g;
  const seen = new Set<string>();
  const out: { value: string; display: boolean }[] = [];
  const scan = (s: string | undefined | null) => {
    if (!s) return;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) {
      let value = ""; let display = false;
      if (m[2] != null) { value = m[2]; display = true; }
      else if (m[4] != null) { value = m[4]; display = true; }
      else if (m[6] != null) { value = m[6]; display = false; }
      else if (m[8] != null) { value = m[8]; display = false; }
      const key = (display ? "D|" : "I|") + value;
      if (!seen.has(key)) { seen.add(key); out.push({ value, display }); }
    }
  };
  for (const q of exam.questions || []) {
    scan(q.question);
    scan(q.explanation);
    (q.options || []).forEach((o) => scan(o));
  }
  return out;
}

const mathCache = new Map<string, string>();

async function prerenderMathImages(exam: Exam, onProgress?: (msg: string) => void): Promise<Map<string, string>> {
  const items = collectMath(exam);
  const result = new Map<string, string>();
  if (!items.length) return result;
  const stage = document.createElement("div");
  stage.style.cssText = "position:fixed;left:-99999px;top:0;z-index:-1;pointer-events:none;background:#fff;padding:8px;font-family:'Noto Sans Bengali','Inter',sans-serif;";
  document.body.appendChild(stage);
  let done = 0;
  for (const it of items) {
    const cacheKey = (it.display ? "D|" : "I|") + it.value;
    if (mathCache.has(cacheKey)) {
      result.set(cacheKey, mathCache.get(cacheKey)!);
      done++; continue;
    }
    try {
      const wrap = document.createElement("div");
      wrap.style.cssText = "display:inline-block;padding:2px 4px;background:#ffffff;color:#0f172a;font-size:18px;line-height:1.25;";
      wrap.innerHTML = katex.renderToString(it.value, { displayMode: it.display, throwOnError: false, output: "html", strict: false, trust: true });
      stage.appendChild(wrap);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const canvas = await html2canvas(wrap, { scale: 4, backgroundColor: null, useCORS: true, logging: false });
      const url = canvas.toDataURL("image/png");
      result.set(cacheKey, url);
      mathCache.set(cacheKey, url);
      stage.removeChild(wrap);
    } catch { /* skip */ }
    done++;
    if (done % 4 === 0) onProgress?.(`ম্যাথ রেন্ডার ${toBn(done)}/${toBn(items.length)}...`);
  }
  stage.remove();
  return result;
}

async function buildPdf(exam: Exam, cfg: PdfConfig, onProgress?: (msg: string) => void): Promise<Blob> {
  await ensureFonts();
  onProgress?.("ম্যাথ প্রি-রেন্ডার...");
  const mathImages = await prerenderMathImages(exam, onProgress);
  onProgress?.("পেজ লে-আউট তৈরি হচ্ছে...");

  // Off-screen render container
  const stage = document.createElement("div");
  stage.style.cssText = "position:fixed;left:-99999px;top:0;z-index:-1;pointer-events:none;";
  const styleEl = document.createElement("style");
  styleEl.textContent = pageStyles(cfg);
  stage.appendChild(styleEl);
  document.body.appendChild(stage);

  type PageEls = { page: HTMLDivElement; left: HTMLDivElement; right: HTMLDivElement | null; body: HTMLDivElement };
  const pages: PageEls[] = [];

  const newPage = (): PageEls => {
    const page = document.createElement("div");
    page.className = "pdf-page";
    page.innerHTML = buildPageHeaderHTML(exam, cfg);
    const body = document.createElement("div");
    body.className = "pdf-body";
    const left = document.createElement("div");
    left.className = "pdf-col";
    body.appendChild(left);
    let right: HTMLDivElement | null = null;
    if (cfg.twoColumn) {
      const div = document.createElement("div");
      div.className = "pdf-divider";
      body.appendChild(div);
      right = document.createElement("div");
      right.className = "pdf-col";
      body.appendChild(right);
    }
    page.appendChild(body);
    stage.appendChild(page);
    return { page, left, right, body };
  };

  let cur = newPage();
  pages.push(cur);
  let curCol: HTMLDivElement = cur.left;

  const fits = (col: HTMLDivElement) => col.scrollHeight <= col.clientHeight + 1;

  for (let i = 0; i < exam.questions.length; i++) {
    const q = exam.questions[i];
    const tmp = document.createElement("div");
    tmp.innerHTML = buildQuestionHTML(q, i, cfg, mathImages);
    const node = tmp.firstElementChild as HTMLElement;
    curCol.appendChild(node);
    if (!fits(curCol)) {
      curCol.removeChild(node);
      // try right col
      if (cfg.twoColumn && curCol === cur.left && cur.right) {
        curCol = cur.right;
        curCol.appendChild(node);
        if (!fits(curCol)) {
          curCol.removeChild(node);
          cur = newPage();
          pages.push(cur);
          curCol = cur.left;
          curCol.appendChild(node);
        }
      } else {
        cur = newPage();
        pages.push(cur);
        curCol = cur.left;
        curCol.appendChild(node);
      }
    }
  }

  // Append footers (need totalPages first)
  const total = pages.length;
  pages.forEach((p, idx) => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = buildFooterHTML(cfg, idx + 1, total);
    if (wrapper.firstElementChild) p.page.appendChild(wrapper.firstElementChild);
  });

  // Wait for any images to load
  onProgress?.("ছবি লোড হচ্ছে...");
  const imgs = stage.querySelectorAll("img");
  await Promise.all(Array.from(imgs).map((img) => new Promise<void>((res) => {
    if (img.complete && img.naturalWidth > 0) return res();
    img.onload = () => res();
    img.onerror = () => res();
    setTimeout(() => res(), 4000);
  })));

  // Render each page to canvas, build PDF
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < pages.length; i++) {
    onProgress?.(`পেজ রেন্ডার ${toBn(i + 1)}/${toBn(pages.length)}...`);
    const canvas = await html2canvas(pages[i].page, {
      scale: cfg.renderScale,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      windowWidth: A4_W,
      windowHeight: A4_H,
      imageTimeout: 0,
    });
    const isPng = cfg.outputFormat === "png";
    const dataUrl = isPng ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", cfg.jpegQuality);
    if (i > 0) pdf.addPage("a4", "portrait");
    pdf.addImage(dataUrl, isPng ? "PNG" : "JPEG", 0, 0, pdfW, pdfH, undefined, isPng ? "SLOW" : "FAST");
    // also add invisible link annotations for footer slots if needed - skipped (raster)
  }

  stage.remove();
  return pdf.output("blob");
}

const emptySlot = (): Slot => ({ text: "", link: "" });
const DEFAULT_CFG: PdfConfig = {
  title: "",
  subtitle: "",
  logoDataUrl: "",
  logoHeight: 32,
  showLogo: true,
  showMeta: true,
  showFooter: true,
  showPageNumbers: true,
  showAnswers: true,
  showExplanations: true,
  showQuestionImages: true,
  showOptionImages: true,
  twoColumn: true,
  primaryColor: "#1e3a8a",
  answerBg: "#eaf3fb",
  borderColor: "#bcd4e6",
  setLabel: "A",
  marksOverride: "",
  baseFontSize: 11,
  questionFontSize: 11.5,
  optionFontSize: 10.5,
  lineHeight: 1.45,
  pageMargin: 32,
  columnGap: 16,
  questionGap: 8,
  optionGap: 3,
  jpegQuality: 0.85,
  renderScale: 2,
  footer: { left: emptySlot(), center: { text: "✈ আমাদের টেলিগ্রাম চ্যানেল", link: "" }, right: emptySlot() },
};

const safeFileName = (n: string) => (n || "exam").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80);

export default function Exporter({ exam, open, onClose }: { exam: Exam; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [cfg, setCfg] = useState<PdfConfig>({ ...DEFAULT_CFG, title: exam.title, subtitle: exam.subject || "" });
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [progress, setProgress] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const previewRef = useRef("");

  useEffect(() => {
    if (!open) return;
    setCfg((c) => ({ ...c, title: exam.title, subtitle: exam.subject || c.subtitle }));
  }, [open, exam.id, exam.title, exam.subject]);

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const questionCount = useMemo(() => exam.questions?.length || 0, [exam.questions]);

  const updateCfg = <K extends keyof PdfConfig>(key: K, value: PdfConfig[K]) => setCfg((c) => ({ ...c, [key]: value }));
  const updateFooter = (pos: "left" | "center" | "right", field: keyof Slot, value: string) =>
    setCfg((c) => ({ ...c, footer: { ...c.footer, [pos]: { ...c.footer[pos], [field]: value } } }));

  const onLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1024 * 1024) { toast({ title: "লোগো ১MB এর মধ্যে হতে হবে", variant: "destructive" }); return; }
    const reader = new FileReader();
    reader.onload = () => setCfg((c) => ({ ...c, logoDataUrl: String(reader.result || "") }));
    reader.readAsDataURL(f);
  };

  const downloadPdf = async () => {
    if (!questionCount) { toast({ title: "প্রশ্ন নেই", variant: "destructive" }); return; }
    setGenerating(true);
    try {
      const blob = await buildPdf(exam, cfg, setProgress);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${safeFileName(cfg.title || exam.title)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast({ title: "PDF তৈরি হয়েছে ✅", description: `সাইজ: ${(blob.size / 1024).toFixed(0)} KB` });
    } catch (err: unknown) {
      console.error("PDF gen error", err);
      toast({ title: "PDF তৈরিতে ত্রুটি", description: errorMessage(err), variant: "destructive" });
    } finally { setGenerating(false); setProgress(""); }
  };

  const previewPdf = async () => {
    if (!questionCount) { toast({ title: "প্রশ্ন নেই", variant: "destructive" }); return; }
    setPreviewing(true);
    try {
      const blob = await buildPdf(exam, cfg, setProgress);
      const next = URL.createObjectURL(blob);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = next;
      setPreviewUrl(next);
      toast({ title: "প্রিভিউ প্রস্তুত ✅", description: `সাইজ: ${(blob.size / 1024).toFixed(0)} KB` });
    } catch (err: unknown) {
      console.error("PDF preview error", err);
      toast({ title: "প্রিভিউ তৈরিতে ত্রুটি", description: errorMessage(err), variant: "destructive" });
    } finally { setPreviewing(false); setProgress(""); }
  };

  if (!open) return null;
  const busy = generating || previewing;

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm overflow-y-auto p-2 md:p-5">
      <div className="min-h-[calc(100vh-1rem)] flex items-start justify-center">
        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden my-2 border border-border">
          <div className="flex items-start justify-between gap-3 p-4 md:p-5 border-b border-border shrink-0">
            <div>
              <h2 className="font-bold text-lg flex items-center gap-2"><Settings2 size={18} /> PDF এক্সপোর্ট</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Browser-shaped Bengali • KaTeX math • Auto pagination • Live preview</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg" aria-label="বন্ধ করুন"><X size={16} /></button>
          </div>

          <div className="grid lg:grid-cols-[420px_1fr] min-h-[calc(100vh-8rem)]">
            <div className="p-4 md:p-5 space-y-5 max-h-[calc(100vh-8rem)] overflow-y-auto border-b lg:border-b-0 lg:border-r border-border">
              <section className="grid sm:grid-cols-2 gap-3">
                <TextInput label="শিরোনাম" value={cfg.title} onChange={(v) => updateCfg("title", v)} />
                <TextInput label="সাবটাইটেল" value={cfg.subtitle} onChange={(v) => updateCfg("subtitle", v)} />
                <TextInput label="সেট" value={cfg.setLabel} onChange={(v) => updateCfg("setLabel", v)} placeholder="A" />
                <TextInput label="পূর্ণমান" value={cfg.marksOverride} onChange={(v) => updateCfg("marksOverride", v)} placeholder={`${questionCount}`} />
              </section>

              <section className="grid sm:grid-cols-2 gap-3">
                <NumberInput label="লোগো উচ্চতা" value={cfg.logoHeight} min={16} max={64} step={1} onChange={(v) => updateCfg("logoHeight", v)} />
                <div>
                  <label className="text-xs text-muted-foreground">লোগো</label>
                  <label className="flex items-center gap-2 mt-1 px-3 py-2 rounded-lg border border-border cursor-pointer text-xs hover:bg-muted/60">
                    <ImageIcon size={14} /> {cfg.logoDataUrl ? "লোগো পরিবর্তন" : "লোগো আপলোড"}
                    <input type="file" accept="image/png,image/jpeg" onChange={onLogo} className="hidden" />
                  </label>
                  {cfg.logoDataUrl ? (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={cfg.logoDataUrl} alt="PDF logo preview" className="w-10 h-10 object-contain rounded border border-border" />
                      <button onClick={() => updateCfg("logoDataUrl", "")} className="text-xs text-destructive">সরাও</button>
                    </div>
                  ) : null}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold mb-2">লে-আউট কাস্টমাইজ</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <NumberInput label="পেজ মার্জিন" value={cfg.pageMargin} min={20} max={56} step={1} onChange={(v) => updateCfg("pageMargin", v)} />
                  <NumberInput label="কলাম gap" value={cfg.columnGap} min={8} max={28} step={1} onChange={(v) => updateCfg("columnGap", v)} />
                  <NumberInput label="প্রশ্ন gap" value={cfg.questionGap} min={2} max={20} step={0.5} onChange={(v) => updateCfg("questionGap", v)} />
                  <NumberInput label="অপশন gap" value={cfg.optionGap} min={1} max={10} step={0.5} onChange={(v) => updateCfg("optionGap", v)} />
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold mb-2">ফন্ট ও রঙ</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <NumberInput label="বেস ফন্ট" value={cfg.baseFontSize} min={8} max={14} step={0.1} onChange={(v) => updateCfg("baseFontSize", v)} />
                  <NumberInput label="প্রশ্ন ফন্ট" value={cfg.questionFontSize} min={9} max={16} step={0.1} onChange={(v) => updateCfg("questionFontSize", v)} />
                  <NumberInput label="অপশন ফন্ট" value={cfg.optionFontSize} min={8} max={14} step={0.1} onChange={(v) => updateCfg("optionFontSize", v)} />
                  <NumberInput label="লাইন height" value={cfg.lineHeight} min={1.2} max={1.8} step={0.01} onChange={(v) => updateCfg("lineHeight", v)} />
                  <ColorInput label="প্রাইমারি" value={cfg.primaryColor} onChange={(v) => updateCfg("primaryColor", v)} />
                  <ColorInput label="উত্তর বক্স" value={cfg.answerBg} onChange={(v) => updateCfg("answerBg", v)} />
                  <ColorInput label="বর্ডার" value={cfg.borderColor} onChange={(v) => updateCfg("borderColor", v)} />
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold mb-2">কোয়ালিটি</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <NumberInput label="রেন্ডার scale (1.5–3)" value={cfg.renderScale} min={1.2} max={3} step={0.1} onChange={(v) => updateCfg("renderScale", v)} />
                  <NumberInput label="JPEG কোয়ালিটি (.5–.95)" value={cfg.jpegQuality} min={0.5} max={0.95} step={0.01} onChange={(v) => updateCfg("jpegQuality", v)} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">বেশি = তীক্ষ্ণ কিন্তু বড় ফাইল। সাধারণত scale ২ + কোয়ালিটি ০.৮৫ যথেষ্ট।</p>
              </section>

              <section>
                <h3 className="text-xs font-bold mb-2">দেখানোর অপশন</h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Toggle label="দুই-কলাম" checked={cfg.twoColumn} onChange={(v) => updateCfg("twoColumn", v)} />
                  <Toggle label="মেটা বার" checked={cfg.showMeta} onChange={(v) => updateCfg("showMeta", v)} />
                  <Toggle label="লোগো" checked={cfg.showLogo} onChange={(v) => updateCfg("showLogo", v)} />
                  <Toggle label="ফুটার" checked={cfg.showFooter} onChange={(v) => updateCfg("showFooter", v)} />
                  <Toggle label="পৃষ্ঠা নম্বর" checked={cfg.showPageNumbers} onChange={(v) => updateCfg("showPageNumbers", v)} />
                  <Toggle label="সঠিক উত্তর" checked={cfg.showAnswers} onChange={(v) => updateCfg("showAnswers", v)} />
                  <Toggle label="ব্যাখ্যা" checked={cfg.showExplanations} onChange={(v) => updateCfg("showExplanations", v)} />
                  <Toggle label="প্রশ্নের ছবি" checked={cfg.showQuestionImages} onChange={(v) => updateCfg("showQuestionImages", v)} />
                  <Toggle label="অপশনের ছবি" checked={cfg.showOptionImages} onChange={(v) => updateCfg("showOptionImages", v)} />
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold mb-2">ফুটার (বাম / মাঝ / ডান)</h3>
                <div className="grid gap-2">
                  {(["left", "center", "right"] as const).map((p) => (
                    <SlotEditor key={p} slot={cfg.footer[p]} label={p === "left" ? "বাম" : p === "center" ? "মাঝ" : "ডান"} onText={(v) => updateFooter(p, "text", v)} onLink={(v) => updateFooter(p, "link", v)} />
                  ))}
                </div>
              </section>

              <div className="grid grid-cols-2 gap-2 sticky bottom-0 bg-card pt-2">
                <button onClick={previewPdf} disabled={busy} className="py-3 rounded-xl border border-border text-sm font-bold flex items-center justify-center gap-2 hover:bg-muted disabled:opacity-50">
                  {previewing ? <Loader2 className="animate-spin" size={16} /> : previewUrl ? <RefreshCcw size={16} /> : <Eye size={16} />}
                  {previewing ? progress || "প্রিভিউ..." : previewUrl ? "প্রিভিউ রিফ্রেশ" : "প্রিভিউ"}
                </button>
                <button onClick={downloadPdf} disabled={busy} className="py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {generating ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                  {generating ? progress || "তৈরি হচ্ছে..." : "ডাউনলোড"}
                </button>
              </div>
            </div>

            <div className="p-3 md:p-5 bg-muted/20 min-h-[520px]">
              <div className="h-full min-h-[500px] rounded-xl border border-border bg-background overflow-hidden">
                {previewUrl ? (
                  <iframe title="PDF preview" src={previewUrl} className="w-full h-full min-h-[500px]" />
                ) : (
                  <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center px-6 text-muted-foreground">
                    <Eye size={34} className="mb-3 opacity-70" />
                    <p className="text-sm font-semibold text-foreground">প্রিভিউ এখানে দেখাবে</p>
                    <p className="text-xs mt-1 max-w-sm">সেটিংস বদলে "প্রিভিউ" চাপলে এখানে আসবে — তারপর নিশ্চিন্তে ডাউনলোড।</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </label>
  );
}

function NumberInput({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number; step: number }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input type="number" value={value} min={min} max={max} step={step}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))}
        className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </label>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-1 flex rounded-lg border border-border bg-background overflow-hidden">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 bg-transparent" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 bg-background px-2 text-xs outline-none" />
      </div>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-xs cursor-pointer hover:bg-muted/60">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

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
