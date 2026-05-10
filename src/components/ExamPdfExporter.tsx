import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Document, Page, View, Text, Image as PdfImage, StyleSheet, Font, pdf, Link,
} from "@react-pdf/renderer";
import katex from "katex";
import html2canvas from "html2canvas";
import { Download, X, Image as ImageIcon, Loader2, Link as LinkIcon } from "lucide-react";
import type { Exam, Question } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { resolveCorrectOptionText } from "@/lib/answerUtils";

// --------------------------------------------------------------
// 1) FONT REGISTRATION — Noto Sans Bengali (true vector, embedded)
// --------------------------------------------------------------
const FONT_BASE =
  "https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io@main/fonts/NotoSansBengali/hinted/ttf";

let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: "NotoBengali",
    fonts: [
      { src: `${FONT_BASE}/NotoSansBengali-Regular.ttf`, fontWeight: 400 },
      { src: `${FONT_BASE}/NotoSansBengali-Medium.ttf`, fontWeight: 500 },
      { src: `${FONT_BASE}/NotoSansBengali-SemiBold.ttf`, fontWeight: 600 },
      { src: `${FONT_BASE}/NotoSansBengali-Bold.ttf`, fontWeight: 700 },
      { src: `${FONT_BASE}/NotoSansBengali-Black.ttf`, fontWeight: 900 },
    ],
  });
  // Disable hyphenation — Bengali shouldn't break mid-word
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

// --------------------------------------------------------------
// 2) LATEX → high-res transparent PNG (rendered once, cached)
// --------------------------------------------------------------
type MathPiece = { url: string; w: number; h: number };
const mathCache = new Map<string, MathPiece>();

async function renderMathToImage(latex: string, display: boolean): Promise<MathPiece | null> {
  const key = (display ? "D|" : "I|") + latex;
  const cached = mathCache.get(key);
  if (cached) return cached;
  try {
    const html = katex.renderToString(latex, { displayMode: display, throwOnError: false, output: "html" });
    const host = document.createElement("div");
    host.style.cssText =
      "position:fixed;left:-30000px;top:0;background:transparent;font-size:18px;line-height:1.2;color:#0f172a;padding:4px;";
    host.innerHTML = html;
    document.body.appendChild(host);
    // Wait for KaTeX fonts
    try { await (document as any).fonts?.ready; } catch {}
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const target = host.firstElementChild as HTMLElement | null;
    if (!target) { host.remove(); return null; }
    const canvas = await html2canvas(target, { scale: 4, backgroundColor: null, logging: false });
    const url = canvas.toDataURL("image/png");
    const piece: MathPiece = { url, w: canvas.width / 4, h: canvas.height / 4 };
    host.remove();
    mathCache.set(key, piece);
    return piece;
  } catch {
    return null;
  }
}

// --------------------------------------------------------------
// 3) Tokenize text into mixed text + math segments
// --------------------------------------------------------------
type Seg = { kind: "text"; value: string } | { kind: "math"; latex: string; display: boolean };

function tokenize(input: string): Seg[] {
  if (!input) return [];
  const out: Seg[] = [];
  // order matters: $$ before $, \[ \( before plain
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

function collectMath(exam: Exam): Array<{ latex: string; display: boolean }> {
  const set = new Map<string, { latex: string; display: boolean }>();
  const scan = (s?: string) => {
    if (!s) return;
    for (const t of tokenize(s)) if (t.kind === "math") {
      const k = (t.display ? "D|" : "I|") + t.latex;
      if (!set.has(k)) set.set(k, { latex: t.latex, display: t.display });
    }
  };
  exam.questions.forEach((q) => {
    scan(q.question);
    q.options?.forEach(scan);
    scan(q.explanation);
  });
  return [...set.values()];
}

// --------------------------------------------------------------
// 4) PDF document
// --------------------------------------------------------------
const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => BN_DIGITS[+d]);
const BN_OPT = ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ"];

interface Slot { text: string; link: string }
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
  footer: { left: Slot; center: Slot; right: Slot };
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 28, paddingBottom: 28, paddingHorizontal: 32,
    fontFamily: "NotoBengali", fontSize: 9.5, color: "#0f172a", lineHeight: 1.45,
  },
  title: { fontSize: 18, fontWeight: 900, textAlign: "center", color: "#0f172a" },
  subtitle: { fontSize: 10, textAlign: "center", color: "#475569", marginTop: 1 },
  metaRow: {
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 1.2, borderBottomWidth: 1.2, borderColor: "#0f172a",
    paddingVertical: 4, marginTop: 6, fontSize: 9.5, fontWeight: 600,
  },
  body: { marginTop: 8, flexDirection: "row", flexGrow: 1, gap: 14 },
  col: { flex: 1, flexDirection: "column" },
  colDivider: { width: 0.6, backgroundColor: "#cbd5e1" },
  qBlock: { marginBottom: 7 },
  qLineRow: { flexDirection: "row", alignItems: "flex-start" },
  qNum: { fontWeight: 800, fontSize: 9.5, color: "#0f172a", marginRight: 3 },
  qText: { fontWeight: 700, fontSize: 9.5, color: "#0f172a", flex: 1 },
  optGrid: { marginTop: 2, paddingLeft: 14, flexDirection: "row", flexWrap: "wrap" },
  optCell: { width: "50%", flexDirection: "row", paddingRight: 6, marginTop: 1 },
  optLabel: { fontWeight: 600, fontSize: 9, color: "#334155", marginRight: 2 },
  optText: { fontSize: 9, color: "#1f2937", flex: 1 },
  ansBox: {
    marginTop: 4, padding: 5,
    backgroundColor: "#eaf3fb",
    borderWidth: 0.6, borderColor: "#bcd4e6", borderRadius: 4,
  },
  ansLine: { fontSize: 9, color: "#1e3a8a", fontWeight: 700 },
  expLine: { fontSize: 9, color: "#334155", marginTop: 1 },
  footer: {
    position: "absolute", bottom: 14, left: 32, right: 32,
    borderTopWidth: 0.6, borderColor: "#cbd5e1", paddingTop: 4,
    flexDirection: "row", justifyContent: "space-between", fontSize: 8.5, color: "#475569",
  },
  inline: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
});

// Mixed text + math inline renderer
const Inline = ({
  text, mathMap, baseStyle, mathHeight,
}: { text: string; mathMap: Map<string, MathPiece>; baseStyle: any; mathHeight: number }) => {
  const segs = tokenize(text || "");
  if (segs.length === 0) return <Text style={baseStyle}>{text || ""}</Text>;
  if (segs.length === 1 && segs[0].kind === "text") return <Text style={baseStyle}>{segs[0].value}</Text>;
  return (
    <View style={styles.inline}>
      {segs.map((s, i) => {
        if (s.kind === "text") return <Text key={i} style={baseStyle}>{s.value}</Text>;
        const piece = mathMap.get((s.display ? "D|" : "I|") + s.latex);
        if (!piece) return <Text key={i} style={baseStyle}>{`$${s.latex}$`}</Text>;
        const h = s.display ? mathHeight * 1.4 : mathHeight;
        const w = (piece.w / piece.h) * h;
        return <PdfImage key={i} src={piece.url} style={{ width: w, height: h, marginHorizontal: 1 }} />;
      })}
    </View>
  );
};

const QBlock = ({
  q, idx, cfg, mathMap,
}: { q: Question; idx: number; cfg: PdfConfig; mathMap: Map<string, MathPiece> }) => {
  const correct = resolveCorrectOptionText(q);
  const correctIdx = q.options.findIndex((o) => o === correct);
  const correctLbl = correctIdx >= 0 ? BN_OPT[correctIdx] || `${correctIdx + 1}` : "";
  return (
    <View style={styles.qBlock} wrap={false}>
      <View style={styles.qLineRow}>
        <Text style={styles.qNum}>{toBn(idx + 1)}.</Text>
        <View style={{ flex: 1 }}>
          <Inline text={q.question} mathMap={mathMap} baseStyle={styles.qText} mathHeight={11} />
        </View>
      </View>
      <View style={styles.optGrid}>
        {q.options.map((opt, i) => (
          <View key={i} style={styles.optCell}>
            <Text style={styles.optLabel}>{BN_OPT[i] || i + 1})</Text>
            <View style={{ flex: 1 }}>
              <Inline text={opt} mathMap={mathMap} baseStyle={styles.optText} mathHeight={10} />
            </View>
          </View>
        ))}
      </View>
      {(cfg.showAnswers || (cfg.showExplanations && q.explanation)) && (
        <View style={styles.ansBox}>
          {cfg.showAnswers && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
              <Text style={styles.ansLine}>সঠিক উত্তর: </Text>
              <Text style={styles.ansLine}>{correctLbl ? `${correctLbl}) ` : ""}</Text>
              <Inline text={correct || "—"} mathMap={mathMap} baseStyle={styles.ansLine} mathHeight={10} />
            </View>
          )}
          {cfg.showExplanations && q.explanation && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: cfg.showAnswers ? 1 : 0 }}>
              <Text style={[styles.ansLine, { marginRight: 2 }]}>ব্যাখ্যা:</Text>
              <Inline text={q.explanation} mathMap={mathMap} baseStyle={styles.expLine} mathHeight={10} />
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const ExamPdfDoc = ({
  exam, cfg, mathMap,
}: { exam: Exam; cfg: PdfConfig; mathMap: Map<string, MathPiece> }) => {
  const marks = cfg.marksOverride.trim() || String(exam.questions.length);
  // Pre-chunk into pages by estimated height so 2-column layout balances.
  const estH = (q: Question) => {
    const charsPerLine = cfg.twoColumn ? 32 : 70;
    const lines = (s?: string) => Math.max(1, Math.ceil(((s || "").length) / charsPerLine));
    let h = 6; // gap
    h += lines(q.question) * 13; // question
    const optLines = q.options.reduce((m, o) => m + lines(o), 0);
    h += Math.ceil(optLines / 2) * 12 + 4; // 2-col options
    if (cfg.showAnswers || (cfg.showExplanations && q.explanation)) {
      h += 14;
      if (cfg.showExplanations && q.explanation) h += lines(q.explanation) * 11 + 4;
    }
    return h;
  };
  const headerH = 70;
  const footerH = 22;
  const pageContentH = 842 - 28 * 2 - headerH - footerH; // A4 pt
  const colCapacity = cfg.twoColumn ? pageContentH * 2 : pageContentH;
  type Pg = { left: Question[]; right: Question[] };
  const pages: Pg[] = [];
  let cur: Pg = { left: [], right: [] };
  let curH = 0;
  let onLeft = true;
  let leftH = 0, rightH = 0;
  for (const q of exam.questions) {
    const h = estH(q);
    if (curH + h > colCapacity) {
      pages.push(cur);
      cur = { left: [], right: [] };
      curH = 0; leftH = 0; rightH = 0; onLeft = true;
    }
    if (cfg.twoColumn) {
      // place in shorter column, prefer left if equal
      if (leftH <= rightH && leftH + h <= pageContentH) { cur.left.push(q); leftH += h; }
      else if (rightH + h <= pageContentH) { cur.right.push(q); rightH += h; }
      else { cur.left.push(q); leftH += h; }
    } else {
      cur.left.push(q);
      leftH += h;
    }
    curH += h;
    onLeft = !onLeft;
  }
  if (cur.left.length || cur.right.length) pages.push(cur);
  if (pages.length === 0) pages.push({ left: [], right: [] });

  let runningIdx = 0;
  return (
    <Document>
      {pages.map((pg, pageIdx) => {
        const leftStart = runningIdx;
        const rightStart = runningIdx + pg.left.length;
        runningIdx += pg.left.length + pg.right.length;
        return (
      <Page key={pageIdx} size="A4" style={styles.page}>
        {/* Header */}
        <View>
          {cfg.logoDataUrl ? (
            <PdfImage src={cfg.logoDataUrl} style={{ height: 28, alignSelf: "center", marginBottom: 2 }} />
          ) : null}
          <Text style={styles.title}>{cfg.title || exam.title}</Text>
          {cfg.subtitle ? <Text style={styles.subtitle}>{cfg.subtitle}</Text> : null}
          <View style={styles.metaRow}>
            <Text>পূর্ণমান: {toBn(marks)}</Text>
            <Text>সেট: {cfg.setLabel || "—"}</Text>
            <Text>সময়: {toBn(exam.duration)} মিনিট</Text>
          </View>
        </View>

        {/* Body — true 2-column with simulated column rule using a thin divider */}
        <View style={styles.body}>
          <View style={styles.col}>
            {pg.left.map((q, i) => (
              <QBlock key={q.id || `l-${pageIdx}-${i}`} q={q} idx={leftStart + i} cfg={cfg} mathMap={mathMap} />
            ))}
          </View>
          {cfg.twoColumn && (
            <>
              <View style={styles.colDivider} />
              <View style={styles.col}>
                {pg.right.map((q, i) => (
                  <QBlock key={q.id || `r-${pageIdx}-${i}`} q={q} idx={rightStart + i} cfg={cfg} mathMap={mathMap} />
                ))}
              </View>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={{ flex: 1 }}>
            {cfg.footer.left.text ? (
              cfg.footer.left.link ? (
                <Link src={cfg.footer.left.link} style={{ color: "#1e3a8a" }}>{cfg.footer.left.text}</Link>
              ) : <Text>{cfg.footer.left.text}</Text>
            ) : null}
          </View>
          <View style={{ flex: 2, alignItems: "center" }}>
            {cfg.footer.center.text ? (
              cfg.footer.center.link ? (
                <Link src={cfg.footer.center.link} style={{ color: "#1e3a8a" }}>{cfg.footer.center.text}</Link>
              ) : <Text>{cfg.footer.center.text}</Text>
            ) : null}
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text render={({ pageNumber, totalPages }) => `পৃষ্ঠা ${toBn(pageNumber)} / ${toBn(totalPages)}`} />
          </View>
        </View>
      </Page>
        );
      })}
    </Document>
  );
};

// --------------------------------------------------------------
// 5) Top-level UI (drop-in for previous Exporter)
// --------------------------------------------------------------
const emptySlot = (): Slot => ({ text: "", link: "" });
const DEFAULT_CFG: PdfConfig = {
  title: "", subtitle: "", logoDataUrl: "",
  showAnswers: true, showExplanations: true, twoColumn: true,
  primaryColor: "#1e3a8a", setLabel: "A", marksOverride: "",
  footer: { left: emptySlot(), center: { text: "✈ আমাদের টেলিগ্রাম চ্যানেল", link: "" }, right: emptySlot() },
};

const safeFileName = (n: string) => (n || "exam").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80);

const Exporter = ({ exam, open, onClose }: { exam: Exam; open: boolean; onClose: () => void }) => {
  const { toast } = useToast();
  const [cfg, setCfg] = useState<PdfConfig>({ ...DEFAULT_CFG, title: exam.title, subtitle: exam.subject || "" });
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setCfg((c) => ({ ...c, title: exam.title, subtitle: exam.subject || c.subtitle }));
  }, [open, exam.id, exam.title, exam.subject]);

  const updateFooter = (pos: "left" | "center" | "right", field: keyof Slot, value: string) =>
    setCfg((c) => ({ ...c, footer: { ...c.footer, [pos]: { ...c.footer[pos], [field]: value } } }));

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1024 * 1024) return toast({ title: "লোগো ১MB এর মধ্যে হতে হবে", variant: "destructive" });
    const r = new FileReader();
    r.onload = () => setCfg((c) => ({ ...c, logoDataUrl: String(r.result || "") }));
    r.readAsDataURL(f);
  };

  const generate = async () => {
    if (!exam.questions?.length) return toast({ title: "প্রশ্ন নেই", variant: "destructive" });
    setGenerating(true);
    try {
      ensureFonts();
      // 1) Pre-render all unique math expressions
      const mathItems = collectMath(exam);
      setProgress(`গণিত প্রস্তুত... ০/${toBn(mathItems.length)}`);
      const mathMap = new Map<string, MathPiece>();
      for (let i = 0; i < mathItems.length; i++) {
        const it = mathItems[i];
        const p = await renderMathToImage(it.latex, it.display);
        if (p) mathMap.set((it.display ? "D|" : "I|") + it.latex, p);
        setProgress(`গণিত প্রস্তুত... ${toBn(i + 1)}/${toBn(mathItems.length)}`);
      }

      setProgress("PDF তৈরি হচ্ছে...");
      const blob = await pdf(<ExamPdfDoc exam={exam} cfg={cfg} mathMap={mathMap} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${safeFileName(cfg.title)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast({ title: "PDF তৈরি হয়েছে ✅" });
    } catch (err: any) {
      console.error("PDF gen error", err);
      toast({ title: "PDF তৈরিতে ত্রুটি", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setGenerating(false);
      setProgress("");
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm overflow-y-auto p-2 md:p-6">
      <div className="min-h-[calc(100vh-1rem)] flex items-start justify-center">
        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden my-2 border border-border">
          <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
            <div>
              <h2 className="font-bold text-lg">PDF এক্সপোর্ট</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Vector text • Noto Sans Bengali embedded • LaTeX/mhchem • super-light file</p>
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
                    onText={(v) => updateFooter(p, "text", v)}
                    onLink={(v) => updateFooter(p, "link", v)}
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

            <button onClick={generate} disabled={generating} className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              {generating ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              {generating ? (progress || "তৈরি হচ্ছে...") : `Vector PDF ডাউনলোড  •  ${toBn(exam.questions.length)} প্রশ্ন`}
            </button>
            <p className="text-[11px] text-muted-foreground text-center">
              ১০০% vector text · embedded Noto Sans Bengali · zoom-এ একদম sharp · ফাইল সাইজ <code>~50–500&nbsp;KB</code>
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
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
