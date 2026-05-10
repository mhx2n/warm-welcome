import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import type { Exam, Notice, Section, SiteSettings, ExamResult, Reminder, EventBanner } from "@/lib/types";
import { toUserFacingError } from "@/lib/backend";
import { store } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

const INITIAL_DATA_UPDATED_AT = 0;

function showMutationError(error: unknown) {
  toast({
    title: "ত্রুটি",
    description: toUserFacingError(error).message,
    variant: "destructive",
  });
}

// ============ EXAMS ============
export function useExams() {
  return useQuery({
    queryKey: ["exams"],
    queryFn: api.fetchExams,
    initialData: () => store.getExams(),
    initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
  });
}

export function useExamById(id: string | undefined) {
  return useQuery({
    queryKey: ["exams", id],
    queryFn: () => api.fetchExamById(id!),
    enabled: !!id,
    initialData: () => {
      if (!id) return undefined;
      return store.getExams().find((exam) => exam.id === id);
    },
    initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
  });
}

export function useUpsertExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (exam: Exam) => api.upsertExam(exam),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
    onError: showMutationError,
  });
}

export function useDeleteExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteExam(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
    onError: showMutationError,
  });
}

export function useUpdateExamField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: string; value: any }) =>
      api.updateExamField(id, field, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
    onError: showMutationError,
  });
}

// ============ NOTICES ============
export function useNotices() {
  return useQuery({
    queryKey: ["notices"],
    queryFn: api.fetchNotices,
    initialData: () => store.getNotices(),
    initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
  });
}

export function useUpsertNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notice: Notice) => api.upsertNotice(notice),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notices"] }),
    onError: showMutationError,
  });
}

export function useDeleteNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteNotice(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notices"] }),
    onError: showMutationError,
  });
}

// ============ SECTIONS ============
export function useSections() {
  return useQuery({
    queryKey: ["sections"],
    queryFn: api.fetchSections,
    initialData: () => store.getSections(),
    initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
  });
}

export function useUpsertSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (section: Section) => api.upsertSection(section),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sections"] }),
    onError: showMutationError,
  });
}

export function useDeleteSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSection(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sections"] }),
    onError: showMutationError,
  });
}

// ============ RESULTS ============
export function useResults() {
  return useQuery({
    queryKey: ["results"],
    queryFn: api.fetchResults,
    initialData: () => store.getResults(),
    initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
  });
}

export function useAddResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (result: ExamResult) => api.addResult(result),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["results"] }),
    onError: showMutationError,
  });
}

// ============ SITE SETTINGS ============
export function useSiteSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: api.fetchSiteSettings,
    initialData: () => store.getSiteSettings(),
    initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
  });
}

export function useSaveSiteSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: SiteSettings) => api.saveSiteSettings(settings),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-settings"] }),
    onError: showMutationError,
  });
}

// ============ SUBJECTS ============
export function useSubjects() {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: api.fetchSubjects,
    initialData: () => store.getSubjects(),
    initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
  });
}

export function useSetSubjects() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (names: string[]) => api.setSubjects(names),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
    onError: showMutationError,
  });
}

// ============ CATEGORIES ============
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: api.fetchCategories,
    initialData: () => store.getCategories(),
    initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
  });
}

export function useSetCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (names: string[]) => api.setCategories(names),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
    onError: showMutationError,
  });
}

// ============ REMINDERS ============
export function useReminders() {
  return useQuery({
    queryKey: ["reminders"],
    queryFn: api.fetchReminders,
    initialData: () => store.getReminders(),
    initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
  });
}

export function useUpsertReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reminder: Reminder) => api.upsertReminder(reminder),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
    onError: showMutationError,
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteReminder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
    onError: showMutationError,
  });
}

// ============ EVENT BANNERS ============
export function useEventBanners() {
  return useQuery({
    queryKey: ["event-banners"],
    queryFn: api.fetchEventBanners,
    initialData: () => store.getEventBanners(),
    initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
  });
}

export function useUpsertEventBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (banner: EventBanner) => api.upsertEventBanner(banner),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["event-banners"] }),
    onError: showMutationError,
  });
}

export function useDeleteEventBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteEventBanner(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["event-banners"] }),
    onError: showMutationError,
  });
}
