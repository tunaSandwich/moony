import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import InviteCodePage from './pages/InviteCodePage';
import PlaidConnectionPage from './pages/PlaidConnectionPage';
import PhoneVerificationPage from './pages/PhoneVerificationPage';
import CheckPhonePage from './pages/CheckPhonePage';
import DashboardPage from './pages/DashboardPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import ApiTestPage from './pages/ApiTestPage';
import CompliancePage from './pages/CompliancePage';
import { PlaidTestPage } from './pages/PlaidTestPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/invite" element={<InviteCodePage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/compliance" element={<CompliancePage />} />
          <Route path="/api-test" element={<ApiTestPage />} />
          <Route path="/plaid-test" element={<PlaidTestPage />} />

          {/* Protected routes — require valid session */}
          <Route element={<ProtectedRoute />}>
            <Route path="/connect-bank" element={<PlaidConnectionPage />} />
            <Route path="/phone-verification" element={<PhoneVerificationPage />} />
            <Route path="/check-phone" element={<CheckPhonePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;