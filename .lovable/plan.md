
## লক্ষ্য
1. PDF-এ ম্যাথের ভগ্নাংশ (যেমন $\frac{a}{b}$) ভেঙে যাচ্ছে এবং জুম করলে ফেটে যাচ্ছে — দুটোই ঠিক করতে হবে।
2. ওয়েবসাইট ল্যাগ — PDF এক্সপোর্টার সবসময় mount/heavy import হচ্ছে, সেটা কমানো।
3. এডমিন একবার পছন্দমতো সেট করে "ডিফল্ট হিসেবে সেভ" করতে পারবে — পরের বার মোডাল খুললেই ঐ সেটিংসই থাকবে, শুধু "ডাউনলোড" চাপলেই হবে।

---

## ১. ম্যাথ ভগ্নাংশ বিচ্ছিন্ন হওয়ার সমাধান

বর্তমান কারণ: KaTeX রেন্ডার হচ্ছে `output: "html"` মোডে — এর ভেতরে অনেক `<span>` stack থাকে যেগুলো `html2canvas` সবসময় সঠিকভাবে align করতে পারে না (বিশেষত fraction bar মাঝখানে আঁকার জন্য সে absolute positioning ব্যবহার করে)। ফলে ভগ্নাংশের লাইনটা বা lower limit ভেঙে যায়।

ফিক্স:
- `renderInline()` -এ KaTeX আউটপুট `output: "mathml"` থেকে fallback সহ **`output: "htmlAndMathml"`** + আমরা প্রতিটি math এক্সপ্রেশনকে আগে থেকেই **SVG-তে কনভার্ট করে নেব** (KaTeX → temporary div → MathJax-style SVG নয় বরং `katex` রেন্ডার করে, তারপর সেই DOM-কে আলাদাভাবে **SVG হিসেবে serialize** করে inline `<img>`-এ বসাব)।
- বিকল্প আরও সহজ ও নির্ভরযোগ্য পথ (এটাই বেছে নেওয়া হবে): প্রতিটি math fragment-কে আলাদা off-screen div-এ রেন্ডার → `html2canvas(scale: 4)` দিয়ে **transparent PNG** → তারপর সেই PNG inline `<img>` হিসেবে বসানো। ফলে fraction bar/limits আর কখনোই ভাঙবে না, কারণ html2canvas পুরো math block-কে এক ইউনিট হিসেবে capture করে — পরে main page render করার সময় শুধু একটা ছোট ইমেজ বসছে, কোনো nested span re-flow নেই।
- ক্যাশ: একই LaTeX expression বার বার রেন্ডার এড়াতে in-memory `Map<string, dataUrl>` cache।

## ২. জুম করলে ফেটে যাওয়ার সমাধান (PDF কোয়ালিটি)

বর্তমানে পুরো A4 পেজকে JPEG (০.৮৫) হিসেবে বসানো হচ্ছে — এটাই raster, তাই zoom করলে blur।

পরিবর্তন:
- `addImage` ফরম্যাট **JPEG → PNG** (lossless) করব এবং default `renderScale` ২ → **৩** এ তুলব।
- `html2canvas` কে আরও sharp করতে: `letterRendering: true`, `imageTimeout: 0`, এবং স্পষ্টভাবে DPR-aware।
- সাইজ যাতে অতিরিক্ত না বাড়ে: math image-গুলো transparent PNG হলেও খুবই ছোট অংশ; পেজগুলো PNG হলে ~১.৫–৩ MB হবে (পুরোপুরি sharp)।
- "কোয়ালিটি" সেকশনে নতুন **"আউটপুট ফরম্যাট"** ড্রপডাউন: `PNG (sharp, একটু বড়)` / `JPEG (ছোট)` — ডিফল্ট PNG।

## ৩. ওয়েবসাইট ল্যাগ কমানো

কারণ:
- `ExamPdfExporter.tsx` পেজে আসা মাত্র `katex`, `katex.css`, `mhchem`, `html2canvas`, `jspdf` সবগুলো eagerly import হয় — bundle ভারী।

ফিক্স:
- যেখান থেকে এক্সপোর্টার ব্যবহার হয় সেখানে `React.lazy(() => import("@/components/ExamPdfExporter"))` + `Suspense` wrap। শুধু "PDF এক্সপোর্ট" বাটন ক্লিকে chunk লোড হবে।
- KaTeX CSS-ও exporter এর ভিতরে dynamic `import()` দিয়ে আনা হবে।
- `pdfFonts` এবং Google Fonts CSS link শুধু modal `open=true` হলে inject হবে (এখনই অনেকটা আছে — শুধু lazy chunk নিশ্চিত করব)।

## ৪. এডমিনের "ডিফল্ট হিসেবে সেভ"

বর্তমানে প্রতিবার মোডাল খুললে `DEFAULT_CFG` দিয়ে রিসেট হয়।

পরিবর্তন:
- `localStorage` key `target_pdf_default_cfg`-এ পুরো `PdfConfig` (logo data url সহ) JSON হিসেবে সেভ।
- এডমিন রোলে modal-এ ৩টা নতুন বাটন আসবে footer-bar-এ:
  - **"ডিফল্ট হিসেবে সেভ"** — বর্তমান cfg কে localStorage-এ সেভ।
  - **"ডিফল্টে রিসেট"** — saved default-এ ফিরিয়ে আনবে।
  - **"ফ্যাক্টরি রিসেট"** — saved default মুছে আবার `DEFAULT_CFG`।
- modal খোলার সময় load order: `savedDefault → DEFAULT_CFG`, এর সাথে ঐ exam-এর title/subject inject।
- (অপশনাল, পরে) এডমিন site-wide রাখতে চাইলে Supabase site_settings টেবিলের `pdfDefaultConfig` কলাম যুক্ত করা যাবে — তবে এই pass-এ শুধু localStorage যথেষ্ট, যেহেতু request "এডমিন এর পছন্দ default রাখা" — সাধারণত একই ব্রাউজার/ডিভাইস।

---

## ফাইল পরিবর্তনের তালিকা

1. **`src/components/ExamPdfExporter.tsx`** (প্রধান কাজ)
   - নতুন `renderMathToImage()` helper + cache; `renderInline()` math-গুলোকে `<img>` হিসেবে inject।
   - `buildPdf()`-এ JPEG → PNG (cfg ভিত্তিক), `renderScale` default 3।
   - cfg-এ নতুন ফিল্ড `outputFormat: "png" | "jpeg"`।
   - `loadDefaultCfg()` / `saveDefaultCfg()` / `clearDefaultCfg()` helper, modal খোলার `useEffect`-এ apply।
   - নতুন ৩টি বাটন UI।

2. **`src/components/ExamPdfExporter` ব্যবহারকারী ফাইল(গুলো)** — যেমন `AdminExams.tsx`, `AdminQuestions.tsx`, `StudentExamDetails.tsx` (যেটায় import আছে): static import → `lazy + Suspense`।

3. কোনো নতুন dependency দরকার নেই (katex, html2canvas, jspdf আগেই আছে)।

---

## টেস্ট/ভেরিফাই
- Math-heavy exam (যেমন ব্যবহারকারীর `Math_10.pdf`) এ এক্সপোর্ট করে দেখা: $\frac{x^2+1}{x-1}$, $\sqrt{a}$, $\sum$, integration — সব intact কিনা।
- ডাউনলোড করা PDF ৪০০% zoom-এ লেখা/ফর্মুলা শার্প কিনা।
- প্রথমবার সাইট লোডে `katex` chunk আলাদা হলো কিনা (network tab)।
- ডিফল্ট সেভ → মোডাল বন্ধ → আবার খুলে → একই সেটিংস কিনা।

আপনি অনুমোদন দিলেই এই প্ল্যান অনুযায়ী implement করব।
