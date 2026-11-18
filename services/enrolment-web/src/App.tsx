import { Routes, Route, Navigate } from 'react-router-dom';

import { ParentAuthGuard, ParentLayout } from '@/components/layout/ParentLayout';
import { StaffAuthGuard, StaffLayout } from '@/components/layout/StaffLayout';

import { LandingPage } from '@/pages/LandingPage';
import { ApplyEmbedPage } from '@/pages/ApplyEmbedPage';

import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';

import { DashboardPage } from '@/pages/parent/DashboardPage';
import { ProfilePage } from '@/pages/parent/ProfilePage';
import { SchoolSearchPage } from '@/pages/parent/SchoolSearchPage';
import { SchoolDetailPage } from '@/pages/parent/SchoolDetailPage';
import { ApplicationFormPage } from '@/pages/parent/ApplicationFormPage';
import { ApplicationListPage } from '@/pages/parent/ApplicationListPage';
import { ApplicationDetailPage } from '@/pages/parent/ApplicationDetailPage';
import { RespondInfoPage } from '@/pages/parent/RespondInfoPage';
import { ChatbotPage } from '@/pages/parent/ChatbotPage';
import { ChatbotSummaryPage } from '@/pages/parent/ChatbotSummaryPage';
import { SchoolComparePage } from '@/pages/parent/SchoolComparePage';
import { NotificationPreferencesPage } from '@/pages/parent/NotificationPreferencesPage';
import { ChildrenPage } from '@/pages/parent/ChildrenPage';
import { OnboardingPage } from '@/pages/parent/OnboardingPage';

import { StaffLoginPage } from '@/pages/staff/StaffLoginPage';
import { StaffApplicationListPage } from '@/pages/staff/StaffApplicationListPage';
import { StaffApplicationDetailPage } from '@/pages/staff/StaffApplicationDetailPage';
import { StaffAnalyticsPage } from '@/pages/staff/StaffAnalyticsPage';

export function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/apply/:token" element={<ApplyEmbedPage />} />

      {/* Parent portal — auth + profile gate */}
      <Route
        element={
          <ParentAuthGuard>
            <ParentLayout />
          </ParentAuthGuard>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/enrolment" element={<SchoolSearchPage />} />
        <Route path="/enrolment/schools/:id" element={<SchoolDetailPage />} />
        <Route path="/enrolment/apply/:schoolId" element={<ApplicationFormPage />} />
        <Route path="/enrolment/applications" element={<ApplicationListPage />} />
        <Route path="/enrolment/applications/:id" element={<ApplicationDetailPage />} />
        <Route path="/enrolment/applications/:id/respond-info" element={<RespondInfoPage />} />
        <Route path="/enrolment/chatbot" element={<ChatbotPage />} />
        <Route path="/enrolment/chatbot/summary" element={<ChatbotSummaryPage />} />
        <Route path="/enrolment/compare" element={<SchoolComparePage />} />
        <Route path="/profile/notifications" element={<NotificationPreferencesPage />} />
        <Route path="/profile/children" element={<ChildrenPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Route>

      {/* Staff portal */}
      <Route path="/staff/login" element={<StaffLoginPage />} />
      <Route
        element={
          <StaffAuthGuard>
            <StaffLayout />
          </StaffAuthGuard>
        }
      >
        <Route path="/staff/applications" element={<StaffApplicationListPage />} />
        <Route path="/staff/applications/:id" element={<StaffApplicationDetailPage />} />
        <Route path="/staff/analytics" element={<StaffAnalyticsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
