## লক্ষ্য

লাইভ এক্সাম রিপোর্ট ও লিডারবোর্ডকে প্রফেশনাল ও কনফিগারেবল করা — চারটি উন্নয়ন একসাথে।

---

### 1. PDF রিপোর্টে কাস্টমাইজেবল থিম + ফুটার

`SiteSettings`-এ নতুন ফিল্ড যোগ:

```ts
reportSettings?: {
  themeId: string;             // "blue" | "green" | "maroon" | "black-gold" | "purple" | "custom"
  customHeader?: string;       // hex (যখন themeId === "custom")
  customAccent?: string;       // hex
  footerText: string;          // "Target — Smart Exam Platform"
  footerLinks: { label: string; url: string }[]; // Website / Facebook / Telegram
}
```

- `src/lib/types.ts` + `src/lib/api.ts` (default + DB column `report_settings jsonb`) আপডেট।
- নতুন migration: `site_settings.report_settings jsonb`।
- নতুন এডমিন পেজ সেকশন `AdminThemeSettings`-এর ভেতরে "PDF রিপোর্ট থিম" — প্রিসেট সিলেক্টর + কালার পিকার (যখন custom) + footer text + লিংক ম্যানেজমেন্ট (Website/Facebook/Telegram, Add/Remove)।

---

### 2. PDF রিপোর্টের নতুন প্রফেশনাল লেআউট

`AdminLiveExams.tsx` → `exportLeaderboardPDF` রি-রাইট:

- হেডার ব্যান্ড — থিম কালার থেকে।
- **পডিয়াম ব্লক** (টপ ৩): 1st center (largest gold tile), 2nd left silver, 3rd right bronze। প্রতিটি tile-এ — avatar (rounded image, fall back to initials), নাম, batch, score, percent।
- নিচে full leaderboard টেবিল — প্রতিটি row-এ avatar (small thumbnail) যোগ। autoTable-এর `didDrawCell` hook দিয়ে cell-এ image draw করব।
- avatar URL fetch: `profiles.avatar_url`; PDF embed করার জন্য আগে fetch → base64 convert → `doc.addImage` (jsPDF)।
- ফুটার: কনফিগারেবল text + clickable links (`doc.textWithLink`)।
- থিম কালার dynamic (RGB tuple)।

---

### 3. Student `/live-exams` portal-এ সরাসরি লিডারবোর্ড

`StudentLiveExams.tsx`-এ নতুন সেকশন: **"সম্পন্ন পরীক্ষা ও ফলাফল"**।

- ফেচ: `live_exams` যেগুলো `status === "ended"`, অথবা `status === "live"` কিন্তু ইউজার ইতোমধ্যে submit করেছে।
- প্রতিটি কার্ডে — title, date, "র‍্যাঙ্কিং দেখুন" বাটন → modal/expand করে full leaderboard (top-3 podium + list) দেখাবে; ইউজারের রো highlighted।
- পরীক্ষার শুরুর বাটনে ক্লিক করতে হবে না।
- Live ranking দেখানোর শর্ত (চলমান exam-এ): `show_leaderboard` সত্য হলেই, কেবল submit করার পর।

---

### 4. `LiveExamAttempt` — চলমান অবস্থায় leaderboard লুকানো

- চলমান অবস্থায় "লাইভ র‍্যাঙ্কিং" panel সরিয়ে দেওয়া (cheating prevention)।
- শুধু submit-এর পর full ranking দেখাবে — যেটা ইতোমধ্যে আছে।

---

### টেকনিক্যাল ডিটেইল

- jsPDF avatar embed: `fetch(url).then(blob → FileReader → dataURL)` → `doc.addImage(dataUrl, 'JPEG', x, y, w, h)`। CORS-friendly URL দরকার (Supabase storage সাধারণত OK)।
- Avatar না থাকলে initial-circle fallback canvas-এ draw করব (`doc.circle` + `doc.text`)।
- `themePresets.ts`-এর pattern ফলো করে `reportThemePresets.ts` বানাব।
- Migration: শুধু `ALTER TABLE site_settings ADD COLUMN report_settings jsonb`।

---

### ফাইল পরিবর্তন

| ফাইল | কাজ |
|---|---|
| `supabase/migrations/<new>.sql` | `report_settings` column |
| `src/lib/types.ts` | `SiteSettings.reportSettings` |
| `src/lib/api.ts` | default + read/write |
| `src/lib/reportThemePresets.ts` (new) | ৫টি প্রিসেট |
| `src/pages/admin/AdminThemeSettings.tsx` | নতুন UI সেকশন |
| `src/pages/admin/AdminLiveExams.tsx` | নতুন PDF লেআউট (podium + avatars + theme + footer) |
| `src/pages/student/StudentLiveExams.tsx` | "সম্পন্ন পরীক্ষা" সেকশন + leaderboard modal |
| `src/pages/student/LiveExamAttempt.tsx` | চলমান অবস্থায় ranking hide |
