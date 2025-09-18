import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import InviteCodePage from './pages/InviteCodePage';
import ApiTestPage from './pages/ApiTestPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/invite" element={<InviteCodePage />} />
        <Route path="/api-test" element={<ApiTestPage />} />
      </Routes>
    </Router>
  );
}

export default App;
