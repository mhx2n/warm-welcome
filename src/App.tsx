import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import AuthRefreshController from "@/components/AuthRefreshController";
import ProtectedRoute from "@/components/ProtectedRoute";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import { AuthProvider } from "@/hooks/useAuth";
import { isBackendConnectivityError } from "@/lib/backend";

// Layouts
import PublicLayout from "@/layouts/PublicLayout";
import AdminLayout from "@/layouts/AdminLayout";

// Pages
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import ExamsPage from "./pages/ExamsPage";
import ExamDetails from "./pages/ExamDetails";
import ExamAttempt from "./pages/student/StudentExamAttempt";
import ResultsPage from "./pages/student/StudentResult";
import WrongAnswersBank from "./pages/student/WrongAnswersBank";
import NoticesPage from "./pages/NoticesPage";
import NoticeDetails from "./pages/NoticeDetails";
import ProfilePage from "./pages/student/StudentProfile";
import AboutContact from "./pages/AboutContact";
import NotFound from "./pages/NotFound";

// Admin pages
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminExams from "./pages/admin/AdminExams";
import AdminQuestions from "./pages/admin/AdminQuestions";
import AdminCSVUpload from "./pages/admin/AdminCSVUpload";
import AdminNotices from "./pages/admin/AdminNotices";
import AdminSubjects from "./pages/admin/AdminSubjects";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminSections from "./pages/admin/AdminSections";
import AdminSiteSettings from "./pages/admin/AdminSiteSettings";
import AdminThemeSettings from "./pages/admin/AdminThemeSettings";
import AdminReminders from "./pages/admin/AdminReminders";
import AdminEventBanners from "./pages/admin/AdminEventBanners";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminLiveExams from "./pages/admin/AdminLiveExams";
import AdminPremiumBatches from "./pages/admin/AdminPremiumBatches";
import StudentLiveExams from "./pages/student/StudentLiveExams";
import LiveExamAttempt from "./pages/student/LiveExamAttempt";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: (failureCount, error) => !isBackendConnectivityError(error) && failureCount < 1,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SiteSettingsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthRefreshController />
            <ScrollToTop />
            <Routes>
              {/* Public auth pages */}
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/secure-admin-login" element={<AdminLoginPage />} />

              {/* Login required for entire site */}
              <Route element={<ProtectedRoute />}>
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/exams" element={<ExamsPage />} />
                  <Route path="/exams/:id" element={<ExamDetails />} />
                  <Route path="/exams/:id/attempt" element={<ExamAttempt />} />
                  <Route path="/results" element={<ResultsPage />} />
                  <Route path="/wrong-answers" element={<WrongAnswersBank />} />
                  <Route path="/notices" element={<NoticesPage />} />
                  <Route path="/notices/:id" element={<NoticeDetails />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/about" element={<AboutContact />} />
                  <Route path="/live-exams" element={<StudentLiveExams />} />
                  <Route path="/live-exam/:id" element={<LiveExamAttempt />} />
                </Route>

                {/* Admin routes */}
                <Route element={<ProtectedRoute adminOnly />}>
                  <Route element={<AdminLayout />}>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/exams" element={<AdminExams />} />
                    <Route path="/admin/sections" element={<AdminSections />} />
                    <Route path="/admin/questions" element={<AdminQuestions />} />
                    <Route path="/admin/upload-csv" element={<AdminCSVUpload />} />
                    <Route path="/admin/notices" element={<AdminNotices />} />
                    <Route path="/admin/subjects" element={<AdminSubjects />} />
                    <Route path="/admin/settings" element={<AdminSettings />} />
                    <Route path="/admin/site-settings" element={<AdminSiteSettings />} />
                    <Route path="/admin/theme" element={<AdminThemeSettings />} />
                    <Route path="/admin/reminders" element={<AdminReminders />} />
                    <Route path="/admin/event-banners" element={<AdminEventBanners />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/live-exams" element={<AdminLiveExams />} />
                    <Route path="/admin/premium-batches" element={<AdminPremiumBatches />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SiteSettingsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
