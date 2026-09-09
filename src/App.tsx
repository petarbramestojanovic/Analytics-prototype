import { Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import RequireAdmin from './components/RequireAdmin';
import { SessionProvider } from './lib/session';
import { ThemeProvider } from './lib/theme';
import { LanguageProvider } from './lib/i18n';
import { ProfileProvider } from './lib/profile';
import { AlertSettingsProvider } from './lib/alertSettings';
import { queryClient } from './lib/queryClient';
import CampaignsView from './views/CampaignsView';
import CampaignDetailView from './views/CampaignDetailView';
import ReportsView from './views/ReportsView';
import SetupView from './views/SetupView';
import ConnectorsView from './views/ConnectorsView';
import CompaniesView from './views/CompaniesView';
import AlertsView from './views/AlertsView';
import LoginView from './views/auth/LoginView';
import SignupView from './views/auth/SignupView';
import ForgotPasswordView from './views/auth/ForgotPasswordView';
import ResetPasswordView from './views/auth/ResetPasswordView';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <SessionProvider>
            <ProfileProvider>
              <AlertSettingsProvider>
                <Routes>
                  {/* Auth pages render outside the dashboard shell — no sidebar, no
                      tenant scope, since nobody is signed in yet. */}
                  <Route path="/login" element={<LoginView />} />
                  <Route path="/signup" element={<SignupView />} />
                  <Route path="/forgot-password" element={<ForgotPasswordView />} />
                  <Route path="/reset-password" element={<ResetPasswordView />} />

                  <Route
                    path="*"
                    element={
                      <Layout>
                        <Routes>
                          <Route path="/" element={<Navigate to="/campaigns" replace />} />
                          <Route path="/campaigns" element={<CampaignsView />} />
                          <Route path="/campaigns/:id" element={<CampaignDetailView />} />
                          <Route path="/reports" element={<ReportsView />} />
                          <Route
                            path="/admin/setup"
                            element={
                              <RequireAdmin>
                                <SetupView />
                              </RequireAdmin>
                            }
                          />
                          <Route
                            path="/admin/connectors"
                            element={
                              <RequireAdmin>
                                <ConnectorsView />
                              </RequireAdmin>
                            }
                          />
                          <Route
                            path="/admin/companies"
                            element={
                              <RequireAdmin>
                                <CompaniesView />
                              </RequireAdmin>
                            }
                          />
                          <Route
                            path="/admin/alerts"
                            element={
                              <RequireAdmin>
                                <AlertsView />
                              </RequireAdmin>
                            }
                          />
                          <Route path="*" element={<Navigate to="/campaigns" replace />} />
                        </Routes>
                      </Layout>
                    }
                  />
                </Routes>
              </AlertSettingsProvider>
            </ProfileProvider>
          </SessionProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
