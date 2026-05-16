// Built-in photocard templates inspired by news/info card designs.
// Each template defines a full Doc that can be loaded into the builder
// and edited freely.

export type BuiltinTemplate = {
  id: string;
  name: string;
  category: "news" | "breaking" | "info" | "quote" | "social" | "telegram";
  doc: any; // matches Doc in AdminPhotocardBuilder
};

const uid = () => Math.random().toString(36).slice(2, 10);

const txt = (o: any) => ({
  id: uid(),
  type: "text" as const,
  rotation: 0,
  opacity: 1,
  fontFamily: "'Hind Siliguri', sans-serif",
  fontWeight: 700,
  color: "#ffffff",
  align: "left" as const,
  italic: false,
  lineHeight: 1.25,
  letterSpacing: 0,
  bg: "transparent",
  padding: 0,
  radius: 0,
  shadow: false,
  ...o,
});

const placeholderImg =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='#3b82f6'/><stop offset='1' stop-color='#1e293b'/>
      </linearGradient></defs>
      <rect width='800' height='500' fill='url(#g)'/>
      <text x='400' y='260' text-anchor='middle' fill='white' font-family='sans-serif' font-size='44'>আপনার ছবি</text>
    </svg>`
  );

function img(o: any) {
  return {
    id: uid(),
    type: "image" as const,
    rotation: 0,
    opacity: 1,
    src: placeholderImg,
    fit: "cover" as const,
    radius: 24,
    filter: "none" as const,
    glow: false,
    ...o,
  };
}

// 1080x1080 square unless noted
const SQ = { width: 1080, height: 1080 };

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  // 1. Breaking News (yellow accent)
  {
    id: "breaking-news",
    name: "ব্রেকিং নিউজ",
    category: "breaking",
    doc: {
      ...SQ,
      background: { type: "color", color: "#0b1221", gradientFrom: "#0b1221", gradientTo: "#0b1221", gradientAngle: 135, imageSrc: "", imageFit: "cover" },
      layers: [
        img({ x: 60, y: 60, w: 960, h: 540, radius: 20 }),
        txt({ x: 60, y: 640, w: 240, h: 56, text: "BREAKING", fontFamily: "'Bebas Neue', sans-serif", fontSize: 44, color: "#ffffff", bg: "#dc2626", padding: 12, radius: 8, align: "center" }),
        txt({ x: 320, y: 648, w: 700, h: 48, text: "তথ্যসূত্র: আপনার সংবাদ", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 28, color: "#94a3b8", fontWeight: 500 }),
        txt({ x: 60, y: 730, w: 960, h: 220, text: "এখানে শিরোনাম লিখুন - সংক্ষেপে এবং স্পষ্টভাবে", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 64, color: "#ffffff", fontWeight: 800, lineHeight: 1.2 }),
        txt({ x: 60, y: 980, w: 960, h: 50, text: "বিস্তারিত ক্যাপশনে", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 28, color: "#facc15", fontWeight: 600 }),
      ],
    },
  },
  // 2. Campus Capsule style info card
  {
    id: "campus-info",
    name: "ইনফো কার্ড (নীল)",
    category: "info",
    doc: {
      ...SQ,
      background: { type: "gradient", color: "#ffffff", gradientFrom: "#eff6ff", gradientTo: "#ffffff", gradientAngle: 180, imageSrc: "", imageFit: "cover" },
      layers: [
        txt({ x: 60, y: 80, w: 360, h: 80, text: "📌 INFO", fontFamily: "'Bebas Neue', sans-serif", fontSize: 56, color: "#ffffff", bg: "#1d4ed8", padding: 16, radius: 40, align: "center" }),
        txt({ x: 60, y: 220, w: 960, h: 240, text: "এখানে আপনার বড় শিরোনাম দিন", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 86, color: "#0f172a", fontWeight: 800, align: "center", lineHeight: 1.15 }),
        txt({ x: 240, y: 500, w: 600, h: 70, text: "(২০২৫-২৬ আপডেট)", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 32, color: "#1d4ed8", bg: "#dbeafe", padding: 14, radius: 20, align: "center", fontWeight: 600 }),
        img({ x: 140, y: 620, w: 800, h: 360, radius: 20 }),
        txt({ x: 60, y: 1010, w: 960, h: 50, text: "yourbrand.com", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 26, color: "#64748b", align: "center", fontWeight: 600 }),
      ],
    },
  },
  // 3. Dark editorial (Bug Mohol style)
  {
    id: "dark-editorial",
    name: "ডার্ক এডিটোরিয়াল",
    category: "news",
    doc: {
      ...SQ,
      background: { type: "color", color: "#f5f1e8", gradientFrom: "#fff", gradientTo: "#fff", gradientAngle: 135, imageSrc: "", imageFit: "cover" },
      layers: [
        img({ x: 0, y: 0, w: 1080, h: 560, radius: 0 }),
        txt({ x: 40, y: 40, w: 80, h: 80, text: "B", fontFamily: "Georgia, serif", fontSize: 64, color: "#ffffff", bg: "#0f172a", padding: 8, radius: 6, align: "center" }),
        txt({ x: 700, y: 50, w: 340, h: 60, text: "Saturday | April 18 | 2026", fontFamily: "Georgia, serif", fontSize: 24, color: "#ffffff", align: "right", fontWeight: 600 }),
        txt({ x: 60, y: 600, w: 960, h: 60, text: "📰  BREAKING NEWS  •  Bug Mohol", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 28, color: "#475569", fontWeight: 600 }),
        txt({ x: 60, y: 680, w: 960, h: 220, text: "এখানে আপনার বড় শিরোনাম বসান", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 56, color: "#0f172a", fontWeight: 800, lineHeight: 1.2 }),
        txt({ x: 80, y: 920, w: 920, h: 130, text: "এখানে সংবাদ বিবরণ দিন। সংক্ষেপে এবং পাঠকের জন্য পরিষ্কারভাবে লিখুন।", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 28, color: "#334155", fontWeight: 400, lineHeight: 1.45 }),
      ],
    },
  },
  // 4. Quote card
  {
    id: "quote-card",
    name: "উক্তি কার্ড",
    category: "quote",
    doc: {
      ...SQ,
      background: { type: "gradient", color: "#0f172a", gradientFrom: "#1e1b4b", gradientTo: "#0f172a", gradientAngle: 135, imageSrc: "", imageFit: "cover" },
      layers: [
        txt({ x: 60, y: 200, w: 200, h: 200, text: "“", fontFamily: "Georgia, serif", fontSize: 240, color: "#a78bfa", fontWeight: 700, align: "left", lineHeight: 1 }),
        txt({ x: 100, y: 380, w: 880, h: 360, text: "এখানে আপনার অনুপ্রেরণামূলক উক্তি দিন।", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 56, color: "#ffffff", fontWeight: 600, align: "center", lineHeight: 1.35 }),
        txt({ x: 100, y: 800, w: 880, h: 60, text: "— লেখকের নাম", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 32, color: "#a78bfa", align: "center", fontWeight: 600 }),
      ],
    },
  },
  // 5. Image-heavy social post
  {
    id: "social-image",
    name: "সোশ্যাল ইমেজ পোস্ট",
    category: "social",
    doc: {
      ...SQ,
      background: { type: "color", color: "#000000", gradientFrom: "#000", gradientTo: "#000", gradientAngle: 0, imageSrc: "", imageFit: "cover" },
      layers: [
        img({ x: 0, y: 0, w: 1080, h: 1080, radius: 0, fit: "cover" }),
        txt({ x: 0, y: 760, w: 1080, h: 320, text: "", fontFamily: "Inter, sans-serif", fontSize: 12, color: "#000", bg: "rgba(0,0,0,0.7)", padding: 0, radius: 0 }),
        txt({ x: 60, y: 800, w: 960, h: 140, text: "আপনার শিরোনাম", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 72, color: "#ffffff", fontWeight: 800, align: "left", shadow: true }),
        txt({ x: 60, y: 960, w: 960, h: 70, text: "ছোট বিবরণ এখানে দিন", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 30, color: "#e2e8f0", align: "left", fontWeight: 500 }),
      ],
    },
  },
  // 6. Question of the day (Target brand)
  {
    id: "qotd",
    name: "প্রশ্ন কার্ড",
    category: "info",
    doc: {
      ...SQ,
      background: { type: "gradient", color: "#1d4ed8", gradientFrom: "#2563eb", gradientTo: "#1e40af", gradientAngle: 135, imageSrc: "", imageFit: "cover" },
      layers: [
        txt({ x: 60, y: 80, w: 960, h: 80, text: "🎯 প্রশ্ন অব দ্য ডে", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 44, color: "#ffffff", fontWeight: 700, align: "center" }),
        txt({ x: 80, y: 220, w: 920, h: 460, text: "এখানে আপনার MCQ প্রশ্ন বসান। দীর্ঘ হলে ফন্ট সাইজ কমিয়ে নিন।", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 52, color: "#ffffff", fontWeight: 700, align: "center", lineHeight: 1.3, bg: "rgba(255,255,255,0.1)", padding: 32, radius: 24 }),
        txt({ x: 80, y: 720, w: 920, h: 80, text: "(ক) অপশন A    (খ) অপশন B", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 32, color: "#dbeafe", align: "center", fontWeight: 500 }),
        txt({ x: 80, y: 810, w: 920, h: 80, text: "(গ) অপশন C    (ঘ) অপশন D", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 32, color: "#dbeafe", align: "center", fontWeight: 500 }),
        txt({ x: 60, y: 980, w: 960, h: 60, text: "উত্তর জানতে কমেন্টে লিখুন 👇", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 28, color: "#facc15", align: "center", fontWeight: 600 }),
      ],
    },
  },
  // 7. Minimal announcement
  {
    id: "minimal-announce",
    name: "মিনিমাল ঘোষণা",
    category: "info",
    doc: {
      ...SQ,
      background: { type: "color", color: "#ffffff", gradientFrom: "#fff", gradientTo: "#fff", gradientAngle: 0, imageSrc: "", imageFit: "cover" },
      layers: [
        txt({ x: 60, y: 60, w: 200, h: 60, text: "ANNOUNCEMENT", fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "#dc2626", fontWeight: 700, letterSpacing: 4 }),
        txt({ x: 60, y: 200, w: 960, h: 400, text: "এখানে বড় শিরোনাম\nবসান এখানে", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 96, color: "#0f172a", fontWeight: 800, lineHeight: 1.1 }),
        txt({ x: 60, y: 720, w: 960, h: 200, text: "বিস্তারিত বিবরণ এখানে। এক বা দুই লাইনে সংক্ষিপ্ত রাখুন।", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 36, color: "#475569", fontWeight: 400, lineHeight: 1.5 }),
        txt({ x: 60, y: 980, w: 960, h: 50, text: "@yourhandle", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 28, color: "#94a3b8", fontWeight: 600 }),
      ],
    },
  },
  // 8. Telegram channel post (1280x720)
  {
    id: "telegram-post",
    name: "টেলিগ্রাম পোস্ট",
    category: "telegram",
    doc: {
      width: 1280, height: 720,
      background: { type: "gradient", color: "#0ea5e9", gradientFrom: "#0ea5e9", gradientTo: "#0369a1", gradientAngle: 135, imageSrc: "", imageFit: "cover" },
      layers: [
        img({ x: 60, y: 60, w: 480, h: 600, radius: 24 }),
        txt({ x: 600, y: 100, w: 620, h: 60, text: "📢 টেলিগ্রাম আপডেট", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 36, color: "#bae6fd", fontWeight: 600 }),
        txt({ x: 600, y: 200, w: 620, h: 280, text: "আপনার শিরোনাম এখানে", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 64, color: "#ffffff", fontWeight: 800, lineHeight: 1.2 }),
        txt({ x: 600, y: 520, w: 620, h: 100, text: "সংক্ষিপ্ত বিবরণ", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 30, color: "#e0f2fe", fontWeight: 500, lineHeight: 1.4 }),
        txt({ x: 600, y: 640, w: 620, h: 50, text: "t.me/yourchannel", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 26, color: "#fef08a", fontWeight: 700 }),
      ],
    },
  },
  // 9. Telegram square (1080x1080)
  {
    id: "telegram-square",
    name: "টেলিগ্রাম স্কয়ার",
    category: "telegram",
    doc: {
      ...SQ,
      background: { type: "gradient", color: "#1e293b", gradientFrom: "#0f766e", gradientTo: "#134e4a", gradientAngle: 135, imageSrc: "", imageFit: "cover" },
      layers: [
        txt({ x: 60, y: 60, w: 960, h: 60, text: "📡 TARGET", fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, color: "#5eead4", fontWeight: 700, letterSpacing: 6 }),
        img({ x: 60, y: 160, w: 960, h: 540, radius: 24 }),
        txt({ x: 60, y: 740, w: 960, h: 160, text: "আপনার শিরোনাম এখানে", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 60, color: "#ffffff", fontWeight: 800, lineHeight: 1.2 }),
        txt({ x: 60, y: 920, w: 960, h: 60, text: "👉 t.me/yourchannel দিয়ে জয়েন করুন", fontFamily: "'Hind Siliguri', sans-serif", fontSize: 30, color: "#fef08a", fontWeight: 600 }),
      ],
    },
  },
];
