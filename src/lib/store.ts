import { Exam, ExamResult, Notice, Reminder, Section, SiteSettings, EventBanner } from "./types";
import { demoExams, demoNotices, subjects as defaultSubjects, categories as defaultCategories } from "./data";

const EXAMS_KEY = "target_exams";
const NOTICES_KEY = "target_notices";
const RESULTS_KEY = "target_results";
const ADMIN_KEY = "target_admin";
const SECTIONS_KEY = "target_sections";
const SITE_SETTINGS_KEY = "target_site_settings";
const SUBJECTS_KEY = "target_subjects";
const CATEGORIES_KEY = "target_categories";
const REMINDERS_KEY = "target_reminders";
const EVENT_BANNERS_KEY = "target_event_banners";
const WRONG_ANSWERS_KEY = "target_wrong_answers";

const defaultSiteSettings: SiteSettings = {
  aboutTitle: "Target 🎯 কী?",
  aboutContent: "<p>Target 🎯 একটি আধুনিক শিক্ষামূলক পরীক্ষা অনুশীলন প্ল্যাটফর্ম। এখানে শিক্ষার্থীরা বিভিন্ন বিষয়ের MCQ পরীক্ষায় সীমাহীনভাবে অংশগ্রহণ করতে পারবেন। প্রতিটি পরীক্ষায় প্রশ্ন ও অপশন এলোমেলোভাবে সাজানো হয়, যা প্রকৃত পরীক্ষার অভিজ্ঞতা প্রদান করে।</p>",
  featuresTitle: "বৈশিষ্ট্যসমূহ",
  featuresContent: "<ul><li>সীমাহীন পরীক্ষা অনুশীলন</li><li>স্বয়ংক্রিয় প্রশ্ন ও অপশন র‍্যান্ডমাইজেশন</li><li>বিস্তারিত ফলাফল ও ব্যাখ্যা</li><li>বিষয়ভিত্তিক পরীক্ষা ব্রাউজিং</li><li>মোবাইল ফ্রেন্ডলি ডিজাইন</li></ul>",
  contactTitle: "যোগাযোগ",
  contactContent: "<p>আমাদের সাথে Telegram এ যোগাযোগ করুন।</p>",
  footerDescription: "আপনার পরীক্ষার প্রস্তুতি এখন আরও সহজ। অনুশীলন করুন, শিখুন, সফল হোন।",
  footerLinks: [
    { label: "পরীক্ষা সমূহ", url: "/exams" },
    { label: "ফলাফল", url: "/results" },
    { label: "নোটিস বোর্ড", url: "/notices" },
    { label: "সম্পর্কে", url: "/about" },
  ],
  socialLinks: [
    { label: "Telegram", url: "https://t.me/FX_Ur_Target" },
  ],
  brandName: "Target",
  brandEmoji: "🎯",
  heroTagline: "সীমাহীন অনুশীলন, নিখুঁত প্রস্তুতি",
  heroSubtitle: "",
  activeThemeId: "ocean-blue",
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

export const store = {
  getExams: (): Exam[] => load(EXAMS_KEY, demoExams),
  setExams: (exams: Exam[]) => save(EXAMS_KEY, exams),

  getNotices: (): Notice[] => load(NOTICES_KEY, demoNotices),
  setNotices: (notices: Notice[]) => save(NOTICES_KEY, notices),

  getResults: (): ExamResult[] => load(RESULTS_KEY, []),
  setResults: (results: ExamResult[]) => save(RESULTS_KEY, results),
  addResult: (result: ExamResult) => {
    const results = load<ExamResult[]>(RESULTS_KEY, []);
    results.unshift(result);
    save(RESULTS_KEY, results);
  },

  getSections: (): Section[] => load(SECTIONS_KEY, []),
  setSections: (sections: Section[]) => save(SECTIONS_KEY, sections),

  getSiteSettings: (): SiteSettings => load(SITE_SETTINGS_KEY, defaultSiteSettings),
  setSiteSettings: (settings: SiteSettings) => save(SITE_SETTINGS_KEY, settings),

  getSubjects: (): string[] => load(SUBJECTS_KEY, defaultSubjects),
  setSubjects: (s: string[]) => save(SUBJECTS_KEY, s),

  getCategories: (): string[] => load(CATEGORIES_KEY, defaultCategories),
  setCategories: (c: string[]) => save(CATEGORIES_KEY, c),

  getReminders: (): Reminder[] => load(REMINDERS_KEY, []),
  setReminders: (r: Reminder[]) => save(REMINDERS_KEY, r),

  getEventBanners: (): EventBanner[] => load(EVENT_BANNERS_KEY, []),
  setEventBanners: (b: EventBanner[]) => save(EVENT_BANNERS_KEY, b),

  getWrongAnswers: <T>() => load<T[]>(WRONG_ANSWERS_KEY, []),
  setWrongAnswers: <T>(entries: T[]) => save(WRONG_ANSWERS_KEY, entries),

  isAdmin: (): boolean => load(ADMIN_KEY, false),
  setAdmin: (val: boolean) => save(ADMIN_KEY, val),
};
