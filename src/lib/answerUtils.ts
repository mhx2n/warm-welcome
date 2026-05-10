import { Question } from "./types";

export const normalizeAnswerValue = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "");

export const isAnswerMatch = (left: string, right: string) => {
  if (!left || !right) return false;
  return normalizeAnswerValue(left) === normalizeAnswerValue(right);
};

// Resolve the correct answer to actual option text
export const resolveCorrectOptionText = (question: Question): string => {
  const answer = question.answer;
  if (!answer) return "";

  // If answer is already one of the options, return it directly
  if (question.options.includes(answer)) {
    return answer;
  }

  const normalized = normalizeAnswerValue(answer);

  // Map common key formats to option indices
  const keyToIndex: Record<string, number> = {
    a: 0,
    b: 1,
    c: 2,
    d: 3,
    e: 4,
    "1": 0,
    "2": 1,
    "3": 2,
    "4": 3,
    "5": 4,
    option1: 0,
    option2: 1,
    option3: 2,
    option4: 3,
    option5: 4,
  };

  const mappedIndex = keyToIndex[normalized];
  if (mappedIndex !== undefined && question.options[mappedIndex]) {
    return question.options[mappedIndex];
  }

  // Try to match by normalized comparison
  const matchedOption = question.options.find((opt) => normalizeAnswerValue(opt) === normalized);
  return matchedOption ?? answer;
};
