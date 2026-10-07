import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/hooks/auth';
import { RequireAuth } from '@/components/common/RequireAuth';
import { PageLoader } from '@/components/common/Spinner';
import Landing from '@/pages/Landing';

// Pages chargées à la demande : la page d'accueil reste légère.
const CrewPage = lazy(() => import('@/pages/CrewPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const SignupPage = lazy(() => import('@/pages/auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const InvitationPage = lazy(() => import('@/pages/auth/InvitationPage'));
const AccountPage = lazy(() => import('@/pages/account/AccountPage'));
const ManageCrewPage = lazy(() => import('@/pages/account/ManageCrewPage'));
const AdminPage = lazy(() => import('@/pages/admin/AdminPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const LegalNoticePage = lazy(() => import('@/pages/LegalNoticePage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const SalesTermsPage = lazy(() => import('@/pages/SalesTermsPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
  },
});

/** Remonte en haut de page à chaque navigation (sauf ancre #…). */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/equipages/:slug" element={<CrewPage />} />
              <Route path="/connexion" element={<LoginPage />} />
              <Route path="/inscription" element={<SignupPage />} />
              <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
              <Route path="/nouveau-mot-de-passe" element={<ResetPasswordPage />} />
              <Route path="/invitation" element={<InvitationPage />} />
              <Route path="/confidentialite" element={<PrivacyPage />} />
              <Route path="/mentions-legales" element={<LegalNoticePage />} />
              <Route path="/conditions-utilisation" element={<TermsPage />} />
              <Route path="/conditions-vente" element={<SalesTermsPage />} />
              <Route path="/mon-compte" element={<RequireAuth><AccountPage /></RequireAuth>} />
              <Route path="/mon-compte/equipages/:slug" element={<RequireAuth><ManageCrewPage /></RequireAuth>} />
              <Route path="/admin" element={<RequireAuth admin><AdminPage /></RequireAuth>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <Toaster richColors position="top-center" />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
