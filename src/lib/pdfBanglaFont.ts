import type jsPDF from "jspdf";
import notoBengaliUrl from "@/assets/NotoSansBengali-Regular.ttf";

const FONT_NAME = "NotoBengali";
const FONT_FILE = "NotoSansBengali-Regular.ttf";

let cachedBase64: string | null = null;
let inflight: Promise<string | null> | null = null;

async function fetchFontBase64(): Promise<string | null> {
  if (cachedBase64) return cachedBase64;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(notoBengaliUrl);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      cachedBase64 = btoa(binary);
      return cachedBase64;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * Loads + registers Noto Sans Bengali into the given jsPDF document.
 * Returns true on success, false if it had to fall back to helvetica.
 */
export async function ensureBanglaFont(doc: jsPDF): Promise<boolean> {
  const b64 = await fetchFontBase64();
  if (!b64) return false;
  try {
    // @ts-ignore
    doc.addFileToVFS(FONT_FILE, b64);
    // @ts-ignore
    doc.addFont(FONT_FILE, FONT_NAME, "normal");
    // @ts-ignore
    doc.addFont(FONT_FILE, FONT_NAME, "bold");
    return true;
  } catch {
    return false;
  }
}

export const BANGLA_FONT = FONT_NAME;
