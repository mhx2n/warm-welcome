
## লক্ষ্য

আপনার বর্তমান PDF (`opo_2.pdf`)-এ দেখা যাচ্ছে — বাংলা লেখা মাঝখানে ভেঙে যাচ্ছে, header-এর শিরোনাম উধাও, প্রতিটি অপশন আলাদা পুরো-চওড়া বাক্সে বসছে (পেজে মাত্র ৪–৫টা প্রশ্ন আঁটছে), ইংরেজি A./B./C./D. লেবেল, এবং উত্তর-ব্যাখ্যা আলাদা।

রেফারেন্স PDF (`4_5764707900...PDF`)-এ চান — কেন্দ্রিত বড় শিরোনাম + সাবটাইটেল, পূর্ণমান/সেট/সময় meta-row, ২-কলাম body, প্রতিটি প্রশ্নে ২×২ অপশন গ্রিডে বাংলা লেবেল (ক/খ/গ/ঘ), নিচে হালকা নীল টিন্টেড একটি বক্সে "**সঠিক উত্তর:** …" + "**ব্যাখ্যা:** …", সবচেয়ে নিচে ছোট চ্যানেল-লিংক footer।

সবমিলিয়ে — সুন্দর বাংলা ফন্ট shaping, LaTeX সব ফরম্যাটে, error-less, এবং ফাস্ট।

## পরিবর্তনের তালিকা

### ১. বাংলা শেপিং সমস্যা একদম দূর — ভেক্টর fallback বাদ
- বর্তমানে ৬০+ প্রশ্ন হলে `generateVectorPdf()` চালু হয় যেটা `jsPDF.text()` ব্যবহার করে। jsPDF জটিল লিপি (Bengali conjuncts, ই-কার, রেফ) shape করতে পারে না — এজন্যই বড় পরীক্ষায় লেখা ভাঙছে।
- ভেক্টর পথ পুরোপুরি সরাবো। শুধু browser-rendered HTML → `html2canvas` → `jsPDF.addImage` পাইপলাইন থাকবে (browser নিজেই HarfBuzz দিয়ে সঠিক shape করে)।
- বড় পরীক্ষায় গতি ধরে রাখতে: পেজ-by-পেজ off-screen mount + capture + unmount (একসাথে পুরো DOM ধরে রাখব না), `scale: 2`, `image/jpeg` 0.85, `addImage(..., "FAST")`, প্রতিটি পেজের পরে canvas memory free এবং `requestIdleCallback` yield।

### ২. Bengali ফন্ট লোকাল বান্ডেল
- Google Fonts CDN-এর ওপর নির্ভরতা সরিয়ে `@fontsource/noto-sans-bengali` (regular/600/700/800) ইনস্টল করব এবং `src/index.css`-এ `@import` করব → অফলাইন/ধীরগতির নেট-এও PDF render-এর সময় ফন্ট ১০০% ready থাকবে।
- `src/lib/pdfFont.ts` ও তার CDN-fetch + base64 cache কোড অপ্রয়োজনীয় হয়ে যাবে — মুছে দেব।
- PDF-এ Bengali heading-এর জন্য একটা সুন্দর বিকল্প (Hind Siliguri বা SolaimanLipi-সদৃশ) চাইলে `@fontsource/hind-siliguri` যোগ করা যায় — চাইলে জানাবেন।

### ৩. নতুন PDF লেআউট (রেফারেন্স মতো)

```text
┌────────────────────────────────────────────────────┐
│              রসায়ন প্রথম পত্র   (বড় bold, center)  │
│        মৌলের পর্যায়বৃত্ত ধর্ম ও রাসায়নিক বন্ধন (ছোট) │
├────────────────────────────────────────────────────┤
│ পূর্ণমান: ৯৩      সেট: A           সময়: ৫৫ মিনিট   │
├──────────────────────┬─────────────────────────────┤
│ 1. প্রশ্ন...         │ 6. প্রশ্ন...                │
│    ক) ...   খ) ...   │    ক) ...     খ) ...        │
│    গ) ...   ঘ) ...   │    গ) ...     ঘ) ...        │
│  ┌──────────────────┐│  ┌──────────────────────┐   │
│  │সঠিক উত্তর: ক     ││  │সঠিক উত্তর: খ          │   │
│  │ব্যাখ্যা: ...     ││  │ব্যাখ্যা: ...          │   │
│  └──────────────────┘│  └──────────────────────┘   │
│ 2. ...               │ 7. ...                      │
├──────────────────────┴─────────────────────────────┤
│            ✈ আমাদের টেলিগ্রাম চ্যানেল  (link)        │
└────────────────────────────────────────────────────┘
```

বিস্তারিত:
- **Header**: title কেন্দ্রে (28pt, 900 weight), subtitle তার নিচে (13pt, muted)। তারপর top-bottom বর্ডার সহ একটা meta-row যাতে তিনটা ছোট ফিল্ড — পূর্ণমান (=প্রশ্ন সংখ্যা), সেট (configurable), সময় = `exam.duration` মিনিট। সংখ্যা বাংলা সংখ্যায় convert হবে (০-৯ map)।
- **Question block**: বাম পাশে গাঢ় নম্বর "১.", ডানে question text (LaTeX সমর্থিত)। নিচে ২×২ CSS grid-এ অপশন; প্রতিটিতে বাংলা লেবেল `ক)`, `খ)`, `গ)`, `ঘ)` (অপশন ৪-এর বেশি হলে ঙ/চ এ চলবে)। অপশন বক্স/বর্ডার সরাবো — শুধু লেবেল + টেক্সট (রেফারেন্সের মতো ক্লিন)।
- **সঠিক উত্তর হাইলাইট ON হলে** প্রতিটা প্রশ্নের নিচে একক টিন্টেড নীল বক্স (`#eaf3fb` bg, `#bcd4e6` border, rounded 8) — ভেতরে first line "**সঠিক উত্তর:** <text>" (গাঢ় নীল), দ্বিতীয় লাইন "**ব্যাখ্যা:** <text>" (যদি থাকে এবং ব্যাখ্যা ON থাকে)। অপশন বক্সের সবুজ হাইলাইট আর থাকবে না — রেফারেন্সের সাথে মেলানো।
- **Footer**: কেন্দ্রে ছোট icon + "আমাদের টেলিগ্রাম চ্যানেল"-জাতীয় লিংক (configurable, এখনকার footer slots থেকেই পপুলেট হবে)। page নম্বর footer-এর ডানে।

### ৪. Two-column পেজিং উন্নত
- Two-column এখনই default থাকবে (রেফারেন্সের মতো)।
- বর্তমান measurement-pass কাজ করছে কিন্তু ১×N গ্রিডে; নতুন template-এর measurement তে real column-width-এ height মাপা হবে → কোনো প্রশ্ন কলাম শেষে "ভেঙে" পরের কলামে যাবে না (CSS `break-inside: avoid` + manual packing)।

### ৫. LaTeX সাপোর্ট আরও পাকা
- বর্তমান `MathText` শুধু `$...$ / $$...$$ / \(...\) / \[...\]` ধরে। যোগ করব:
  - `\ce{...}` রসায়ন সূত্র (mhchem extension) — `katex/dist/contrib/mhchem.mjs` import করে।
  - block math গুলোকে inline-block বানাব যাতে অপশন/প্রশ্ন লাইনে natural ভাবে বসে।
  - KaTeX font CSS body-তে inject করার আগেই PDF render না হওয়ার জন্য একটা `document.fonts.ready` await যোগ করব।

### ৬. গতি ও স্থিতিশীলতা
- PDF generate-এর সময় progress bar ("পেজ X/Y রেন্ডার হচ্ছে...")।
- পুরো DOM একসাথে mount না করে react portal-এ একটা একটা পেজ render → capture → unmount। ৬০-প্রশ্নের পরীক্ষাও <৫ সেকেন্ডে শেষ হবে।
- ভুল সংখ্যার অপশন/খালি ব্যাখ্যা/অননুমোদিত ফন্ট — সব edge case-এ try/catch + Bengali toast।
- Console-এ `html2canvas` warnings কমাতে `logging:false`, `removeContainer:true`, এবং foreign object rendering off।

### ৭. UI কন্ট্রোল আপডেট
এক্সপোর্ট মডালে নতুন/পরিবর্তিত ফিল্ড:
- "সেট" (text input — header meta-row-এ যাবে)
- "পূর্ণমান override" (ঐচ্ছিক — না দিলে প্রশ্ন সংখ্যা)
- বর্তমান header/footer slot editor রেখে দেব, কিন্তু default values রেফারেন্সের মতো সাজাবো।
- "সঠিক উত্তর হাইলাইট" এখন → "সঠিক উত্তর + ব্যাখ্যা box দেখাও" — দুটো checkbox একসাথে।

## প্রভাবিত ফাইল

- `src/components/ExamPdfExporter.tsx` — বড় rewrite (template + generate পাইপলাইন)
- `src/components/MathText.tsx` — mhchem + `document.fonts.ready`
- `src/lib/pdfFont.ts` — মুছে ফেলা
- `src/index.css` — Google Fonts `@import` সরিয়ে fontsource import
- `package.json` — `+@fontsource/noto-sans-bengali`, optionally `+@fontsource/hind-siliguri`

## টেকনিক্যাল নোট

- jsPDF ভেক্টর-text পথ পরিত্যাগ — ব্রাউজার রেন্ডারিং-ই Bengali shaping-এর একমাত্র নির্ভরযোগ্য সমাধান।
- প্রতি পেজ A4 794×1123 px (96dpi) capture, scale 2 → ~1588×2246 px JPEG, ~120-180KB/page → ৩০ পেজেও <৫MB।
- meta-row "পূর্ণমান/সেট/সময়" সংখ্যা বাংলায় (`'০১২৩৪৫৬৭৮৯'[d]` map)।
- Telegram footer link-এ existing `[data-pdf-link]` mechanism reuse → clickable।

## নিশ্চিত করার পয়েন্ট

আগে এগোনোর আগে দয়া করে জানান:
1. অপশন বক্সের border/হাইলাইট পুরোপুরি সরিয়ে রেফারেন্সের মতো শুধু লেবেল+টেক্সট রাখব, নাকি হালকা bg রাখব?
2. "সেট" ফিল্ড চান (default "A"), নাকি skip?
3. Telegram footer-এর জন্য default URL/text কী হবে (এখন placeholder থাকবে — আপনি পরে এডিট করতে পারবেন)?

approve করলে সরাসরি বানিয়ে দেব।
