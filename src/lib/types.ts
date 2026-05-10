export interface Question {
  id: string;
  question: string;
  questionImage?: string; // base64 data URL
  options: string[];
  optionImages?: (string | null)[]; // base64 data URLs per option
  answer: string;
  explanation: string;
  type: string;
  section: string;
}

export interface Section {
  id: string;
  name: string;
  description: string;
  image?: string; // base64 data URL
  caption?: string;
  order: number;
  createdAt: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  light: ThemeColors;
  dark: ThemeColors;
}

export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  success: string;
  warning: string;
}

export interface SiteSettings {
  aboutTitle: string;
  aboutContent: string;
  featuresTitle: string;
  featuresContent: string;
  contactTitle: string;
  contactContent: string;
  footerDescription: string;
  footerLinks: { label: string; url: string }[];
  socialLinks: { label: string; url: string }[];
  brandName: string;
  brandEmoji: string;
  heroTagline: string;
  heroSubtitle: string;
  activeThemeId: string;
  customTheme?: { light: ThemeColors; dark: ThemeColors };
  uiLabels?: Record<string, string>;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  category: string;
  chapter: string;
  sectionId?: string;
  difficulty: "easy" | "medium" | "hard";
  questionCount: number;
  duration: number; // minutes
  negativeMarking: number; // e.g. 0, 0.25, 0.5, 1
  questions: Question[];
  published: boolean;
  featured: boolean;
  createdAt: string;
  mandatorySubjects: string[]; // subjects that students must attempt
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  image?: string; // base64 data URL (recommended: 800x450px, 16:9 ratio)
  pinned: boolean;
  createdAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  color: string;
  createdAt: string;
}

export interface EventBanner {
  id: string;
  image: string; // base64 data URL
  caption: string;
  targetDate: string; // ISO date-time string
  active: boolean;
  createdAt: string;
}

export interface SubjectBreakdown {
  subject: string;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  negativeMarks: number;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface ExamResult {
  examId: string;
  examTitle: string;
  totalQuestions: number;
  correct: number;
  wrong: number;
  skipped: number;
  negativeMarks: number;
  finalScore: number;
  maxScore: number;
  percentage: number;
  answers: Record<string, string>;
  timestamp: string;
  selectedSubjects?: string[];
  subjectBreakdown?: SubjectBreakdown[];
}
