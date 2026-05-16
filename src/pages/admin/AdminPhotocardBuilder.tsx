import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";
import {
  Image as ImageIcon, Type, Trash2, Copy, ArrowUp, ArrowDown,
  Download, Save, FolderOpen, X, RotateCw, Lock, Unlock, Sparkles,
} from "lucide-react";
import { BUILTIN_TEMPLATES } from "@/lib/photocardTemplates";

type LayerBase = {
  id: string;
  type: "text" | "image";
  x: number; y: number; w: number; h: number;
  rotation: number;
  opacity: number;
  locked?: boolean;
};
type TextLayer = LayerBase & {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: "left" | "center" | "right";
  italic: boolean;
  lineHeight: number;
  letterSpacing: number;
  bg: string; // transparent or color
  padding: number;
  radius: number;
  shadow: boolean;
};
type ImageLayer = LayerBase & {
  type: "image";
  src: string;
  fit: "cover" | "contain";
  radius: number;
  filter: "none" | "grayscale" | "blur" | "sepia";
  glow?: boolean;
  glowColor?: string;
};
type Layer = TextLayer | ImageLayer;

type Background = {
  type: "color" | "gradient" | "image";
  color: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  imageSrc: string;
  imageFit: "cover" | "contain";
};

type Doc = {
  width: number;
  height: number;
  background: Background;
  layers: Layer[];
};

type Template = { id: string; name: string; doc: Doc; thumb?: string; createdAt: number };

const STORAGE_KEY = "target_photocard_templates_v1";
const FONTS = [
  "Inter, sans-serif",
  "'Hind Siliguri', sans-serif",
  "'Noto Serif Bengali', serif",
  "'Tiro Bangla', serif",
  "Georgia, serif",
  "'Playfair Display', serif",
  "'Bebas Neue', sans-serif",
  "'Space Grotesk', sans-serif",
  "'Anek Bangla', sans-serif",
];

// Curated cute / professional solid color samples
const COLOR_SWATCHES = [
  "#0f172a", "#1e293b", "#1e3a8a", "#1d4ed8", "#2563eb", "#3b82f6", "#0ea5e9", "#06b6d4",
  "#0d9488", "#059669", "#16a34a", "#22c55e", "#84cc16", "#eab308", "#f59e0b", "#f97316",
  "#ef4444", "#dc2626", "#e11d48", "#db2777", "#c026d3", "#9333ea", "#7c3aed", "#6366f1",
  "#ffffff", "#f5f5f4", "#fafafa", "#e2e8f0", "#94a3b8", "#475569", "#374151", "#111827",
  "#fce7f3", "#fef3c7", "#dcfce7", "#dbeafe", "#ede9fe", "#fee2e2", "#ffedd5", "#cffafe",
];

// Curated professional gradient samples
const GRADIENT_PRESETS: { name: string; from: string; to: string; angle: number }[] = [
  { name: "Ocean Deep", from: "#0ea5e9", to: "#0369a1", angle: 135 },
  { name: "Sunset", from: "#f97316", to: "#db2777", angle: 135 },
  { name: "Aurora", from: "#a78bfa", to: "#22d3ee", angle: 135 },
  { name: "Midnight", from: "#1e1b4b", to: "#0f172a", angle: 180 },
  { name: "Emerald", from: "#10b981", to: "#064e3b", angle: 135 },
  { name: "Royal", from: "#1d4ed8", to: "#1e1b4b", angle: 135 },
  { name: "Peach Cream", from: "#fed7aa", to: "#fce7f3", angle: 135 },
  { name: "Mint Sky", from: "#bbf7d0", to: "#bae6fd", angle: 135 },
  { name: "Lavender", from: "#ede9fe", to: "#fce7f3", angle: 135 },
  { name: "Bold Red", from: "#7f1d1d", to: "#dc2626", angle: 180 },
  { name: "Gold Lux", from: "#facc15", to: "#a16207", angle: 135 },
  { name: "Cyber", from: "#22d3ee", to: "#7c3aed", angle: 135 },
  { name: "Forest", from: "#166534", to: "#052e16", angle: 135 },
  { name: "Rose Gold", from: "#fda4af", to: "#be185d", angle: 135 },
  { name: "Slate Pro", from: "#475569", to: "#0f172a", angle: 135 },
  { name: "Sky Pop", from: "#7dd3fc", to: "#1d4ed8", angle: 135 },
];

const PRESETS = [
  { name: "Square 1:1", w: 1080, h: 1080 },
  { name: "Story 9:16", w: 1080, h: 1920 },
  { name: "Post 4:5", w: 1080, h: 1350 },
  { name: "Landscape 16:9", w: 1920, h: 1080 },
  { name: "FB Cover", w: 1640, h: 856 },
  { name: "A4 Print", w: 2480, h: 3508 },
  { name: "Telegram Post 16:9", w: 1280, h: 720 },
  { name: "Telegram Square", w: 1080, h: 1080 },
  { name: "Telegram Story 9:16", w: 1080, h: 1920 },
];

const uid = () => Math.random().toString(36).slice(2, 10);

const defaultDoc = (): Doc => ({
  width: 1080, height: 1080,
  background: {
    type: "gradient",
    color: "#0f172a",
    gradientFrom: "#1e3a8a",
    gradientTo: "#0f172a",
    gradientAngle: 135,
    imageSrc: "",
    imageFit: "cover",
  },
  layers: [],
});

const newTextLayer = (w: number, h: number): TextLayer => ({
  id: uid(), type: "text",
  x: w * 0.1, y: h * 0.4, w: w * 0.8, h: 160,
  rotation: 0, opacity: 1,
  text: "আপনার শিরোনাম এখানে",
  fontFamily: "'Hind Siliguri', sans-serif",
  fontSize: 96, fontWeight: 700,
  color: "#ffffff", align: "center", italic: false,
  lineHeight: 1.2, letterSpacing: 0,
  bg: "transparent", padding: 0, radius: 0, shadow: true,
});

const newImageLayer = (src: string, w: number, h: number): ImageLayer => ({
  id: uid(), type: "image",
  x: w * 0.2, y: h * 0.2, w: w * 0.6, h: w * 0.6,
  rotation: 0, opacity: 1,
  src, fit: "cover", radius: 24, filter: "none",
  glow: false, glowColor: "#22d3ee",
});

function loadTemplates(): Template[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveTemplates(t: Template[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); }

function fileToDataURL(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}

const AdminPhotocardBuilder = () => {
  const { toast } = useToast();
  const [doc, setDoc] = useState<Doc>(defaultDoc());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>(() => loadTemplates());
  const [showTemplates, setShowTemplates] = useState(false);
  const [tplTab, setTplTab] = useState<"builtin" | "saved">("builtin");
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState(600);

  // Compute scale so canvas fits container width
  useEffect(() => {
    const update = () => {
      const w = stageWrapRef.current?.clientWidth ?? 600;
      setStageW(w);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const scale = useMemo(() => Math.min(stageW / doc.width, 1), [stageW, doc.width]);

  const selected = doc.layers.find((l) => l.id === selectedId) || null;

  const updateLayer = (id: string, patch: Partial<Layer>) => {
    setDoc((d) => ({ ...d, layers: d.layers.map((l) => l.id === id ? ({ ...l, ...patch } as Layer) : l) }));
  };
  const removeLayer = (id: string) => {
    setDoc((d) => ({ ...d, layers: d.layers.filter((l) => l.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  };
  const duplicateLayer = (id: string) => {
    const l = doc.layers.find((x) => x.id === id);
    if (!l) return;
    const copy = { ...l, id: uid(), x: l.x + 24, y: l.y + 24 } as Layer;
    setDoc((d) => ({ ...d, layers: [...d.layers, copy] }));
    setSelectedId(copy.id);
  };
  const moveLayer = (id: string, dir: -1 | 1) => {
    setDoc((d) => {
      const idx = d.layers.findIndex((l) => l.id === id);
      if (idx < 0) return d;
      const ni = Math.max(0, Math.min(d.layers.length - 1, idx + dir));
      if (ni === idx) return d;
      const arr = [...d.layers];
      const [item] = arr.splice(idx, 1);
      arr.splice(ni, 0, item);
      return { ...d, layers: arr };
    });
  };

  // Drag/resize via pointer events. Coordinates in canvas-space (we divide deltas by scale).
  const dragRef = useRef<{ id: string; mode: "move" | "resize" | "rotate"; startX: number; startY: number; orig: Layer; cx: number; cy: number; startAngle: number } | null>(null);

  const onLayerPointerDown = (e: React.PointerEvent, layer: Layer) => {
    if (layer.locked) { setSelectedId(layer.id); return; }
    e.stopPropagation();
    setSelectedId(layer.id);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { id: layer.id, mode: "move", startX: e.clientX, startY: e.clientY, orig: { ...layer }, cx: 0, cy: 0, startAngle: 0 };
  };
  const onResizePointerDown = (e: React.PointerEvent, layer: Layer) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { id: layer.id, mode: "resize", startX: e.clientX, startY: e.clientY, orig: { ...layer }, cx: 0, cy: 0, startAngle: 0 };
  };
  const onRotatePointerDown = (e: React.PointerEvent, layer: Layer) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
    dragRef.current = { id: layer.id, mode: "rotate", startX: e.clientX, startY: e.clientY, orig: { ...layer }, cx, cy, startAngle };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current; if (!d) return;
      const dx = (e.clientX - d.startX) / scale;
      const dy = (e.clientY - d.startY) / scale;
      if (d.mode === "move") {
        updateLayer(d.id, { x: d.orig.x + dx, y: d.orig.y + dy });
      } else if (d.mode === "resize") {
        updateLayer(d.id, {
          w: Math.max(20, d.orig.w + dx),
          h: Math.max(20, d.orig.h + dy),
        });
      } else if (d.mode === "rotate") {
        const a = Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180 / Math.PI;
        updateLayer(d.id, { rotation: d.orig.rotation + (a - d.startAngle) });
      }
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [scale]);

  const addText = () => {
    const l = newTextLayer(doc.width, doc.height);
    setDoc((d) => ({ ...d, layers: [...d.layers, l] }));
    setSelectedId(l.id);
  };
  const addImageFromFile = async (file: File) => {
    const src = await fileToDataURL(file);
    const l = newImageLayer(src, doc.width, doc.height);
    setDoc((d) => ({ ...d, layers: [...d.layers, l] }));
    setSelectedId(l.id);
  };
  const setBgImageFromFile = async (file: File) => {
    const src = await fileToDataURL(file);
    setDoc((d) => ({ ...d, background: { ...d.background, type: "image", imageSrc: src } }));
  };

  const exportPNG = async () => {
    if (!frameRef.current) return;
    toast({ title: "ছবি তৈরি হচ্ছে…" });
    // Temporarily remove transform scale so html2canvas captures at full resolution
    const node = frameRef.current;
    const prevTransform = node.style.transform;
    node.style.transform = "none";
    try {
      const canvas = await html2canvas(node, {
        backgroundColor: null,
        useCORS: true,
        scale: 1, // node is already at full canvas size
        width: doc.width,
        height: doc.height,
        windowWidth: doc.width,
        windowHeight: doc.height,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `photocard-${Date.now()}.png`;
      a.click();
      toast({ title: "ডাউনলোড সম্পন্ন ✅" });
    } catch (err) {
      console.error(err);
      toast({ title: "ডাউনলোড ব্যর্থ", variant: "destructive" });
    } finally {
      node.style.transform = prevTransform;
    }
  };

  const saveAsTemplate = () => {
    const name = prompt("টেমপ্লেটের নাম দিন:");
    if (!name) return;
    const t: Template = { id: uid(), name, doc, createdAt: Date.now() };
    const list = [t, ...templates];
    setTemplates(list);
    saveTemplates(list);
    toast({ title: "টেমপ্লেট সেভ হয়েছে ✅" });
  };
  const loadTemplate = (t: Template) => {
    setDoc(JSON.parse(JSON.stringify(t.doc)));
    setSelectedId(null);
    setShowTemplates(false);
  };
  const deleteTemplate = (id: string) => {
    const list = templates.filter((t) => t.id !== id);
    setTemplates(list);
    saveTemplates(list);
  };

  const bgStyle = (): React.CSSProperties => {
    const b = doc.background;
    if (b.type === "color") return { background: b.color };
    if (b.type === "gradient") return { background: `linear-gradient(${b.gradientAngle}deg, ${b.gradientFrom}, ${b.gradientTo})` };
    if (b.type === "image" && b.imageSrc) return { backgroundImage: `url(${b.imageSrc})`, backgroundSize: b.imageFit, backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundColor: b.color };
    return { background: b.color };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">📸 ফটোকার্ড বিল্ডার</h1>
          <p className="text-xs text-muted-foreground mt-1">কাস্টম লেআউট তৈরি করুন, টেমপ্লেট সেভ করুন, হাই-রেজ PNG ডাউনলোড করুন</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setTplTab("builtin"); setShowTemplates(true); }} className="px-3 py-2 text-xs font-semibold rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 flex items-center gap-1.5"><Sparkles size={14} /> থিম গ্যালারি</button>
          <button onClick={() => { setTplTab("saved"); setShowTemplates(true); }} className="px-3 py-2 text-xs font-semibold rounded-lg bg-muted hover:bg-muted/70 flex items-center gap-1.5"><FolderOpen size={14} /> সেভ করা</button>
          <button onClick={saveAsTemplate} className="px-3 py-2 text-xs font-semibold rounded-lg bg-secondary hover:bg-secondary/80 flex items-center gap-1.5"><Save size={14} /> সেভ</button>
          <button onClick={exportPNG} className="px-3 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5"><Download size={14} /> ডাউনলোড PNG</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_300px] gap-4">
        {/* LEFT: tools */}
        <div className="space-y-3 order-2 lg:order-1">
          <div className="glass-card-static p-3 space-y-2">
            <p className="text-xs font-bold text-muted-foreground">যোগ করুন</p>
            <button onClick={addText} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-muted hover:bg-muted/70"><Type size={14} /> টেক্সট</button>
            <label className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-muted hover:bg-muted/70 cursor-pointer">
              <ImageIcon size={14} /> ছবি আপলোড
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && addImageFromFile(e.target.files[0])} />
            </label>
          </div>

          <div className="glass-card-static p-3 space-y-2">
            <p className="text-xs font-bold text-muted-foreground">ক্যানভাস সাইজ</p>
            <select
              value={`${doc.width}x${doc.height}`}
              onChange={(e) => {
                const [w, h] = e.target.value.split("x").map(Number);
                setDoc((d) => ({ ...d, width: w, height: h }));
              }}
              className="w-full text-xs px-2 py-2 rounded-lg bg-background border border-border"
            >
              {PRESETS.map((p) => <option key={p.name} value={`${p.w}x${p.h}`}>{p.name} ({p.w}×{p.h})</option>)}
            </select>
            <div className="flex gap-2">
              <input type="number" value={doc.width} onChange={(e) => setDoc((d) => ({ ...d, width: Math.max(100, +e.target.value || 100) }))} className="flex-1 text-xs px-2 py-1.5 rounded bg-background border border-border" />
              <input type="number" value={doc.height} onChange={(e) => setDoc((d) => ({ ...d, height: Math.max(100, +e.target.value || 100) }))} className="flex-1 text-xs px-2 py-1.5 rounded bg-background border border-border" />
            </div>
          </div>

          <div className="glass-card-static p-3 space-y-2">
            <p className="text-xs font-bold text-muted-foreground">ব্যাকগ্রাউন্ড</p>
            <div className="flex gap-1">
              {(["color", "gradient", "image"] as const).map((t) => (
                <button key={t} onClick={() => setDoc((d) => ({ ...d, background: { ...d.background, type: t } }))}
                  className={`flex-1 text-[11px] py-1.5 rounded ${doc.background.type === t ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{t}</button>
              ))}
            </div>
            {doc.background.type === "color" && (
              <input type="color" value={doc.background.color} onChange={(e) => setDoc((d) => ({ ...d, background: { ...d.background, color: e.target.value } }))} className="w-full h-9 rounded cursor-pointer" />
            )}
            {doc.background.type === "gradient" && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input type="color" value={doc.background.gradientFrom} onChange={(e) => setDoc((d) => ({ ...d, background: { ...d.background, gradientFrom: e.target.value } }))} className="flex-1 h-9 rounded cursor-pointer" />
                  <input type="color" value={doc.background.gradientTo} onChange={(e) => setDoc((d) => ({ ...d, background: { ...d.background, gradientTo: e.target.value } }))} className="flex-1 h-9 rounded cursor-pointer" />
                </div>
                <input type="range" min={0} max={360} value={doc.background.gradientAngle} onChange={(e) => setDoc((d) => ({ ...d, background: { ...d.background, gradientAngle: +e.target.value } }))} className="w-full" />
              </div>
            )}
            {doc.background.type === "image" && (
              <div className="space-y-2">
                <label className="flex items-center justify-center text-xs px-2 py-2 rounded bg-muted hover:bg-muted/70 cursor-pointer">
                  ছবি বাছুন
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setBgImageFromFile(e.target.files[0])} />
                </label>
                <select value={doc.background.imageFit} onChange={(e) => setDoc((d) => ({ ...d, background: { ...d.background, imageFit: e.target.value as any } }))} className="w-full text-xs px-2 py-1.5 rounded bg-background border border-border">
                  <option value="cover">cover</option>
                  <option value="contain">contain</option>
                </select>
              </div>
            )}
          </div>

          <div className="glass-card-static p-3">
            <p className="text-xs font-bold text-muted-foreground mb-2">লেয়ার ({doc.layers.length})</p>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {[...doc.layers].reverse().map((l) => (
                <button key={l.id} onClick={() => setSelectedId(l.id)}
                  className={`w-full flex items-center gap-2 text-[11px] px-2 py-1.5 rounded ${selectedId === l.id ? "bg-primary/15 text-primary" : "hover:bg-muted"}`}>
                  {l.type === "text" ? <Type size={12} /> : <ImageIcon size={12} />}
                  <span className="truncate flex-1 text-left">{l.type === "text" ? (l as TextLayer).text.slice(0, 22) : "ছবি"}</span>
                  {l.locked && <Lock size={11} />}
                </button>
              ))}
              {doc.layers.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-3">কোনো লেয়ার নেই</p>}
            </div>
          </div>
        </div>

        {/* CENTER: stage */}
        <div ref={stageWrapRef} className="order-1 lg:order-2 min-w-0">
          <div className="glass-card-static p-3 overflow-auto">
            <div
              style={{ width: doc.width * scale, height: doc.height * scale, position: "relative", margin: "0 auto" }}
              onPointerDown={() => setSelectedId(null)}
            >
              <div
                ref={frameRef}
                style={{
                  width: doc.width, height: doc.height,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  position: "absolute", top: 0, left: 0,
                  ...bgStyle(),
                  overflow: "hidden",
                }}
              >
                {doc.layers.map((l) => (
                  <div
                    key={l.id}
                    onPointerDown={(e) => onLayerPointerDown(e, l)}
                    style={{
                      position: "absolute",
                      left: l.x, top: l.y, width: l.w, height: l.h,
                      transform: `rotate(${l.rotation}deg)`,
                      opacity: l.opacity,
                      cursor: l.locked ? "default" : "move",
                      outline: selectedId === l.id ? `${Math.max(2, 2/scale)}px dashed hsl(var(--primary))` : "none",
                      outlineOffset: 2,
                    }}
                  >
                    {l.type === "text" ? (
                      <div
                        style={{
                          width: "100%", height: "100%",
                          fontFamily: (l as TextLayer).fontFamily,
                          fontSize: (l as TextLayer).fontSize,
                          fontWeight: (l as TextLayer).fontWeight,
                          color: (l as TextLayer).color,
                          textAlign: (l as TextLayer).align,
                          fontStyle: (l as TextLayer).italic ? "italic" : "normal",
                          lineHeight: (l as TextLayer).lineHeight,
                          letterSpacing: (l as TextLayer).letterSpacing,
                          background: (l as TextLayer).bg === "transparent" ? "transparent" : (l as TextLayer).bg,
                          padding: (l as TextLayer).padding,
                          borderRadius: (l as TextLayer).radius,
                          textShadow: (l as TextLayer).shadow ? "0 4px 16px rgba(0,0,0,0.45)" : "none",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: (l as TextLayer).align === "center" ? "center" : (l as TextLayer).align === "right" ? "flex-end" : "flex-start",
                        }}
                      >
                        {(l as TextLayer).text}
                      </div>
                    ) : (
                      <img
                        src={(l as ImageLayer).src}
                        alt=""
                        draggable={false}
                        style={{
                          width: "100%", height: "100%",
                          objectFit: (l as ImageLayer).fit,
                          borderRadius: (l as ImageLayer).radius,
                          filter:
                            (l as ImageLayer).filter === "grayscale" ? "grayscale(1)" :
                            (l as ImageLayer).filter === "blur" ? "blur(8px)" :
                            (l as ImageLayer).filter === "sepia" ? "sepia(1)" : "none",
                          pointerEvents: "none",
                        }}
                      />
                    )}
                    {selectedId === l.id && !l.locked && (
                      <>
                        {/* Resize handle */}
                        <div
                          onPointerDown={(e) => onResizePointerDown(e, l)}
                          style={{
                            position: "absolute", right: -10/scale, bottom: -10/scale,
                            width: 20/scale, height: 20/scale,
                            background: "hsl(var(--primary))",
                            border: `${2/scale}px solid white`,
                            borderRadius: "50%",
                            cursor: "nwse-resize",
                          }}
                        />
                        {/* Rotate handle */}
                        <div
                          onPointerDown={(e) => onRotatePointerDown(e, l)}
                          style={{
                            position: "absolute", left: "50%", top: -36/scale,
                            transform: "translateX(-50%)",
                            width: 22/scale, height: 22/scale,
                            background: "hsl(var(--secondary))",
                            border: `${2/scale}px solid white`,
                            borderRadius: "50%",
                            cursor: "grab",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          <RotateCw size={12/scale} color="white" />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">প্রিভিউ স্কেল: {Math.round(scale * 100)}% • রিয়েল রেজুলেশন: {doc.width}×{doc.height}px</p>
        </div>

        {/* RIGHT: properties */}
        <div className="order-3 space-y-3">
          <div className="glass-card-static p-3 space-y-2">
            <p className="text-xs font-bold text-muted-foreground">প্রপার্টি</p>
            {!selected && <p className="text-[11px] text-muted-foreground">একটি লেয়ার নির্বাচন করুন</p>}
            {selected && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  <button onClick={() => duplicateLayer(selected.id)} title="ডুপ্লিকেট" className="flex-1 p-1.5 rounded bg-muted hover:bg-muted/70 flex items-center justify-center"><Copy size={13} /></button>
                  <button onClick={() => moveLayer(selected.id, 1)} title="উপরে" className="flex-1 p-1.5 rounded bg-muted hover:bg-muted/70 flex items-center justify-center"><ArrowUp size={13} /></button>
                  <button onClick={() => moveLayer(selected.id, -1)} title="নিচে" className="flex-1 p-1.5 rounded bg-muted hover:bg-muted/70 flex items-center justify-center"><ArrowDown size={13} /></button>
                  <button onClick={() => updateLayer(selected.id, { locked: !selected.locked } as any)} title="লক" className="flex-1 p-1.5 rounded bg-muted hover:bg-muted/70 flex items-center justify-center">{selected.locked ? <Unlock size={13} /> : <Lock size={13} />}</button>
                  <button onClick={() => removeLayer(selected.id)} title="মুছুন" className="flex-1 p-1.5 rounded bg-destructive/15 text-destructive hover:bg-destructive/25 flex items-center justify-center"><Trash2 size={13} /></button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <NumField label="X" value={Math.round(selected.x)} onChange={(v) => updateLayer(selected.id, { x: v })} />
                  <NumField label="Y" value={Math.round(selected.y)} onChange={(v) => updateLayer(selected.id, { y: v })} />
                  <NumField label="W" value={Math.round(selected.w)} onChange={(v) => updateLayer(selected.id, { w: Math.max(20, v) })} />
                  <NumField label="H" value={Math.round(selected.h)} onChange={(v) => updateLayer(selected.id, { h: Math.max(20, v) })} />
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground">রোটেশন: {Math.round(selected.rotation)}°</label>
                  <input type="range" min={-180} max={180} value={selected.rotation} onChange={(e) => updateLayer(selected.id, { rotation: +e.target.value })} className="w-full" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">অপাসিটি: {Math.round(selected.opacity * 100)}%</label>
                  <input type="range" min={0} max={100} value={selected.opacity * 100} onChange={(e) => updateLayer(selected.id, { opacity: +e.target.value / 100 })} className="w-full" />
                </div>

                {selected.type === "text" && <TextProps layer={selected as TextLayer} update={(p) => updateLayer(selected.id, p)} />}
                {selected.type === "image" && <ImageProps layer={selected as ImageLayer} update={(p) => updateLayer(selected.id, p)} />}
              </div>
            )}
          </div>
        </div>
      </div>

      {showTemplates && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowTemplates(false)}>
          <div className="bg-background rounded-2xl p-4 max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">টেমপ্লেট গ্যালারি</h3>
              <button onClick={() => setShowTemplates(false)} className="p-1.5 hover:bg-muted rounded"><X size={16} /></button>
            </div>
            <div className="flex gap-1 mb-4 p-1 bg-muted rounded-lg w-fit">
              <button onClick={() => setTplTab("builtin")} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${tplTab === "builtin" ? "bg-background shadow" : ""}`}>✨ বিল্ট-ইন থিম ({BUILTIN_TEMPLATES.length})</button>
              <button onClick={() => setTplTab("saved")} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${tplTab === "saved" ? "bg-background shadow" : ""}`}>📁 সেভ করা ({templates.length})</button>
            </div>

            {tplTab === "builtin" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {BUILTIN_TEMPLATES.map((t) => (
                  <div key={t.id} className="border border-border rounded-xl p-2 hover:border-primary transition-colors">
                    <div
                      className="aspect-square rounded-lg mb-2 overflow-hidden cursor-pointer relative flex items-center justify-center text-center p-3"
                      onClick={() => { loadTemplate({ id: t.id, name: t.name, doc: JSON.parse(JSON.stringify(t.doc)), createdAt: 0 } as any); }}
                      style={
                        t.doc.background.type === "gradient"
                          ? { background: `linear-gradient(${t.doc.background.gradientAngle}deg, ${t.doc.background.gradientFrom}, ${t.doc.background.gradientTo})` }
                          : { background: t.doc.background.color }
                      }
                    >
                      <span className="text-white text-xs font-bold drop-shadow-lg" style={{ color: t.doc.background.type === "color" && t.doc.background.color === "#ffffff" ? "#0f172a" : "#fff" }}>{t.name}</span>
                    </div>
                    <p className="text-xs font-semibold truncate">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{t.doc.width}×{t.doc.height}</p>
                    <button onClick={() => loadTemplate({ id: t.id, name: t.name, doc: JSON.parse(JSON.stringify(t.doc)), createdAt: 0 } as any)} className="w-full mt-1 text-[10px] py-1 rounded bg-primary text-primary-foreground">ব্যবহার করুন</button>
                  </div>
                ))}
              </div>
            )}

            {tplTab === "saved" && (
              <>
                {templates.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">কোনো সেভ করা টেমপ্লেট নেই। উপরের "সেভ" বাটন দিয়ে তৈরি করুন।</p>}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {templates.map((t) => (
                    <div key={t.id} className="border border-border rounded-xl p-2">
                      <div
                        className="aspect-square rounded-lg mb-2 overflow-hidden cursor-pointer"
                        onClick={() => loadTemplate(t)}
                        style={
                          t.doc.background.type === "gradient"
                            ? { background: `linear-gradient(${t.doc.background.gradientAngle}deg, ${t.doc.background.gradientFrom}, ${t.doc.background.gradientTo})` }
                            : { background: t.doc.background.color }
                        }
                      />
                      <p className="text-xs font-semibold truncate">{t.name}</p>
                      <div className="flex gap-1 mt-1">
                        <button onClick={() => loadTemplate(t)} className="flex-1 text-[10px] py-1 rounded bg-primary text-primary-foreground">লোড</button>
                        <button onClick={() => deleteTemplate(t.id)} className="text-[10px] px-2 py-1 rounded bg-destructive/15 text-destructive">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const NumField = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <label className="block">
    <span className="text-[10px] text-muted-foreground">{label}</span>
    <input type="number" value={value} onChange={(e) => onChange(+e.target.value)} className="w-full text-xs px-2 py-1.5 rounded bg-background border border-border" />
  </label>
);

const TextProps = ({ layer, update }: { layer: TextLayer; update: (p: Partial<TextLayer>) => void }) => (
  <div className="space-y-2 pt-2 border-t border-border/50">
    <textarea value={layer.text} onChange={(e) => update({ text: e.target.value })} rows={3} className="w-full text-xs px-2 py-1.5 rounded bg-background border border-border resize-none" />
    <select value={layer.fontFamily} onChange={(e) => update({ fontFamily: e.target.value })} className="w-full text-xs px-2 py-1.5 rounded bg-background border border-border">
      {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f.split(",")[0].replace(/'/g, "")}</option>)}
    </select>
    <div className="grid grid-cols-2 gap-2">
      <NumField label="সাইজ" value={layer.fontSize} onChange={(v) => update({ fontSize: Math.max(8, v) })} />
      <label className="block">
        <span className="text-[10px] text-muted-foreground">ওয়েট</span>
        <select value={layer.fontWeight} onChange={(e) => update({ fontWeight: +e.target.value })} className="w-full text-xs px-2 py-1.5 rounded bg-background border border-border">
          {[300, 400, 500, 600, 700, 800, 900].map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      </label>
    </div>
    <div className="flex items-center gap-2">
      <label className="flex-1">
        <span className="text-[10px] text-muted-foreground">কালার</span>
        <input type="color" value={layer.color} onChange={(e) => update({ color: e.target.value })} className="w-full h-8 rounded cursor-pointer" />
      </label>
      <label className="flex-1">
        <span className="text-[10px] text-muted-foreground">BG</span>
        <input type="color" value={layer.bg === "transparent" ? "#ffffff" : layer.bg} onChange={(e) => update({ bg: e.target.value })} className="w-full h-8 rounded cursor-pointer" />
      </label>
      <button onClick={() => update({ bg: "transparent" })} className="text-[10px] px-2 py-1 rounded bg-muted self-end">×</button>
    </div>
    <div className="flex gap-1">
      {(["left", "center", "right"] as const).map((a) => (
        <button key={a} onClick={() => update({ align: a })} className={`flex-1 text-[10px] py-1 rounded ${layer.align === a ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{a}</button>
      ))}
      <button onClick={() => update({ italic: !layer.italic })} className={`flex-1 text-[10px] py-1 rounded italic ${layer.italic ? "bg-primary text-primary-foreground" : "bg-muted"}`}>I</button>
      <button onClick={() => update({ shadow: !layer.shadow })} className={`flex-1 text-[10px] py-1 rounded ${layer.shadow ? "bg-primary text-primary-foreground" : "bg-muted"}`}>Shdw</button>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <NumField label="প্যাডিং" value={layer.padding} onChange={(v) => update({ padding: Math.max(0, v) })} />
      <NumField label="রেডিয়াস" value={layer.radius} onChange={(v) => update({ radius: Math.max(0, v) })} />
    </div>
  </div>
);

const ImageProps = ({ layer, update }: { layer: ImageLayer; update: (p: Partial<ImageLayer>) => void }) => (
  <div className="space-y-2 pt-2 border-t border-border/50">
    <label className="flex items-center justify-center text-xs px-2 py-2 rounded bg-muted hover:bg-muted/70 cursor-pointer">
      ছবি পরিবর্তন
      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0]; if (!f) return;
        const src = await fileToDataURL(f); update({ src });
      }} />
    </label>
    <div className="flex gap-1">
      {(["cover", "contain"] as const).map((f) => (
        <button key={f} onClick={() => update({ fit: f })} className={`flex-1 text-[10px] py-1 rounded ${layer.fit === f ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{f}</button>
      ))}
    </div>
    <NumField label="রেডিয়াস" value={layer.radius} onChange={(v) => update({ radius: Math.max(0, v) })} />
    <label className="block">
      <span className="text-[10px] text-muted-foreground">ফিল্টার</span>
      <select value={layer.filter} onChange={(e) => update({ filter: e.target.value as any })} className="w-full text-xs px-2 py-1.5 rounded bg-background border border-border">
        <option value="none">none</option>
        <option value="grayscale">grayscale</option>
        <option value="blur">blur</option>
        <option value="sepia">sepia</option>
      </select>
    </label>
  </div>
);

export default AdminPhotocardBuilder;