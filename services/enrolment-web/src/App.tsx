import { Component, type ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { ParentAuthGuard, ParentLayout } from '@/components/layout/ParentLayout';
import { StaffAuthGuard, StaffLayout } from '@/components/layout/StaffLayout';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
              <span className="text-2xl">⚠</span>
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
            <p className="mt-2 text-sm text-slate-500">
              An unexpected error occurred. Please refresh the page to continue.
            </p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
              className="mt-5 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
import { ContinueFromChatPage } from '@/pages/parent/ContinueFromChatPage';
import { SchoolComparePage } from '@/pages/parent/SchoolComparePage';
import { NotificationPreferencesPage } from '@/pages/parent/NotificationPreferencesPage';
import { ChildrenPage } from '@/pages/parent/ChildrenPage';
import { OnboardingPage } from '@/pages/parent/OnboardingPage';

import { StaffLoginPage } from '@/pages/staff/StaffLoginPage';
import { StaffApplicationListPage } from '@/pages/staff/StaffApplicationListPage';
import { StaffApplicationDetailPage } from '@/pages/staff/StaffApplicationDetailPage';
import { StaffAnalyticsPage } from '@/pages/staff/StaffAnalyticsPage';
import { StaffSchoolSettingsPage } from '@/pages/staff/StaffSchoolSettingsPage';
import { StaffMembersPage } from '@/pages/staff/StaffMembersPage';
import { StaffSetupPage } from '@/pages/staff/StaffSetupPage';

export function App() {
  return (
    <ErrorBoundary>
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
        <Route path="/enrolment/continue-from-chat" element={<ContinueFromChatPage />} />
        <Route path="/enrolment/compare" element={<SchoolComparePage />} />
        <Route path="/profile/notifications" element={<NotificationPreferencesPage />} />
        <Route path="/profile/children" element={<ChildrenPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Route>

      {/* Staff portal */}
      <Route path="/staff/setup" element={<StaffSetupPage />} />
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
        <Route path="/staff/settings" element={<StaffSchoolSettingsPage />} />
        <Route path="/staff/members" element={<StaffMembersPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ErrorBoundary>
  );
}
