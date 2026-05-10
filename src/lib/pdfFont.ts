import jsPDF from "jspdf";

// Loads a Bengali-capable Unicode TTF and registers it on the jsPDF instance.
// Uses Noto Sans Bengali (regular + bold) via jsDelivr CDN, then caches the
// base64-encoded payload in localStorage so subsequent generations are instant.

const FONT_URLS = {
  regular:
    "https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSansBengali/hinted/ttf/NotoSansBengali-Regular.ttf",
  bold: "https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSansBengali/hinted/ttf/NotoSansBengali-Bold.ttf",
};

const CACHE_KEYS = {
  regular: "pdf-font-noto-bn-regular-v1",
  bold: "pdf-font-noto-bn-bold-v1",
};

async function fetchFontAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Font fetch failed (${response.status})`);
  const buffer = await response.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

async function loadOne(url: string, cacheKey: string): Promise<string> {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached && cached.length > 1000) return cached;
  } catch {
    /* localStorage unavailable */
  }
  const data = await fetchFontAsBase64(url);
  try {
    localStorage.setItem(cacheKey, data);
  } catch {
    /* quota exceeded — ignore */
  }
  return data;
}

let fontPromise: Promise<{ regular: string; bold: string }> | null = null;

export function preloadBengaliFont() {
  if (!fontPromise) {
    fontPromise = Promise.all([
      loadOne(FONT_URLS.regular, CACHE_KEYS.regular),
      loadOne(FONT_URLS.bold, CACHE_KEYS.bold),
    ]).then(([regular, bold]) => ({ regular, bold }));
  }
  return fontPromise;
}

export async function registerBengaliFont(pdf: jsPDF) {
  const { regular, bold } = await preloadBengaliFont();
  pdf.addFileToVFS("NotoSansBengali-Regular.ttf", regular);
  pdf.addFont("NotoSansBengali-Regular.ttf", "NotoBn", "normal");
  pdf.addFileToVFS("NotoSansBengali-Bold.ttf", bold);
  pdf.addFont("NotoSansBengali-Bold.ttf", "NotoBn", "bold");
  pdf.setFont("NotoBn", "normal");
}