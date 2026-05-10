import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Document, Page, View, Text, Image as PdfImage, StyleSheet, Font, pdf, Link } from "@react-pdf/renderer";
import katex from "katex";
import html2canvas from "html2canvas";
import "katex/dist/katex.min.css";
import "katex/dist/contrib/mhchem.mjs";
import { Download, Eye, Image as ImageIcon, Loader2, Link as LinkIcon, RefreshCcw, Settings2, X } from "lucide-react";
import type { Exam, Question } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { resolveCorrectOptionText } from "@/lib/answerUtils";

const FONT_BASE = "https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io@main/fonts/NotoSansBengali/hinted/ttf";
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const BN_OPT = ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ"];
const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => BN_DIGITS[+d]);

let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: "NotoBengali",
    fonts: [
      { src: `${FONT_BASE}/NotoSansBengali-Regular.ttf`, fontWeight: 400 },
      { src: `${FONT_BASE}/NotoSansBengali-SemiBold.ttf`, fontWeight: 600 },
      { src: `${FONT_BASE}/NotoSansBengali-Bold.ttf`, fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

type MathPiece = { url: string; w: number; h: number };
const mathCache = new Map<string, MathPiece>();

async function renderMathToImage(latex: string, display: boolean): Promise<MathPiece | null> {
  const key = `${display ? "D" : "I"}|${latex}`;
  const cached = mathCache.get(key);
  if (cached) return cached;

  try {
    const html = katex.renderToString(latex, {
      displayMode: display,
      throwOnError: false,
      output: "html",
      strict: false,
      trust: true,
    });
    const host = document.createElement("div");
    host.style.cssText =
      "position:fixed;left:-30000px;top:0;background:transparent;font-size:18px;line-height:1.2;color:#0f172a;padding:3px;";
    host.innerHTML = html;
    document.body.appendChild(host);
    try {
      await (document as any).fonts?.ready;
    } catch {}
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const target = host.firstElementChild as HTMLElement | null;
    if (!target) {
      host.remove();
      return null;
    }
    const canvas = await html2canvas(target, { scale: 3, backgroundColor: null, logging: false, useCORS: true });
    const url = canvas.toDataURL("image/png");
    const piece = { url, w: canvas.width / 3, h: canvas.height / 3 };
    host.remove();
    mathCache.set(key, piece);
    return piece;
  } catch {
    return null;
  }
}

type Seg = { kind: "text"; value: string } | { kind: "math"; latex: string; display: boolean };

function tokenize(input: string): Seg[] {
  if (!input) return [];
  const out: Seg[] = [];
  const re = /(\$\$([\s\S]+?)\$\$)|(\\\[([\s\S]+?)\\\])|(\\\(([\s\S]+?)\\\))|(\$([^\$\n]+?)\$)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    if (m.index > last) out.push({ kind: "text", value: input.slice(last, m.index) });
    if (m[2] != null) out.push({ kind: "math", latex: m[2], display: true });
    else if (m[4] != null) out.push({ kind: "math", latex: m[4], display: true });
    else if (m[6] != null) out.push({ kind: "math", latex: m[6], display: false });
    else if (m[8] != null) out.push({ kind: "math", latex: m[8], display: false });
    last = m.index + m[0].length;
  }
  if (last < input.length) out.push({ kind: "text", value: input.slice(last) });
  return out;
}

function collectMath(exam: Exam) {
  const set = new Map<string, { latex: string; display: boolean }>();
  const scan = (s?: string) => {
    if (!s) return;
    for (const t of tokenize(s)) {
      if (t.kind !== "math") continue;
      const key = `${t.display ? "D" : "I"}|${t.latex}`;
      if (!set.has(key)) set.set(key, { latex: t.latex, display: t.display });
    }
  };
  exam.questions.forEach((q) => {
    scan(q.question);
    q.options?.forEach(scan);
    scan(q.answer);
    scan(q.explanation);
  });
  return [...set.values()];
}

interface Slot {
  text: string;
  link: string;
}

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
  footer: { left: Slot; center: Slot; right: Slot };
}

type IndexedQuestion = { q: Question; idx: number; h: number };
type PdfPageData = { left: IndexedQuestion[]; right: IndexedQuestion[] };

const styles = StyleSheet.create({
  page: { fontFamily: "NotoBengali", color: "#0f172a" },
  title: { textAlign: "center", fontWeight: 700 },
  subtitle: { textAlign: "center", color: "#475569" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1.1, borderBottomWidth: 1.1 },
  body: { flexDirection: "row", flexGrow: 1 },
  col: { flex: 1, flexDirection: "column" },
  divider: { width: 0.7, alignSelf: "stretch" },
  qBlock: { flexDirection: "column" },
  qLineRow: { flexDirection: "row", alignItems: "flex-start" },
  qNum: { fontWeight: 700, minWidth: 17, paddingRight: 3 },
  qTextWrap: { flex: 1 },
  optionRows: { paddingLeft: 17 },
  optionRow: { flexDirection: "row", alignItems: "flex-start" },
  optionCell: { width: "50%", flexDirection: "row", alignItems: "flex-start" },
  optionLabel: { width: 18, fontWeight: 700, color: "#334155" },
  optionContent: { flex: 1, paddingRight: 4 },
  answerBox: { borderWidth: 0.65, borderRadius: 3.5 },
  footer: { position: "absolute", flexDirection: "row", borderTopWidth: 0.6 },
  inline: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
});

function mathKey(latex: string, display: boolean) {
  return `${display ? "D" : "I"}|${latex}`;
}

function visualUnits(text: string) {
  let units = 0;
  for (const ch of text) {
    if (ch === "\n") continue;
    if (/\s/.test(ch)) units += 0.35;
    else if (/[\u0980-\u09FF]/.test(ch)) units += 0.96;
    else if (/[A-Z]/.test(ch)) units += 0.72;
    else if (/[a-z0-9]/.test(ch)) units += 0.55;
    else units += 0.44;
  }
  return units;
}

function estimateLines(text: string | undefined, width: number, fontSize: number, mathMap?: Map<string, MathPiece>) {
  if (!text) return 1;
  const capacity = Math.max(8, width / (fontSize * 0.52));
  let total = 0;
  for (const rawLine of String(text).split(/\n/)) {
    const segs = tokenize(rawLine);
    let lineUnits = 0;
    let displayLines = 0;
    for (const seg of segs.length ? segs : [{ kind: "text", value: rawLine } as Seg]) {
      if (seg.kind === "text") lineUnits += visualUnits(seg.value);
      else if (seg.display) displayLines += Math.max(1.5, (mathMap?.get(mathKey(seg.latex, true))?.h || 24) / (fontSize * 0.75));
      else lineUnits += Math.max(4, visualUnits(seg.latex) * 0.7);
    }
    total += Math.max(1, Math.ceil(lineUnits / capacity)) + displayLines;
  }
  return Math.max(1, Math.ceil(total));
}

function estimateQuestionHeight(q: Question, cfg: PdfConfig, colWidth: number, mathMap: Map<string, MathPiece>) {
  const qLineH = cfg.questionFontSize * cfg.lineHeight;
  const optLineH = cfg.optionFontSize * cfg.lineHeight;
  const bodyW = Math.max(80, colWidth - 18);
  let h = estimateLines(q.question, bodyW, cfg.questionFontSize, mathMap) * qLineH;

  if (cfg.showQuestionImages && q.questionImage) h += 72;

  const optionRows = Math.ceil((q.options?.length || 0) / 2);
  for (let row = 0; row < optionRows; row++) {
    const left = q.options[row * 2] || "";
    const right = q.options[row * 2 + 1] || "";
    const cellW = Math.max(55, (bodyW - 4) / 2 - 18);
    const leftH = estimateLines(left, cellW, cfg.optionFontSize, mathMap) * optLineH;
    const rightH = estimateLines(right, cellW, cfg.optionFontSize, mathMap) * optLineH;
    let rowH = Math.max(leftH, rightH, optLineH) + cfg.optionGap;
    if (cfg.showOptionImages && (q.optionImages?.[row * 2] || q.optionImages?.[row * 2 + 1])) rowH += 38;
    h += rowH;
  }

  const correct = resolveCorrectOptionText(q);
  if (cfg.showAnswers || (cfg.showExplanations && q.explanation)) {
    h += 9;
    if (cfg.showAnswers) h += estimateLines(correct || "—", bodyW - 48, cfg.optionFontSize, mathMap) * optLineH;
    if (cfg.showExplanations && q.explanation) h += estimateLines(q.explanation, bodyW - 44, cfg.optionFontSize, mathMap) * optLineH + 2;
  }

  return Math.ceil(h + cfg.questionGap + 3);
}

function paginateQuestions(exam: Exam, cfg: PdfConfig, mathMap: Map<string, MathPiece>) {
  const contentW = PAGE_W - cfg.pageMargin * 2;
  const colWidth = cfg.twoColumn ? (contentW - cfg.columnGap - 0.7) / 2 : contentW;
  const logoH = cfg.showLogo && cfg.logoDataUrl ? cfg.logoHeight + 4 : 0;
  const headerH = logoH + 26 + (cfg.subtitle ? 14 : 2) + (cfg.showMeta ? 24 : 4);
  const footerH = cfg.showFooter ? 27 : 8;
  const bodyH = PAGE_H - cfg.pageMargin * 2 - headerH - footerH;
  const pages: PdfPageData[] = [];
  let current: PdfPageData = { left: [], right: [] };
  let leftH = 0;
  let rightH = 0;

  const pushPage = () => {
    if (current.left.length || current.right.length) pages.push(current);
    current = { left: [], right: [] };
    leftH = 0;
    rightH = 0;
  };

  exam.questions.forEach((q, idx) => {
    const h = estimateQuestionHeight(q, cfg, colWidth, mathMap);
    const item = { q, idx, h };

    if (!cfg.twoColumn) {
      if (leftH + h > bodyH && current.left.length) pushPage();
      current.left.push(item);
      leftH += h;
      return;
    }

    if (leftH + h <= bodyH || current.left.length === 0) {
      current.left.push(item);
      leftH += h;
      return;
    }
    if (rightH + h <= bodyH || current.right.length === 0) {
      current.right.push(item);
      rightH += h;
      return;
    }
    pushPage();
    current.left.push(item);
    leftH = h;
  });

  pushPage();
  return { pages: pages.length ? pages : [{ left: [], right: [] }], bodyH };
}

const PdfInline = ({
  text,
  mathMap,
  baseStyle,
  mathHeight,
  maxWidth,
}: {
  text: string;
  mathMap: Map<string, MathPiece>;
  baseStyle: any;
  mathHeight: number;
  maxWidth: number;
}) => {
  const segs = tokenize(text || "");
  if (segs.length === 0) return <Text style={baseStyle}>{text || ""}</Text>;
  if (segs.length === 1 && segs[0].kind === "text") return <Text style={baseStyle}>{segs[0].value}</Text>;

  return (
    <View style={styles.inline}>
      {segs.map((seg, i) => {
        if (seg.kind === "text") return <Text key={i} style={baseStyle}>{seg.value}</Text>;
        const piece = mathMap.get(mathKey(seg.latex, seg.display));
        if (!piece) return <Text key={i} style={baseStyle}>{`$${seg.latex}$`}</Text>;
        const naturalH = seg.display ? mathHeight * 1.55 : mathHeight;
        const naturalW = (piece.w / Math.max(1, piece.h)) * naturalH;
        const w = Math.min(maxWidth * (seg.display ? 0.92 : 0.7), naturalW);
        const h = (piece.h / Math.max(1, piece.w)) * w;
        if (seg.display) {
          return (
            <View key={i} style={{ width: "100%", alignItems: "center", marginVertical: 1.5 }}>
              <PdfImage src={piece.url} style={{ width: w, height: h }} />
            </View>
          );
        }
        return <PdfImage key={i} src={piece.url} style={{ width: w, height: h, marginHorizontal: 1, marginTop: 0.5 }} />;
      })}
    </View>
  );
};

function PdfSlot({ slot, style }: { slot: Slot; style: any }) {
  if (!slot.text) return null;
  if (slot.link) return <Link src={slot.link} style={style}>{slot.text}</Link>;
  return <Text style={style}>{slot.text}</Text>;
}

function QBlock({ item, cfg, mathMap, colWidth }: { item: IndexedQuestion; cfg: PdfConfig; mathMap: Map<string, MathPiece>; colWidth: number }) {
  const { q, idx } = item;
  const correct = resolveCorrectOptionText(q);
  const correctIdx = q.options.findIndex((o) => o === correct);
  const correctLbl = correctIdx >= 0 ? BN_OPT[correctIdx] || `${correctIdx + 1}` : "";
  const qStyle = { fontSize: cfg.questionFontSize, lineHeight: cfg.lineHeight, color: "#0f172a", fontWeight: 700 as const };
  const optStyle = { fontSize: cfg.optionFontSize, lineHeight: cfg.lineHeight, color: "#1f2937" };
  const answerStyle = { fontSize: cfg.optionFontSize, lineHeight: cfg.lineHeight, color: cfg.primaryColor, fontWeight: 700 as const };
  const expStyle = { fontSize: cfg.optionFontSize, lineHeight: cfg.lineHeight, color: "#334155" };

  return (
    <View style={[styles.qBlock, { marginBottom: cfg.questionGap }]} wrap={false}>
      <View style={styles.qLineRow}>
        <Text style={[styles.qNum, { fontSize: cfg.questionFontSize, lineHeight: cfg.lineHeight, color: cfg.primaryColor }]}>{toBn(idx + 1)}.</Text>
        <View style={styles.qTextWrap}>
          <PdfInline text={q.question} mathMap={mathMap} baseStyle={qStyle} mathHeight={cfg.questionFontSize + 2} maxWidth={colWidth - 20} />
          {cfg.showQuestionImages && q.questionImage ? (
            <PdfImage src={q.questionImage} style={{ width: Math.min(colWidth - 24, 180), maxHeight: 68, objectFit: "contain", marginTop: 3 }} />
          ) : null}
        </View>
      </View>

      <View style={[styles.optionRows, { marginTop: 2 }]}>
        {Array.from({ length: Math.ceil((q.options?.length || 0) / 2) }).map((_, row) => (
          <View key={row} style={[styles.optionRow, { marginTop: row === 0 ? 0 : cfg.optionGap }]}>
            {[0, 1].map((offset) => {
              const i = row * 2 + offset;
              const opt = q.options?.[i];
              if (opt == null) return <View key={offset} style={styles.optionCell} />;
              return (
                <View key={offset} style={styles.optionCell}>
                  <Text style={[styles.optionLabel, { fontSize: cfg.optionFontSize, lineHeight: cfg.lineHeight, color: cfg.primaryColor }]}>{BN_OPT[i] || toBn(i + 1)}.</Text>
                  <View style={styles.optionContent}>
                    <PdfInline text={opt} mathMap={mathMap} baseStyle={optStyle} mathHeight={cfg.optionFontSize + 1} maxWidth={(colWidth - 44) / 2} />
                    {cfg.showOptionImages && q.optionImages?.[i] ? (
                      <PdfImage src={q.optionImages[i] || ""} style={{ width: Math.min((colWidth - 48) / 2, 84), maxHeight: 34, objectFit: "contain", marginTop: 2 }} />
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {(cfg.showAnswers || (cfg.showExplanations && q.explanation)) && (
        <View style={[styles.answerBox, { marginLeft: 17, marginTop: 4, padding: 4.5, backgroundColor: cfg.answerBg, borderColor: cfg.borderColor }]}>
          {cfg.showAnswers && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
              <Text style={answerStyle}>সঠিক উত্তর: {correctLbl ? `${correctLbl}. ` : ""}</Text>
              <PdfInline text={correct || "—"} mathMap={mathMap} baseStyle={answerStyle} mathHeight={cfg.optionFontSize + 1} maxWidth={colWidth - 75} />
            </View>
          )}
          {cfg.showExplanations && q.explanation && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: cfg.showAnswers ? 1.5 : 0 }}>
              <Text style={answerStyle}>ব্যাখ্যা: </Text>
              <PdfInline text={q.explanation} mathMap={mathMap} baseStyle={expStyle} mathHeight={cfg.optionFontSize + 1} maxWidth={colWidth - 72} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function ExamPdfDoc({ exam, cfg, mathMap }: { exam: Exam; cfg: PdfConfig; mathMap: Map<string, MathPiece> }) {
  const { pages, bodyH } = paginateQuestions(exam, cfg, mathMap);
  const marks = cfg.marksOverride.trim() || String(exam.questions.length);
  const contentW = PAGE_W - cfg.pageMargin * 2;
  const colWidth = cfg.twoColumn ? (contentW - cfg.columnGap - 0.7) / 2 : contentW;

  return (
    <Document title={cfg.title || exam.title} author="Lovable PDF Exporter">
      {pages.map((pg, pageIdx) => (
        <Page key={pageIdx} size="A4" style={[styles.page, { padding: cfg.pageMargin, fontSize: cfg.baseFontSize, lineHeight: cfg.lineHeight }]}>
          <View>
            {cfg.showLogo && cfg.logoDataUrl ? (
              <PdfImage src={cfg.logoDataUrl} style={{ height: cfg.logoHeight, alignSelf: "center", objectFit: "contain", marginBottom: 3 }} />
            ) : null}
            <Text style={[styles.title, { fontSize: cfg.questionFontSize + 8, color: cfg.primaryColor }]}>{cfg.title || exam.title}</Text>
            {cfg.subtitle ? <Text style={[styles.subtitle, { fontSize: cfg.baseFontSize + 0.5, marginTop: 1 }]}>{cfg.subtitle}</Text> : null}
            {cfg.showMeta ? (
              <View style={[styles.metaRow, { borderColor: cfg.primaryColor, paddingVertical: 4, marginTop: 6, fontSize: cfg.baseFontSize, color: cfg.primaryColor }]}>
                <Text>পূর্ণমান: {toBn(marks)}</Text>
                <Text>সেট: {cfg.setLabel || "—"}</Text>
                <Text>সময়: {toBn(exam.duration)} মিনিট</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.body, { height: bodyH, marginTop: 8 }]}>
            <View style={styles.col}>
              {pg.left.map((item) => <QBlock key={item.q.id || `l-${pageIdx}-${item.idx}`} item={item} cfg={cfg} mathMap={mathMap} colWidth={colWidth} />)}
            </View>
            {cfg.twoColumn ? (
              <>
                <View style={[styles.divider, { backgroundColor: cfg.borderColor, marginHorizontal: cfg.columnGap / 2 }]} />
                <View style={styles.col}>
                  {pg.right.map((item) => <QBlock key={item.q.id || `r-${pageIdx}-${item.idx}`} item={item} cfg={cfg} mathMap={mathMap} colWidth={colWidth} />)}
                </View>
              </>
            ) : null}
          </View>

          {cfg.showFooter ? (
            <View style={[styles.footer, { left: cfg.pageMargin, right: cfg.pageMargin, bottom: Math.max(10, cfg.pageMargin / 2), borderColor: cfg.borderColor, paddingTop: 4, fontSize: Math.max(7.5, cfg.baseFontSize - 1), color: "#475569" }]} fixed>
              <View style={{ flex: 1, paddingRight: 4 }}><PdfSlot slot={cfg.footer.left} style={{ color: cfg.primaryColor }} /></View>
              <View style={{ flex: 1.2, alignItems: "center", paddingHorizontal: 4 }}><PdfSlot slot={cfg.footer.center} style={{ color: cfg.primaryColor }} /></View>
              <View style={{ flex: 1, alignItems: "flex-end", paddingLeft: 4 }}>
                <PdfSlot slot={cfg.footer.right} style={{ color: cfg.primaryColor }} />
                {cfg.showPageNumbers ? <Text render={({ pageNumber, totalPages }) => `পৃষ্ঠা ${toBn(pageNumber)} / ${toBn(totalPages)}`} /> : null}
              </View>
            </View>
          ) : null}
        </Page>
      ))}
    </Document>
  );
}

const emptySlot = (): Slot => ({ text: "", link: "" });
const DEFAULT_CFG: PdfConfig = {
  title: "",
  subtitle: "",
  logoDataUrl: "",
  logoHeight: 28,
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
  baseFontSize: 9.2,
  questionFontSize: 9.6,
  optionFontSize: 8.9,
  lineHeight: 1.42,
  pageMargin: 30,
  columnGap: 14,
  questionGap: 6,
  optionGap: 2.2,
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
    if (f.size > 1024 * 1024) {
      toast({ title: "লোগো ১MB এর মধ্যে হতে হবে", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCfg((c) => ({ ...c, logoDataUrl: String(reader.result || "") }));
    reader.readAsDataURL(f);
  };

  const buildBlob = async () => {
    if (!questionCount) throw new Error("প্রশ্ন নেই");
    ensureFonts();
    const mathItems = collectMath(exam);
    const mathMap = new Map<string, MathPiece>();
    if (mathItems.length) setProgress(`LaTeX প্রস্তুত... ০/${toBn(mathItems.length)}`);
    for (let i = 0; i < mathItems.length; i++) {
      const item = mathItems[i];
      const piece = await renderMathToImage(item.latex, item.display);
      if (piece) mathMap.set(mathKey(item.latex, item.display), piece);
      setProgress(`LaTeX প্রস্তুত... ${toBn(i + 1)}/${toBn(mathItems.length)}`);
    }
    setProgress("PDF layout সাজানো হচ্ছে...");
    return pdf(<ExamPdfDoc exam={exam} cfg={cfg} mathMap={mathMap} />).toBlob();
  };

  const downloadPdf = async () => {
    setGenerating(true);
    try {
      const blob = await buildBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeFileName(cfg.title || exam.title)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast({ title: `PDF তৈরি হয়েছে ✅`, description: `সাইজ: ${(blob.size / 1024).toFixed(0)} KB` });
    } catch (err: any) {
      console.error("PDF gen error", err);
      toast({ title: "PDF তৈরিতে ত্রুটি", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setGenerating(false);
      setProgress("");
    }
  };

  const previewPdf = async () => {
    setPreviewing(true);
    try {
      const blob = await buildBlob();
      const nextUrl = URL.createObjectURL(blob);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = nextUrl;
      setPreviewUrl(nextUrl);
      toast({ title: "প্রিভিউ প্রস্তুত ✅", description: `সাইজ: ${(blob.size / 1024).toFixed(0)} KB` });
    } catch (err: any) {
      console.error("PDF preview error", err);
      toast({ title: "প্রিভিউ তৈরিতে ত্রুটি", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setPreviewing(false);
      setProgress("");
    }
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
              <p className="text-[11px] text-muted-foreground mt-0.5">Vector text • Noto Sans Bengali • Auto height pagination • Live preview</p>
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
                <NumberInput label="লোগো উচ্চতা" value={cfg.logoHeight} min={16} max={60} step={1} onChange={(v) => updateCfg("logoHeight", v)} />
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
                  <NumberInput label="পেজ মার্জিন" value={cfg.pageMargin} min={20} max={48} step={1} onChange={(v) => updateCfg("pageMargin", v)} />
                  <NumberInput label="কলাম gap" value={cfg.columnGap} min={8} max={24} step={1} onChange={(v) => updateCfg("columnGap", v)} />
                  <NumberInput label="প্রশ্ন gap" value={cfg.questionGap} min={2} max={14} step={0.5} onChange={(v) => updateCfg("questionGap", v)} />
                  <NumberInput label="অপশন gap" value={cfg.optionGap} min={1} max={8} step={0.5} onChange={(v) => updateCfg("optionGap", v)} />
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold mb-2">ফন্ট ও রঙ</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <NumberInput label="বেস ফন্ট" value={cfg.baseFontSize} min={7.5} max={12} step={0.1} onChange={(v) => updateCfg("baseFontSize", v)} />
                  <NumberInput label="প্রশ্ন ফন্ট" value={cfg.questionFontSize} min={8} max={14} step={0.1} onChange={(v) => updateCfg("questionFontSize", v)} />
                  <NumberInput label="অপশন ফন্ট" value={cfg.optionFontSize} min={7.5} max={12} step={0.1} onChange={(v) => updateCfg("optionFontSize", v)} />
                  <NumberInput label="লাইন height" value={cfg.lineHeight} min={1.2} max={1.75} step={0.01} onChange={(v) => updateCfg("lineHeight", v)} />
                  <ColorInput label="প্রাইমারি" value={cfg.primaryColor} onChange={(v) => updateCfg("primaryColor", v)} />
                  <ColorInput label="উত্তর বক্স" value={cfg.answerBg} onChange={(v) => updateCfg("answerBg", v)} />
                  <ColorInput label="বর্ডার" value={cfg.borderColor} onChange={(v) => updateCfg("borderColor", v)} />
                </div>
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
                    <p className="text-sm font-semibold text-foreground">প্রিভিউ আবার ফিরিয়ে দেওয়া হয়েছে</p>
                    <p className="text-xs mt-1 max-w-sm">সেটিংস বদলানোর পর “প্রিভিউ” চাপলে একই vector PDF আগে দেখে তারপর ডাউনলোড করতে পারবেন।</p>
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
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))}
        className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
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
