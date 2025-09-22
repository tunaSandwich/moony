import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import InviteCodePage from './pages/InviteCodePage';
import ApiTestPage from './pages/ApiTestPage';
import PlaidConnectionPage from './pages/PlaidConnectionPage';
import PhoneVerificationPage from './pages/PhoneVerificationPage';
import WelcomePage from './pages/WelcomePage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import { PlaidTestPage } from './pages/PlaidTestPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/invite" element={<InviteCodePage />} />
        <Route path="/connect-bank" element={<PlaidConnectionPage />} />
        <Route path="/phone-verification" element={<PhoneVerificationPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/api-test" element={<ApiTestPage />} />
        <Route path="/plaid-test" element={<PlaidTestPage />} />
      </Routes>
    </Router>
  );
}

export default App;
