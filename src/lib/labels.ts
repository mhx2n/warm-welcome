import { getCachedSettings } from "@/contexts/SiteSettingsContext";

// Default labels - these are the fallback values
export const defaultLabels: Record<string, string> = {
  // Navbar
  navHome: "হোম",
  navExams: "পরীক্ষা",
  navResults: "ফলাফল",
  navNotices: "নোটিস",
  navProfile: "প্রোফাইল",
  navAbout: "সম্পর্কে",

  // Homepage
  searchPlaceholder: "পরীক্ষা খুঁজুন...",
  ctaExams: "পরীক্ষা দিন",
  ctaResults: "ফলাফল দেখুন",
  statTotalExams: "মোট পরীক্ষা",
  statSubjects: "বিষয়",
  statPractice: "অনুশীলন",
  statNotices: "নোটিস",
  recentResults: "📊 সাম্প্রতিক ফলাফল",
  viewAll: "সব দেখুন",
  noticeBoard: "নোটিস বোর্ড",
  featuredExams: "⭐ বিশেষ পরীক্ষা",
  allExams: "📝 সকল পরীক্ষা",
  viewMore: "আরও দেখুন",
  pinned: "📌 পিন",

  // Exam Card
  startExam: "পরীক্ষা শুরু করুন",
  questions: "প্রশ্ন",
  minutes: "মিনিট",
  diffEasy: "সহজ",
  diffMedium: "মাঝারি",
  diffHard: "কঠিন",

  // Exams Page
  examsPageTitle: "📝 পরীক্ষা সমূহ",
  tabSections: "সেকশন",
  tabSubjects: "বিষয়",
  searchHint: "খুঁজুন...",
  allSubjects: "সকল বিষয়",
  diffAll: "সকল",
  noSections: "কোনো সেকশন পাওয়া যায়নি",
  noExams: "কোনো পরীক্ষা পাওয়া যায়নি",
  examCount: "পরীক্ষা",
  viewSection: "দেখুন →",

  // Footer
  quickLinks: "দ্রুত লিঙ্ক",
  contact: "যোগাযোগ",
  allRightsReserved: "সকল স্বত্ব সংরক্ষিত",

  // Results
  resultsTitle: "📊 ফলাফল",

  // Notices
  noticesTitle: "📢 নোটিস বোর্ড",

  // Live Exam Page
  liveExamBadge: "লাইভ এক্সাম",
  liveExamHeroTitle: "লাইভ পরীক্ষা পোর্টাল",
  liveExamHeroSubtitle: "আপনার জন্য নির্ধারিত পরীক্ষাগুলো এখানে দেখা যাবে। সময়মত যোগ দিন এবং সর্বোচ্চ ফলাফল নিশ্চিত করুন।",
  liveExamStatNow: "এখন চলছে",
  liveExamStatUpcoming: "আসছে",
  liveExamSectionLive: "এখন চলছে",
  liveExamSectionUpcoming: "আসন্ন পরীক্ষা",
  liveExamEmptyTitle: "এখন কোনো লাইভ পরীক্ষা নেই",
  liveExamEmptySubtitle: "নতুন পরীক্ষার জন্য পরে দেখুন",
  liveExamJoinNow: "এখনই যোগ দিন",
  liveExamWait: "শুরু হলে যোগ দিন",
  liveExamJoining: "যোগ দিচ্ছে...",

  // Exam Details
  instructionsTitle: "নির্দেশাবলী",
  inst1: "প্রতিটি প্রশ্নের একটি সঠিক উত্তর আছে",
  inst2: "সময় শেষ হলে স্বয়ংক্রিয়ভাবে জমা হবে",
  inst3: "আপনি যতবার খুশি অনুশীলন করতে পারবেন",
  instNegative: "প্রতিটি ভুল উত্তরে",
  instNegativeSuffix: "নম্বর কাটা যাবে",
  examCategory: "আমদানি",
  subjectSelection: "বিষয় নির্বাচন করুন",
  subjectSelectionHint: "আপনি যে বিষয়গুলোতে পরীক্ষা দিতে চান সেগুলো নির্বাচন করুন।",
  selectedQuestions: "নির্বাচিত প্রশ্ন",
  mandatory: "বাধ্যতামূলক",
};

export function getLabel(key: string, fallback?: string): string {
  const settings = getCachedSettings();
  const custom = settings.uiLabels?.[key];
  if (custom) return custom;
  return defaultLabels[key] || fallback || key;
}
