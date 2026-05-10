import { Exam, Notice, Question } from "./types";

const makeQ = (
  id: string, q: string, opts: string[], ans: string, explanation: string, section: string
): Question => ({
  id, question: q, options: opts, answer: ans, explanation, type: "mcq", section,
});

export const demoQuestions: Question[] = [
  makeQ("q1", "বাংলাদেশের রাজধানী কোথায়?", ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা"], "ঢাকা", "ঢাকা বাংলাদেশের রাজধানী এবং বৃহত্তম শহর।", "সাধারণ জ্ঞান"),
  makeQ("q2", "পদ্মা সেতুর দৈর্ঘ্য কত?", ["৬.১৫ কি.মি.", "৫.৫ কি.মি.", "৭.২ কি.মি.", "৪.৮ কি.মি."], "৬.১৫ কি.মি.", "পদ্মা সেতুর মোট দৈর্ঘ্য ৬.১৫ কিলোমিটার।", "সাধারণ জ্ঞান"),
  makeQ("q3", "H₂O এর সংকেত কিসের?", ["পানি", "অক্সিজেন", "হাইড্রোজেন", "কার্বন"], "পানি", "H₂O হলো পানির রাসায়নিক সংকেত।", "রসায়ন"),
  makeQ("q4", "2 + 2 × 3 = ?", ["8", "10", "12", "6"], "8", "গুণ আগে হয়: 2 × 3 = 6, তারপর 2 + 6 = 8।", "গণিত"),
  makeQ("q5", "সূর্য কোন দিকে ওঠে?", ["পূর্ব", "পশ্চিম", "উত্তর", "দক্ষিণ"], "পূর্ব", "সূর্য সর্বদা পূর্ব দিকে উদিত হয়।", "ভূগোল"),
  makeQ("q6", "বাংলা ভাষায় স্বরবর্ণ কয়টি?", ["১১", "১০", "১২", "৯"], "১১", "বাংলা ভাষায় মোট ১১টি স্বরবর্ণ রয়েছে।", "বাংলা"),
  makeQ("q7", "আলোর গতি প্রতি সেকেন্ডে কত?", ["৩×১০⁸ মি/সে", "৩×১০⁶ মি/সে", "৩×১০¹⁰ মি/সে", "৩×১০⁴ মি/সে"], "৩×১০⁸ মি/সে", "আলো প্রতি সেকেন্ডে প্রায় ৩ × ১০⁸ মিটার যায়।", "পদার্থবিজ্ঞান"),
  makeQ("q8", "CPU এর পূর্ণরূপ কী?", ["Central Processing Unit", "Central Program Unit", "Computer Processing Unit", "Central Processor Unit"], "Central Processing Unit", "CPU = Central Processing Unit।", "কম্পিউটার"),
  makeQ("q9", "পৃথিবীর বৃহত্তম মহাসাগর কোনটি?", ["প্রশান্ত মহাসাগর", "আটলান্টিক মহাসাগর", "ভারত মহাসাগর", "আর্কটিক মহাসাগর"], "প্রশান্ত মহাসাগর", "প্রশান্ত মহাসাগর পৃথিবীর সবচেয়ে বড় মহাসাগর।", "ভূগোল"),
  makeQ("q10", "DNA এর পূর্ণরূপ কী?", ["Deoxyribonucleic Acid", "Diribonucleic Acid", "Deoxyribose Acid", "Dynamic Nucleic Acid"], "Deoxyribonucleic Acid", "DNA = Deoxyribonucleic Acid।", "জীববিজ্ঞান"),
];

export const demoExams: Exam[] = [
  {
    id: "exam-1",
    title: "সাধারণ জ্ঞান পরীক্ষা - সেট ১",
    subject: "সাধারণ জ্ঞান",
    category: "বিসিএস প্রস্তুতি",
    chapter: "বাংলাদেশ বিষয়াবলী",
    difficulty: "easy",
    questionCount: 5,
    duration: 10,
    negativeMarking: 0.25,
    questions: demoQuestions.slice(0, 5),
    published: true,
    featured: true,
    createdAt: "2026-03-01",
    mandatorySubjects: [],
  },
  {
    id: "exam-2",
    title: "বিজ্ঞান MCQ পরীক্ষা",
    subject: "বিজ্ঞান",
    category: "এসএসসি প্রস্তুতি",
    chapter: "পদার্থ ও রসায়ন",
    difficulty: "medium",
    questionCount: 5,
    duration: 15,
    negativeMarking: 0.25,
    questions: demoQuestions.slice(3, 8),
    published: true,
    featured: true,
    createdAt: "2026-03-05",
    mandatorySubjects: [],
  },
  {
    id: "exam-3",
    title: "মিশ্র বিষয় পরীক্ষা",
    subject: "মিশ্র",
    category: "চাকরি প্রস্তুতি",
    chapter: "সকল বিষয়",
    difficulty: "hard",
    questionCount: 10,
    duration: 20,
    negativeMarking: 0.5,
    questions: demoQuestions,
    published: true,
    featured: false,
    createdAt: "2026-03-07",
    mandatorySubjects: [],
  },
];

export const demoNotices: Notice[] = [
  {
    id: "n1",
    title: "নতুন পরীক্ষা যুক্ত হয়েছে!",
    content: "আমাদের প্ল্যাটফর্মে নতুন বিসিএস প্রস্তুতি পরীক্ষা যুক্ত করা হয়েছে। এখনই অনুশীলন শুরু করুন এবং আপনার প্রস্তুতি আরও শক্তিশালী করুন।",
    pinned: true,
    createdAt: "2026-03-07",
  },
  {
    id: "n2",
    title: "সাপ্তাহিক মক টেস্ট চালু",
    content: "প্রতি শুক্রবার সকাল ১০টায় সাপ্তাহিক মক টেস্ট অনুষ্ঠিত হবে। সকল শিক্ষার্থী অংশগ্রহণ করতে পারবেন।",
    pinned: false,
    createdAt: "2026-03-05",
  },
  {
    id: "n3",
    title: "অ্যাপ আপডেট v2.0",
    content: "নতুন ফিচার সংযোজন করা হয়েছে - প্রশ্ন বুকমার্ক, বিস্তারিত ব্যাখ্যা এবং উন্নত রেজাল্ট পেজ।",
    pinned: false,
    createdAt: "2026-03-02",
  },
];

export const subjects = ["সাধারণ জ্ঞান", "বিজ্ঞান", "গণিত", "বাংলা", "ইংরেজি", "মিশ্র"];
export const categories = ["বিসিএস প্রস্তুতি", "এসএসসি প্রস্তুতি", "এইচএসসি প্রস্তুতি", "চাকরি প্রস্তুতি"];
