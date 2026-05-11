import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import katex from "katex";
import "katex/dist/katex.min.css";
import "katex/dist/contrib/mhchem.mjs";
import { Download, Image as ImageIcon, Loader2, Link as LinkIcon, RefreshCcw, Save, RotateCcw, Settings2, X } from "lucide-react";
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

let fontPromise: Promise<void> | null = null;
async function ensureFonts() {
  if (fontPromise) return fontPromise;
  fontPromise = (async () => {
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
  presetVersion: number;
  headerFirstPageOnly: boolean;
  showWatermark: boolean;
  watermarkOpacity: number;
  watermarkSize: number;
  footer: { left: Slot; center: Slot; right: Slot };
}

// Render text with inline math (KaTeX) into an HTML string
function renderInline(text: string): string {
  if (!text) return "";
  const s = String(text);
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
    try {
      const cls = t.display ? "math-wrap math-display" : "math-wrap math-inline";
      return `<span class="${cls}">${katex.renderToString(t.value, { displayMode: !!t.display, throwOnError: false, output: "html", strict: false, trust: true })}</span>`;
    } catch {
      return escape(`$${t.value}$`);
    }
  }).join("");
}

function buildQuestionHTML(q: Question, idx: number, cfg: PdfConfig): string {
  const correct = resolveCorrectOptionText(q);
  const correctIdx = q.options.findIndex((o) => o === correct);
  const correctLbl = correctIdx >= 0 ? (BN_OPT[correctIdx] || `${correctIdx + 1}`) : "";

  const optionsHtml = (q.options || []).map((opt, i) => `
    <div class="opt">
      <span class="opt-lbl">${BN_OPT[i] || toBn(i + 1)})</span>
      <span class="opt-txt">${renderInline(opt)}${cfg.showOptionImages && q.optionImages?.[i] ? `<img class="opt-img" src="${q.optionImages[i]}" alt=""/>` : ""}</span>
    </div>
  `).join("");

  const showAnsBlock = cfg.showAnswers || (cfg.showExplanations && q.explanation);
  const ansBlock = showAnsBlock ? `
    <div class="ans-box">
      ${cfg.showAnswers ? `<div class="ans-line"><b>সঠিক উত্তর:</b> <span>${correctLbl ? `${correctLbl}) ` : ""}${renderInline(correct || "—")}</span></div>` : ""}
      ${cfg.showExplanations && q.explanation ? `<div class="exp-line"><b>ব্যাখ্যা:</b> <span>${renderInline(q.explanation)}</span></div>` : ""}
    </div>` : "";

  const qImg = cfg.showQuestionImages && q.questionImage ? `<img class="q-img" src="${q.questionImage}" alt=""/>` : "";

  return `
    <div class="q">
      <div class="q-row">
        <span class="q-num">${toBn(idx + 1)}.</span>
        <div class="q-content">
          <div class="q-text">${renderInline(q.question)}</div>
          ${qImg}
          <div class="opts">${optionsHtml}</div>
          ${ansBlock}
        </div>
      </div>
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
    .q-row{display:grid;grid-template-columns:auto 1fr;column-gap:6px;align-items:start}
    .q-num{color:${cfg.primaryColor};font-weight:800;font-size:${cfg.questionFontSize}px;line-height:${cfg.lineHeight};white-space:nowrap}
    .q-content{min-width:0}
    .q-text{font-size:${cfg.questionFontSize}px;font-weight:600;line-height:${cfg.lineHeight};color:#0f172a;word-wrap:break-word;overflow-wrap:break-word}
    .q-img{display:block;margin:4px 0 0 0;max-width:80%;max-height:100px;object-fit:contain}
    .opts{margin-top:4px;display:grid;grid-template-columns:1fr 1fr;column-gap:14px;row-gap:${cfg.optionGap}px;font-size:${cfg.optionFontSize}px;line-height:${cfg.lineHeight}}
    .opt{display:flex;align-items:flex-start;gap:5px;color:#1f2937}
    .opt-lbl{color:#1f2937;font-weight:600;flex:0 0 auto}
    .opt-txt{flex:1 1 auto;min-width:0;word-wrap:break-word}
    .opt-img{display:block;margin-top:2px;max-width:100%;max-height:48px;object-fit:contain}
    .ans-box{margin:6px 0 0 0;padding:6px 9px;border:0.7px solid ${cfg.borderColor};background:${cfg.answerBg};border-radius:6px;font-size:${cfg.optionFontSize}px;line-height:${cfg.lineHeight}}
    .ans-line{color:#0f172a}
    .ans-line b{color:${cfg.primaryColor};font-weight:700}
    .ans-line span{font-weight:600;color:#0f172a}
    .exp-line{margin-top:3px;color:#334155;font-weight:400}
    .exp-line b{color:${cfg.primaryColor};font-weight:700}
    .pdf-footer{position:absolute;left:${cfg.pageMargin}px;right:${cfg.pageMargin}px;bottom:${Math.max(8, cfg.pageMargin / 2)}px;display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:0.6px solid ${cfg.borderColor};padding-top:4px;font-size:${Math.max(7.5, cfg.baseFontSize - 0.8)}px;color:#475569}
    .pdf-footer .slot{flex:1;min-width:0;color:${cfg.primaryColor};font-weight:600}
    .pdf-footer .slot.center{text-align:center;flex:1.2}
    .pdf-footer .slot.right{text-align:right}
    .pdf-footer .pn{font-weight:500;color:#475569;margin-top:1px}
    .pdf-watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:${cfg.watermarkOpacity};width:${cfg.watermarkSize}%;max-width:70%;pointer-events:none;z-index:0;object-fit:contain}
    .pdf-header,.pdf-body,.pdf-footer,.pdf-mini-head{position:relative;z-index:1}
    .pdf-mini-head{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${cfg.primaryColor};padding:0 2px 4px;margin-bottom:6px;font-size:${cfg.baseFontSize - 0.5}px;color:${cfg.primaryColor};font-weight:600}
    .pdf-mini-head .t{font-weight:800}
    /* KaTeX tweaks for inline pdf */
    .math-wrap{break-inside:avoid;page-break-inside:avoid;white-space:nowrap}
    .math-display{display:block;white-space:normal;margin:.18em 0}
    .katex{font-size:1em !important;line-height:1.18 !important;white-space:nowrap}
    .katex-display{margin:0 !important;text-align:left;overflow:visible}
    .katex-display>.katex{text-align:left;white-space:normal}
    .katex .mfrac{break-inside:avoid;page-break-inside:avoid}
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

function buildMiniHeaderHTML(exam: Exam, cfg: PdfConfig): string {
  return `
    <div class="pdf-mini-head">
      <span class="t">${escapeHtml(cfg.title || exam.title)}</span>
      <span>সেট: ${escapeHtml(cfg.setLabel || "—")}</span>
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

/**
 * Build the print-ready HTML (one or more A4 page divs) and trigger
 * the browser's native print dialog inside a hidden iframe.
 * Output: vector PDF (Skia/PDF) when user picks "Save as PDF".
 */
async function printExam(exam: Exam, cfg: PdfConfig, onProgress?: (msg: string) => void): Promise<void> {
  await ensureFonts();
  onProgress?.("পেজ লে-আউট তৈরি হচ্ছে...");

  // Off-screen measuring stage (in current document, so font metrics match)
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
    const isFirst = pages.length === 0;
    if (cfg.showWatermark && cfg.logoDataUrl) {
      page.innerHTML = `<img class="pdf-watermark" src="${cfg.logoDataUrl}" alt=""/>`;
    }
    if (isFirst || !cfg.headerFirstPageOnly) {
      page.insertAdjacentHTML("beforeend", buildPageHeaderHTML(exam, cfg));
    } else {
      page.insertAdjacentHTML("beforeend", buildMiniHeaderHTML(exam, cfg));
    }
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
    tmp.innerHTML = buildQuestionHTML(q, i, cfg);
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
          // if still doesn't fit on a fresh page (oversized), allow overflow
          if (!fits(curCol)) curCol.style.overflow = "visible";
        }
      } else {
        cur = newPage();
        pages.push(cur);
        curCol = cur.left;
        curCol.appendChild(node);
        if (!fits(curCol)) curCol.style.overflow = "visible";
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

  // Collect serialized HTML for each paginated page, then move into a hidden iframe
  // so the browser's native print produces a vector PDF (Skia/PDF), matching the
  // reference output. File size and sharpness benefit massively from this.
  onProgress?.("প্রিন্ট প্রিভিউ খুলছে...");

  const pagesHtml = pages.map((p) => p.page.outerHTML).join("\n");
  stage.remove();

  // Inject KaTeX CSS into the iframe so math renders identically
  const katexHref = (() => {
    const link = document.querySelector('link[rel="stylesheet"][href*="katex"]') as HTMLLinkElement | null;
    return link?.href || "";
  })();
  // Capture loaded Bengali font CSS link (if any) for the iframe
  const fontHrefs = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map((l) => (l as HTMLLinkElement).href)
    .filter((h) => /noto.+bengali|hind.?siliguri|fonts\.googleapis|fonts\.gstatic/i.test(h));

  const docHtml = `<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(cfg.title || exam.title || "exam")}</title>
${katexHref ? `<link rel="stylesheet" href="${escapeAttr(katexHref)}" />` : ""}
${fontHrefs.map((h) => `<link rel="stylesheet" href="${escapeAttr(h)}" />`).join("\n")}
<style>
  @page { size: A4 portrait; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  ${pageStyles(cfg)}
  .pdf-page { page-break-after: always; break-after: page; }
  .pdf-page:last-child { page-break-after: auto; break-after: auto; }
  @media print {
    .pdf-page { box-shadow: none !important; }
  }
</style>
</head>
<body>
${pagesHtml}
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      // Remove iframe shortly after print dialog closes
      setTimeout(() => { try { iframe.remove(); } catch { /* ignore */ } }, 1500);
    };
    iframe.onload = async () => {
      try {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument;
        if (!win || !doc) throw new Error("Print iframe could not be opened");
        // Wait for iframe fonts + images to be ready
        try {
          const f = (doc as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
          if (f?.ready) await f.ready;
        } catch { /* ignore */ }
        const innerImgs = Array.from(doc.images);
        await Promise.all(innerImgs.map((img) => new Promise<void>((r) => {
          if (img.complete && img.naturalWidth > 0) return r();
          img.onload = () => r();
          img.onerror = () => r();
          setTimeout(() => r(), 4000);
        })));
        // Give layout a tick to settle
        await new Promise((r) => setTimeout(r, 80));
        win.focus();
        win.print();
        cleanup();
        resolve();
      } catch (e) {
        cleanup();
        reject(e);
      }
    };
    // srcdoc is more reliable for cross-origin font links
    iframe.srcdoc = docHtml;
  });
}

const emptySlot = (): Slot => ({ text: "", link: "" });
const PDF_DEFAULT_KEY = "target_pdf_default_cfg";
const PDF_CFG_VERSION = 2;
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
  jpegQuality: 0.84,
  renderScale: 2,
  outputFormat: "jpeg",
  presetVersion: PDF_CFG_VERSION,
  headerFirstPageOnly: true,
  showWatermark: true,
  watermarkOpacity: 0.07,
  watermarkSize: 55,
  footer: { left: emptySlot(), center: { text: "✈ আমাদের টেলিগ্রাম চ্যানেল", link: "" }, right: emptySlot() },
};

function loadSavedDefault(): Partial<PdfConfig> | null {
  try {
    const raw = localStorage.getItem(PDF_DEFAULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PdfConfig>;
    if (parsed.presetVersion === PDF_CFG_VERSION) return parsed;
    return { ...parsed, renderScale: 2, jpegQuality: 0.82, outputFormat: "jpeg", presetVersion: PDF_CFG_VERSION };
  } catch { return null; }
}
function saveDefault(cfg: PdfConfig) {
  try { localStorage.setItem(PDF_DEFAULT_KEY, JSON.stringify({ ...cfg, presetVersion: PDF_CFG_VERSION })); } catch { /* ignore */ }
}
function clearSavedDefault() {
  try { localStorage.removeItem(PDF_DEFAULT_KEY); } catch { /* ignore */ }
}

const safeFileName = (n: string) => (n || "exam").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80);

export default function Exporter({ exam, open, onClose }: { exam: Exam; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [cfg, setCfg] = useState<PdfConfig>(() => {
    const saved = loadSavedDefault();
    return { ...DEFAULT_CFG, ...(saved || {}), title: exam.title, subtitle: exam.subject || "" };
  });
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    if (!open) return;
    const saved = loadSavedDefault();
    setCfg((c) => ({ ...DEFAULT_CFG, ...(saved || {}), ...c, title: exam.title, subtitle: exam.subject || c.subtitle }));
  }, [open, exam.id, exam.title, exam.subject]);

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
      await printExam(exam, cfg, setProgress);
      toast({
        title: "প্রিন্ট ডায়ালগ খুলেছে ✅",
        description: 'গন্তব্য থেকে "Save as PDF" বেছে নিন — ভেক্টর কোয়ালিটি, ছোট ফাইল।',
      });
    } catch (err: unknown) {
      console.error("PDF gen error", err);
      toast({ title: "PDF তৈরিতে ত্রুটি", description: errorMessage(err), variant: "destructive" });
    } finally { setGenerating(false); setProgress(""); }
  };

  if (!open) return null;
  const busy = generating;

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm overflow-y-auto p-2 md:p-5">
      <div className="min-h-[calc(100vh-1rem)] flex items-start justify-center">
        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden my-2 border border-border">
          <div className="flex items-start justify-between gap-3 p-4 md:p-5 border-b border-border shrink-0">
            <div>
              <h2 className="font-bold text-lg flex items-center gap-2"><Settings2 size={18} /> PDF এক্সপোর্ট</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">এক ক্লিকে ডাউনলোড • Bengali font • KaTeX math • Auto pagination</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg" aria-label="বন্ধ করুন"><X size={16} /></button>
          </div>

          <div className="min-h-[calc(100vh-8rem)]">
            <div className="p-4 md:p-5 space-y-5 max-h-[calc(100vh-8rem)] overflow-y-auto">
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
                <div className="mt-2">
                  <label className="text-xs text-muted-foreground">আউটপুট ফরম্যাট</label>
                  <select value={cfg.outputFormat} onChange={(e) => updateCfg("outputFormat", e.target.value as "png" | "jpeg")}
                    className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <option value="png">PNG — সর্বোচ্চ শার্প (zoom-এ ফাটে না)</option>
                    <option value="jpeg">JPEG — হালকা ফাইল</option>
                  </select>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">PNG + scale ৩ = জুমেও তীক্ষ্ণ। ছোট ফাইল চাইলে JPEG বাছুন।</p>
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
                  <Toggle label="হেডার শুধু ১ম পৃষ্ঠায়" checked={cfg.headerFirstPageOnly} onChange={(v) => updateCfg("headerFirstPageOnly", v)} />
                  <Toggle label="লোগো ওয়াটারমার্ক" checked={cfg.showWatermark} onChange={(v) => updateCfg("showWatermark", v)} />
                </div>
                {cfg.showWatermark && (
                  <div className="grid sm:grid-cols-2 gap-3 mt-3">
                    <NumberInput label="ওয়াটারমার্ক opacity" value={cfg.watermarkOpacity} min={0.02} max={0.25} step={0.01} onChange={(v) => updateCfg("watermarkOpacity", v)} />
                    <NumberInput label="ওয়াটারমার্ক সাইজ %" value={cfg.watermarkSize} min={20} max={80} step={1} onChange={(v) => updateCfg("watermarkSize", v)} />
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-xs font-bold mb-2">ফুটার (বাম / মাঝ / ডান)</h3>
                <div className="grid gap-2">
                  {(["left", "center", "right"] as const).map((p) => (
                    <SlotEditor key={p} slot={cfg.footer[p]} label={p === "left" ? "বাম" : p === "center" ? "মাঝ" : "ডান"} onText={(v) => updateFooter(p, "text", v)} onLink={(v) => updateFooter(p, "link", v)} />
                  ))}
                </div>
              </section>

              <div className="sticky bottom-0 bg-card pt-2 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { saveDefault(cfg); toast({ title: "ডিফল্ট সেভ হয়েছে ✅", description: "পরের বার এটাই অটো-লোড হবে" }); }}
                    className="py-2 rounded-lg border border-border text-[11px] font-semibold flex items-center justify-center gap-1 hover:bg-muted">
                    <Save size={13} /> ডিফল্ট সেভ
                  </button>
                  <button
                    onClick={() => {
                      const saved = loadSavedDefault();
                      if (!saved) { toast({ title: "কোনো সেভ করা ডিফল্ট নেই", variant: "destructive" }); return; }
                      setCfg({ ...DEFAULT_CFG, ...saved, title: cfg.title, subtitle: cfg.subtitle });
                      toast({ title: "সেভ করা ডিফল্ট লোড হয়েছে" });
                    }}
                    className="py-2 rounded-lg border border-border text-[11px] font-semibold flex items-center justify-center gap-1 hover:bg-muted">
                    <RefreshCcw size={13} /> ডিফল্ট লোড
                  </button>
                  <button
                    onClick={() => { clearSavedDefault(); setCfg({ ...DEFAULT_CFG, title: cfg.title, subtitle: cfg.subtitle }); toast({ title: "ফ্যাক্টরি রিসেট হয়েছে" }); }}
                    className="py-2 rounded-lg border border-border text-[11px] font-semibold flex items-center justify-center gap-1 hover:bg-muted">
                    <RotateCcw size={13} /> রিসেট
                  </button>
                </div>
                <button onClick={downloadPdf} disabled={busy} className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {generating ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                  {generating ? progress || "তৈরি হচ্ছে..." : "এক ক্লিকে PDF ডাউনলোড"}
                </button>
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
